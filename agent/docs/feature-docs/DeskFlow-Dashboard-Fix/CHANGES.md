# Dashboard Stage-5 Fix + Signature Element

Drop these files into your repo at the same paths (they overwrite/add).

## Root cause of the crash
`src/pages/DashboardPage.tsx` imported `../hooks/useDeepFocus`, which never
existed -> build died with "Cannot find module". Stage 5 was also only
half-wired: `ProductivityFocusZone` was imported but never rendered, and both
new hooks (`useDeepFocus`, `useHomeSummary`) were imported but never called.
Everything else the agent generated was fine (no real syntax errors).

## Files
1. src/hooks/useDeepFocus.ts        (NEW) - typed wrapper over useFocusSession;
   normalizes nullable state, string strictness, and DB history rows
   (actual_sec -> duration_seconds, started_at -> Date, outcome coercion) into
   the exact contract ProductivityFocusZone/DeepFocusPanel expect.
2. src/components/insights/FocusEmber.tsx  (NEW) - the signature element.
3. src/components/insights/GoalRing.tsx    (MOD) - embeds FocusEmber behind the
   ring, adds a one-shot milestone flare, `boost` prop, reduced-motion support.
4. src/pages/dashboard/HeroBand.tsx        (MOD) - forwards `focusActive` -> GoalRing `boost`.
5. src/pages/DashboardPage.tsx             (MOD) - 3 surgical edits:
   - calls `useDeepFocus()` + `useHomeSummary()`
   - HeroBand goal now sourced from rollup: `homeSummary.data?.focusMinutes ?? stats.productiveMinutes`
     and passes `focusActive={deepFocus.state.active}`
   - renders `<ProductivityFocusZone>` after the SummaryStrip, wired to
     `sessionsData.stats` for rankings and `setExpandedModal` for the heatmap/orbit drill-downs.

## Signature element - FocusEmber (concept-driven)
Concept: the app is "Lock-In"; its heart is focus momentum. Focal point = Today's
Focus vs goal (the GoalRing). The ember is ONE hero that amplifies that number:
- intensity = focusMinutes / goal -> more focus = taller, hotter flame
- cold grey ember at 0 (empty state reads as "fire's out")
- roars when a Deep Focus session is active (`boost`)
- one-shot emerald flare the first time you hit the goal (milestone)
- emerald->amber palette = shares the GoalRing / "Locked In" tokens (not pasted-in demo colors)
Motion engineering: canvas additive blending, dt-driven rAF (clamped, visibility-aware),
IntersectionObserver start/stop, devicePixelRatio capped at 2, particle count capped (<=220)
and scaled by intensity, prefers-reduced-motion -> single settled frame.

## Optional next step (lights up Band-2 sparklines)
`getHomeSummary` currently returns only scalars, so `useHomeSummary().data.trends`
is undefined and sparklines degrade gracefully. To populate them, extend the
existing `dashboard:home-summary` handler (main.ts ~23509) to also return a
`trends` object built from `daily_rollup` (last 7-14 rows). No new IPC channel or
migration needed - this is the one allowed additive change from RESULT.md.
