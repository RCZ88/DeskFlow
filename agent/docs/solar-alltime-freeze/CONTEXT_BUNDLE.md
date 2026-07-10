# Context Bundle: Cityscape + Solar System + Dashboard All-Time Freeze

## User's Raw Request
> "switching to the all time just freezes the app, just like on the solar system visualization. MAINLY FOR THE CITYSCAPE"

## Problem Statement
Three related performance issues when switching to "All Time":
1. **AICityscape (PRIMARY):** IDE page `agentChartsData` useMemo computes `numDays × numAgents` with Date formatting. When `aiPeriod === 'all'`, numDays can be 365+. With 10 agents = 3650+ `format()` calls. Plus `aiAgents` recomputes on period change (new array reference), triggering full Three.js canvas re-render.
2. **Solar System (OrbitSystem):** Receives all 100K filteredLogs. `computePlanets` does O(N) grouping. Output capped at 80 but input unbounded.
3. **Dashboard/Stats:** `getLogs()` returns 100K rows, `filteredLogs` copies all, `appStats` does `.toISOString()` per item, `setLogs()` cascades re-renders.

## Architecture Overview — THREE freeze points

```
═══ FREEZE POINT 1: IDE PAGE / AICITYSCAPE (PRIMARY) ═══
IDEProjectsPage aiPeriod state → setAiPeriod('all')
    ↓ triggers
fetchAnalytics() → re-fetches ALL analytics from backend
    ↓ updates
workspaceAnalytics state → aiAgents useMemo recomputes (new array ref)
    ↓ triggers
agentChartsData useMemo → numDays(365+) × numAgents × format() calls
    ↓ triggers
AICityscape re-renders → full Three.js canvas re-render

═══ FREEZE POINT 2: SOLAR SYSTEM ═══
DashboardPage selectedPeriod → 'all'
    ↓ triggers
getDashboardAggregates({ period: 'all' }) → backend full table scan
    ↓ updates
dashboardData → orbitLogs derived
    ↓ triggers
OrbitSystem computePlanets → O(N) grouping on 100K logs

═══ FREEZE POINT 3: DASHBOARD/STATS ═══
App.tsx getLogs() → 100K rows
    ↓
setAllLogs(100K)
    ↓ useMemo
filteredLogs → copies all 100K when period='all'
    ↓ useEffect
setLogs(filteredLogs) → cascades to ALL pages
    ↓
appStats useMemo → .toISOString() per item (100K)
allTimeAppStats useMemo → [...allLogs] copy + .toISOString()
StatsPage dailyUsage → Date format per log
StatsPage hourlyDistribution → inner while-loop per log
```

## Key Code Sections

### ═══ FREEZE POINT 1: IDE PAGE / AICITYSCAPE ═══

#### 1a. agentChartsData useMemo (IDEProjectsPage.tsx:1256-1327)
```typescript
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

    return activeAgents.map(agent => {
      const labels = lastDays.map(d => format(d, 'MMM dd'));
      let data = lastDays.map(d => getMetricValue(agent, format(d, 'yyyy-MM-dd')));
      // ... chart data construction
    });
}, [aiAgents, overview?.aiUsage?.byTool, aiPeriod, aiChartMode, tokenDisplayMode, logScale, excludeOutliers]);
```
**Issue:** `lastDays.map(d => format(d, 'yyyy-MM-dd'))` is called PER AGENT. With 10 agents × 365 days = 3650 format() calls. Each format() creates a Date object + string.

#### 1b. aiAgents useMemo (IDEProjectsPage.tsx:1191-1236)
```typescript
const aiAgents = useMemo((): AIAgent[] => {
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
        // ... more fields
      });
    }
    return agents;
}, [workspaceAnalytics?.aiUsage?.byTool, overview?.aiUsage?.byTool]);
```
**Issue:** Depends on `workspaceAnalytics?.aiUsage?.byTool` which changes when `fetchAnalytics` re-runs on period change. New array reference triggers AICityscape re-render.

#### 1c. fetchAnalytics (IDEProjectsPage.tsx:599-647)
```typescript
const effectivePeriod = activeTab === 'ai' ? aiPeriod : selectedPeriod;
// ... fetches analytics data
}, [selectedPeriod, dateOffset, aiPeriod, activeTab]);
```
**Issue:** Re-fetches ALL analytics when `aiPeriod` changes, even if backend returns the same data.

#### 1d. AICityscape mount (IDEProjectsPage.tsx:2671-2678)
```typescript
<AIUsageCityscape
  agents={aiAgents}
  overview={overview}
  metric={aiChartMode}
  tokenDisplayMode={tokenDisplayMode}
  loading={loading}
  period={aiPeriod}
/>
```
**Issue:** Receives `aiAgents` (new array reference on period change) → triggers full Three.js canvas re-render.

#### 1e. AICityscape heroes useMemo (AICityscape.tsx:47-63)
```typescript
const heroes = useMemo(() => {
    if (!agents?.length) return [];
    const rows: ByToolRow[] = agents
      .filter((a) => a.status !== "inactive" && a.tokens > 0)
      .map((a) => ({
        id: a.id,
        label: a.name,
        tokens: a.tokens,
        sessions: a.sessions,
        cost: a.cost,
        active: a.status === "active",
        lastActiveMsAgo: a.lastUsed
          ? Date.now() - new Date(a.lastUsed).getTime()
          : undefined,
      }));
    return toHeroes(rows);
}, [agents]);
```
**Issue:** Depends on `agents` prop. When `aiAgents` changes reference (even if data is the same), `heroes` recomputes, triggering Three.js re-render.

### ═══ FREEZE POINT 2: SOLAR SYSTEM ═══

#### 2a. Backend: getLogs (main.ts:3286-3310)
```typescript
function getLogs(limit?: number): any[] {
    if (useJson) {
        return limit ? jsonLogs.slice(0, limit) : jsonLogs;
    }
    try {
        if (limit) {
            const safeLimit = Math.min(Math.max(1, Math.floor(Number(limit)) || 1), 20000);
            const stmt = db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT ?');
            return stmt.all(safeLimit);
        }
        const stmt = db.prepare("SELECT * FROM logs ORDER BY id DESC LIMIT 100000");
        return stmt.all();
    } catch (err) { return []; }
}
```
**Issue:** No period filter at DB level. Returns ALL logs.

#### 2b. OrbitSystem: computePlanets (OrbitSystem.tsx:702-763)
```typescript
function computePlanets(logs, appColors, categoryOverrides) {
    const validLogs = (logs || []).filter(log => log && log.app && !log.is_browser_tracking);
    const grouped: Record<string, any[]> = {};
    for (const log of validLogs) {
        grouped[appName] = grouped[appName] || [];
        grouped[appName].push(log);
    }
    const sortedApps = Object.entries(grouped)
        .filter(([, a]) => a.reduce(...) >= MIN_PLANET_TIME_SECONDS)
        .slice(-MAX_RENDERED_PLANETS);
}
```
**Issue:** Input is all filteredLogs (100K when 'all'). O(N) grouping.

### ═══ FREEZE POINT 3: DASHBOARD/STATS ═══

#### 3a. Frontend: filteredLogs (App.tsx:299-302)
```typescript
const filteredLogs = useMemo(() => {
    const range = getDateRange(selectedPeriod, dateOffset);
    return allLogs.filter(log => log.timestamp >= range.start && log.timestamp < range.end);
}, [allLogs, selectedPeriod, dateOffset]);
```
**Issue:** When period='all', every log passes. `.filter()` creates NEW 100K array.

#### 3b. Frontend: setLogs cascade (App.tsx:306-312)
```typescript
useEffect(() => {
    const fp = filteredLogs.length + '|' + (filteredLogs[0]?.timestamp || '');
    if (fp !== prevFilteredFingerprint.current) {
        prevFilteredFingerprint.current = fp;
        setLogs(filteredLogs);
    }
}, [filteredLogs]);
```
**Issue:** Triggers `setLogs()` → re-renders ALL children.

#### 3c. Frontend: appStats (App.tsx:968-997)
```typescript
const appStats = useMemo(() => {
    const grouped = {};
    for (const log of filteredLogs) {
        if (!grouped[app]) {
            grouped[app] = { first_seen: log.timestamp.toISOString(), ... };
        }
        if (log.timestamp.toISOString() < grouped[app].first_seen) grouped[app].first_seen = log.timestamp.toISOString();
        if (log.timestamp.toISOString() > grouped[app].last_seen) grouped[app].last_seen = log.timestamp.toISOString();
    }
}, [filteredLogs, categoryOverrides]);
```
**Issue:** `.toISOString()` 2-3x per log item. 100K logs = 200K-300K Date creations.

#### 3d. Frontend: allTimeAppStats (App.tsx:1000-1033)
```typescript
const allTimeAppStats = useMemo(() => {
    const appLogs = [...allLogs];  // COPIES 100K array!
    // ... same O(N) grouping with .toISOString() per item
}, [allLogs, categoryOverrides]);
```
**Issue:** `[...allLogs]` creates 100K array copy.

#### 3e. StatsPage: dailyUsage for 'all' (StatsPage.tsx:299-310)
```typescript
const monthMap = {};
(filteredLogs as any[]).forEach(log => {
    const key = format(new Date(log.timestamp), 'yyyy-MM');
    monthMap[key].total += log.duration || 0;
});
```
**Issue:** `new Date()` + `format()` per log item.

#### 3f. StatsPage: hourlyDistribution (StatsPage.tsx:321-341)
```typescript
for (const log of (filteredLogs as any[])) {
    const sessionStart = new Date(log.timestamp).getTime();
    let currentMs = sessionStart;
    while (currentMs < sessionEnd) {
        // split across hour boundaries
        currentMs = hourEnd;
    }
}
```
**Issue:** Inner while-loop per log. Long sessions = multiple iterations.

#### 3g. dateRange.ts: getDateRange for 'all'
```typescript
return {
    start: new Date(0),
    end: new Date(8640000000000000),
    label: 'All Time',
};
```
**Issue:** Every log passes — no actual filtering.

## Performance Budget
- Target: switching to "all time" should complete in < 500ms
- Current: likely 5-15 seconds
- **PRIMARY TARGET:** AICityscape on IDE page must not freeze
- OrbitSystem caps at 80 planets — rendering is fine, data processing is bottleneck
- Dashboard/Stats: 100K items × multiple O(N) passes = freeze

## Dependencies
- `date-fns` `format()`, `eachDayOfInterval`, `subDays` used in IDE page + StatsPage
- `@react-three/fiber` Canvas re-renders on ANY props change
- `lazy()` import for AICityscape — first load is already deferred
- No worker threads available (Electron main + renderer)
