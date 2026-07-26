# R4 Diagnostic: Compose/Quick Send → Agent Message Routing

**Date:** 2026-06-13
**Scope:** Trace the full IPC path from Compose/Quick Send user input to `terminalManager.write()`, identify all routing logic, and document findings.

---

## Q1: When the user presses Enter in the Quick Send bar, what exact function handles the send on the renderer side?

**Answer:** `sendInstruction()` in `src/pages/TerminalPage.tsx:1060`.

The function is defined as:

```ts
const sendInstruction = useCallback(async () => {
    if (!window.deskflowAPI || !instructionText.trim() || isSending) return;
    setIsSending(true);
    // ... routing logic (auto-assign, @mention, default)
}, [...deps]);
```

It's triggered by:
- **Enter key** at line 2271: `e.key === 'Enter' && !e.shiftKey` → calls `sendInstruction()`
- **Send button click** at line 2310: `onClick={sendInstruction}`

---

## Q2: What IPC channel does the Quick Send bar use to write to the terminal, and under what conditions does it choose `agent:send` vs `terminal:write-old-format`?

**Answer:** Two code paths inside `sendInstruction()`:

| Condition | IPC Channel | Preload bridge | Line |
|-----------|-------------|----------------|------|
| Auto-assign routing (confidence >= 0.7) → `handleSendToTerminal()` | `agent:send` | `window.deskflowAPI.agentSend()` | 1073 |
| `@term` mention detected → `window.deskflowAPI.terminalWrite()` | `terminal:write-old-format` | `window.deskflowAPI.terminalWrite()` | 1137 |
| Default (no routing, no mention) → same as @mention | `terminal:write-old-format` | `window.deskflowAPI.terminalWrite()` | 1137 |

**Key finding:** The Quick Send bar uses **`agent:send` only when auto-assign routing kicks in**. Otherwise it falls back to `terminal:write-old-format`, which is phase-aware but does **not** append `\r\n` (the renderer appends it manually at line 1137: `message + '\r\n'`).

**Critical secondary finding (double \r\n bug):** When the agent is `launching`/`busy`, the renderer's `message + '\r\n'` payload is queued in `pendingWrites[]` as-is. When the data-handler drains the queue (lines 7821, 7831), it appends **another** `\r\n`: `terminalManager.write(id, w + '\r\n')`. Result: `"message\r\n\r\n"` — a spurious blank line submitted to the agent. This only affects queued sends; immediate (ready-phase) writes get exactly one `\r\n`. See Q10 issue #8 for details.

---

## Q3: When the user clicks "Send to Terminal" in the Compose panel (InstructionPanel), what exact function handles the send?

**Answer:** `handleInstructionPanelSend()` in `src/pages/TerminalPage.tsx:833`.

The handler receives `InstructionConfig` from the InstructionPanel's `onSend` prop. The critical call is at **line 914**:

```ts
const sendResult = await window.deskflowAPI?.agentSend?.(
    resolvedTargetId, config.prompt, existingSession?.agent || 'claude'
);
```

Before the `agentSend` call, the handler:
1. Resolves the target terminal (active or sendTargetSession) at lines 846–856
2. Handles `/sync` special case (compileSyncSummary + terminalWrite) at lines 859–868
3. Calls `agentSend` with the full assembled prompt (includes system prompt layers, skills, problems, etc.)

The handler **always** uses `agent:send` — never `terminal:write-old-format` — for the actual prompt delivery.

---

## Q4: Does `agent:send` handler in main.ts implement phase-aware queuing? What exactly happens when `st.phase === 'launching'` vs `st.phase === 'busy'` vs `st.phase === 'ready'`?

**Answer:** Yes, full phase-aware queuing in `src/main.ts:7879-7927`.

| Phase | Behavior | Queued? | DB write? | Return |
|-------|----------|---------|-----------|--------|
| `launching` | Push data to `st.pendingWrites[]`. Handshake/prompt detection in the terminal's data handler will flush these when `isAgentReady()` returns true (line 7819-7823). Then marks the prompt as `in_progress` in DB. | ✅ | ✅ (>= 20 chars) | `{ success: true, queued: true }` |
| `busy` | Push data to `st.pendingWrites[]`. The terminal data handler flushes them when it detects the next prompt in output (`st.phase === 'busy' && promptSeen`, line 7826-7835), re-entering `ready` phase. | ✅ | ✅ (>= 20 chars) | `{ success: true, queued: true }` |
| `ready` | Writes immediately via `terminalManager.write(terminalId, data + '\r\n')`. Sets phase to `busy`. Records to DB. | ❌ | ✅ (>= 20 chars) | `{ success, queued: false }` |

**Important sequencing detail:**
1. `agent:send` pushes to `st.pendingWrites[]` immediately when not ready
2. The terminal's data handler (`terminalManager.getDataHandler` callback at line 7784) is the one that **drains** pending writes — both during `launching → ready` transition (line 7819-7823) and `busy → ready` transition (line 7829-7833)
3. Pending writes are flushed with `\r\n` appended: `terminalManager.write(id, w + '\r\n')` (lines 7821, 7831)
4. If the terminal is killed while writes are pending, `failPendingWrites()` at line 7999 marks them as `failed` in DB

---

## Q5: What is the difference between `terminal:write-old-format`, `terminal:write-raw`, and `terminal:write` in main.ts?

**Answer:**

| IPC Channel | Line | Phase-aware queuing? | `\r\n` appended? | DB recording? | Minimum char threshold | Used by |
|-------------|------|---------------------|------------------|---------------|----------------------|---------|
| `agent:send` | 7879 | ✅ (launching/busy → queue) | ✅ Yes (line 7906) | ✅ | >= 20 chars | Compose panel, handleSendToTerminal, initializeTerminal, handleCreateNewSession |
| `terminal:write-old-format` | 8021 | ✅ (launching/busy → queue) | ❌ No | ✅ | >= 20 chars | preload `terminalWrite`, InstructionPanel `/sync`, all `terminalWrite()` calls |
| `terminal:write-raw` | 7953 | ❌ No | ❌ No | ❌ No | N/A | preload `terminalWriteRaw`, real user keystrokes |
| `terminal:write` | 8069 | ❌ No | ❌ No | ❌ No | N/A | preload `terminalAPI.write()`, new-format API |

**Critical distinction:** Only `agent:send` appends `\r\n` automatically. The old-format and raw handlers do NOT — the caller must append it if needed. This is why the Quick Send bar manually appends `+ '\r\n'` at line 1137 and the InstructionPanel handler relies on `agent:send` for the same purpose.

---

## Q6: How are `terminal_messages` DB rows and `ai-task:updated` IPC events managed for persistence and optimistic UI?

**Answer:** Three-phase lifecycle:

### Phase 1: Write (in_progress)
When any channel (`agent:send`, `terminal:write-old-format`, or `write-terminal`) sends a payload >= 20 chars, it:
1. Adds terminalId to `pendingCompletions` Set (line 7505): `pendingCompletions.add(terminalId)`
2. Inserts a row: `INSERT INTO terminal_messages (session_id, role, content, status) VALUES (?, 'user', ?, 'in_progress')`
3. Broadcasts `ai-task:updated` to all windows: `{ terminalId, status: 'in_progress', messageId }`

### Phase 2: Completion (completed)
The terminal data handler checks at every data chunk if the terminal has pending completions AND a new prompt was just detected (line 7847):
```ts
if ((st.phase === 'ready' || st.phase === 'busy') && pendingCompletions.has(id) && promptSeen) {
    pendingCompletions.delete(id);
    markTaskCompleted(id);  // line 7756–7758 (spawn-terminal) or 7847–7849 (terminal:create)
}
```
`markTaskCompleted()` (line 7507):
1. Updates DB: `UPDATE terminal_messages SET status = 'completed' WHERE session_id = ? AND status = 'in_progress'`
2. Broadcasts `ai-task:updated` to all windows: `{ terminalId, status: 'completed' }`

### Phase 3: Failure (failed)
When a terminal is killed (`kill-terminal` or `terminal:destroy`), `failPendingWrites()` (line 7999):
1. Updates DB: `UPDATE terminal_messages SET status = 'failed' WHERE session_id = ? AND status = 'in_progress'`
2. Broadcasts `terminal:pending-failed` with count

### Optimistic UI
The `ai-task:updated` IPC events drive UI state in the renderer (e.g., showing "Agent is thinking..." indicators, task completion checkmarks, or failed states). The renderer listens for these events via context bridge `onAiTaskUpdated`.

### Known limitation
`markTaskCompleted()` updates ALL `in_progress` rows for the session — it doesn't distinguish individual messages. If multiple messages are queued for the same terminal, a single completion marks all of them as `completed`. This is benign because queued messages are flushed in order before the completion fires.

---

## Q7: What is the `handleSendToTerminal` function and where is it called from?

**Answer:** `handleSendToTerminal` in `src/pages/TerminalPage.tsx:956` is the universal wrapper for sending a prompt to a terminal via `agent:send`:

```ts
const handleSendToTerminal = useCallback(async (terminalId: string, message: string, agentType?: string) => {
    const result = await window.deskflowAPI.agentSend(terminalId, message, agentType);
    // ...
}, []);
```

**Called from 5 locations:**

| Caller | Line | Context |
|--------|------|---------|
| `sendInstruction()` auto-assign high confidence (>= 0.7) | 1073 | Quick Send bar |
| `sendInstruction()` routing toast confirm | 1161 | Quick Send bar (user confirms routing suggestion) |
| `sendInstruction()` existing session resend | 1177 | Quick Send bar (user selects existing session) |
| `handleCreateNewSession()` after terminal ready | 1073 | New Session dialog with prompt |
| `handleInstructionPanelSend()` | 914 | Compose panel (calls agentSend directly, not through handleSendToTerminal) |

Note: `handleInstructionPanelSend()` at line 914 calls `agentSend()` **directly** rather than through `handleSendToTerminal()`. Both reach the same IPC channel.

---

## Q8: How does the `sendInstruction()` function route to an agent when a `@term` mention is detected?

**Answer:** Three-step routing in `src/pages/TerminalPage.tsx:1105-1145`:

1. **Extract mention**: `instructionText.match(/@(\w+)/)` to get the term name
2. **Resolve terminal**: `await window.deskflowAPI.resolveAtMention(term)` → returns `{ terminalId, sessionName }`
3. **Send**: `window.deskflowAPI.terminalWrite(resolvedTargetId, resolvedMessage + '\r\n')` at line 1137

The key difference from auto-assign routing: @mention routing uses **`terminalWrite`** (IPC: `terminal:write-old-format`) instead of **`agentSend`** (IPC: `agent:send`). This means:
- `\r\n` is manually appended by the renderer (line 1137)
- Phase-aware queuing still applies (same `pendingWrites` mechanism in `terminal:write-old-format`)
- But the `agentType` parameter is NOT forwarded (no agent type hint in the IPC call)

---

## Q9: In `NewSessionDialog`, when "Create + Send" creates a new terminal, what IPC call delivers the initial prompt?

**Answer:** `handleCreateNewSession()` in `src/pages/TerminalPage.tsx:1026`:

```ts
const writeResult = await window.deskflowAPI?.agentSend?.(newTerminalId, prompt, newSessionAgent);
```

The sequence is:
1. `window.deskflowAPI.spawnTerminal(targetTerminalId, cwd, agent)` — spawns PTY (line 1013)
2. `registerTerminal(targetTerminalId)` — registers in renderer state (line 1021)
3. `initializeTerminal(targetTerminalId, agent, ...)` — writes init content (line 1022)
4. **`window.deskflowAPI.agentSend(newTerminalId, prompt, newSessionAgent)`** — delivers the user's initial prompt (line 1026)
5. `window.deskflowAPI.saveTerminalSession({...})` — persists session metadata (line 1045)

There's a 500ms delay after the `agentSend` before saving (line 1030: `await new Promise(r => setTimeout(r, 500))`).

---

## Q10: What bugs or known gaps exist in the message routing pipeline?

**Answer:** After reviewing the codebase against the spec:

### Potential issues found

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **`sendInstruction()` @mention routes through `terminalWrite` instead of `agentSend`** | `TerminalPage.tsx:1137` | @mention-sent prompts bypass agent type hint and don't get `\r\n` appended automatically. The renderer manually appends `\r\n`, but the `agentType` parameter is lost — `terminal:write-old-format` has no agent type concept. If the queuing logic needs to distinguish agent types, this will break. |
| 2 | **`handleInstructionPanelSend()` resolves agent type from `existingSession?.agent`, NOT from the InstructionConfig** | `TerminalPage.tsx:914` | The InstructionPanel's `onSend` config is not passed forward. If the user changes agent in the panel UI (e.g., via skills config), that choice is ignored — the handler uses the session's pre-existing agent or falls back to `'claude'`. |
| 3 | **No explicit user authentication check before `agent:send`** | `main.ts:7879-7927` | The handler trusts the renderer implicitly. If a compromised renderer sends prompts to an arbitrary terminalId, there's no authorization check. (Low risk in Electron context.) |
| 4 | **`pendingCompletions` completion detection may miss edge cases** | `main.ts:7847` | Uses `promptSeen` (detected via `readyRegex`) to determine completion. If the agent doesn't produce a recognizable prompt string (e.g., crashes mid-output), `markTaskCompleted` may never fire, leaving rows stuck as `in_progress`. |
| 5 | **`markTaskCompleted` updates ALL in_progress rows for the session** | `main.ts:7511` | If multiple messages are enqueued for the same terminal, a single completion marks all as `completed`, even if some haven't been processed yet. |
| 6 | **`failPendingWrites` only marks ONE row as failed** | `main.ts:8003-8005` | Uses `ORDER BY created_at DESC LIMIT 1` — if multiple writes are pending, only the most recent is marked as failed. The rest remain stuck as `in_progress` forever. |
| 7 | **`DesignWorkspacePage` sends via `terminalWrite` without `agent:send`** | `DesignWorkspacePage.tsx:339` | Design context is sent via `terminalWrite` (which appends `\n`, not `\r\n`). The `agentType` is not forwarded. This may cause rendering issues depending on the terminal's expected line ending format. |
| 8 | **Double `\r\n` on queued old-format sends** | `main.ts:7821,7831` + `TerminalPage.tsx:1137` | Renderer appends `\r\n` to message → payload `"msg\r\n"` queued in `pendingWrites[]` → data-handler flush appends **another** `\r\n` (`terminalManager.write(id, w + '\r\n')`) → agent receives `"msg\r\n\r\n"`. This is a spurious blank line that can trigger empty-prompt handling or double-submit. Only manifests when agent is `launching`/`busy` (queued path). See Q2 key finding. |
| 9 | **20-char threshold hides short prompts from tracking** | `main.ts:7890,7910,8027,8047` | Prompts under 20 chars — like "continue", "yes", "fix it" — are **never recorded** to `terminal_messages` and **never tracked** in `pendingCompletions`. No optimistic UI, no completion lifecycle, no failure marking. The threshold filters all real keystrokes (1–5 chars) but also catches legitimate short commands. |

### No issues found

- Phase-aware queuing in both `agent:send` and `terminal:write-old-format` works correctly
- `ai-task:updated` broadcasting is consistent across all three write types
- The `pendingCompletions` + `markTaskCompleted` lifecycle is sound for the common case
- `failPendingWrites` on terminal kill is correctly wired
- Handshake token + bracketed paste handling is correctly implemented in the data handler
- The 3 distinct IPC channels have clear, non-overlapping responsibilities

---

## Summary of IPC Routing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RENDERER                                  │
│                                                                  │
│  Quick Send Bar       Compose Panel       NewSessionDialog       │
│  sendInstruction() ── handleInstruction   handleCreateNewSession │
│    │                      PanelSend()           │                │
│    ├─ auto-assign ──────┐      │                │                │
│    │  (>=0.7 conf)      │      │                │                │
│    │  → handleSendTo    │      │                │                │
│    │    Terminal()      │      │                │                │
│    │    → agentSend     │      │                │                │
│    │                    │      │                │                │
│    ├─ @mention ─────────┘      │                │                │
│    │  → terminalWrite   │      │                │                │
│    │  (+ \r\n manual)   │      │                │                │
│    │                    │      │                │                │
│    └─ default ──────────┘      │                │                │
│       → terminalWrite   │      │                │                │
│       (+ \r\n manual)   │      │                │                │
│                         │      │                │                │
└─────────────────────────┼──────┼────────────────┼────────────────┘
                          │      │                │
                    ┌─────┘      │                └─────┐
                    │            │                      │
                    ▼            ▼                      ▼
            agent:send     terminal:write-old-format   agent:send
               IPC              IPC                      IPC
                    │            │                      │
                    └─────┐      │                ┌─────┘
                          │      │                │
┌─────────────────────────┼──────┼────────────────┼──────────────┐
│                     MAIN PROCESS                                  │
│                                                                   │
│  agent:send (7879)      terminal:write-old-format (8021)          │
│  ┌─────────────────┐    ┌─────────────────────────────┐           │
│  │ phase check      │    │ phase check                  │         │
│  │ launching/busy?  │    │ launching/busy?              │         │
│  │  → queue         │    │  → queue                     │         │
│  │ ready?           │    │ ready?                       │         │
│  │  → write + \r\n │    │  → write (no \r\n)           │         │
│  │  → set busy      │    │  → record if >= 20 chars    │         │
│  │  → record DB     │    └─────────────────────────────┘         │
│  └─────────────────┘                                              │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │  terminalManager.write(terminalId, data)                  │      │
│  │  → node-pty: pty.write(data)                              │      │
│  └─────────────────────────────────────────────────────────┘      │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │  Data Handler (per-terminal callback)                     │      │
│  │  → Broadcasts terminal:data to renderer                   │      │
│  │  → Detects prompts via detectAgentPrompt()                │      │
│  │  → Drains pendingWrites when agent becomes ready          │      │
│  │  → Calls markTaskCompleted when completion detected        │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```
