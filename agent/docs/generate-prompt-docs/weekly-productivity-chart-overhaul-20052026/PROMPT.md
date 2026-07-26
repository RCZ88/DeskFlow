# Weekly Productivity Chart Overhaul — Design & Engineering Prompt

## Raw Request

User wants the Weekly Productivity chart on the Dashboard to show correct, differentiated bar heights across all periods (today/hourly, week, month, all). Currently all bars appear identical because data is being capped or mapped incorrectly.

---

## Context

### Where
- **File:** `src/pages/DashboardPage.tsx` (lines ~920-1040)
- **Component:** Weekly Productivity chart section on Dashboard page
- **Chart type:** Stacked Bar chart (Recharts) with three segments: Productive, Non-Productive, External

### Current Architecture

**Data Pipeline:**
1. `allLogs` — Internal device/app usage logs from `logs` table (SQLite), each entry has `timestamp`, `duration_ms`, `category`
2. `chartExternalData` — External (stopwatch/sleep) sessions from `external_sessions` table, fetched via `getExternalSessions('all')`, then aggregated into a `Map<string, number>` keyed by period-appropriate identifier
3. `chartBarsResult` — Computed in a `useEffect` that loops through time buckets and merges internal + external data into bar objects: `{ label, productiveSeconds, nonProductiveSeconds, externalSeconds }`

**External sessions schema:**
```sql
CREATE TABLE external_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT,
  device_off_to_sleep_seconds INTEGER DEFAULT 0,
  wake_up_to_app_seconds INTEGER DEFAULT 0,
  FOREIGN KEY (activity_id) REFERENCES external_activities(id)
)
```

**External activities types:** `'stopwatch'`, `'sleep'`, `'checkin'`

### Current Key Mapping (the BUG)

The external data aggregation uses these keys:
- `'today'` → `${d.getHours()}` (e.g., `"14"`)
- `'week'` → `${d.getDay()}` (e.g., `"3"` for Wednesday — **THIS IS WRONG** — all Wednesdays in the week get merged into one bucket)
- `'month'` → `${d.getDate()}` (e.g., `"15"` — **WRONG** — all 15th-of-months merge)
- `'all'` → `${d.toISOString().slice(0, 10)}` (e.g., `"2026-05-18"` — **CORRECT**)

The bar computation reads these same broken keys:
- Week: `chartExternalData.get(\`${dayNum}\`)` → gets aggregated weekday number, not the specific day
- Month: `chartExternalData.get(\`${d.getDate()}\`)` → same issue

### Current Capping
- `'today'` (hourly): `Math.min(prodSec, 3600)` — correct, max 1 hour per hour slot
- `'week'`, `'month'`, `'all'`: **NO cap** — correct, full daily/monthly totals should display
- Y-axis: capped at 24h max (`niceMax = Math.min(rawMax, 24)`)

### Color Scheme (from codebase)
- Productive: `#10b981` (emerald-500)
- Non-Productive: `#f59e0b` (amber-500)
- External: `#6366f1` (indigo-500)
- Background: dark theme with `glass` class cards
- App uses Syne for headlines, Inter for body text

---

## The Mandate

**Design the technical and visual specifications for a complete overhaul of the Weekly Productivity chart on the Dashboard page.**

Act as Lead Designer and Engineer. Own the entire solution from data processing logic through pixel-level visual specs.

---

## Engineering Task — Data Processing Pipeline

Design the correct aggregation math:

1. **Fix the key mapping bug:** External session data must be keyed by unique date identifiers, not by weekday number or day-of-month number. For `'week'` period, each of the 7 days needs its own bucket. For `'month'`, each of the ~30 days needs its own bucket.

2. **Period-aware aggregation:**
   - `'today'`: 24 hourly buckets, external keyed by hour (0-23)
   - `'week'`: 7 daily buckets, external keyed by full date string (e.g., `"2026-05-18"`)
   - `'month'`: 28-31 daily buckets, external keyed by full date string
   - `'all'`: Monthly buckets, external keyed by `"YYYY-MM"`

3. **Correct internal log filtering:** `logs.filter()` must use the exact same date boundaries as the external aggregation

4. **Handle the `periodOffset` navigation:** When user navigates to previous weeks/months, the date range computation must shift correctly

5. **Performance:** The `useEffect` runs on every `selectedPeriod`, `periodOffset`, `chartExternalData`, and `allLogs` change. Consider memoization or useMemo for the bar computation.

---

## Design Task — High-Fidelity Visual Specs

1. **Chart type:** Stacked Bar chart (keep Recharts `BarChart` with three `Bar` components)

2. **Bar rendering:** 
   - Rounded top corners on the topmost segment
   - Consistent spacing between bars
   - Hover state: slight brightness increase or scale

3. **Y-axis:**
   - Currently capped at 24h — evaluate whether this is correct for `'all'` period (monthly totals can exceed 24h)
   - Nice tick values (1, 2, 4, 6, 8, 10, 12, 16, 20, 24)
   - Currently uses 4 ticks — evaluate if this is sufficient for month/all views

4. **X-axis labels:**
   - `'today'`: `"12a"`, `"1a"`, ... `"11p"`
   - `'week'`: `"Sun"`, `"Mon"`, ... `"Sat"`
   - `'month'`: `"1"`, `"2"`, ... `"31"`
   - `'all'`: `"Jan '25"`, `"Feb '25"`, ...

5. **Today indicator:** Week view currently highlights today's bar with a purple border — keep or improve

6. **Empty states:** What shows when no data exists for a period?

7. **Color palette:** Must use existing colors (emerald/amber/indigo) — do not change unless proposing a reason

---

## UX Task — Interaction Flow

1. **Period switching:** User clicks "Today / Week / Month / All" — chart transitions smoothly with correct data
2. **Timeline navigation:** Chevron left/right buttons shift `periodOffset` — chart updates
3. **Hover:** Tooltip shows breakdown (productive hours, non-productive hours, external hours, total)
4. **Today button:** "Today" button resets offset to 0
5. **Empty state:** Clear messaging when no tracking data exists

---

## Constraints

- Must work with existing IPC endpoints (`getExternalSessions`, `getLogs`)
- Must stay in `DashboardPage.tsx` — no new files
- Must use Recharts (already imported: `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `CartesianGrid`)
- Must maintain backward compatibility with `chartBarsResult` state shape (other components may depend on it)
- No external library additions
- Dark theme only
