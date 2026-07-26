# Patch 1 — agentChartsData useMemo (PRIMARY FIX)
**File:** `IDEProjectsPage.tsx` (was lines 1256–1327)

## Root cause
```ts
return activeAgents.map(agent => {
  const labels = lastDays.map(d => format(d, 'MMM dd'));                 // <-- runs PER AGENT
  let data = lastDays.map(d => getMetricValue(agent, format(d, 'yyyy-MM-dd'))); // <-- runs PER AGENT
  // ... chart data construction
});
```
`format()` is called `numAgents × numDays × 2` times. At `period='all'`
(numDays ≈ 365–395) with 10 agents that's **~7,300 Date-format calls** on
every recompute, all synchronous on the main thread — this is the single
biggest contributor to the Cityscape freeze.

## Fix
Hoist the day-key/day-label arrays **out of the per-agent loop** so they're
computed once, then reused for every agent. This is a 10x+ reduction (the
`numAgents` multiplier disappears entirely) with zero behavior change.

```ts
const agentChartsData = useMemo(() => {
    const daysMap: Record<string, number> = { 'week': 7, 'month': 30, 'all': 365 };
    const numDays = aiPeriod === 'all'
      ? (() => {
          const byTool = overview?.aiUsage?.byTool || {};
          let minDate = Infinity;
          let maxDate = -Infinity;
          for (const tool of Object.values(byTool) as any[]) {
            const daily = tool?.daily;
            if (!daily) continue;
            for (const d of Object.keys(daily)) {
              const t = new Date(d).getTime();
              if (!isNaN(t)) { if (t < minDate) minDate = t; if (t > maxDate) maxDate = t; }
            }
          }
          if (maxDate > 0 && minDate < Infinity) {
            return Math.max(1, Math.ceil((maxDate - minDate) / 86400000) + 30);
          }
          return 60;
        })()
      : (daysMap[aiPeriod] || 7);

    const lastDays = eachDayOfInterval({
      start: subDays(new Date(), numDays - 1),
      end: new Date()
    });

    const activeAgents = aiAgents.filter(a => a.status !== 'inactive' && a.tokens > 0);

    const getMetricValue = (agent: AIAgent, dayStr: string) => {
      const dayData = overview?.aiUsage?.byTool?.[agent.id]?.daily?.[dayStr];
      if (!dayData) return 0;
      if (aiChartMode === 'tokens') {
        if (tokenDisplayMode === 'input') return dayData.tokens_in || 0;
        if (tokenDisplayMode === 'output') return dayData.tokens_out || 0;
        return dayData.tokens || 0;
      }
      if (aiChartMode === 'messages') return dayData.messageCount || 0;
      if (aiChartMode === 'sessions') return dayData.sessions || 0;
      if (aiChartMode === 'cost') return dayData.cost || 0;
      return 0;
    };

    // >>> THE FIX: compute once, reuse for every agent <<<
    const dayKeys = new Array<string>(lastDays.length);
    const dayLabels = new Array<string>(lastDays.length);
    for (let i = 0; i < lastDays.length; i++) {
      dayKeys[i] = format(lastDays[i], 'yyyy-MM-dd');
      dayLabels[i] = format(lastDays[i], 'MMM dd');
    }

    return activeAgents.map(agent => {
      const labels = dayLabels;                                  // was: lastDays.map(d => format(d, 'MMM dd'))
      let data = dayKeys.map(k => getMetricValue(agent, k));      // was: lastDays.map(d => getMetricValue(agent, format(d, 'yyyy-MM-dd')))
      // ... chart data construction (UNCHANGED — paste your existing code back in here)
      return { agent, labels, data /* , ...whatever else this returned */ };
    });
}, [aiAgents, overview?.aiUsage?.byTool, aiPeriod, aiChartMode, tokenDisplayMode, logScale, excludeOutliers]);
```

## Optional second layer (only if profiling still shows jank after the above)
Wrap the `setAiPeriod('all')` call at its callsite (the period tab/button
onClick) in React 18 `startTransition`, so React can keep the click/tab UI
responsive while this memo recomputes in the background:
```ts
import { startTransition } from 'react';
// at the button onClick:
onClick={() => startTransition(() => setAiPeriod('all'))}
```
This does NOT reduce total work, it just stops it from blocking input — do
Patch 1's hoist first since that's the actual O(N) reduction.

## Expected impact
~7,300 → ~730 `format()` calls for a 10-agent / 365-day 'all' view (removes
the `numAgents` multiplier entirely). Combine with Patch 2 to also stop
redundant recomputation when `aiAgents`'s reference changes but its content
doesn't.
