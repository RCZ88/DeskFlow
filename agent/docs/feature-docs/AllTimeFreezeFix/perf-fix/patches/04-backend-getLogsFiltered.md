# Patch 4 — Backend period filtering (Requirement 2)
**Files:** `main.ts` (near existing `getLogs`, lines ~3286-3310) + `preload.ts`

## Root cause
`getLogs()` has no period filter — it always returns up to 100K rows from
SQLite, and every period filter (including 'all') happens client-side after
the full payload has already been serialized over IPC and copied into
renderer memory.

## Fix — additive, does not touch `getLogs()`
### 1. Shared date-range helper (mirrors the renderer's `getDateRange`)
```ts
// main.ts
function getDateRangeMs(period: string, dateOffset: number): { startMs: number; endMs: number } {
  const now = new Date();
  const base = new Date(now);
  base.setDate(base.getDate() + (dateOffset || 0));
  switch (period) {
    case 'today': {
      const start = new Date(base); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    case '7day':
    case 'week': {
      const end = new Date(base); end.setHours(23, 59, 59, 999);
      const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      return { startMs: start.getTime(), endMs: end.getTime() + 1 };
    }
    case '30day':
    case 'month': {
      const end = new Date(base); end.setHours(23, 59, 59, 999);
      const start = new Date(end); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
      return { startMs: start.getTime(), endMs: end.getTime() + 1 };
    }
    case 'all':
    default:
      return { startMs: 0, endMs: 8640000000000000 };
  }
}
```
**IMPORTANT — verify before wiring in:** confirm whether the `logs.timestamp`
SQLite column stores epoch milliseconds (numeric) or an ISO string. The SQL
below assumes numeric epoch ms (matches `range.start`/`range.end` being
compared directly to `log.timestamp` in the renderer's existing
`filteredLogs` filter). If the column is TEXT/ISO, swap the two `?`
comparisons for `datetime(timestamp)` comparisons instead.

### 2. New endpoint — filtered logs (for Dashboard/Stats)
```ts
function getLogsFiltered(period: string, dateOffset: number, limit?: number | null): any[] {
  const { startMs, endMs } = getDateRangeMs(period, dateOffset);
  // null = explicit "give me everything" (e.g. CSV export); default caps at
  // 20,000 newest rows, since the renderer only needs a bounded working set
  // for charts/tables — this is what actually kills the 100K-row payload.
  const safeLimit = limit === null
    ? 100000
    : Math.min(Math.max(1, Math.floor(Number(limit) || 20000)), 100000);

  if (useJson) {
    return jsonLogs
      .filter(l => l.timestamp >= startMs && l.timestamp < endMs)
      .slice(0, safeLimit);
  }
  try {
    const stmt = db.prepare(
      'SELECT * FROM logs WHERE timestamp >= ? AND timestamp < ? ORDER BY id DESC LIMIT ?'
    );
    return stmt.all(startMs, endMs, safeLimit);
  } catch (err) {
    return [];
  }
}

ipcMain.handle('logs:getFiltered', (_event, args: { period: string; dateOffset?: number; limit?: number | null }) => {
  return getLogsFiltered(args.period, args.dateOffset || 0, args.limit);
});
```

### 3. New endpoint — pre-aggregated app totals (for OrbitSystem, Requirement 4b)
```ts
ipcMain.handle('logs:getAppAggregates', (_event, args: { period: string; dateOffset?: number }) => {
  const { startMs, endMs } = getDateRangeMs(args.period, args.dateOffset || 0);

  if (useJson) {
    const grouped: Record<string, { app: string; total_ms: number; cnt: number; last_seen: number }> = {};
    for (const l of jsonLogs) {
      if (l.timestamp < startMs || l.timestamp >= endMs || !l.app || l.is_browser_tracking) continue;
      const g = grouped[l.app] || (grouped[l.app] = { app: l.app, total_ms: 0, cnt: 0, last_seen: 0 });
      g.total_ms += l.duration_ms || 0;
      g.cnt += 1;
      if (l.timestamp > g.last_seen) g.last_seen = l.timestamp;
    }
    return Object.values(grouped).sort((a, b) => b.total_ms - a.total_ms).slice(0, 80);
  }
  try {
    const stmt = db.prepare(`
      SELECT app, SUM(duration_ms) AS total_ms, COUNT(*) AS cnt, MAX(timestamp) AS last_seen
      FROM logs
      WHERE timestamp >= ? AND timestamp < ?
        AND app IS NOT NULL
        AND (is_browser_tracking IS NULL OR is_browser_tracking = 0)
      GROUP BY app
      ORDER BY total_ms DESC
      LIMIT 80
    `);
    return stmt.all(startMs, endMs);
  } catch (err) {
    return [];
  }
});

// existing getLogs(limit?) below is UNTOUCHED — still available for any
// caller that wants the old unfiltered behavior (e.g. CSV export).
```

### 4. Preload bridge (`preload.ts`)
```ts
contextBridge.exposeInMainWorld('electronAPI', {
  // ...existing bridged methods, unchanged...
  getLogsFiltered: (period: string, dateOffset?: number, limit?: number | null) =>
    ipcRenderer.invoke('logs:getFiltered', { period, dateOffset, limit }),
  getAppAggregates: (period: string, dateOffset?: number) =>
    ipcRenderer.invoke('logs:getAppAggregates', { period, dateOffset }),
});
```

## Renderer callsite change (App.tsx)
Swap the initial full-table load for the filtered one when the active period
is known up front, e.g.:
```ts
// was: const rows = await window.electronAPI.getLogs();
const rows = await window.electronAPI.getLogsFiltered(selectedPeriod, dateOffset);
```
Keep a manual "load everything" path (pass `limit: null`) behind whatever
export/CSV feature already exists, so that flow is unaffected.

## Expected impact
For `period='all'`, the renderer receives ≤20,000 rows instead of 100,000 by
default (configurable), and the solar system never receives raw rows at all
— it gets ≤80 pre-grouped rows directly from SQLite. Both are the actual
fix for Requirement 2 and Requirement 4b.
