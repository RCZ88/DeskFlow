# CONTEXT_BUNDLE.md — Backend Data Pipeline Overhaul

> **Created:** 2026-06-05
> **Purpose:** Self-contained reference for the target AI to design backend aggregation endpoints and efficient data loading/saving for all pages.

---

## 1. Architecture Overview

```
Browser Extension (background.js)
  │  POST /browser-data {domain, delta_ms, is_browser_focused, ...}
  ▼
HTTP Server (main.ts:9500) → handleBrowserData()
  │  writes to logs table with is_browser_tracking=1
  ▼
active-win (every 5s) → pollForeground()
  │  writes to logs table with is_browser_tracking=0/NULL
  ▼
SQLite DB: logs table (raw), stats_daily (aggregates), stats_hourly (aggregates)
  │
  ├── get-logs → ALL raw rows (5000 max, 730-day cap)
  ├── get-dashboard-aggregates → pre-aggregated per-period (WEEKLY/MONTHLY)
  ├── get-page-stats → EXISTS but UNUSED by pages
  ├── get-app-stats → EXISTS, queries stats_daily table
  └── get-browser-logs → browser-specific raw rows (200 max)
       │
       ▼
Renderer (React pages)
  ├── StatsPage: receives allLogs + appStats → does own useMemo aggregation
  ├── ProductivityPage: receives allLogs + browserLogsProp → does own scoring/trends
  ├── BrowserActivityPage: receives browserLogs from IPC → does own domain grouping
  └── ExternalPage: dedicated IPC handlers (already efficient)
```

---

## 2. Database Schema

### `logs` table (main activity table)
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  app TEXT,
  category TEXT,
  duration_ms INTEGER DEFAULT 0,
  title TEXT,
  project TEXT,
  url TEXT,
  domain TEXT,
  tab_id TEXT,
  is_browser_tracking INTEGER DEFAULT 0  -- 1 = browser extension, 0 = desktop app
);
```

### `stats_daily` table (aggregated per app/domain per day)
```sql
CREATE TABLE stats_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  app_name TEXT NOT NULL,
  category TEXT,
  app_type TEXT,  -- 'app' | 'domain'
  total_seconds REAL DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  UNIQUE(date, app_name)
);
```

### `stats_hourly` table (hourly aggregation)
```sql
-- Used by get-page-stats handler
-- Schema derived from usage: date, hour, total_seconds, app_name, app_type columns
```

### `daily_aggregates` table (raw per-app per-day)
```sql
-- Updated by updateAggregates() on each log insert
-- Columns: date, app, category, total_sec, session_count
```

### `browser_sessions` table (browser-specific daily aggregation)
```sql
-- Updated by updateAggregates() on browser log insert
-- Columns: date, domain, category, total_sec, session_count
```

### `sessions` table (active session tracking)
```sql
-- Columns: app, category, start_time, end_time, duration_sec, is_active
```

---

## 3. Current IPC Handlers (Key Ones)

### Data loading — ALL return raw rows to renderer:

| IPC Channel | What it returns | Lines | Used By |
|---|---|---|---|
| `get-logs` | Raw logs (5000 max, 730-day cap) | main.ts:2963 | App.tsx → allLogs state |
| `get-logs-by-period` | Raw logs filtered by period | main.ts:4210 | BrowserActivityPage, ProductivityPage |
| `get-browser-logs` | Raw browser logs filtered (200 max) | main.ts:4400 | BrowserActivityPage |
| `get-stats` | Aggregated app stats (ALL time) | main.ts:3223 | App.tsx (settings) |
| `get-dashboard-aggregates` | Pre-aggregated per-period data | main.ts:3903 | DashboardPage only |

### Data loading — EXISTS but pages DON'T use them:

| IPC Channel | What it returns | Lines | Why unused |
|---|---|---|---|
| `get-page-stats` | Pre-aggregated hourly/category/app data per period | main.ts:4028 | Returns hours not seconds, different shape than frontend expects |
| `get-app-stats` | Pre-aggregated per-app stats per period | main.ts:4001 | Actually IS used for Dashboard, but NOT for StatsPage/ProductivityPage |
| `get-daily-productivity` | Single-day productivity score | main.ts:4309 | Only for single date, not range |
| `get-productivity-range` | Per-day productivity for date range | main.ts:4350 | Loads ALL logs for range, groups client-side |
| `get-daily-stats` | Daily stats grouped by app | main.ts:4252 | Not used by any page |

### `get-page-stats` — Full handler (lines 4028-4119):

```typescript
ipcMain.handle('get-page-stats', async (_, { page, period, dateOffset = 0 }) => {
    // page: 'stats' | 'browser'
    // Returns from stats_hourly and stats_daily tables
    // For 'stats': hourlyDistribution[], categoryBreakdown[], appLeaderboard[]
    // For 'browser': domains[], categories[], hourlyDistribution[]
});
```

**Problem with get-page-stats:** Returns hours (floats), not raw seconds/ms. Browser categories in separate tables. Doesn't support `all` period well. No focus/tier filtering. NOT used by StatsPage or BrowserActivityPage.

---

## 4. Page Data Requirements

### StatsPage (`src/pages/StatsPage.tsx`)

**Props:** `appStats` (pre-computed), `logs` (allLogs raw), `selectedPeriod`, `dateOffset`, `timeMode`, `tierAssignments`

**Currently computes client-side (all useMemo):**

| Computation | Lines | What it does | Complexity |
|---|---|---|---|
| `filteredLogs` | 123-130 | Date-range filter on allLogs | O(n) |
| `sortedApps` | 133-138 | Sorts appStats by total_ms | O(n log n) |
| `totals` | 141-150 | Sums total_ms, sessions, avg from sortedApps | O(n) |
| `categoryBreakdown` | 153-162 | Groups sortedApps by category, sums ms | O(n) |
| `pieData` | 165-180 | Maps sortedApps to chart.js format | O(n) |
| `dailyUsage` | 183-292 | **HEAVIEST**: cross-hour while-loop splitting for 'today'; date-keyed Map otherwise. Handles all 6 periods (today/week/month/7day/30day/all) | O(m) where m = session segments |
| `hourlyDistribution` | 295-326 | Re-processes filteredLogs into 24-hour buckets with while-loop splitting (redundant with dailyUsage) | O(m) |
| `selectedAppData` | 329-408 | Per-app daily + hourly breakdown for modal | O(k) |

**Total frontend work per render:** ~5 full iterations of allLogs, 2 with while-loop session splitting.

### ProductivityPage (`src/pages/ProductivityPage.tsx`)

**Props:** `appStats`, `logs` (allLogs), `browserLogsProp`, `selectedPeriod`, `dateOffset`, `timeMode`, `tierAssignments`, `domainKeywordRules`

| Computation | Lines | What it does | Complexity |
|---|---|---|---|
| `browserStats` | 185-205 | Groups browser logs by domain | O(n) |
| `allWebsites` | 207-254 | Filters browser logs by date, groups by domain, dominant category | O(n) |
| `productivityData` | 265-394 | **HEAVIEST**: filters all app+browser logs by date, assigns tiers, computes weighted score (productive*1.0 + neutral*0.5 + distracting*0.0) / total * 100, separates app vs web scores | O(n + m) |
| `dailyTrend` | 397-541 | Per-day/hour/month buckets with while-loop splitting for 'today'. Each bucket's score = (productive + neutral * 0.5) / total * 100 | O(n * days) |
| `trendAverageScore` | 544-547 | Average of dailyTrend scores | O(days) |
| `comparison` | 550-570 | Compares current vs previous period average | O(days) |
| `peakHours` | 571-707 | Groups by hour, finds most/least productive | O(items) |
| `sessions` | 708-750 | Filters + maps recent sessions | O(n) |

**Duplication:** Both `productivityData` and `dailyTrend` independently filter and tier-assign logs. `allWebsites` repeats the same date-filter + grouping.

### BrowserActivityPage (`src/pages/BrowserActivityPage.tsx`)

**Props:** `selectedPeriod`, `dateOffset`, `timeMode`, `tierAssignments`. Fetches its own data.

| Computation | Lines | What it does |
|---|---|---|
| `aggregatedLogs` | 220-240 | Groups browserLogs by domain with session arrays |
| `domainChartData` | 314-327 | Top 10 domains for bar chart |
| `categoryChartData` | 330-340 | Category pie chart |
| `hourlyDistribution` | 417-485 | Hourly/daily/monthly distribution buckets |

**Data fetching** (line 276-291): Calls `get-browser-logs` every 10s + on period/offset change. Also calls `get-browser-domain-stats` and `get-browser-category-stats`.

---

## 5. Tracking Pipeline

### Desktop App Tracking (`pollForeground()` — main.ts:2549-2748)

```
Every 5 seconds:
  1. active-win → get foreground app/window
  2. If null 3+ times → PowerShell fallback
  3. If app changed → log previous session (if >5s, not DeskFlow/Electron, not browser-with-extension)
  4. Every CHECKPOINT_INTERVAL_MS (5 min) → log accumulated time for same app
  5. If 30+ consecutive null polls → system asleep, reset
  6. If timeSinceLastPoll > SLEEP_GAP_MS → gap detected, log pre-gap duration
```

**What gets logged:**
- App change: `addLog(timestamp, app, category, duration, title, null)`
- `null` for domain/tab_id/is_browser_tracking = undefined
- `duration` = Math.min(rawDuration, MAX_SESSION_MS = 3600000 (1 hour))

### Browser Extension Tracking (`background.js`)

```
Every 2s: checkBrowserFocus() → GET /foreground-app → set isBrowserFocused
Every 5s: periodicSync() → POST /browser-data {url, domain, title, delta_ms, is_browser_focused}
Events: tab switch, URL change, tab close, window focus change
```

**What gets sent:**
```json
{
  "url": "https://example.com",
  "domain": "example.com",
  "title": "Page Title",
  "tab_id": "12345",
  "timestamp": "2026-06-05T...",
  "active_duration_ms": 45000,
  "sanitized_url": "https://example.com",
  "is_periodic": true,
  "delta_ms": 5000,
  "is_browser_focused": true
}
```

### Browser Data Processing (`handleBrowserData()` — main.ts:9953-10130)

```
1. Check isBrowserTrackingEnabled
2. Check domain && url exists
3. Check is_browser_focused !== false
4. Check currentApp matches configured browser (defense-in-depth)
5. Categorize domain (check excluded list, keyword rules)
6. If active session exists → UPDATE duration_ms with delta
7. If new → INSERT into logs with is_browser_tracking=1
8. Deduplication: check for recent browser entries without domain (merge)
```

### Sleep Detection (`main.ts:2900-2946`)

```
Window focus/blur tracking:
  - blur → record lastFocusTime
  - focus → if gap > SLEEP_DETECTION_MIN_GAP_MS AND within sleep hours AND system idle >= 300s → trigger sleep modal
```

---

## 6. Existing Aggregation Tables

Three aggregation tables are maintained incrementally:

1. **`stats_daily`**: Updated by `updateAggregates()` on every log insert. Contains per-app/per-domain per-date totals. Has `app_type` column ('app' vs 'domain').

2. **`stats_hourly`**: Queried by `get-page-stats` but unclear how it's populated (may be from the same `updateAggregates` pipeline).

3. **`daily_aggregates`**: Duplicate of `stats_daily`? Updated in `updateAggregates()` alongside `stats_daily`. May be legacy.

4. **`browser_sessions`**: Browser-specific daily aggregation, similar to `stats_daily` but only for domains.

---

## 7. Key Inefficiencies

1. **Frontend does all aggregation**: StatsPage's `dailyUsage` and `hourlyDistribution` independently reprocess all raw logs with while-loop session splitting — this is SQL's job.

2. **Duplicate computation**: `dailyUsage` and `hourlyDistribution` in StatsPage both re-scan `filteredLogs` with while-loops. Same pattern in ProductivityPage (`dailyTrend` and `productivityData` independently tier-assign).

3. **`get-page-stats` exists but unused**: Returns pre-aggregated data from `stats_hourly` + `stats_daily` but pages don't use it because shape doesn't match (hours not ms, no per-day breakdown, no tier filter).

4. **5000 rows per IPC call**: Even with the new 730-day cap, `getLogs()` can return 5000 rows that get sent through IPC serialization, then spread across multiple useMemos.

5. **No caching**: Every component mount or state change recomputes all useMemos. DashboardPage already fixed this with `getDashboardAggregates`.

6. **Aggregation tables are kept but not used for page data**: `stats_daily` and `stats_hourly` are incrementally maintained for dashboard-only use. StatsPage and ProductivityPage re-do this work on the frontend.

---

## 8. Helper Functions

### `computePeriodRange(period, dateOffset)` — main.ts
```typescript
function computePeriodRange(period: string, dateOffset: number = 0) {
  // Returns { start: string, end: string } ISO date strings
  // For 'today': today 00:00 to tomorrow 00:00
  // For 'week': 7 days ago + offset*7 to today + offset*7
  // For 'month': 30 days ago to today
  // For 'all': '2000-01-01' to '2099-12-31'
}
```

### `getDateRange(period, dateOffset)` — shared utility
```typescript
function getDateRange(period: Period, dateOffset: number = 0) {
  // Returns { start: Date, end: Date, label: string }
  // Same logic as computePeriodRange but returns Date objects
  // Exists in renderer (not in main.ts)
}
```

### `calculateProductivityScore(logs)` — main.ts
```typescript
function calculateProductivityScore(logs) {
  // Uses tier lookup from tierAssignments
  // Returns { productive_sec, neutral_sec, distracting_sec, total_sec, score }
  // score = (productive + neutral * 0.5) / total * 100
}
```

### `getTierMap(db)` — main.ts
```typescript
function getTierMap(db) {
  // Returns Map<string, 'productive' | 'neutral' | 'distracting'>
  // Reads from tier_assignments table
}
```

---

## 9. Data Flow Per Page (Current State)

```
App.tsx:
  │
  ├── get-logs → allLogs (raw array, up to 5000)
  ├── get-app-stats → appStats (pre-filtered per period, used by StatsPage)
  ├── get-browser-logs → browserLogs (pre-filtered per period, used by ProductivityPage)
  │
  ├── Route /stats → StatsPage
  │   props: logs=allLogs, appStats=appStats
  │   does: filteredLogs, sortedApps, dailyUsage (while-loop), hourlyDistribution (while-loop)
  │
  ├── Route /productivity → ProductivityPage  
  │   props: logs=allLogs, browserLogs=browserLogs
  │   does: productivityData, dailyTrend (while-loop), trendAverageScore
  │
  └── Route /browser → BrowserActivityPage
      props: (none from logs — fetches own via IPC)
      does: get-browser-logs + get-browser-domain-stats + get-browser-category-stats
```

---

## 10. File Locations

| File | Purpose | Key Sections |
|---|---|---|
| `src/main.ts` (~13900 lines) | Backend: IPC handlers, tracking, DB queries | getLogs:2265, getStats:2289, pollForeground:2549, isBrowserWithExtension:2385, handleBrowserData:9953, updateAggregates:2212, computePeriodRange:~3700, get-page-stats:4028, get-app-stats:4001, getDashboardAggregates:3903, get-daily-productivity:4309, get-productivity-range:4350, get-daily-stats:4252 |
| `src/preload.ts` | IPC bridges | ALL invoke bridges and event listeners |
| `src/App.tsx` | State management, routing | allLogs state, appStats useMemo, filteredLogs useMemo |
| `src/pages/StatsPage.tsx` | Application stats page | filteredLogs:123, sortedApps:133, dailyUsage:183, hourlyDistribution:295, categoryBreakdown:153 |
| `src/pages/ProductivityPage.tsx` | Productivity page | productivityData:265, dailyTrend:397, trendAverageScore:544 |
| `src/pages/BrowserActivityPage.tsx` | Website tracking page | aggregatedLogs:220, hourlyDistribution:417, domainStats (from IPC) |
| `src/pages/DashboardPage.tsx` | Dashboard (ALREADY OPTIMIZED) | Uses getDashboardAggregates IPC |
| `browser-extension/background.js` | Browser extension | checkBrowserFocus:233, periodicSync:363 |
