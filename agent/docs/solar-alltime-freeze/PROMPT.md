# Prompt: Fix All-Time Period Freeze — Cityscape + Solar System + Dashboard

## Raw Request
> "switching to the all time just freezes the app, just like on the solar system visualization. MAINLY FOR THE CITYSCAPE"

## Context
Read `CONTEXT_BUNDLE.md` first. It contains the exact source code, data flow architecture, and bottleneck analysis for all three freeze points.

## Problem Statement
When the user selects "All Time" as the time period, the entire Electron app freezes for 5-15 seconds. This affects THREE areas:

1. **AICityscape (MAIN freeze target):** The IDE page's `agentChartsData` useMemo computes `numDays × numAgents` with Date formatting. When `aiPeriod === 'all'`, `numDays` can be 365+. With 10 agents, that's 3650+ `format()` calls per recomputation. Additionally, `aiAgents` recomputes on every period change (new array reference), triggering AICityscape to re-render the entire Three.js canvas.

2. **Solar System (OrbitSystem):** Receives all 100K filteredLogs when 'all'. The `computePlanets` function does O(N) grouping. Output capped at 80 planets but input processing is unbounded.

3. **Dashboard/Stats:** `getLogs()` returns 100K rows, `filteredLogs` creates a full copy, `appStats` does `.toISOString()` per item, `setLogs()` cascades re-renders to all pages.

## The Mandate
Design a comprehensive fix for all three freeze points. The **primary target is the AICityscape freeze** on the IDE page. The solar system and dashboard are secondary. The bottleneck is in the React data pipeline — the Three.js rendering itself is fine.

## Requirements

### Requirement 1: AICityscape / IDE Page Optimization (PRIMARY)

#### 1a: agentChartsData useMemo (IDEProjectsPage.tsx:1256-1327)
- **Current:** When `aiPeriod === 'all'`, calculates `numDays` by scanning all `daily` data across all tools to find date range (lines 1258-1275). Then creates `lastDays` array using `eachDayOfInterval` (line 1278) — up to 365+ days. Then for EACH active agent, maps over ALL days calling `getMetricValue` which does `format(d, 'yyyy-MM-dd')` per day.
- **Computation:** `numAgents × numDays` format() calls + Date object creation
- **Needed:** 
  - (a) Cache the formatted day strings (create once, reuse across agents)
  - (b) Or pre-compute a day string array outside the agent loop
  - (c) Or use numeric timestamp keys instead of formatted strings
  - (d) Or debounce the computation so it doesn't block the main thread

#### 1b: AICityscape re-render on period change
- **Current:** `aiAgents` useMemo depends on `workspaceAnalytics?.aiUsage?.byTool` which changes when `fetchAnalytics` re-runs on period change. Even if the agent data is the same, the array reference changes, triggering AICityscape to re-render.
- **Needed:**
  - (a) Stabilize `aiAgents` reference — only recompute when the actual data changes, not just the reference
  - (b) Or add a shallow equality check in AICityscape to skip re-render if agents are the same
  - (c) Or memoize the Three.js canvas to not re-render when only the period prop changes

#### 1c: fetchAnalytics re-trigger
- **Current:** `fetchAnalytics` (line 599) depends on `aiPeriod`. When `aiPeriod` changes, it re-fetches ALL analytics data from the backend, even if the data hasn't changed.
- **Needed:** Only re-fetch when the period actually affects the data (e.g., skip re-fetch if backend returns the same data for 'all' vs 'week')

### Requirement 2: Backend Period Filtering
- **Current:** `getLogs()` returns ALL logs (up to 100K) with no period filter
- **Needed:** Add a `getLogsFiltered(period, dateOffset)` IPC endpoint that filters at the SQL level using the same `getDateRange` logic
- **Alternative:** If modifying the IPC is too invasive, add a `limit` parameter to `getLogs()` that returns fewer rows for 'all' (e.g., 20K instead of 100K)
- **Constraint:** Must not break existing callers of `getLogs()`

### Requirement 3: Frontend Memoization Fix (App.tsx)
- **Current:** `filteredLogs` useMemo creates a full copy of 100K items when period='all'
- **Needed:** When period='all', either:
  - (a) Skip the filter entirely (return allLogs directly, no copy)
  - (b) Or use a reference equality check to avoid the copy
- **Current:** `appStats` useMemo calls `.toISOString()` 2-3x per log item
- **Needed:** Cache ISO strings or use numeric timestamp comparisons instead of string comparisons
- **Current:** `allTimeAppStats` does `[...allLogs]` array copy
- **Needed:** Use `allLogs` directly without copying

### Requirement 4: OrbitSystem Data Throttling
- **Current:** OrbitSystem receives all filteredLogs (100K when 'all')
- **Needed:** Throttle or downsample the input data before passing to OrbitSystem:
  - (a) Limit to most recent N logs (e.g., 10K) while keeping all unique apps represented
  - (b) Or pre-aggregate on the backend: `SELECT app, SUM(duration_ms), COUNT(*) FROM logs GROUP BY app`
  - (c) Or add a loading state that shows progress while computePlanets runs

### Requirement 5: Prevent Cascading Re-renders
- **Current:** `setLogs(filteredLogs)` in App.tsx triggers re-render of ALL children
- **Needed:** Use a ref + selective context instead of prop drilling, or debounce the setLogs call
- **Current:** Multiple useMemos depend on `filteredLogs` which changes from ~1K to 100K
- **Needed:** Stabilize the dependency — if filteredLogs is the same data (just more of it), avoid triggering recomputation

### Requirement 6: StatsPage Optimization
- **Current:** `dailyUsage` for 'all' creates `new Date(log.timestamp)` + `format()` per log
- **Needed:** Use pre-aggregated `stats_daily` data from the backend instead of processing raw logs
- **Current:** `hourlyDistribution` has an inner while-loop splitting sessions across hour boundaries
- **Needed:** Pre-compute hourly distribution on the backend, or use a simpler approximation (assign full session to starting hour)

## Design Constraints
- Must work with existing Electron + SQLite + React architecture
- Must not change the visual output (same charts, same cityscape, same solar system, same data)
- Must not break existing period filtering (today, week, month, 7day, 30day)
- The fix should be backward-compatible — existing callers of `getLogs()` should continue to work
- If a backend change is needed, specify the exact IPC channel, handler, and SQL
- **PRIMARY TARGET:** AICityscape on IDE page must not freeze when switching to 'all'

## Deliverables
1. **IDE page fix:** Optimized `agentChartsData` useMemo + stabilized `aiAgents` reference + debounced `fetchAnalytics`
2. **Backend fix:** New IPC endpoint or modified `getLogs()` with period filtering
3. **App.tsx fix:** Optimized useMemos (filteredLogs, appStats, allTimeAppStats)
4. **OrbitSystem fix:** Data throttling before computePlanets
5. **StatsPage fix:** Pre-aggregated data or optimized processing for 'all' period
6. **Render cascade fix:** Prevent unnecessary re-renders when switching to 'all'
7. **Verification steps:** How to manually test that each freeze is gone
