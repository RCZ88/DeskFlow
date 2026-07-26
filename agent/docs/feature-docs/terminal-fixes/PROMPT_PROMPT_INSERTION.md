# PROMPT: Fix Prompt Insertion into AI CLI TUIs

## Raw Request

> "THE BACKEND LOGIC OF THE SYSTEM DOESN'T WORK. with how the handling of the insertion of the prompt into the TUI of the opencode claude code and everything"

## The Problem

When a session is created, the system prompt and init content are supposed to be inserted into the AI CLI's TUI (opencode, claude, etc.). But the text never appears in the TUI.

## Root Cause Analysis

The prompt insertion flow is:

```
initializeTerminal()
  → terminalWriteRaw(terminalId, "opencode\r")  // Launch command
  → wait for agent:ready (3s timeout)
  → agentSend(terminalId, systemPrompt + initContent)  // Send prompt
```

**But `agentSend` goes through the agent state machine:**

```typescript
// main.ts line 11074
if (st.phase === 'launching' || st.phase === 'busy') {
    st.pendingWrites.push(data);  // QUEUED, not sent!
    return { success: true, queued: true };
}
```

**The agent is still in `launching` phase when `agentSend` is called.** The prompt gets queued and never sent because:

1. `initializeTerminal` waits 500ms for terminal ready, then 3s for agent ready
2. But agent ready detection depends on `detectAgentPrompt()` matching a regex
3. If the regex doesn't match the actual CLI prompt, agent stays in `launching`
4. `agentSend` sees `phase === 'launching'` → queues the prompt
5. Prompt is never sent because agent never transitions to `ready`

## The Fix

### Fix 1: Bypass agent state machine for initial prompt

The initial prompt (system prompt + init content) should be sent directly to the PTY via `terminalWriteRaw`, NOT through `agentSend`. The agent state machine is for ongoing conversation, not for the initial prompt.

**In `initializeTerminal` at TerminalPage.tsx, change:**

```typescript
// BEFORE (line 1070-1076):
if (parts.length > 0 && window.deskflowAPI?.agentSend) {
    const combined = parts.join('\n\n');
    const sendResult = await window.deskflowAPI.agentSend(terminalId, combined, agent);
    if (!sendResult?.success) {
        showError(sendResult?.error || 'Failed to send initialization prompt to agent', 'error');
    }
}

// AFTER:
if (parts.length > 0 && window.deskflowAPI?.terminalWriteRaw) {
    const combined = parts.join('\n\n');
    // Send directly to PTY — bypasses agent state machine
    // Use bracketed paste mode for TUI compatibility
    const payload = '\x1b[200~' + combined + '\x1b[201~\r';
    const sendResult = await window.deskflowAPI.terminalWriteRaw(terminalId, payload);
    if (!sendResult?.success) {
        showError('Failed to send initialization prompt to terminal', 'error');
    }
}
```

**Why this works:** `terminalWriteRaw` writes directly to the PTY stdin, bypassing the agent state machine entirely. The TUI receives the text as bracketed paste input.

### Fix 2: Also send init content separately after prompt

The init content (INITIALIZE.md, problems, requests) should be sent as a separate message after the system prompt, with a delay:

```typescript
// After sending system prompt:
if (initContent) {
    await new Promise(r => setTimeout(r, 500));
    const initPayload = '\x1b[200~' + initContent + '\x1b[201~\r';
    await window.deskflowAPI.terminalWriteRaw(terminalId, initPayload);
}
```

### Fix 3: Fix agent ready detection regex

The `readyRegex` for opencode (`/^(?:opencode)?\s*>\s*$/i`) might not match the actual prompt. Check what opencode actually shows and update the regex.

**To debug:** Add logging in `detectAgentPrompt` to see what the actual last line is:

```typescript
function detectAgentPrompt(buffer: string, agentType?: string): boolean {
    const clean = stripAnsi(buffer);
    const lines = clean.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (trimmed.length === 0) continue;
        if (looksLikeShell(trimmed)) return false;
        const regex = getAgentConfig(agentType).readyRegex;
        const match = regex.test(trimmed);
        console.log('[AGENT-READY] Last line:', JSON.stringify(trimmed), 'regex:', regex, 'match:', match);
        return match;
    }
    return false;
}
```

## Files to Modify

1. `src/pages/TerminalPage.tsx` — `initializeTerminal` function: change `agentSend` to `terminalWriteRaw` for initial prompt
2. `src/main.ts` — `detectAgentPrompt` function: add logging, potentially update regex

## Testing

1. Create new session with opencode
2. Check console for `[AGENT-READY]` logs — verify the regex matches
3. Check that the system prompt appears in the TUI
4. Check that init content appears after the system prompt
5. Type in the TUI — verify input works
