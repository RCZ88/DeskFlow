## Raw Request

"still no animation whatsoever, give the context on what the current implementation looks like because theres no fix whatsoever."

## Context

The sidebar "living logo" in DeskFlow (Electron + React + Tailwind + Vite) is supposed to show
a continuously rotating conic-gradient halo around the logo image and a periodic sheen sweep
across it. After 4 failed attempts, the animation is still completely invisible.

**Read `CONTEXT_BUNDLE.md` first** — it contains every file, every line number, and the
confirmed root cause.

## The Bug (Confirmed)

`src/index.css` lines 216-221 has a global reduced-motion rule:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

The user's Windows system has High Contrast Black active, which Chromium treats as
`prefers-reduced-motion: reduce`. The `!important` on `*` overrides ANY animation on ANY
element — including `.sidebar-logo__halo`'s `sidebarLogoSpin` animation. The specific
reduced-motion block at line 416-419 cannot win against `!important` on a universal selector.

## Engineering Task

Design a fix that makes the sidebar logo halo spin and sheen sweep animate even when
`prefers-reduced-motion: reduce` is active, while preserving the global rule for all other
elements.

The solution must:
1. Override or bypass the global `* { animation-duration: 0.01ms !important }` for the logo
2. NOT remove or weaken the global rule (it protects hundreds of other animations)
3. Work in Electron (Chromium) on Windows with High Contrast active
4. Stay GPU-cheap (transform + opacity only for the spin)
5. NOT use CSS `@property` (Vite strips it — confirmed in previous attempts)

## Design Task

Specify the exact CSS changes needed — which selectors, which properties, which values.
Include the full updated reduced-motion media query block for the sidebar logo.

## UX Task

The animation should feel L2 (Responsive): alive but not distracting. The halo should rotate
continuously at a calm pace. The sheen should sweep periodically. In reduced-motion mode,
the spin can be slower (10s) and the sheen can be disabled — but the spin MUST remain visible.

## Constraints

- `@property` is forbidden (Vite strips it)
- Inline styles required for `mask-image` (CSS url() resolves relative to stylesheet location)
- Framer Motion handles hover/tap spring only; idle animation must be CSS
- The global `*` reduced-motion rule at index.css:216-221 must NOT be modified
- Build command: `npm run build` (or `node scripts/build.mjs`)
- The built CSS is at `dist/assets/index.css` — verify the fix survives Vite's CSS pipeline

## Deliverable

Return a `RESULT.md` with:
1. The exact CSS fix (which file, which lines, what to add/change)
2. Any component changes needed (if the fix requires JS/React)
3. Verification steps to confirm it works
