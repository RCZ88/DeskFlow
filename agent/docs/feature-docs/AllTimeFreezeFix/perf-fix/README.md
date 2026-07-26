# All-Time Freeze Fix — Master Plan

Three independent freeze points, one root pattern: **O(N) or O(agents×days) work
running synchronously on the main render thread every time `period` becomes
`'all'`**, plus **unstable object references** that re-trigger that work even
when the underlying data hasn't changed. Every fix below is a *targeted*
replacement of the exact code shown in `CONTEXT_BUNDLE.md` — nothing here
changes visual output, chart shape, or existing period behavior (today/week/
month/7day/30day untouched).

## Apply in this order
1. `patches/01-agentChartsData.md` — **PRIMARY FIX.** Removes the numAgents
   multiplier from the format() hot loop. This alone should kill most of the
   Cityscape freeze.
2. `patches/02-stable-aiAgents.md` — stops the Three.js canvas from
   re-rendering when the agent data didn't actually change.
3. `patches/03-fetchAnalytics-debounce.md` — stops redundant backend refetch
   storms when the user clicks through periods quickly.
4. `patches/04-backend-getLogsFiltered.md` — SQL-level filtering + a new
   pre-aggregated endpoint for the solar system, so 100K rows never have to
   reach the renderer for 'all'.
5. `patches/05-app-filteredLogs-appStats.md` — removes the two full-array
   copies and the per-log `.toISOString()` calls in App.tsx.
6. `patches/06-orbitsystem-downsample.md` — bounds `computePlanets` input.
7. `patches/07-statspage-dailyUsage-hourly.md` — removes per-log `format()`
   and the inner while-loop for large datasets.
8. `VERIFICATION.md` — how to confirm each freeze is actually gone.

## Why this order
Steps 1–3 are pure front-end and fix the **PRIMARY target (Cityscape)**
without touching the backend — ship these first even if the backend change
takes longer to review. Steps 4–7 are secondary (solar system + dashboard)
and steps 5–7 get cheaper once step 4 lands (less data reaches the renderer
at all), but each patch also works standalone if you only want the frontend
half for now.

## The one architectural note (Requirement 5)
The deepest fix for "cascading re-renders on `setLogs`" is to stop prop-drilling
`logs` through the whole tree and instead give each page a `useLogsSelector()`
hook backed by a `useSyncExternalStore` store, so a page that doesn't render
raw logs (e.g. a settings page) never re-renders when `setLogs` fires. That is
a bigger refactor than the other patches and isn't required to fix the freeze
— `startTransition` (patch 05) plus stable references (patch 02) already stop
the *blocking* behavior, which is the actual user complaint. I've left the
context-store refactor as a documented follow-up in `patches/05-app-filteredLogs-appStats.md`
rather than bundling it here, since it touches every page and is easy to get
wrong without the full file tree in front of me.

## Design constraints honored
- No visual/output changes — same charts, same cityscape, same solar system.
- `today`/`week`/`month`/`7day`/`30day` filtering behavior is untouched.
- Old `getLogs()` is left completely alone; all callers keep working.
- Every backend change is additive (new IPC channels), nothing is removed.
