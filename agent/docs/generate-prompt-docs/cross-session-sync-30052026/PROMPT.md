# Cross-Session Conflict Detection & Context Sync

## Mode Selection

Select a mode for this prompt. The mode determines what the response focuses on.

> **Predicted mode: engineer** — This task is a backend infrastructure feature (IPC handlers, DB tables, data flow). It needs detailed implementation specs, not UI exploration or debugging.

**Available modes:**
- **engineer** — Full implementation plan: exact files, line numbers, IPC contracts, DB schemas, data flow. Focus on "how to build it." Best for infrastructure features.
- **debug** — Identify edge cases, race conditions, failure modes, conflict scenarios. Focus on "what could go wrong." Best for bug-fixing or hardening.
- **design** — UI/UX components, visual specs, interaction flows, wireframes. Focus on "what the user sees." Best for frontend features.
- **architecture** — High-level system design: how components connect, data flow diagrams, module boundaries. Focus on "how it fits together." Best for planning.
- **full** — All of the above. Comprehensive response covering implementation, debugging, design, and architecture.

**Which mode should I use?** (default: **engineer** — I predicted this because the request is about IPC handlers, DB tables, and backend infrastructure for file locking and context broadcast)

## Raw Request

> "I want to implement [overlapping-edit detection + cross-session context sync]"
>
> Brief specs:
> - File Lock Registry — tracks which terminal is editing which file, with auto-expiry
> - File-to-Session Tracking — reverse lookup: which terminal touched which file
> - Cross-Session Context Broadcast — when terminal A edits a file, terminal B gets notified
> - `/sync` command — terminal can query: "which files are locked by others?"
>
> "check the codebase for overlapping-edit detection" (none found)

## Problem Statement

The DeskFlow terminal system runs multiple AI agent sessions (opencode, claude, aider, codex) as independent node-pty subprocesses. Each session operates in a silo — there is no awareness that other sessions exist or what files they are editing. This creates several problems:

1. **Silent data loss** — Agent A edits `src/main.ts` while Agent B also edits it. B's changes overwrite A's. Neither agent knows.
2. **Stale context** — Agent A creates a problem or updates a request. Agent B is never notified. B continues with outdated context.
3. **No coordination** — A user managing 3+ agents has no way to see which files each agent is working on.
4. **No conflict prevention** — The `/sync` command doesn't exist. Agents cannot query "who holds the lock on file X?"

The codebase has zero infrastructure for cross-session awareness:
- No file lock registry (no `file_locks` DB table or in-memory Map)
- No file→session tracking (no `touched_files` table)
- No cross-session context broadcast (the `onContextChanged` listener was removed)
- No `/sync` command parsing
- No conflict UI

## Context

Read `CONTEXT_BUNDLE.md` first. It contains:
- Full architecture of the terminal system (terminalManager, IPC handlers, preload bridges)
- DB schemas (terminal_bindings, terminal_sessions)
- All 16 `context-changed` dispatch points in main.ts
- Current gaps
- Design patterns and conventions

## The Mandate

Design and implement a comprehensive cross-session conflict detection and context sync system for the DeskFlow terminal system.

### Engineering Task A — File Lock Registry

**Design and implement a file-locking system that tracks which terminal is editing which file.**

Requirements:
- **File Locks DB table** (`file_locks` or equivalent):
  - `file_path` TEXT (absolute path, e.g., `C:/project/src/main.ts`)
  - `terminal_id` TEXT (foreign key to terminal)
  - `session_id` TEXT NULLABLE (null = "session not yet created" / pending; set when session is initialized)
  - `project_id` TEXT
  - `acquired_at` TEXT (ISO timestamp)
  - `expires_at` TEXT (ISO timestamp — auto-expiry)
  - `status` TEXT ('active', 'expired', 'released')
  - `lock_type` TEXT ('exclusive' | 'read')
- **Default state**: Every lock starts with `session_id = null`. The session ID is filled in lazily when the session is created (via `save-terminal-session` or `initializeSession`). Do NOT assign a fake/generated session ID before the session exists.
- **In-memory cache** alongside the DB for fast lookups (Map<string, LockInfo>)
- **Auto-expiry**: Locks expire after N minutes of inactivity (configurable, default 15 min). Use `setInterval` to sweep expired locks and broadcast release events.
- **IPC handlers**:
  - `acquire-file-lock(terminalId, filePath, lockType?)` → `{ success, acquired: boolean, heldBy?: { terminalId, sessionId } }`
  - `release-file-lock(terminalId, filePath)` → `{ success }`
  - `check-file-lock(filePath)` → `{ locked: boolean, heldBy?: { terminalId, sessionId, agentType } }`
  - `get-all-locks(terminalId?)` → `{ locks: LockInfo[] }`
  - `release-all-terminal-locks(terminalId)` → called when terminal is killed
- **Preload bridges** for all 5 IPC handlers
- **Auto-release on terminal kill**: Hook into `terminalManager.kill()` to release all locks held by that terminal
- **Lock inheritance on session resume**: If terminal B resumes session A, B inherits A's locks

### Engineering Task B — File-to-Session Tracking

**Design and implement a tracking system that records which files each terminal touches.**

Requirements:
- **Touched Files DB table** (`terminal_touched_files` or similar):
  - `id` INTEGER PRIMARY KEY AUTOINCREMENT
  - `terminal_id` TEXT
  - `session_id` TEXT
  - `file_path` TEXT
  - `project_id` TEXT
  - `first_touched_at` TEXT
  - `last_touched_at` TEXT
  - `touch_count` INTEGER DEFAULT 1
  - `agent_type` TEXT
- **IPC handlers**:
  - `touch-file(terminalId, filePath)` — upsert: increment `touch_count`, update `last_touched_at`
  - `get-terminal-files(terminalId)` → `{ files: TouchedFile[] }`
  - `get-file-terminals(filePath)` → `{ terminals: { terminalId, sessionId, agentType }[] }`
  - `get-project-file-activity(projectId)` → `{ files: TouchedFile[] }`
- **Integration**: When `save-terminal-message` fires (line ~7341), parse any file paths mentioned in the content and call `touch-file` with a debounce (e.g., 5s per file per terminal).
- **Auto-cleanup**: Optionally trim entries older than 30 days.

### Engineering Task C — Cross-Session Context Broadcast

**Design and implement a system that broadcasts context changes to ALL terminals (not just the active one).**

Requirements:
- **Re-enable `onContextChanged` listener** in `TerminalPage.tsx` with significant improvements:
  - When `context-changed` fires, write delta messages to **all terminals** (not just the active one)
  - Use `window.deskflowAPI.terminalWriteRaw(terminalId, deltaMessage + '\r')` for each terminal
  - Format: `[SYSTEM — cross-session] Session <sessionName>: <action> — <entity.title> (ID: <entity.id>)`
  - Debounce rapid-fire events: batch multiple changes into a single message per 2-second window
- **New IPC event** `cross-session-context`:
  - Payload: `{ sourceTerminalId, sourceSessionId, type, action, entity, timestamp }`
  - Fired by main.ts alongside existing `context-changed`
  - Renderer listens and shows a **toast notification** when context changes from another session
- **Session naming**: Use `topic` from `terminal_sessions` for display names in delta messages. Fallback to `session_{id.slice(0, 6)}`.
- **Agent-ready broadcast**: When a new terminal becomes `agent:ready`, write a one-time context summary to it listing other active sessions (their topics, agents, how many files they're editing).

### Engineering Task D — `/sync` Command

**Design and implement a terminal command that lets agents query the sync state.**

Requirements:
- **Command format**: `/sync` (list all locks) or `/sync <filepath>` (check specific file)
- **Detection**: In `parseTerminalOutput()` or the data handler (line 6241), detect `/sync` commands in terminal output. Match pattern: `^/sync(\s+.+)?$`
- **Response**: Write response to the requesting terminal via `terminalManager.write(terminalId, response)`:
  - `/sync` → formatted list of all active locks: file, held by which terminal/session, agent type, how long held
  - `/sync src/main.ts` → lock status for that specific file
- **Format**: Plain text with clear delimiting: `[SYNC STATUS]` header, `---` separators, `[END SYNC]` footer
- **Optional `/sync --touched`** variant: lists files touched (not locked) by other terminals recently

### Design Task — Conflict UI

**Design the visual components for conflict awareness.**

Requirements:
- **Conflict warning toast**: When terminal B tries to lock a file that terminal A holds:
  - Amber/warning colored toast in `TerminalPage.tsx`
  - Shows: "⚠️ File conflict: `src/main.ts` is locked by `Session Alpha` (opencode)"
  - Action button: "Notify session" (writes a `[SYSTEM]` message to the locking terminal)
  - Auto-dismiss after 10 seconds
- **Lock indicator in tab bar**: Terminal tabs (line ~1700) show a lock icon if the terminal holds any file locks:
  - 🔒 (lock icon) next to terminal name in tab bar
  - Tooltip showing number of locked files on hover
  - Green if all locks are exclusive, amber if mixed with read locks
- **Sidebar panel**: New "Sync" sidebar tab (optional, can be collapsible section in existing tab):
  - Shows all active file locks across all terminals
  - Shows recently touched files
  - Color-coded by terminal
  - Agent type badge per entry
  - "Release" button for individual locks (admin override)

### UX Task — Interaction Flow

**Design the complete interaction flow for sync and conflict resolution.**

- **Auto-context refresh when terminal becomes active**:
  When a terminal tab is selected (isActive becomes true), write a brief context summary to it:
  - Number of problems/requests created by OTHER terminals since this terminal last spoke
  - Any file locks held by this terminal that are about to expire (within 2 min)
  - Any conflicts that arose while this terminal was inactive
- **Lock request flow**:
  1. Agent A sends `/sync src/main.ts` → sees "Not locked"
  2. Agent A writes code to `src/main.ts` → lock auto-acquired
  3. Agent B tries to edit `src/main.ts` → lock denied
  4. Lock denial response: `[SYSTEM] Lock denied: src/main.ts held by Session Alpha (opencode) since 14:32:01`
  5. Agent B sends `/sync` → sees the lock
  6. Agent B can request release via user instruction or wait for time-out
- **Lock expiry flow**:
  1. Terminal A acquires lock on `src/main.ts`
  2. Terminal A goes idle (no output for 15 min)
  3. Lock auto-expires
  4. All terminals notified: `[SYSTEM — cross-session] Lock released: src/main.ts (expired after 15m idle)`

## Constraints

1. **No Node.js API in renderer** — All file/DB operations must go through IPC bridges (preload.ts → main.ts)
2. **Existing IPC patterns** — Use `ipcMain.handle` / `ipcRenderer.invoke` for request-response, `webContents.send` / `ipcRenderer.on` for events
3. **Terminal IDs are strings** like `term-1745912345678` — generated by `TerminalWindow.tsx`
4. **DB tables** use `better-sqlite3` in main process only — the renderer never touches the DB directly
5. **Terminal writes** use `\r` line ending (CR, not LF) — important for agent parsing
6. **Configurable defaults** — Lock timeout, debounce intervals, sweep intervals should be constants at the top of `main.ts` (not hardcoded in logic)
7. **Backward compatible** — Existing terminals continue to work without changes. Locks are optional — a terminal that never acquires a lock can still write files (just without protection)
8. **Thread safety** — All lock operations in main.ts are synchronous (single-threaded Node.js), but must handle race conditions from rapid concurrent `acquire-file-lock` calls from different terminals
9. **Efficient sweeps** — Lock expiry sweep shouldn't lock the event loop. Use a single `setInterval` (every 60s) not per-lock timers
10. **No session = fresh launch** — When `session_id` is null (pre-initialization state), the terminal must just launch opencode normally. NO resume, NO context restore, NO fake session ID assignment. A terminal in pre-session state does not participate in cross-session sync (no locks, no broadcasts) until `initializeSession()` creates the session.
11. **Minimal new dependencies** — Use only built-in Node modules (fs, path) and existing npm deps (better-sqlite3)

## Requirement Checklist

- [ ] **Engineering A — File Lock Registry**: DB table, in-memory cache, 5 IPC handlers, auto-expiry sweep, preload bridges, hook into terminal kill
- [ ] **Engineering B — File-to-Session Tracking**: DB table, upsert logic, 4 IPC handlers, integration with save-terminal-message
- [ ] **Engineering C — Cross-Session Context Broadcast**: Re-enable onContextChanged with multi-terminal write, new IPC event, toast notifications, agent-ready broadcast
- [ ] **Engineering D — `/sync` Command**: Pattern detection in terminal output, formatted response writing, --touched variant
- [ ] **Design — Conflict UI**: Toast notifications, lock indicator in tab bar, sidebar Sync panel
- [ ] **UX — Interaction Flow**: Auto-context refresh on terminal select, lock request/denial flow, lock expiry flow

## What to Produce

1. **Architecture document** — How the new systems fit into existing code (main.ts, preload.ts, TerminalPage.tsx, TerminalWindow.tsx)
2. **DB migration** — SQL for new tables with indexes
3. **Implementation plan** — Exact files to modify, exact line numbers, exact function signatures
4. **IPC contracts** — Channel names, payload shapes, return types for all new handlers
5. **UI components** — Specs for toast, tab bar indicator, sync sidebar panel
6. **Testing notes** — How to manually verify each feature works
