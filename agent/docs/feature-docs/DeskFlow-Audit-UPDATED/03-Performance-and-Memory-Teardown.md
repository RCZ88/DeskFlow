# Doc 3 — Performance & Memory Teardown

> **Scope.** Where CPU, memory, and battery actually go in DeskFlow, with real line references. The headline: a **renderer polling storm** is almost certainly your biggest felt-performance and battery drain, and it's cheap to fix.

## P1 — The renderer polling storm `[P1 · App.tsx & DashboardPage.tsx]`

**Symptom.** The renderer runs a stack of independent `setInterval` loops that refetch over IPC on wall-clock timers, regardless of whether anything changed:

| Interval | Location | Fires |
| --- | --- | --- |
| `reloadOverrides` | `App.tsx:1186` | **every 1,000 ms** |
| `loadTrackingBrowser` | `App.tsx:956` | every 5,000 ms |
| `refresh` | `App.tsx:883` | every 30,000 ms |
| `fetchGaps` | `App.tsx:982` | every 60,000 ms |
| dashboard `setFetchKey(k=>k+1)` | `DashboardPage.tsx:298` | **every 5,000 ms** |
| dashboard `refreshInterval` | `DashboardPage.tsx:1002` | periodic |

The 1-second `reloadOverrides` is the worst offender: it re-reads settings/overrides **once per second forever**, even when the app is idle or backgrounded. The 5s `setFetchKey` bump forces the entire dashboard subtree to refetch and re-render on a timer. On a laptop this is a constant wakeup that prevents the CPU from idling — measurable battery cost and jank.

**Fix (three moves):**
1. **Push, don't poll.** You *already* have the mechanism: `preload.ts` exposes `onForegroundChanged`, `onTrackingHeartbeat`, `onBrowserTrackingEvent`, `onExternalDataChanged`. Have main **emit an event when data actually changes**, and have the renderer refetch on that event instead of on a timer. Delete the 1s and 5s intervals.
2. **The 1s override poll should be event-driven.** It exists because the `storage` event doesn't fire in the same window. Replace with a tiny in-app pub/sub (or a `BroadcastChannel`): when Settings saves, emit `overrides-changed`; subscribers reload. Zero polling.
3. **Gate any remaining timers on visibility.** Wrap survivors in `if (document.visibilityState === 'visible')` and clear them on blur. You already send `setPageVisibility` — use it to pause work for hidden pages.

**Principle.** *Prefer event-driven (push) over polling (pull).* Polling spends CPU proportional to the *timer rate*; events spend it proportional to the *change rate*. When data changes rarely but you poll often, you're paying for nothing. Poll only when you genuinely can't observe change.

## P2 — Dashboard refetch invalidates too coarsely `[P1 · DashboardPage.tsx:298, 291]`

**Symptom.** `fetchKey` is a single counter that, when bumped, refetches *everything* the dashboard shows. Combined with the 5s timer, the whole page re-queries on a loop. There's no caching layer, so identical `{period, dateOffset}` requests re-run constantly.

**Fix.** Adopt a query-cache (TanStack Query, or a minimal home-grown `useQuery(key, fetcher)`), keyed by `['dashboard', period, dateOffset]`. Cache results, dedupe in-flight requests, and invalidate a *specific* key only when the relevant `on*` event fires. Refetch becomes surgical, not global.

**Principle.** *Cache with precise invalidation keys.* "Refresh everything on a timer" is the absence of a caching strategy. Model each fetch as a keyed resource; invalidate the smallest key that changed.

## P3 — Materialize aggregates so reads never scan raw logs `[P1 · main.ts DB layer]`

**Symptom.** You already fought this once — `getDashboardAggregates` was created to collapse many calls into one. But aggregations are still computed on demand from `logs`/`daily_stats`. As the `logs` table grows (5s tracking -> ~17k rows/day), on-demand `GROUP BY` over months gets slower every week. Insights/Reports and the future Rewind will hammer the same paths.

**Fix.** Add a **materialized `daily_rollup` table** (`date, domain, metric, value`) written by:
- an incremental update on session close (cheap), and
- a nightly backfill job (you already have a `backfill-aggregations` handler — extend it).

Dashboard, Insights, and Rewind then read `daily_rollup` (indexed by date) — O(days), not O(raw events). This is the single highest-leverage backend perf change and it's a prerequisite for Rewind (Doc 4).

**Principle.** *Precompute on write when you read far more than you write.* Tracking writes once; dashboards read constantly. Shift the cost to write-time and amortize it. (Same instinct as a database index or a CQRS read model.)

## P4 — Heavy 3D/animation components on the default path `[P1/P2 · OrbitSystem.tsx (4,203 lines), AICityscape.tsx (2,228)]`

**Symptom.** `OrbitSystem` (React Three Fiber) is the dashboard hero and is enormous; `AICityscape` is a 2.2k-line 3D scene. Three.js holds GPU buffers and runs a render loop; on a 6 GB RTX 4050 laptop this competes with everything else and drains battery even when the numbers it shows are trivial. Your own page-context notes it "re-renders aggressively."

**Fix.**
- Keep `OrbitSystem` **lazy-loaded** (it is) but **demote it from the default dashboard hero** to an opt-in "toy" view (this also aligns with the Doc 4 dashboard redesign).
- Ensure the R3F canvas **pauses its render loop when not visible** (`frameloop="demand"` and invalidate on interaction, or unmount on route change).
- Confirm both are fully code-split so they're not in the initial bundle.

**Principle.** *Pay for expensive capabilities only when they're on screen and wanted.* Lazy-load, pause off-screen, and don't put your heaviest widget on the most-visited route by default. Decoration should never tax the idle state.

## P5 — Tracking-loop efficiency (this part is mostly good) `[P2 · main.ts:3813, 3416]`

**Symptom / positive.** The foreground poll runs every 5s (`main.ts:3813`) and you already added a **game-mode skip** (`GAME_POLL_SKIP = 6`, only call `active-win` every 30s during games, `main.ts:3416`). That's good instinct. Remaining concerns:
- 5s `active-win` calls spawn native work; ensure results are diffed so an unchanged foreground doesn't write a DB row every tick (write only on *change* + accumulate duration).
- The heartbeat interval (`main.ts:3815`) and browser session flush (`main.ts:14456`) add wakeups — fold them into the same timer where possible to reduce timer count.

**Fix.** Consolidate main-process timers into **one scheduler tick** that fans out, so the CPU wakes once per interval, not N times. Debounce DB writes to state-changes only.

**Principle.** *Coalesce timers and write on change, not on tick.* Each independent timer is a separate CPU wakeup; batching them lets the processor sleep longer (big battery win on laptops).

## P6 — Memory: unbounded arrays & prop payloads `[P2]`

**Symptom.** `App.tsx` holds `allLogs`/`filteredLogs` in state and passes them to many pages. As logs grow, these arrays live in renderer memory *and* get re-referenced across pages; large prop arrays also make React reconciliation expensive. Ring buffers (the 50-event live log) are correctly bounded — good — but the full-log arrays are not.

**Fix.** Don't hold full raw logs in renderer global state. Fetch **aggregated/paginated** slices per page (from `daily_rollup`), and let tables paginate/virtualize (`react-window`) rather than rendering thousands of rows. Keep raw logs in SQLite, not JS heap.

**Principle.** *The renderer should hold a view, not the database.* Push filtering/aggregation/pagination to the data layer (SQL); keep only what's on screen in memory.

## Ranked performance backlog

1. `[P1]` Delete the 1s & 5s polling intervals; move to event-driven refetch via existing `on*` bridges (P1, P2).
2. `[P1]` Add `daily_rollup` materialization; point Dashboard/Insights/Rewind at it (P3).
3. `[P1]` Add a keyed query cache with precise invalidation (P2).
4. `[P1]` Demote OrbitSystem from default hero; `frameloop="demand"`; pause off-screen (P4).
5. `[P2]` Coalesce main-process timers; write-on-change only (P5).
6. `[P2]` Stop holding full logs in renderer state; virtualize tables (P6).

---

## v2 UPDATE (2026-07-02)

**The polling storm is still there and the Dashboard is the epicenter.** `DashboardPage.tsx` now runs **7 `setInterval`s**: a 5s `setFetchKey` refetch (`:299`), a 1s `setTick` (`:2133`), the stopwatch timers, an idle check, plus others (`:1003,1181,1275,1452,1475`). `App.tsx:1188` still fires `reloadOverrides` every **1 second**. The v1 fix stands: one 1s tick for the running stopwatch only; everything else event-driven push from main. The home screen is the worst possible place for this.

**Dashboard hook sprawl (new perf/maintainability finding) `[P1 · DashboardPage.tsx]`.** 43 `useState` + 34 `useEffect` in one 3,280-line component means large re-render fan-out and many redundant IPC calls (`getDashboardAggregates`, `getProductivitySessions`, `getExternalSessions`, `getDayDetail`, `getLogs`, ...). Collapse to a single `useHomeSummary()` hook backed by one aggregate IPC call from `daily_rollup` (see Doc 8 E and Doc 4). The good news: `getDashboardAggregates` already exists — extend it rather than adding more per-widget fetches.

**God-components grew (memory/parse cost).** `main.ts` 21,432 -> 22,043; `IDEProjectsPage.tsx` 5,434; `TerminalPage.tsx` 5,315; `OrbitSystem.tsx` 4,203. The 3D `OrbitSystem` (solar system) and the heat map should be **drill-down-only**, not always mounted on the Dashboard (Doc 8 D) — mounting 4k lines of 3D on the landing screen is a measurable cold-start and memory cost.

**New modules — perf watch items.**
- **Finance/CoinGecko:** live crypto pricing must be batched + cached in main, never per-wallet on the render path (Doc 6 F3). Money as `REAL` will also drift — use integer minor units (Doc 6 F4).
- **Learn:** `learn_chunks` grounding retrieval should be top-k capped to fit the 6GB RTX 4050 VRAM budget when the local tutor runs (Doc 7 L3).

The v1 recommendations (materialize `daily_rollup`, event-driven tracking, bundle-split heavy 3D) are unchanged and now higher priority given the growth.
