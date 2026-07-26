# Context Bundle — Sidebar Animated Logo Fix

## Goal
Fix the sidebar "living logo" animation so it actually animates. The logo should show a
rotating conic-gradient halo around the logo edges and a periodic sheen sweep across the
logo image. Currently NO animation is visible despite the CSS being syntactically correct.

## Architecture
- Electron + React + Tailwind CSS 4 + Vite + Framer Motion
- Sidebar logo is rendered in `src/App.tsx` line 2237: `<SidebarLogo />`
- Component at `src/components/SidebarLogo.tsx`
- CSS at `src/index.css` lines 333-427
- Logo image: `rheo-logo.png` — an opaque PNG with a dark rounded-box background

## THE BUG (Root Cause — Confirmed)

**File:** `src/index.css` lines 216-221

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  /* ... lyceum-specific overrides below ... */
}
```

**Why it kills the logo:**
The user's Windows system has **High Contrast Black** active (`HKCU\Control Panel\Accessibility\HighContrast`).
Chromium/Electron treats High Contrast as `prefers-reduced-motion: reduce`.
The global `*` rule with `!important` overrides ANY animation on ANY element, including the
sidebar logo's `sidebarLogoSpin` animation. The specific `.sidebar-logo__halo` rule at line
416-419 (`animation: sidebarLogoSpin 10s linear infinite`) cannot win against `!important`
on a universal selector.

**Confirmed:** Built CSS at `dist/assets/index.css` line 20485-20486:
```css
animation-duration: .01ms !important;
animation-iteration-count: 1 !important;
```

## Current Implementation

### Component (`src/components/SidebarLogo.tsx`)
```tsx
import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

const LOGO_SPRING: Transition = {
  type: 'spring', stiffness: 300, damping: 30, mass: 0.8,
};

type SidebarLogoProps = { href?: string; src?: string; };

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
      <span aria-hidden className="sidebar-logo__halo" />
      <img src={src} alt="RHEO" className="sidebar-logo__img h-10 object-contain" />
      <span aria-hidden className="sidebar-logo__sheen"
        style={{ WebkitMaskImage: `url("${src}")`, maskImage: `url("${src}")` }} />
    </motion.a>
  );
}
```

### CSS (`src/index.css` lines 333-427)
```css
.sidebar-logo {
  position: relative;
  display: inline-flex;
  align-items: center;
  border-radius: 14px;
  cursor: pointer;
  isolation: isolate;
  padding: 2px;
  -webkit-tap-highlight-color: transparent;
}

.sidebar-logo__img {
  position: relative;
  z-index: 1;
  display: block;
}

.sidebar-logo__halo {
  position: absolute;
  inset: -8px;
  z-index: 0;
  border-radius: 18px;
  pointer-events: none;
  background: conic-gradient(#ec4899, #22d3ee, #a855f7, #ec4899);
  filter: blur(8px);
  opacity: 0.85;
  transform-origin: center center;
  animation:
    sidebarLogoSpin 6s linear infinite,
    sidebarLogoHalo 4.5s ease-in-out infinite;
}

.sidebar-logo__sheen {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  background: linear-gradient(
    100deg,
    transparent 35%,
    rgba(255, 255, 255, 0.55) 48%,
    rgba(255, 255, 255, 0.35) 55%,
    transparent 70%
  );
  background-repeat: no-repeat;
  background-size: 220% 100%;
  background-position: 180% 0;
  animation: sidebarLogoSheen 3.6s ease-in-out infinite;
  will-change: background-position;
}

.sidebar-logo:hover .sidebar-logo__halo {
  animation-duration: 3s, 4.5s;
  opacity: 1;
}
.sidebar-logo:hover .sidebar-logo__sheen {
  animation-duration: 1.8s;
}

@keyframes sidebarLogoSpin {
  to { transform: rotate(360deg); }
}

@keyframes sidebarLogoHalo {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 0.85; }
}

@keyframes sidebarLogoSheen {
  0%   { background-position: 180% 0; }
  24%  { background-position: -60% 0; }
  100% { background-position: -60% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-logo__halo {
    animation: sidebarLogoSpin 10s linear infinite;
    opacity: 0.6;
  }
  .sidebar-logo__sheen {
    animation: none;
    background: none;
  }
}
```

### The global reduced-motion rule (THE PROBLEM — src/index.css lines 216-228)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .lyceum-animate-gradient,
  .lyceum-animate-shiny-text,
  .lyceum-ambient-glow {
    animation: none !important;
  }
  .lyceum-ambient-glow { opacity: 0.4; }
}
```

## Design Context
- Logo image (`rheo-logo.png`) has an opaque dark background (black rounded box)
- Effects placed BEHIND the logo (same z-index area) are invisible
- The halo must extend OUTSIDE the logo bounds (`inset: -8px`) to be visible
- The sheen sweeps ACROSS the logo surface (masked to logo shape)
- Motion should be L2 (Responsive) level — alive but not distracting
- The sidebar background is `glass` class (frosted dark glass)

## Constraints
- Must NOT break the global reduced-motion rule for other elements
- Must work in Electron (Chromium) on Windows with High Contrast active
- Must be GPU-cheap (transform + opacity only for the spin)
- `@property` at-rules are FORBIDDEN — Vite strips them silently
- Inline `style` attributes are required for `mask-image` (CSS url() resolves wrong)
- Framer Motion is used for hover/tap spring only, NOT for idle CSS animations

## Previous Attempts (All Failed)
1. v1: Glow behind logo (z-index 0) — occluded by opaque PNG
2. v2: `@property --logo-ang` for conic gradient rotation — Vite strips `@property`
3. v3: `transform: rotate()` on halo element — correct CSS, but global `!important` rule kills it
4. v4: Changed `animation: none` to `animation: sidebarLogoSpin 10s` in reduced-motion block — still killed by global `* { animation-duration: 0.01ms !important }`

## Environment
- OS: Windows 11 with High Contrast Black active
- `prefers-reduced-motion: reduce` is ACTIVE (triggered by High Contrast)
- Electron (Chromium) renderer
- Vite 7.3.2 build pipeline
- Tailwind CSS 4
- Framer Motion (motion/react)

## What the Architect Must Design
A solution that:
1. Keeps the sidebar logo halo spinning and sheen sweeping even when
   `prefers-reduced-motion: reduce` is active
2. Does NOT remove or weaken the global `*` rule (it protects other animations)
3. Works against `!important` specificity on the universal selector
4. Stays GPU-cheap (transform + opacity only)
5. Is clean and maintainable (not a hack)

Possible approaches to explore:
- Use `!important` on the `.sidebar-logo__halo` animation to override the global rule
- Move the logo animation to a separate CSS file that loads AFTER index.css
- Use inline styles with `animation` property (inline `!important` beats stylesheet `!important`)
- Use Framer Motion's `animate` prop for the rotation instead of CSS keyframes
- Scope the global `*` rule to exclude `.sidebar-logo__halo` (e.g., `:not(.sidebar-logo__halo)`)
