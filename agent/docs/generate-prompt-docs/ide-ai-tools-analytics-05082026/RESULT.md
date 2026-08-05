# RESULT.md — IDE Page: AI Tools Heatmap Fix + Analytics Code Changes + Mojibake

**TO:** Implementer AI  
**FROM:** Design AI  
**SUBJECT:** End-to-end Engineering Specs for DeskFlow IDE Page (Round 2026-08-05)  

---

## 1. FEATURE A: Usage Pattern Heatmap Fix (AI Tools Tab)

### 1.1 Root Cause Analysis
The heatmap silently vanishes when `heatmapToolFilter` is `'all'` and `period` is `'all'` (All Time). 

**The Mismatch:**
1. The agent list (`aiAgents`) is derived preferentially from `workspaceAnalytics?.aiUsage?.byTool` (`AIToolsTab.tsx:312-315`). This source (`get-ai-usage-summary`) **does not contain** the `daily` key.
2. The heatmap renderer reads **only** `overview?.aiUsage?.byTool[agent.id]?.daily` (`AIToolsTab.tsx:1948-1960`).
3. When switching to "All Time", `effectiveAiPeriod` becomes `'all'`. If `overview` is stale, fails to load, or returns an empty object due to a race condition with `workspaceAnalytics`, `overview?.aiUsage?.byTool` lacks the `daily` data.
4. The heatmap loop iterates `filteredAgents` (populated from `workspaceAnalytics`), finds no `daily` keys, `allDateStrs.size` remains `0`, and the component hits early return `(iii)` (`if (allDateStrs.size === 0) return null`), rendering nothing.

### 1.2 Renderer-Side Fix & Hardening
**Hard Invariant:** Never silently return `null` for a data visualization component. 

**Fix in `src/components/ai/AIToolsTab.tsx` (~line 1943):**
Replace the silent `return null` statements with a semantic empty state, and strictly filter the heatmap agents to only those that actually possess `daily` data in the current `overview` snapshot.

```tsx
// Inside the Usage Pattern Heatmap IIFE
const byTool = overview?.aiUsage?.byTool || {}

// HARDENING: Filter agents to ONLY those with actual daily data in the current overview snapshot
const heatmapAgents = activeAgents.filter(
  a => byTool[a.id]?.daily && Object.keys(byTool[a.id].daily).length > 0
)

if (heatmapAgents.length === 0 || !overview) {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl !p-5 flex flex-col items-center justify-center min-h-[200px] text-center">
      <CalendarDays className="w-8 h-8 text-zinc-500 mb-2" />
      <p className="text-sm text-zinc-400 font-medium">No daily usage data available</p>
      <p className="text-[10px] text-zinc-500 mt-1">Try selecting a specific tool or refreshing the data.</p>
    </div>
  )
}

// Use heatmapAgents instead of filteredAgents for the dateMap loop
const selectedHeatmapTool = heatmapToolFilter
const filteredAgents = selectedHeatmapTool === 'all'
  ? heatmapAgents
  : heatmapAgents.filter(a => a.id === selectedHeatmapTool)

if (filteredAgents.length === 0) {
   return (
     <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl !p-5 text-center text-sm text-zinc-500">
       No data for the selected tool filter.
     </div>
   )
}
```

### 1.3 Verification Steps
1. Open `/ide` → AI Tools tab.
2. Set global period to **30 Days**, heatmap filter to **All**. Assert grid renders.
3. Toggle time-lock to **All Time** (`effectiveAiPeriod = 'all'`). Assert grid renders with full history (no vanish).
4. Switch heatmap filter to an individual tool. Assert grid renders.
5. Check React DevTools: `overview` state must update when `effectiveAiPeriod` changes.

---

## 2. FEATURE B: Code-Change Analytics (Analytics Dashboard)

### 2.1 Backend Spec (`src/main.ts`)
**Kill the hardcoded 30-day bug** in `get-ide-projects-overview` and create a dedicated handler for code metrics.

**New IPC Channel:** `get-code-change-stats`  
**Preload (`src/preload.ts`):**
```ts
getCodeChangeStats: (period?: string, dateOffset?: number, projectId?: string) => 
  ipcRenderer.invoke('get-code-change-stats', period, dateOffset, projectId),
```

**Handler Implementation (`src/main.ts`):**
```ts
electron_1.ipcMain.handle('get-code-change-stats', (event, period = 'week', dateOffset = 0, projectId) => {
    if (useJson) return { totalCommits: 0, totalAdditions: 0, totalDeletions: 0, totalHours: 0, daily: [], weekly: [] };
    try {
        let sinceDateStr: string | null = null;
        // ... (reuse period/dateOffset logic from get-ai-usage-summary to calculate sinceDateStr. 'all' = null) ...
        
        let whereClause = '';
        const params: any[] = [];
        const conditions: string[] = [];
        if (sinceDateStr) conditions.push(`date >= ?`);
        if (projectId) conditions.push(`project_id = ?`);
        if (conditions.length > 0) {
            whereClause = `WHERE ${conditions.join(' AND ')}`;
            if (sinceDateStr) params.push(sinceDateStr);
            if (projectId) params.push(projectId);
        }

        // 1. Daily Series
        const daily = db.prepare(`
            SELECT date, SUM(additions) as additions, SUM(deletions) as deletions, COUNT(*) as commits
            FROM commits ${whereClause} GROUP BY date ORDER BY date ASC
        `).all(...params);

        // 2. Totals
        const totals = db.prepare(`
            SELECT COUNT(*) as totalCommits, SUM(additions) as totalAdditions, SUM(deletions) as totalDeletions
            FROM commits ${whereClause}
        `).get(...params) as any;

        // 3. Hours Derivation Rule (JS side)
        // Cluster by day. Base 2 hours per active day + 1 hour per commit, capped at 8 hours/day.
        let totalHours = 0;
        for (const day of daily) {
            totalHours += Math.min(2 + (day.commits || 0), 8);
        }

        // 4. Weekly Aggregates (JS side grouping by ISO week start)
        const weeklyMap = new Map<string, { additions: number, deletions: number, commits: number }>();
        for (const day of daily) {
            const d = new Date(day.date);
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday start
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!weeklyMap.has(weekKey)) weeklyMap.set(weekKey, { additions: 0, deletions: 0, commits: 0 });
            const w = weeklyMap.get(weekKey)!;
            w.additions += day.additions || 0;
            w.deletions += day.deletions || 0;
            w.commits += day.commits || 0;
        }
        const weekly = Array.from(weeklyMap.entries()).map(([weekStart, data]) => ({ weekStart, ...data }));

        return {
            totalCommits: totals?.totalCommits || 0,
            totalAdditions: totals?.totalAdditions || 0,
            totalDeletions: totals?.totalDeletions || 0,
            totalHours,
            daily,
            weekly
        };
    } catch (err) {
        return { totalCommits: 0, totalAdditions: 0, totalDeletions: 0, totalHours: 0, daily: [], weekly: [] };
    }
});
```

### 2.2 Frontend Spec (`src/components/AnalyticsDashboard.tsx`)
Add a new "Code Changes" section immediately after the "AI Usage Summary" card.

**Data Fetching:**
In `IDEProjectsPage.tsx` and `TerminalWorkspacePage.tsx`, add `getCodeChangeStats` to the composite fetch. Pass `codeStats` to `AnalyticsDashboard`.

**UI Components:**
1. **Summary Row (3 Stat Cards):**
   - Total Commits (`GitCommitHorizontal` icon, cyan `#22d3ee`)
   - Net Lines (`totalAdditions - totalDeletions`) (`Code2` icon, emerald/rose based on sign)
   - Hours Coded (`Clock` icon, amber `#f59e0b`)
2. **Chart Card (Glass card `bg-zinc-900/60 ... !p-5`):**
   - **Header:** "Code Velocity" with toggle chips: `Daily` | `Weekly`.
   - **Chart Type:** Stacked Bar Chart (Chart.js).
   - **Datasets:** Additions (emerald `#10b981`), Deletions (rose `#f87171` absolute values).
   - **Chart Options Pattern:**
     ```ts
     options: {
       responsive: true, maintainAspectRatio: false,
       scales: {
         x: { stacked: true, grid: { display: false }, ticks: { color: '#71717a', font: { size: 9 } } },
         y: { stacked: true, grid: { color: 'rgba(113,113,122,0.06)' }, border: { color: 'rgba(113,113,122,0.12)' }, ticks: { color: '#71717a', font: { size: 9 }, padding: 6 } }
       },
       plugins: { legend: { display: false } }
     }
     ```

**States:**
- **Empty:** `GitCommitHorizontal` icon + "No commits synced yet. Run 'Sync Commits' from project settings to track code changes."
- **Loading:** Standard skeleton block matching card dimensions.
- **Error:** Inline red text "Failed to load commit data."

---

## 3. FEATURE C: Mojibake Repair (Problems & Requests)

### 3.1 Decode Algorithm (Main Process & JSON)
Double-encoded UTF-8 occurs when UTF-8 bytes are interpreted as Latin-1 and re-encoded. 
**Rule:** Fix this in the **Main Process** during sync, never in the renderer alone.

**Node.js Utility (`src/lib/mojibake.ts`):**
```ts
export function repairDoubleEncodedUtf8(str: string): string {
  if (!str || typeof str !== 'string') return str;
  try {
    // Heuristic: if it contains common mojibake sequences, attempt repair
    if (/[Ã¢Â€Â¦Ã©Ã§Ã«Ã¯Ã´Ã»]/.test(str) || str.includes('â€')) {
      const bytes = Buffer.from(str, 'latin1');
      const decoded = bytes.toString('utf8');
      // Verify it didn't turn into garbage replacement chars
      if (decoded && !decoded.includes('ï¿½')) return decoded;
    }
  } catch {}
  return str;
}
```

**JSON Repair:**
When reading `agent/problems.json` and `agent/requests.json` in the sync IPC, recursively walk the parsed object and apply `repairDoubleEncodedUtf8` to all string values before upserting to DB. Write the cleaned JSON back to disk (with `.bak` timestamp backup).

**DB Migration (One-time on startup):**
```ts
// In main.ts initialization
const tables = ['workspace_problems', 'problems', 'requests'];
for (const table of tables) {
  try {
    const rows = db.prepare(`SELECT id, title, description FROM ${table}`).all();
    const updateStmt = db.prepare(`UPDATE ${table} SET title = ?, description = ? WHERE id = ?`);
    for (const row of rows) {
      const cleanTitle = repairDoubleEncodedUtf8(row.title);
      const cleanDesc = repairDoubleEncodedUtf8(row.description);
      if (cleanTitle !== row.title || cleanDesc !== row.description) {
        updateStmt.run(cleanTitle, cleanDesc, row.id);
      }
    }
  } catch {}
}
```

### 3.2 Render-Time Guard (Renderer Util)
Add a lightweight sanitizer in `src/lib/sanitize.ts` to catch any future edge cases that bypass the main process.

```ts
export function sanitizeMojibake(text: string): string {
  if (!text) return '';
  return text
    .replace(/â€/g, '”').replace(/â€œ/g, '“').replace(/â€/g, '”')
    .replace(/â€˜/g, '‘').replace(/â€™/g, '’').replace(/â€"/g, '—')
    .replace(/â€¦/g, '…').replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è')
    .replace(/Ãª/g, 'ê').replace(/Ã«/g, 'ë').replace(/Ã/g, 'à')
    .replace(/Ã®/g, 'î').replace(/Ã¯/g, 'ï').replace(/Ã´/g, 'ô')
    .replace(/Ã¶/g, 'ö').replace(/Ã¼/g, 'ü').replace(/Ã§/g, 'ç');
}
```
**Integration:** Wrap all problem/request title and description renders in `ProblemsTab.tsx`, `IssuesWorkspace.tsx`, `badges.tsx`, and `AnalyticsDashboard.tsx` (Problems Progress card) with `{sanitizeMojibake(item.title)}`.

---

## 4. RESEARCH ANSWER: File Access & Extension Strategy

**How the app accesses files and changes today:**
The desktop app accesses file changes exclusively via the **local filesystem** using the `git` CLI (`sync-commits` IPC). It reads the `.git` directories of projects registered in the `projects` table. The browser extension runs in a sandboxed environment and **cannot** access local file systems or git repositories directly due to browser security models.

**What changes are needed (The Strategy):**
1. **Desktop Side (Source of Truth):** The desktop app must remain the sole ingester of git metrics. 
   - *Change:* Implement a background scheduler in `main.ts` to run `sync-commits` every 4 hours.
   - *Change:* Add a file watcher (`chokidar`) on active project `.git/HEAD` and `.git/refs/heads/` directories to trigger real-time `sync-commits` when local commits occur.
2. **Extension Side:** The extension should **not** attempt to read local git files. 
   - *Change:* If the user operates in web-based IDEs (GitHub Codespaces, Gitpod), the extension can intercept network requests to the GitHub API (`/repos/.../commits`) or use the web IDE's exposed APIs to push commit events to the desktop app via the existing `browser-extension/` messaging bridge. For local development, the extension relies entirely on the desktop app's background sync.

---

## 5. VERIFICATION CHECKLIST

### Feature A (Heatmap)
- [ ] **UI:** `/ide` -> AI Tools -> Time Lock ON (All Time) + Filter "All" -> Heatmap renders (no blank space).
- [ ] **Console:** No silent `null` returns; verify empty state renders if data is genuinely missing.
- [ ] **Regression:** 30-day mode + individual tool filter still renders correctly.

### Feature B (Code Analytics)
- [ ] **Build:** `npx vite build` exits 0. `dist-electron/preload.cjs` > 1KB.
- [ ] **DB:** Query `SELECT * FROM commits` via SQLite browser to verify data exists.
- [ ] **UI:** Analytics dashboard shows "Code Velocity" card. Toggle Daily/Weekly. Chart renders with emerald/rose bars.
- [ ] **Empty State:** Delete `commits` table rows (in dev DB) -> Assert CTA "No commits synced yet" appears.

### Feature C (Mojibake)
- [ ] **DB:** Run app. Check `workspace_problems` table -> verify `â€"` is now `—` and `Ã©` is `é`.
- [ ] **UI:** Open Problems tab. Verify red "AI Attempted Fix" cards display clean typography (no cursed letters).
- [ ] **JSON:** Check `agent/problems.json` file modification date; verify content is clean UTF-8 and a `.bak` file was created.