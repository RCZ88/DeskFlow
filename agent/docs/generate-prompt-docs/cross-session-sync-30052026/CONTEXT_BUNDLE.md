# Context Bundle: Cross-Session Conflict Detection & Context Sync

## Architecture Overview

The DeskFlow terminal system manages multiple AI agent sessions (opencode, claude, etc.) as node-pty subprocesses. Each session operates independently with NO awareness of other sessions. There is:

- **No file-locking mechanism** — Two agents can edit the same file simultaneously
- **No cross-session context sync** — If agent A creates a problem, agent B is never notified
- **No file→session tracking** — There is no registry of "which terminal edited which file"
- **No conflict detection** — Overlapping edits are silently lost

The `onContextChanged` listener (which wrote delta messages to the active terminal) was removed from current code — context delta push is disabled.

## Terminal System Architecture

### Main Process — `src/main.ts` (12,199 lines)

```
TerminalPage (renderer) ←IPC→ main.ts ←node-pty→ Shell subprocess
                                     ←Agent→ CLI process (opencode, claude, aider, codex)
```

### Terminal Manager (line 6176-6229)

```typescript
const terminalManager = {
  terminals: new Map<string, { id: string; pty: any; cwd: string }>(),
  spawn(id: string, cwd: string, cols: number, rows: number) { ... },
  write(id: string, data: string) { ... },
  resize(id: string, cols: number, rows: number) { ... },
  kill(id: string) { ... },
  getDataHandler(id: string, cb: (d: string) => void) { ... },
  getExitHandler(id: string, cb: (code: number, sig: string) => void) { ... },
};
```

- **No "active terminal" concept on main process side** — flat Map keyed by `terminalId`
- Active terminal is managed **only on renderer** (`TerminalPage.tsx` line 228)
- When a terminal is killed, its entry is deleted from `terminals` Map — no cleanup of any file locks

### Terminal Bindings DB Table — `terminal_bindings`

Created/updated by IPC handlers (lines 11748-11803):

```sql
CREATE TABLE terminal_bindings (
  terminal_id TEXT PRIMARY KEY,
  project_id TEXT,
  agent_type TEXT,
  status TEXT DEFAULT 'idle',
  active_problem_id TEXT,
  active_request_id TEXT,
  session_context TEXT,       -- JSON string: { problems, requests, skill }
  last_activity_at TEXT,
  created_at TEXT
);
```

### Terminal Sessions DB Table — `terminal_sessions`

```sql
CREATE TABLE terminal_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  agent TEXT,
  resume_id TEXT UNIQUE,
  terminal_id TEXT,
  topic TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  product_area TEXT,
  category TEXT,
  auto_tags TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### IPC Handlers (main.ts)

| Handler | Line | Description |
|---------|------|-------------|
| `terminal:create` | 6231 | Spawn PTY, register data/exit handlers, detect agent readiness |
| `terminals:write` | — | Write data to terminal stdin |
| `save-terminal-message` | ~7340 | Save message to `terminal_messages` table, triggers `parseAndExecuteActions` |
| `register-terminal` | 11748 | INSERT/REPLACE into `terminal_bindings` |
| `update-terminal-binding` | 11777 | UPDATE terminal_bindings with dynamic SET clause |
| `get-terminal-binding` | — | SELECT by terminal_id |
| `send-instructions-to-terminal` | ~11254 | Write to PTY + update binding |
| `unregister-terminal` | ~12185 | Set status='closed' (soft delete) |
| `route-prompt` | ~8490 | LLM-based session routing via OpenRouter |
| `save-terminal-session` | — | UPSERT into terminal_sessions |

### IPC Events (main → renderer)

| Event | Line | Payload | Description |
|-------|------|---------|-------------|
| `context-changed` | 7088, 7161, 7170, 7180, 7189, 10800, 10816, 10831, 11188, 11204, 11219, 11372, 11384, 11396 | `{ type, action, entity? }` | Fires from 16 locations when problems/requests/checklists change |
| `agent:ready` | 6268 | `{ terminalId }` | Agent detected as ready |
| `agent:timeout` | — | `{ terminalId, agentType }` | Agent init timed out |
| `terminal:data` | 6242 | `(terminalId, data)` | PTY output |
| `terminal:exit` | 6287 | `(terminalId, exitCode, signal)` | PTY exited |
| `terminal:ready` | 6298 | `(terminalId)` | PTY spawned |

## Terminal State Flow

### `parseAndExecuteActions` (line 7006-7090)

Called when agent outputs a `## Actions` block. Parses:
- `[create-problem] Title - priority: ...`
- `[update-problem] ID - status: ...`
- `[complete-checklist] ID`

At the end (line 7086-7089):
```typescript
if (mainWindow && !mainWindow.isDestroyed()) {
  mainWindow.webContents.send('context-changed', { type: 'problems', action: 'batch-processed' });
}
```

This fires a generic batch-processed event — **no entity details**, so the renderer can't construct a meaningful delta message for other terminals.

### `executeActionsFromFile` (line 7115-7217)

File watcher on `agent/actions.json`. Dispatches per-action `context-changed` events with full entity data (`{ id, title, status }`).

```typescript
mainWindow?.webContents?.send('context-changed', {
  type: 'problem',
  action: 'created',
  entity: { id: problem.id, title: problem.title, status: problem.status }
});
```

### `setupActionsFileWatcher` (line 7248)

```typescript
function setupActionsFileWatcher(projectPath: string, terminalId: string) {
  const actionsPath = path.join(projectPath, 'agent', 'actions.json');
  if (actionFileWatchers.has(actionsPath)) return;
  // Creates file if missing, sets up fs.watch with 300ms debounce
}
```

## Renderer State (TerminalPage.tsx)

### Active Terminal (line 228)
```typescript
const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
```

### `handleInstructionPanelSend` (line 479-528)
Sends instructions to `activeTerminalId` (or falls back to `sendTargetSession` → `sessions[]` lookup). Updates terminal binding with `active_problem_id` and `session_context`.

### `handleTabSelect` (line 996-1005)
Sets activeTerminalId on tab click.

### onContextChanged — CURRENTLY NOT CONSUMED
The backup file (`TerminalPage.tsx.backup-2026-05-26` lines 334-378) shows what was previously there:
```typescript
useEffect(() => {
  if (!window.deskflowAPI?.onContextChanged) return;
  const cleanup = window.deskflowAPI.onContextChanged(async (data) => {
    if (data.type === 'problem' || data.type === 'problems') {
      await loadAllProblems();
    } else if (data.type === 'request' || data.type === 'requests') {
      await loadAllRequests();
    }
    if (!activeTerminalId) return;
    // Construct delta message and write to active terminal
    if (deltaMessage && window.deskflowAPI?.terminalWriteRaw) {
      await window.deskflowAPI.terminalWriteRaw(activeTerminalId, deltaMessage + '\r');
    }
  });
  return () => cleanup?.();
}, [activeTerminalId, loadAllProblems, loadAllRequests]);
```

**This code was removed from the current file.** Context delta push to active terminal is completely disabled.

## TerminalWindow.tsx (lines 40-624)

### isActive prop
```typescript
interface TerminalPaneProps {
  terminalId: string;
  isActive: boolean;   // ← determined by activeTerminalId === terminalId
  onFocus: (id: string) => void;
  // ...
}
```

When `isActive` → `true`, xterm terminal calls `.focus()` + `fitAddon.fit()` (line 232).

### Preload Bridges (preload.ts)

| Bridge | Line | Description |
|--------|------|-------------|
| `onContextChanged` | 482-486 | Listens for `context-changed` IPC, returns cleanup fn |
| `registerTerminal` | 465 | INSERT/REPLACE into terminal_bindings |
| `updateTerminalBinding` | 467 | UPDATE terminal_bindings |
| `sendInstructionsToTerminal` | 472 | Write + update binding with linked IDs |
| `onAgentReady` | — | Listen for `agent:ready` event |
| `terminalWriteRaw` | — | Write to PTY without creating DB record |
| `terminalWrite` | — | Write to PTY + save to terminal_messages |

## Data Flow for Context Changes

```
Agent output → data handler (main.ts)
  → parseTerminalOutput()
    → parseSessionMetadata() (updates session DB)
    → parseAndExecuteActions() (creates/updates problems/checklists)
      → context-changed IPC event (currently generic, no entity details)
      → mainWindow.webContents.send('context-changed', ...)
        → preload.ts onContextChanged bridge
          → TerminalPage.tsx listener (REMOVED from current code)
```

## Key Design Patterns

1. **IPC request-response**: `ipcMain.handle` / `ipcRenderer.invoke`
2. **IPC events**: `webContents.send` / `ipcRenderer.on`
3. **Terminal IDs**: Generated as `term-{Date.now()}` in TerminalWindow.tsx
4. **Session IDs**: UUIDs or auto-increment
5. **Active terminal**: Renderer-side only, managed via `useState`
6. **Delta context messages**: Written with `\r` line ending (CR, not LF)
7. **No direct file system** in renderer — all through IPC bridges

## Critical Flaw in Current Documentation

The existing code and docs treat `session_id` as always present, but **terminals can exist without a session** (pre-initialization state). When a terminal first spawns, `initializeSession()` hasn't run yet — there is no session. The terminal should just launch opencode fresh (no resume, no context restore) during this phase.

**All designs must treat `session_id` as nullable.** Null = "session not created yet." Do not assign fake/generated session IDs before the real session exists.

## Current Gaps

1. **No file lock registry** — No `file_locks` DB table or in-memory Map
2. **No file→session tracking** — No `touched_files` DB table
3. **No cross-session context broadcast** — `onContextChanged` was removed; no mechanism to write to non-active terminals
4. **No `/sync` command** — No parsing for it in terminal output
5. **No conflict UI** — No dialog/toast when two terminals edit the same file
6. **No terminal→file correlation** — No way to answer "which files did terminal X touch?"
7. **Auto-expiry timestamps** — Not present anywhere
8. **Pre-session state not handled** — All designs assume session always exists
