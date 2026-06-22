# 📝 Design Prompt: Sleep Chart Per-Bar Latency Labels

## Raw Request
> "the sleep table the sleep chart on the external page is not showing the sleep properly since there's like the one generalized label that shows the time before sleep and the time for accessing the device and so on and so forth the problem that is that it's 1 for representing a whole week of data or month of data that's not how it's supposed to be that label is supposed to be that it's integrated into the child itself so that means that each day or each time and whatever day or timeline it is each individual day should have the extension of the chart of the bar child of the bar it should be on top and below the bar right it should be stacked it should be a bar but it's stacked on that"

## Problem Statement
The current Sleep Trends chart on the External page shows "Time before device" and "Extra time after device" as GLOBAL aggregate badges above and below the entire chart. Each night (each bar) should have its own latency extension — stacked above the bar (for time-to-sleep, pre-sleep latency) and stacked below the bar (for wake latency, post-sleep latency). The chart currently uses floating bars (bedtime → wake time crossing midnight), but the latency data is aggregated for the whole period, not per-bar.

## Engineering Task
**Data Processing Pipeline:**
1. The sleep session data already has `start_time` (bedtime) and `end_time` (wake time). The latency (time before device off → fall asleep) and wake latency (wake → device on) need to be calculated per-session.
2. For each sleep session in the selected period, compute:
   - `sleepLatency = fall_asleep_time - device_off_time` (time from stopping device to actually sleeping)
   - `wakeLatency = device_on_time - wake_time` (time from waking to using device again)
3. These values need to be stored/fetched per session and attached to the chart bar data.
4. The chart bars need to be 3-layer stacked: [pre-sleep latency] + [actual sleep window] + [post-wake latency].
5. The pre-sleep and post-wake latency values should be small enough visually to not dominate the actual sleep time. Use proportional scaling (e.g., max latency shown = 30 min, which might be ~5% of the max bar height if avg sleep is 8h).

## High-Fidelity Visual Specs
- The sleep chart uses a floating bar design (bedtime→wake crossing midnight axis, y: -8 to +12 hours around midnight).
- Modify the chart to show **3 stacked segments per day**:
  1. **Top segment** (small, amber/gold color): pre-sleep latency — time from device off to falling asleep
  2. **Middle segment** (main, indigo/blue color): actual sleep window — from falling asleep to waking up
  3. **Bottom segment** (small, rose/pink color): post-wake latency — time from waking to device on again
- The middle segment is the primary visual (the actual sleep duration).
- The top/bottom segments are small and subtle — maybe 10-20px max height regardless of the main bar height.
- Tooltips should show all three: "Pre-sleep: Xm | Sleep: X.Xh | Post-wake: Xm"
- Remove the global aggregate badges above/below the chart — those metrics are now embedded per-bar.
- Keep the midnight axis line (y=0) as a visual anchor.
- Use the existing night-sky/lunar theme colors: amber for latency, indigo for sleep window, rose for wake.

## Interaction Flow
- Hover over any bar → tooltip shows all three values (pre-sleep latency, sleep duration, post-wake latency)
- Period selector (today/week/month/all) still filters the data — each bar changes accordingly
- Timeline navigation (chevron arrows) still shifts the date range

## Constraints
- Must work within the existing `react-chartjs-2` Bar chart
- Must integrate with existing `sleepTrends` data structure
- Must NOT break the sleep stopwatch flow (start sleep → record bedtime → set wake time later)
- Night-sky theme must be preserved