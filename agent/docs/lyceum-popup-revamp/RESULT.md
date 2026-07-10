# Lyceum Learn — Popup UI Revamp (indigo/purple → warm editorial)

Three popup/dialog UIs revamped from the old indigo/violet/emerald palette to the warm
editorial tokens (clay / sage / amber / sky). **Visual-only** — no layout, structure,
behavior, IPC, or animation-primitive changes. All tokens already exist in `index.css @theme`.

The edited files are real drop-ins mirroring your repo layout:
```
src/components/learn/CreateLessonDialog.tsx
src/components/learn/OnboardingPanel.tsx
src/components/learn/LearnPage.tsx   (ImportView region only)
```

## Global token mapping (the design system decision)

| Old (indigo/violet/emerald) | New (editorial) | Role |
|---|---|---|
| `indigo-500` | `clay-500` | primary accent fills / rings |
| `indigo-400` | `clay-400` | borders, icon strokes |
| `indigo-300` | `clay-300` | accent text, code, labels |
| `violet-500` | `amber-500` | gradient secondary (magic/generate) |
| `violet-300` | `amber-300` | secondary badge text |
| `emerald-500/400/300` | `sage-500/400/300` | success / done / completion |
| `red-*` (errors) | *unchanged in dialogs*; **ImportView failure → warm slate** | error |

Opacity suffixes are preserved exactly (e.g. `/15`, `/20`, `/30`, `/40`) so contrast and
weight are identical — only the hue changes.

---

## 1. CreateLessonDialog.tsx — *every* indigo/violet/emerald replaced (0 remaining)

| Line | Element | Before | After |
|---|---|---|---|
| 43 | Step indicator **active** | `bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40` | `bg-clay-500/15 text-clay-300 ring-1 ring-clay-500/40` |
| 45, 74 | Step indicator **done** | `bg-emerald-400/10 text-emerald-300` | `bg-sage-400/10 text-sage-300` |
| 76 | Step indicator (progress active) | `bg-indigo-500/15 text-indigo-300` | `bg-clay-500/15 text-clay-300` |
| 84 | Progress spinner ring | `border border-indigo-300 border-t-transparent` | `border border-clay-300 border-t-transparent` |
| 264 | Icon container | `bg-indigo-500/10 border border-indigo-500/20` | `bg-clay-500/10 border border-clay-500/20` |
| 265, 372, 436, 502 | Icon color (Wand2 / FileText / Sparkles) | `text-indigo-400` | `text-clay-400` |
| 349, 415 | Required-field asterisk | `text-indigo-400` | `text-clay-400` |
| 357, 387, 421, 451 | Textarea **focus ring** (all inputs) | `focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10` | `focus:border-clay-500/40 focus:ring-2 focus:ring-clay-500/10` |
| 478 | Node-count selected chip | `bg-indigo-500/20 text-indigo-300 border border-indigo-500/30` | `bg-clay-500/20 text-clay-300 border border-clay-500/30` |
| 501 | Info callout | `bg-indigo-500/5 border border-indigo-500/15` | `bg-clay-500/5 border border-clay-500/15` |
| 505 | `.ldoc` inline code | `text-indigo-300` | `text-clay-300` |
| 520 | Copy button "copied" state | `bg-emerald-500/15 text-emerald-300 border-emerald-500/25` | `bg-sage-500/15 text-sage-300 border-sage-500/25` |
| 545 | **Generate Here** card icon (gradient) | `from-indigo-500/20 to-violet-500/10 border border-indigo-500/25` | `from-clay-500/20 to-amber-500/10 border border-clay-500/25` |
| 546 | Generate Here icon | `text-indigo-300` | `text-clay-300` |
| 558 | Generate btn **done** | `bg-emerald-500/15 text-emerald-300 border border-emerald-500/25` | `bg-sage-500/15 text-sage-300 border border-sage-500/25` |
| 560 | Generate btn **generating** | `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20` | `bg-clay-500/10 text-clay-400 border border-clay-500/20` |
| 561 | Generate btn **idle** | `bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/30` | `bg-clay-500/15 hover:bg-clay-500/25 text-clay-300 border border-clay-500/20 hover:border-clay-500/30` |
| 627–630 | Success callout | `bg-emerald-500/10 border border-emerald-500/20`, `text-emerald-400`, `text-emerald-300` | `bg-sage-500/10 border border-sage-500/20`, `text-sage-400`, `text-sage-300` |
| 663 | **Generate Prompt** footer button | `bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30` | `bg-clay-500/20 hover:bg-clay-500/30 text-clay-300 border border-clay-500/30` |

**Tailwind arbitrary values:** none in this file required changing (no `[...]` color literals).

**Visual before/after (key states):**
- *Step indicator:* active pill goes from cool indigo glow to a warm clay pill with clay ring; the done pill goes from minty emerald to soft sage with a sage check — reads clearly as "progress = warm, complete = green-sage."
- *Generate Here card:* the icon gradient shifts from indigo→violet (cool/techy) to clay→amber (warm/editorial, like a lit match), matching the welcome page.
- *Generate button lifecycle:* idle = clay, working = dim clay, done = sage. Distinct and on-palette.

**UX (animation):** untouched — the existing `motion.div` `initial/animate/exit` spring transitions and `AnimatePresence` stay exactly as-is, so step transitions remain fluid. Constraint #4 honored (no animation primitives changed).

---

## 2. ImportView (LearnPage.tsx, the import popup) — scoped edits only

Only the ImportView region was touched; the rest of `LearnPage.tsx` (welcome empty-state,
header, reader nav, library list) was intentionally left unchanged to stay within the
stated popup scope.

| Line | Element | Before | After |
|---|---|---|---|
| 958 | **"Import" (worked example)** button | `bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 … border border-indigo-500/30` | `bg-clay-500/20 hover:bg-clay-500/30 text-clay-300 … border border-clay-500/30` |
| 971 | Tab active — **Pick file** | `border-b-2 border-indigo-400` | `border-b-2 border-clay-400` |
| 980 | Tab active — **Paste JSON** | `border-b-2 border-indigo-400` | `border-b-2 border-clay-400` |
| 1009 | Paste **textarea focus** | `focus:border-indigo-500/50` | `focus:border-clay-500/50` |
| 1026 | **Validate & Import** button | `bg-indigo-500/20 hover:bg-indigo-500/30 … text-indigo-300 border border-indigo-500/30` | `bg-clay-500/20 hover:bg-clay-500/30 … text-clay-300 border border-clay-500/30` |
| 1035 | Result box **success** | `border-emerald-500/20 bg-emerald-500/5` | `border-clay-400/30 bg-clay-500/5 shadow-[0_0_20px_rgba(194,85,58,0.15)]` |
| 1035 | Result box **failure** | `border-red-500/20 bg-red-500/5` | `border-zinc-600/40 bg-zinc-800/40` (warm slate) |
| 1038 | Success check icon | `text-emerald-400` | `text-sage-400` |
| 1040 | "Import successful" headline | `text-emerald-400` | `text-clay-300` |

**Tailwind arbitrary value added:** `shadow-[0_0_20px_rgba(194,85,58,0.15)]` on the success
box — the warm clay glow from the CONTEXT_BUNDLE shadow pattern, at a subtle 0.15 alpha.

**Design — button hierarchy (per task #2):** clay is the primary CTA on both action buttons
(worked-example import, Validate & Import); sage marks the success checkmark; the failure
state drops red for a calm warm-slate so a failed import reads as "needs attention," not
"alarm." (Amber remains reserved for warnings inside `ValidationReport`, which already uses
its own tokens and was out of scope.)

**Visual before/after:** success feedback was a green-on-green box; now it's a clay-tinted
card with a faint warm glow and a sage check — clearly positive but editorial. Failure was
a red box; now it's a neutral warm-slate card, visually distinct from success without
shouting.

**Failure-text note:** the failure branch still uses `text-red-400` for the "Import failed"
label/icon (semantic error color, not part of the indigo/purple/emerald migration scope).
If you'd prefer it fully warm, change `text-red-400` → `text-clay-400` in the failure block.

---

## 3. OnboardingPanel.tsx — token swap + progressive clay→sage accent

| Line | Element | Before | After |
|---|---|---|---|
| 55 | Header icon | `text-indigo-400` | `text-clay-400` |
| 65 | Icon circle | `bg-indigo-500/15 … text-indigo-400` (static) | **progressive** `STEP_CIRCLE[currentStep]` (clay-300 → clay-400 → clay-500 → sage) |
| 79 | Dot indicator | active `bg-indigo-400` | active = `STEP_DOT[currentStep]` (progressive clay→sage) **+** completed dots now `bg-sage-400/60` |
| 97 | **Next** button | `bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30` | `bg-clay-500/20 hover:bg-clay-500/30 text-clay-300 border border-clay-400/30` |
| 104 | **Got it** button | `bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30` | `bg-sage-500/20 hover:bg-sage-500/30 text-sage-300 border border-sage-400/30` |

**Design — progressive accent (per task #3):** two literal-class arrays were added at module
scope (so Tailwind's JIT scanner sees the full class names — dynamic `bg-${x}` would be
purged):
```ts
const STEP_CIRCLE = ['bg-clay-500/15 text-clay-300','bg-clay-500/15 text-clay-400',
  'bg-clay-500/20 text-clay-400','bg-clay-500/20 text-clay-500','bg-sage-500/15 text-sage-400'];
const STEP_DOT = ['bg-clay-300','bg-clay-400','bg-clay-400','bg-clay-500','bg-sage-400'];
```
The icon circle and active dot index into these by `currentStep`, so the panel literally
warms up as the learner advances and turns sage on the final "AI Tutor & Quiz" step.
Completed dots show a muted sage to read as "done." A `transition-colors duration-300` on
the circle makes the hue shift glide rather than snap.

**Visual before/after:** the step icon and active dot were a flat indigo throughout; now
step 1 is light clay, deepening to clay-500 by step 4, then sage on completion — giving a
felt sense of progression that the old single-color version lacked.

**UX question (auto-dismiss / "Don't show again"):** *Recommendation, not implemented* —
per constraints #3 (preserve behavior) and #6 (don't add/remove elements), I left behavior
identical. My recommendation if you want it later (all renderer-only, no IPC):
- **Don't auto-dismiss** on the last step — the final step is content ("AI Tutor & Quiz"),
  so auto-closing would hide it. Keep the explicit **Got it** button.
- **Add a "Don't show again"** checkbox in the footer that writes a `localStorage` flag
  (e.g. `lyceum:onboarding:dismissed`), and have the parent skip auto-opening when set.
  This is a behavior change, so it's flagged for your sign-off rather than shipped here.

---

## Verification
- `CreateLessonDialog.tsx`: **0** remaining `indigo`/`violet`/`emerald` tokens.
- `OnboardingPanel.tsx`: **0** remaining; progressive arrays use literal class names.
- `LearnPage.tsx`: ImportView region fully migrated; out-of-scope regions untouched.
- All three pass `esbuild` syntax check. No brace-corruption or unbraced-prop artifacts.
- No new CSS custom properties or Tailwind config changes; all tokens are existing `@theme`
  values. Layout, spacing, structure, behavior, and animation primitives unchanged.
