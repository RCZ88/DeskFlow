# CONTEXT_BUNDLE — IDEProjectsPage AI Tab Time Period Fix

**File:** `agent/docs/ai-tab-time-period-fix/CONTEXT_BUNDLE.md`
**Purpose:** Self-contained codebase context for Architect AI to design a fix.

---

## 1. Primary File: `src/pages/IDEProjectsPage.tsx`

### 1a. State Definitions (lines 388-412)

```tsx
const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
const [aiChartMode, setAiChartMode] = useState<'tokens' | 'messages' | 'cost' | 'sessions'>('tokens');
const [tokenDisplayMode, setTokenDisplayMode] = useState<'combined' | 'input' | 'output'>('combined');
// All Time lock — persisted in localStorage
const [timeLock, setTimeLock] = useState(() => {
    try { return localStorage.getItem('ide-projects-ai-lock') === 'true'; } catch { return false; }
});
const [selectedAgentDetail, setSelectedAgentDetail] = useState<AIAgent | null>(null);
const [compareAgents, setCompareAgents] = useState<string[]>([]);
const [logScale, setLogScale] = useState(() => localStorage.getItem('ide-projects-log-scale') === 'true');
const [excludeOutliers, setExcludeOutliers] = useState(() => localStorage.getItem('ide-projects-exclude-outliers') === 'true');
const [viewMode, setViewMode] = useState<'provider' | 'model'>('provider');

// Maps selectedPeriod prop + timeLock → 'week' | 'month' | 'all'
const effectiveAiPeriod = useMemo<'week' | 'month' | 'all'>(() => {
    if (timeLock) return 'all';
    switch (selectedPeriod) {
        case 'all': return 'all';
        case 'month':
        case '30day': return 'month';
        default: return 'week';  // 'today', 'week', '7day' all map to 'week'
    }
}, [selectedPeriod, timeLock]);
```

### 1b. Props Received by Component

```tsx
interface IDEProjectsPageProps {
    selectedPeriod: string;  // 'today' | 'week' | '7day' | 'month' | '30day' | 'all' — from parent page state
    dateOffset: number;       // always 0 currently
    activeTab: string;        // 'ai' | 'projects' | 'analytics' | 'git'
    // ...
}
```

### 1c. useEffect that Triggers Data Fetch (lines 576-583)

```tsx
useEffect(() => {
    localStorage.setItem('ide-projects-onboarding-seen', 'true');
    const p = activeTab === 'ai' ? effectiveAiPeriod : selectedPeriod;
    loadOverview(p, dateOffset);
    window.deskflowAPI?.getAISyncStatus().then(status => {
        if (status?.lastRunAt) setAiLastSyncAt(status.lastRunAt);
    }).catch(() => {});
}, [selectedPeriod, dateOffset, activeTab, effectiveAiPeriod]);
```

### 1d. loadOverview Function (lines 723-739)

```tsx
const loadOverview = async (period?: string, offset?: number) => {
    setLoading(true);
    try {
        const effectivePeriod = period ?? (activeTab === 'ai' ? effectiveAiPeriod : selectedPeriod);
        const effectiveOffset = offset ?? dateOffset;
        const data = await window.deskflowAPI!.getIDEProjectsOverview(effectivePeriod, effectiveOffset);
        setOverview(data);
        setLoading(false);
    } catch (err) {
        console.error('[IDEProjectsPage] Failed to load IDE projects overview:', err);
        setLoading(false);
    }
};
```

### 1e. fetchAnalytics Function (lines 619-673)

```tsx
const fetchAnalytics = useCallback(async () => {
    if (!window.deskflowAPI) return;
    const reqId = ++analyticsReqIdRef.current;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
        const effectivePeriod = activeTab === 'ai' ? effectiveAiPeriod : selectedPeriod;
        const effectiveOffset = dateOffset;
        const [aiUsageSummary, problems, requests, sessions, promptHistory] = await Promise.all([
            window.deskflowAPI.getAIUsageSummary(effectivePeriod, effectiveOffset).catch(err => { ... return null; }),
            // ...
        ]);
        setTimeout(() => {
            if (reqId !== analyticsReqIdRef.current) return;
            const data = { aiUsage: aiUsageSummary || null, ... };
            analyticsCacheRef.current = { data, timestamp: Date.now() };
            setWorkspaceAnalytics(data);
            setAnalyticsLoading(false);
        }, 100);
    } catch (err) { ... }
}, [selectedPeriod, dateOffset, effectiveAiPeriod, activeTab]);

useEffect(() => {
    if ((activeTab !== 'analytics' && activeTab !== 'ai') || !window.deskflowAPI) return;
    analyticsCacheRef.current = null;
    fetchAnalytics();
}, [activeTab, selectedPeriod, dateOffset, effectiveAiPeriod, fetchAnalytics]);
```

### 1f. agentChartsData useMemo — Main Chart (lines 1330-1420)

```tsx
const agentChartsData = useMemo(() => {
    const daysMap: Record<string, number> = { 'week': 7, 'month': 30, 'all': 365 };
    const numDays = effectiveAiPeriod === 'all'
        ? (() => {
            const byTool = overview?.aiUsage?.byTool || {};
            let minDate = Infinity, maxDate = -Infinity;
            for (const tool of Object.values(byTool) as any[]) {
                const daily = tool?.daily;
                if (!daily) continue;
                for (const d of Object.keys(daily)) {
                    const t = new Date(d).getTime();
                    if (!isNaN(t)) { if (t < minDate) minDate = t; if (t > maxDate) maxDate = t; }
                }
            }
            if (maxDate > 0 && minDate < Infinity)
                return Math.min(180, Math.max(1, Math.ceil((maxDate - minDate) / 86400000) + 30));
            return 60;
        })()
        : (daysMap[effectiveAiPeriod] || 7);
    // ... builds chart datasets for each agent ...
}, [displayedAgents, overview?.aiUsage?.byTool, effectiveAiPeriod, aiChartMode, tokenDisplayMode, logScale, excludeOutliers, viewMode]);
```

### 1g. Lock Button in Controls Bar (lines 2756-2768)

```tsx
{/* All Time Lock Toggle */}
<button
    onClick={() => setTimeLock(!timeLock)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        timeLock
            ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
            : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
    }`}
    title={timeLock ? 'Unlock timeframe (use nav)' : 'Lock to All Time'}
>
    {timeLock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
    <span>{timeLock ? 'All Time' : 'Lock All'}</span>
</button>
```

### 1h. Provider Detail Modal — Full Structure (lines 4168-4745)

**Modal header + period label (lines 4168-4235):**
```tsx
{selectedAgentDetail && (
    <motion.div ... className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 ...">
        <motion.div ... className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-4xl w-full max-h-[85vh] overflow-y-auto">
            {/* Header: agent name + close button — NO period controls */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">...</div>
                <button onClick={() => setSelectedAgentDetail(null)}>...</button>
            </div>

            {/* Top Metrics — period-aware (lines 4201-4295) */}
            {(() => {
                const daysMap: Record<string, number> = { 'week': 7, 'month': 30, 'all': 9999 };
                const numDays = daysMap[effectiveAiPeriod] || 7;
                const cutoff = numDays >= 9999 ? null : subDays(new Date(), numDays - 1);
                const daily = overview?.aiUsage?.byTool?.[selectedAgentDetail.id]?.daily || {};
                // ... iterates over all daily entries, filtered by cutoff ...
                // Period label (line 4228):
                const periodLabel = timeLock ? 'All Time' : selectedPeriod === 'today' ? 'Today' : /* ... */ 'All Time';
                // Renders: 6-column metric grid (tokens, input, output, ratio, input%, output%)
                // + 4-column sub-metrics (messages, cost, sessions, tokens/msg)
                // + FreeUsageStats component
            })()}
```

**Key issue: `'all': 9999` at line 4203 has NO cap — iterates all daily records.**

**Daily Usage chart (lines 4298-4525):**
```tsx
<div className="bg-zinc-800/50 rounded-xl p-4 lg:col-span-2">
    <h4 className="text-sm font-medium text-zinc-400">Daily Usage</h4>
    {/* Chart mode buttons: tokens / messages / sessions / cost */}
    <div className="h-48">
        {(() => {
            let numDays = effectiveAiPeriod === 'week' ? 7 : effectiveAiPeriod === 'month' ? 30 : 7;
            if (effectiveAiPeriod === 'all') {
                const allDaily = overview?.aiUsage?.byTool?.[selectedAgentDetail.id]?.daily || {};
                const dateStrs = Object.keys(allDaily);
                if (dateStrs.length > 0) {
                    const sorted = dateStrs.sort();
                    const span = Math.ceil((new Date(sorted[sorted.length-1]).getTime() - new Date(sorted[0]).getTime()) / 86400000) + 30;
                    numDays = Math.min(180, Math.max(span, 60));  // <-- properly capped at 180
                } else { numDays = 60; }
            }
            // ... renders Bar chart with periodDays[]
        })()}
    </div>
</div>
```

**Model Usage Timeline (lines 4528-4631) — same 180 cap pattern:**
```tsx
{(() => {
    const modelDaily = overview?.aiUsage?.byTool?.[selectedAgentDetail.id]?.modelDaily || {};
    const modelNames = Object.keys(modelDaily);
    if (modelNames.length <= 1) return null;
    let numDays = effectiveAiPeriod === 'week' ? 7 : effectiveAiPeriod === 'month' ? 30 : 7;
    if (effectiveAiPeriod === 'all') {
        // same 180 cap pattern as Daily Usage
        numDays = Math.min(180, Math.max(span, 60));
    }
    // ... renders stacked Bar chart with model colors ...
})()}
```

**Model Breakdown (lines 4655-4705):**
```tsx
{(() => {
    const daysMap: Record<string, number> = { 'week': 7, 'month': 30, 'all': 9999 };
    const numDays = daysMap[effectiveAiPeriod] || 7;
    const cutoff = numDays >= 9999 ? null : subDays(new Date(), numDays - 1);
    // ... iterates over modelDaily × dayRecords, filtered by cutoff ...
    // Period Label:
    const periodLabel = timeLock ? 'All Time' : selectedPeriod === 'today' ? 'Today' : /* ... */ 'All Time';
})()}
```

**Key issue: `'all': 9999` at line 4657 has NO cap.**

---

## 2. IPC / Preload Bridge

### 2a. `src/preload.ts` (line 275)

```ts
getIDEProjectsOverview: (period?: string, dateOffset?: number) =>
    ipcRenderer.invoke('get-ide-projects-overview', period, dateOffset),
```

### 2b. `src/preload.ts` (line 271)

```ts
getAIUsageSummary: (period?: string, dateOffset?: number, projectId?: string) =>
    ipcRenderer.invoke('get-ai-usage-summary', period, dateOffset, projectId),
```

---

## 3. Backend Handlers (`src/main.ts`)

### 3a. `get-ide-projects-overview` (lines 8348-8572)

```ts
ipcMain.handle('get-ide-projects-overview', (event, period?: string, dateOffset = 0) => {
    // Date filter logic (lines 8364-8383):
    let dateFilterSQL = '';
    let dateFilterParam: string | null = null;
    if (period && period !== 'all') {
        const now = new Date();
        let sinceDate: Date | null = null;
        if (period === 'today' || period === 'day') {
            sinceDate = new Date(now); sinceDate.setDate(sinceDate.getDate() - dateOffset);
        } else if (period === 'week' || period === '7day') {
            sinceDate = new Date(now.getTime() - (7 + dateOffset * 7) * 24 * 60 * 60 * 1000);
        } else if (period === 'month' || period === '30day') {
            sinceDate = new Date(now.getTime() - (30 + dateOffset * 30) * 24 * 60 * 60 * 1000);
        }
        if (sinceDate) {
            dateFilterSQL = 'WHERE date >= ?';
            dateFilterParam = sinceDate.toISOString().split('T')[0];
        }
    }
    // When period='all', NO date filter — returns ALL data.
    // Queries: aiUsage (aggregate per tool), aiUsageDaily (daily per tool),
    //          aiUsageProjects (project per tool), aiUsageModels (model per tool),
    //          aiUsageModelDaily (model+date per tool)
    // Returns: { ides, tools, projects, aiUsage: { totalTokens, totalCost, totalMessages, byTool }, commits }
});
```

### 3b. `get-ai-usage-summary` (lines 8184-8254)

```ts
ipcMain.handle('get-ai-usage-summary', (event, period = 'week', dateOffset = 0, projectId) => {
    // period='today'/'week'/'7day'/'month'/'30day' → filters by date
    // period='all' or any other value → no date filter (all data)
    // Returns: { totalTokens, totalCost, byTool, period }
});
```

---

## 4. Design Tokens & UI Patterns

```css
/* Colors */
--bg-primary: #09090b (zinc-950)
--bg-card: rgba(24, 24, 27, 0.5) = zinc-800/50
--bg-overlay: rgba(0, 0, 0, 0.7) + backdrop-blur-sm
--border: #3f3f46 (zinc-700)
--accent-primary: #8b5cf6 (violet-500)
--accent-active: #6366f1 (indigo-500)
--text-primary: #fff
--text-secondary: #a1a1aa (zinc-400)
--text-muted: #71717a (zinc-500)

/* Components */
.glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); }
.GlassCard { background: rgba(24,24,27,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; }
button.bg-zinc-800/50 { border-radius: 8px; padding: 4px 8px; font-size: 10px; }

/* Typography */
h3: text-lg font-semibold text-white
h4: text-sm font-medium text-zinc-400
body: text-xs text-zinc-400
tabular-nums: for numbers
TokenValue, CostValue: custom components for formatted display
```

---

## 5. Data Flow Summary

```
Parent page updates selectedPeriod prop (e.g., '7day' → 'all')
    ↓
re-renders IDEProjectsPage
    ↓
effectiveAiPeriod recomputes (accounts for timeLock)
    ↓
useEffect [effectiveAiPeriod] fires
    ↓
loadOverview(effectiveAiPeriod, dateOffset)
    → IPC getIDEProjectsOverview(period, dateOffset)
    → backend filters by date (or returns all if period='all')
    → setOverview(data)
    ↓
Re-render with new overview data
    → agentChartsData useMemo re-runs (180 cap)
    → All IIFEs in JSX re-run
      • Top metrics (9999 BUG — no cap)
      • Daily Usage chart (180 cap)
      • Model Usage Timeline (180 cap)
      • Model Breakdown (9999 BUG — no cap)
```

---

## 6. Key Problems to Fix

1. **No period controls in the provider detail modal** — the modal (lines 4168-4745) uses global `effectiveAiPeriod` with no way for the user to change it within the modal
2. **Lock button hard to find** — it's a small button in a row of chart config toggles (line 2756)
3. **Two locations use `'all': 9999`** — lines 4203 and 4657 have NO cap, meaning switching to "All Time" in the modal iterates every single day record synchronously during render
4. **Data may not visually update** when `timeLock` toggles because the IIFE-heavy rendering causes visible freezes and the loading state isn't communicated
5. **No dedicated loading/empty/error state** in the modal — it renders whatever `overview` contains without signaling transitions

---

*End of CONTEXT_BUNDLE.md*
