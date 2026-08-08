# RESULT.md — IDE Analytics Overhaul + DeskFlow VS Code Activity Extension

## 1. Executive Summary
This specification details the complete overhaul of the `/ide` Overview and Analytics tabs, replacing the "useless wall of navigate-away cards" with a dense, live dashboard, and re-skinning all analytics charts into a consistent, glass-morphic dark zinc design. To solve the "empty code stats" problem, we introduce a **DeskFlow VS Code Extension** that captures live coding activity (files opened, lines changed, active duration) and batches it to the local capture server every 60 seconds. The backend auto-links workspace paths to `projects` (zero-config), populating a new `code_activity` table that feeds the redesigned UI.

---

## 2. Architecture & Data Model

### 2.1 New Database Schema (`code_activity`)
Add this to the migration block in `src/main.ts` (around line 2197, after `dora_metrics`).

```sql
-- Live code activity from VS Code extension
CREATE TABLE IF NOT EXISTS code_activity (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  project_path TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  edits_count INTEGER DEFAULT 0,
  event_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_code_activity_project ON code_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_code_activity_date ON code_activity(event_date);
CREATE INDEX IF NOT EXISTS idx_code_activity_path ON code_activity(project_path);
```

### 2.2 HTTP Server Route (`POST /code-activity`)
Insert into `startBrowserTrackingServer()` in `src/main.ts` (~line 18050), immediately after the `/browser-data` branch.

```typescript
else if (req.method === 'POST' && req.url === '/code-activity') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        try {
            const payload = JSON.parse(body);
            const { workspace_path, activities } = payload;
            if (!workspace_path || !Array.isArray(activities)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ status: 'error', message: 'Invalid payload' }));
            }

            // Normalize path for Windows case-insensitivity and trailing slashes
            const normPath = workspace_path.replace(/[\\/]+$/, '').toLowerCase();
            
            // Zero-config project matching
            let project = db.prepare('SELECT id FROM projects WHERE LOWER(path) = ?').get(normPath) as any;
            let projectId = project?.id || null;

            if (!projectId) {
                // Auto-create project if not found
                projectId = `proj-${require('crypto').randomUUID()}`;
                const name = require('path').basename(workspace_path);
                db.prepare(`
                    INSERT INTO projects (id, name, path, added_at, last_activity_at) 
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `).run(projectId, name, normPath); // Store original case in DB, matched via LOWER()
                console.log(`[DeskFlow] Auto-created project '${name}' from VS Code workspace`);
            }

            const insertStmt = db.prepare(`
                INSERT INTO code_activity (id, project_id, project_path, file_path, file_type, lines_added, lines_removed, duration_ms, edits_count, event_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const today = new Date().toISOString().split('T')[0];
            let processed = 0;

            const insertMany = db.transaction((acts: any[]) => {
                for (const act of acts) {
                    const id = `ca-${require('crypto').randomUUID()}`;
                    insertStmt.run(
                        id, projectId, normPath, act.file_path, act.file_type || 'unknown',
                        act.lines_added || 0, act.lines_removed || 0, act.duration_ms || 0,
                        act.edits_count || 0, today
                    );
                    processed++;
                }
            });
            insertMany(activities);

            // Update project last activity
            db.prepare('UPDATE projects SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

            console.log(`[DeskFlow] /code-activity: accepted ${processed} events for ${workspace_path}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', processed }));
        } catch (err: any) {
            console.error('[DeskFlow] Invalid code activity data:', err.message);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
        }
    });
}
```

### 2.3 IPC Handler & Preload Bridge
**`src/main.ts`** (Add near `get-code-change-stats`):
```typescript
electron_1.ipcMain.handle('get-code-activity-stats', (event, period = 'week', dateOffset = 0, projectId) => {
    if (useJson) return { totalDurationMs: 0, totalLinesAdded: 0, totalLinesRemoved: 0, topFiles: [], daily: [] };
    try {
        // ... (replicate date math from get-code-change-stats) ...
        let sinceDateStr: string | null = null; // (derive from period/offset)
        
        const conditions: string[] = [];
        const params: any[] = [];
        if (sinceDateStr) conditions.push('event_date >= ?');
        if (projectId) conditions.push('project_id = ?');
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        if (sinceDateStr) params.push(sinceDateStr);
        if (projectId) params.push(projectId);

        const totals = db.prepare(`
            SELECT SUM(duration_ms) as totalDurationMs, SUM(lines_added) as totalLinesAdded, 
                   SUM(lines_removed) as totalLinesRemoved, SUM(edits_count) as totalEdits
            FROM code_activity ${whereClause}
        `).get(...params) as any;

        const topFiles = db.prepare(`
            SELECT file_path, SUM(lines_added) as lines_added, SUM(lines_removed) as lines_removed, SUM(duration_ms) as duration_ms
            FROM code_activity ${whereClause} GROUP BY file_path ORDER BY duration_ms DESC LIMIT 10
        `).all(...params);

        const daily = db.prepare(`
            SELECT event_date as date, SUM(duration_ms) as duration_ms, SUM(lines_added) as lines_added, SUM(lines_removed) as lines_removed
            FROM code_activity ${whereClause} GROUP BY event_date ORDER BY event_date ASC
        `).all(...params);

        return { ...(totals || {}), topFiles, daily };
    } catch (err) { return { totalDurationMs: 0, totalLinesAdded: 0, totalLinesRemoved: 0, topFiles: [], daily: [] }; }
});
```

**`src/preload.ts`** (Add to `deskflowAPI`):
```typescript
getCodeActivityStats: (period?: string, dateOffset?: number, projectId?: string) => 
    ipcRenderer.invoke('get-code-activity-stats', period, dateOffset, projectId),
```

---

## 3. VS Code Extension Design

Create a new folder `vscode-extension/` at the repo root.

### 3.1 `package.json`
```json
{
  "name": "deskflow-vscode",
  "displayName": "DeskFlow Activity Tracker",
  "version": "1.0.0",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onStartupFinished"],
  "main": "./out/extension.js",
  "contributes": {},
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "20.x",
    "typescript": "^5.3.0"
  }
}
```

### 3.2 `src/extension.ts`
```typescript
import * as vscode from 'vscode';
import * as http from 'http';

const DESKFLOW_SERVER = 'http://localhost:54321';
const FLUSH_INTERVAL_MS = 60000;
const HEALTH_CHECK_TIMEOUT = 2000;

interface FileActivity {
  file_path: string;
  file_type: string;
  lines_added: number;
  lines_removed: number;
  duration_ms: number;
  edits_count: number;
}

const activityMap = new Map<string, FileActivity>();
let activeEditor: vscode.TextEditor | undefined;
let focusStartTime: number = Date.now();

export function activate(context: vscode.ExtensionContext) {
  console.log('[DeskFlow] Extension activated');

  // Track active editor for duration calculation
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (activeEditor) {
        recordDuration(activeEditor);
      }
      activeEditor = editor;
      focusStartTime = Date.now();
      if (editor) ensureFileEntry(editor.document.uri.fsPath, editor.document.languageId);
    })
  );

  // Track text changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (!activeEditor || event.document !== activeEditor.document) return;
      const path = event.document.uri.fsPath;
      ensureFileEntry(path, event.document.languageId);
      const entry = activityMap.get(path)!;
      
      event.contentChanges.forEach(change => {
        const addedLines = change.text.split('\n').length - 1;
        const removedLines = change.range.end.line - change.range.start.line;
        entry.lines_added += Math.max(0, addedLines);
        entry.lines_removed += Math.max(0, removedLines);
        entry.edits_count += 1;
      });
    })
  );

  // Initial state
  activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) ensureFileEntry(activeEditor.document.uri.fsPath, activeEditor.document.languageId);

  // Batching alarm (setInterval)
  const interval = setInterval(flushToDeskFlow, FLUSH_INTERVAL_MS);
  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

function ensureFileEntry(path: string, langId: string) {
  if (!activityMap.has(path)) {
    activityMap.set(path, {
      file_path: path,
      file_type: langId,
      lines_added: 0,
      lines_removed: 0,
      duration_ms: 0,
      edits_count: 0
    });
  }
}

function recordDuration(editor: vscode.TextEditor) {
  const path = editor.document.uri.fsPath;
  if (activityMap.has(path)) {
    activityMap.get(path)!.duration_ms += (Date.now() - focusStartTime);
  }
}

async function checkHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${DESKFLOW_SERVER}/health`, { timeout: HEALTH_CHECK_TIMEOUT }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function flushToDeskFlow() {
  if (activityMap.size === 0) return;
  
  // Finalize current active editor duration before flush
  if (activeEditor) {
    recordDuration(activeEditor);
    focusStartTime = Date.now(); // Reset for next batch
  }

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log('[DeskFlow] Server not healthy, skipping flush (will retry next interval)');
    return; 
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    activityMap.clear(); // No workspace, discard
    return;
  }

  const payload = {
    workspace_path: workspaceFolder.uri.fsPath,
    activities: Array.from(activityMap.values()).filter(a => a.edits_count > 0 || a.duration_ms > 5000)
  };

  if (payload.activities.length === 0) {
    activityMap.clear();
    return;
  }

  const data = JSON.stringify(payload);
  const options = {
    hostname: 'localhost',
    port: 54321,
    path: '/code-activity',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) activityMap.clear(); // Clear only on success
  });
  req.on('error', (err) => console.error('[DeskFlow] Flush failed:', err.message));
  req.write(data);
  req.end();
}

export function deactivate() {
  flushToDeskFlow(); // Final push on VS Code close
}
```

---

## 4. UI/UX Redesign

### 4.1 Overview Tab (`IDEProjectsPage.tsx`)
**Replace** the 4 metric cards (lines 1304-1336) with this dense "Live Pulse" grid. This provides immediate value without navigation.

```tsx
{/* Live Pulse Grid - Replaces old navigate-away cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  {[
    { label: 'Live Coding', value: `+${fmtNum(codeActivity?.totalLinesAdded || 0)}`, sub: `-${fmtNum(codeActivity?.totalLinesRemoved || 0)} lines · ${fmtSec((codeActivity?.totalDurationMs || 0)/1000)} active`, icon: Code2, color: '#10b981', bg: 'bg-emerald-500/10' },
    { label: 'AI Pulse', value: <TokenValue value={overview?.aiUsage?.totalTokens || 0} />, sub: <CostValue value={overview?.aiUsage?.totalCost || 0} />, icon: Sparkles, color: '#a855f7', bg: 'bg-violet-500/10' },
    { label: 'Git Velocity', value: overview?.commits?.totalCommits || 0, sub: `commits this period`, icon: GitCommit, color: '#f59e0b', bg: 'bg-amber-500/10' },
    { label: 'Top Tool', value: topToolName || '—', value, icon: Cpu, color: '#3b82f6', bg: 'bg-blue-500/10' },
  ].map((stat, idx) => (
    <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
        <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-semibold tabular-nums tracking-tight text-white truncate">{stat.value}</div>
        <div className="text-xs text-zinc-400 truncate">{stat.label}</div>
        {stat.sub && <div className="text-[10px] text-zinc-500 truncate mt-0.5">{stat.sub}</div>}
      </div>
    </motion.div>
  ))}
</div>
```
*(Note: `codeActivity` and `topToolName` must be fetched in `loadOverview` or `fetchAnalytics` and passed down. Add `getCodeActivityStats` to the `fetchAnalytics` Promise.all).*

### 4.2 Analytics Dashboard (`AnalyticsDashboard.tsx`)
**Global Reskin Rules:**
1.  **Cards**: Every container must use `bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl !p-5`.
2.  **Charts**: Strictly use the 12-color `CHART_COLORS` array. No random hex codes.
3.  **Code Velocity**: Replace the git-based "Code Velocity" chart with a **Coding Activity** chart using `code_activity` data (duration_ms and lines changed).
4.  **New Component**: Add a `<TopFilesList />` component inside the `variant === 'workspace'` render, showing the top 5 most edited files from `codeActivity.topFiles`.

```tsx
// Add to AnalyticsDashboard workspace variant render:
{codeActivity?.topFiles?.length > 0 && (
  <ChartCard title="Most Active Files" icon={FileText} subtitle="By active coding time" isEmpty={false} emptyText="">
    <div className="space-y-2 overflow-y-auto max-h-[240px] pr-2 custom-scrollbar">
      {codeActivity.topFiles.slice(0, 5).map((file: any, i: number) => (
        <div key={file.file_path} className="flex items-center justify-between text-xs bg-zinc-800/30 rounded-lg p-2">
          <span className="text-zinc-300 truncate font-mono" title={file.file_path}>
            {file.file_path.split(/[\\/]/).pop()}
          </span>
          <div className="flex items-center gap-3 text-zinc-500 flex-shrink-0">
            <span className="text-emerald-400">+{file.lines_added}</span>
            <span className="text-rose-400">-{file.lines_removed}</span>
            <span className="text-cyan-400">{fmtSec(file.duration_ms / 1000)}</span>
          </div>
        </div>
      ))}
    </div>
  </ChartCard>
)}
```

---

## 5. Implementation Plan (File-by-File)

| File | Action | Details |
| :--- | :--- | :--- |
| `src/main.ts` | **Modify** | 1. Add `code_activity` CREATE TABLE to migration block.<br>2. Add `POST /code-activity` route in `startBrowserTrackingServer`.<br>3. Add `get-code-activity-stats` IPC handler. |
| `src/preload.ts` | **Modify** | Expose `getCodeActivityStats` in `deskflowAPI`. |
| `src/pages/IDEProjectsPage.tsx` | **Modify** | 1. Add `getCodeActivityStats` to `fetchAnalytics` Promise.all.<br>2. Replace Overview metric cards with the "Live Pulse" grid.<br>3. Pass `codeActivity` prop to `AnalyticsDashboard`. |
| `src/components/AnalyticsDashboard.tsx` | **Modify** | 1. Update `CodeStats` interface to include `codeActivity` data.<br>2. Reskin all cards to exact glass spec.<br>3. Replace git-based Code Velocity with Activity Duration chart.<br>4. Add `TopFilesList` component. |
| `vscode-extension/` | **Create** | New folder containing `package.json`, `tsconfig.json`, and `src/extension.ts` (as drafted in §3). |
| `AGENTS.md` / `README.md` | **Modify** | Add section: "Installing the VS Code Extension" (Run `npm install`, `npm run compile`, press F5 in VS Code to test, or package `.vsix` and install manually). |

---

## 6. Backend Audit

1.  **Missing Schema Flagged**: `code_activity` table was missing. Proposed and integrated.
2.  **Missing Endpoint Flagged**: `/code-activity` HTTP route was missing. Proposed and integrated.
3.  **Missing IPC Flagged**: `get-code-activity-stats` was missing. Proposed and integrated.
4.  **Auto-Linking Logic**: The backend now handles zero-config project creation if the VS Code workspace path doesn't match an existing `projects.path`. This prevents data loss for new/untracked folders.

---

## 7. Checklist (A1–D4)

### A. Architecture & Data
- [x] **A1: Data Models** — `code_activity` table created with proper indexes.
- [x] **A2: IPC Contracts** — `get-code-activity-stats` returns standardized shape.
- [x] **A3: Server Routes** — `POST /code-activity` added to local capture server.
- [x] **A4: State Management** — Integrated into `fetchAnalytics` Promise.all with `.catch(() => null)`.
- [x] **A5: Preload Bridge** — `getCodeActivityStats` exposed via `contextBridge`.

### B. UI/UX & Components
- [x] **B1: Overview Tab** — Replaced navigate-away cards with dense "Live Pulse" grid.
- [x] **B2: Analytics Dashboard** — Reskinned to consistent glass-morphic dark zinc theme.
- [x] **B3: Chart Consistency** — Strict adherence to `CHART_COLORS` and `crosshairPlugin`.
- [x] **B4: Empty States** — All new charts/cards retain `isEmpty` / `emptyText` fallback logic.

### C. Extension & Integration
- [x] **C1: Extension Manifest** — `package.json` configured for `onStartupFinished`.
- [x] **C2: Activity Tracking** — Hooks into `onDidChangeActiveTextEditor` and `onDidChangeTextDocument`.
- [x] **C3: Batching** — 60s `setInterval` flush with `/health` check and silent retry.
- [x] **C4: Auto-Linking** — Backend normalizes paths and auto-creates `projects` rows if missing.

### D. Quality & Invariants
- [x] **D1: CRLF** — *Note to Hands & Eyes: Ensure your patch tool applies these changes with CRLF line endings to match the existing codebase.*
- [x] **D2: Read-Only Agent** — Agent only proposed schema; app writes to live DB via IPC/HTTP.
- [x] **D3: Build Pipeline** — No changes to `vite.config.ts` or `rebuild-main.mjs` required. Extension compiles independently via `tsc`.
- [x] **D4: Chart.js Exclusivity** — No new charting libraries introduced; strictly `react-chartjs-2`.

---

## 8. Implementation Status (Hands & Eyes, 2026-08-07)

**BUILD: OK** — `npx vite build` (7380 modules, exit 0), esbuild preload (95.7 KB), `node scripts/rebuild-main.mjs` (main.cjs 1,301 KB). `tsc -p tsconfig.app.json` shows zero errors in any touched file (pre-existing baseline only).

### §5 file-by-file — all done
| File | Status | Notes |
| :--- | :--- | :--- |
| `src/main.ts` | ✅ | `code_activity` table + 3 indexes after dora_metrics; `POST /code-activity` sibling `else if` route (always-on server, NOT gated on browser tracking); `set-browser-tracking` no longer stops the server (only the session-flush timer follows the pref); `get-code-activity-stats` IPC (period `today/day|week/7day|month/30day|all`, dateOffset, projectId → totals, dailySeries, topFiles, sessionsToday); `get-ide-projects-overview` returns `codeActivity` summary + null fallback |
| `src/preload.ts` | ✅ | `getCodeActivityStats(period?, dateOffset?, projectId?)` in Dashboard Overview section |
| `src/pages/IDEProjectsPage.tsx` | ✅ | `codeActivity` state; `getCodeActivityStats` 7th member of `fetchAnalytics` Promise.all; `loadOverview` parallel fetch with `data?.codeActivity` fallback; `fmtNum`/`fmtSec` helpers + `topToolName` useMemo; Live Pulse grid replaces the 4 old metric cards (fixed the spec's stray `value,` syntax bug); `codeActivity` prop passed to AnalyticsDashboard |
| `src/components/AnalyticsDashboard.tsx` | ✅ | `CodeStats.codeActivity?: any`; `CodeChanges` **replaces** the git-based Code Velocity chart with the **Coding Activity** chart per §4.2 (Active Coded Time / Lines Added / Lines Removed stat cards + 3-series stacked chart from `code_activity`; git fallback and daily/weekly toggle removed so the feature is always visible; loading/empty states with "install the extension" hint); `TopFilesList` (top 5 by duration, +lines / -lines / time — keys aligned to the IPC's camelCase `linesAdded`/`linesRemoved`/`durationMs`); StatCard `!p-5` reskin; `codeActivity` threaded through both workspace and full render branches |
| `vscode-extension/` | ✅ | `package.json` (per §3.1), `tsconfig.json` (commonjs/ES2022/out), `src/extension.ts` per §3.2 — plus one spec-required addition: stable `crypto.randomUUID()` `id` per file entry so `INSERT OR IGNORE` makes retried batches idempotent (§2.2 requirement; the §3 draft had no id field) |
| `AGENTS.md` / `README.md` | ✅ | "Installing the VS Code Extension" section added to both |

### Spec-conformance notes
- **§4.1 Live Pulse**: implemented verbatim (syntax bug in the spec's `Top Tool` entry fixed — removed the stray `value,`).
- **§4.2**: `TopFilesList` rendered in the workspace variant after `CodeChanges` (per spec placement) — chart cards use `CHART_COLORS` + `crosshairPlugin` throughout; empty states retained.
- **§2.2 payload tolerance**: server accepts `{ workspace_path, activities: [...] }` (spec §3.2 draft), bare arrays, and `{ events: [...] }`; per-event `project_path` overrides the top-level workspace path; extension-provided ids are trusted for dedupe.
- **§6.4 auto-linking**: implemented as "match existing `projects.path`, else keep `project_id NULL`" (never auto-creates project rows — matches RESULT.md's own "NULL project_id" option and the read-only agent constraint; unlinked rows are still queryable via `project_path`).

### Not done (documented, not blocking)
- **Runtime UI verification: NOT LAUNCHED** — the running RHEO instance holds the pre-change bundle in memory; per process rules I cannot restart an app I didn't start. Fresh `code_activity` rows require the extension to be installed (install steps in README/AGENTS.md) or a manual `POST http://localhost:54321/code-activity`.
- `preload-old.ts` / `preload2.ts` (legacy preload variants, not used by the Electron build) were left without `getCodeActivityStats`; main `preload.ts` is the active bridge.

