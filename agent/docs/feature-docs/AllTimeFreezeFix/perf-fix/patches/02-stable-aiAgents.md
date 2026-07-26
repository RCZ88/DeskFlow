# Patch 2 — Stabilize `aiAgents` reference + skip Cityscape re-render
**Files:** `IDEProjectsPage.tsx` (aiAgents useMemo, lines 1191-1236) + `AICityscape.tsx` (heroes useMemo, lines 47-63)

## Root cause
`aiAgents` depends on `workspaceAnalytics?.aiUsage?.byTool`, which gets a new
object reference every time `fetchAnalytics` resolves — even if the actual
agent numbers are identical to last time. Because it's a new array reference,
it flows through as a new `agents` prop into `<AIUsageCityscape>`, which
re-triggers the `heroes` useMemo and a full Three.js canvas re-render, on top
of whatever the real data change was.

## Fix A — content-stable memo (IDEProjectsPage.tsx)
Add this small generic hook once (e.g. in a `hooks/useStableArray.ts` file or
inline near `aiAgents`):
```ts
import { useRef } from 'react';

/** Returns the SAME array reference across renders as long as a cheap
 *  fingerprint of its content hasn't changed — even if the upstream
 *  object/array identity did change. */
export function useStableArray<T>(value: T[], fingerprint: (v: T[]) => string): T[] {
  const ref = useRef<{ fp: string; value: T[] } | null>(null);
  const fp = fingerprint(value);
  if (!ref.current || ref.current.fp !== fp) {
    ref.current = { fp, value };
  }
  return ref.current.value;
}
```
Then wrap the existing `aiAgents` computation (rename it, keep it 100%
unchanged, just wrap the output):
```ts
const rawAiAgents = useMemo((): AIAgent[] => {
    const agents: AIAgent[] = [];
    const wsByTool = workspaceAnalytics?.aiUsage?.byTool;
    const ovByTool = overview?.aiUsage?.byTool;
    const byTool = wsByTool && Object.keys(wsByTool).length > 0 ? wsByTool : (ovByTool || {});

    for (const [agentId, data] of Object.entries(byTool)) {
      const config = AGENT_CONFIG[agentId] || { name: agentId, icon: agentId, color: '#6366f1' };
      agents.push({
        id: agentId,
        name: config.name,
        tokens: (data as any).tokens || 0,
        // ... KEEP every other field exactly as it is today
      });
    }
    return agents;
}, [workspaceAnalytics?.aiUsage?.byTool, overview?.aiUsage?.byTool]);

// >>> THE FIX: cheap content fingerprint, not full deep-equal <<<
const aiAgents = useStableArray(rawAiAgents, (agents) => {
  let s = '';
  for (const a of agents) s += a.id + ':' + a.tokens + ':' + a.status + ':' + a.lastUsed + '|';
  return s;
});
```
Everything downstream (`agentChartsData`, `<AIUsageCityscape agents={aiAgents}>`)
now only sees a new `aiAgents` reference when the fingerprinted fields
actually changed — not on every period switch.

## Fix B — belt-and-suspenders: memo the Cityscape component itself
In `AICityscape.tsx`, wrap the exported component in `React.memo` with the
same fingerprint idea, so even if a parent re-renders for an unrelated reason
(e.g. a sibling tab state change), the Canvas subtree bails out early:
```tsx
function fingerprintAgentsForRender(agents: AIAgent[]): string {
  let s = '';
  for (const a of agents) s += a.id + ':' + a.tokens + ':' + a.status + '|';
  return s;
}

function areEqual(prev: AIUsageCityscapeProps, next: AIUsageCityscapeProps) {
  return (
    prev.period === next.period &&
    prev.metric === next.metric &&
    prev.tokenDisplayMode === next.tokenDisplayMode &&
    prev.loading === next.loading &&
    fingerprintAgentsForRender(prev.agents) === fingerprintAgentsForRender(next.agents)
  );
}

export const AIUsageCityscape = React.memo(function AIUsageCityscape(props: AIUsageCityscapeProps) {
  // ...existing component body, unchanged...
}, areEqual);
```
The existing `heroes` useMemo inside (keyed on `[agents]`) is left untouched
— it will now simply run less often because `agents` itself changes less
often once Fix A is in place.

## Expected impact
Eliminates the extra Three.js canvas re-render that currently happens on
*every* period click even when the agent numbers didn't change — this is on
top of (not instead of) Patch 1's compute reduction.
