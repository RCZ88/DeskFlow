# CONTEXT_BUNDLE.md — Presentation Slide Generator

> Self-contained codebase reference for the external AI.
> The external AI has zero codebase access. This bundle replaces that gap.

---

## 1. Project Context

**App:** DeskFlow — Electron + React + TypeScript + Vite + Tailwind CSS v4
**Purpose:** Desktop productivity tracker with terminal workspace, content engine, and presentation system
**Presentation System:** Generates interactive HTML/CSS/JS slides for educational content (YouTube Shorts/Reels style)

---

## 2. Design Tokens (Exact Values)

### CSS Variables (vercel-dark theme)
```css
:root {
  --bg: #0A0A0B;
  --surface: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.08);
  --fg: #FAFAFA;
  --muted: #8B8B8B;
  --accent: #10b981;
  --accent-2: #a855f7;
  --warning: #f59e0b;
  --accent-glow: rgba(16, 185, 129, 0.15);
  --font-header: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Available Themes
```typescript
// src/services/presentation/prompts.ts
export const THEMES = {
  'vercel-dark': { bg: '#0A0A0B', surface: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', fg: '#FAFAFA', muted: '#8B8B8B', accent: '#10b981', accent2: '#a855f7', warning: '#f59e0b', fontHeader: 'Inter', fontBody: 'Inter', fontMono: 'JetBrains Mono' },
  'cyberpunk': { bg: '#0d0221', surface: 'rgba(255,0,255,0.04)', border: 'rgba(255,0,255,0.12)', fg: '#f0e6ff', muted: '#7a6b8a', accent: '#ff2a6d', accent2: '#05d9e8', warning: '#ff6ac1', fontHeader: 'Space Grotesk', fontBody: 'Inter', fontMono: 'JetBrains Mono' },
  'minimalist-mono': { bg: '#111111', surface: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)', fg: '#E5E5E5', muted: '#666666', accent: '#FFFFFF', accent2: '#999999', warning: '#CCCCCC', fontHeader: 'Space Grotesk', fontBody: 'Inter', fontMono: 'JetBrains Mono' },
  'warm-dark': { bg: '#1a1410', surface: 'rgba(255,200,150,0.04)', border: 'rgba(255,200,150,0.08)', fg: '#f5e6d3', muted: '#8a7a6a', accent: '#f59e0b', accent2: '#ef4444', warning: '#fb923c', fontHeader: 'Space Grotesk', fontBody: 'Inter', fontMono: 'JetBrains Mono' },
}
```

---

## 3. MCP Component Inventory (Vanilla JS Equivalents)

Since slides are raw HTML in iframes, React components cannot be used. These are the vanilla JS equivalents:

### Blur-Fade Entrance (from MagicUI blur-fade)
```css
@keyframes blurInUp { from { opacity:0; transform:translateY(20px); filter:blur(10px); } to { opacity:1; transform:translateY(0); filter:blur(0); } }
.stagger { animation: blurInUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
.stagger-1{animation-delay:.04s}.stagger-2{.08s}.stagger-3{.12s}.stagger-4{.16s}.stagger-5{.20s}.stagger-6{.24s}.stagger-7{.28s}.stagger-8{.32s}
```

### Mouse-Following Glow (from MagicUI magic-card)
```html
<div class="glow-card"><div class="glow"></div><div class="content">...</div></div>
```
```css
.glow-card { position:relative; overflow:hidden; }
.glow { position:absolute; width:300px; height:300px; background:radial-gradient(circle, var(--accent) 0%, transparent 70%); opacity:0; filter:blur(40px); pointer-events:none; transform:translate(-50%,-50%); transition:opacity .3s; z-index:0; }
```
```javascript
card.onmouseenter = () => glow.style.opacity = '0.08';
card.onmouseleave = () => glow.style.opacity = '0';
card.onmousemove = (e) => { const r = card.getBoundingClientRect(); glow.style.left = (e.clientX - r.left) + 'px'; glow.style.top = (e.clientY - r.top) + 'px'; }
```

### Number Ticker (from MagicUI number-ticker)
```javascript
function animateNumber(el, target, dur = 1200) {
  const s = performance.now();
  (function u(n) {
    const p = Math.min((n - s) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
    if (p < 1) requestAnimationFrame(u);
  })(s);
}
// Usage: <span class="ticker" data-target="99">0</span>
// document.querySelectorAll('.ticker').forEach(el => animateNumber(el, +el.dataset.target))
```

### Animated Gradient Text (from MagicUI animated-gradient-text)
```css
.gradient-text { background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent)); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gradShift 4s ease-in-out infinite; }
@keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
```

### Custom Slider (replaces <input type="range">)
```css
.slider-track { width:100%; height:4px; background:rgba(255,255,255,.1); border-radius:999px; position:relative; cursor:pointer; }
.slider-fill { height:100%; background:var(--accent); border-radius:999px; transition:width .15s; }
.slider-thumb { width:16px; height:16px; background:var(--accent); border-radius:50%; position:absolute; top:50%; transform:translate(-50%,-50%); box-shadow:0 0 12px var(--accent); cursor:grab; transition:transform .2s, box-shadow .2s; }
.slider-thumb:hover { transform:translate(-50%,-50%) scale(1.3); box-shadow:0 0 24px var(--accent); }
```

### Custom Dropdown (replaces <select>)
```css
.dropdown-trigger { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--surface); border:1px solid var(--border); border-radius:12px; cursor:pointer; transition:border-color .2s; }
.dropdown-trigger:hover { border-color:var(--accent); }
.dropdown-menu { position:absolute; top:100%; left:0; right:0; margin-top:4px; background:rgba(15,15,20,.95); backdrop-filter:blur(24px); border:1px solid var(--border); border-radius:12px; overflow:hidden; z-index:100; opacity:0; transform:translateY(-8px); pointer-events:none; transition:all .2s cubic-bezier(.16,1,.3,1); }
.dropdown-menu.open { opacity:1; transform:translateY(0); pointer-events:auto; }
.dropdown-item { padding:10px 16px; cursor:pointer; transition:background .15s; }
.dropdown-item:hover { background:rgba(255,255,255,.05); }
```

### Glassmorphism Card
```css
.glass-card { background:var(--surface); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid var(--border); border-radius:24px; padding:32px; box-shadow:0 20px 40px rgba(0,0,0,0.4); position:relative; overflow:hidden; }
```

---

## 4. Visual Grounding Patterns

### Integrated Widget Pattern
Build ONE self-contained widget with diagram + inline callouts + drawn leader lines in the SAME coordinate space:
```html
<div class="viz">
  <svg viewBox="0 0 600 400">
    <!-- diagram elements -->
    <!-- leader lines: <path d="M x1 y1 C cx1 cy1, cx2 cy2, x2 y2" stroke="var(--accent)" stroke-width="2" fill="none" marker-end="url(#arrow)"/> -->
    <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--accent)"/></marker></defs>
    <!-- callout text at arrowhead -->
    <text x="..." y="..." font-size="13" fill="var(--fg)">Label text</text>
  </svg>
  <script>// interactivity</script>
</div>
```

### Interactivity Patterns
a. **Step-through**: N states + "Next" button, each click highlights different node + swaps caption
b. **Before/after diff**: Two panels, slider swaps state
c. **Parameter recompute**: Slider bound to JS function that redraws derived value
d. **Synchronized hover**: Two panels, hovering A highlights counterpart in B
e. **Interactive matrix**: Hover output cell highlights contributing input cells

---

## 5. Layout Patterns

### Asymmetrical Grid
```css
.layout-split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 48px; align-items: center; }
.layout-split-reverse { display: grid; grid-template-columns: 1fr 1.5fr; gap: 48px; align-items: center; }
```

### Typography Scale
```css
.headline { font-family: var(--font-header); font-size: 3.5rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; }
.subheading { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; }
.body { font-size: 1rem; font-weight: 400; line-height: 1.6; }
.code { font-family: var(--font-mono); font-size: 0.875rem; }
.label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
```

---

## 6. Anti-Slop Rules

1. NOT default Inter-only — headlines use var(--font-header), code uses var(--font-mono)
2. NOT purple/indigo gradient-on-everything — use provided accent colors
3. NOT same-radius-everything — 24px cards, 12px buttons, 8px badges
4. NOT hero cliché (tiny pill + oversized headline + lone CTA)
5. NOT repeated tracked-uppercase kicker above every heading
6. Real micro-interactions on key actions
7. Imagery matches the topic — no filler glow/blobs
8. Icons consistent (SVG inline, no emoji as UI)
9. Every animation has a purpose
10. Glass layer: bg-[rgba(24,24,27,0.60)] backdrop-blur-xl

---

## 7. Motion Budget (L2 Responsive)

- Allowed: hover/focus/press feedback, fade/slide enter, list stagger, hover lift+glow, ONE ambient accent
- Timing: 150-300ms, cubic-bezier(0.16,1,0.3,1)
- Stagger: 0.04-0.06s per child, cap total under ~0.4s
- Distance: y/x 4-12px, scale 0.96-1.0
- NEVER: multiple competing ambient layers, heavy particles, long fades >400ms

---

## 8. Equations & Code Display

### KaTeX (Math)
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>renderMathInElement(document.body, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] });</script>
```

### Code Blocks
```html
<pre style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:20px; font-family:var(--font-mono); font-size:14px; color:var(--fg); overflow-x:auto;"><code>// code here</code></pre>
```

---

## 9. Slide Frame Types

| Type | Layout | Description |
|------|--------|-------------|
| hook | Massive centered typography | 1-2 word headline, gradient-text, blurInUp. Bold claim. |
| value | Split layout 1.5fr/1fr | Text left, visual right. Integrated widget with leader lines. |
| transition | Minimal text | Visual bridge between sections. Muted colors. |
| call_to_action | Bold CTA | Accent color, button-like element. Urgency. |
| visual_only | Full bleed SVG/diagram | Minimal overlay text. Interactive if it helps. |

---

## 10. External AI Output Contract

The external AI must output ALL slides sequentially. Each slide ONE complete HTML in ```html fences.

Each slide MUST:
1. Start with `<!DOCTYPE html>`
2. Include ALL CSS in `<style>` tags
3. Include ALL JS in `<script>` tags
4. Import Inter + JetBrains Mono from Google Fonts CDN
5. Be exactly 1080×960px
6. Include ALL 7 micro-interactions
7. Use glassmorphism cards
8. Have staggered blurInUp entrance animations
9. Use the theme CSS variables
10. Be completely self-contained (no external deps except Google Fonts)
