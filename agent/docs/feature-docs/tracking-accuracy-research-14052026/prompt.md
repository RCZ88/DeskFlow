# Research Prompt: Tracking Accuracy & Performance Optimization

## Context

**DeskFlow** is an Electron/React/TypeScript desktop app that tracks app usage via `active-win` polling (every 2s) and browser website tracking via a local HTTP server + browser extension. It stores data in SQLite (with JSON fallback) and renders stats through Chart.js charts and a 3D solar system visualization.

The tracking system has accumulated issues that cause:

### Accuracy Problems
1. **Phantom website entries in Dashboard activity feed** — `handleBrowserData` stores logs with `app: 'Browser'` (hardcoded fallback), which pollutes the Recent Sessions with "Website" entries even when the user wasn't browsing. The fix needs to use `data.domain` as the app name instead.
2. **Double-counting of app vs browser time** — When the tracking browser (Chrome/Edge) is used, both the main process `pollForeground` (tracks "Chrome" as an app) AND the browser extension (tracks "github.com" as a domain) create logs. The backend `getStats()` filters this, but the frontend `appStats` recomputation doesn't — so "Chrome" appears alongside "github.com" as separate entries.
3. **Floating point drift in duration accumulation** — `hourlyDist` and `dailyBreakdown` use raw `+=` accumulation of `(end - start) / 1000`, producing values like `9.547000000073s` instead of `9.55s`.
4. **Browser extension reliability gaps** — MV3 extension can be suspended by Chrome, causing lost data. Periodic flush every 30s mitigates but doesn't solve stale session issues.

### Performance Problems
1. **2-second polling via `active-win`** — Runs constantly even when DeskFlow is minimized or the user is idle. Each call invokes a native binary. For a desktop app this is low cost, but it keeps the Node.js event loop active 24/7.
2. **Multiplied data fetches** — Every 10s, `BrowserActivityPage` and other pages re-fetch all data from SQLite via IPC. The Dashboard reloads all logs on mount and re-computes memoized values on every store update.
3. **Full log array in memory** — `allLogs` (App.tsx) keeps all logs in React state as `ActivityLog[]`. With 50K+ entries, this means 50K+ JS objects held in memory with their full timestamps, durations, etc.
4. **No query-level aggregation** — The frontend filters, groups, and aggregates logs client-side in `useMemo` computations that run on every render cycle. These should be pushed to SQLite `GROUP BY` queries.
5. **Chart.js re-renders** — Chart components receive new data objects on every state change, causing full chart re-render even when data hasn't meaningfully changed.
6. **IPC overhead** — Multiple `ipcRenderer.invoke()` calls per page load (getLogs, getBrowserDomainStats, getBrowserCategoryStats, getBrowserLogs) each serializing/deserializing large JSON payloads.

### Current Architecture

```
active-win (2s poll) → pollForeground() → addLog() → SQLite/JSON
                                                        ↓
Browser extension (MV3) → HTTP POST /browser-data → handleBrowserData() → addLog()
                                                        ↓
App.tsx loads getLogs() → allLogs[] in React state → pass as props to DashboardPage, StatsPage
                                                        ↓
StatsPage recomputes sortedApps, dailyUsage, hourlyDistribution from raw logs via useMemo
```

The frontend recomputes everything from raw logs instead of using pre-aggregated backend data like `getStats()`.

## Mandate

Design a comprehensive solution for ultra-accurate tracking and significantly improved performance. This is NOT about visual redesign — it's a data and execution architecture overhaul.

### Engineering Tasks

**Data Processing Pipeline:**
- Design a query-level aggregation strategy: push all filtering, grouping, and aggregation to SQLite queries (like `getStats()` already does). The frontend should receive pre-computed stats, not raw logs.
- Design a caching layer for memoized data: `useMemo` with stable references (`useRef` + deep-compare) to prevent Chart.js re-renders when data hasn't meaningfully changed.
- Design an incremental data update strategy: instead of full `getLogs()` re-fetch, receive delta updates from main process on new/changed entries and append/update locally.
- Design deduplication: prevent double-counting between `pollForeground` (browser as app) and browser extension (individual domains). When extension is active, browser app entries should be either skipped or automatically renamed to their domain.
- Design a rounding/flooring strategy for all duration accumulations to prevent floating point drift (e.g., `Math.round(duration * 100) / 100` at every accumulation point).

**Tracking Accuracy Improvements:**
- Fix `handleBrowserData` to store `data.domain` as the `app` field instead of `'Browser'`.
- Fix the Dashboard initial activity feed to balance app vs browser entries (max 10 app + 5 browser).
- Add validation across ALL frontend stats computations to filter browser apps + rename browser-tracked entries to domains (matching backend `getStats()` behavior).
- Ensure `isInBrowser` / `trackingBrowser` logic correctly gates ALL browser event feed entries.

**Performance Optimization:**
- Reduce IPC calls: design a single `getDashboardData(period)` call that returns all needed data in one JSON payload.
- Reduce memory: implement a virtual store that only keeps recent logs (e.g., 7 days) in React state and queries older data on demand.
- Reduce re-renders: design a `useStableMemo` pattern that deep-compares inputs before returning new object references.
- Optimize `pollForeground` interval: profile CPU usage and propose optimal poll interval based on tradeoff analysis (accuracy vs CPU).
- Design a query batching strategy for the browser extension data to reduce DB write frequency.

## Output Requirements

Produce a **RESULT.md** with:

1. **Architecture Diagram** — ASCII or Mermaid showing the redesigned data flow from tracking → storage → frontend display
2. **Data Processing Spec** — Exact SQL queries, aggregation logic, caching strategy, and delta update protocol
3. **Perf Budget** — Estimated RAM reduction (MB), IPC reduction (calls per page load), re-render reduction (%), and CPU reduction (%)
4. **Implementation Plan** — Ordered by impact, with file-level changes for each step
5. **Edge Cases** — What happens during sleep/resume, browser extension offline, first-time setup, and 50K+ log backfill
