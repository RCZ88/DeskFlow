# R5 — Sessions tab + Cross-Session Sync — Answers

## 1. `saveTerminalSession` — fields, table, call triggers

**IPC handler:** `src/main.ts:8123-8164`

**Table:** `terminal_sessions` (schema at `src/main.ts:1731-1744`, migrations at `1749-1760`)

**Columns:**
```
id TEXT PRIMARY KEY,
preset_id TEXT,
project_id TEXT,
agent TEXT,
resume_id TEXT,
topic TEXT,
working_directory TEXT,
terminal_id TEXT,
total_tokens INTEGER DEFAULT 0,
total_cost REAL DEFAULT 0,
category TEXT DEFAULT 'other',          -- added by migration v3.3
status TEXT DEFAULT 'active',           -- added by migration v3.3
product_area TEXT DEFAULT '',
description TEXT DEFAULT '',
auto_tags TEXT DEFAULT '[]',
category_confirmed INTEGER DEFAULT 0,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**When called (all in `TerminalPage.tsx`):**

| Trigger | Line | Purpose |
|---------|------|---------|
| Terminal create/attach | 1477 | Spawn callback — tags `s.resume_id` to find existing sessions, only saves if no match |
| Initialize callback ends | 1682 | After `initializeTerminal` completes — saves with `openCodeSessionId` as `resumeId` |
| InstructionPanel send | 905 | Before `agentSend` — saves session payload with topic/agent/terminalId |
| Quick Send (handleSendToTerminal) | 1046 | After Quick Send — saves `{id, projectId, agent, resumeId?, terminalId, topic}` |
| handleSaveSession (edit dialog) | 1851 | Via `updateSessionCategory` IPC, not directly |
| NewSessionDialog onCreate | 3884 | Saves new session with init content |

**Preload:** `src/preload.ts:347-350`
```
saveTerminalSession: (session: { id?: string; projectId?: string; agent: string; resumeId?: string; ... }) =>
    ipcRenderer.invoke('save-terminal-session', session),
getTerminalSessions: (projectId?: string, limit?: number) => ipcRenderer.invoke('get-terminal-sessions', projectId, limit),
```

**Handler write (main.ts:8134-8157):** UPSERT behavior:
```js
const existing = db.prepare('SELECT created_at FROM terminal_sessions WHERE id = ?').get(id);
if (existing) {
    // UPDATE project_id, agent, resume_id, topic, working_directory, terminal_id,
    //        total_tokens, total_cost, category, status, product_area, description, auto_tags,
    //        category_confirmed, updated_at = datetime('now')
} else {
    // INSERT INTO terminal_sessions (id, project_id, agent, resume_id, topic, working_directory, terminal_id, ...)
}
```

---

## 2. Sessions tab — rendering, query, row content

**Rendering:** `src/pages/TerminalPage.tsx:2808-3037`

Tab selected via: `activeTab === 'sessions'` (line 2808, set from sidebar button at line 2590 via `{ key: 'sessions', icon: Clock, label: 'Sessions', accent: 'green' }`)

**Data population:**
- `loadSessions()` (line 791-799):
```js
const loadSessions = useCallback(async () => {
    const data = await window.deskflowAPI.getTerminalSessions(selectedProject || undefined, 20);
    setSessions(data || []);
}, [selectedProject]);
```
- IPC `get-terminal-sessions` (main.ts:8109-8121):
```sql
SELECT * FROM terminal_sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?
-- or if no projectId:
SELECT * FROM terminal_sessions ORDER BY created_at DESC LIMIT ?
```

**Each row shows (line 2943-3029):**
- `StatusDot` (status indicator — color-coded) — line 2951
- `CategoryBadge` (category chip) — line 2952
- Agent badge (e.g. "claude", "opencode") — line 2953
- Topic text (truncated) — line 2954
- Terminal status badge ("Running with name" or "Closed") — lines 2955-2962
- Description (line-clamp-1) — line 2964
- Created date, product_area, truncated resume_id — lines 2967-2975
- Auto-tags (up to 5) — lines 2976-2981
- Cost — line 2983
- Hover actions: Focus/Open, Messages, Delete — lines 2988-3027

**Session detail view (when clicked, line 2822-2887):**
- Full metadata grid: status, category, date, terminal, cost, tokens, resume_id, description, product_area
- Messages section: calls `getSessionMessages(session.id, session.agent)` — loads from `terminal_messages` table
- Action buttons: Focus Terminal / Open in Terminal, Edit

---

## 3. `handleResumeSession` — full flow

**Location:** `src/pages/TerminalPage.tsx:1810-1868`

**Flow:**

```
1. Get resumeId from session.resume_id (or fetch from DB via getTerminalSessionResumeId IPC)
2. Find project cwd from selectedProject
3. Load saved session config (initContent + customSystemPrompt) via loadSessionConfig IPC
4. If no targetTerminalId:
   a. Generate new terminal ID: `term-${Date.now()}-resume`
   b. Create terminal tab entry { name, agent, modelTier }
   c. Set activeTerminalId, insert into layout, save layout
   d. SPAWN new PTY via spawnTerminal(terminalId, cwd, session.agent)
   e. Dispatch 'terminal:mark-spawned' event
   f. registerTerminal(terminalId) — creates terminal_binding
   g. CALl initializeTerminal(terminalId, agent, resumeId, undefined, savedSystemPrompt, cwd)
      → This writes `{agent} -s {resumeId}` to the terminal (not just bare agent)
      → The `-s {resumeId}` flag tells the AI agent to resume that specific session
5. If targetTerminalId already exists:
   → Just set activeTerminalId (no re-spawn)
6. Update session with new terminal_id binding via saveTerminalSession
7. Call loadSessions() to refresh list
8. Show toast "Opened session"
```

**Key detail from `initializeTerminal` (line 621-634):**
```js
if (resumeId) {
    let resumeCmd = `${agent} -s ${resumeId}`;
    // Optional: check preferences for custom agentResumeCommands template
    launchCommand = `${cdCmd}${resumeCmd}\r\n`;
} else {
    launchCommand = `${cdCmd}${agent}\r\n`;
}
```

So yes — it **re-spawns a new PTY** and sends `{agent} -s {resumeId}` as the launch command. It does NOT re-attach to a dead PTY. The `resumeId` comes from the `terminal_sessions.resume_id` column (generated at session creation in `save-terminal-session` handler, line 8128).

---

## 4. `compileSyncSummary` — what it gathers

**Location:** `src/main.ts:16577-16639`

**Data sources:**

| Source | Query | What it returns |
|--------|-------|-----------------|
| Current terminal's binding | `SELECT session_id FROM terminal_bindings WHERE terminal_id = ?` | Requester's session_id |
| Other terminals' bindings | `SELECT * FROM terminal_bindings WHERE terminal_id != ? AND status != 'closed'` | All other active terminal bindings |
| Problems (per binding) | `SELECT title, description FROM problems WHERE id = ?` | Active problem for each other terminal |
| Session context (per binding) | `JSON.parse(binding.session_context)` | Requests and problems referenced by each terminal |
| Recent file changes | `SELECT DISTINCT file_path, terminal_id, MAX(timestamp) FROM touched_files WHERE terminal_id != ? GROUP BY file_path ORDER BY last_touched DESC LIMIT 10` | Files modified by other agents |
| Currently locked files | `getAllLocks().filter(l => l.terminalId !== terminalId)` | Locks held by other terminals |

**Output format:** Markdown string:
```
## Cross-Session Sync Summary
Other active sessions: N

### Terminal: <tid> (Session: <sid>)
  Active Problem: <title> — <description>
  Requests: <...>
  Problems referenced: <...>

### Files Recently Modified by Other Agents
  <file_path> (by <terminal_id>)

### Currently Locked Files (by others)
  <file_path> (locked by <terminal_id>)
```

**Returned as:** `{ success: true, summary: "<markdown string>" }`

---

## 5. `/sync` command path

**Location:** `src/pages/TerminalPage.tsx:859-868`

```js
// /sync command — compile cross-session context summary
if (config.prompt.trim().toLowerCase() === '/sync') {
    const syncResult = await window.deskflowAPI.compileSyncSummary(resolvedTargetId);
    if (syncResult?.success && syncResult.summary) {
        await window.deskflowAPI.terminalWrite(resolvedTargetId, syncResult.summary + '\r\n');
        showError('Cross-session context synced', 'info');
    } else {
        showError(syncResult?.error || 'Sync failed', 'error');
    }
    return;
}
```

**Key observations:**
1. `/sync` is sent to **one terminal** — `resolvedTargetId` (the target of the current send). It is NOT broadcast to all sessions.
2. It uses `terminalWrite` (raw write), NOT `agentSend`. The summary is literally written into the terminal's stdin.
3. The summary is written with `'\r\n'` appended.
4. This is the R4-problematic path — it was using `terminalWrite` in R4; as of the R4 fixes, it still uses `terminalWrite` (that was not changed). The design choice is that the sync summary is a system message injected directly into the agent's stdin, not a structured message.

**context-changed auto-notify (line 520-538):**
When `crossSessionSyncEnabled` is on and another terminal modifies problems/requests, a system notification with "Run /sync for full context" is written to the active terminal via `terminalWrite`. This is the only cross-session push.

---

## 6. Automatic/periodic sync

**There is NO automatic/periodic sync.** No `setInterval`, no cron, no scheduler calls `compileSyncSummary` automatically.

The only triggers are:

| Trigger | What fires | Location |
|---------|-----------|----------|
| **Manual `/sync` command** | User types `/sync` in Quick Send | TerminalPage.tsx:860 |
| **context-changed broadcast** | Another terminal modifies problems/requests → writes `[System: ...]` note with "Run /sync for full context" | TerminalPage.tsx:531 |
| **CustomEvent `context-changed`** | Main process `broadcast-context-delta` IPC → `win.webContents.send('context-changed')` | main.ts:16641-16656 |

No `agent:ready` → auto-sync trigger exists. No `CustomEvent('agent:ready')` listener triggers a sync.

---

## 7. Active terminal vs sessions — tracking and drift

**Tracking:**

| Entity | How tracked |
|--------|------------|
| **Active terminal ID** | `activeTerminalId` state (TerminalPage.tsx:287) — string, e.g. `term-12345` |
| **Terminal tabs (live)** | `terminalTabs` state (line ~288) — `Record<string, { name, agent, modelTier }>` |
| **Terminal layout** | `terminalLayout` — tree of terminal IDs in split/group layout |
| **Sessions (DB)** | `sessions` state — loaded from `terminal_sessions` table via `getTerminalSessions` |

**Drift scenarios:**

1. **DB row with no live PTY** — A session row where `terminal_id` points to a terminal that no longer has a tab/layout entry. This is **expected behavior** (closed sessions that can be resumed). The Sessions tab shows these as "Closed" (line 2960-2961) and offers "Open in Terminal" (line 2852).

2. **Live PTY with no DB row** — A terminal tab/layout entry where `initializeSession()`/first send hasn't created a `terminal_sessions` row yet. This is the **pre-initialization state** identified in R3. Terminals can exist without a session during the window between spawn and first send/init.

3. **terminal_id mismatch** — `terminal_sessions.terminal_id` could point to a terminal ID that was destroyed and recreated. `handleResumeSession` explicitly updates the binding (line 1851-1859) to fix this.

**No explicit consistency check exists** — there's no periodic routine that verifies every `terminalTabs` key has a matching `terminal_sessions` row or vice versa.

---

## 8. App restart — session reconstruction

**There is NO automatic reconstruction of sessions from `terminal_sessions` on restart.**

On app restart:
1. `terminalTabs` is empty (fresh state)
2. `terminalLayout` is empty (or loaded from `workspace_state` if save/load was used)
3. `sessions` array is populated on mount via `loadSessions()` (line 791)
4. **No terminal is auto-spawned or auto-resumed** from `terminal_sessions` rows

The **Save Workspace / Load Workspace** feature (`handleSaveWorkspace` / `handleLoadWorkspace`) is the only mechanism to preserve and restore terminal state across sessions. It saves:
- Terminal layout tree
- Terminal tabs (name, agent)
- Session bindings

On Load, it re-spawns all terminals and resumes their sessions.

**Without Save Workspace:** All sessions are orphaned in the DB — visible in the Sessions tab as "Closed" with green "Open" buttons, but no terminals auto-restore.

**Ties to the R3 load gap:** The R3 diagnostic identified that `workspace_state` is loaded on init but terminal re-spawn logic is incomplete — the Load Workspace flow is the intended mechanism but may not cover all edge cases (terminals created by other means may not be part of a saved workspace).

---

## 9. `terminal_messages` vs `terminal_sessions` — join and cleanup

**Table schemas:**

`src/main.ts:1777-1784`:
```sql
CREATE TABLE IF NOT EXISTS terminal_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,       -- FK to terminal_sessions.id
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Join:** `terminal_messages.session_id` references `terminal_sessions.id`. Queries like `getSessionMessages` use `SELECT * FROM terminal_messages WHERE session_id = ? ORDER BY created_at ASC`.

**Cleanup on delete:** `src/main.ts:8293-8303`:
```js
electron_1.ipcMain.handle('delete-terminal-session', async (_event, sessionId: string) => {
    db.prepare('DELETE FROM terminal_sessions WHERE id = ?').run(sessionId);
});
```
**No cascade delete** — `terminal_messages` rows with the deleted `session_id` are **not deleted**. They become orphaned rows.

The only `DELETE FROM terminal_messages` is `main.ts:9432` which deletes a single message by `id`, not by `session_id`.

---

## 10. Known issues (PROBLEMS.md / state.md)

**PROBLEMS.md entries related to sessions:**

- Line 361: `terminal_id` column was missing from `terminal_sessions` — **FIXED** by migration
- Line 298: Session naming — added prompt dialog for session name with proper saving

**state.md known issues:**

| Issue | Status | Reference |
|-------|--------|-----------|
| No cascade delete from `terminal_sessions` → `terminal_messages` | Not tracked in state.md | This Q&A Q9 |
| `/sync` uses `terminalWrite` instead of `agentSend` | Not tracked in state.md | R4 left this path unchanged |
| No auto-reconstruct from `terminal_sessions` on restart | Not tracked in state.md | R3 load gap |
| Auto-tags generated from full message content on every send (main.ts:7486) | Not tracked as perf issue | Re-runs SQL UPDATE O(n) per send |
| `sessions` state name collides with app-tracking `sessions` table | Not tracked | Two different tables with same name in DB |

**Console errors:** None tracked in PROBLEMS.md specifically about sessions not resuming, sync going to wrong terminal, or duplicate sessions.

**`delete-terminal-session` does NOT clean up:**
- `terminal_messages` (orphaned rows remain)
- `session_parsed_items` (no cascade)
- `terminal_bindings` (no cascade)

---

## Summary of gaps found

| # | Gap | Location | Severity |
|---|-----|----------|----------|
| 1 | No cascade delete on session delete — messages orphaned | main.ts:8296 | Low |
| 2 | `/sync` uses `terminalWrite` not `agentSend` (R4 gap) | TerminalPage.tsx:863 | Low‑Med |
| 3 | No auto-reconstruct from `terminal_sessions` on restart | Nonexistent | Low |
| 4 | No periodic consistency check between live tabs and DB rows | Nonexistent | Low |
| 5 | No automatic/periodic sync — only manual `/sync` | Nonexistent | Low (by design) |
| 6 | `auto_tags` re-generated on every send (SQL UPDATE) | main.ts:7486 | Low (perf) |
