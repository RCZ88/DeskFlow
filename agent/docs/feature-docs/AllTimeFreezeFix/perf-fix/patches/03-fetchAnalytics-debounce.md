# Patch 3 — Debounce + de-dupe `fetchAnalytics`
**File:** `IDEProjectsPage.tsx` (fetchAnalytics, line ~599-647)

## Root cause
`fetchAnalytics` re-fires on every `aiPeriod` change, with no debounce and no
stale-response guard. If the user clicks through week → month → all quickly,
multiple full backend fetches overlap, and whichever resolves last "wins"
regardless of which tab the user is actually looking at — wasted work that
compounds the freeze.

## Fix
```ts
import { useRef, useEffect, startTransition } from 'react';

const analyticsAbortRef = useRef<AbortController | null>(null);
const analyticsDebounceRef = useRef<number | null>(null);
const lastAnalyticsFingerprint = useRef<string>('');

useEffect(() => {
  if (analyticsDebounceRef.current) window.clearTimeout(analyticsDebounceRef.current);

  analyticsDebounceRef.current = window.setTimeout(() => {
    analyticsAbortRef.current?.abort();
    const controller = new AbortController();
    analyticsAbortRef.current = controller;

    fetchAnalytics(controller.signal).then((result) => {
      if (controller.signal.aborted) return; // stale response, a newer request superseded it

      // Skip the state update entirely if the backend returned the same data
      // (e.g. 'all' vs 'week' can overlap heavily) — this is what stops the
      // aiAgents -> agentChartsData -> Cityscape chain from re-running for no reason.
      const fp = JSON.stringify({
        keys: Object.keys(result?.aiUsage?.byTool || {}),
        totals: Object.values(result?.aiUsage?.byTool || {}).map((t: any) => t.tokens),
      });
      if (fp === lastAnalyticsFingerprint.current) return;
      lastAnalyticsFingerprint.current = fp;

      startTransition(() => {
        setWorkspaceAnalytics(result); // use your existing setter name here
      });
    });
  }, 250); // 250ms debounce absorbs rapid period-tab clicking

  return () => {
    if (analyticsDebounceRef.current) window.clearTimeout(analyticsDebounceRef.current);
  };
}, [selectedPeriod, dateOffset, aiPeriod, activeTab]);
```
Threading `signal` through: if `fetchAnalytics` calls `fetch()` or an IPC
invoke that supports an `AbortSignal`, pass `{ signal }` through so an
in-flight request is actually cancelled, not just ignored. If the IPC layer
doesn't support cancellation, the `if (controller.signal.aborted) return;`
guard still prevents the stale result from being applied, which is the part
that matters for the freeze.

## Expected impact
Collapses N rapid period clicks into 1 backend fetch + 1 state update instead
of N, and skips the entire downstream recompute chain when the payload is
unchanged.
