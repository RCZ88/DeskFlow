# Patch 5 — App.tsx: filteredLogs / setLogs / appStats / allTimeAppStats
**File:** `App.tsx`

## 5a. `filteredLogs` — skip the copy for 'all' (Requirement 3)
```ts
// BEFORE (App.tsx:299-302)
const filteredLogs = useMemo(() => {
    const range = getDateRange(selectedPeriod, dateOffset);
    return allLogs.filter(log => log.timestamp >= range.start && log.timestamp < range.end);
}, [allLogs, selectedPeriod, dateOffset]);

// AFTER
const filteredLogs = useMemo(() => {
    if (selectedPeriod === 'all' && dateOffset === 0) {
      return allLogs; // every log passes anyway — no filter, no copy
    }
    const range = getDateRange(selectedPeriod, dateOffset);
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    // numeric epoch compare instead of Date comparison operators, which
    // implicitly coerce both sides on every one of 100K comparisons
    return allLogs.filter(log => {
      const t = typeof log.timestamp === 'number' ? log.timestamp : log.timestamp.getTime();
      return t >= startMs && t < endMs;
    });
}, [allLogs, selectedPeriod, dateOffset]);
```

## 5b. `setLogs` cascade — mark as non-urgent (Requirement 5)
```ts
// BEFORE (App.tsx:306-312)
useEffect(() => {
    const fp = filteredLogs.length + '|' + (filteredLogs[0]?.timestamp || '');
    if (fp !== prevFilteredFingerprint.current) {
        prevFilteredFingerprint.current = fp;
        setLogs(filteredLogs);
    }
}, [filteredLogs]);

// AFTER
import { startTransition } from 'react';

useEffect(() => {
    const fp = filteredLogs.length + '|' + (filteredLogs[0]?.timestamp || '');
    if (fp !== prevFilteredFingerprint.current) {
        prevFilteredFingerprint.current = fp;
        // React 18: tells React this update can be interrupted/deferred, so
        // the click that changed the period doesn't get blocked by the
        // cascade of re-renders this triggers across the app.
        startTransition(() => {
          setLogs(filteredLogs);
        });
    }
}, [filteredLogs]);
```
Requires React 18 (`createRoot`, not legacy `ReactDOM.render`) — confirm this
is already the case before applying; if not, this line is a no-op fallback
to a plain call and needs the React 18 migration first.

## 5c. `appStats` — numeric compares, ISO strings computed once per app, not once per log
```ts
// BEFORE (App.tsx:968-997) — conceptually:
// for (const log of filteredLogs) {
//   ...
//   if (log.timestamp.toISOString() < grouped[app].first_seen) ...
//   if (log.timestamp.toISOString() > grouped[app].last_seen) ...
// }

// AFTER
const appStats = useMemo(() => {
    const grouped: Record<string, any> = {};
    for (const log of filteredLogs) {
        const t = typeof log.timestamp === 'number' ? log.timestamp : log.timestamp.getTime();
        const app = log.app; // keep your existing app-resolution logic here
        let g = grouped[app];
        if (!g) {
            g = grouped[app] = {
              first_seen_ms: t,
              last_seen_ms: t,
              // ...keep every other field this object currently tracks (counts, durations, etc.)
            };
        }
        if (t < g.first_seen_ms) g.first_seen_ms = t;
        if (t > g.last_seen_ms) g.last_seen_ms = t;
        // ...keep the rest of the per-log accumulation logic unchanged...
    }
    // Convert to ISO ONCE per app (tiny N, e.g. dozens of apps) instead of
    // once per LOG (huge N, up to 100K) — this is the actual fix.
    const result: Record<string, any> = {};
    for (const [app, g] of Object.entries(grouped)) {
        result[app] = {
          ...g,
          first_seen: new Date(g.first_seen_ms).toISOString(),
          last_seen: new Date(g.last_seen_ms).toISOString(),
        };
    }
    return result;
}, [filteredLogs, categoryOverrides]);
```

## 5d. `allTimeAppStats` — no full-array copy (Requirement 3)
```ts
// BEFORE (App.tsx:1000-1033)
const allTimeAppStats = useMemo(() => {
    const appLogs = [...allLogs]; // COPIES 100K array!
    // ...
}, [allLogs, categoryOverrides]);

// AFTER — iterate allLogs directly, apply the same numeric-epoch /
// once-per-app ISO conversion as 5c
const allTimeAppStats = useMemo(() => {
    const grouped: Record<string, any> = {};
    for (const log of allLogs) { // no copy needed for read-only iteration
        const t = typeof log.timestamp === 'number' ? log.timestamp : log.timestamp.getTime();
        const app = log.app;
        let g = grouped[app];
        if (!g) g = grouped[app] = { first_seen_ms: t, last_seen_ms: t };
        if (t < g.first_seen_ms) g.first_seen_ms = t;
        if (t > g.last_seen_ms) g.last_seen_ms = t;
    }
    const result: Record<string, any> = {};
    for (const [app, g] of Object.entries(grouped)) {
        result[app] = {
          first_seen: new Date(g.first_seen_ms).toISOString(),
          last_seen: new Date(g.last_seen_ms).toISOString(),
        };
    }
    return result;
}, [allLogs, categoryOverrides]);
```

## Follow-up (not included, documented per README): context/selector refactor
If profiling after 5a–5d still shows unrelated pages re-rendering on every
`setLogs`, the next step is a `LogsProvider` + `useSyncExternalStore`-backed
selector hook so only components that actually read `logs` re-render. That
touches every page that currently receives `logs` as a prop, so it's called
out as a scoped follow-up rather than bundled blind into this patch set.

## Expected impact
Removes the 100K-item array copy (~major GC pressure source) and drops
`.toISOString()` calls from ~200K-300K down to roughly `2 × (number of
distinct apps)`, typically under a few hundred.
