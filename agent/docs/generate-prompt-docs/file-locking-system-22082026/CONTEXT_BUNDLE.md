# CONTEXT_BUNDLE.md — File Locking & Conflict Prevention

> VERBATIM source code for the broken file locking system.

---

## 1. File Lock Manager (main.ts:12660-12716)

```typescript
const LOCK_TTL_MS = 60000; // 60 seconds — HARDCODED, ignores UI config

interface LockRecord {
  filePath: string;
  terminalId: string;
  sessionId?: string;
  action?: string;
  acquiredAt: number;
}

const fileLocks = new Map<string, LockRecord>();

function acquireLock(filePath: string, terminalId: string, sessionId?: string, action?: string): { acquired: boolean; heldBy?: string } {
  const existing = fileLocks.get(filePath);
  if (existing) {
    if (existing.terminalId === terminalId) {
      // Same terminal — re-acquire (refresh TTL)
      fileLocks.set(filePath, { filePath, terminalId, sessionId, action, acquiredAt: Date.now() });
      return { acquired: true };
    }
    if (Date.now() - existing.acquiredAt < LOCK_TTL_MS) {
      // Different terminal, lock still valid — REJECT
      return { acquired: false, heldBy: existing.terminalId };
    }
    // Lock expired — delete and re-acquire
    fileLocks.delete(filePath);
  }
  fileLocks.set(filePath, { filePath, terminalId, sessionId, action, acquiredAt: Date.now() });
  return { acquired: true };
}

function releaseLock(filePath: string, terminalId: string): boolean {
  const existing = fileLocks.get(filePath);
  if (existing && existing.terminalId === terminalId) {
    fileLocks.delete(filePath);
    return true;
  }
  return false;
}

function releaseAllLocksForTerminal(terminalId: string): void {
  for (const [key, lock] of fileLocks.entries()) {
    if (lock.terminalId === terminalId) fileLocks.delete(key);
  }
}

// Sweep expired locks every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, lock] of fileLocks.entries()) {
    if (now - lock.acquiredAt > LOCK_TTL_MS) fileLocks.delete(key);
  }
}, 60000);
```

**BUG:** Locks are POST-HOC (acquired after agent writes), in-memory only (lost on restart), TTL is hardcoded (ignores UI config).

---

## 2. detectEditsInOutput (main.ts:12719-12762)

```typescript
function detectEditsInOutput(data: string, terminalId: string, sessionId?: string): void {
  const FILE_VERB_RE = /(?:wrote|saved|written|modified|created|updated|writes? to|edits?)\s+`?(?:\.\/)?([^\s`'"()]+\.[a-zA-Z]+)/gi;
  let match;
  while ((match = FILE_VERB_RE.exec(data)) !== null) {
    const filePath = match[1];
    const result = acquireLock(filePath, terminalId, sessionId, 'edit');
    if (!result.acquired) {
      // Broadcast conflict to all windows
      if (mainWindow) {
        mainWindow.webContents.send('file:conflict', {
          filePath,
          requestingTerminal: terminalId,
          lockingTerminal: result.heldBy,
        });
      }
    }
    // Record in touched_files
    try {
      db!.prepare('INSERT INTO touched_files (terminal_id, session_id, file_path, action) VALUES (?, ?, ?, ?)').run(
        terminalId, sessionId || null, filePath, result.acquired ? 'edit' : 'conflict'
      );
    } catch {}
  }
}
```

**BUG:** Regex parses PTY stdout AFTER the agent has already written the file. Lock is cosmetic — both concurrent writes succeed.

---

## 3. touched_files Table (main.ts:3256-3268)

```sql
CREATE TABLE IF NOT EXISTS touched_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_id TEXT NOT NULL,
  session_id TEXT,
  file_path TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'edit',
  project_path TEXT,  -- NEVER POPULATED (always NULL)
  timestamp TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_touched_files_terminal ON touched_files(terminal_id);
CREATE INDEX IF NOT EXISTS idx_touched_files_path ON touched_files(file_path);
```

**BUG:** `project_path` column exists but INSERT only provides 4 params — always NULL. No TTL, no cleanup, grows unbounded.

---

## 4. terminal_bindings Table (main.ts:2502-2516)

```sql
CREATE TABLE IF NOT EXISTS terminal_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_id TEXT NOT NULL UNIQUE,
  project_id TEXT,
  agent_type TEXT,
  session_id TEXT,
  active_problem_id TEXT,
  active_request_id TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**BUG:** Code at main.ts:24661 references `session_context` column that DOES NOT EXIST in this schema. Every save-terminal-binding call silently fails.

---

## 5. Cross-Session Sync Config (main.ts:14313-14319)

```typescript
let crossSessionSyncRuntimeConfig = {
  enabled: true,
  lockTTL: 300,               // NOT connected to LOCK_TTL_MS (60000)
  contextBroadcast: true,
  conflictWarningMode: 'both',
  syncCommand: true,
};
```

**BUG:** `lockTTL` is set to 300 but never read by the lock code (which uses hardcoded 60000).

---

## 6. File Conflict Listener (TerminalPage.tsx:878-891)

```typescript
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

**Note:** Listener exists but conflict is informational only — agent is never blocked from writing.

---

## 7. lockFile IPC (preload.ts:951-952)

```typescript
lockFile: (data: { filePath: string; terminalId: string }) =>
  ipcRenderer.invoke('lock-file', data),
```

**BUG:** This bridge exists but is NEVER CALLED by any renderer code. Zero call sites.

---

## 8. BackupService (BackupService.ts)

```typescript
// Database-only backup on 30-minute interval
// Does NOT back up project files
// Called on startup, quit, and every 30 min
```

**Note:** Only backs up SQLite DB, not project source files.

---

## 9. Build Script (scripts/build.mjs)

```javascript
// Linear pipeline: vite build -> esbuild preload -> esbuild services -> vite main lib
// NO mutex, NO PID file, NO concurrent build detection
// Two simultaneous builds will corrupt dist-electron/
```
