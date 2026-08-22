# CONTEXT_BUNDLE.md — Cross-Session Context Awareness

> VERBATIM source code. Target AI reads this FIRST.

---

## 1. compileSyncSummary IPC (main.ts:27818-27880)

```typescript
electron_1.ipcMain.handle('compile-sync-summary', async (_event, terminalId: string) => {
  if (!db) return { success: false, summary: 'Database not ready', error: 'Database not ready' };
  try {
    const lines: string[] = [];
    const requesterBinding = db.prepare('SELECT session_id FROM terminal_bindings WHERE terminal_id = ?').get(terminalId) as any;
    const requesterSessionId = requesterBinding?.session_id || null;
    const otherBindings = db.prepare('SELECT * FROM terminal_bindings WHERE terminal_id != ? AND status != ?').all(terminalId, 'closed') as any[];
    
    if (otherBindings.length === 0) {
      return { success: true, summary: 'No other active sessions. You are the only agent working.' };
    }

    lines.push(`## Cross-Session Sync Summary\n`);
    lines.push(`Other active sessions: ${otherBindings.length}\n`);

    for (const binding of otherBindings) {
      const tid = binding.terminal_id;
      const sessionId = binding.session_id;
      lines.push(`### Terminal: ${tid}${sessionId ? ` (Session: ${sessionId})` : ''}`);
      
      if (binding.active_problem_id) {
        const problem = db.prepare('SELECT title, description FROM workspace_problems WHERE id = ?').get(binding.active_problem_id) as any;
        if (problem) lines.push(`  Active Problem: ${problem.title} — ${problem.description || 'no description'}`);
      }
      
      if (binding.session_context) {
        try {
          const ctx = JSON.parse(binding.session_context);
          if (ctx.requests?.length) lines.push(`  Requests: ${ctx.requests.join(', ')}`);
          if (ctx.problems?.length) lines.push(`  Problems referenced: ${ctx.problems.join(', ')}`);
        } catch {}
      }
    }

    // Recent file changes by other terminals
    const recentChanges = db.prepare(`
      SELECT DISTINCT file_path, terminal_id, MAX(timestamp) as last_touched
      FROM touched_files
      WHERE terminal_id != ?
      GROUP BY file_path ORDER BY last_touched DESC LIMIT 10
    `).all(terminalId) as any[];
    
    if (recentChanges.length) {
      lines.push(`\n### Files Recently Modified by Other Agents`);
      for (const f of recentChanges) {
        lines.push(`  ${f.file_path} (by ${f.terminal_id})`);
      }
    }

    // Locks held by other terminals
    const otherLocks = getAllLocks().filter(l => l.terminalId !== terminalId);
    if (otherLocks.length) {
      lines.push(`\n### Currently Locked Files (by others)`);
      for (const l of otherLocks) {
        lines.push(`  ${l.filePath} (locked by ${l.terminalId})`);
      }
    }

    return { success: true, summary: lines.join('\n') };
  } catch (error: any) {
    return { success: false, summary: '', error: error.message };
  }
});
```

---

## 2. broadcast-context-delta IPC (main.ts:27882-27897)

```typescript
electron_1.ipcMain.handle('broadcast-context-delta', async (_event, data: { terminalId: string; type: string; payload: any }) => {
  const windows = require('electron').BrowserWindow.getAllWindows();
  let sentCount = 0;
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('context-changed', {
        type: data.type,
        action: 'broadcast',
        source: data.terminalId,
        payload: data.payload,
        timestamp: Date.now(),
      });
      sentCount++;
    }
  }
  return { success: true, sentCount };
});
```

---

## 3. Cross-Session Conflict Listener (TerminalPage.tsx:877-891)

```typescript
// Cross-session conflict listener + notification
useEffect(() => {
  if (!window.deskflowAPI?.onFileConflict) return;
  const unsub = window.deskflowAPI.onFileConflict((data) => {
    setFileConflicts(prev => [...prev.slice(-9), { ...data, timestamp: Date.now() }]);
    setTerminalError(`Conflict: ${data.requestingTerminal} wants to edit ${data.filePath} (locked by ${data.lockingTerminal})`);
    setTerminalErrorType('warning');

    if (crossSessionSyncEnabled && data.requestingTerminal === activeTerminalId && window.deskflowAPI?.terminalWrite) {
      const msg = `[System: Conflict — ${data.filePath} is locked by ${data.lockingTerminal}. Wait for lock to expire (~60s) or coordinate with that session.]`;
      window.deskflowAPI.terminalWrite(activeTerminalId, msg + '\r\n');
    }
  });
  return unsub;
}, [activeTerminalId, crossSessionSyncEnabled]);
```

---

## 4. Context Sync Listener (TerminalPage.tsx:893-919)

```typescript
// Context sync listener — refresh + notify other terminals
useEffect(() => {
  if (!window.deskflowAPI?.onContextChanged) return;
  const unsub = window.deskflowAPI.onContextChanged((data) => {
    // Handle page navigation context updates
    if (data.type === 'page' && data.action === 'navigated') {
      const pageName = data.entity?.page === '/' ? 'Dashboard' : (data.entity?.page || '').replace('/', '');
      if (pageName && activeTerminalId && window.deskflowAPI?.terminalWrite) {
        const msg = `[System: User navigated to ${pageName} page. Context updated.]\r\n`;
        window.deskflowAPI.terminalWrite(activeTerminalId, msg);
      }
      return;
    }

    if (data.source && data.source !== activeTerminalId && (data.type === 'problems' || data.type === 'requests')) {
      if (data.action === 'broadcast') {
        loadAllProblems?.();
        loadAllRequests?.();

        if (crossSessionSyncEnabled && window.deskflowAPI?.terminalWrite) {
          const typeLabel = data.type === 'problems' ? 'problem' : 'request';
          const actionLabel = data.action === 'created' ? 'created' : data.action === 'updated' ? 'updated' : 'modified';
          const title = data.entity?.title ? ` "${data.entity.title}"` : '';
          const msg = `[System: ${data.source} ${actionLabel} ${typeLabel}${title}. Run /sync for full context.]`;
          window.deskflowAPI.terminalWrite(activeTerminalId, msg + '\r\n');
        }
      }
    }
  });
  return unsub;
}, [activeTerminalId, crossSessionSyncEnabled]);
```

---

## 5. /sync Command Handler (TerminalPage.tsx:1424-1438)

```typescript
// /sync command — compile cross-session context summary
if (config.prompt.trim().toLowerCase() === '/sync') {
  const syncResult = await window.deskflowAPI.compileSyncSummary(resolvedTargetId);
  if (syncResult?.success && syncResult.summary) {
    const agentType = config.agent || existingSession?.agent || 'claude';
    const sendResult = await window.deskflowAPI.agentSend?.(resolvedTargetId, syncResult.summary, agentType);
    if (sendResult && !sendResult.success) {
      showError(`Sync write failed: ${sendResult.error || 'Unknown'}`, 'error');
    } else {
      showError('Cross-session context synced', 'info');
    }
  } else {
    showError(syncResult?.error || 'Sync failed', 'error');
  }
  return;
}
```

---

## 6. Cross-Session Sync Config (TerminalPage.tsx:647-648, 3308-3311)

```typescript
// State
const [crossSessionSyncEnabled, setCrossSessionSyncEnabled] = useState(() => {
  return localStorage.getItem('cross-session-sync-enabled') !== 'false';
});

// UI toggle (in config panel)
<toggle
  label="Cross-Session Sync"
  value={crossSessionSyncEnabled}
  onChange={(v) => {
    setCrossSessionSyncEnabled(v);
    localStorage.setItem('cross-session-sync-enabled', String(v));
  }}
/>
```

---

## 7. Touched Files Tracking (TerminalPage.tsx:940-969)

```typescript
// Periodic touched files refresh
useEffect(() => {
  if (!window.deskflowAPI?.getTouchedFiles || !crossSessionSyncEnabled) { setTouchedFiles([]); return; }
  const refresh = () => {
    window.deskflowAPI!.getTouchedFiles!({ limit: 10 }).then((result) => {
      setTouchedFiles(result?.data || []);
    }).catch(() => {});
  };
  refresh();
  const interval = setInterval(refresh, 10000);
  return () => clearInterval(interval);
}, [crossSessionSyncEnabled]);
```

---

## 8. terminal_bindings Table Schema (main.ts)

```sql
CREATE TABLE IF NOT EXISTS terminal_bindings (
  terminal_id TEXT PRIMARY KEY,
  session_id TEXT,
  active_problem_id TEXT,
  session_context TEXT,  -- JSON: { requests: string[], problems: string[] }
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 9. touched_files Table Schema (main.ts)

```sql
CREATE TABLE IF NOT EXISTS touched_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_touched_files_terminal ON touched_files(terminal_id);
CREATE INDEX IF NOT EXISTS idx_touched_files_path ON touched_files(file_path);
```

---

## 10. assemble-context IPC (main.ts:15399) — ALREADY EXTENDED

The assemble-context handler now accepts `page?: string` and injects page-specific context. This was implemented in the previous cycle. The handler signature is:

```typescript
ipcMain.handle('assemble-context', async (_event, data: {
  projectId: string;
  problemIds?: string[];
  requestIds?: string[];
  tokenBudget?: number;
  topic?: string;
  sessionId?: string;
  page?: string;  // NEW: page context
}) => { ... })
```

---

## 11. Key State Variables in TerminalPage

```typescript
const [crossSessionSyncEnabled, setCrossSessionSyncEnabled] = useState(() => {
  return localStorage.getItem('cross-session-sync-enabled') !== 'false';
});
const [fileConflicts, setFileConflicts] = useState<Array<{
  filePath: string; requestingTerminal: string; lockingTerminal: string;
  timestamp: number;
}>>([]);
const [touchedFiles, setTouchedFiles] = useState<Array<{
  file_path: string; terminal_id: string; timestamp: string;
}>>([]);
```

---

## 12. Known Gaps (what does NOT exist yet)

1. **No auto-injection of other sessions' context at session start** — assemble-context only injects project-wide data (problems, requests, brain, memory), NOT what other terminal sessions are currently doing
2. **`/sync` is manual** — agents never auto-run it; the notification says "Run /sync" but the agent has to know to do that
3. **No real-time activity stream** — no live feed of "Session B just modified file X" or "Session B sent a message"
4. **No session message history sharing** — Session A can't see Session B's recent terminal output
5. **No cross-session page context** — if Session A is on Finance page and Session B is on Dashboard, neither knows about the other's page context
6. **compileSyncSummary only includes terminal_bindings + touched_files + locks** — does NOT include other sessions' recent messages, current page context, or active file changes in real-time
7. **context-changed only fires for problems/requests** — not for file edits, terminal messages, or page navigation
