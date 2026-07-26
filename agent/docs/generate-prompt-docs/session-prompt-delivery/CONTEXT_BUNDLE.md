# CONTEXT_BUNDLE.md — Session Prompt Delivery Fix

## Raw Request (verbatim)
"the problem that there still is regarding the text input, but currently it still doesn't input the text. It doesn't send the text properly. So I want to create a new session. It still just opens the open code, but doesn't put any text. Here's a text input whatsoever. It doesn't send it. It doesn't have the system where it opens another terminal and retrieves the open code session."

## Problem Statement
When creating a new session via the New Session dialog:
1. The terminal spawns correctly
2. opencode launches correctly
3. **BUT the initial prompt/instruction is NEVER delivered to the terminal**
4. The user sees opencode's TUI with no input — the prompt was silently dropped

## ROOT CAUSE ANALYSIS

### The flow (TerminalPage.tsx `initializeTerminal`, lines 935-1088):

```
1. Verify agent binary exists (line 944)
2. Wait for terminal ready — 500ms timeout (line 957-971)
3. Clear scrollback (line 979)
4. Write "cd /project\r\nopencode\r\n" via terminalWriteRaw (line 1030)
5. Wait for agent TUI to be ready — 1.5s timeout (line 1035-1046)
6. 200ms settle pause (line 1049)
7. Assemble prompt from systemPrompt + initContent + thoughtProcess (lines 1056-1070)
8. Send prompt via terminalWriteRaw with bracketed paste (line 1071-1082)
```

### WHY THE PROMPT IS DROPPED:

**Problem 1: `terminalWriteRaw` bypasses the agent state machine**

The prompt is sent via `terminalWriteRaw` (line 1076), which goes directly to `terminalManager.write()` in main.ts. This BYPASSES the `agent:send` IPC handler (main.ts:11097) which has:
- Phase checking (line 11126): if `phase === 'launching' || phase === 'busy'`, writes are QUEUED in `pendingWrites[]`
- The queued writes are flushed by `flushPendingAgentWrites()` (line 10159) when the agent becomes ready

By using `terminalWriteRaw`, the initial prompt:
- Is NOT queued if the agent is still launching
- Is NOT tracked in the agent state machine
- Is written to the PTY immediately, even if the agent's TUI input handler isn't listening yet

**Problem 2: 1.5s timeout is too short for opencode cold start**

Line 1045: `setTimeout(() => { ... resolve(); }, 1500);`

opencode is a Go binary that needs to:
1. Start the process
2. Initialize its BubbleTea/Elm runtime
3. Set up the TUI
4. Grab PTY input focus
5. Render its initial UI

On slow machines or cold starts, this can take 3-5+ seconds. The 1.5s timeout fires, the code proceeds to send the prompt, but opencode's TUI hasn't grabbed PTY input yet. The bracketed paste content goes to the shell's input buffer, which opencode then overwrites when it renders its TUI.

**Problem 3: No feedback loop — prompt delivery is fire-and-forget**

After sending the prompt (line 1076), there's no verification that it was received. The code logs the result but doesn't check if the agent actually processed it.

### THE FIX:

**Use `agent:send` instead of `terminalWriteRaw` for the initial prompt.**

The `agent:send` handler (main.ts:11097) already has the queuing mechanism:
- If `phase === 'launching'` → prompt is queued in `pendingWrites[]`
- When `markAgentReady()` fires (line 10168) → `flushPendingAgentWrites()` writes all queued prompts
- The prompts are wrapped via `buildAgentInputPayload()` with proper bracketed paste

This means:
1. The prompt waits in the queue until the agent is truly ready
2. It's written with proper bracketed paste formatting
3. It's tracked in the agent state machine
4. It's recorded in the `terminal_messages` DB table

## Key Source Files

### TerminalPage.tsx — initializeTerminal (lines 935-1088)
```typescript
// Line 1030 — LAUNCH AGENT (writes cd + agent command)
const r2 = await window.deskflowAPI?.terminalWriteRaw?.(terminalId, launchCommand);

// Line 1035-1046 — WAIT FOR AGENT TO BE READY (1.5s timeout)
await new Promise<void>((resolve) => {
  let done = false;
  const remover = window.deskflowAPI?.onAgentReady?.((data: { terminalId: string }) => {
    if (data.terminalId === terminalId && !done) {
      done = true;
      remover?.();
      resolve();
    }
  });
  setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 1500);
});

// Line 1071-1082 — WRITE SYSTEM PROMPT (the broken part)
if (parts.length > 0 && window.deskflowAPI?.terminalWriteRaw) {
  const combined = parts.join('\n\n');
  const payload = '\x1b[200~' + combined + '\x1b[201~\r';
  const sendResult = await window.deskflowAPI.terminalWriteRaw(terminalId, payload);
}
```

### main.ts — agent:send handler (lines 11097-11141)
```typescript
ipcMain.handle('agent:send', async (_event, terminalId, data, agentType?) => {
  const st = agentStates.get(terminalId);
  if (!st) return { success: false, error: 'Agent session not found' };

  // If agent is still launching or busy → QUEUE the write
  if (st.phase === 'launching' || st.phase === 'busy') {
    st.pendingWrites = st.pendingWrites || [];
    st.pendingWrites.push(data);
    recordPrompt();
    return { success: true, queued: true };
  }

  // Otherwise → write immediately
  const payload = buildAgentInputPayload(data, st.agentType || type);
  const success = terminalManager.write(terminalId, payload);
  if (success) st.phase = 'busy';
  return { success, queued: false };
});
```

### main.ts — markAgentReady + flushPendingAgentWrites (lines 10159-10174)
```typescript
function flushPendingAgentWrites(id: string, st: AgentState) {
  if (!st.pendingWrites || st.pendingWrites.length === 0) return;
  const writes = [...st.pendingWrites];
  st.pendingWrites = [];
  for (const w of writes) {
    terminalManager.write(id, buildAgentInputPayload(w, st.agentType));
  }
}

function markAgentReady(id: string, st: AgentState) {
  if (st.phase !== 'launching') return;
  st.phase = 'ready';
  clearAgentTimeout(id);
  flushPendingAgentWrites(id, st);
  broadcast('agent:ready', { terminalId: id });
}
```

### preload.ts — agentSend bridge
```typescript
agentSend: (terminalId: string, data: string, agentType?: string) =>
  ipcRenderer.invoke('agent:send', terminalId, data, agentType),
```

## CONSTRAINTS
- Do NOT change the agent launch command (line 1030) — that must remain `terminalWriteRaw` because it's a shell command, not an agent message
- Do NOT change the `agent:send` handler logic — it's correct
- Only change `initializeTerminal` in TerminalPage.tsx (lines 1071-1082)
- The fix must work for ALL agent types: opencode, claude, codex, gemini
- Tailwind v4 only
- No git commands
