# Sidebar Animated Logo — “Living Logo” Solution

**Role:** Lead Designer & Frontend Engineer
**Scope:** Purely visual / frontend. Replaces the static `rheo-logo.png` treatment in the
sidebar header with a lively, premium, on-brand animated logo. Dark-mode only.

---

## 0. TL;DR

- **Removed** the `Zap` gradient icon block + `AI TRACKER` text; **kept** the PNG.
  (`Zap` remains *imported* — it is used elsewhere — only the JSX usage in the header is gone.)
- **Recommended approach: Hybrid — CSS ambient backlight glow + mask-based shimmer sweep on the
  existing PNG + Framer Motion spring on hover/tap.**
- Keeps the current raster art (no risky hand-trace of an unknown logo), is GPU-cheap
  (compositor-only properties), and covers all four states: idle / hover / active / reduced-motion.
- Verified visually in a headless-Chromium render of a faithful sidebar mock (see § 6 + `demo/preview.png`).

---

## 1. Research Summary

Six approaches were evaluated against three axes: **visual result**, **performance** (the sidebar
is always mounted), and **implementation complexity / risk**.

| # | Approach | Visual result | Perf (always-rendered) | Complexity / risk | Verdict |
|---|----------|---------------|------------------------|-------------------|---------|
| 1 | **Animated SVG logo** (morph / stroke-draw / gradient cycle) | Highest ceiling — true vector life | Excellent (SVG SMIL/CSS is cheap) | **High + blocking risk**: requires an accurate vector of `rheo-logo.png`. The source art is a raster; we don't have clean paths. Hand-tracing risks an off-brand logo. | ❌ Rejected — blocked by missing vector source |
| 2 | **CSS animation on the PNG** (glow / pulse / shimmer via filters + masks) | Very good — shimmer + glow read as “premium” | **Excellent** — `opacity`, `transform`, `background-position` only | Low | ✅ **Core of the pick** |
| 3 | **Magic UI `Backlight`** (SVG-filter glow wrapper) | Good soft glow | Good, but an SVG `feGaussianBlur` filter runs continuously | Low–med (extra dep to re-skin) | ⚠️ Superseded — a two-stop radial-gradient blur gives the same look with zero deps |
| 4 | **Particle ambient** (Magic UI `Particles`, canvas) | Eye-catching ambient motion | **Poor for always-on** — a `requestAnimationFrame` canvas ticking forever behind the sidebar burns battery/CPU | Med | ❌ Rejected — violates the “avoid heavy continuous canvas” constraint |
| 5 | **Framer Motion hover** (spring scale/rotate/glow + idle loop) | Great for interaction feedback | Great on hover; a JS idle loop wastes frames when nobody’s looking | Low | ✅ **Used for hover/tap only** (idle handed to CSS) |
| 6 | **Hybrid** (2 + 5, plus a masked shimmer) | Best balance: ambient personality **and** interaction delight | **Excellent** — idle is pure CSS, JS only wakes on pointer | Low–med | ✅✅ **CHOSEN** |

### Why the Hybrid wins

1. **No blocked dependency.** It animates *around and through* the existing PNG, so we never need
   to reproduce the logo as vector paths. It also upgrades for free the day a real SVG lands — swap
   the `<img>` for the SVG and every layer still works.
2. **Cheapest possible idle cost.** Idle loops touch only `opacity`, `transform`, and
   `background-position` (GPU compositor). No canvas, no layout, no JS timer. Safe for a component
   that is mounted for the entire session.
3. **Right tool per job.** CSS keyframes = ambient personality (L3). Framer Motion spring = crisp,
   physical hover/press feedback (L2). Reduced-motion cleanly strips both.
4. **On-brand by construction.** Glow uses the exact DeskFlow accent tokens
   (`#ec4899` pink → `#22d3ee` cyan) — no default indigo→emerald slop.

### The key technique: **mask the shimmer to the logo’s own pixels**

Instead of a rectangular shine sweeping over a bounding box (cheap-looking), a moving diagonal
highlight is clipped to the logo silhouette via `mask-image: url(/rheo-logo.png)`. The glint only
appears *on the logo art itself*. This is what makes a raster PNG look like a crafted, living mark.
This was explicitly validated in the render — it works on a plain raster image in Chromium.

---

## 2. Visual Specification

### Dimensions & layout
| Token | Value |
|-------|-------|
| Logo height | **32px** (`h-8`), `object-contain`, width auto (art aspect ratio) |
| Container | `p-5` header, `border-b border-zinc-800`, inside `w-64` (256px) glass sidebar — unchanged |
| Hit target | Whole wordmark is an `<a>` → comfortably ≥ 44px tall including padding |
| Corner radius | `12px` on the interactive wrapper (≤ `rounded-xl`) |
| Stacking | `isolation: isolate` on the wrapper; z-order: glow `0` < img `1` < shine `2` |

### Colors (DeskFlow tokens, exact)
| Layer | Value |
|-------|-------|
| Glow stop A (pink) | `rgba(236, 72, 153, 0.55)` → transparent  *(= `--accent-primary #ec4899`)* |
| Glow stop B (cyan) | `rgba(34, 211, 238, 0.45)` → transparent  *(= `--accent-secondary #22d3ee`)* |
| Shimmer highlight | `rgba(255, 255, 255, 0.90)` (diagonal, 12% band) |
| Logo drop shadow | `rgba(0, 0, 0, 0.35)` blur 6px, y 1px |
| Surface behind | glass: `rgba(24,24,27,.80)` + `blur(16px)` (existing `.glass`) |

### Typography
None added — the logo is the raster wordmark. (If it ever becomes text-based, use **Geist**,
weight 700, tracking `-0.01em`; do **not** use `AnimatedGradientText` defaults — re-skin to the two
accent tokens above.)

### Motion timing
| State | Property | Duration | Easing | Loop |
|-------|----------|----------|--------|------|
| Idle — glow breathe | `opacity` 0.22→0.42, `scale` 0.98→1.03 | 5s | `ease-in-out` | infinite |
| Idle — shimmer glint | `background-position` 180%→‒60% | 5s cycle, glint occupies first ~16% (~0.8s) then rests | `ease-in-out` | infinite (a glint every ~5s) |
| Hover — scale | `transform: scale(1.04)` | spring | `stiffness 300, damping 30, mass 0.8` | one-shot |
| Hover — glow boost | `opacity` → 0.70, cycle → 3.2s | 3.2s | `ease-in-out` | while hovered |
| Hover — shimmer speedup | cycle → 2.6s | 2.6s | `ease-in-out` | while hovered |
| Active (press) | `transform: scale(0.98)` | spring | same spring | on tap |
| Reduced motion | all loops off; faint static glow `opacity .26`; no scale | — | — | — |

> Signature ease `cubic-bezier(0.16, 1, 0.3, 1)` is available for any non-spring tween; here the
> hover uses the app spring for a more physical feel, and idle loops use `ease-in-out` because they
> are symmetric breathing/glint cycles.

### Glow / glass layer specs
- Glow element: `position:absolute; inset:-120% -35%;` (bleeds beyond the 32px art so the blur is
  soft, not clipped), `filter: blur(16px)`, two radial gradients (pink left-biased @32%, cyan
  right-biased @70%).
- Shine element: `inset:0`, `linear-gradient(100deg, transparent 38%, white .9 50%, transparent 62%)`,
  `background-size: 220% 100%`, masked by the logo art (`mask-size: contain`).

---

## 3. Complete Source Code

### 3a. `src/App.tsx` — header edit (lines ~2496–2499)

> Minimal, targeted edit — do **not** reformat the file (CRLF preserved). `Zap` stays imported.

**Add near the other imports (top of file):**
```tsx
import { SidebarLogo } from './components/SidebarLogo';
```

**Replace the logo header block:**
```tsx
<div className="w-64 border-r border-zinc-800 flex flex-col h-full glass">
  <div className="p-5 flex items-center border-b border-zinc-800 shrink-0">
    <SidebarLogo />
  </div>
  {/* ... rest of sidebar unchanged ... */}
```

(That is the only App.tsx change: swap the bare `<img ... />` for `<SidebarLogo />`. The `glass`,
borders, padding, and nav below are untouched.)

### 3b. `src/components/SidebarLogo.tsx` — NEW FILE

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

// DeskFlow signature spring (matches the app's stiffness/damping/mass).
const LOGO_SPRING: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

type SidebarLogoProps = {
  href?: string; // where the wordmark links (default app root)
  src?: string;  // must match the CSS mask path
};

export function SidebarLogo({
  href = '#/',
  src = './rheo-logo.png',
}: SidebarLogoProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.a
      href={href}
      aria-label="RHEO — Home"
      className="sidebar-logo"
      initial={false}
      whileHover={reduceMotion ? undefined : { scale: 1.04 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={LOGO_SPRING}
    >
      <span aria-hidden className="sidebar-logo__glow" />
      <img src={src} alt="RHEO" className="sidebar-logo__img h-8 object-contain" />
      <span aria-hidden className="sidebar-logo__shine" />
    </motion.a>
  );
}

export default SidebarLogo;
```

### 3c. `src/index.css` — APPEND

```css
.sidebar-logo {
  position: relative;
  display: inline-flex;
  align-items: center;
  border-radius: 12px;
  cursor: pointer;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
}
.sidebar-logo__img {
  position: relative;
  z-index: 1;
  display: block;
  filter: drop-shadow(0 1px 6px rgba(0, 0, 0, 0.35));
}
.sidebar-logo__glow {
  position: absolute;
  inset: -120% -35%;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(55% 130% at 32% 50%, rgba(236, 72, 153, 0.55), transparent 70%),
    radial-gradient(55% 130% at 70% 50%, rgba(34, 211, 238, 0.45), transparent 70%);
  filter: blur(16px);
  opacity: 0.28;
  animation: sidebarLogoGlow 5s ease-in-out infinite;
  will-change: opacity, transform;
}
.sidebar-logo__shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(100deg, transparent 38%, rgba(255,255,255,0.9) 50%, transparent 62%);
  background-repeat: no-repeat;
  background-size: 220% 100%;
  background-position: 180% 0;
  -webkit-mask: url("/rheo-logo.png") center / contain no-repeat;
  mask: url("/rheo-logo.png") center / contain no-repeat;
  animation: sidebarLogoShine 5s ease-in-out infinite;
  will-change: background-position;
}
.sidebar-logo:hover .sidebar-logo__glow { opacity: 0.7; animation-duration: 3.2s; }
.sidebar-logo:hover .sidebar-logo__shine { animation-duration: 2.6s; }

@keyframes sidebarLogoGlow {
  0%, 100% { opacity: 0.22; transform: scale(0.98); }
  50%      { opacity: 0.42; transform: scale(1.03); }
}
@keyframes sidebarLogoShine {
  0%   { background-position: 180% 0; }
  16%  { background-position: -60% 0; }
  100% { background-position: -60% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sidebar-logo__glow { animation: none; opacity: 0.26; }
  .sidebar-logo__shine { animation: none; background: none; }
}
```

> **Mask path note:** the `mask` URL must resolve to the *same* asset as the `<img>` `src`.
> With Vite, `public/rheo-logo.png` is served at `/rheo-logo.png` (absolute), which is why the CSS
> uses `/rheo-logo.png`. If your app is deployed under a sub-path (non-root `base`), change both the
> CSS mask and the `<img src>` to that base, or pass `src` into `<SidebarLogo />` and set the CSS var
> accordingly.

---

## 4. Installation Steps

**No new dependencies.** Framer Motion is already installed; the glow replaces Magic UI `Backlight`
and the shimmer replaces `AnimatedShinyText`, both with zero-dependency CSS re-skinned to DeskFlow
tokens (Anti-Slop compliant).

1. Create `src/components/SidebarLogo.tsx` (§ 3b).
2. Append the CSS block (§ 3c) to `src/index.css`.
3. Edit `src/App.tsx` (§ 3a): add the import and swap the `<img>` for `<SidebarLogo />`.
4. Confirm `public/rheo-logo.png` exists and is served at `/rheo-logo.png`.

_Optional_ (only if you later prefer the library components instead of the CSS versions):
```bash
npx shadcn@latest add "https://magicui.design/r/backlight"
npx shadcn@latest add "https://magicui.design/r/particles"
```
If you do, re-skin per the Anti-Slop checklist (zinc/glass surfaces, `rounded-xl` max, dark only,
accent tokens `#ec4899`/`#22d3ee` — never the default indigo→emerald).

---

## 5. Verification Steps

1. **Run the app** (`npm run dev`) and open the sidebar.
2. **Idle:** watch for ~5s — a soft pink/cyan glow breathes behind the mark and a white glint sweeps
   across the logo pixels roughly once every 5s. It should read as “alive but calm,” never flashy.
3. **Hover:** the mark springs up to `scale(1.04)`, the glow brightens and speeds up, and the glint
   cadence quickens. Moving away settles it back with spring physics.
4. **Active/press:** clicking briefly compresses to `scale(0.98)` then navigates `href`.
5. **Reduced motion:** in OS settings enable “Reduce motion” (or DevTools → Rendering →
   *Emulate CSS prefers-reduced-motion*). Reload: no breathing, no glint, no hover scale — just the
   crisp logo with a faint static glow.
6. **Layout guard:** confirm the 256px sidebar, `p-5` header, bottom border, and nav items are
   unchanged and nothing shifts when the glow scales (it is `position:absolute`, so it never affects
   layout).
7. **Perf sanity:** DevTools Performance → idle recording should show only compositor work for the
   logo (no scripting, no layout/paint storms), because idle loops animate compositor-only
   properties and there is no canvas/JS timer.

---

## 6. Verification Render (proof)

The technique was validated by rendering a faithful mock of the glass sidebar + logo in headless
Chromium (idle, forced mid-shimmer, and hover states shown side by side):

![Living Logo verification render](demo/preview.png)

- **Left:** the real `w-64` glass sidebar with the animated logo in the header.
- **Top-right (idle):** breathing backlight only — subtle.
- **Mid-right (mid-shimmer, forced frame):** the white glint clipped to the wordmark pixels + full
  pink→cyan backlight.
- **Bottom-right (hover):** `scale(1.04)` + intensified glow.

> The logo shown is a **stand-in `RHEO` wordmark** generated only to prove the mask-based shimmer
> works on a raster PNG. In your app it is simply your real `public/rheo-logo.png` — no art change
> needed.

### Files in this bundle
| File | Purpose |
|------|---------|
| `SOLUTION.md` | This spec (research, visual spec, code, install, verification). |
| `SidebarLogo.tsx` | Drop-in production component → `src/components/SidebarLogo.tsx`. |
| `index.additions.css` | CSS to append to `src/index.css`. |
| `demo/demo.html` | Standalone, dependency-free demo of all states (open in a browser). |
| `demo/preview.png` | The headless-Chromium verification render above. |
| `demo/rheo-logo.png` | Placeholder wordmark used by the demo only (replace with your real asset). |

---

## Appendix — State matrix (Human-Centric UX)

| State | What the user sees | Driver |
|-------|--------------------|--------|
| **Idle** | Breathing pink→cyan backlight + a shimmer glint every ~5s | CSS keyframes |
| **Hover** | Spring scale-up + brighter/faster glow + faster glint | Framer spring + CSS `:hover` |
| **Active** | Quick press compression, then navigation | Framer `whileTap` |
| **Reduced motion** | Static logo + faint constant glow, no scale | `prefers-reduced-motion` + `useReducedMotion()` |
