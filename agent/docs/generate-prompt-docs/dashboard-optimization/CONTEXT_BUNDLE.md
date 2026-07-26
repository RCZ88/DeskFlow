# CONTEXT_BUNDLE — Dashboard Performance Optimization

## Problem Statement

Switching the dashboard timeline to "all time" freezes the app — black screen, UI thread blocked, 5-10 seconds of lag. Root cause: `getLogs()` returns every row from `logs` table (500k+ rows) → stored in React state → 6+ `useMemo` hooks each do full O(n) iteration.

---

## Architecture / Data Flow

```
Browser Extension ─► localhost:9876 HTTP ─► main.ts HTTP handler
                                             │
App Process (active-win) ─► pollForeground() ─► addLog() ─► logs table (SQLite)
                                                   │
                                                   ▼
                   IPC ──► Renderer
                   getLogs() ──► App.tsx:allLogs (useState)
                                      │
                                      ├── filteredLogs (useMemo) ──► setLogs ──► DashboardPage:logs
                                      │
                                      └── allLogs ──► DashboardPage:allLogs
                                                        │
                                                        ├── computedHeatmap (useMemo) — weekly bar
                                                        ├── hourlyHeatmapData (useMemo) — 7×24 grid
                                                        ├── computedWebsiteData (useMemo) — website stats
                                                        ├── computedSolarData (useMemo) — solar system
                                                        ├── stats (useMemo) — weekly overview
                                                        └── activityFeedWithElapsed (useMemo) — recent items
```

---

## Database Schema

### `logs` table
```sql
-- Every app foreground change or browser event creates a row
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,        -- ISO8601
  app TEXT NOT NULL,              -- app name or domain
  app_type TEXT,                  -- 'app' | 'domain'
  category TEXT,
  duration_ms INTEGER DEFAULT 0,  -- milliseconds spent
  title TEXT,
  project TEXT,
  is_browser_tracking INTEGER DEFAULT 0,
  domain TEXT,
  url TEXT
);
-- Row count: potentially 500k+ after months of use
-- ~288 app entries + ~200 browser entries per day = ~488/day
-- 1 year = ~178k rows, 2 years = ~356k rows
```

### `stats_hourly` table (pre-aggregated)
```sql
CREATE TABLE stats_hourly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,              -- 'YYYY-MM-DD'
  hour INTEGER NOT NULL,          -- 0-23
  app_name TEXT NOT NULL,
  app_type TEXT,                  -- 'app' | 'domain'
  category TEXT,
  total_seconds REAL DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  UNIQUE(date, hour, app_name)
);
-- Updated via trigger on INSERT to logs
-- Per-day × per-hour × per-app granularity
-- 7 days × 24 hours = 168 rows per app (much less than raw logs)
```

### `stats_daily` table (pre-aggregated)
```sql
CREATE TABLE stats_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  app_name TEXT NOT NULL,
  app_type TEXT,
  category TEXT,
  total_seconds REAL DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  UNIQUE(date, app_name)
);
```

### Indexes
```sql
CREATE INDEX idx_stats_hourly_date ON stats_hourly(date);
CREATE INDEX idx_stats_daily_date ON stats_daily(date);
CREATE INDEX idx_stats_hourly_app ON stats_hourly(app_name);
CREATE INDEX idx_stats_daily_app ON stats_daily(app_name);
```

### Trigger (auto-aggregation on INSERT to logs)
```sql
CREATE TRIGGER trg_update_hourly
AFTER INSERT ON logs
WHEN NEW.duration_ms > 0
BEGIN
  INSERT OR REPLACE INTO stats_hourly (date, hour, app_name, app_type, category, total_seconds, session_count)
  SELECT 
    DATE(NEW.timestamp),
    CAST(STRFTIME('%H', NEW.timestamp) AS INTEGER),
    COALESCE(NEW.domain, NEW.app),
    CASE WHEN NEW.domain IS NOT NULL THEN 'domain' ELSE 'app' END,
    NEW.category,
    COALESCE((SELECT total_seconds FROM stats_hourly WHERE date = DATE(NEW.timestamp) AND hour = CAST(STRFTIME('%H', NEW.timestamp) AS INTEGER) AND app_name = COALESCE(NEW.domain, NEW.app)), 0) + (CAST(NEW.duration_ms AS REAL) / 1000.0),
    COALESCE((SELECT session_count FROM stats_hourly WHERE date = DATE(NEW.timestamp) AND hour = CAST(STRFTIME('%H', NEW.timestamp) AS INTEGER) AND app_name = COALESCE(NEW.domain, NEW.app)), 0) + 1;
END;
```

---

## IPC Endpoints

### `get-logs`
- **Handler:** `main.ts:2152` — `function getLogs(limit?)`
- **Preload bridge:** `preload.ts:31` — `getLogs`
- **DB query:** `SELECT * FROM logs [WHERE timestamp > datetime('now', '-90 days')] ORDER BY id DESC`
- **Returns:** `Array<{id, timestamp, app, app_type, category, duration_ms, title, project, is_browser_tracking, domain, url}>`
- **Current issue:** Returns ALL rows (limited to 90 days by recent patch, but still ~27k rows for 90 days)

### `get-dashboard-data`
- **Handler:** `main.ts:3431`
- **Preload bridge:** `preload.ts:34` — `getDashboardData`
- **Accepts:** `{ period: string, dateOffset?: number }`
- **Returns aggregated data:**
  - `hourly`: hour × app_seconds × domain_seconds (grouped by hour, loses per-day granularity)
  - `daily`: date × total_seconds × unique_apps
  - `topApps`: app_name × total_seconds × session_count (LIMIT 20)
  - `topDomains`: domain × category × total_seconds × session_count (LIMIT 20)
  - `recentSessions`: last 10 app logs + last 5 browser logs
- **Current issue:** Frontend ignores this data — loads allLogs and recomputes everything client-side

### `get-external-stats`
- **Handler:** `main.ts:3431` (separate handler)
- **Accepts:** `{ period: string }`
- **Returns:** external activity stats for the period

### `get-browser-logs`
- **Handler:** `main.ts` — loads browser logs filtered by period
- **Used by:** App.tsx `useEffect` for browser log filtering

---

## Key Source Files

### `src/App.tsx` — Data Loading (lines 380-468)

```typescript
// State
const [allLogs, setAllLogs] = useState<ActivityLog[]>([]); // ALL logs - never mutates

// Filtered by period
const filteredLogs = useMemo(() => {
  const range = getDateRange(selectedPeriod, 0);
  return allLogs.filter(log => log.timestamp >= range.start && log.timestamp < range.end);
}, [allLogs, selectedPeriod]);

// Load data
const loadData = async () => {
  const electronLogs = await window.deskflowAPI.getLogs(); // ← FETCHES ALL
  const formattedLogs: ActivityLog[] = electronLogs.map((log: any) => ({
    id: log.id,
    timestamp: new Date(log.timestamp),
    app: log.app,
    category: log.category || 'Other',
    duration: Math.round(log.duration_ms / 1000),
    title: log.title,
    project: log.project,
    is_browser_tracking: log.is_browser_tracking === 1 || log.is_browser_tracking === true,
    domain: log.domain,
    url: log.url,
  }));
  setAllLogs(formattedLogs);  // ← STORES ALL
  setLogs(formattedLogs);     // ← ALSO STORES ALL (overwritten by filteredLogs effect)
};
```

Also has `appStats` and `allTimeAppStats` useMemo hooks (lines 952-1031) that iterate allLogs.

### `src/pages/DashboardPage.tsx` — Heavy Computations

**Component interface (lines 134-188):**
```typescript
interface DashboardPageProps {
  logs?: ActivityLog[];
  allLogs?: ActivityLog[];        // ← receives ALL logs
  browserLogs?: ActivityLog[];
  selectedPeriod?: Period;
  dateOffset?: number;
  tierAssignments?: { productive: string[]; neutral: string[]; distracting: string[] };
  // ... more props
}
```

#### 1. `computedHeatmap` — Weekly heatmap bars (lines 1406-1464)
- Filters `allLogs` to last 7 days
- Groups by day, sums duration, tracks productive hours
- Runs on `[allLogs, tierAssignments]`

#### 2. `hourlyHeatmapData` — 7×24 hour grid (lines 1512-1631)
- **WORST PERFORMANCE** — iterates allLogs, for each log calls `addSession()` with inner while loop over hours
- Each session can span multiple hours → while loop splits it
- Spread operator `...current.apps` creates new object per cell update
- Capped to 3600s per cell
- Currently pre-filters by target week (my fix)
- Runs on `[allLogs, weekOffset, tierAssignments, externalHourlyData]`

#### 3. `computedWebsiteData` — Website stats (lines 2022-2047)
- Filters allLogs by period
- Groups browser-tracking logs by domain
- Runs on `[allLogs, selectedPeriod, dateOffset]`

#### 4. `computedSolarData` — App stats (lines 2050-2078)
- Filters allLogs by period
- Groups non-browser logs by app
- Excludes tracking browser
- Runs on `[allLogs, selectedPeriod, dateOffset, trackingBrowser]`

#### 5. `stats` — Weekly overview (lines 2107-2184)
- Filters allLogs by period (today/week/month/all)
- Computes: total time, productive time, longest focus session
- For 'all' period: iterates every log in allLogs
- Runs on `[allLogs, selectedPeriod, tierAssignments]`

#### 6. `activityFeedWithElapsed` — Recent items (lines 2211+)
- Slices first 10 from activityFeed
- Computes elapsed durations

---

## Design Tokens (Glass Theme)

```css
/* Background colors */
--bg-primary: #0f0f1a;        /* Deep dark */
--bg-card: rgba(255,255,255,0.03);  /* Glass card */
--bg-hover: rgba(255,255,255,0.06);
--border: rgba(255,255,255,0.08);

/* Accent colors */
--accent-purple: #8b5cf6;
--accent-green: #22c55e;
--accent-red: #ef4444;
--accent-amber: #f59e0b;
--accent-blue: #3b82f6;
--accent-cyan: #06b6d4;
--accent-pink: #ec4899;

/* Text */
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-muted: #64748b;

/* Typography */
font-family: 'Inter', system-ui, sans-serif;
```

Dashboard chart patterns use:
- `react-chartjs-2` with `Chart.js` — bar charts, line charts
- `framer-motion` — `motion.div` entrance animations
- `lucide-react` — icon set
- Tailwind v4 utility classes — glass cards (`backdrop-blur-xl`, `bg-white/5`, `border-white/10`)

---

## Performance Analysis

### All time freeze — Root cause chain:
1. `getLogs()` → SQL `SELECT * FROM logs` — returns 500k+ rows
2. `formattedLogs.map()` → creates 500k+ JS objects
3. `setAllLogs(formattedLogs)` → 500k+ objects in React state
4. `filteredLogs` useMemo → spreads + filters allLogs (500k)
5. DashboardPage receives allLogs → ALL 6 useMemos re-run
6. Worst: `hourlyHeatmapData` → for each of 500k logs calls `addSession()` with while loop + spread operator → 500k+ × avg 1.5 iterations = 750k+ iterations

### `get-dashboard-data` already returns pre-aggregated:
- hourly stats (but grouped by hour across ALL days — loses per-day granularity for heatmap)
- daily stats
- top apps/domains
- recent sessions
- **Not used by frontend** — data is fetched (`App.tsx:443`) but only logged, never passed to DashboardPage

### Available pre-aggregated data
- `stats_hourly` — has per-date per-hour per-app granularity (perfect for heatmap)
- `stats_daily` — has per-date per-app granularity (perfect for weekly overview)
- Triggers keep these in sync automatically on log insert

---

## Implementation Constraints

- **Tailwind v4 only** — `@import "tailwindcss"` in `index.css`, never `@tailwind base/components/utilities`
- **No git commands** — no checkout, restore, reset, stash
- **IPC only** — renderer uses `window.deskflowAPI` only
- **better-sqlite3** — main process only, synchronous `.prepare().all()`
- **Build:** `npm run build` (renderer + electron)
- **No postcss/autoprefixer** — v3 dependencies, not used here
