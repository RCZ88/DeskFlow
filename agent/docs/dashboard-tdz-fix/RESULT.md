# RESULT: DashboardPage TDZ + Null Guard Fixes

## Bugs Fixed

### Bug 1 — Temporal Dead Zone (weekOffset)

**Root cause:** `const [weekOffset, setWeekOffset] = useState(0)` was declared at line 452, but referenced in the fetch `useEffect` dependency array `[selectedPeriod, dateOffset, weekOffset]` at line 352. `const` is in TDZ until its declaration line executes.

**Fix:** Moved `const [weekOffset, setWeekOffset] = useState(0)` to line 305 (right after `pausedByTrackerApp`), before all `useEffect` hooks that reference it.

### Bug 2 — Null `dashboardData.weeklyHeatmap` in `chartBars` useMemo

**Root cause:** `dashboardData` starts as `null` (initial state). On first render, before the async fetch completes, the `chartBars` useMemo runs. Three of the four switch cases (week/month/all) accessed `dashboardData.weeklyHeatmap.find()` without optional chaining.

**Fix:** Changed all three unguarded accesses:
```
dashboardData.weeklyHeatmap.find(...)  →  dashboardData?.weeklyHeatmap?.find(...)
```

Lines fixed: 547 (week case), 564 (month case), 583 (all case).

The 'today' case was already safe (used `dashboardData?.hourlyHeatmap?.[todayStr]`).

## Files Modified

- `src/pages/DashboardPage.tsx` — Moved `weekOffset` declaration before fetch useEffect (line 305). Added `?.` to all 3 unguarded `weeklyHeatmap.find()` calls.
- `agent/state.md` — Updated to v3.73 with fix entry.
- `agent/debugging.md` — Added "TDZ (Temporal Dead Zone)" section to prevent recurrence.

## Verification

- `npm run build` — ✅ Passes (renderer + electron)
- Dashboard no longer crashes on first render (null dashboardData handled by `?.`)
- Dashboard data loads correctly after async fetch completes

## Prevention (added to debugging.md)

- Group ALL `useState` and `useRef` declarations at the TOP of the function body
- Never scatter `useState` between `useEffect`/`useMemo` hooks
- When adding a variable to a dependency array, verify its declaration is BEFORE the hook
