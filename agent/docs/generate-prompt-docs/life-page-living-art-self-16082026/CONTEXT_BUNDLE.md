# CONTEXT_BUNDLE.md — Life Page: Living Substrate Art + Self Tab Design

> Self-contained code context for the receiving AI. You do NOT have repo access —
> everything needed is embedded below, verbatim where it matters. Read this FIRST.

---

## 1. Project Overview

**DeskFlow / App Tracker** — an Electron + React 19 + TypeScript desktop productivity
tracker (dark-only UI). This task touches ONLY the **Life page** (`/life` route →
`src/features/warmth/LifePage.tsx`) and its sub-components. Everything is
renderer-side; **no backend/IPC changes are needed** (backend audit at the end).

**The Life page has TWO view modes:**
- `pages` mode — tabbed content (covenant / memories / gold / notes / self).
- `river` mode — a "River of Years" editorial scroll: left sticky column (CoreSample
  ring stage + TimelineView + RiverMap) + right feed column (phase cards flowing down
  a glowing "vital thread" line).

**Two features in scope:**
- **Feature A — Living Substrate:** a Gray-Scott reaction-diffusion "living coral"
  WebGL canvas (R3F + three.js ping-pong render targets). Already built; currently
  nearly invisible and trapped inside a small square stage. Must become VISIBLE,
  beautiful, and integrated into the river system as a full-bleed living background.
- **Feature B — Self tab:** the merged Brain/Profile/Graph tab (Identity & Profile +
  Knowledge Graph + Memory & Brain stacked). User says the design is a mess
  ("cards fonts and everything not displayed and not made with care and love") —
  needs a cohesive, cared-for redesign.

## 2. Environment Facts (verified, hard constraints)

- **R3F:** `@react-three/fiber ^9.5.0`, `@react-three/drei ^10.7.7`, `three ^0.183.2`
  (all already installed — do not add new deps without checking package.json).
- **Shaders are GLSL1 style** (`texture2D`, `varying`, `gl_FragColor`) — CORRECT for
  `THREE.ShaderMaterial` defaults. NEVER convert to GLSL3.
- **Display shader outputs PREMULTIPLIED alpha** (`vec4(color*alpha, alpha)`) with
  `AdditiveBlending`, `toneMapped: false` — must stay that way or the glow breaks.
- **Tailwind v4** (`@theme` in `src/index.css`). Dark-only. Max radius `rounded-xl`
  (12px), card padding `p-5` (20px). Body = Geist/Inter 13px, mono = JetBrains Mono.
  Never pure black `#000`; app bg is `#09090b`.
- **Files are CRLF** — preserve line endings, no mass reformat.
- All `localStorage` access wrapped in try/catch (invariant).
- No test runner. Verification = `npx vite build` + `npx tsc -p tsconfig.app.json`.
- Electron/Chromium build; WebGL available. `prefers-reduced-motion` MUST unmount
  animated canvases (already the pattern in LivingSubstrate).
- `--page-accent` is a page-level CSS variable set by each page (Life page uses
  amber `#fbbf24` family for river; the Self tab accent in pages mode is violet
  `#8b5cf6` per its tab definition).

## 3. Design Tokens (from src/index.css)

```css
:root {
  /* bg / surfaces */
  --bg-primary: #09090b;         /* app background, "never pure black" */
  --bg-card: #18181b;            /* zinc-900 */
  --bg-muted: #27272a;           /* zinc-800 */
  /* text */
  --text-primary: #fafafa;
  --text-secondary: #d4d4d8;     /* zinc-300 */
  --text-muted: #a1a1aa;         /* zinc-400 */
  --text-faint: #52525b;         /* zinc-600 */
  /* accent */
  --accent-primary: #fbbf24;     /* amber-400 — app-wide primary */
  --page-accent: var(--accent-primary);
  /* borders */
  --border: #27272a;
}
@theme {
  --color-background: #09090b; --color-foreground: #fafafa;
  --color-card: #18181b; --color-card-foreground: #fafafa;
  --color-primary: #fbbf24; --color-primary-foreground: #09090b;
  --color-muted: #27272a; --color-muted-foreground: #a1a1aa;
  --color-border: #27272a; --color-ring: #fbbf24;
}
```

**Glass pattern used everywhere:** `bg-zinc-900/50 backdrop-blur-xl
border-zinc-800/50` (or `bg-[rgba(24,24,27,0.5)]` + `1px solid
rgba(255,255,255,0.06)`). Cards: `rounded-xl p-5` with a thin top highlight.

**SectionHeader pattern (shared component, src/components/SectionHeader.tsx, full source):**

```tsx
interface SectionHeaderProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function SectionHeader({ title, icon, action, className = '', titleClassName = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-[var(--page-accent)]/10 border border-[var(--page-accent)]/20 flex items-center justify-center text-[var(--page-accent)]">
            {icon}
          </div>
        )}
        <h2 className={`text-[15px] font-semibold text-zinc-100 ${titleClassName}`}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
```

**Other vendored UI primitives available (all already in repo):** `src/components/ui/`
— `magic-card`, `border-beam` (⚠ BorderBeam renders as a WASH in this Electron
build — avoid large overlays), `number-ticker`, `glare-hover`, `animated-gradient-text`
(needs `--animate-gradient` — present), `confetti`, `dot-pattern` (useId-safe),
`particles`, `blur-fade`, `skeleton`, `switch`, `shiny-button`.

## 4. Frontend Design Skills (the receiving AI should follow these principles)

1. **frontend-design** — DeskFlow component patterns, tokens, spacing, typography,
   glass cards. Core rules: glass as structure; micro-interactions 150–300ms on
   transform/opacity ONLY; never box-shadow for elevation in dark themes; never pure
   black; max 2 font families per view; never animate layout props.
2. **humancentred-UIUX** — every data-driven component covers all 4 states
   (empty / loading / error / populated); clear hierarchy; progressive disclosure;
   feedback on every action.
3. **impeccable** — 7 design dimensions (typography, color, spatial, motion,
   interaction, responsive, UX writing), 27 anti-patterns.
4. **motion-alive** — Liveliness Levels (L1 Composed / L2 Responsive / L3
   Expressive); motion taxonomy.
5. **ui-ux-pro-max** — industry-specific rules (dev tools, AI/ML).
6. **signature-design** — ONE concept-true signature centerpiece per screen;
   "More than one hero = no hero"; calm at rest, big motion only on meaningful
   events; guardrails: clarity survives, function first, 60fps, on-theme, accessible,
   restraint.
7. **frontend-external-infra** — never design from zero: pull from MCP libraries
   (shadcn / Magic UI / lucide / reactbits), re-skin to DeskFlow tokens, anti-slop
   checklist.

## 5. MCP Component Inventory (real, available to pull from)

| Component | Source | Use for |
|-----------|--------|---------|
| card, dialog, tabs, separator, skeleton, switch, badge, button, input, select, tooltip, accordion, collapsible | shadcn (installed) | standard blocks |
| `bento-grid`, `bento-demo`, `bento-demo-vertical` | Magic UI | bento feature grids (Self page section layouts) |
| `animated-grid-pattern`, `interactive-grid-pattern`, `grid-pattern`, `flickering-grid` | Magic UI | background texture (use sparingly under glass) |
| particles, dot-pattern, blur-fade, number-ticker, glare-hover, magic-card, animated-gradient-text, confetti | Magic UI (vendored) | micro-motion layer |
| User, Brain, Network, Database, Sparkles, Fingerprint, MemoryStick, Waypoints, BookOpen, Quote, Tag, Hash, Link2, Activity, TrendingUp, Target, MessageSquare, ShieldCheck, RefreshCw, Download, Copy, Check, FileJson, ChevronDown, ChevronRight, Clock, CheckCircle2, Plus, Trash2, Server, Zap, Search, Filter | lucide-react | icons (never emoji) |
| 135+ animated components (text animations, particles, hover effects) | reactbits | optional extras |
| 200k+ icons across 200 sets | iconify | fallback only |

**Anti-slop checklist (must all pass):** type = Geist body + JetBrains Mono only;
color = DeskFlow tokens, no purple-gradient-everything; geometry = rounded-xl max,
p-5; no uppercase-eyebrow-pill hero cliché; no repeated tracked-uppercase kicker
above every heading; real micro-interactions that respect reduced motion; empty/
loading/error states everywhere; icons all lucide; focus-visible rings use
`--page-accent`.

## 6. Feature A — Living Substrate (CURRENT STATE, full source)

### 6.1 `src/components/life-river/LivingSubstrate.tsx` (228 lines, full verbatim)

```tsx
"use client"

import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import simFragment from '../../shaders/rd-simulation.glsl?raw'
import displayFragment from '../../shaders/rd-display.glsl?raw'

console.log('%c[LivingSubstrate] v1.0 loaded', 'color: #fbbf24; font-weight: bold')

const SIM_VERTEX = /* glsl */ `
varying vec2 v_uvs[9];
uniform vec2 resolution;
void main() {
  vec2 texel = 1.0 / resolution;
  v_uvs[0] = uv;
  v_uvs[1] = uv + vec2(0.0, texel.y);
  v_uvs[2] = uv + vec2(texel.x, 0.0);
  v_uvs[3] = uv - vec2(0.0, texel.y);
  v_uvs[4] = uv - vec2(texel.x, 0.0);
  v_uvs[5] = uv + texel;
  v_uvs[6] = uv + vec2(texel.x, -texel.y);
  v_uvs[7] = uv - texel;
  v_uvs[8] = uv + vec2(-texel.x, texel.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const DISPLAY_VERTEX = /* glsl */ `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const BUFFER_SIZE =
  typeof window !== 'undefined' && window.devicePixelRatio > 1.5 ? 384 : 256

function createSeedTexture(): THREE.DataTexture {
  const size = BUFFER_SIZE
  const data = new Float32Array(size * size * 4)

  // Start full of A, empty of B
  for (let i = 0; i < size * size; i++) {
    data[i * 4 + 0] = 1.0 // A
    data[i * 4 + 1] = 0.0 // B
    data[i * 4 + 2] = 0.0
    data[i * 4 + 3] = 1.0
  }

  // A few random circular gradients of B kickstart the "coral" growth
  const seeds = 28
  for (let s = 0; s < seeds; s++) {
    const cx = Math.random() * size
    const cy = Math.random() * size
    const r = 3 + Math.random() * 9
    for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(size - 1, Math.ceil(cy + r + 1)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(size - 1, Math.ceil(cx + r + 1)); x++) {
        const d = Math.hypot(x - cx, y - cy)
        if (d <= r) {
          const idx = (y * size + x) * 4
          data[idx + 1] = Math.min(1, data[idx + 1] + (1 - d / r) * 0.9)
        }
      }
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

class SubstrateErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[LivingSubstrate] WebGL unavailable — falling back to CSS glow:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function SubstrateScene() {
  const gl = useThree(s => s.gl)
  const viewport = useThree(s => s.viewport)

  const { simMaterial, displayMaterial, seedTexture, rtA, rtB, simScene, simMesh, simCamera } = useMemo(() => {
    const simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        previousIterationTexture: { value: null as THREE.Texture | null },
        f: { value: 0.0545 }, // Gray-Scott "coral" preset
        k: { value: 0.062 },
        dA: { value: 1.0 },
        dB: { value: 0.5 },
        timestep: { value: 1.0 },
        resolution: { value: new THREE.Vector2(BUFFER_SIZE, BUFFER_SIZE) },
      },
      vertexShader: SIM_VERTEX,
      fragmentShader: simFragment,
      depthTest: false,
      depthWrite: false,
    })
    const displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureToDisplay: { value: null as THREE.Texture | null },
      },
      vertexShader: DISPLAY_VERTEX,
      fragmentShader: displayFragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    const seedTexture = createSeedTexture()
    const rtOpts = {
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    }
    const rtA = new THREE.WebGLRenderTarget(BUFFER_SIZE, BUFFER_SIZE, rtOpts)
    const rtB = rtA.clone()
    const simScene = new THREE.Scene()
    const simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial)
    simMesh.frustumCulled = false
    simScene.add(simMesh)
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    simCamera.position.z = 1
    return { simMaterial, displayMaterial, seedTexture, rtA, rtB, simScene, simMesh, simCamera }
  }, [])

  const seeded = useRef(false)

  useEffect(() => {
    return () => {
      rtA.dispose()
      rtB.dispose()
      seedTexture.dispose()
      simMaterial.dispose()
      displayMaterial.dispose()
      simMesh.geometry.dispose()
    }
  }, [rtA, rtB, seedTexture, simMaterial, displayMaterial, simMesh])

  useFrame(() => {
    // Pause simulation when the app/tab is hidden (battery/CPU saver)
    if (document.hidden) return

    if (!seeded.current) {
      simMaterial.uniforms.previousIterationTexture.value = seedTexture
      gl.setRenderTarget(rtA)
      gl.render(simScene, simCamera)
      seeded.current = true
    }

    // Ping-pong: 2 sim passes per display frame for smooth growth
    simMaterial.uniforms.previousIterationTexture.value = rtA.texture
    gl.setRenderTarget(rtB)
    gl.render(simScene, simCamera)

    simMaterial.uniforms.previousIterationTexture.value = rtB.texture
    gl.setRenderTarget(rtA)
    gl.render(simScene, simCamera)

    gl.setRenderTarget(null)

    // Feed the freshest state to the display pass (R3F renders this mesh next)
    displayMaterial.uniforms.textureToDisplay.value = rtA.texture
  })

  return (
    <mesh material={displayMaterial} frustumCulled={false}>
      <planeGeometry args={[viewport.width, viewport.height]} />
    </mesh>
  )
}

function SubstrateCanvas() {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 10], near: 0.1, far: 1000 }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <SubstrateScene />
    </Canvas>
  )
}

export function LivingSubstrate() {
  const [enabled, setEnabled] = useState(
    () => typeof window === 'undefined' ? false : !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setEnabled(!e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Reduced motion → unmount entirely; CoreSample's CSS amber glow remains
  if (!enabled) return null

  return (
    <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
      <SubstrateErrorBoundary>
        <SubstrateCanvas />
      </SubstrateErrorBoundary>
    </div>
  )
}
```

### 6.2 `src/shaders/rd-simulation.glsl` (67 lines, full verbatim)

```glsl
// Reaction-Diffusion simulation fragment shader
// Simplified from jasonwebb/reaction-diffusion-playground (MIT)
// Gray-Scott model: R channel = chemical A, G channel = chemical B.
// Stripped: mousePosition, brushRadius, styleMap* uniforms and logic.

uniform sampler2D previousIterationTexture;

uniform float f;
uniform float k;
uniform float dA;
uniform float dB;
uniform float timestep;

uniform vec2 resolution;

varying vec2 v_uvs[9];

vec3 weights[3];

void setWeights(int type) {
  // 5-point stencil from Xmoprhoa/pmneila source code
  if(type == 2) {
    weights[0] = vec3(0.0,  1.0,  0.0);
    weights[1] = vec3(1.0, -4.0,  1.0);
    weights[2] = vec3(0.0,  1.0,  0.0);
  }
}

vec2 getLaplacian(vec4 centerTexel) {
  // Begin by setting up the Laplacian stencil weights (5-point)
  setWeights(2);

  // Start with center value
  vec2 laplacian = centerTexel.xy * weights[1][1];  // center

  // Add in orthogonal values
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[1])).xy * weights[0][1];  // top
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[2])).xy * weights[1][2];  // right
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[3])).xy * weights[2][1];  // bottom
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[4])).xy * weights[1][0];  // left

  // Add in diagonal values
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[5])).xy * weights[0][2];  // top-right
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[6])).xy * weights[2][2];  // bottom-right
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[7])).xy * weights[2][0];  // bottom-left
  laplacian += texture2D(previousIterationTexture, fract(v_uvs[8])).xy * weights[0][0];  // top-left

  return laplacian;
}

void main() {
  // Get A/B chemical data
  vec4 centerTexel = texture2D(previousIterationTexture, v_uvs[0]);
  float A = centerTexel[0];
  float B = centerTexel[1];

  // Pre-calculate complex and repeated terms
  vec2 laplacian = getLaplacian(centerTexel);
  float reactionTerm = A * B * B;

  gl_FragColor = vec4(
    A + ((dA * laplacian[0] - reactionTerm + f * (1.0 - A)) * timestep),
    B + ((dB * laplacian[1] + reactionTerm - (k + f) * B) * timestep),
    centerTexel.b,
    1.0
  );
}
```

### 6.3 `src/shaders/rd-display.glsl` (36 lines, full verbatim — v2 VIVID ramp)

```glsl
// Reaction-Diffusion display fragment shader
// Simplified from jasonwebb/reaction-diffusion-playground (MIT)
// Stripped: renderingStyle branches, hslFrom/hslTo, colorStop uniforms, helpers.
// Hardcoded app-token amber ramp (premultiplied alpha), VIVID (v2):
//   B = 0.00 -> #09090b (bg-primary), alpha 0.00
//   B = 0.40 -> #8c3c0f (ember),      alpha 0.30
//   B = 0.75 -> #f59e0b (amber-500),  alpha 0.60
//   B = 1.00 -> #fde68a (amber-200),  alpha 0.95

uniform sampler2D textureToDisplay;

varying vec2 v_uv;

const vec3 COLOR_BG  = vec3(0.0353, 0.0353, 0.0431);  // #09090b
const vec3 COLOR_LOW = vec3(0.5490, 0.2353, 0.0588);  // #8c3c0f
const vec3 COLOR_MID = vec3(0.9608, 0.6118, 0.0431);  // #f59e0b
const vec3 COLOR_HI  = vec3(0.9922, 0.9020, 0.5412);  // #fde68a

void main() {
  vec4 pixel = texture2D(textureToDisplay, v_uv);
  float B = pixel.g;

  float aLow  = smoothstep(0.0, 0.35, B);
  float aMid  = smoothstep(0.3, 0.65, B);
  float aHigh = smoothstep(0.6, 1.0, B);

  // alpha: 0.00 at B=0 -> 0.30 at B=0.4 -> 0.60 at B=0.75 -> 0.95 at B=1.0
  float alpha = mix(0.0, 0.30, aLow) + mix(0.0, 0.30, aMid) + mix(0.0, 0.35, aHigh);

  vec3 color = mix(COLOR_BG, COLOR_LOW, aLow);
  color = mix(color, COLOR_MID, aMid);
  color = mix(color, COLOR_HI, aHigh);

  // Premultiplied alpha output — blends as a glow over the glass card
  gl_FragColor = vec4(color * alpha, alpha);
}
```

### 6.4 Where the substrate sits TODAY (the problem) — `src/components/life-river/CoreSample.tsx` lines 68-92

```tsx
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30" data-lifephase="core-sample">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.08), transparent 60%)' }} />

      <div className="flex flex-col items-center px-6 pb-6 pt-6">
        <div data-core-sample-stage className="relative h-72 w-72 sm:h-[420px] sm:w-[420px] lg:h-[460px] lg:w-[460px]">
          {/* Living Substrate sits at z-0 */}
          <LivingSubstrate />

          {/* RingCanvas bumped to z-10 */}
          <div className="relative z-10 h-full w-full">
            <RingCanvas
              phases={phases}
              lens={lens}
              grainByPhase={grainByPhase}
              todayCompletions={todayCompletions}
              memoriesByPhase={memoriesByPhase}
              ltgsByPhase={ltgsByPhase}
              selectedPhaseId={selectedPhaseId}
              onPhaseClick={onPhaseClick}
              onOpenMemory={onOpenMemories}
            />
          </div>
        </div>
```

**PROBLEM:** the substrate is confined to a 288–460px square inside the card, behind
the rings — with the OLD (pre-v2) ramp it was invisible. Even with the new vivid ramp
it reads as a small square, not the "living river" the user wants.

### 6.5 River view container — `src/features/warmth/LifePage.tsx` lines 517-560

```tsx
      ) : (
        /* ═══ NEW RIVER MODE ═══ */
        <div className="flex flex-1 min-h-0 relative gap-6" ref={feedRef}>
          {/* Vital Thread — continuous glowing line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none z-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(251,191,36,0.25) 0%, rgba(111,179,143,0.2) 40%, rgba(56,189,248,0.15) 80%, transparent 100%)',
              filter: 'blur(0.5px)',
            }}
          />

          {/* Apex Map (sticky with scroll parallax) */}
          <motion.div
            style={{ opacity: mapOpacity, scale: mapScale }}
            className="sticky top-0 z-[5] w-[440px] max-w-[92vw] shrink-0 max-h-full overflow-y-auto ws-scroll space-y-3"
          >
            <CoreSample
              phases={phases}
              covenant={{ completions: covenant.completions, commitments: covenant.commitments }}
              memoriesByPhase={memoriesByPhase}
              ltgsByPhase={ltgsByPhase}
              selectedPhaseId={activePhaseId}
              onPhaseClick={handleRingClick}
              lens={lens}
              onLensChange={setLens}
              onOpenMemories={(phaseId) => {
                setActivePhaseId(phaseId)
                setLens('memories')
              }}
            />
            {phases.length > 0 && (
              <TimelineView phases={phases} onJump={scrollToPhase} />
            )}
            <RiverMap
              phases={phases}
              zoomStop={zoomStop}
              onZoomChange={setZoomStop}
              activePhaseId={activePhaseId}
              onPhaseClick={scrollToPhase}
              onAddPhase={() => setAdding(true)}
            />
          </motion.div>

          <div className="flex-1 min-w-0 min-h-0 overflow-auto p-5 ws-scroll relative z-10">
            <div className="mx-auto max-w-5xl space-y-8">
```

**Z-order map of the river container:** vital thread = `absolute ... z-0`; left
sticky column = `z-[5]`; feed column = `relative z-10`. A full-bleed substrate can
sit as `absolute inset-0 z-0 pointer-events-none` FIRST child of the container —
content already floats above it. The left column cards are `bg-zinc-900/30`+glass so
the substrate would glow THROUGH them — decide whether cards need more opacity.

## 7. Feature B — Self Tab (CURRENT STATE, the "mess")

### 7.1 LifePage.tsx — the Self render block (lines 499-514, verbatim)

```tsx
            {pageTab === 'self' && (
              <motion.div key="self" {...crossfade} className="max-w-5xl mx-auto space-y-10">
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">Identity &amp; Profile</h2>
                  <ProfileTab />
                </section>
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">Knowledge Graph</h2>
                  <ContextGraphView />
                </section>
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">Memory &amp; Brain</h2>
                  <BrainManagementView />
                </section>
              </motion.div>
            )}
```

**PROBLEM:** raw stacked sections with plain uppercase text headers, no cohesion, no
page identity, no hierarchy — the three views were each built independently with
their own internal styling languages (see below) and clash when stacked.

### 7.2 LifePage.tsx — tab definitions (PAGE_TABS)

```tsx
const PAGE_TABS: { key: PageTab; label: string; icon: LucideIcon; accent: string }[] = [
  { key: 'covenant', label: 'Covenant', icon: BookOpen, accent: '#fbbf24' },
  { key: 'memories', label: 'Memories', icon: Quote, accent: '#22c55e' },
  { key: 'gold',     label: 'Gold',     icon: Sparkles, accent: '#eab308' },
  { key: 'notes',    label: 'Notes',    icon: NotebookPen, accent: '#38bdf8' },
  { key: 'self',     label: 'Self',     icon: User, accent: '#8b5cf6' },
]
```

`PageTab` type = `'covenant' | 'memories' | 'gold' | 'notes' | 'self'`. Backward
compat: `handleOpenPage`/`redirectToPage` map legacy `'profile'|'graph'|'brain'` →
`'self'`. The pages-mode container is `<div className="flex-1 min-h-0 overflow-auto p-5">` with `AnimatePresence mode="wait"` + `crossfade` motion per tab.

### 7.3 ProfileTab — `src/components/life/ProfileTab.tsx` (441 lines)

Entry: `export function ProfileTab()` — no props. Loads via `(window as any).deskflowAPI.contextGetProfile()` + `contextGetDebug()`. State: `profile`, `loading`, `rebuilding`, `expandedSections` (Set, default `['overview']`), `copiedJson`, `debug`, `memoryHighlights`, `evidence`.

Internals (do NOT rewrite — reflow/wrap only):
- Header area: summary (autobiographical paragraph) with AnimatedGradientText accent
- RadarChart (traits/communication style), ActivityHeatmap, InterestCloud
- ProfileCard (Identity: name, source, confidence), EvidenceDrawer (drill-down per trait with confidence/occurrences/source), debug JSON export
- Vendored UI used: MagicCard, NumberTicker, GlareHover, AnimatedGradientText, confetti
- Section headings inside are mixed-weight text with icons — inconsistent with the other two views.

### 7.4 ContextGraphView — `src/features/warmth/ContextGraphView.tsx` (286 lines)

```tsx
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { RefreshCw, Network } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import type { GraphNode, GraphLink } from './context-graph/types'
import { TYPE_COLORS } from './context-graph/types'
import { EntityDetailPanel } from './context-graph/EntityDetailPanel'
import { GraphControls } from './context-graph/GraphControls'
import { NumberTicker } from '../../components/ui/number-ticker'

const GraphScene = lazy(() => import('./context-graph/GraphScene').then(m => ({ default: m.GraphScene })))

export function ContextGraphView() {
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState<{ episodes: number; entities: number; facts: number; currentFacts: number } | null>(null)
```

Data: `api.brainStats()`, `api.brainSearch('a', ['keyword'])` → nodes/edges → R3F
`GraphScene` (lazy). Layout: header row (title + stat chips via NumberTicker +
refresh), `GraphControls`, the Canvas (dark `#0a0a0c`-ish background, min-height
~500px), `EntityDetailPanel` on select. Accent cyan `#06b6d4` (its console stamp
color). The Canvas has its own solid dark background — over a card it's a big dark
rectangle; consider rounding + border so it reads as a contained "graph card".

### 7.5 BrainManagementView — `src/features/warmth/context-brain/BrainManagementView.tsx` (522 lines)

```tsx
/**
 * BrainManagementView — Full management UI for the Context Brain
 * Spec §24: episodes, entities, facts, extraction jobs, manual entry,
 * stats, MCP status.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Search, Filter, ChevronDown, ChevronRight, RefreshCw,
  Clock, AlertCircle, CheckCircle2, SkipForward, RotateCcw,
  Plus, Send, Server, Zap, BookOpen, Tag, Hash, Activity,
  Brain, Link2, Sparkles,
} from 'lucide-react'
import { NumberTicker } from '../../../components/ui/number-ticker'
import { Particles } from '../../../components/ui/particles'
import { DotPattern } from '../../../components/ui/dot-pattern'
import { BlurFade } from '../../../components/ui/blur-fade'
import { Skeleton } from '../../../components/ui/skeleton'

const api = () => (window as any).deskflowAPI

const cardBg = 'rgba(24,24,27,0.5)'
const cardBorder = '1px solid rgba(255,255,255,0.06)'
const inputBg = 'rgba(24,24,27,0.6)'
const inputBorder = '1px solid rgba(255,255,255,0.08)'
const ACCENT = '#a855f7'
const FAINT = '#52525b'
const SECONDARY = '#d4d4d8'
const PRIMARY = '#fafafa'
const MUTED = '#a1a1aa'
```

Internals: own sub-tab bar (Episodes / Entities / Facts / Extraction Jobs), StatsBar
(4 NumberTicker tiles with DotPattern), list panels with BlurFade + inline
cards `rgba(24,24,27,0.4)` + `1px solid rgba(255,255,255,0.04)`, pagination,
manual-entry panel, MCP status. Its accent is **purple `#a855f7`** — while the Self
tab accent is violet `#8b5cf6`: harmonize (one of the "clashing" tells).

### 7.6 Clash summary (what makes it feel un-designed)

1. Three different accent colors (ProfileTab amber-ish gradients, Graph cyan, Brain
   purple) inside one tab that claims violet.
2. Three different section-heading styles + raw uppercase text headers.
3. Mixed radii/padding: MagicCard vs `rgba(24,24,27,0.4)` chips vs graph canvas
   square corners.
4. No page-level identity: no hero, no "Self" framing, no consistent card system,
   no stat strip unifying the three systems (episodes/entities/facts are split
   across Graph chips + Brain StatsBar).
5. Empty/loading states exist per-view but look different in each.

## 8. Data flow (all renderer-side, no IPC changes)

- LifePage state: `viewMode` ('pages'|'river'), `pageTab`, `lens`, `activePhaseId`,
  `zoomStop`. Hooks: `useLifePhases()`, `useCovenant()`, `useMemories()`,
  `useLongTermGoals()`.
- ProfileTab ← `contextGetProfile` / `contextGetDebug`
- ContextGraphView ← `brainStats` / `brainSearch` → GraphScene (R3F, lazy)
- BrainManagementView ← `brainGetEpisodes` / `brainGetEntities` / `brainGetFacts` /
  `brainGetJobs` / `brainAddFact` etc.
- LivingSubstrate ← pure local simulation (no data).

**Backend audit: all four features are UI-only (✅ no backend gap).** Do NOT invent
new IPC channels.

## 9. Known issues / constraints for the design

1. **Running app is STALE** — user must fully close + relaunch RHEO.exe after any
   build; a rebuilt bundle is invisible until then. (Also: two RHEO instances on
   port 38123 conflict; localStorage origin is fixed at localhost:38123.)
2. Two overlapping independent sims look muddy — the design must end with ONE
   full-bleed substrate behind the river view; CoreSample should NOT keep its own
   instance (keep its amber radial glow + rings).
3. BorderBeam renders as a colored WASH in this Electron build — avoid on content
   cards.
4. The substrate's `useFrame` runs 2 sim passes/frame at 256/384² — fine on
   desktop; keep `document.hidden` pause + reduced-motion unmount + error-boundary
   fallback (CSS glow) — never a black screen.
5. Live content must stay readable over a bright amber coral background: design the
   vignette/legibility layer (glass opacity, radial darkening at edges, contrast on
   text).
6. Don't touch RingCanvas/TimelineView/RiverMap internals; the redesign targets the
   LifePage container + Self wrapper + (optionally) small style harmonization inside
   the three Self views (accent constants, radii, header patterns) WITHOUT rewriting
   their logic.
7. Files CRLF; renderer-side fixes preferred; keep the `data-lifephase` /
   `data-core-sample-stage` / `data-lens-switcher` test attributes intact.