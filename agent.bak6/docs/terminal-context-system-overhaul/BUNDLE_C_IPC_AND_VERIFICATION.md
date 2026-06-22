# Bundle C — IPC Bridges & Verification

> **Implementation order:** THIRD — after Bundle B (Session System)
> **Steps:** 15-17 + 32-35 (Fixes 11, 3.5, 3.6, 7.1, 7.2, 7.3, 7.5)
> **Dependencies:** None on other bundles (backend work, no frontend changes)
> **Build verification:** `npm run build` must pass after each step

## Required Context

This bundle targets `src/main.ts`, `src/preload.ts`, `src/services/ContextService.ts`, `src/pages/TerminalPage.tsx`.

Read `CONTEXT_BUNDLE.md` for full architectural context. Key points:

- **`main.ts`** (~10k lines CJS) — ALL IPC handlers live here via `ipcMain.handle()`
- **`preload.ts`** (~480 lines) — ALL bridge methods via `ipcRenderer.invoke()` and `ipcRenderer.on()`
- **`ContextService.ts`** — `buildGraphifyContext()`, `buildQMDContext()` path logic
- **`getDatabase()`** — returns DB handle or null (when `useJson` flag is true)
- **`terminalManager`** — `Map<string, TerminalInfo>` with PTY instances
- **All `create-terminal` events** dispatched via `window.dispatchEvent(new CustomEvent('create-terminal', { detail: { terminalId, agent } }))`

---

## Step 15 — Add `electron:execute-command` IPC Handler

**Source:** RESULT.md Fix 11

**Files:** `src/main.ts`, `src/preload.ts`

**In main.ts:**
```typescript
ipcMain.handle('electron:execute-command', async (_event, params: {
  command: string;
  args?: string[];
  cwd?: string;
}) => {
  const { command, args = [], cwd } = params;
  return new Promise((resolve, reject) => {
    const proc = require('child_process').execFile(
      command, args,
      { cwd: cwd || process.cwd(), timeout: 60000 },
      (error: Error | null, stdout: string, stderr: string) => {
        if (error) reject({ error: error.message, stderr });
        else resolve({ stdout, stderr });
      }
    );
  });
});
```

**In preload.ts:**
```typescript
executeCommand: (params: { command: string; args?: string[]; cwd?: string }) =>
  ipcRenderer.invoke('electron:execute-command', params),
```

**Usage (for graphify rebuild):**
```typescript
await deskflowAPI.executeCommand({
  command: 'python',
  args: ['agent/skills/maintain-context/graphify_maintain.py', 'full'],
  cwd: projectPath,
});
```

**Build:** `npm run build`

---

## Step 16 — Verify/Fix `sendInstructionsToTerminal` Handler

**Source:** SECOND_RESULT.md Fix 3.5

**File:** `src/main.ts`

Search for `send-instructions-to-terminal` handler. If it exists, verify it works. If missing, add it:

```typescript
ipcMain.handle('send-instructions-to-terminal', async (_event, data: {
  terminalId: string;
  instructions: string;
  linkedProblemId?: string;
  linkedRequestId?: string;
}) => {
  const info = terminalManager.get(data.terminalId);
  if (!info?.pty) return { success: false, error: 'Terminal not found' };

  info.pty.write(data.instructions + '\r');

  if (data.linkedProblemId || data.linkedRequestId) {
    const db = getDatabase();
    if (db) {
      db.prepare(`UPDATE terminal_bindings SET active_problem_id = ?, active_request_id = ?, last_activity_at = datetime('now') WHERE terminal_id = ?`)
        .run(data.linkedProblemId || null, data.linkedRequestId || null, data.terminalId);
    }
  }
  return { success: true };
});
```

**Build:** `npm run build`

---

## Step 17 — Document/Skip `tracker-mind-generate`

**Source:** SECOND_RESULT.md Fix 3.6

**File:** `src/main.ts`

Search for `tracker-mind-generate` or `trackerMindGenerate`:
```bash
grep -n "tracker-mind-generate\|trackerMindGenerate\|mind.*generate" src/main.ts
```

If found: document what it does in a comment.
If not found: it's a planned feature that was never implemented. `tracker-mind-setup init-all` already covers file generation. Add a TODO:
```typescript
// TODO: tracker-mind-generate — implement if specific file generation needed.
// Currently covered by tracker-mind-setup with step parameter.
```

**Build:** `npm run build`

---

## Step 32 — Verify `create-terminal` Events

**Source:** SECOND_RESULT.md Fix 7.1

**File:** `src/pages/TerminalPage.tsx`

Verify all 4 dispatch sites:

| Location | Trigger | Expected |
|----------|---------|----------|
| `handleCreateTerminalForProblem` | Assign problem to terminal | Spawns PTY with problem prompt queued |
| Header "Open Terminal" button | User clicks button | Spawns PTY with default agent |
| "+" tab button | User clicks "+" | Spawns PTY with default agent |
| `handleResumeSession` | Resume session | Spawns PTY with resume command |

**Conflict check:** The `create-terminal` listener should call ONLY `spawnTerminal()` — it should NOT call `initializeTerminal()`. The `agent:ready` handler should handle initialization (writing system prompt + flushing queue). Ensure no double-initialization.

```typescript
// create-terminal listener — ONLY spawns
window.addEventListener('create-terminal', async (e: CustomEvent) => {
  const { terminalId, agent } = e.detail;
  await deskflowAPI.spawnTerminal(terminalId, computedProjectPath, agent);
  // Do NOT call initializeTerminal here
});

// agent:ready listener — handles initialization
deskflowAPI.onAgentReady(async (data) => {
  const { terminalId } = data;
  await flushQueue(terminalId);  // System prompt + init content + queued messages
});
```

**Build:** `npm run build`

---

## Step 33 — Verify Graphify/QMD Paths

**Source:** SECOND_RESULT.md Fix 7.2

**File:** `src/services/ContextService.ts`

Since `buildInitContent()` was killed in Bundle A Step 2, the only relevant paths are in `assembleContext()`'s builders:

```typescript
// buildGraphifyContext() — should use:
const graphifyPath = path.join(projectPath, 'graphify-out', 'GRAPH_REPORT.md');
// NOT: projectPath/agent/GRAPH_REPORT.md

// buildQMDContext() — should use:
const templatesDir = path.join(projectPath, 'agent', 'templates');
// NOT: projectPath/agent/templates/agent
```

Add runtime existence checks:
```typescript
if (!fs.existsSync(graphifyPath)) {
  console.warn(`[ContextService] Graphify path not found: ${graphifyPath}`);
  return '';
}
```

**Build:** `npm run build`

---

## Step 34 — Document Vault Sync

**Source:** SECOND_RESULT.md Fix 7.3

**File:** `src/services/ContextService.ts`

No code changes needed. Add a comment:
```typescript
// NOTE: Context reads from LOCAL project paths (agent/skills/, graphify-out/).
// The Obsidian vault (CZVault/) is an archival/visualization layer.
// Sync is one-way: project → vault (via graphify_maintain.py sync_to_para).
// If vault has newer content, user must manually copy to project paths.
```

**Build:** `npm run build` (trivial change)

---

## Step 35 — Add `useJson` Guards

**Source:** SECOND_RESULT.md Fix 7.5

**File:** `src/main.ts`

For any NEW IPC handlers added by these bundles (`electron:execute-command`, `send-instructions-to-terminal`, `summarize-session` if added), ensure `useJson` is handled:

| Handler | useJson Behavior |
|---------|-----------------|
| `electron:execute-command` | N/A — doesn't touch DB |
| `send-instructions-to-terminal` | Write to PTY only, return `{ success: true }` even if DB unavailable |
| `summarize-session` | Return null, log warning |

Pattern for DB-touching handlers:
```typescript
const db = getDatabase();
if (!db) {
  console.warn('[useJson] Handler called but DB unavailable');
  return [];  // or {} — safe default for the specific return type
}
```

**Build:** `npm run build`

---

## Build Verification

After ALL steps in this bundle:
```bash
npm run build
```
Must pass. Then proceed to Bundle D.
