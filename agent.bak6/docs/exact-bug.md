# EXACT BUG: Planet vs App Page Numbers Different

## The Bug
When selecting "This Week" period:
- ✅ **App Page (StatsPage)**: Shows CORRECT weekly data
- ❌ **Planet (OrbitSystem)**: Shows WRONG weekly data (different numbers)

## Root Cause
**Planet receives `logs` (includes ALL apps), App Page receives `computedAppStats` (excludes browser apps).**

### App.tsx Data Flow:
```
Line 1623: <OrbitSystem logs={logs} ... />
Line 1839: <StatsPage appStats={computedAppStats} ... />
```

- `logs` = filteredLogs (period-filtered, NO browser exclusion)
- `computedAppStats` = filtered + browser apps excluded

## Why Daily Works But Weekly Doesn't
This is likely because on daily, there are fewer logs and the difference is less noticeable. On weekly, more data accumulates and the mismatch becomes obvious.

## Key Code Locations

**App.tsx line 1623 - Planet gets logs (no browser filter):**
```jsx
<OrbitSystem logs={logs} appColors={appColors} categoryOverrides={categoryOverrides} websiteLogs={browserLogs} />
```

**App.tsx line 1839 - StatsPage gets computedAppStats (with browser filter):**
```jsx
<StatsPage appStats={computedAppStats} logs={logs} selectedPeriod={selectedPeriod} />
```

**App.tsx lines 388-393 - computedAppStats filters out browsers:**
```javascript
const BROWSER_APPS = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge', 'comet', 'browser'];
const appLogs = filtered.filter(log => 
  !log.is_browser_tracking && 
  !BROWSER_APPS.includes((log.app || '').toLowerCase())
);
```

**OrbitSystem.tsx lines 329-335 - Planet also filters browsers internally:**
```javascript
const validLogs = (logs || []).filter((log: any) =>
  log && log.app && typeof log.app === 'string' && log.app.trim().length > 0 &&
  !log.is_browser_tracking && // Exclude websites
  !BROWSER_APPS.includes((log.app || '').toLowerCase()) // Exclude browser apps
);
```

## Interesting: Both filter browsers
Both StatsPage (via computedAppStats) and OrbitSystem (internally) filter out browser apps. So that's NOT the difference.

## Real Difference
- **StatsPage**: Uses `computedAppStats` which sums up `total_ms` per app from grouped logs
- **Planet**: Uses `logs` directly, calculates time per app from individual log entries

The issue might be in how time is aggregated. Let me check...

Actually wait - the user said:
- "when i switch time from daily to weekly, it works" (the app page works)
- "theres something wrong with the weekly logic on the planet system"

This means DAILY works on both, but WEEKLY only works on StatsPage, not Planet.

## The Real Bug - Logs Not Updating?
The planet receives `logs` prop. Let me check if `logs` is properly being updated when period changes.

Looking at App.tsx:
- Line 208-224: `filteredLogs` useMemo filters allLogs by period
- Line 227-229: useEffect syncs `logs` state with `filteredLogs`
- Line 1623: Pass `logs` to OrbitSystem

This SHOULD work correctly...

**Wait - could be a memoization issue?** OrbitSystem memoizes on `logs`:
```javascript
const appSolarSystems = useMemo(() => {
  return computeSolarSystems(logs, appColors, categoryOverrides);
}, [logs, appColors, categoryOverrides]);
```

If `logs` reference doesn't change, it won't recalculate. But `logs` is a new array from useEffect, so that should be fine.

## Test This
Run the app, select "This Week" on both:
1. Go to Dashboard - note planet's planets and times
2. Go to Applications page - note app times
3. Compare - they should be different

## Fix Options
1. Pass pre-filtered logs (excluding browsers) to planet
2. Pass computedAppStats data to planet instead of raw logs
3. Or ensure both use exact same data source