## Raw Request

> "switching the timeline to all time, the app just froze. it lags like crazy and then theres jus ta black screen. WE NEED TO OPTIMIZE THE FUCK OUT OF THE LOADING THING. AND MAKE IT SO THAT ITS LIGHTER AND FASTER AND LIKE MORE EFFICIENT AND A BETTER ALGORITHM."
>
> "ITS NOT JUST THE DASHBAORD BUT ALL HE DATA LOADING AND THE WHOLE OF HTE APP"
>
> "ITS NOT SUPPOSED TO DO VISUAL OVERHAUL IDIOT. ITS SUPPOSED TO IMPROVE THE FUCKING BACKEND"

---

## Context

Read `agent/docs/dashboard-optimization/CONTEXT_BUNDLE.md` first. It contains all relevant source code, schemas, IPC endpoints, and architecture notes.

## The Problem

The app loads ALL raw logs from the `logs` table into React state. Six `useMemo` hooks each iterate the entire array. With 500k+ rows, this freezes the UI for 5-10 seconds on any data-dependent page.

Current flow:
```
getLogs() → SELECT * FROM logs → 500k+ rows → allLogs (React state)
  ├── computedHeatmap → O(n) iterate all
  ├── hourlyHeatmapData → O(n) iterate all + while loop per log
  ├── computedWebsiteData → O(n) iterate all
  ├── computedSolarData → O(n) iterate all
  ├── stats → O(n) iterate all + sort
  └── filteredLogs → O(n) filter all
```

This happens on app startup AND when switching periods.

## The Mandate

Design a **purely backend data pipeline optimization** that eliminates the freeze without changing any UI. The dashboard should look identical, work identically, but load instantly regardless of data volume.

## Requirements

### 1. Kill `allLogs` — Move Computations to SQL

The frontend must NOT hold all raw logs in state. Every computation currently done client-side must move to the backend (SQLite) using the existing pre-aggregated `stats_hourly` and `stats_daily` tables.

Design how each dashboard component gets its data:

| Current (slow) | Target (fast) |
|----------------|---------------|
| `computedHeatmap` — iterates allLogs, groups by day, sums duration | SQL query against `stats_daily` or `stats_hourly` for last 7 days |
| `hourlyHeatmapData` — iterates allLogs, while-loop splits sessions across hours, spread operator per cell | SQL query against `stats_hourly` with per-date × per-hour granularity for target week |
| `computedWebsiteData` — filters allLogs by `is_browser_tracking`, groups by domain | SQL query against `stats_daily` WHERE `app_type = 'domain'` |
| `computedSolarData` — filters allLogs (non-browser, non-tracking), groups by app | SQL query against `stats_daily` WHERE `app_type = 'app'` |
| `stats` (weekly overview) — filters allLogs by period, reduces totals, sorts for longest focus | SQL queries: SUM, COUNT, MAX from `stats_daily` or raw logs with LIMIT |
| `appStats` / `allTimeAppStats` in App.tsx — groups by app | SQL query: GROUP BY app with SUM |

### 2. IPC Changes

Specify EXACTLY:

- **New IPC channels** — names, payload shapes, return types
- **Modified handlers** — which existing handlers change and how
- **SQL queries** — exact SQL for every backend query, including WHERE, GROUP BY, ORDER BY, LIMIT clauses
- **Indexes needed** — any new indexes on `logs`, `stats_hourly`, or `stats_daily` tables
- **Preload bridges** — exact type declarations and `ipcRenderer.invoke` calls

### 3. Frontend Changes (Minimal)

- Remove `allLogs` from DashboardPage props
- Replace each `useMemo` with `useEffect` + `useState` that fetches from new IPC endpoints
- Keep EXISTING chart rendering code — don't touch charts, colors, layout, glass styling
- Add simple loading states (just whatever React returns while data fetches — no skeleton animations, no shimmer effects)

### 4. Data Flow

Draw the new data flow:
```
[Backend] stats_hourly/stats_daily tables ← auto-trigger on log INSERT
    │
    ├── IPC: get-heatmap-data(dateRange) → SELECT ... FROM stats_hourly WHERE ...
    ├── IPC: get-website-stats(dateRange) → SELECT ... FROM stats_daily WHERE app_type='domain'
    ├── IPC: get-app-stats(dateRange) → SELECT ... FROM stats_daily WHERE app_type='app'
    └── IPC: get-overview-stats(dateRange) → SELECT SUM, COUNT, MAX FROM stats_daily
         │
         ▼
    [React] useState per component → render directly (no allLogs)
```

### 5. Implementation Order

Step-by-step, file by file:
1. Which IPC handler to add first
2. Which preload bridge
3. Which component to update
4. Verification step per change

### 6. Edge Cases

- **Empty DB** — what happens on first run with zero logs
- **Partial data** — stats_hourly might not have all rows (trigger only fires on INSERT with `duration_ms > 0`)
- **StatsPage** — the `appStats` and `allTimeAppStats` useMemos in App.tsx also iterate allLogs — how do these get replaced
- **Category overrides** — applied client-side via `categoryOverrides` — how does this work with backend queries
- **Live updates** — new logs come in every 5 seconds — how does the dashboard refresh without re-loading allLogs

## Constraints

- **No visual changes.** Do NOT touch charts, colors, card layout, glass styling, animations, or any UI code
- **No skeleton loaders, shimmer effects, or loading animations.** Simple `if (!data) return null` is fine
- **IPC-only renderer** — `window.deskflowAPI` only
- **better-sqlite3** — synchronous `.prepare().all()`, main process only
- **No git commands**
- **Existing `stats_hourly` and `stats_daily` tables** must be used — they're auto-populated by triggers on log INSERT
- **Build:** `npm run build` (vite + tsc)
- **Tailwind v4**, `react-chartjs-2`, `framer-motion`, `lucide-react` — existing deps, don't add new ones

## Output Format

Write `RESULT.md` containing:

1. **Data Flow Diagram** — ASCII showing before/after pipeline
2. **SQL Queries** — exact SQL for each dashboard component
3. **IPC Changes** — exact handler code, preload bridges, type declarations
4. **Frontend Changes** — exact file paths and what changes in each
5. **Implementation Order** — numbered steps, file by file
6. **Verification** — how to test per step

## Backend Audit

| Feature | IPC Channel | Handler Exists? | Preload Bridge | DB Schema | Status |
|---------|-------------|-----------------|----------------|-----------|--------|
| Get raw logs | `get-logs` | ✅ main.ts:2152 | ✅ preload.ts | ✅ logs table | Real |
| Get dashboard data | `get-dashboard-data` | ✅ main.ts:3431 | ✅ preload.ts | ✅ stats_hourly, stats_daily | Real but frontend ignores it |
| Stats hourly trigger | AUTO | ✅ trg_update_hourly | N/A | ✅ stats_hourly | Real |
| Stats daily table | N/A | N/A | N/A | ✅ stats_daily | Exists but no daily aggregation trigger |
| Per-date×hour stats | ❌ Missing | ❌ Missing | ❌ Missing | ✅ stats_hourly has date+hour columns | GAP |
| App stats by period | ❌ Missing | ❌ Missing | ❌ Missing | ✅ stats_daily | GAP |
| Website stats by period | ❌ Missing | ❌ Missing | ❌ Missing | ✅ stats_daily | GAP |
