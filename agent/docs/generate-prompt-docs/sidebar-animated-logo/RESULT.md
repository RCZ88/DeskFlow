# RESULT.md — Sidebar Logo Reduced-Motion Fix

## What was actually wrong with v1–v4

CSS conflict resolution runs in this exact order: **(1) importance → (2) specificity → (3) source order.** Specificity is *only* consulted once importance is tied.

Your v4 attempt changed the reduced-motion block to:

```css
.sidebar-logo__halo {
  animation: sidebarLogoSpin 10s linear infinite;   /* NOT !important */
}
```

The global rule sets `animation-duration` / `animation-iteration-count` with `!important`. Because v4's shorthand had **no `!important`**, it lost on step (1) — importance — before specificity was ever compared. It didn't matter that `.sidebar-logo__halo` (specificity 0-0-1-0) is more specific than `*` (specificity 0-0-0-0); a non-important declaration always loses to an important one regardless of specificity.

**This is the entire bug.** One missing keyword.

## The fix (one token)

**File:** `src/index.css`
**Location:** the sidebar-logo reduced-motion block (≈ lines 416-419, right after the `sidebarLogoSheen` keyframes)

```css
@media (prefers-reduced-motion: reduce) {
  .sidebar-logo__halo {
    animation: sidebarLogoSpin 10s linear infinite !important;  /* <-- added !important */
    opacity: 0.6;
  }
  .sidebar-logo__sheen {
    animation: none;
    background: none;
  }
}
```

With `!important` added, both the global `*` rule and this rule are important — the cascade now proceeds to specificity, where `.sidebar-logo__halo` (0-0-1-0) beats the universal selector `*` (0-0-0-0). The halo's spin animation wins. `!important` on a shorthand (`animation: … !important`) applies to every longhand it expands to (`animation-name`, `animation-duration`, `animation-timing-function`, `animation-iteration-count`, etc.), so `animation-duration` itself is now `!important` at the higher-specificity selector — exactly what's needed to beat the global override.

The global rule at `index.css:216-221` is **not touched** — not a single character.

## Recommended hardening (optional, defensive)

Not required for correctness, but makes the block self-consistent and immune to future edits (e.g. someone adding a more-specific hover rule later):

```css
@media (prefers-reduced-motion: reduce) {
  .sidebar-logo__halo {
    animation: sidebarLogoSpin 10s linear infinite !important;
    opacity: 0.6 !important;
  }
  .sidebar-logo__sheen {
    animation: none !important;
    background: none !important;
  }
  /* Without this, :hover (specificity 0-0-2-0, still non-important) would
     override the collapsed single-animation duration on mouseover and could
     apply a stray comma-separated duration list left over from the two-
     animation non-reduced-motion rule. */
  .sidebar-logo:hover .sidebar-logo__halo {
    animation-duration: 10s !important;
  }
}
```

## Component changes

**None.** `SidebarLogo.tsx` does not need any edits. This was purely a CSS-cascade bug, not a rendering or React-lifecycle bug. Framer Motion's `whileHover`/`whileTap` spring drives `transform` directly via rAF (not a CSS `transition`), so it never touches or is touched by the `transition-duration: 0.01ms !important` clause — that part of the global rule was never the problem.

## Verification steps

1. Apply the one-line change above to `src/index.css`.
2. Rebuild: `npm run build` (or `node scripts/build.mjs`).
3. Confirm the fix survived Vite/Lightning CSS's minifier:
   ```bash
   grep -n "sidebarLogoSpin" dist/assets/index.css
   ```
   The match must contain `!important` immediately after the animation shorthand (minifiers drop the space before it, e.g. `...infinite!important`, but never strip the token itself).
4. Confirm the global rule is byte-identical to before:
   ```bash
   grep -n "animation-duration:.01ms!important" dist/assets/index.css
   ```
5. Runtime check without touching Windows settings: open the built app in Chromium/Electron DevTools → **Rendering** tab → "Emulate CSS media feature prefers-reduced-motion" → `reduce`. Confirm: halo keeps rotating (~10s per revolution), sheen stays static, no console errors.
6. Real-environment check: Windows Settings → Accessibility → Contrast themes → enable "High Contrast Black" → relaunch DeskFlow → same result as step 5.
7. Regression check: spot-check 2–3 unrelated animated elements (e.g. `.lyceum-animate-gradient`) still freeze under reduced motion — confirms the global rule at 216-221 still protects everything else untouched.

## One thing to double-check in your real file

The reasoning above assumes both the global rule and the `.sidebar-logo__halo` rule are plain `@media` rules with **no `@layer` wrapper** (Tailwind CSS 4's `@import "tailwindcss"` only layers Tailwind's own generated CSS by default; hand-written rules after the import stay unlayered unless you explicitly wrote `@layer { ... }` around them). The bundle's snippets show no `@layer` wrapper around either block, so plain specificity applies as described. If your actual `src/index.css` does wrap either block in `@layer`, cascade-layer order would need to be factored in too (important declarations reverse layer priority) — tell me which layer each block is in and I'll adjust the fix.
