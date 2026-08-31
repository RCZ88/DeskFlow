# Context Bundle — rheo-landing scroll animation fix

> Generated: 2026-08-29
> Task: Fix scroll-driven animations not working on the RHEO landing page
> Target AI: Claude (or equivalent)

---

## Project Overview

**rheo-landing** is a Vite + React + TypeScript single-page landing page for "RHEO — Your time, visualized." Dark theme, amber/rust accent color palette, scroll-driven SVG animations that weave threads, highlight warps, and zoom fabric as the user scrolls.

- **Build**: `npm run build` → `tsc -b && vite build`
- **Dev**: `npm run dev` → Vite dev server
- **No backend, no IPC, no database** — pure frontend landing page

---

## Design Tokens (from `src/index.css`)

```css
@theme {
  --color-void: #050505;
  --color-deep: #0a0a0a;
  --color-bg: #09090b;
  --color-surface: #18181b;
  --color-raised: #27272a;
  --color-amber: #fbbf24;
  --color-gold: #f59e0b;
  --color-terracotta: #c2703d;
  --color-river: #3b82f6;
  --color-teal: #14b8a6;
  --color-coral: #fb7185;
  --color-text: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;

  --font-sans: 'Geist', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
}
```

Global CSS rule (the bug location):
```css
html {
  color-scheme: dark;
  overflow-x: hidden;     /* ← BUG: html becomes scroll container, window.scrollY stops updating */
}

body {
  margin: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## App Composition (`src/App.tsx`)

```tsx
import { Hero } from './sections/Hero';
import { Threads } from './sections/Threads';
import { Fabric } from './sections/Fabric';
import { Store } from './sections/Store';
import { Quiet } from './sections/Quiet';
import { OpenSource } from './sections/OpenSource';
import { Footer } from './sections/Footer';
import './index.css';

function App() {
  return (
    <>
      <Hero />          /* h-[420vh] — scroll-driven weft + warp highlight */}
      <Threads />       /* min-h-[200vh] — scroll-driven thread highlighting */}
      <Fabric />        /* min-h-[150vh] — scroll-driven zoom 3x→1x */}
      <Store />         /* static — bento grid + admin toggle */
      <Quiet />         /* gsap/ScrollTrigger — fade-in on scroll */
      <OpenSource />    /* static — badges + stats */
      <Footer />        /* static — links + CTA */
    </>
  );
}
export default App;
```

---

## Entry Point (`src/main.tsx`)

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## Dependencies (`package.json`)

```json
{
  "dependencies": {
    "gsap": "^3.15.0",
    "lenis": "^1.3.26",
    "lucide-react": "^1.35.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@types/node": "^24.13.3",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^6.1.0",
    "oxlint": "^1.79.0",
    "tailwindcss": "^4.3.3",
    "typescript": "~6.0.2",
    "vite": "^8.2.2"
  }
}
```

Note: `gsap` and `lenis` are listed as dependencies but **Hero.tsx, Fabric.tsx, and Threads.tsx do NOT import gsap or lenis** — they use native `window.addEventListener('scroll', ...)`. Only `Quiet.tsx` imports gsap/ScrollTrigger.

---

## BUG LOCATION: `src/index.css` (line 25)

```css
html {
  color-scheme: dark;
  overflow-x: hidden;     /* ← THE PROBLEM */
}
```

When `overflow-x: hidden` is on `html`, the `<html>` element becomes the scrolling container instead of the viewport/body. This means `window.scrollY` stops updating (or updates inconsistently), and `window.addEventListener('scroll', ...)` on `window` may not fire. Every animation section reads `window.scrollY` or `el.getBoundingClientRect()` — when the scroll container changes, the math breaks and all animations freeze at their initial states.

---

## Hero Section (`src/sections/Hero.tsx`) — lines 1-171

**Scroll animation logic (lines 48-84):**
```tsx
const update = () => {
  const el = containerRef.current;
  if (!el) return;
  const distance = Math.max(1, el.offsetHeight - window.innerHeight);
  const p = Math.max(0, Math.min(1, (window.scrollY - el.offsetTop) / distance));
  setProgress(p);
  // ... sets activeWarp ('MONEY'/'LEARNING'/'TERMINAL') and activeCaption based on p
};

window.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', update);
requestAnimationFrame(update);
```

**Container (line 88):** `<div ref={containerRef} className="relative h-[420vh]">` — a 4.2x viewport-height container that makes the sticky stage scroll through.

**Stage (line 91):** `<div className="sticky top-0 relative w-full h-screen">` — the hero content stays sticky while the container scrolls behind it.

**Progress usage:** `progress` (0-1) drives `LoomSVG`'s `strokeDashoffset` (weft drawing) and `activeWarp` drives warp line highlighting.

---

## LoomSVG Component (`src/components/LoomSVG.tsx`) — lines 1-199

- **Weft paths** (`#weftBase`, `#weftTop`): SVG `<path>` elements styled with `strokeDasharray` = `totalLen` and `strokeDashoffset = totalLen * (1 - progress)`. As progress → 1, offset → 0, weft draws in.
- **Warp lines** (`#warpGroup`): 7 vertical lines (TIME, MONEY, FOCUS, LEARNING, CHAT, TERMINAL, TIMELINE) at x positions 100-1300. `activeWarp` sets `stroke="#fbbf24"`, `stroke-width="3"` on the matching line.
- **Glow dots** at warp crossings: opacity driven by `progress`.
- **Clip paths**: `clipOver` / `clipUnder` for over/under weave effect.

**Scroll progress application (lines 144-158):**
```tsx
useEffect(() => {
  const { weftBase, weftTop, dots, totalLen } = stateRef.current;
  if (!weftBase || !weftTop) return;
  const offset = totalLen * (1 - progress);
  weftBase.style.strokeDashoffset = String(offset);
  weftTop.style.strokeDashoffset = String(offset);
  dots.forEach(d => {
    d.el.style.opacity = String(Math.max(0, Math.min(1, (progress - d.progress + 0.05) * 12)));
  });
}, [progress]);
```

---

## Fabric Section (`src/sections/Fabric.tsx`) — lines 1-114

**Scroll animation logic (lines 19-36):**
```tsx
const update = () => {
  const rect = el.getBoundingClientRect();
  const distance = Math.max(1, el.offsetHeight - window.innerHeight);
  const p = Math.max(0, Math.min(1, -rect.top / distance));
  setScale(3 - p * 2);      // 3x → 1x as p goes 0→1
  setOpacity(Math.min(1, p * 3)); // fade in 0→1
};
window.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', update);
requestAnimationFrame(update);
```

**Container (line 41):** `<section ref={sectionRef} className="relative min-h-[150vh] bg-bg">`
**Sticky inner (line 44):** `<div className="sticky top-0 h-screen">` — an SVG woven grid zooms from `scale(3)` to `scale(1)` and fades in opacity as it scrolls past.

---

## Threads Section (`src/sections/Threads.tsx`) — lines 1-155

**Scroll animation logic (lines 27-39):**
```tsx
const update = () => {
  const rect = el.getBoundingClientRect();
  const distance = Math.max(1, el.offsetHeight - window.innerHeight);
  const progress = Math.max(0, Math.min(1, -rect.top / distance));
  const idx = Math.floor(progress * THREADS.length);
  setActiveIndex(Math.min(idx, THREADS.length - 1));
};
window.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', update);
requestAnimationFrame(update);
```

**Container (line 47):** `<section ref={sectionRef} className="relative min-h-[200vh] bg-bg">`
**Sticky inner (line 50):** `<div className="sticky top-0 h-screen">` — 7 vertical thread lines light up amber as the section scrolls, with a description card appearing beside the active thread.

---

## Quiet Section (`src/sections/Quiet.tsx`) — lines 1-55

Uses **gsap + ScrollTrigger** (the only component that does):
```tsx
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// Inside useEffect:
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: el,
    start: 'top 70%',
    onEnter: () => setVisible(true),
  },
});
```
This works correctly — it's the only gsap usage and doesn't depend on `window.scrollY`.

---

## Other Sections (static, no scroll animation)

- **Store.tsx** — bento grid of 8 modules + 3 bundles + admin toggle (no scroll animation)
- **OpenSource.tsx** — badges + stats grid (no scroll animation)
- **Footer.tsx** — links + CTA + bottom bar (no scroll animation)
- **Closing.tsx** — grid-pattern closing section with CTA (no scroll animation)

---

## Architecture Summary

```
src/
├── App.tsx              — composes all 7 sections
├── main.tsx             — React 19 StrictMode entry
├── index.css            — Tailwind v4, design tokens, THE BUG (overflow-x on html)
├── sections/
│   ├── Hero.tsx         — scroll progress drives weft drawing + warp highlight
│   ├── Fabric.tsx       — scroll progress drives 3x→1x zoom + fade
│   ├── Threads.tsx      — scroll progress drives thread line highlighting
│   ├── Store.tsx        — static bento grid
│   ├── Quiet.tsx        — gsap/ScrollTrigger fade-in (works correctly)
│   ├── OpenSource.tsx   — static badges/stats
│   ├── Footer.tsx       — static footer
│   └── Closing.tsx      — static closing section
└── components/
    └── LoomSVG.tsx      — SVG loom with weft/warp/dots, driven by progress prop
```

All scroll animations follow the same pattern:
1. `useRef` on a tall section container
2. `useEffect` with `window.addEventListener('scroll', update)`
3. `update()` computes progress from `window.scrollY` or `el.getBoundingClientRect()`
4. `requestAnimationFrame(update)` fires once on mount

---

## Bug Reproduction Steps

1. Run `npm run dev`
2. Scroll the page
3. Observe: the weft thread in Hero does NOT draw in (strokeDashoffset stays at full length)
4. Observe: warp lines (MONEY/LEARNING/TERMINAL) do NOT highlight
5. Observe: the Fabric section does NOT zoom from 3x to 1x
6. Observe: thread lines in Threads do NOT light up amber

Root cause: `html { overflow-x: hidden }` makes `<html>` the scroll container. `window.scrollY` no longer updates and `window` scroll events don't fire reliably, so all `setProgress(p)` / `setScale()` / `setActiveIndex()` calls receive stale values.

---

## Fix Requirements

The target AI must:
1. Ensure `window.scrollY` updates and `window` scroll events fire when the user scrolls
2. Ensure all scroll-driven animations (Hero weft/warp, Fabric zoom, Threads highlights) work correctly
3. Not break the Quiet.tsx gsap/ScrollTrigger animation
4. Maintain the dark theme and design tokens
5. Maintain responsive layout (no horizontal overflow at any viewport width)
