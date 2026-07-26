# Sidebar Live Wordmark v4 — De-Rasterizing the Logo

**Status:** replaces v1 (glow), v2 (rotating halo, rejected), and v3 (border beam around the PNG).
v3 is now also superseded — not because it was wrong, but because the user's ask changed: stop
animating *around* a flat PNG, and animate the logo's own letterforms and icon instead.

---

## 0. Direct answer: what was the v3 animation?

v3 kept `rheo-logo.png` as a single flat raster image and added a thin beam of light that traveled
along the *border of the box around it* — the PNG itself never moved or changed. That's exactly the
limitation being called out here: **you cannot animate the letters or the icon glyph of a PNG**,
because a PNG is just pixels — there's no "R", "H", "E", "O", or swirl shape for code to address
individually. Any animation on a raster image is necessarily confined to things layered on top of
or behind it.

**The fix:** stop using a PNG for the logo at all. Rebuild it as real HTML text + an inline SVG icon,
so the animation can live directly in the wordmark and the glyph.

---

## 1. Research: how do teams actually do this?

Two separate problems, two categories of tool:

### A. Turning the *text* into something animatable
This doesn't need any AI tool — "RHEO" is four letters, so it's simplest to just write it as real
`<span>RHEO</span>` text and animate it with CSS/React. The React ecosystem has a mature set of
ready-made patterns for exactly this:

| Source | Component | What it does |
|--------|-----------|----------------|
| [Magic UI](https://magicui.design/docs/components/animated-gradient-text) | **Animated Gradient Text** | A gradient background clipped to the text, animated across the letters — this is the technique used below. |
| [Magic UI](https://magicui.design/docs/components/aurora-text) | **Aurora Text** | Similar effect, softer/more diffuse color blend. |
| [Magic UI](https://magicui.design/docs/components/text-animate) | **Text Animate** | Per-character/per-word entrance animations (blur-in, slide-up, etc.) — good for a one-time mount reveal. |
| [Magic UI](https://magicui.design/docs/components/animated-shiny-text) | **Animated Shiny Text** | A quick shine sweep across text, good as a hover-only accent. |
| [Magic UI](https://magicui.design/docs/components/sparkles-text) | **Sparkles Text** | Small animated sparkle particles around text — more playful, kept in mind but not used (matches "doesn't need to be extreme"). |

### B. Turning the *icon* (the swirl glyph) into something animatable
The swirl is a shape, not a font — it needs to become an actual vector (SVG) before code can rotate
or draw it. This is where AI tools genuinely help, since we only have the flat PNG:

| Tool | Use |
|------|-----|
| [Vectorizer.AI](https://vectorizer.ai/) | AI raster→vector tracer. Upload `rheo-logo.png`'s icon mark, get back a clean, editable SVG path — this is the recommended tool for pulling an accurate vector out of your existing PNG. |
| [Adobe Express PNG-to-SVG](https://www.adobe.com/express/feature/image/convert/png-to-svg) | Same idea, free, quick one-off conversions. |
| [SVGator](https://www.svgator.com/) | Once you have an SVG (from the above, or exported from Figma/Illustrator), SVGator is a no-code timeline editor for hand-crafting more elaborate logo animations (self-drawing stroke reveals, bounce, etc.) beyond a simple CSS rotation — worth a look if you want a fancier one-time intro animation later. |
| [Rive](https://rive.app/) | The heavier-duty option: a full interactive-animation engine with a React runtime, used for state-machine-driven icon/character animation. Overkill for a static sidebar wordmark, but worth knowing about if DeskFlow ever wants richer animated icons elsewhere (empty states, onboarding, etc.). |

**Recommendation for this logo specifically:** use Vectorizer.AI (or Adobe Express) once, on the icon
portion of `rheo-logo.png`, to get a clean SVG path — then it's just a static asset dropped into the
component below. No ongoing AI tool dependency; the animation itself is plain CSS.

---

## 2. Design direction

- **Drop the black rounded box entirely.** It's the thing making this read as "an image with a
  background" rather than a logo. Modern SaaS sidebars (Linear, Raycast, Vercel) mostly render their
  wordmark directly on the sidebar surface with no boxed background — cleaner and it lets the logo be
  bigger without looking like a bigger button.
- **Text:** real `RHEO` HTML text, bold, sized up (~21px, vs. the ~32px-tall boxed PNG before) so it
  reads clearly and fills the header the way you wanted, with a slow gradient sheen (pink → cyan)
  drifting across the letters — subtle at idle, faster on hover. This directly follows Magic UI's
  **Animated Gradient Text** pattern.
- **Icon:** the swirl becomes a small inline SVG stroke path next to the text. Because it's a
  circular/spiral shape (not a rectangle), a continuous slow rotation actually works well here —
  this is the "circle around the thing" motion you asked for earlier, just applied to a shape where
  rotation makes sense instead of to a rectangular halo.
- **Speeds up on hover** (both the text sheen and the icon spin), same interaction language as v3.
- Kept subtle on purpose, per "it doesn't need to be extreme" — no particles, no sparkle, no
  extreme color shifts.

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

/**
 * Live wordmark: real HTML text + inline SVG icon (no PNG, no boxed background).
 *
 * NOTE: the <path> below is a placeholder approximation of the swirl glyph traced
 * from the current PNG. Before shipping, re-export the real vector from your design
 * tool (Figma/Illustrator) if you have it, or run rheo-logo.png through an AI
 * vectorizer (Vectorizer.AI, Adobe Express PNG-to-SVG) to get a pixel-accurate path,
 * then swap the `d` attribute below. Everything else (animation, layout, sizing)
 * stays the same.
 */
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
      <svg className="sidebar-logo__icon" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 3 C22 3 27 8 27 15 C27 20.5 22.8 24.8 17.3 24.8 C13.3 24.8 10.1 22 10.1 18.2 C10.1 15 12.5 12.6 15.5 12.6 C17.8 12.6 19.6 14.3 19.6 16.4"
          stroke="url(#rheoIconGradient)"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="rheoIconGradient" x1="3" y1="3" x2="27" y2="27">
            <stop offset="0" stopColor="#ec4899" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <span className="sidebar-logo__text">RHEO</span>
    </motion.a>
  );
}

export default SidebarLogo;
```

### 3c. `src/index.css` (append — replaces all earlier `.sidebar-logo*` rules)
```css
.sidebar-logo{
  display:inline-flex;align-items:center;gap:10px;cursor:pointer;
  isolation:isolate;-webkit-tap-highlight-color:transparent;
}

.sidebar-logo__icon{
  width:30px;height:30px;flex-shrink:0;
  animation:sidebarIconSpin 12s linear infinite;
}
.sidebar-logo:hover .sidebar-logo__icon{animation-duration:4s}
@keyframes sidebarIconSpin{100%{transform:rotate(360deg)}}

.sidebar-logo__text{
  font-weight:800;font-size:21px;letter-spacing:0.02em;
  background:linear-gradient(90deg,#f4f4f5 0%,#ec4899 25%,#22d3ee 50%,#f4f4f5 75%,#f4f4f5 100%);
  background-size:250% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  animation:sidebarTextSheen 6s ease-in-out infinite;
}
.sidebar-logo:hover .sidebar-logo__text{animation-duration:2.2s}
@keyframes sidebarTextSheen{
  0%{background-position:0% 50%}
  50%{background-position:100% 50%}
  100%{background-position:0% 50%}
}

@media (prefers-reduced-motion:reduce){
  .sidebar-logo__icon{animation:none}
  .sidebar-logo__text{animation:none;background-position:0% 50%}
}
```

---

## 4. Installation Steps

No new dependencies. One asset step:

1. **Get a clean icon vector:** upload `rheo-logo.png` to [Vectorizer.AI](https://vectorizer.ai/)
   (or Adobe Express's PNG-to-SVG tool), crop/export just the swirl mark, and copy the resulting
   `<path d="...">` data into the component in place of the placeholder path in § 3b.
2. Replace `src/components/SidebarLogo.tsx` with § 3b (swap in your real path from step 1).
3. Replace any earlier `.sidebar-logo*` CSS in `src/index.css` with § 3c.
4. `rheo-logo.png` is no longer referenced by the sidebar and can stay in `public/` for other uses
   (favicon, marketing pages, etc.) or be removed if unused elsewhere.

---

## 5. Verification (already performed)

Rendered in headless Chromium, both in the sidebar context and isolated/scaled up:

![Live wordmark verification — in sidebar context and isolated](demo/preview_v4.png)

- **In-context panel:** the wordmark sits directly on the sidebar surface, no boxed background,
  clearly bigger and more present in the header than the old PNG, with no overlap into the nav list.
- **Isolated panel:** confirms the gradient sheen is legible across the full "RHEO" text and the icon
  reads cleanly at 2x scale.

### Steps to re-verify in the running app
1. `npm run dev`, open the sidebar.
2. Watch the header for ~6s: a soft pink→cyan sheen should drift across the "RHEO" letters, and the
   icon should be slowly rotating.
3. Hover: both speed up (sheen ~2.2s, icon spin ~4s).
4. Click/press: quick `scale(0.97)` compression via the Framer spring.
5. Enable "reduce motion" and reload: text is static white/gradient-frozen, icon does not spin.
6. Confirm the wordmark is visually bigger/more prominent in the header than the old boxed PNG, and
   nothing overlaps the nav list below.

---

## Appendix — State matrix

| State | What the user sees | Driver |
|-------|--------------------|--------|
| **Idle** | Slow gradient sheen drifting across "RHEO"; icon rotating once every 12s | CSS `background-position` + `transform` animations |
| **Hover** | Sheen speeds up to ~2.2s; icon spin speeds up to ~4s | CSS `:hover` |
| **Active/press** | Quick `scale(0.97)` compression | Framer Motion spring |
| **Reduced motion** | Fully static wordmark, no sheen, no spin | CSS `prefers-reduced-motion` |
