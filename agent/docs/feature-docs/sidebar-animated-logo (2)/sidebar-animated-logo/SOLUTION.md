# Sidebar Wordmark v9 (FINAL) — Dark Titanium + Left→Right Shine

Dark brushed-titanium "RHEO" wordmark: heavier and wider for dominance, with a bright specular
shine that travels **left → right** across the letters, then pauses and repeats. No glow.

**See `demo/preview_v9.gif` for the actual animation** (a static PNG can't show the motion).

---

## 1. What changed from the previous version

| Request | Change |
|---------|--------|
| "Shine should travel left → right" | Animated `background-position` so the bright band enters from the left and exits right (verified frame-by-frame). |
| "Not dark enough" | Darker titanium gradient — silver top edge down to near-black (`#1c1e22`) bottom. |
| "Thicker / wider / more dominant" | Font weight bumped to **900** (Arial Black), wider letter-spacing, and `transform: scaleX(1.10)` to widen the letterforms. |
| "Ambient light behind it" (earlier) | Still removed — no glow filter, only a subtle dark depth shadow. |

---

## 2. How the effect works (plain CSS, no libraries)

Two stacked background layers on the text, both clipped to the glyphs via `background-clip: text`:

1. **Moving shine band** — a narrow bright diagonal highlight; only this layer's `background-position`
   animates, sliding so the highlight crosses left → right.
2. **Static dark-titanium base** — a top-to-bottom silver→near-black gradient that never moves, so the
   metal look is always present.

Weight/width come from `font-weight:900`, `letter-spacing`, and `transform:scaleX(1.10)`.

---

## 3. Complete Source Code

### 3a. `src/App.tsx`
```tsx
import { SidebarLogo } from './components/SidebarLogo';
// ...
<div className="p-5 flex items-center border-b border-zinc-800 shrink-0">
  <SidebarLogo />
</div>
```

### 3b. `src/components/SidebarLogo.tsx`
```tsx
import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

const PRESS_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 };

type SidebarLogoProps = { href?: string };

export function SidebarLogo({ href = '#/' }: SidebarLogoProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.a
      href={href}
      aria-label="RHEO — Home"
      className="sidebar-logo"
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={PRESS_SPRING}
    >
      <span className="sidebar-logo__text">RHEO</span>
    </motion.a>
  );
}

export default SidebarLogo;
```

### 3c. `src/index.css` (append — replaces all earlier `.sidebar-logo*` rules)
```css
.sidebar-logo{
  display:inline-flex;align-items:center;cursor:pointer;
  isolation:isolate;-webkit-tap-highlight-color:transparent;
}

.sidebar-logo__text{
  font-family:'Arial Black','Inter',system-ui,sans-serif;
  font-weight:900;font-size:26px;letter-spacing:0.09em;
  transform:scaleX(1.10);transform-origin:left center;
  color:transparent;
  background-image:
    linear-gradient(100deg,
      rgba(255,255,255,0) 44%,
      rgba(255,255,255,0.60) 48%,
      rgba(255,255,255,0.98) 50%,
      rgba(255,255,255,0.60) 52%,
      rgba(255,255,255,0) 56%),
    linear-gradient(180deg,
      #cfd3d8 0%, #9498a0 22%, #565b63 46%, #34383f 62%, #1c1e22 100%);
  background-size:220% 100%, 100% 100%;
  background-position:150% 0, 0 0;
  background-repeat:no-repeat;
  -webkit-background-clip:text;background-clip:text;
  filter:drop-shadow(0 2px 2px rgba(0,0,0,.6));
  animation:sidebarShine 3.2s cubic-bezier(.4,0,.2,1) infinite;
}
.sidebar-logo:hover .sidebar-logo__text{animation-duration:1.2s}

@keyframes sidebarShine{
  0%{background-position:150% 0, 0 0}
  45%{background-position:-70% 0, 0 0}
  100%{background-position:-70% 0, 0 0}
}

@media (prefers-reduced-motion:reduce){
  .sidebar-logo__text{animation:none;background-position:-70% 0,0 0}
}
```

---

## 4. Installation Steps

No new dependencies, no external tools.

1. Replace `src/components/SidebarLogo.tsx` with § 3b.
2. Replace any earlier `.sidebar-logo*` CSS in `src/index.css` with § 3c (make sure the old
   glow/drop-shadow rules from prior versions are gone).
3. If a colored glow still appears behind the logo in the app, that is your sidebar's own background
   effect (Backlight/Particles), not this component — dim/remove it separately.

---

## 5. Verification (already performed)

**Animated:** `demo/preview_v9.gif` — shows the bright shine entering from the left, crossing the
letters to the right, then a brief pause before repeating, over the dark titanium base.

Direction was confirmed frame-by-frame: R → H → E → O.

### Re-verify in the running app
1. `npm run dev`, open the sidebar.
2. "RHEO" reads as dark silver/titanium, heavy and wide.
3. Every ~3.2s a bright shine sweeps left → right across the letters, then pauses.
4. Hover speeds the sweep up (~1.2s).
5. Reduced motion: static titanium, no sweep.

---

## Appendix — State matrix

| State | What the user sees | Driver |
|-------|--------------------|--------|
| **Idle (resting)** | Dark brushed-titanium "RHEO," heavy + wide, no highlight | Static base layer |
| **Idle (sweeping)** | Bright shine crosses left → right every ~3.2s, then pauses | CSS keyframe on shine layer |
| **Hover** | Same sweep, sped up to ~1.2s | CSS `:hover` |
| **Active/press** | Quick `scale(0.97)` compression | Framer Motion spring |
| **Reduced motion** | Static titanium text, no sweep | CSS `prefers-reduced-motion` |
