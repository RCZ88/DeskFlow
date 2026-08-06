# Round 01 — Life Interconnected River

> **Date:** 2026-08-07
> **Stage:** Specialist's first questions received via CZ relay; owner fetched all requested context.
> **Convergence status:** ongoing — awaiting Specialist's next questions after context delivery.

## Specialist Questions (verbatim, as relayed by CZ)

1. `REQUEST: src/features/warmth/gold/GoldPage.tsx` — I need the full source to design the interconnection.
2. `REQUEST: src/hooks/useLongTermGoals.ts` and `goalSchema.ts` (if it exists) — I need to see the long-term goal data model to wire phases + goals together.
3. `REQUEST: CSS` — the utilities `warmth-aurora`, `warmth-serif`, and `ws-scroll` from the project CSS, so my designs match the warmth design language.
4. **Conceptual (time-scale reconciliation):** Commitments and habits live on a day scale; memories and phases live on a year/decade scale. How should the river reconcile these? (a) one long-arc where everything is positioned by date and you scroll across decades, (b) a long-arc spine PLUS a "Today / current season" tributary zone where day-scale things live, (c) zoom stops (ZOOM_STOPS: life 80y / decade 10y / year 1y) that swap the visible scale.
5. **Conceptual (color bands):** When you say "color bands" on phase/journey cards, do you mean (A) the card is rendered with a solid band/block of the phase's color as its design (like a colored card), or (B) the river's SVG arcs rendered at full opacity (strokeOpacity 1) instead of the current 0.9, with dark cards still showing the color as a thin band?

## Owner Responses

### REQUEST #1 — GoldPage.tsx

Full 1303 lines embedded verbatim in `conversation/round-01-context-goldpage.md` (exact file copy, verified char-for-char). Key structural facts for the Specialist:

- Main export `GoldPage({ embedded })` — renders: `GoldHeader` (date hero, DayRing done/total donut, best-streak badge), `CalendarStrip`, focus-session banner, left rail (`DeadlineRadar` month calendar + countdown, `TheVault` long-term goals w/ ProgressRing, `BellBoard` reminders), main column (`WeekBoard` 7-day habit chips, daily `GoalCard` list w/ `CriteriaBuilder` edit, sealed section, `ReflectionCard` hard-stats + journal + smart prompts, `WeekReview` Mon→Sun recap), and finally `<LifeRiver />` at the bottom (L1300).
- Data sources: `api.getGoals(date)`, `api.getGoalsBatch(mon, sun)`, `api.getGoalReview(date)`, `api.getDailyReflection(date)`, `api.getLongtermGoals()`, `api.getReminders()`, `api.saveGoal/saveGoalsBatch/deleteGoal/createReminder/updateReminder/deleteReminder`, `loadCompletions()` from covenant/storage for streaks.
- Species predicate (L114): `isWeeklyish = (g) => !!g.isHabit || g.cadence === 'weekly' || g.period === 'weekly'` — dailies vs weeklyish routing.
- `CAT_META` (L116-124): 6 categories (work #ec4899, personal #8b5cf6, health #34d399, learning #22d3ee, finance #fbbf24, relationships #fb7185) + `catDot()` helper.
- `covenantStreak()` (L71-83) reads the SAME localStorage completions the Covenant feature writes — Gold already reads Covenant data.

### REQUEST #2 — useLongTermGoals.ts / goalSchema.ts

- `goalSchema.ts` **does not exist** anywhere in the repo (glob verified). The long-term goal model lives in `src/components/ai/types.ts` (`LongTermGoal`, `GoalCategory`, `CATEGORY_ACCENT`).
- `src/hooks/useLongTermGoals.ts` exists (76 lines) — full verbatim in `conversation/round-01-context-hooks.md`. NOTE: GoldPage does NOT use this hook; it loads long-term goals itself via `getLongtermGoals()` and manages CRUD via `saveGoalsBatch`/`deleteGoal` (L969-981, 1077-1103). The live runtime payload carries `deadline`, `progress`, `streak`, `period: 'longterm'`, `date: '2000-01-01'` beyond the interface's declared fields (type lags payload).

### REQUEST #3 — CSS utilities

- `warmth-aurora` + `warmth-serif` + `warmth-shimmer` + `:root` motion tokens: `src/features/warmth/warmth-tokens.css` (109 lines).
- `ws-scroll`: scrollbar utility in `src/index.css` (thin scrollbar, #3f3f46 thumb, 8px, rounded, content-box clipped); also a user-select rule in `lyceum-learn-features.css` L775-779.
- Warmth design tokens (clay/sage/amber/sky/glow, serif/sans/mono/display fonts) in index.css `@theme`.
- Full verbatim in `conversation/round-01-context-css.md`.

### Answer — Conceptual Q4 (time-scale reconciliation)

**Recommendation: (b) long-arc spine + "Now / current season" tributary zone, with (c)'s ZOOM_STOPS as the zoom mechanism — i.e. (b) as the layout, (c) as the navigation.** Rationale:

- Covenant commitments, habit chips, Gold dailies, reminders, reflections, and the week board are **today/week-centric** — they must never be spread across an 80-year arc where they'd collapse into a sub-pixel point.
- Memories (dated) and life phases (month/year ranges) are **date-anchored** — they belong on the long arc itself.
- Long-term goals (The Vault) sit in between: they have optional deadlines + progress — a natural candidate for a **current-season zone** (e.g. "this season's journey" where LTG progress rings, active commitments, streak, and today's gold activity live together).
- ZOOM_STOPS already exist in riverMath.ts (Life 80y / Decade 10y / Year 1y) — keep them; the "Today" tributary replaces whatever the Year zoom would show for the current date, so zooming in doesn't duplicate content.
- Memory format suggests: the long arc (decades) shows phases + memories; the tributary (current date) shows commitments/habits/streak/gold; LTG can render on BOTH — arc position = deadline, tributary card = live progress.

### Answer — Conceptual Q5 (color bands)

**Interpretation (A): the CARD carries a solid band/block of the phase's color as its design** — and this is a HARD USER REQUIREMENT, not a preference. The user (CZ) explicitly rejected any rendering where "nothing should render as a translucent dark shade over card content" and demanded "color bands must be fully visible (solid), never looked like a black overlay." Details:

- Each phase/journey card is individually color-customizable (the `life_phases.color` column already exists and the PhaseFormDialog already ships a color picker).
- The band must be SOLID — e.g. a full-color header strip, a solid left rail, or a solid background block — never a translucent overlay on top of content.
- The SVG arc approach (B) is NOT what's wanted for cards; the river canvas can keep arcs as a compact overview (and may raise strokeOpacity to 1 for consistency), but the per-phase cards are the primary surface and must show their color as solid geometry of the card itself.
- Contrast/legibility: since text sits on/next to the solid band, the Specialist should plan for dark text on bright bands or bright bands placed OUTSIDE the text area (edge/rail/header), with the card body staying the standard dark zinc surface. WarmCard remains the base card container.

## Decisions Reached

- Time-scale: (b) layout + (c) zoom stops, merged — long arc for phases+memories, tributary for day-scale, LTG on both.
- Color bands: (A) solid bands as card geometry — hard requirement from user; never translucent overlay.
- goalSchema.ts does not exist; type authority = `src/components/ai/types.ts`; runtime payload richer than type (deadline/progress/streak).

## Notes

- CONTEXT blocks delivered as files (goldpage full copy + hooks + css) so CZ can paste them to the Specialist verbatim.
- Next: CZ relays the two conceptual answers + context files to the Specialist. Specialist replies with next questions or flags backend gaps. Owner fetches on request. Continue until Specialist says "I have enough context to produce RESULT.md".
