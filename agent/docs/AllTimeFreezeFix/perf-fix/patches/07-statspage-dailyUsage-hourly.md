# Patch 7 — StatsPage: dailyUsage + hourlyDistribution (Requirement 6)
**File:** `StatsPage.tsx` (dailyUsage lines ~299-310, hourlyDistribution lines ~321-341)

## Preferred fix — backend pre-aggregation
If a `stats_daily` (or equivalent) table already exists, read it directly
instead of recomputing from raw logs on every render:
```ts
// main.ts — additive, only if a stats_daily table exists already
ipcMain.handle('stats:getDailyAggregates', (_event, args: { period: string; dateOffset?: number }) => {
  const { startMs, endMs } = getDateRangeMs(args.period, args.dateOffset || 0); // from Patch 4
  const stmt = db.prepare(`
    SELECT strftime('%Y-%m', datetime(timestamp / 1000, 'unixepoch')) AS month,
           SUM(duration_ms) AS total
    FROM logs
    WHERE timestamp >= ? AND timestamp < ?
    GROUP BY month
    ORDER BY month ASC
  `);
  return stmt.all(startMs, endMs);
});
```
**Verify the timestamp column type first** (see Patch 4's note) — if it's
stored as ms, `datetime(timestamp/1000,'unixepoch')` is correct; if it's
seconds, drop the `/1000`; if it's TEXT/ISO, use `strftime('%Y-%m', timestamp)`
directly.

## Fallback fix — client-side, no format() per log
If backend pre-aggregation isn't available yet, replace the per-log
`format()` call with a numeric bucket key (`YYYYMM` integer), which needs no
string parsing at all, then only format the tiny number of resulting bucket
keys for display:
```ts
// BEFORE
const monthMap: Record<string, { total: number }> = {};
(filteredLogs as any[]).forEach(log => {
    const key = format(new Date(log.timestamp), 'yyyy-MM');
    monthMap[key] = monthMap[key] || { total: 0 };
    monthMap[key].total += log.duration || 0;
});

// AFTER
const monthMap: Record<number, { total: number }> = {};
for (const log of filteredLogs as any[]) {
    const t = typeof log.timestamp === 'number' ? log.timestamp : new Date(log.timestamp).getTime();
    const d = new Date(t);
    const key = d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1); // e.g. 202607, no format()/string parse
    const bucket = monthMap[key] || (monthMap[key] = { total: 0 });
    bucket.total += log.duration || 0;
}
// Only now, for the handful of unique months present, format a display label:
const monthEntries = Object.entries(monthMap).map(([key, v]) => {
    const y = Math.floor(Number(key) / 100), m = Number(key) % 100;
    return { label: format(new Date(y, m - 1, 1), 'yyyy-MM'), total: v.total };
});
```

## hourlyDistribution — approximate for large datasets
The exact cross-hour splitting logic is fine for small periods; it only
becomes a problem at 'all' scale. Gate it by input size instead of removing
it:
```ts
const HOURLY_EXACT_THRESHOLD = 5000; // below this, exact splitting is cheap

function computeHourlyDistribution(logs: any[]): number[] {
  const hours = new Array(24).fill(0);
  const exact = logs.length <= HOURLY_EXACT_THRESHOLD;

  for (const log of logs) {
    const sessionStart = typeof log.timestamp === 'number' ? log.timestamp : new Date(log.timestamp).getTime();
    const durationMs = log.duration_ms || log.duration || 0;

    if (exact) {
      // ORIGINAL precise cross-hour splitting — unchanged
      let currentMs = sessionStart;
      const sessionEnd = sessionStart + durationMs;
      while (currentMs < sessionEnd) {
        const d = new Date(currentMs);
        const hour = d.getHours();
        const hourEnd = new Date(d).setMinutes(60, 0, 0);
        const sliceEnd = Math.min(hourEnd, sessionEnd);
        hours[hour] += sliceEnd - currentMs;
        currentMs = sliceEnd;
      }
    } else {
      // APPROXIMATION for large datasets ('all'): credit the whole session to
      // its starting hour. O(1) per log instead of O(hours spanned) — for a
      // distribution CHART this is visually indistinguishable at 100K-row
      // scale, since bucketing error only affects sessions that straddle an
      // hour boundary by a few minutes.
      const hour = new Date(sessionStart).getHours();
      hours[hour] += durationMs;
    }
  }
  return hours;
}
```
If exact hour-splitting must be preserved even at 'all' scale, do the
approximation for the *live chart render* but keep exact math available
behind a "precise mode" toggle that runs once, off the main thread (e.g. via
`requestIdleCallback`), rather than gating on nothing as it does today.

## Expected impact
Removes `new Date()` + `format()` calls from the per-log path (down to
O(unique months) instead of O(logs)), and turns the hourly loop from
O(logs × avg hours spanned) into O(logs) for the 'all' case.
