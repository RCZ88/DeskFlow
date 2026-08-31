# File Locking & Conflict Prevention System

## Raw Request

"how can we make sure that running parallel agents editing the same file wont cause corruption or any case related to anything with destroying the files or like restoring it to the previous versions or deleting most of the stuff on the file? HOW IS THE CONFIGURATION SYSTEM FOR THAT?"

## Problem Statement

Two AI agents (opencode/claude) can edit the same file simultaneously. The current "locking" system is post-hoc (acquired AFTER the write), in-memory only (lost on restart), and informational only (never blocks writes). The result: silent file corruption, lost work, and no recovery path.

**What exists:** Post-hoc lock detection (cosmetic), touched_files audit (grows unbounded), terminal_bindings (missing column), cross-session config (disconnected from backend).

**What's needed:** Pre-edit locking that actually prevents concurrent writes, persistence across restarts, automatic backup before edits, and a recovery mechanism.

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` — VERBATIM source code for all broken subsystems.

---

## Engineering Tasks

### Task A — Pre-Edit Lock Acquisition

**File:** `src/main.ts`

**Problem:** Locks are acquired AFTER the agent writes. Both concurrent writes succeed.

**Fix:** Create a new IPC `pre-acquire-file-lock` that agents call BEFORE editing:

```typescript
ipcMain.handle('pre-acquire-file-lock', async (_event, data: {
  filePath: string;
  terminalId: string;
  sessionId?: string;
  timeoutMs?: number;
}) => {
  const { filePath, terminalId, sessionId, timeoutMs = 30000 } = data;
  
  // Check for existing lock by OTHER terminal
  const existing = fileLocks.get(filePath);
  if (existing && existing.terminalId !== terminalId) {
    if (Date.now() - existing.acquiredAt < LOCK_TTL_MS) {
      // Another terminal holds the lock — BLOCK this edit
      return {
        acquired: false,
        heldBy: existing.terminalId,
        heldSince: existing.acquiredAt,
        message: `File locked by terminal ${existing.terminalId}. Wait or coordinate.`,
      };
    }
    // Lock expired — clear it
    fileLocks.delete(filePath);
  }
  
  // Acquire lock with extended TTL for pre-edit
  fileLocks.set(filePath, {
    filePath,
    terminalId,
    sessionId,
    action: 'pre-edit',
    acquiredAt: Date.now(),
    ttlMs: timeoutMs,  // Allow longer lock for pre-edit
  });
  
  return { acquired: true, ttlMs: timeoutMs };
});
```

Also add `release-pre-lock` that downgrades to a shorter post-edit lock:

```typescript
ipcMain.handle('release-pre-lock', async (_event, data: { filePath: string; terminalId: string }) => {
  const lock = fileLocks.get(data.filePath);
  if (lock && lock.terminalId === data.terminalId && lock.action === 'pre-edit') {
    // Downgrade to post-edit lock (shorter TTL)
    lock.action = 'post-edit';
    lock.acquiredAt = Date.now();
    lock.ttlMs = 30000;
  }
  return { success: true };
});
```

### Task B — Lock Persistence to DB

**File:** `src/main.ts`

**Problem:** Locks are in-memory only. Lost on app restart.

**Fix:** Write locks to a `file_locks` table:

```sql
CREATE TABLE IF NOT EXISTS file_locks (
  file_path TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  session_id TEXT,
  action TEXT DEFAULT 'edit',
  acquired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (file_path)
);
```

On acquire: INSERT OR REPLACE into `file_locks`.
On release: DELETE from `file_locks`.
On startup: sweep expired locks (WHERE expires_at < datetime('now')).
In `acquireLock`: check DB first if in-memory map is empty (cold start).

### Task C — Connect TTL Config

**File:** `src/main.ts`

**Problem:** `lockTTL` in `crossSessionSyncRuntimeConfig` is never read. `LOCK_TTL_MS` is hardcoded to 60000.

**Fix:**

```typescript
// Replace hardcoded LOCK_TTL_MS
function getLockTTL(): number {
  return (crossSessionSyncRuntimeConfig.lockTTL || 60) * 1000; // Config is in seconds
}

// Use getLockTTL() everywhere instead of LOCK_TTL_MS
```

Also fix the `save-terminal-binding` handler to read the config:

```typescript
// When saving binding, pass lockTTL from config
const ttl = getLockTTL();
```

### Task D — Add session_context Column

**File:** `src/main.ts`

**Problem:** Code references `session_context` column that doesn't exist. SQL errors on every save.

**Fix:** Add guarded migration:

```typescript
try {
  db.exec('ALTER TABLE terminal_bindings ADD COLUMN session_context TEXT');
} catch (_e) { /* column already exists */ }
```

### Task E — Git Auto-Commit Before Agent Edits

**File:** `src/main.ts`

**Problem:** No git protection. Agent edits can corrupt files with no recovery path.

**Fix:** Add a pre-edit git snapshot:

```typescript
async function gitSnapshotBeforeEdit(filePath: string, terminalId: string): Promise<string | null> {
  try {
    const { execSync } = require('child_process');
    const gitDir = execSync('git rev-parse --show-toplevel', { cwd: path.dirname(filePath), encoding: 'utf-8' }).trim();
    
    // Stash only the specific file
    execSync(`git add "${filePath}"`, { cwd: gitDir });
    const stashResult = execSync(`git stash push -m "agent-lock:${terminalId}:${Date.now()}" -- "${filePath}"`, { cwd: gitDir, encoding: 'utf-8' });
    
    // Return stash ref for potential restore
    const stashMatch = stashResult.match(/stash@\{(\d+)\}/);
    return stashMatch ? `stash@{${stashMatch[1]}}` : null;
  } catch {
    return null; // Not a git repo or git not available — best-effort
  }
}

async function gitRestoreOnCorrupt(filePath: string, stashRef: string): Promise<boolean> {
  try {
    const { execSync } = require('child_process');
    const gitDir = execSync('git rev-parse --show-toplevel', { cwd: path.dirname(filePath), encoding: 'utf-8' }).trim();
    execSync(`git stash pop ${stashRef}`, { cwd: gitDir });
    return true;
  } catch {
    return false;
  }
}
```

Wire into `pre-acquire-file-lock`: before acquiring, call `gitSnapshotBeforeEdit`. Store stash ref in lock record. On conflict detection, offer restore.

### Task F — Build Mutex

**File:** `scripts/build.mjs`

**Problem:** Parallel builds corrupt shared output directory.

**Fix:** Add PID file lock:

```javascript
import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.join(process.cwd(), '.build-lock');

function acquireBuildLock() {
  try {
    const existing = fs.readFileSync(LOCK_FILE, 'utf-8').trim();
    const pid = parseInt(existing);
    if (pid && !isNaN(pid)) {
      try {
        process.kill(pid, 0); // Check if process exists
        console.error(`Build already in progress (PID ${pid}). Wait or kill it.`);
        process.exit(1);
      } catch {
        // Process doesn't exist — stale lock, remove it
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch {}
  
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  
  // Cleanup on exit
  process.on('exit', () => {
    try { fs.unlinkSync(LOCK_FILE); } catch {}
  });
  process.on('SIGINT', () => {
    try { fs.unlinkSync(LOCK_FILE); } catch {}
    process.exit(1);
  });
}

acquireBuildLock();
// ... rest of build script
```

### Task G — touched_files Cleanup

**File:** `src/main.ts`

**Problem:** touched_files grows unbounded. No TTL, no cleanup.

**Fix:** Add cleanup on startup and periodic sweep:

```typescript
// On startup: delete rows older than 7 days
db.exec("DELETE FROM touched_files WHERE timestamp < datetime('now', '-7 days')");

// Periodic sweep every hour
setInterval(() => {
  db.exec("DELETE FROM touched_files WHERE timestamp < datetime('now', '-7 days')");
}, 3600000);
```

Also fix the INSERT to populate `project_path`:

```typescript
// In detectEditsInOutput, look up project from terminal binding
const binding = db.prepare('SELECT project_id FROM terminal_bindings WHERE terminal_id = ?').get(terminalId) as any;
const projectPath = binding?.project_id ? db.prepare('SELECT path FROM projects WHERE id = ?').get(binding.project_id)?.path : null;

db.prepare('INSERT INTO touched_files (terminal_id, session_id, file_path, action, project_path) VALUES (?, ?, ?, ?, ?)').run(
  terminalId, sessionId || null, filePath, result.acquired ? 'edit' : 'conflict', projectPath || null
);
```

### Task H — Preload Bridge + Types

**File:** `src/preload.ts`, `src/types/deskflow-api.d.ts`

Add bridges:

```typescript
preAcquireFileLock: (data: { filePath: string; terminalId: string; sessionId?: string; timeoutMs?: number }) =>
  ipcRenderer.invoke('pre-acquire-file-lock', data),
releasePreLock: (data: { filePath: string; terminalId: string }) =>
  ipcRenderer.invoke('release-pre-lock', data),
gitSnapshotBeforeEdit: (filePath: string) =>
  ipcRenderer.invoke('git-snapshot-before-edit', filePath),
```

Add types:

```typescript
preAcquireFileLock: (data: { filePath: string; terminalId: string; sessionId?: string; timeoutMs?: number }) => Promise<{ acquired: boolean; heldBy?: string; heldSince?: number; ttlMs?: number; message?: string }>;
releasePreLock: (data: { filePath: string; terminalId: string }) => Promise<{ success: boolean }>;
```

---

## Constraints

- No new npm dependencies (use Node.js built-in `child_process` for git)
- All locks are BEST-EFFORT (git may not be available)
- Pre-edit lock timeout must be configurable (default 30s)
- Build mutex must not block development (stale lock detection after 5 min)
- touched_files cleanup must not run during active queries
- Git snapshot is per-file, not per-repo (fast, minimal overhead)
- Lock persistence must handle app crash (sweep on startup)
