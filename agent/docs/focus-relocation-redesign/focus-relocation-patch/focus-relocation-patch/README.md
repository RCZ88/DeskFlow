# Deep Focus relocation + redesign

Based on your survey answers:
1. Full Deep Focus experience -> **new "Focus" tab inside the Activity page** (next to Applications / Websites / Productivity)
2. Dashboard's compact Focus card -> **kept in place, redesigned**
3. AI Assistant's FocusBoard -> **left untouched**

## 1. Decision document

**Where it lives now:** `Activity -> Focus` tab, i.e. `/activity?tab=focus`. Discovered the same way you already discover Applications/Websites/Productivity -- it's the 4th pill in Activity's existing sticky tab bar. No new sidebar item, no new route to remember.

**Why this location:** Activity is already DeskFlow's "how did I spend my time" home, and Focus sessions are exactly that kind of data. Reusing the tab bar you already have (rather than a new page, new sidebar row, or a modal) means zero new navigation surface and zero new muscle memory -- consistent with your goal of keeping the full experience discoverable without it dominating a page it doesn't belong on.

## 2. Migration plan -- the 3 locations

| Location | Before | After |
|---|---|---|
| **ProductivityPage** (`/activity?tab=productivity`) | Full `<FocusSection />` (timer + stats + history + insights) rendered above the score card -- this is what felt "disturbing" | **Removed entirely.** Productivity now starts straight at the score card again, like before Focus was ever added here. |
| **Activity page** (`/activity?tab=focus`, new) | Did not exist | **New 4th tab**, pink-accented (`#ec4899`), lazy-loaded. Renders the exact same `<FocusSection />` component (timer + stats + history + insights) -- nothing about that component's internals changed, only where it's mounted. |
| **DashboardPage** (`/`) | Compact `FocusSessionCard`, plain digits, checkbox, no polish -- "ugly" | **Kept in the same grid slot, fully redesigned in place** (see below). Still 1/3 width, still the same start/stop/preset flow. |
| **AiPage** (`/ai`) | `FocusBoard` + `GoalRow` | **Untouched**, per your answer. |

No backend, hook, or IPC changes -- `useFocusSession`, `focusHelpers.ts`, `focusManager.ts`, and the `deep_focus_sessions`/`deep_focus_events` tables are all unchanged and still the single shared data layer for both remaining UIs.

## 3. Component architecture (what actually changed)

```
src/pages/ActivityPage.tsx        EDITED -- added a 4th tab ("focus"), a lazy
                                   FocusTab wrapper around the existing named
                                   export FocusSection, and fixed a handful of
                                   pre-existing broken animation literals in
                                   this file while touching it (see note below).
src/pages/ProductivityPage.tsx    EDITED -- removed the <FocusSection /> line
                                   and its import. Nothing else changed.
src/components/focus/
  FocusSessionCard.tsx            REWRITTEN -- same props/behavior (uses
                                   useFocusSession directly, no new props),
                                   now visually matches the full Focus tab.
src/features/focus/**             UNCHANGED -- FocusSection, FocusTimer,
                                   FocusStats, FocusHistory, FocusInsights,
                                   focusHelpers.ts, focusConfetti.ts all stay
                                   exactly as they were; only where
                                   FocusSection gets mounted changed.
```

**A note on the pre-existing bug I fixed in passing:** while editing `ActivityPage.tsx` I found several of its animation values had been corrupted into literal placeholder tokens (e.g. `initial=N` instead of a real object) -- this was already broken in your codebase before I touched it, unrelated to today's changes. Since I had to edit this exact file anyway, I repaired those spots using the same values as the equivalent, working code elsewhere (your Life page tab bar uses an identical pattern). Nothing else in the file changed in substance.

## 4. Visual specs

**Activity -> Focus tab:** identical to the current full experience (nothing to redesign here since it was never the problem on its own -- it was the placement on Productivity that was the issue): pink `GlassCard` timer with `AnimatedCircularProgressBar` + `NumberTicker` countdown, 6 presets, strict toggle, ambient `Particles` while active; stats/history/insights in the 2-column layout, all as before.

**Dashboard `FocusSessionCard` (redesigned):**
- Same 1/3-width `GlassCard accent="pink"` slot, same compact footprint
- **New:** a real `AnimatedCircularProgressBar` (112px) with `NumberTicker` MM:SS countdown in the center, replacing the old bare `text-4xl` digits
- **New:** a status `Badge` ("Active"/"Idle") next to the title, replacing the old inline pulsing-dot text
- **New:** subtle ambient `Particles` (very low density/opacity) only while active -- the one ambient layer, matching the anti-slop "at most one" rule
- Preset chips, strict-mode row, and the 5-item recent history list keep their existing compact shape, just restyled: history rows are now individual `bg-zinc-800/30` pills with outcome-colored icons instead of bare text lines
- Start button recolored from pink to **emerald** and End button to **rose**, matching the color convention already established by the full Focus experience (green = go, red = stop) instead of using pink for both brand-accent and action
- `whileTap={ { scale: 0.96 } }` on all buttons for tactile feedback (previously none)

**States covered in both:** idle (preset selection), active (countdown + particles), completed (handled by the shared history list -- outcome badge/icon), failed (rose icon + "broke on X"), aborted (amber icon). Empty history state was already handled ("Recent" block only renders when `history.length > 0`).

## 5. Interaction flow -- unchanged, confirmed intact

Preset -> Start -> countdown -> soft-block overlay (handled by existing `focusManager.ts`, untouched) -> Complete (confetti via `focusConfetti.ts`, kept) / Fail / Abort -> appears in history immediately via the existing `onEnded` IPC event refresh. No keyboard shortcuts existed before and none were requested in your survey answers, so none were added -- flag it if you want Space-to-start/Esc-to-stop added next.

## Implementation order (already applied, in this order)

1. Added the "Focus" tab + lazy `FocusTab` wrapper to `ActivityPage.tsx` (repairing the pre-existing broken animation literals along the way).
2. Removed `<FocusSection />` and its import from `ProductivityPage.tsx`.
3. Rewrote `FocusSessionCard.tsx` in place with the circular-progress + NumberTicker + Particles + Badge treatment.
4. Verified all three files with a syntax-only TypeScript pass (zero errors).
