# CONTEXT BUNDLE — IDE Analytics Overhaul + DeskFlow VS Code Activity Extension

> **For the Specialist AI (external). You have NO access to this codebase — every relevant
> file, schema, handler and pattern you need is embedded below, VERBATIM. If you need more
> code, say `REQUEST: <exact file path>` and the Project Owner will paste it.
>
> Package version: 1.0 | Date: 2026-08-07 | Project Owner: opencode (Hands & Eyes)

---

## 1. Project Overview

**App Tracker (aka "DeskFlow")** — an Electron + React + TypeScript desktop productivity
tracker for Windows. It tracks active window/app time, browser activity (via a Chrome MV3
extension), AI tool usage (tokens/cost from Claude/Cursor/etc.), Git commits, and hosts a
terminal workspace with agent sessions, problems/requests boards, and finance tracking.

- **Renderer:** React 18 + TypeScript + Vite (`src/`), TailwindCSS (dark zinc theme), framer-motion, Chart.js (`chart.js` + `react-chartjs-2`), lucide-react icons, date-fns.
- **Main process:** Electron + better-sqlite3 (`src/main.ts`, ~29,800 lines, compiled via Vite lib build to `dist-electron/main.cjs`).
- **Preload bridge:** `src/preload.ts` → `window.deskflowAPI` (contextIsolation ON, nodeIntegration OFF).
- **DB:** SQLite at `%APPDATA%\RHEO\deskflow-data.db` (NOTE: LIVE data lives under RHEO, not DeskFlow). Agent-side DB access is STRICTLY READ-ONLY.
- **Build:** `npx vite build` (renderer) → esbuild preload → `node scripts/rebuild-main.mjs` (main). Full pipeline documented in AGENTS.md §8.

### Files that matter for this feature

| File | Role |
|---|---|
| `src/pages/IDEProjectsPage.tsx` (4356 lines) | Route `/ide`. 6 tabs: overview / environment / ai / git / analytics / backup |
| `src/components/AnalyticsDashboard.tsx` (810 lines) | The analytics charts component rendered inside the Analytics tab (and reused project/workspace variants) |
| `src/main.ts` | DB schema (`commits`, `ai_attribution`, `dora_metrics`), IPC handlers (`get-ide-projects-overview`, `get-code-change-stats`, `sync-commits`, ...), local HTTP capture server on port 54321 |
| `src/preload.ts` | Exposes `window.deskflowAPI.*` methods (context-bridged IPC) |
| `browser-extension/` | Chrome MV3 extension — THE PATTERN the new VS Code extension must mirror (manifest, background.js, health check, POST payloads) |
| `src/index.css` | Design tokens (colors, fonts, glass utilities) |

---

## 2. The Feature (what the user asked for)

**User's request (paraphrased, intent preserved):**
> The IDE Projects page (`/ide`) is ugly: the Overview tab is a useless wall of
> navigate-away cards, and the analytics charts need a full overhaul with one consistent
> style. Also, the code stats don't actually work — I want to see real line/file change
> data per project, not empty charts. I want a **DeskFlow VS Code extension** that captures
> code activity live (files opened, lines added/removed, time coding) and reports it to the
> app. And I want clear instructions on how to install/configure that extension.

**Confirmed scope (user answered 3 questions):**
1. Scope: YES — fix ugly IDE overview + analytics charts AND make code stats show line/file changes AND add the VS Code extension.
2. Data source: **Option B — VS Code extension ONLY.** Live activity reporting from the extension. Do NOT extend the git-sync pipeline for retroactive file-level history.
3. Redesign scope: **The WHOLE analytics experience** — Overview tab + full Analytics tab, all charts re-skinned, one consistent style.

**Deferred / OUT of scope:** changing `sync-commits` behavior; per-file history backfill from git; other IDE integrations (Cursor is treated as "AI tool" today, not the code-activity source).

---

## 3. Architecture & Conventions (must follow)

### IPC pattern (the ONE canonical flow)
```
Renderer (IDEProjectsPage) → window.deskflowAPI.foo(...) [preload.ts]
  → ipcRenderer.invoke('foo', ...) → ipcMain.handle('foo', ...) in src/main.ts
  → SQLite (better-sqlite3, db.prepare(...).all/get/run)
  → return plain JSON → preload resolves → renderer state
```
- Preload methods: arrow-function properties on the `deskflowAPI` object, one line each, `ipcRenderer.invoke('channel-name', args...)`. Channels are kebab-case strings.
- Main handlers: `ipcMain.handle('channel-name', (event, ...args) => { ... })`, wrapped in try/catch returning `{ success, ...data }` or raw data; `useJson` flag (legacy JSON mode) returns empty stubs.
- Renderer state: plain `useState` + `useEffect` fetch, refs for dedup/cache. No Redux — zustand exists for some features but IDE page uses local state.

### DB access pattern
```ts
const rows = db.prepare('SELECT ... WHERE x = ? GROUP BY y').all(...params);
const row  = db.prepare('SELECT ...').get(...params);
db.prepare('INSERT OR REPLACE INTO ... VALUES (?, ...)').run(...params);
```
Tables are created idempotently with `CREATE TABLE IF NOT EXISTS` inside the migration block (around main.ts:2150+).

### Local capture server pattern (the model for the VS Code extension)
- `main.ts` starts an HTTP server on `browserServerPort = 54321` bound to 127.0.0.1.
- Endpoints today: `POST /browser-data` (extension payload), `GET /health` (health check, 3s timeout).
- Browser extension declares `host_permissions: ["http://localhost:54321/*", "http://127.0.0.1:54321/*"]`, pings `/health` before sending, silently retries when app is down.
- **The VS Code extension should follow this exact pattern** (new endpoints like `POST /code-activity` on the same server, or a proposal in RESULT.md for a cleaner approach — Specialist decides; if you choose new endpoints you must specify exact route names, payload shape, and validation).

---

## 4. Verbatim Source

### 4.1 DB schema — commits, ai_attribution, dora_metrics (src/main.ts:2151-2197)

```ts
        // Commit metrics
        db.exec(`
      CREATE TABLE IF NOT EXISTS commits (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        sha TEXT NOT NULL,
        author TEXT,
        author_email TEXT,
        date DATETIME NOT NULL,
        message TEXT,
        additions INTEGER DEFAULT 0,
        deletions INTEGER DEFAULT 0,
        files_changed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        db.exec('CREATE INDEX IF NOT EXISTS idx_commits_project ON commits(project_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(date)');

        // AI attribution for commits
        db.exec(`
      CREATE TABLE IF NOT EXISTS ai_attribution (
        commit_id TEXT PRIMARY KEY REFERENCES commits(id),
        tool TEXT,
        lines_ai_added INTEGER DEFAULT 0,
        lines_ai_deleted INTEGER DEFAULT 0,
        lines_human_added INTEGER DEFAULT 0
      )
    `);

        // DORA metrics
        db.exec(`
      CREATE TABLE IF NOT EXISTS dora_metrics (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        period TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        deployment_frequency REAL,
        lead_time_hours REAL,
        change_failure_rate REAL,
        mean_time_to_recovery_hours REAL,
        level TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        db.exec('CREATE INDEX IF NOT EXISTS idx_dora_project ON dora_metrics(project_id)');
```

> ⚠️ **CRITICAL DATA FACT:** the `commits` table stores ONLY per-commit AGGREGATES
> (additions/deletions/files_changed counts). There is NO per-file table today.
> `sync-commits` (4.3) parses `git show --numstat` per file but DISCARDS the per-file rows,
> keeping only totals. So "top files changed", "per-file lines", "added files list" are
> IMPOSSIBLE with current data → they must come from the new VS Code extension's live
> capture (new table(s) you propose in RESULT.md, e.g. `code_activity` / `file_changes`).

### 4.2 IPC handler — get-ide-projects-overview (src/main.ts:10319-10544, excerpt)

```ts
// Get IDE Projects overview for dashboard
electron_1.ipcMain.handle('get-ide-projects-overview', (event, period?: string, dateOffset = 0) => {
    if (useJson) {
        return {
            ides: [], tools: [], projects: [],
            aiUsage: { totalTokens: 0, totalCost: 0, totalMessages: 0, byTool: {} },
            commits: { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 }
        };
    }

    try {
        const ides = db.prepare('SELECT * FROM ides ORDER BY name').all();
        const tools = db.prepare('SELECT * FROM tools ORDER BY category, name').all();
        const projects = db.prepare('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY last_activity_at DESC').all();

        // Compute date filter for AI usage queries
        let dateFilterSQL = '';
        let dateFilterParam: string | null = null;
        if (period && period !== 'all') {
            const now = new Date();
            let sinceDate: Date | null = null;
        if (period === 'today' || period === 'day') {
                const d = new Date(now);
                d.setDate(d.getDate() - dateOffset);
                sinceDate = d;
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

        const aiUsage = db.prepare(`
            SELECT tool,
                   SUM(input_tokens) as tokens_in,
                   SUM(output_tokens) as tokens_out,
                   SUM(input_tokens + output_tokens) as tokens,
                   SUM(cost_usd) as cost,
                   COUNT(*) as session_count,
                   SUM(message_count) as messageCount,
                   MAX(date) as lastUsed,
                   GROUP_CONCAT(DISTINCT model) as models
            FROM ai_usage
            ${dateFilterSQL}
            GROUP BY tool
        `).all(...(dateFilterParam ? [dateFilterParam] : []));
        const commits = db.prepare(`
            SELECT COUNT(*) as count, SUM(additions) as additions, SUM(deletions) as deletions
            FROM commits
            ${dateFilterSQL}
        `).get(...(dateFilterParam ? [dateFilterParam] : []));

        // Daily breakdown per tool for charts (real message_count)
        const aiUsageDaily = db.prepare(`
            SELECT tool, date,
                   SUM(input_tokens) as tokens_in,
                   SUM(output_tokens) as tokens_out,
                   SUM(input_tokens + output_tokens) as tokens,
                   SUM(cost_usd) as cost,
                   COUNT(*) as session_count,
                   SUM(message_count) as messageCount
            FROM ai_usage
            ${dateFilterSQL}
            GROUP BY tool, date
            ORDER BY date DESC
        `).all(...(dateFilterParam ? [dateFilterParam] : []));

        // Project breakdown per tool
        const aiUsageProjects = db.prepare(`
            SELECT tool, project_path, ... FROM ai_usage
            WHERE project_path IS NOT NULL AND project_path != ''
            ${dateFilterSQL ? 'AND date >= ?' : ''}
            GROUP BY tool, project_path ORDER BY tokens DESC
        `).all(...(dateFilterParam ? [dateFilterParam] : []));

        // Model breakdown per tool + daily model breakdown (truncated here for brevity)
        // ... aiUsageModels, aiUsageModelDaily similar patterns

        // (handler continues — builds nested byTool object: per-tool { tokens, cost, sessions, messageCount, models, daily: {date: {...}}, projects: [...] }, then returns)
        // return { ides, tools, projects, aiUsage, commits };
    } catch (err) { ... }
});
```

### 4.3 IPC handler — get-code-change-stats (src/main.ts:10546-10619, verbatim)

```ts
// Get code change stats (commits/additions/deletions/hours) for a period
electron_1.ipcMain.handle('get-code-change-stats', (event, period = 'week', dateOffset = 0, projectId) => {
    if (useJson) return { totalCommits: 0, totalAdditions: 0, totalDeletions: 0, totalHours: 0, daily: [], weekly: [] };

    try {
        const now = new Date();
        let sinceDateStr: string | null = null;

        if (period === 'today' || period === 'day') {
            const d = new Date(now);
            d.setDate(d.getDate() - dateOffset);
            sinceDateStr = d.toISOString().split('T')[0];
        } else if (period === 'week' || period === '7day') {
            sinceDateStr = new Date(now.getTime() - (7 + dateOffset * 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        } else if (period === 'month' || period === '30day') {
            sinceDateStr = new Date(now.getTime() - (30 + dateOffset * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        } // 'all' → null → no date filter (full history)

        const conditions: string[] = [];
        const params: any[] = [];
        if (sinceDateStr) conditions.push('date >= ?');
        if (projectId) conditions.push('project_id = ?');
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        if (sinceDateStr) params.push(sinceDateStr);
        if (projectId) params.push(projectId);

        const daily = db.prepare(`
            SELECT date, SUM(additions) as additions, SUM(deletions) as deletions, COUNT(*) as commits
            FROM commits ${whereClause} GROUP BY date ORDER BY date ASC
        `).all(...params) as any[];

        const totals = db.prepare(`
            SELECT COUNT(*) as totalCommits, SUM(additions) as totalAdditions, SUM(deletions) as totalDeletions
            FROM commits ${whereClause}
        `).get(...params) as any;

        // Hours derivation: 2h base per active day + 1h per commit, capped at 8h/day
        let totalHours = 0;
        for (const day of daily) {
            if ((day.commits || 0) > 0) totalHours += Math.min(2 + (day.commits || 0), 8);
        }

        // Weekly aggregates (Monday-start weeks, ISO-like)
        const weeklyMap = new Map<string, { additions: number; deletions: number; commits: number }>();
        for (const day of daily) {
            const d = new Date(day.date + 'T00:00:00');
            if (isNaN(d.getTime())) continue;
            const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - dayOfWeek);
            const weekKey = weekStart.toISOString().split('T')[0];
            const entry = weeklyMap.get(weekKey) || { additions: 0, deletions: 0, commits: 0 };
            entry.additions += day.additions || 0;
            entry.deletions += day.deletions || 0;
            entry.commits += day.commits || 0;
            weeklyMap.set(weekKey, entry);
        }
        const weekly = Array.from(weeklyMap.entries())
            .map(([weekStart, data]) => ({ weekStart, ...data }))
            .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

        return {
            totalCommits: totals?.totalCommits || 0,
            totalAdditions: totals?.totalAdditions || 0,
            totalDeletions: totals?.totalDeletions || 0,
            totalHours,
            daily,
            weekly
        };
    } catch (err) {
        console.error('[DeskFlow] Code change stats error:', err);
        return { totalCommits: 0, totalAdditions: 0, totalDeletions: 0, totalHours: 0, daily: [], weekly: [] };
    }
});
```

### 4.4 IPC handler — sync-commits (src/main.ts:14550-14624, verbatim)

```ts
// Sync commits from a local Git repository
electron_1.ipcMain.handle('sync-commits', async (event, projectId: string, repoPath: string) => {
    if (useJson) return { success: false, message: 'Commit sync requires SQLite' };

    const results = { commits: 0, errors: [] as string[] };

    try {
        const { execSync, execFileSync } = require('child_process');

        // Get commit log from git
        let gitOutput: string;
        try {
            gitOutput = execSync(`git log --format="%H|%an|%ae|%ai|%s" -n 500`, {
                cwd: repoPath,
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024
            });
        } catch (gitErr: any) {
            return { success: false, message: `Not a git repository or no commits: ${gitErr.message}` };
        }

        const lines = gitOutput.trim().split('\n').filter(Boolean);

        for (const line of lines) {
            const [sha, author, authorEmail, date, message] = line.split('|');

            // Get diff stats for this commit
            let additions = 0;
            let deletions = 0;
            let filesChanged = 0;

            try {
                const statsOutput = execFileSync('git', ['show', '--numstat', '--format=', sha], {
                    cwd: repoPath,
                    encoding: 'utf8'
                });

                const statLines = statsOutput.trim().split('\n').filter(Boolean);
                filesChanged = statLines.length;

                for (const statLine of statLines) {
                    const parts = statLine.trim().split('\t');
                    if (parts.length >= 3) {
                        const add = parseInt(parts[0], 10);
                        const del = parseInt(parts[1], 10);
                        if (!isNaN(add)) additions += add;
                        if (!isNaN(del)) deletions += del;
                    }
                }
            } catch {}

            const id = `commit-${sha}`;
            const commitDate = new Date(date).toISOString();

            try {
                db!.prepare(`
                    INSERT OR REPLACE INTO commits (id, project_id, sha, author, author_email, date, message, additions, deletions, files_changed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, projectId, sha, author, authorEmail, commitDate, message, additions, deletions, filesChanged);

                results.commits++;
            } catch (dbErr: any) {
                if (!dbErr.message.includes('UNIQUE constraint')) {
                    console.error('[DeskFlow] Commit DB error:', dbErr.message);
                }
            }
        }

        // Update project's last_activity_at
        db!.prepare(`UPDATE projects SET last_activity_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), projectId);

        console.log(`[DeskFlow] Synced ${results.commits} commits from ${repoPath}`);
        return { success: true, ...results };
    } catch (err: any) {
        // returns { success: false, message: err.message }
    }
});
```

### 4.5 Preload API surface (src/preload.ts:306-333, verbatim)

```ts
  // AI & Git Metrics
  getAIUsageSummary: (period?: string, dateOffset?: number, projectId?: string) => ipcRenderer.invoke('get-ai-usage-summary', period, dateOffset, projectId),
  getCommitStats: (projectId?: string, period?: 'week' | 'month') => ipcRenderer.invoke('get-commit-stats', projectId, period),

  // Dashboard Overview
  getIDEProjectsOverview: (period?: string, dateOffset?: number) => ipcRenderer.invoke('get-ide-projects-overview', period, dateOffset),
  getCodeChangeStats: (period?: string, dateOffset?: number, projectId?: string) => ipcRenderer.invoke('get-code-change-stats', period, dateOffset, projectId),

  // AI Usage Sync
  syncAIUsage: () => ipcRenderer.invoke('sync-ai-usage'),
  getAISyncStatus: () => ipcRenderer.invoke('get-ai-sync-status'),
  clearAISyncState: () => ipcRenderer.invoke('clear-ai-sync-state'),
  getAISessionsPaginated: (tool: string, limit?: number, offset?: number) => ipcRenderer.invoke('get-ai-sessions-paginated', tool, limit, offset),
  debugAIAgents: () => ipcRenderer.invoke('debug-ai-agents'),
  onAISyncProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ai-sync-progress', handler);
    return () => { ipcRenderer.removeListener('ai-sync-progress', handler); };
  },

  // Git & DORA Metrics
  syncCommits: (projectId: string, repoPath?: string) => ipcRenderer.invoke('sync-commits', projectId, repoPath),
  syncGitHubCommits: (projectId: string, owner: string, repo: string, token?: string) =>
    ipcRenderer.invoke('sync-github-commits', projectId, owner, repo, token),
  getDORAMetrics: (projectId: string, period?: 'week' | 'month') => ipcRenderer.invoke('get-dora-metrics', projectId, period),
  getCommitHistory: (projectId: string, limit?: number) => ipcRenderer.invoke('get-commit-history', projectId, limit),
  getContributorStats: (projectId: string) => ipcRenderer.invoke('get-contributor-stats', projectId),
  getGitDiff: (projectId: string, diffType?: 'cached' | 'working') => ipcRenderer.invoke('get-git-diff', projectId, diffType),
```

### 4.6 IDEProjectsPage.tsx — current Overview tab & Analytics tab (verbatim)

**State (src/pages/IDEProjectsPage.tsx:344-459, excerpt — the parts relevant to overview/analytics):**

```tsx
export default function IDEProjectsPage({ selectedPeriod = 'week', dateOffset = 0 }: IDEProjectsPageProps) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  ...
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const saved = localStorage.getItem('ide-projects-activeTab') || '';
    const resolved = (TAB_MIGRATION[saved] ?? saved) as TabKey;
    return TAB_KEYS.includes(resolved) ? resolved : 'overview';
  });
  const location = useLocation();
  useEffect(() => {
    const tab = (location.state as any)?.tab;
    if (tab) setActiveTab(tab);
  }, []);
  const commitHistoryRef = useRef<any[]>([]);
  const [commitHistory, setCommitHistory] = useState<any[]>([]);
  const [workspaceAnalytics, setWorkspaceAnalytics] = useState<{ aiUsage: any; sessions: any[]; problems: any[]; requests: any[]; promptHistory: any[]; codeStats: any } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const analyticsCacheRef = useRef<{ data: typeof workspaceAnalytics; timestamp: number } | null>(null);
  const analyticsReqIdRef = useRef(0);
  const [contributorStats, setContributorStats] = useState<any>(null);
  const [doraMetrics, setDoraMetrics] = useState<any>(null);
  const [syncingGit, setSyncingGit] = useState(false);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [gitDiff, setGitDiff] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [generatedCommitMsg, setGeneratedCommitMsg] = useState<string | null>(null);
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [aiChartMode, setAiChartMode] = useState<'tokens' | 'messages' | 'cost' | 'sessions'>('tokens');
  const [tokenDisplayMode, setTokenDisplayMode] = useState<'combined' | 'input' | 'output'>('combined');
  const [timeLock, setTimeLock] = useState(() => {
    try { return localStorage.getItem('ide-projects-ai-lock') === 'true'; } catch { return false; }
  });
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<AIAgent | null>(null);
  const [agentDebugInfo, setAgentDebugInfo] = useState<any>(null);
  const [logScale, setLogScale] = useState(() => localStorage.getItem('ide-projects-log-scale') === 'true');
  const [excludeOutliers, setExcludeOutliers] = useState(() => localStorage.getItem('ide-projects-exclude-outliers') === 'true');
  ...
```

**Data loaders (src/pages/IDEProjectsPage.tsx:720-776, verbatim):**

```tsx
  const loadGitData = async (projectId: string) => {
    try {
      const [commits, contributors, dora] = await Promise.all([
        window.deskflowAPI!.getCommitHistory(projectId, 50),
        window.deskflowAPI!.getContributorStats(projectId),
        window.deskflowAPI!.getDORAMetrics(projectId, 'month'),
      ]);
      setCommitHistory(commits);
      setContributorStats(contributors);
      setDoraMetrics(dora);
    } catch (err) {
      console.error('Failed to load git data:', err);
    }
  };

  const handleSyncGit = async () => {
    if (!selectedProject) return;
    setSyncingGit(true);
    try {
      const project = overview?.projects?.find((p: any) => p.id === selectedProject);
      if (project?.repository_url) {
        const urlParts = project.repository_url.replace('https://', '').split('/');
        const token = localStorage.getItem('github_token');
        await window.deskflowAPI!.syncGitHubCommits(
          selectedProject,
          urlParts[1],
          urlParts[2],
          token || undefined
        );
      } else {
        await window.deskflowAPI!.syncCommits(selectedProject, project?.path);
      }
      await loadGitData(selectedProject);
      await loadOverview();
    } catch (err) {
      console.error('Git sync failed:', err);
    }
    setSyncingGit(false);
  };

  const loadOverview = async (period?: string, offset?: number) => {
    setLoading(true);
    try {
      const effectivePeriod = period ?? (activeTab === 'ai' ? effectiveAiPeriod : selectedPeriod);
      const effectiveOffset = offset ?? dateOffset;

      console.log('[IDEProjectsPage] Loading overview for period:', effectivePeriod, 'offset:', effectiveOffset, 'activeTab:', activeTab);

      const data = await window.deskflowAPI!.getIDEProjectsOverview(effectivePeriod, effectiveOffset);
      console.log('[IDEProjectsPage] Overview loaded, projects:', data?.projects?.length);
      setOverview(data);
      setLoading(false);
    } catch (err) {
      console.error('[IDEProjectsPage] Failed to load IDE projects overview:', err);
      setLoading(false);
    }
  };
```

**Overview tab JSX (src/pages/IDEProjectsPage.tsx:1304-1336, verbatim — the "ugly" part):**

```tsx
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div data-section="ide.overview" className="space-y-6">
          {/* Metric Cards (clickable → navigate to tab) */}
          <div data-tutorial="ide.metrics" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Environment', value: (overview?.ides?.length || 0) + (overview?.tools?.length || 0), subValue: `${overview?.ides?.length || 0} IDEs · ${overview?.tools?.length || 0} tools`, icon: Boxes, color: '#3b82f6', bg: 'bg-blue-500/10', tab: 'environment' as TabKey },
              { label: 'AI Usage', value: <TokenValue value={overview?.aiUsage?.totalTokens || 0} />, subValue: <CostValue value={overview?.aiUsage?.totalCost || 0} />, icon: Sparkles, color: '#a855f7', bg: 'bg-violet-500/10', tab: 'ai' as TabKey },
              { label: 'Commits', value: overview?.commits?.totalCommits || 0, subValue: `+${overview?.commits?.totalAdditions || 0} / -${overview?.commits?.totalDeletions || 0}`, icon: GitCommit, color: '#f59e0b', bg: 'bg-amber-500/10', tab: 'git' as TabKey },
              { label: 'Last Backup', value: '—', subValue: 'Not configured', icon: Archive, color: '#10b981', bg: 'bg-emerald-500/10', tab: 'backup' as TabKey },
            ].map((stat, idx) => (
              <motion.button
                key={idx}
                onClick={() => setActiveTab(stat.tab)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5 text-left hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  <div className="text-xs text-zinc-500 font-medium">LIVE</div>
                </div>
                <div className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-sm text-zinc-400 mt-1">{stat.label}</div>
                {stat.subValue && <div className="text-xs text-zinc-500 mt-1">{stat.subValue}</div>}
              </motion.button>
            ))}
          </div>
```

(After the metric cards, the overview tab has an "AI & Projects Row" — a 2-col grid with an "AI Tool Usage" stacked bar chart card (Chart.js `<Bar>`, 30-day tokens per agent, log-scale toggle + outlier-exclusion toggles) and a projects list card. Below that a "Recent Activity" section. Ask via REQUEST if you need the full overview JSX pasted.)

**Analytics tab JSX (src/pages/IDEProjectsPage.tsx:2535-2574, verbatim):**

```tsx
      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <motion.div
          data-section="ide.analytics"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Workspace Analytics</h2>
              <p className="text-sm text-zinc-500">AI usage, problems, and requests across all projects</p>
            </div>
          </div>
          {workspaceAnalytics ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /><span className="ml-3 text-zinc-400 text-sm">Loading analytics...</span></div>}>
              <AnalyticsDashboard
                aiUsage={workspaceAnalytics.aiUsage}
                sessions={workspaceAnalytics.sessions}
                problems={workspaceAnalytics.problems}
                requests={workspaceAnalytics.requests}
                promptHistory={workspaceAnalytics.promptHistory}
                codeStats={workspaceAnalytics.codeStats}
                loading={analyticsLoading}
                period={selectedPeriod}
                variant="workspace"
                projectLanguages={aggregatedProjectLanguages}
              />
            </Suspense>
          ) : analyticsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              <span className="ml-3 text-zinc-400 text-sm">Loading analytics...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-zinc-600 text-sm">No analytics data available</div>
          )}
        </motion.div>
      )}
```

### 4.7 AnalyticsDashboard.tsx — FULL FILE (810 lines, verbatim) — THE COMPONENT TO REDESIGN

```tsx
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database, BarChart3, DollarSign, Zap, AlertTriangle,
  Clock, Activity, Cpu, TrendingUp, Code2,
  PieChart as PieChartIcon, FileText, Timer, Wrench, Loader2, GitCommitHorizontal
} from 'lucide-react';
import { WorkspaceCard } from './workspace/_ds/containers';
import { listContainer, riseItem } from './workspace/_ds/motion';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Filler);

const CHART_COLORS = [
  'rgba(168, 85, 247, 0.8)', 'rgba(34, 211, 238, 0.8)', 'rgba(52, 211, 153, 0.8)',
  'rgba(251, 113, 133, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(96, 165, 250, 0.8)',
  'rgba(129, 140, 248, 0.8)', 'rgba(251, 146, 60, 0.8)', 'rgba(167, 139, 250, 0.8)',
  'rgba(74, 222, 128, 0.8)', 'rgba(244, 114, 182, 0.8)', 'rgba(163, 230, 53, 0.8)',
];

const CHART_BORDERS = CHART_COLORS.map(c => c.replace('0.8)', '1)'));

const WORKSPACE_CATEGORIES = ['IDE', 'AI Tools', 'Developer Tools', 'Education', 'Productivity', 'Tools'];

const STATUS_COLORS: Record<string, string> = {
  'Fixed': 'rgba(52, 211, 153, 0.8)', 'Irrelevant': 'rgba(113, 113, 122, 0.8)',
  'In Progress': 'rgba(96, 165, 250, 0.8)', 'NEW': 'rgba(251, 113, 133, 0.8)',
  'Not Started': 'rgba(245, 158, 11, 0.8)', 'AI Attempted Fix': 'rgba(168, 85, 247, 0.8)',
  'User Testing': 'rgba(34, 211, 238, 0.8)', 'Completed': 'rgba(52, 211, 153, 0.8)',
  'Cancelled': 'rgba(113, 113, 122, 0.8)', 'Pending': 'rgba(245, 158, 11, 0.8)',
  'active': 'rgba(52, 211, 153, 0.8)', 'running': 'rgba(34, 211, 238, 0.8)',
  'completed': 'rgba(129, 140, 248, 0.8)', 'stopped': 'rgba(113, 113, 122, 0.8)',
  'error': 'rgba(251, 113, 133, 0.8)',
};

const getStatusColor = (status: string, fallbackIdx: number) => STATUS_COLORS[status] || CHART_COLORS[fallbackIdx % CHART_COLORS.length];
const getStatusBorder = (status: string, fallbackIdx: number) => getStatusColor(status, fallbackIdx).replace('0.8)', '1)');
const fmtNum = (n: number) => { if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'; if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'; if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'; return n.toLocaleString(); };
const fmtCost = (n: number) => { if (n >= 1) return '$' + n.toFixed(2); if (n >= 0.01) return '$' + n.toFixed(3); if (n > 0) return '$' + n.toFixed(4); return '$0.00'; };
const fmtSec = (s: number) => { if (s >= 3600) return (s / 3600).toFixed(1) + 'h'; if (s >= 60) return (s / 60).toFixed(1) + 'm'; return s.toFixed(1) + 's'; };

const pieOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { color: '#a1a1aa', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
    tooltip: { backgroundColor: 'rgba(24, 24, 27, 0.95)', titleColor: '#e4e4e7', bodyColor: '#a1a1aa', borderColor: 'rgba(63, 63, 70, 0.5)', borderWidth: 1, cornerRadius: 8, padding: 10 },
  },
};

const barOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(24, 24, 27, 0.95)', titleColor: '#e4e4e7', bodyColor: '#a1a1aa', borderColor: 'rgba(63, 63, 70, 0.5)', borderWidth: 1, cornerRadius: 8, padding: 10 } },
  scales: {
    x: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: 'rgba(113,113,122,0.08)' }, border: { color: 'rgba(113,113,122,0.15)' } },
    y: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: 'rgba(113,113,122,0.08)' }, border: { color: 'rgba(113,113,122,0.15)' } },
  },
};

const makeStripedPattern = (color: string): string | CanvasPattern => {
  try {
    if (typeof document === 'undefined') return color;
    const tile = 8;
    const c = document.createElement('canvas');
    c.width = tile; c.height = tile;
    const ctx = c.getContext('2d');
    if (!ctx) return color;
    ctx.clearRect(0, 0, tile, tile);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(0, 0, tile, tile);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(tile, tile);
    ctx.moveTo(tile * 0.5, -tile * 0.5); ctx.lineTo(tile * 1.5, tile * 0.5);
    ctx.moveTo(-tile * 0.5, tile * 0.5); ctx.lineTo(tile * 0.5, tile * 1.5);
    ctx.stroke();
    return ctx.createPattern(c, 'repeat');
  } catch {
    return color;
  }
};

const crosshairPlugin = {
  id: 'dashedCrosshair',
  afterDraw(chart: any) {
    const active = chart.tooltip?.getActiveElements?.();
    if (!active || !active.length) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();
    ctx.restore();
  },
};

const stackedBarOptions = {
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { color: '#71717a', font: { size: 9 } } },
    y: { stacked: true, grid: { color: 'rgba(113,113,122,0.06)' }, border: { color: 'rgba(113,113,122,0.12)' }, ticks: { color: '#71717a', font: { size: 9 }, padding: 6 } },
  },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: 'rgba(20, 22, 30, 0.92)', titleColor: '#e4e4e7', bodyColor: '#a1a1aa', borderColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1, cornerRadius: 10, padding: 10 },
  },
};

export interface CodeStats {
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  totalHours: number;
  daily: { date: string; additions: number; deletions: number; commits: number }[];
  weekly: { weekStart: string; additions: number; deletions: number; commits: number }[];
  error?: string;
}

function StatCard({ icon: Icon, iconColor, iconBg, value, label, sub, delay = 0 }: {
  icon: any; iconColor: string; iconBg: string; value: string; label: string; sub?: string; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
      <WorkspaceCard className="flex items-center gap-3 min-w-0 !p-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold text-white truncate">{value}</div>
          <div className="text-xs text-zinc-500 truncate">{label}</div>
          {sub && <div className="text-[10px] text-zinc-600 truncate">{sub}</div>}
        </div>
      </WorkspaceCard>
    </motion.div>
  );
}

function ChartCard({ title, icon: Icon, subtitle, children, isEmpty, emptyText, full = false }: {
  title: string; icon: any; subtitle?: string; children: React.ReactNode; isEmpty: boolean; emptyText: string; full?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className={full ? 'col-span-2' : ''}>
      <WorkspaceCard className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl !p-5">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        </div>
        {subtitle && <p className="text-[11px] text-zinc-600 mb-3">{subtitle}</p>}
        <div className="relative" style={{ height: isEmpty ? 200 : 240 }}>
          {isEmpty ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
              <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
              <span className="text-xs">{emptyText}</span>
            </div>
          ) : children}
        </div>
      </WorkspaceCard>
    </motion.div>
  );
}

type DashboardVariant = 'project' | 'workspace' | 'full';

function CodeChanges({ codeStats }: { codeStats?: CodeStats | null }) {
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const series = useMemo(() => {
    const rows = mode === 'daily' ? codeStats?.daily || [] : codeStats?.weekly || [];
    return rows.map((r: any) => ({
      label: (() => {
        try { return format(new Date((r.date || r.weekStart) + 'T00:00:00'), 'MMM d'); } catch { return r.date || r.weekStart; }
      })(),
      additions: r.additions || 0,
      deletions: r.deletions || 0,
    }));
  }, [codeStats, mode]);

  const isEmpty = !codeStats || (codeStats.totalCommits === 0 && series.length === 0);
  const isLoading = codeStats === undefined;
  const netLines = (codeStats?.totalAdditions || 0) - (codeStats?.totalDeletions || 0);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.35 }} className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
        {isLoading ? (
          [0, 1, 2].map(i => (
            <Skeleton key={i} className="rounded-xl p-5 h-[96px]" />
          ))
        ) : (
          <>
        <StatCard icon={GitCommitHorizontal} iconColor="text-cyan-400" iconBg="bg-cyan-500/10"
          value={fmtNum(codeStats?.totalCommits || 0)} label="Total Commits"
          sub={!isEmpty ? `${codeStats?.daily?.length || 0} active days` : undefined} delay={0} />
        <StatCard icon={Code2} iconColor={netLines >= 0 ? 'text-emerald-400' : 'text-rose-400'} iconBg={netLines >= 0 ? 'bg-emerald-500/12' : 'bg-rose-500/10'}
          value={`${netLines >= 0 ? '+' : ''}${fmtNum(netLines)}`} label="Net Lines"
          sub={!isEmpty ? `+${fmtNum(codeStats?.totalAdditions || 0)} / -${fmtNum(codeStats?.totalDeletions || 0)}` : undefined} delay={0.05} />
        <StatCard icon={Clock} iconColor="text-amber-400" iconBg="bg-amber-500/10"
          value={fmtNum(codeStats?.totalHours || 0)} label="Hours Coded"
          sub={!isEmpty ? `${fmtNum(codeStats?.totalHours || 0)}h estimated` : undefined} delay={0.1} />
          </>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}
        className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl !p-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <GitCommitHorizontal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-medium text-zinc-200">Code Velocity</h3>
          </div>
          <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-0.5">
            {(['daily', 'weekly'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${mode === m ? 'bg-zinc-700/80 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {m === 'daily' ? 'Daily' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="py-4">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-[200px] rounded-lg" />
          </div>
        ) : codeStats?.error ? (
          <p className="text-xs text-rose-400 text-center py-10">Failed to load commit data.</p>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
            <GitCommitHorizontal className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-xs text-center max-w-xs">No commits synced yet. Run 'Sync Commits' from project settings to track code changes.</span>
          </div>
        ) : (
          <div className="relative mt-2" style={{ height: 240 }}>
            <Bar data={{
              labels: series.map(s => s.label),
              datasets: [
                { label: 'Additions', data: series.map(s => s.additions), backgroundColor: makeStripedPattern('#10b981'), borderColor: '#10b981', borderWidth: 1, borderRadius: 4, hoverBackgroundColor: '#10b981' },
                { label: 'Deletions', data: series.map(s => s.deletions), backgroundColor: makeStripedPattern('#f87171'), borderColor: '#f87171', borderWidth: 1, borderRadius: 4, hoverBackgroundColor: '#f87171' },
              ],
            }} options={stackedBarOptions} plugins={[crosshairPlugin]} />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function AnalyticsDashboard({ aiUsage, sessions, problems, requests, dailyStats, appStats, promptHistory, loading, period, variant = 'full', projectLanguages, codeStats }: {
  aiUsage?: any; sessions: any[]; problems?: any[]; requests?: any[]; dailyStats?: any[]; appStats?: any[]; promptHistory?: any[]; loading: boolean; period: string; variant?: DashboardVariant; projectLanguages?: { language: string; count: number }[]; codeStats?: CodeStats | null;
}) {
  const tokenByTool = useMemo(() => {
    if (!aiUsage?.byTool) return { labels: [], values: [] };
    const entries = Object.entries(aiUsage.byTool).map(([tool, data]: [string, any]) => ({ tool, tokens: data?.tokens || 0 })).sort((a, b) => b.tokens - a.tokens);
    return { labels: entries.map(e => e.tool), values: entries.map(e => e.tokens) };
  }, [aiUsage]);

  const costByTool = useMemo(() => {
    if (!aiUsage?.byTool) return { labels: [], values: [] };
    const entries = Object.entries(aiUsage.byTool).map(([tool, data]: [string, any]) => ({ tool, cost: data?.cost || 0 })).sort((a, b) => b.cost - a.cost);
    return { labels: entries.map(e => e.tool), values: entries.map(e => e.cost) };
  }, [aiUsage]);

  const sessionsByAgent = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) counts[s.agent || 'Unknown'] = (counts[s.agent || 'Unknown'] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [sessions]);

  const sessionsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) counts[s.status || 'Unknown'] = (counts[s.status || 'Unknown'] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [sessions]);

  const categoryDist = useMemo(() => {
    if (!appStats?.length) return { labels: [], values: [] };
    const totals: Record<string, number> = {};
    for (const stat of appStats) { const cat = stat.category || 'Other'; totals[cat] = (totals[cat] || 0) + (stat.total_ms || 0); }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [appStats]);

  const languageDist = useMemo(() => {
    if (!projectLanguages?.length) return { labels: [], values: [] };
    const sorted = [...projectLanguages].sort((a, b) => b.count - a.count);
    return { labels: sorted.map(e => e.language), values: sorted.map(e => e.count) };
  }, [projectLanguages]);

  const problemsByStatus = useMemo(() => {
    if (!problems?.length) return { labels: [], values: [] };
    const counts: Record<string, number> = {};
    for (const p of problems) counts[p.status || 'Unknown'] = (counts[p.status || 'Unknown'] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [problems]);

  const requestsByStatus = useMemo(() => {
    if (!requests?.length) return { labels: [], values: [] };
    const counts: Record<string, number> = {};
    for (const r of requests) counts[r.status || 'Unknown'] = (counts[r.status || 'Unknown'] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [requests]);

  const dailyTrend = useMemo(() => {
    if (!dailyStats?.length) return { labels: [], values: [] };
    const dayTotals: Record<string, number> = {};
    for (const stat of dailyStats) { 
      if (!WORKSPACE_CATEGORIES.includes(stat.category)) continue;
      const day = stat.day || stat.date; if (!day) continue; dayTotals[day] = (dayTotals[day] || 0) + (stat.total_sec || 0); 
    }
    const sorted = Object.keys(dayTotals).sort();
    return { labels: sorted.map(d => { try { return format(new Date(d + 'T00:00:00'), 'MMM d'); } catch { return d; } }), values: sorted.map(d => +(dayTotals[d] / 3600).toFixed(2)) };
  }, [dailyStats]);

  const responseTiming = useMemo(() => {
    if (!promptHistory?.length) return { avgResponse: null, avgThink: null, count: 0 };
    const bySession: Record<string, any[]> = {};
    for (const msg of promptHistory) { const sid = msg.session_id; if (!sid) continue; if (!bySession[sid]) bySession[sid] = []; bySession[sid].push(msg); }
    let totalResponseGap = 0, responseGapCount = 0;
    let totalThinkGap = 0, thinkGapCount = 0;
    for (const msgs of Object.values(bySession)) {
      const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const t0 = new Date(sorted[i].created_at).getTime();
        const t1 = new Date(sorted[i + 1].created_at).getTime();
        const gap = (t1 - t0) / 1000;
        if (sorted[i].role === 'user' && sorted[i + 1].role === 'assistant' && gap >= 0 && gap < 600) { totalResponseGap += gap; responseGapCount++; }
        else if (sorted[i].role === 'assistant' && sorted[i + 1].role === 'user' && gap >= 0 && gap < 7200) { totalThinkGap += gap; thinkGapCount++; }
      }
    }
    return { avgResponse: responseGapCount > 0 ? totalResponseGap / responseGapCount : null, avgThink: thinkGapCount > 0 ? totalThinkGap / thinkGapCount : null, count: responseGapCount };
  }, [promptHistory]);

  const summaryStats = useMemo(() => {
    const totalTokens = aiUsage?.totalTokens || 0;
    const totalCost = aiUsage?.totalCost || 0;
    const sessionCount = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'running').length;
    const problemCount = problems?.length || 0;
    const openProblems = problems ? problems.filter(p => !['Fixed', 'Irrelevant'].includes(p.status)).length : 0;
    const requestCount = requests?.length || 0;
    const openRequests = requests ? requests.filter(r => !['Completed', 'Cancelled'].includes(r.status)).length : 0;
    const toolsUsed = aiUsage?.byTool ? Object.keys(aiUsage.byTool).length : 0;
    return { totalTokens, totalCost, sessionCount, activeSessions, problemCount, openProblems, requestCount, openRequests, toolsUsed };
  }, [aiUsage, sessions, problems, requests]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-400" />
        <span className="text-sm">Loading analytics...</span>
      </div>
    );
  }

  if (variant === 'project') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <StatCard icon={Activity} iconColor="text-cyan-400" iconBg="bg-cyan-500/10"
            value={String(summaryStats.sessionCount)} label="Sessions"
            sub={summaryStats.activeSessions > 0 ? `${summaryStats.activeSessions} active` : undefined} delay={0} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Sessions by Agent" icon={Cpu} subtitle="AI agent usage distribution"
            isEmpty={sessionsByAgent.values.length === 0} emptyText="No session data available">
            <Pie data={{ labels: sessionsByAgent.labels, datasets: [{ data: sessionsByAgent.values, backgroundColor: sessionsByAgent.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: sessionsByAgent.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Session Status" icon={Activity} subtitle="Active vs completed sessions"
            isEmpty={sessionsByStatus.values.length === 0} emptyText="No status data available">
            <Doughnut data={{ labels: sessionsByStatus.labels, datasets: [{ data: sessionsByStatus.values, backgroundColor: sessionsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: sessionsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
        </div>
      </div>
    );
  }

  if (variant === 'workspace') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={Zap} iconColor="text-emerald-400" iconBg="bg-emerald-500/12"
            value={fmtNum(summaryStats.totalTokens)} label="Total Tokens" sub={`${summaryStats.toolsUsed} tools`} delay={0} />
          <StatCard icon={DollarSign} iconColor="text-amber-400" iconBg="bg-amber-500/10"
            value={fmtCost(summaryStats.totalCost)} label="Total Cost" delay={0.05} />
          <StatCard icon={Activity} iconColor="text-cyan-400" iconBg="bg-cyan-500/10"
            value={String(summaryStats.sessionCount)} label="Sessions"
            sub={summaryStats.activeSessions > 0 ? `${summaryStats.activeSessions} active` : undefined} delay={0.1} />
          <StatCard icon={AlertTriangle} iconColor="text-rose-400" iconBg="bg-rose-500/10"
            value={String(summaryStats.problemCount)} label="Problems"
            sub={summaryStats.openProblems > 0 ? `${summaryStats.openProblems} open` : undefined} delay={0.15} />
          <StatCard icon={FileText} iconColor="text-emerald-400" iconBg="bg-emerald-500/12"
            value={String(summaryStats.requestCount)} label="Requests"
            sub={summaryStats.openRequests > 0 ? `${summaryStats.openRequests} open` : undefined} delay={0.2} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Token Distribution" icon={Zap} subtitle="Token usage breakdown by tool"
            isEmpty={tokenByTool.values.length === 0} emptyText="No token data available">
            <Pie data={{ labels: tokenByTool.labels, datasets: [{ data: tokenByTool.values, backgroundColor: tokenByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: tokenByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Cost Distribution" icon={DollarSign} subtitle="Spending breakdown by tool"
            isEmpty={costByTool.values.length === 0} emptyText="No cost data available">
            <Doughnut data={{ labels: costByTool.labels, datasets: [{ data: costByTool.values, backgroundColor: costByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: costByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Problems by Status" icon={AlertTriangle} subtitle="Issue pipeline breakdown"
            isEmpty={problemsByStatus.values.length === 0} emptyText="No problem data available">
            <Pie data={{ labels: problemsByStatus.labels, datasets: [{ data: problemsByStatus.values, backgroundColor: problemsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: problemsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Requests by Status" icon={FileText} subtitle="Feature request pipeline"
            isEmpty={requestsByStatus.values.length === 0} emptyText="No request data available">
            <Doughnut data={{ labels: requestsByStatus.labels, datasets: [{ data: requestsByStatus.values, backgroundColor: requestsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: requestsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Response Timing" icon={Timer} subtitle="Average AI response & think times"
            isEmpty={responseTiming.avgResponse === null && responseTiming.avgThink === null} emptyText="No message timing data available">
            <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{responseTiming.avgResponse !== null ? fmtSec(responseTiming.avgResponse) : '—'}</div>
                <div className="text-xs text-zinc-500 mt-1">Avg Response Time</div>
                <div className="text-[10px] text-zinc-600">user prompt &rarr; assistant reply</div>
              </div>
              <div className="w-16 h-px bg-zinc-800" />
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">{responseTiming.avgThink !== null ? fmtSec(responseTiming.avgThink) : '—'}</div>
                <div className="text-xs text-zinc-500 mt-1">Avg Think Time</div>
                <div className="text-[10px] text-zinc-600">assistant reply &rarr; next prompt</div>
              </div>
              {responseTiming.count > 0 && <div className="text-[10px] text-zinc-600">Based on {responseTiming.count} response pairs</div>}
            </div>
          </ChartCard>
        </div>

        {languageDist.labels.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Language Distribution" icon={Code2} subtitle="Coding languages across all projects"
              isEmpty={false} emptyText="">
              <Doughnut data={{
                labels: languageDist.labels,
                datasets: [{ data: languageDist.values, backgroundColor: languageDist.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: languageDist.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }]
              }} options={pieOptions} />
            </ChartCard>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}
          className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl !p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-zinc-200">AI Usage Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-purple-400">{fmtNum(summaryStats.totalTokens)}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Total Tokens</div>
            </div>
            <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-amber-400">{fmtCost(summaryStats.totalCost)}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Total Cost</div>
            </div>
            <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">{summaryStats.toolsUsed}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Tools Used</div>
            </div>
            <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-cyan-400">{summaryStats.sessionCount}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Total Sessions</div>
            </div>
            <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-rose-400">{responseTiming.avgResponse !== null ? fmtSec(responseTiming.avgResponse) : '—'}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Avg Response</div>
            </div>
          </div>
          {aiUsage?.byTool && Object.keys(aiUsage.byTool).length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/60">
                    <th className="text-left text-zinc-500 font-medium py-2 pr-4">Tool</th>
                    <th className="text-right text-zinc-500 font-medium py-2 pr-4">Tokens</th>
                    <th className="text-right text-zinc-500 font-medium py-2 pr-4">Cost</th>
                    <th className="text-right text-zinc-500 font-medium py-2">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(aiUsage.byTool).sort(([, a]: any[], [, b]: any[]) => (b.tokens || 0) - (a.tokens || 0))
                    .map(([tool, data]: [string, any], i: number) => (
                      <tr key={tool} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                        <td className="py-2 pr-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-zinc-300">{tool}</span>
                        </td>
                        <td className="text-right text-zinc-400 py-2 pr-4">{fmtNum(data.tokens || 0)}</td>
                        <td className="text-right text-zinc-400 py-2 pr-4">{fmtCost(data.cost || 0)}</td>
                        <td className="text-right text-zinc-400 py-2">{data.sessions || 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
          </div>
        )}
      </motion.div>

      <CodeChanges codeStats={codeStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div ... className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl !p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-medium text-zinc-200">Problems Progress</h3>
            </div>
            {!problems?.length ? (
              <p className="text-xs text-zinc-600 text-center py-6">No problems tracked</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const total = problems.length;
                  const fixed = problems.filter(p => p.status === 'Fixed').length;
                  const inProgress = problems.filter(p => ['In Progress', 'AI Attempted Fix'].includes(p.status)).length;
                  const open = total - fixed - problems.filter(p => p.status === 'Irrelevant').length;
                  const pct = total > 0 ? Math.round((fixed / total) * 100) : 0;
                  return (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{fixed} of {total} fixed</span>
                        <span className="text-emerald-400 font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500/80 h-full transition-all" style={{ width: `${(fixed/total)*100}%` }} />
                        <div className="bg-blue-500/60 h-full transition-all" style={{ width: `${(inProgress/total)*100}%` }} />
                      </div>
                      <div className="flex gap-4 text-[10px] text-zinc-600 mt-1">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Fixed ({fixed})</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> In Progress ({inProgress})</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> Open ({open - inProgress})</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </motion.div>
          <motion.div ... className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl !p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-zinc-200">Requests Progress</h3>
            </div>
            {/* same pattern as Problems Progress with completed/inProgress/pending */}
          </motion.div>
        </div>
      </div>
    );
  }

  // variant === 'full' (default) — same 5 StatCards + same chart grid (Token/Cost Distribution, Sessions by Agent/Status, Activity by Category, Problems/Requests by Status, Response Timing, Daily Activity Trend full-width bar) + AI Usage Summary + CodeChanges + Problems/Requests Progress
}
```

> Note: the `variant === 'full'` render (lines 602-810) is nearly identical to the workspace
> variant — same StatCards, same ChartCards plus "Activity by Category" and a full-width
> "Daily Activity Trend" bar chart. The redesign must keep the `variant` prop contract
> (project / workspace / full) since IDEProjectsPage passes `variant="workspace"`.

### 4.8 Design tokens (src/index.css — excerpt)

```css
/* Dark zinc theme (the ONLY theme — no light mode) */
--color-background: #09090b;      /* zinc-950 */
--color-card: #18181b;            /* zinc-900 */
--color-border: #27272a;          /* zinc-800 */
--color-muted: #a1a1aa;           /* zinc-400 */
--color-primary: #fbbf24;         /* AMBER-400 — the app accent */
```

- Cards: `bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl`
- Page background: dark #121212-ish, AppBackground component with particles
- Fonts: Inter (UI), JetBrains Mono (mono/numbers), Space Grotesk (display)
- Chart colors: the 12-color `CHART_COLORS` array in AnalyticsDashboard (violet/cyan/emerald/rose/amber/blue/indigo/orange/purple/green/pink/lime)
- Motion: framer-motion `initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}` staggered cards; `WorkspaceCard` from `src/components/workspace/_ds/containers.tsx`
- Icons: lucide-react

### 4.9 The browser-extension pattern (browser-extension/ — mirror this for VS Code)

**manifest.json (verbatim):**
```json
{
  "manifest_version": 3,
  "name": "DeskFlow Browser Tracker",
  "version": "1.1.2",
  "description": "Tracks active tab browsing activity and sends data to DeskFlow Electron app. Includes Deep Focus soft-block overlay and a status popup.",
  "permissions": [
    "tabs",
    "webNavigation",
    "activeTab",
    "alarms",
    "storage"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "DeskFlow Browser Tracker"
  },
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": [
    "http://localhost:54321/*",
    "http://127.0.0.1:54321/*"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["focusOverlay.js"],
      "run_at": "document_idle"
    }
  ]
}
```

**background.js head (verbatim — the sync design: alarms not setInterval, storage persistence, health check, silent retry):**

```js
// DeskFlow Browser Extension - Background Service Worker (MV3)
// Tracks only the actively viewed tab and sends data to DeskFlow Electron app
//
// Key design decisions (based on Chromium MV3 best practices):
// - Uses chrome.alarms instead of setInterval (SW gets killed when idle)
// - Persists state to chrome.storage.local (survives SW restarts)
// - Listens for tabs.onRemoved (handles tab close/crash)
// - Defensive error handling for tabs.get ("No tab with id")

const DESKFLOW_SERVER = 'http://localhost:54321';
const ALARM_NAME = 'deskflowSync';
// MV3 minimum alarm period: 0.5 min (30s) for unpacked extensions, 1 min installed.
// Values below the minimum are silently clamped by Chrome, so 0.5 is the fastest
// reliable period that keeps the service worker waking on schedule.
const SYNC_PERIOD_MINUTES = 0.5; // 30 seconds
const MIN_SESSION_MS = 3000;       // Minimum 3 seconds before logging
const HEALTH_CHECK_TIMEOUT_MS = 3000;

// --- State (persisted to chrome.storage.local) ---
let state = {
  activeTabId: null,
  activeTabUrl: '',
  activeTabTitle: '',
  activeTabDomain: '',
  sessionStart: Date.now(),
  lastPeriodicSync: Date.now(),  // Track last sync time for delta calculation
  isTrackingEnabled: true,
  serverHealthy: false,
  isBrowserFocused: true         // Track if browser window has focus
};

// --- Persistence helpers ---
async function saveState() {
  try {
    await chrome.storage.local.set({
      deskflow_activeTabId: state.activeTabId,
      deskflow_activeTabUrl: state.activeTabUrl,
      deskflow_activeTabTitle: state.activeTabTitle,
      deskflow_activeTabDomain: state.activeTabDomain,
      deskflow_sessionStart: state.sessionStart,
      deskflow_lastPeriodicSync: state.lastPeriodicSync,
      deskflow_isTrackingEnabled: state.isTrackingEnabled,
      deskflow_isBrowserFocused: state.isBrowserFocused
    });
  } catch (err) {
    console.debug('[DeskFlow] Failed to save state:', err.message);
  }
}
```

**README highlights (install/verify flow the user wants for VS Code):**
- Health check: `curl http://localhost:54321/health`; manual POST: `curl -X POST http://localhost:54321/browser-data -H "Content-Type: application/json" -d '{"url":"https://test.com","domain":"test.com","title":"Test","active_duration_ms":5000}'`
- Server console line to watch for: `Browser tracking server started on port 54321`
- Only active window/tab tracked; min 3s sessions; silent retry when app down; `isTrackingEnabled` toggle.

### 4.10 Local server bootstrap (main.ts ~17949)

- `browserServerPort = 54321` constant (main.ts:3990).
- Server created in `app.whenReady()` via `http.createServer`; routes: `POST /browser-data` (CORS handled, payload validated, then merged with foreground app state — only persisted when browser is the active foreground window) and `GET /health` (returns `{ ok: true }`).
- If the Specialist designs new endpoints (`POST /code-activity` etc.), the server code needs the new route added in the same `createServer` handler — exact insertion point will be provided via REQUEST if needed.

---

## 5. Hard Invariants (implementation MUST respect these)

1. **PTY event order is sacred** — irrelevant here, do not touch terminal code.
2. **All `localStorage` access wrapped in try/catch.**
3. **Prefer renderer-side fixes; read the FULL IPC handler before editing it.**
4. **Files are CRLF — preserve line endings; don't mass-reformat.**
5. **Build:** `npx vite build` → `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs` → `node scripts/rebuild-main.mjs`. Main-process files that import `../lib/*` need `src/lib` in the build compile list (already fixed in build.mjs).
6. **Black-screen prevention:** every build cycle must produce a visible app window; never remove `emptyOutDir: true`; never touch the `#df-fallback` div or `did-fail-load` logic.
7. **Agent-side DB access is READ-ONLY** (user mandate). The APP writes to `%APPDATA%/RHEO/deskflow-data.db` (live) — `%APPDATA%/DeskFlow/` is a stale copy.
8. **Chart.js is the charting library** (chart.js + react-chartjs-2 already installed) — no new chart dependency unless the Specialist explicitly proposes one and justifies it.
9. **UI re-skin rules:** glass cards (`bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl`), max `rounded-xl`, `p-5`, amber `#fbbf24` accent, Inter/JetBrains Mono/Space Grotesk. No purple-gradients-everywhere AI slop; use the existing 12-color chart palette.
10. **Empty/loading/error states mandatory** on every new chart/card (the current component has them — keep that discipline in the redesign).
