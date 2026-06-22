## Raw Request

> i want so that the system is imporved on the backedn so that everythign is more efficient and more loaded better, how its loaded how its saved, especially for the more convulated data like the all time timeline, for all the all the page like the application website producitivty, and insights page. and basically, how its being trackeed how to track it accurately and make sure the logic of the website tracking it properly as per what i mention

---

## CONTEXT_BUNDLE.md

Read `agent/docs/backend-overhaul-05062026/CONTEXT_BUNDLE.md` FIRST. This is your only source of truth for code structure, data shapes, IPC handlers, DB schema, and page data flows. The file contains:

- Architecture overview (data flow diagram)
- DB schema (logs, stats_daily, stats_hourly, sessions tables)
- All current IPC handlers and what they return (with line numbers)
- Per-page data requirements (StatsPage, ProductivityPage, BrowserActivityPage)
- Tracking pipeline (pollForeground, handleBrowserData, extension)
- Current inefficiencies (6 specific problems)
- Helper functions (computePeriodRange, calculateProductivityScore, getTierMap)

---

## The Mandate

You are the Lead Engineer. Design a comprehensive backend overhaul that eliminates frontend data aggregation, replaces bulk log transfers with server-side SQL aggregation, and ensures accurate tracking across all pages. The solution must handle every period mode (today/week/month/7day/30day/all) and every page (StatsPage, ProductivityPage, BrowserActivityPage, ExternalPage).

## Requirement Checklist

### R1 — Server-Side Aggregation Endpoints

Design NEW or REVISED IPC handlers that return pre-aggregated data instead of raw log rows. Each endpoint accepts `(period, dateOffset, timeMode?, tierAssignments?)` and returns typed, pre-computed data.

For each page, define:

**StatsPage data endpoint** — returns in one call:
- `dailyUsage`: For 'today' — 24 hourly buckets with cross-hour session splitting done in SQL. For week/month/7day/30day — per-day totals. For 'all' — per-month totals.
- `hourlyDistribution`: 24-hour buckets (summed across the period), with cross-hour splitting in SQL.
- `categoryBreakdown`: Per-category totals from stats_daily.
- `sortedApps`: Per-app totals from stats_daily (with tier support for focus mode).
- `selectedAppData` (for app detail modal): Per-app daily + hourly breakdown.

**ProductivityPage data endpoint** — returns in one call:
- `dailyTrend`: Array of {date, label, score, productive, neutral, distracting, total} per day/hour/month.
- `trendData`: Aggregated {score, totalSeconds, weightedSeconds, appSeconds, websiteSeconds, appVsWeb, tiers}.
- `comparison`: Current period vs previous period average.
- `peakHours`: Per-hour productivity breakdown.
- `sessions`: Recent app + website sessions (top 20, sorted by time).

**BrowserActivityPage data endpoint** — returns in one call:
- `domainStats`: Per-domain totals from stats_daily WHERE app_type='domain'.
- `categoryStats`: Per-category totals from stats_daily WHERE app_type='domain'.
- `hourlyDistribution`: Hourly/daily/monthly buckets from stats_hourly WHERE app_type='domain'.

**ExternalPage**: Already has dedicated IPC handlers. Verify they correctly support period+dateOffset filtering for all data (sleep, activities, sessions).

### R2 — SQL-Level Aggregation Strategy

Use the existing aggregation tables (`stats_daily`, `stats_hourly`) as the PRIMARY data source for page data. These tables are incrementally maintained by `updateAggregates()` on every log insert — they are always up-to-date.

Key SQL patterns to use:
- `stats_daily` for per-app/per-domain aggregations: `SELECT app_name, SUM(total_seconds), SUM(session_count) FROM stats_daily WHERE date BETWEEN ? AND ? GROUP BY app_name`
- `stats_hourly` for hourly distributions: `SELECT hour, SUM(total_seconds) FROM stats_hourly WHERE date BETWEEN ? AND ? GROUP BY hour`
- For 'all' period with monthly grouping: `SELECT strftime('%Y-%m', date) as month, SUM(total_seconds) FROM stats_daily GROUP BY month`

Handle the cross-hour session splitting for 'today' view: either in SQL using generated hour series + interval overlap, or in a dedicated backend function that processes logs in one pass (not per-useMemo).

### R3 — Data Loading Architecture

Replace the current flow:
```
getLogs() → 5000 raw rows → allLogs state → spread to pages → each does useMemo aggregation
```

With:
```
New IPC endpoint → pre-aggregated typed data → single state → pages render directly
```

Specifically:
- `allLogs` state in App.tsx should be REPLACED with per-page IPC calls (or a single `getAggregatedPageData` call).
- No raw log arrays should be sent through IPC for page rendering (except for the session list in ProductivityPage's "Recent Sessions" — those need raw rows but limited to 20).
- The `logs` prop that goes to StatsPage and ProductivityPage should become per-page data objects.

### R4 — Efficient Saving (Tracking Pipeline)

Review and optimize the tracking pipeline:

1. **pollForeground** (main.ts:2549-2748):
   - Ensure `isBrowserWithExtension()` check is present in ALL 3 logging paths (app-change, checkpoint, PS fallback).
   - Verify the `MAX_SESSION_MS` cap (1 hour) doesn't lose real long sessions — consider using checkpoint interval as a hard cap instead.
   - The sleep gap detection currently logs pre-gap duration then sets `currentApp = null`. On recovery, it logs the pre-gap duration again (second call for the same gap). Verify this isn't double-logging.

2. **handleBrowserData** (main.ts:9953-10130):
   - The defense-in-depth check (`currentApp` matches configured browser) is already added. Verify it works correctly.
   - The deduplication logic (lines 10046-10083) merges recent browser entries — ensure it doesn't merge entries from different sessions.
   - Active browser sessions map (`activeBrowserSessions`) is in-memory only — consider persisting it to avoid losing browser tracking state on restart.

3. **Browser Extension** (background.js):
   - `checkBrowserFocus()` polls `/foreground-app` every 2s — this is a HTTP request to the local server. Consider reducing frequency to 5s to match the app's poll rate.
   - The string matching for browser detection (`appName.includes(browserName)` etc.) is fragile — document edge cases.
   - When `isBrowserFocused` transitions from true→false, the extension should force-flush the current session's accumulated time before pausing.

4. **updateAggregates** (main.ts:2212-2264):
   - This runs on EVERY single log insert. It updates 4 different tables in sequence (daily_stats, sessions, daily_aggregates, browser_sessions). Consider wrapping in a transaction.
   - `daily_aggregates` appears to be a duplicate of `stats_daily` — verify and consolidate if possible.

### R5 — Website Tracking Accuracy

Ensure the browser is only tracked as a website (not an app) when the extension is active:

1. `pollForeground()` already has `!isBrowserWithExtension()` — verify it's at all 3 paths.
2. `addLog()` already rejects browser entries without valid domains (line 2170-2174).
3. The extension's `is_browser_focused` flag + the server-side `currentApp` check provide defense-in-depth.
4. When website tracking is DISABLED, the browser SHOULD be tracked as an app (correct behavior — user wants desktop-level tracking only).

### R6 — Caching Strategy

Define a caching layer for aggregated data:
- Cache aggregated results by key `(period, dateOffset, timeMode)` for 30-60 seconds.
- Invalidate on any new log insert (call from `addLog()` → clear all caches).
- This prevents recomputation on rapid period/offset navigation while staying fresh.

---

## Constraints

1. **Do NOT change DB schema.** All existing tables, columns, and indexes must remain. New IPC handlers should use existing aggregation tables (stats_daily, stats_hourly).
2. **Existing IPC handlers must remain** for backward compatibility. Add new ones; don't modify old ones.
3. **DashboardPage is already optimized** — it uses `getDashboardAggregates`. Do not change it.
4. **Support all period values**: `'today' | 'week' | 'month' | '7day' | '30day' | 'all'`
5. **JSON fallback** (`useJson` flag) must still work — provide JS-based aggregation for JSON mode alongside SQL.
6. **Every page must work correctly for 'all' time** without freezing or loading excessive data.
7. **The big productivity number** (trendAverageScore) must match the line chart's daily average, computed as: `sum(dailyTrend[].score) / dailyTrend.length`.

---

## Output Format

Return a comprehensive technical design in markdown with these sections:

1. **New/Revised IPC Handlers** — for each: channel name, request shape, response shape, implementation approach (SQL + JS fallback).
2. **Frontend Migration Plan** — what each page needs to change: new state variables, removed useMemos, new data prop types.
3. **Tracking Pipeline Audit** — specific fixes for each issue identified in R4/R5.
4. **Sequence of Implementation** — which changes to make first, dependencies between them.
5. **Edge Cases** — empty periods, JSON mode, all-time with no data, focus mode, tier changes mid-period.
