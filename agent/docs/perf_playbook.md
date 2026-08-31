# Canvas 2D ASCII Glyph Field Performance Playbook

## Executive Summary

This document outlines performance strategies for rendering a full-viewport ASCII glyph field using Canvas 2D, targeting **60fps on mid-tier Android**, **<6% CPU on desktop idle**, and **<80MB memory**.

## Performance Budgets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame Rate | 60fps (16.67ms/frame) | `requestAnimationFrame` delta |
| CPU (Desktop Idle) | <6% | Task Manager / DevTools Performance |
| CPU (Mid-tier Android) | <30% sustained | Android Profiler |
| Memory | <80MB | Chrome DevTools Memory tab |
| Draw Calls | <500/frame | Canvas profiling |
| Glyph Count (Mobile) | 800–1500 adaptive | Viewport-area based |
| Glyph Count (Desktop) | 3000–5000 | Fixed or adaptive |

---

## 1. fillText Batching Strategies

### Problem

`fillText()` is one of the slowest Canvas 2D operations. Calling it thousands of times per frame causes severe frame drops, especially on Firefox and mobile browsers. [15][7][10]

### Solution 1: Offscreen Canvas Caching (Static Glyphs)

For glyphs that don't change frequently:

```javascript
// Pre-render each unique glyph character to an offscreen canvas
const glyphCache = new Map();

function createGlyphCache(char, font) {
  const cache = document.createElement('canvas');
  const ctx = cache.getContext('2d', { alpha: true });

  ctx.font = font;
  const metrics = ctx.measureText(char);
  const width = Math.ceil(metrics.width);
  const height = Math.ceil(parseInt(font, 10) * 1.2);

  cache.width = width;
  cache.height = height;

  ctx.font = font;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(char, 0, height * 0.8);

  return { canvas: cache, width, height };
}

// Usage in render loop
function renderGlyph(ctx, char, x, y, cache) {
  ctx.drawImage(cache.canvas, x, y);
}
```

**Benefits:**
- `drawImage()` is 5–10×¹ faster than `fillText()` on most browsers [15]
- Firefox performance improves from 41% frame time to <1% [15]
- Eliminates font rasterization overhead per frame

### Solution 2: Worker-Based Parallel Batching

For dynamic glyph fields with 1000+ glyphs:

```javascript
// Use canvas-fill-text-opt pattern [7]
import FillTextOpt from 'canvas-fill-text-opt';

const fto = new FillTextOpt();
await fto.init(canvas, {
  concurrency: navigator.hardwareConcurrency / 2,
  textLimitFactor: 1.4,
  fonts: ['monospace']
});

// Batch all fillText calls
for (const glyph of visibleGlyphs) {
  ctx.font = glyph.font;
  ctx.fillStyle = glyph.color;
  fto.fillText(glyph.char, glyph.x, glyph.y);
}

await fto.render(); // Parallel execution via OffscreenCanvas
```

**Benefits:**
- ~20% speedup on 16-core desktop [7]
- Distributes work across Web Workers
- Automatic viewport clipping optimization

### Solution 3: Texture Atlas + Sprite Rendering

For maximum performance (2500+ labels at 60fps): [10]

```javascript
// Pre-render all glyphs into a single texture atlas
const atlasCanvas = document.createElement('canvas');
const atlasCtx = atlasCanvas.getContext('2d');

// Pack glyphs into atlas (simple grid layout)
const GLYPH_SIZE = 16;
const ATLAS_COLS = 16;
let glyphUVs = new Map();

for (let i = 0; i < 256; i++) {
  const char = String.fromCharCode(i);
  const col = i % ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);

  atlasCtx.fillText(char, col * GLYPH_SIZE, row * GLYPH_SIZE);
  glyphUVs.set(char, {
    u: col * GLYPH_SIZE / atlasCanvas.width,
    v: row * GLYPH_SIZE / atlasCanvas.height
  });
}

// Render via drawImage with source rect
function renderGlyph(ctx, char, x, y) {
  const uv = glyphUVs.get(char);
  ctx.drawImage(
    atlasCanvas,
    uv.u * atlasCanvas.width, uv.v * atlasCanvas.height,
    GLYPH_SIZE, GLYPH_SIZE,
    x, y, GLYPH_SIZE, GLYPH_SIZE
  );
}
```

**Benefits:**
- Single texture upload to GPU [10]
- Sprite pooling eliminates allocations [10]
- Viewport culling trivial to implement

---

## 2. Offscreen Canvas Architecture

### Layered Canvas Strategy

Separate static and dynamic content: [1][12]

```html
<div id="stage" style="position: relative; width: 100vw; height: 100vh;">
  <canvas id="bg-layer" style="position: absolute; z-index: 1;"></canvas>
  <canvas id="glyph-layer" style="position: absolute; z-index: 2;"></canvas>
  <canvas id="ui-layer" style="position: absolute; z-index: 3;"></canvas>
</div>
```

```javascript
// Background: simplex noise field (static or slow-changing)
const bgCanvas = document.getElementById('bg-layer');
const bgCtx = bgCanvas.getContext('2d', { alpha: false });

// Glyphs: dynamic ASCII field
const glyphCanvas = document.getElementById('glyph-layer');
const glyphCtx = glyphCanvas.getContext('2d', { alpha: true });

// UI: overlays, controls
const uiCanvas = document.getElementById('ui-layer');
const uiCtx = uiCanvas.getContext('2d', { alpha: true });
```

**Benefits:**
- Background redrawn only when noise updates
- Glyph layer optimized independently
- UI layer responds to input without triggering full redraw

### OffscreenCanvas for Background

```javascript
// Create offscreen canvas for background noise
const offscreen = new OffscreenCanvas(width, height);
const offCtx = offscreen.getContext('2d');

// Render noise field once (or when parameters change)
renderNoiseField(offCtx, time);

// Composite to visible canvas each frame
glyphCtx.drawImage(offscreen, 0, 0);
```

**Note:** OffscreenCanvas requires transferable context in some browsers. Test with `getContext('2d', { willReadFrequently: false })`. [1]

---

## 3. DPR (Device Pixel Ratio) Strategies

### The Problem

High-DPR displays (Retina, modern phones) multiply pixel counts by 2–4×¹, killing performance if not managed. [2][3][4]

### Strategy 1: DPR Capping

```javascript
function setupCanvas(canvas, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(dpr, dpr);

  // Store logical size for glyph calculations
  canvas.logicalWidth = rect.width;
  canvas.logicalHeight = rect.height;
  canvas.currentDpr = dpr;

  return ctx;
}
```

**Rationale:**
- DPR >2 provides diminishing visual returns for ASCII glyphs
- Mid-tier Android often has DPR=2–3; capping at 2 saves 25–44% pixels [4]
- Desktop Retina (DPR=2) remains sharp

### Strategy 2: Adaptive DPR by Battery/Performance

```javascript
function getAdaptiveDpr() {
  const baseDpr = window.devicePixelRatio || 1;

  // Reduce DPR on battery saver or low performance
  if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
      if (battery.level < 0.2 || !battery.charging) {
        return Math.max(1, baseDpr - 1);
      }
    });
  }

  // Reduce on mobile if frame time >12ms
  if (window.innerWidth < 768 && avgFrameTime > 12) {
    return Math.max(1, baseDpr - 1);
  }

  return baseDpr;
}
```

### Strategy 3: CSS Scaling for Non-Retina

For devices where canvas scaling is too expensive: [1]

```css
#stage {
  transform-origin: 0 0;
  transform: scale(var(--scale-factor, 1));
}
```

```javascript
// Scale entire stage via CSS transform (GPU-accelerated)
const scaleX = window.innerWidth / canvas.width;
const scaleY = window.innerHeight / canvas.height;
const scale = Math.min(scaleX, scaleY);

stage.style.transform = `scale(${scale})`;
```

---

## 4. Simplex Noise Implementation Choice

### Recommended: simplex-noise.js

**Repository:** https://github.com/jwagner/simplex-noise.js [5]

**Benchmarks:** [5]
- `noise2D()`: 72.9M ops/sec (Ryzen 5950X)
- `noise3D()`: 47.9M ops/sec
- `noise4D()`: 35.6M ops/sec
- ~20ns per 2D sample

**Installation:**
```bash
npm install simplex-noise
```

**Usage:**
```javascript
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();
const value = noise2D(x, y); // Returns -1 to 1
```

**Why simplex-noise.js:**
- Tree-shakeable, ~2KB minified+gzipped [5]
- Typed arrays for performance [14]
- No dependencies
- 20–30% faster than v3.x [5]

### Alternative: OpenSimplex2

**Use case:** If you need better gradient quality or specific noise characteristics. [11]

**Trade-off:** Slightly slower than simplex-noise.js but better visual quality for certain applications. [11]

### Noise Field Optimization

```javascript
// Pre-compute noise field at lower resolution
const NOISE_RESOLUTION = 4; // 1 sample per 4×¹ pixel block
const noiseField = new Float32Array(
  Math.ceil(width / NOISE_RESOLUTION) * 
  Math.ceil(height / NOISE_RESOLUTION)
);

for (let y = 0; y < height; y += NOISE_RESOLUTION) {
  for (let x = 0; x < width; x += NOISE_RESOLUTION) {
    const nx = x / width * frequency;
    const ny = y / height * frequency;
    noiseField[y / NOISE_RESOLUTION * (width / NOISE_RESOLUTION) + x / NOISE_RESOLUTION] = 
      noise2D(nx, ny);
  }
}

// Upsample via bilinear interpolation during render
```

**Benefits:**
- Reduces noise computations by 16×¹ (4×¹ in each dimension)
- ASCII glyphs are low-frequency anyway; no visual loss

---

## 5. Adaptive Glyph Counts on Mobile

### Viewport-Area Based Scaling

```javascript
function calculateGlyphCount() {
  const area = window.innerWidth * window.innerHeight;
  const isMobile = window.innerWidth < 768;

  // Base density: 1 glyph per 400–800 px
  const baseDensity = isMobile ? 800 : 400;
  const targetCount = Math.floor(area / baseDensity);

  // Clamp to performance budgets
  const maxGlyphs = isMobile ? 1500 : 5000;
  const minGlyphs = isMobile ? 800 : 2000;

  return Math.max(minGlyphs, Math.min(maxGlyphs, targetCount));
}
```

### Frame-Time Feedback Loop

```javascript
let targetGlyphCount = 2000;
let currentGlyphCount = 2000;
const frameTimes = [];

function updateFrameTime(delta) {
  frameTimes.push(delta);
  if (frameTimes.length > 60) frameTimes.shift();

  const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

  // Adjust glyph count based on frame time
  if (avgFrameTime > 14 && currentGlyphCount > 800) {
    currentGlyphCount = Math.max(800, currentGlyphCount - 100);
  } else if (avgFrameTime < 10 && currentGlyphCount < targetGlyphCount) {
    currentGlyphCount = Math.min(targetGlyphCount, currentGlyphCount + 50);
  }
}

requestAnimationFrame(function loop(timestamp) {
  // ... render ...
  updateFrameTime(timestamp - lastTimestamp);
  lastTimestamp = timestamp;
  requestAnimationFrame(loop);
});
```

### Device-Class Detection

```javascript
function getDeviceClass() {
  const ua = navigator.userAgent;

  if (/Android/.test(ua) && /Mobile/.test(ua)) {
    // Check for low-end indicators
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      return 'low-end-mobile';
    }
    return 'mid-tier-mobile';
  }

  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'ios-mobile';
  }

  return 'desktop';
}

const GLYPH_BUDGETS = {
  'low-end-mobile': { min: 600, max: 1000, target: 800 },
  'mid-tier-mobile': { min: 1000, max: 1800, target: 1400 },
  'ios-mobile': { min: 1200, max: 2000, target: 1600 },
  'desktop': { min: 2000, max: 6000, target: 4000 }
};
```

---

## 6. rAF Lifecycle Management

### Pause on Hidden/Offscreen

```javascript
let isRunning = false;
let animationId = null;

function start() {
  if (isRunning) return;
  isRunning = true;
  loop();
}

function stop() {
  if (!isRunning) return;
  isRunning = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function loop(timestamp) {
  if (!isRunning) return;

  // Render logic here
  render(timestamp);

  animationId = requestAnimationFrame(loop);
}

// Visibility API
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stop();
  } else {
    start();
  }
});

// Also handle pagehide/pageshow for mobile browsers
window.addEventListener('pagehide', stop);
window.addEventListener('pageshow', start);
```

**Rationale:**
- rAF is automatically throttled to ~2fps in background tabs [17][19][20][30]
- Explicitly stopping saves CPU and battery
- Prevents unnecessary work when user can't see it

### Offscreen Canvas Pause

```javascript
// If using OffscreenCanvas in workers
const worker = new Worker('noise-worker.js');

// Pause worker when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    worker.postMessage({ type: 'PAUSE' });
  } else {
    worker.postMessage({ type: 'RESUME' });
  }
});
```

### Time-Based Animation (Resume Correctly)

```javascript
let lastTime = performance.now();

function loop(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  // Use deltaTime for animation, not frame count
  updateAnimation(deltaTime);
  render();

  requestAnimationFrame(loop);
}
```

**Benefit:** When tab becomes visible again, animation continues smoothly without "catching up" incorrectly. [26]

---

## 7. Layout Thrash Pitfalls (Scroll-Velocity Coupling)

### The Problem

Coupling scroll velocity to glyph field updates can cause **layout thrashing** if you:
- Read scroll position (`scrollTop`, `getBoundingClientRect()`)
- Immediately write styles that trigger layout
- Repeat in a loop or rAF [16][22][23][25][28]

### Anti-Pattern: Forced Synchronous Layout

```javascript
// ❌ BAD: Read-write-read-write cycle
function updateGlyphsOnScroll() {
  for (const glyph of glyphs) {
    const velocity = window.scrollY - lastScrollY; // Read
    glyph.y += velocity * 0.1; // Write (triggers layout)
    lastScrollY = window.scrollY; // Read again
  }
}

window.addEventListener('scroll', updateGlyphsOnScroll); // Fires many times/frame
```

**Consequence:** Browser must recalculate layout on every iteration, causing jank. [16][28]

### Solution: Batch Reads, Then Writes

```javascript
// ✅ GOOD: Separate read and write phases
let scrollVelocity = 0;
let pendingUpdate = false;

window.addEventListener('scroll', () => {
  if (!pendingUpdate) {
    pendingUpdate = true;
    requestAnimationFrame(() => {
      // Read phase (all reads first)
      const currentScroll = window.scrollY;
      scrollVelocity = currentScroll - lastScrollY;
      lastScrollY = currentScroll;

      // Write phase (all writes after reads)
      updateGlyphPositions(scrollVelocity);

      pendingUpdate = false;
    });
  }
});
```

### Better: Use CSS Transforms

```javascript
// ✅ BEST: GPU-accelerated, no layout
const stage = document.getElementById('stage');

window.addEventListener('scroll', () => {
  const velocity = window.scrollY - lastScrollY;
  lastScrollY = window.scrollY;

  // Use CSS transform (composite-only, no layout)
  stage.style.transform = `translateY(${velocity * 0.1}px)`;
});
```

**Benefits:**
- `transform` and `opacity` are composite-only properties [16]
- No layout recalculation
- Smooth 60fps even on mobile [1][21]

### Scroll Event Throttling

```javascript
// Throttle scroll events to rAF
let rafId = null;

function onScroll() {
  if (rafId) return;

  rafId = requestAnimationFrame(() => {
    updateGlyphField();
    rafId = null;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
```

**Note:** Use `{ passive: true }` to tell browser you won't call `preventDefault()`, improving scroll performance. [21]

---

## 8. Complete Architecture Example

```javascript
// main.js
import { createNoise2D } from 'simplex-noise';

class AsciiField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.noise2D = createNoise2D();
    this.glyphs = [];
    this.isRunning = false;
    this.lastTime = 0;
    this.frameTimes = [];

    this.setupDpr();
    this.setupGlyphs();
    this.setupEventListeners();
  }

  setupDpr() {
    const maxDpr = window.innerWidth < 768 ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.logicalWidth = rect.width;
    this.logicalHeight = rect.height;
    this.dpr = dpr;
  }

  setupGlyphs() {
    const targetCount = this.calculateGlyphCount();
    this.glyphs = [];

    for (let i = 0; i < targetCount; i++) {
      this.glyphs.push({
        x: Math.random() * this.logicalWidth,
        y: Math.random() * this.logicalHeight,
        char: String.fromCharCode(33 + Math.floor(Math.random() * 93)),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      });
    }
  }

  calculateGlyphCount() {
    const area = this.logicalWidth * this.logicalHeight;
    const isMobile = this.logicalWidth < 768;
    const baseDensity = isMobile ? 600 : 300;

    return Math.floor(area / baseDensity);
  }

  setupEventListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });

    window.addEventListener('resize', () => {
      this.setupDpr();
      this.setupGlyphs();
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.trackFrameTime(deltaTime);

    requestAnimationFrame((t) => this.loop(t));
  }

  update(deltaTime) {
    const time = currentTime / 1000;

    for (const glyph of this.glyphs) {
      // Update position from noise field
      const nx = glyph.x / this.logicalWidth * 3;
      const ny = glyph.y / this.logicalHeight * 3;
      const angle = this.noise2D(nx, ny, time * 0.1) * Math.PI * 2;

      glyph.x += Math.cos(angle) * deltaTime * 0.05;
      glyph.y += Math.sin(angle) * deltaTime * 0.05;

      // Wrap around viewport
      if (glyph.x < 0) glyph.x = this.logicalWidth;
      if (glyph.x > this.logicalWidth) glyph.x = 0;
      if (glyph.y < 0) glyph.y = this.logicalHeight;
      if (glyph.y > this.logicalHeight) glyph.y = 0;
    }
  }

  render() {
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

    // Render glyphs
    ctx.font = '14px monospace';
    ctx.fillStyle = '#00ff00';

    for (const glyph of this.glyphs) {
      ctx.fillText(glyph.char, glyph.x, glyph.y);
    }
  }

  trackFrameTime(deltaTime) {
    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

    // Adaptive glyph count
    if (avgFrameTime > 14 && this.glyphs.length > 800) {
      this.glyphs.splice(0, 50);
    } else if (avgFrameTime < 10 && this.glyphs.length < this.calculateGlyphCount()) {
      // Add more glyphs
    }
  }
}

// Initialize
const canvas = document.getElementById('ascii-canvas');
const field = new AsciiField(canvas);
field.start();
```

---

## 9. Profiling Checklist

### Chrome DevTools

1. **Performance Tab:**
   - Record during animation
   - Check for green/yellow/red bars in FPS meter
   - Look for "Forced Reflow" insights [16]
   - Verify rAF callbacks stay under 16ms

2. **Memory Tab:**
   - Take heap snapshot
   - Check for detached canvases or leaked closures
   - Ensure <80MB total

3. **Rendering Tab:**
   - Enable "Paint flashing"
   - Verify no unexpected paints
   - Check "Layer borders" for proper layering

### Mobile Profiling

1. **Chrome Remote Debugging:**
   - Connect Android via USB
   - Open `chrome://inspect`
   - Profile as above

2. **Android Profiler:**
   - Check CPU usage
   - Verify <30% sustained on mid-tier device

---

## 10. Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Uncapped DPR on mobile | 20–30fps, high CPU | Cap DPR at 1.5–2 [4] |
| `fillText()` in hot loop | Frame drops on Firefox | Use offscreen caching or texture atlas [15] |
| Scroll event without throttling | Janky scroll | Use rAF throttling + passive listener [21] |
| Not pausing on hidden | Battery drain, wasted CPU | Listen to `visibilitychange` [17][30] |
| Layout thrash from scroll coupling | Stuttering animation | Batch reads/writes, use transforms [16][28] |
| Too many glyphs on mobile | 30fps ceiling | Adaptive glyph count by viewport area |
| Noise computed per-pixel | High CPU | Pre-compute at lower resolution, upsample |

---

## References

[1] MDN: Optimizing canvas – https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas

[2] MDN: devicePixelRatio – https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio

[3] web.dev: High DPI Canvas – https://web.dev/articles/canvas-hidipi

[4] Stack Overflow: HTML5 Canvas DPR kills performance – https://stackoverflow.com/questions/52377024/html5-canvas-setting-device-pixel-ratio-kills-performance

[5] simplex-noise.js – https://github.com/jwagner/simplex-noise.js/

[6] AG Grid: Optimising HTML5 Canvas Rendering – https://www.ag-grid.com/blog/optimising-html5-canvas-rendering-best-practices-and-techniques/

[7] canvas-fill-text-opt – https://github.com/debevv/canvas-fill-text-opt

[8] TestMu: devicePixelRatio browser support – https://www.testmuai.com/learning-hub/devicepixelratio-browser-support/

[9] SourceForge: Simplex Noise.js – https://sourceforge.net/projects/simplex-noise-js.mirror/

[10] Reddit: 60fps rendering 2500+ labels on canvas – https://www.reddit.com/r/reactjs/comments/1qetuxl/how_we_got_60fps_rendering_2500_labels_on_canvas_by/

[11] OpenSimplex Noise – https://barbegenerativediary.com/en/tutorials/opensimplex-noise/

[12] Reintech: Optimizing Canvas Performance – https://reintech.io/blog/optimizing-canvas-performance-large-scale-apps

[13] SpeedKit: Device Pixel Ratio – https://www.speedkit.com/glossary/device-pixel-ratio-dpr

[14] Hacker News: Fast simplex noise implementation – https://news.ycombinator.com/item?id=13263228

[15] Mirko Sertic: Tuning HTML5 Canvas fillText – https://www.mirkosertic.de/blog/2015/03/tuning-html5-canvas-filltext/

[16] web.dev: Avoid layout thrashing – https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing

[17] GSAP: Animations pause when tab not visible – https://gsap.com/community/forums/topic/10051-animations-pause-when-browser-tab-is-not-visible/

[18] Stack Overflow: 60fps canvas emulator – https://stackoverflow.com/questions/53067088/how-can-i-optimize-canvas-performance-for-a-60fps-emulator

[19] Stack Overflow: rAF not stop in Firefox – https://stackoverflow.com/questions/75204215/does-requestanimationframe-not-stop-in-firefox-when-i-move-away-from-the-tab

[20] GitHub: anime.js animation stops on tab change – https://github.com/juliangarnier/anime/issues/335

[21] Adobe Community: Poor performance on mobile canvas – https://community.adobe.com/questions-540/poor-performance-on-mobile-browsers-html5-canvas-solved-100945

[22] DebugBear: Fix forced reflows – https://www.debugbear.com/blog/forced-reflows

[23] Dev.to: Layout thrashing explained – https://dev.to/aayla_secura/layout-thrashing-what-is-it-and-how-to-eliminate-it-n2j

[24] Kelly Norton: On Layout & Web Performance – https://kellegous.com/j/2013/01/26/layout-performance/

[25] Harry Theo: Minimising layout thrashing – https://www.harrytheo.com/blog/2021/09/dom-reflow-and-layout-thrashing/

[26] Reddit: Does rAF accomplish background pause – https://www.reddit.com/r/learnprogramming/comments/x84e7m/javascript_does_requestanimationframe_accomplish/

[27] Makzan: 60fps on mobile web with canvas – https://www.makzan.net/posts/2015-02-11-60-fps-on-mobile-web-with-canvas/

[28] WebPerf.tips: Layout thrashing – https://webperf.tips/tip/layout-thrashing/

[29] HTML5 Game Devs: Canvas vs WebGL – https://www.html5gamedevs.com/topic/26175-game-works-better-in-canvas-than-in-webgl/

[30] Chromium Dev: rAF paused when tabs hidden – https://groups.google.com/a/chromium.org/g/chromium-dev/c/fOrNAVutSJw
