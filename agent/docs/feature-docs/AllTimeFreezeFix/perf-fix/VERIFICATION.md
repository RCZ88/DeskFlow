# Verification steps

Use Chrome DevTools Performance tab (Electron renderer: `Ctrl+Shift+I` /
`Cmd+Option+I` in the app window) for all timing checks below. Record a
profile, click "All Time", stop the recording, and read the Main thread
flame chart.

## 1. AICityscape freeze (PRIMARY)
1. Open the IDE page, AI tab.
2. Start a Performance recording, click the "All Time" period button, stop
   recording after the UI becomes responsive again.
3. **Before fix:** one long yellow (Scripting) block of 5-15s, mostly inside
   `agentChartsData` / `format` / `eachDayOfInterval` in the flame chart, and
   the whole window is unresponsive (can't click other tabs) during that time.
4. **After fix:** the same interaction should show at most a short (<500ms)
   scripting block, or if `startTransition` is used, the click itself
   registers immediately and DevTools shows the work happening in a
   lower-priority "Transition" render pass. Verify by:
   - Clicking a different tab (e.g. "Files") immediately after clicking
     "All Time" — it should respond instantly, not queue behind the compute.
   - Add a temporary `console.time('agentChartsData')` / `console.timeEnd(...)`
     around the memo body and confirm it drops from seconds to well under
     100ms for a typical 10-agent dataset.
5. Toggle between `week` → `all` → `week` repeatedly and confirm the
   Cityscape canvas does NOT visibly flicker/rebuild when the underlying
   agent numbers haven't changed (validates Patch 2's stable reference).

## 2. Solar System (OrbitSystem) freeze
1. Open the Dashboard page, switch to "All Time".
2. Record a Performance profile across the switch.
3. **Before fix:** long scripting block inside `computePlanets` / grouping
   loop, scaling with total log count (100K).
4. **After fix:** confirm exactly the same set of planets renders (visually
   diff against the pre-fix screenshot) while the scripting block drops
   proportionally to `10,000/100,000` (fallback fix) or effectively
   disappears (aggregate-endpoint fix, since SQL does the grouping).
5. Check the Network/IPC panel (or add a temporary log) to confirm
   `logs:getAppAggregates` returns ≤80 rows when the aggregate path is wired
   in.

## 3. Dashboard/Stats freeze
1. Switch Dashboard period to "All Time" with DevTools Performance recording
   on.
2. **Before fix:** scripting time attributable to `filteredLogs`,
   `appStats`, `allTimeAppStats` array copies/`.toISOString()` calls.
3. **After fix:**
   - Confirm `filteredLogs === allLogs` (reference equality) when
     `period==='all'` and `dateOffset===0` (add a temporary
     `console.log(filteredLogs === allLogs)`).
   - Confirm `appStats`/`allTimeAppStats` numeric values match the pre-fix
     output exactly for a fixed dataset (regression check — output must be
     identical, only the computation path changed).
   - Confirm `setLogs` no longer blocks input: click a filter checkbox
     immediately after switching to "All Time" and verify it responds
     without waiting for the stats recompute.

## 4. StatsPage freeze
1. Open StatsPage, switch to "All Time".
2. **Before fix:** long scripting block in `dailyUsage`/`hourlyDistribution`.
3. **After fix:** confirm the monthly totals chart and hourly distribution
   chart render identical numbers to before (spot-check 2-3 months and the
   24 hourly buckets), while the scripting block is short. Note: if the
   hourly-distribution approximation (patch 7) is applied, sessions that
   cross an hour boundary will show a small, expected shift versus the exact
   pre-fix numbers for VERY long sessions — confirm this is acceptable, or
   keep the "precise mode" toggle from patch 7 if exact parity is required.

## 5. Regression pass (all existing periods)
For each of `today`, `7day`/`week`, `30day`/`month`: confirm charts,
cityscape, solar system, and stats show byte-for-byte the same numbers as
before this patch set (these paths were intentionally left untouched, this
is just confirming no ripple effects from shared helpers like
`getDateRangeMs`/`downsampleForOrbit`/`useStableArray`).

## Sign-off checklist
- [ ] Switching to "All Time" on the IDE/AI tab completes in <500ms with no
      main-thread block >100ms (PRIMARY target).
- [ ] Solar system shows the same planets, computed from ≤80 aggregate rows
      or a bounded 10K-row sample.
- [ ] Dashboard/StatsPage numbers are unchanged; no more 100K-item array
      copies in the profile.
- [ ] `today`/`week`/`month`/`7day`/`30day` are pixel- and number-identical
      to pre-fix behavior.
- [ ] Old `getLogs()` callers still work unmodified.
