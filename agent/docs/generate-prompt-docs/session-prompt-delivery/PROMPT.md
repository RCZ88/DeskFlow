# PROMPT — Session Initial Prompt Delivery Fix

## Raw Request
"the problem that there still is regarding the text input, but currently it still doesn't input the text. It doesn't send the text properly. So I want to create a new session. It still just opens the open code, but doesn't put any text. Here's a text input whatsoever. It doesn't send it. It doesn't have the system where it opens another terminal and retrieves the open code session."

## Problem Statement
When creating a new session, the terminal spawns and opencode launches, but the initial prompt/instruction is never delivered. The user sees opencode's TUI with no input.

## Context
Read `TERMINAL_CONTEXT_BUNDLE.md` first. It contains the FULL source code for: initializeTerminal() (lines 935-1088), agent:send IPC handler (lines 11097-11141), buildAgentInputPayload() (line 10144), markAgentReady() (line 10168), flushPendingAgentWrites() (line 10159), AgentState interface (line 10131), AGENT_CONFIGS (line 10031), TerminalPane input handling (lines 218-319), measureSpawnSize() (lines 590-618), and all preload IPC bridges. The context bundle is self-contained.

## ROOT CAUSE (confirmed)

**Line 1071-1082 in `src/pages/TerminalPage.tsx`:**

```typescript
if (parts.length > 0 && window.deskflowAPI?.terminalWriteRaw) {
  const combined = parts.join('\n\n');
  const payload = '\x1b[200~' + combined + '\x1b[201~\r';
  const sendResult = await window.deskflowAPI.terminalWriteRaw(terminalId, payload);
}
```

The initial prompt is sent via `terminalWriteRaw`, which BYPASSES the agent state machine. The `agent:send` handler (main.ts:11097) has a queuing mechanism that holds writes until the agent is ready, but `terminalWriteRaw` skips this entirely.

Additionally, the 1.5s timeout (line 1045) is too short for opencode cold starts. The prompt arrives at the PTY before the TUI's input handler is listening.

## MANDATORY FIX

### Change: Use `agentSend` for the initial prompt instead of `terminalWriteRaw`

In `src/pages/TerminalPage.tsx`, lines 1071-1082, change from:

```typescript
if (parts.length > 0 && window.deskflowAPI?.terminalWriteRaw) {
  const combined = parts.join('\n\n');
  const payload = '\x1b[200~' + combined + '\x1b[201~\r';
  const sendResult = await window.deskflowAPI.terminalWriteRaw(terminalId, payload);
  if (!sendResult?.success) {
    showError('Failed to send initialization prompt to terminal', 'error');
  } else {
    console.log('[TerminalPage] Sent initialization prompt via terminalWriteRaw:', combined.length, 'chars');
  }
}
```

To:

```typescript
if (parts.length > 0 && window.deskflowAPI?.agentSend) {
  const combined = parts.join('\n\n');
  // Use agentSend instead of terminalWriteRaw — this goes through the agent state machine
  // which queues the write if the agent is still launching, then flushes when ready
  const sendResult = await window.deskflowAPI.agentSend(terminalId, combined, agent);
  if (!sendResult?.success) {
    showError('Failed to send initialization prompt to terminal', 'error');
  } else {
    const mode = sendResult?.queued ? 'queued (waiting for agent ready)' : 'sent immediately';
    console.log('[TerminalPage] Sent initialization prompt via agentSend:', combined.length, 'chars,', mode);
  }
}
```

**Why this works:**
1. `agentSend` calls IPC `agent:send` → main.ts handler checks `agentStates[terminalId].phase`
2. If `phase === 'launching'` (agent not ready yet) → prompt is queued in `pendingWrites[]`
3. When `markAgentReady()` fires (after TUI prompt detected) → `flushPendingAgentWrites()` writes all queued prompts via `buildAgentInputPayload()` with proper bracketed paste
4. The prompt is tracked in the agent state machine and recorded in DB

**Do NOT change:**
- The agent launch command at line 1030 — must remain `terminalWriteRaw` (it's a shell command, not an agent message)
- The `agent:send` handler in main.ts — it's correct
- The `buildAgentInputPayload` function — it's correct

## VERIFICATION
1. Build: `npx vite build` → must succeed
2. Create a new session with opencode
3. Check console for: `[TerminalPage] Sent initialization prompt via agentSend: N chars, queued (waiting for agent ready)`
4. Verify the prompt text appears in the opencode TUI
5. Verify the agent processes the prompt and responds
