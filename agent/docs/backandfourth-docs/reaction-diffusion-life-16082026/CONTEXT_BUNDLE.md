# Context Bundle — Reaction-Diffusion Life Design

> Self-contained codebase reference for the Specialist AI. The external AI has ZERO file access — everything it needs is pasted inline below.

## 1. Project & Stack

- **App:** DeskFlow (App Tracker) — Electron + React 18 + TypeScript + Tailwind CSS + Framer Motion 12 + better-sqlite3.
- **Already installed rendering deps (critical):**
  - `three` ^0.183.2
  - `@react-three/fiber` ^9.5.0
  - `@react-three/drei` ^10.7.7
  - `@react-three/postprocessing` ^3.0.4
  - `framer-motion` ^12.35.0
  - `lucide-react` ^0.577.0
- **Renderer build:** Vite (hashed chunks, `emptyOutDir: true`). CSP allows `'unsafe-eval'` (needed for shader/viz libs).
- **The Life page is the ONLY page that already uses R3F** — `ContextGraphView.tsx` wraps a GraphScene in `<Canvas>` — so the pattern is proven in-app.

## 2. Design Tokens (src/index.css :root)

```css
--bg-primary:     #09090b;          /* page background — near-black */
--bg-secondary:   #18181b;
--bg-tertiary:    #27272a;
--bg-glass:       rgba(24, 24, 27, 0.80);
--bg-glass-heavy: rgba(24, 24, 27, 0.92);
--text-primary:   #f4f4f5;
--text-secondary: #a1a1aa;
--text-muted:     #52525b;
--accent-primary:   #ec4899;        /* pink (app default) */
--accent-secondary: #22d3ee;
--success:         #34d399;
--warning:         #fbbf24;         /* amber — the LIFE PAGE accent */
--error:           #f87171;
--info:            #38bdf8;
--border-subtle:   #27272a;
--border-default:  #3f3f46;
```

Fonts: Inter/Geist body, JetBrains Mono for mono, "Libre Caslon Text" serif for warmth serif (`font-serif` used on Life page blurbs).

The Life page sets `[data-page="life"]` — **note: there is NO `[data-page="life"]` override in index.css** (default `--page-accent: var(--accent-primary)` = pink #ec4899 applies). The Life page's own visuals hard-code amber (#fbbf24) via class names.

## 3. Life Page Structure (`src/features/warmth/LifePage.tsx`, 972 lines)

`export default function LifePage()` — state: `viewMode: 'pages' | 'river'` (persisted `life-view-mode`, default `river`), `pageTab` (7 tabs), `lens` (phases/covenant/gold/memories), `activePhaseId`, `expandedPhaseId` + `expandedMode` (system/manual).

### Top-level render (lines 411-412)

```tsx
return (
  <div className="flex flex-col h-full" data-page="life">
    {/* sticky mode toggle bar (z-40) with Pages/River pill + page sub-tabs */}
```

### Pages mode (lines 477-517)

```tsx
{viewMode === 'pages' ? (
  <div className="flex-1 min-h-0 overflow-auto p-5">
    <AnimatePresence mode="wait">
      {pageTab === 'covenant' && <motion.div key="covenant" {...crossfade} className="max-w-3xl mx-auto"><CovenantPage embedded /></motion.div>}
      {pageTab === 'memories' && <motion.div key="memories" {...crossfade} className="max-w-4xl mx-auto"><MemoriesPage embedded /></motion.div>}
      {pageTab === 'gold' && <motion.div key="gold" {...crossfade} className="max-w-5xl mx-auto"><GoldPage /></motion.div>}
      {pageTab === 'notes' && <motion.div key="notes" {...crossfade} className="max-w-5xl mx-auto"><NotesTab /></motion.div>}
      {pageTab === 'profile' && <motion.div key="profile" {...crossfade} className="max-w-3xl mx-auto"><ProfileTab /></motion.div>}
      {pageTab === 'graph' && <motion.div key="graph" {...crossfade} className="max-w-5xl mx-auto"><ContextGraphView /></motion.div>}
      {pageTab === 'brain' && <motion.div key="brain" {...crossfade} className="max-w-5xl mx-auto"><BrainManagementView /></motion.div>}
    </AnimatePresence>
  </div>
) : (
```

### River mode (lines 518-561) — THE signature surface

```tsx
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
    <CoreSample ... />        {/* ring stage */}
    <TimelineView ... />      {/* horizontal bars */}
    <RiverMap ... />          {/* SVG river path */}
  </motion.div>

  <div className="flex-1 min-w-0 min-h-0 overflow-auto p-5 ws-scroll relative z-10">
    <div className="mx-auto max-w-5xl space-y-8">
      <motion.div ...><TodayTributary ... /></motion.div>
      {/* lens indicator (data-lens-indicator), quick-add toolbar (data-quick-add), PhaseCards */}
```

## 4. CoreSample Stage (`src/components/life-river/CoreSample.tsx`)

```tsx
export function CoreSample({ phases, covenant, memoriesByPhase, ltgsByPhase, selectedPhaseId, onPhaseClick, lens, onLensChange, onOpenMemories }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30" data-lifephase="core-sample">
      {/* existing ambient radial glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.08), transparent 60%)' }} />
      <div className="flex flex-col items-center px-6 pb-6 pt-6">
        <div data-core-sample-stage className="relative h-72 w-72 sm:h-[420px] sm:w-[420px] lg:h-[460px] lg:w-[460px]">
          {/* RingCanvas SVG rings here */}
```

## 5. Existing R3F Precedent (`src/features/warmth/ContextGraphView.tsx`)

The Graph tab already mounts a full three.js scene:

```tsx
import { Canvas } from '@react-three/fiber'
...
<Canvas camera={{ position: [0, 0, 500], fov: 50 }}>
  <GraphScene ... />
</Canvas>
```

So a `<Canvas>` mount inside LifePage (or a sub-component) is an established, working pattern in this exact page.

## 6. App Background Layer (App.tsx)

The app renders `AppBackground` behind pages (particles/dot patterns per page accent). If the Specialist decides full-page ambient background is right, the Life page container (`flex flex-col h-full`) sits inside the app shell's scroll area — a `fixed inset-0 -z-10` (or absolute within the page) three.js canvas behind the two-pane layout is achievable without touching other pages. Details of AppBackground can be fetched on request.

## 7. The Reference Implementation (jasonwebb/reaction-diffusion-playground)

- **Model:** Gray-Scott. Two chemicals A, B per texel. Parameters: `f` feed, `k` kill, `dA`/`dB` diffusion, `dt` timestep, `AB2` reaction rate. Laplacian via neighbor sampling.
- **Technique:** three.js `DataTexture` (R=A, G=B) → custom GLSL fragment shader runs RD equation per pixel → **ping-pong WebGLRenderTargets** (several simulation passes per display frame) → `displayFrag.glsl` maps concentrations to color.
- **Known-good presets** (f, k): coral growth, stripes, spots — the "life growing" look the user wants is typically `f≈0.0545, k≈0.062` (coral) or classic `f=0.0367, k=0.0649` (cells).
- **Display styles in the playground:** grayscale, color ramp via uniforms, invert, etc. — we'll map to app tokens (amber on near-black).
- License: repo is MIT-style public playground — safe to adapt shader math.

## 8. Context Gaps (explicit)

| Context Needed | Status | How to Obtain |
|----------------|--------|---------------|
| Exact GLSL source of simulationFrag.glsl / displayFrag.glsl + uniforms | ❌ Missing | Specialist REQUESTs → Owner fetches from GitHub |
| App.tsx AppBackground internals (fixed layer? z-index?) | ⚠️ Partial | Specialist REQUESTs → Owner pastes |
| Full RingCanvas.tsx SVG (interaction with a canvas behind it) | ❌ Missing | Specialist REQUESTs → Owner pastes |
| PhaseCard expanded-panel structure (if card textures wanted) | ❌ Missing | Specialist REQUESTs → Owner pastes |
| Whether GPU shader compile is OK under the app's CSP ('unsafe-eval' present) | ✅ Have | webgl shaders don't use eval — fine |

**Rule:** If the Specialist needs any of these, it must REQUEST them; the Owner fetches and pastes the real code.