# Patch 6 — OrbitSystem input throttling (Requirement 4)
**Files:** `OrbitSystem.tsx` (computePlanets, lines ~702-763) + wherever it's mounted (e.g. `DashboardPage.tsx`)

## Preferred fix — use the new backend aggregate (pairs with Patch 4)
Once `logs:getAppAggregates` exists, the solar system never needs raw rows
for `period='all'` at all:
```ts
// DashboardPage.tsx (or wherever orbitLogs is derived today)
const [appAggregates, setAppAggregates] = useState<AppAggregate[] | null>(null);

useEffect(() => {
  let cancelled = false;
  window.electronAPI.getAppAggregates(selectedPeriod, dateOffset).then((rows) => {
    if (!cancelled) setAppAggregates(rows);
  });
  return () => { cancelled = true; };
}, [selectedPeriod, dateOffset]);

// Feed OrbitSystem the pre-grouped rows directly instead of raw logs when available.
<OrbitSystem appAggregates={appAggregates} logs={appAggregates ? undefined : filteredLogs} ... />
```
In `OrbitSystem.tsx`, add a fast path so `computePlanets` skips the grouping
loop entirely when aggregates are already grouped:
```ts
function computePlanets(logs, appColors, categoryOverrides, appAggregates?: AppAggregate[]) {
  if (appAggregates) {
    // already grouped + capped at 80 by SQL — just map to the planet shape
    return appAggregates.map(a => toPlanet(a, appColors, categoryOverrides));
  }
  const validLogs = (logs || []).filter(log => log && log.app && !log.is_browser_tracking);
  const grouped: Record<string, any[]> = {};
  for (const log of validLogs) {
    grouped[log.app] = grouped[log.app] || [];
    grouped[log.app].push(log);
  }
  const sortedApps = Object.entries(grouped)
    .filter(([, a]) => a.reduce((sum, l) => sum + (l.duration_ms || 0), 0) >= MIN_PLANET_TIME_SECONDS)
    .slice(-MAX_RENDERED_PLANETS);
  // ...existing logic unchanged...
}
```

## Fallback fix — client-side downsample (if the backend change isn't wired in yet)
Bounds `computePlanets`'s input to `maxCount` while still guaranteeing every
unique app appears at least once (so no planet silently disappears at 'all'):
```ts
/** O(N) downsample — no logs.includes() calls, no O(N^2) behavior. */
function downsampleForOrbit(logs: LogEntry[], maxCount = 10000): LogEntry[] {
  if (logs.length <= maxCount) return logs;

  const seenApps = new Set<string>();
  const pickedIds = new Set<number | string>();
  const representative: LogEntry[] = [];
  for (const log of logs) {
    if (log.app && !seenApps.has(log.app)) {
      seenApps.add(log.app);
      pickedIds.add(log.id);
      representative.push(log);
    }
  }

  const remainingBudget = Math.max(0, maxCount - representative.length);
  const rest: LogEntry[] = [];
  for (const log of logs) {
    if (rest.length >= remainingBudget) break;
    if (!pickedIds.has(log.id)) rest.push(log);
  }
  return representative.concat(rest);
}
```
Callsite:
```ts
const orbitInput = useMemo(
  () => downsampleForOrbit(filteredLogs, 10000),
  [filteredLogs]
);
<OrbitSystem logs={orbitInput} ... />
```

## Optional (Requirement 4c) — loading state
If you want a visible affordance regardless of which fix lands, wrap the
OrbitSystem mount in a lightweight loading flag that flips true right before
`computePlanets` runs and false on the next animation frame after, so the
user sees a spinner instead of a frozen scene during the (now much shorter)
compute:
```ts
const [orbitComputing, setOrbitComputing] = useState(false);
useEffect(() => {
  setOrbitComputing(true);
  const raf = requestAnimationFrame(() => setOrbitComputing(false));
  return () => cancelAnimationFrame(raf);
}, [orbitInput]);
```

## Expected impact
Backend-aggregate path: OrbitSystem processes ≤80 rows instead of 100,000 for
'all'. Fallback path: bounds the grouping loop to 10,000 rows worst case while
keeping every app's planet visible.
