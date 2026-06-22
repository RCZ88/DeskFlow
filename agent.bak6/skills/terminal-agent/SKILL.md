---
id: terminal-agent
name: Terminal Agent Prompt Fix
category: debugging
applicable_to: [terminal, agent, pty, prompts]
version: 1.0.0
created: 2026-06-04
updated: 2026-06-04
tags: [terminal, pty, agent-communication, stdin, prompt-detection]
inputs:
  - name: Symptom
    type: text
    description: What's wrong with terminal agent communication (e.g., "text goes to shell", "agent:ready never fires", "system prompt not received")
    required: true
    source: user
  - name: Error Logs
    type: text
    description: Console output or terminal display showing what happened
    required: false
    source: system
outputs:
  - name: Root Cause
    type: markdown
    description: What's causing the terminal agent communication failure
  - name: Fix Steps
    type: code
    description: Exact code changes needed to fix the issue
  - name: Verification
    type: markdown
    description: How to verify the fix works
components:
  - name: Architecture Overview
    description: How PTY stdin, spawnTerminal, initializeTerminal, and agent:ready interact
    source: system
  - name: Root Cause Analysis
    description: Identifying why text goes to shell instead of agent
    source: agent
  - name: Fix Implementation
    description: Applying event-driven sequencing fixes
    source: agent
  - name: Verification
    description: Confirming agent receives text correctly
    source: agent
---

# Terminal Agent Prompt Fix

## Architecture Overview

### Data Flow

```
User types prompt (InstructionPanel) / System writes init content
        │
        ▼
IPC channel: 'terminal-write' or 'spawn-terminal'
        │
        ▼
main.ts handler → terminalManager.write(id, data)
        │
        ▼
node-pty → t.pty.write(data) → PTY master fd
        │
        ▼
Kernel PTY buffer → stdin of the FOREGROUND process
                     (PowerShell first, then agent CLI)
```

**Critical insight:** `t.pty.write(data)` writes to the PTY's **stdin buffer**, not to a specific process. Whichever process is running in the terminal and reading from stdin receives the data. If the agent CLI hasn't started yet, PowerShell gets the data.

### Key Components

| Component | File:Line | Purpose |
|-----------|-----------|---------|
| `spawnTerminal` IPC handler | `main.ts:~6460` | Creates PTY via `node-pty`, attaches data/exit handlers, manages agent:ready detection |
| `detectAgentPrompt` | `main.ts:6221` | Checks last non-empty output line against `/^[>?$]\s*$/` |
| `agent:ready` dispatch | `main.ts:6547-6559` | Fires when prompt detected AND `agentType` is set — sends `{ terminalId }` to renderer |
| `initializeTerminal` | `TerminalPage.tsx:~368` | Launch sequence: wait terminal:ready → write launch cmd → wait agent:ready → write system prompt |
| `handleCreateNewSession` | `TerminalPage.tsx:~775` | Creates terminal tab, spawns PTY, initializes, writes user prompt |
| `InstructionPanel` send | `TerminalPage.tsx:~753` | `handleSendToTerminal` — writes user messages to PTY stdin |
| `OnAgentReady` preload bridge | `preload.ts:~271` | Exposes `window.deskflowAPI.onAgentReady(callback)` to renderer |

### agent:ready Detection

The `spawn-terminal` data handler accumulates all PTY output in a `dataBuffer` string. On each data chunk:
1. Append to `dataBuffer` (trim to last 5000 chars if >10000)
2. Call `detectAgentPrompt(dataBuffer)` — checks last non-empty line against `/^[>?$]\s*$/`
3. If prompt detected AND `agentType` is truthy AND not already ready:
   - Set `agentReady = true`
   - Clear any fallback timeout
   - Send `agent:ready` event to ALL windows (with try-catch for disposed frames)
4. On subsequent prompt detections (after `agentReady`): parse terminal output for actions/metadata

**The regex `/^[>?$]\s*$/` matches:**
- `>` alone (PowerShell default, many CLIs)
- `>` with trailing spaces
- `?` (some interactive prompts)
- `$` (bash/zsh default)

**It does NOT match:**
- `PS C:\Users\>` (PowerShell full path — starts with `PS ` before `>`)
- `> ` with text before it
- `opencode>` or `claude>` (agent name prefix)
- Custom prompt strings with additional text after the prompt character

## Common Failure Modes

### Failure 1: agent:ready never fires

**Symptom:** `initializeTerminal` hangs for 15s (timeout), then writes system prompt anyway — but text goes to shell.

**Root cause:** One of:
- `spawnTerminal` called WITHOUT `agentType` argument → `agentType` is undefined → `agent:ready` detection skipped (`!agentType && promptDetected` is false because `agentType` is falsy)
- Agent CLI outputs a PROMPT that doesn't match `/^[>?$]\s*$/` — e.g., `opencode> ` starts with text before `>`, so regex doesn't match
- Agent CLI is NOT INSTALLED or NOT ON PATH — PowerShell outputs error, never shows agent prompt

**Fix:**
1. Always pass `agentType` as 3rd arg: `spawnTerminal(id, cwd, 'claude')` or `spawnTerminal(id, cwd, agent)`
2. Verify agent CLI is installed: check with `where.exe <agent>` in the handler before spawning
3. Widen regex if needed: consider `/^[>?$]\s/` (match `> ` at start) or `/^[\w-]+>\s/` (match `name> ` style prompts)

### Failure 2: Text written before agent starts goes to PowerShell

**Symptom:** System prompt text appears in terminal output as PowerShell error messages (red text, "...is not recognized as a command")

**Root cause:** `initializeTerminal` writes the launch command + system prompt + thought instruction with fixed setTimeout delays (was 500ms). If the agent CLI takes longer to start than the delay, text arrives at the PTY buffer while PowerShell is still reading stdin.

**Why delays don't work:** PTY buffer queues data, but the **foreground process** reads from it. PowerShell is still the foreground process until the agent CLI starts and takes over stdin. While PowerShell is starting the agent (process creation, inheritance of PTY), PowerShell has already consumed the pending input.

**Fix (applied in v3.97):**
1. `initializeTerminal` now waits for `agent:ready` event (up to 15s) before writing system prompt
2. `agent:ready` means the agent CLI is running and showing its prompt → it's actively reading stdin
3. After `agent:ready`, writes are guaranteed to reach the agent, not PowerShell

**Important:** `initializeTerminal` CONSUMES the `agent:ready` event internally. Callers must NOT set up a SECOND `agent:ready` listener — it will never fire and will timeout.

### Failure 3: User prompt written during init — text interleaved

**Symptom:** The user prompt appears in the terminal mixed in with system prompt content, or doesn't get processed by the agent.

**Root cause:** Writing user prompt before `initializeTerminal` completes. The system prompt and user prompt compete for the same stdin buffer.

**Fix:** Write user prompt AFTER `initializeTerminal()` returns. The function now returns only after the agent is ready and all init content has been written. See `handleCreateNewSession` flow:

```
spawnTerminal(id, cwd, 'claude') → registerTerminal(id) → initializeTerminal(id, 'claude') → // agent ready → writeUserPrompt(prompt)
```

### Failure 4: Agent CLI not on PATH

**Symptom:** Terminal shows `claude : The term 'claude' is not recognized as...` or similar PowerShell error. `agent:ready` never fires.

**Root cause:** The launch command assumes a specific agent name (`'claude'`) is installed and on PATH.

**Fix:**
1. Before spawning, check if the agent binary exists: `try { execSync('where claude') } catch { /* not found */ }`
2. Fall back to available agents or show user the install instruction
3. The agent name should match what's in `NewSessionDialog`'s agent type selector (default: `'opencode'`)

### Failure 5: Multiple agent:ready listeners

**Symptom:** Both `initializeTerminal` AND `handleCreateNewSession` set up `agent:ready` listeners. The first one consumes the event; the second one never fires (hangs for 15s).

**Root cause:** Calling `onAgentReady` in two places for the same terminal.

**Fix:** Only ONE component should listen for `agent:ready`. `initializeTerminal` now owns this listener internally. Callers just `await initializeTerminal()` and then proceed.

## Debugging Checklist

When terminal agent communication fails:

### Step 1 — Check spawnTerminal agentType
```
grep "spawnTerminal" src/pages/TerminalPage.tsx
```
Every call should pass `agentType` as the 3rd argument. If any call passes only 2 args, `agent:ready` detection is disabled.

### Step 2 — Check what the agent CLI actually outputs
Open a regular terminal and run the agent CLI manually. Note what its prompt looks like:
```
$ claude
[Claude startup output...]
> ▏    ← Is this just "> " or "claude> " or something else?
```
Then check if `detectAgentPrompt`'s regex `/^[>?$]\s*$/` matches the actual prompt.

### Step 3 — Verify agent is on PATH
```
where claude   (or where opencode, depending on agent name)
```

### Step 4 — Check for duplicate agent:ready listeners
```
grep -n "onAgentReady" src/pages/TerminalPage.tsx
```
You should see it used ONLY inside `initializeTerminal`. If `handleCreateNewSession` also uses it, the second listener will timeout.

### Step 5 — Add console logging
In `main.ts` at the `detectAgentPrompt` call site (line 6546):
```typescript
console.log(`[spawn-terminal] dataBuffer tail:`, dataBuffer.slice(-200));
console.log(`[spawn-terminal] promptDetected:`, promptDetected, 'agentType:', agentType, 'agentReady:', agentReady);
```

In `TerminalPage.tsx` inside the `agent:ready` listener:
```typescript
window.deskflowAPI?.onAgentReady?.((data) => {
  console.log('[TerminalPage] agent:ready received:', data);
  // ...
});
```

## Fix Template

### When text goes to shell instead of agent:

```typescript
// 1. Ensure spawnTerminal passes agentType
const spawnResult = await window.deskflowAPI.spawnTerminal(terminalId, cwd, agentType);

// 2. initializeTerminal must wait for agent:ready before writing system prompt
// See src/pages/TerminalPage.tsx lines ~368-441 for the correct pattern:
//   - Write launch command
//   - await new Promise(onAgentReady) ← 15s timeout
//   - Write system prompt + init content + thought instruction
//   - Return

// 3. Write user prompt AFTER initializeTerminal returns
// Do NOT set up another onAgentReady listener — initializeTerminal already consumed it
await initializeTerminal(terminalId, agentType);
await window.deskflowAPI.terminalWrite(terminalId, userPrompt + '\r\n');
```

### When agent:ready never fires:

```typescript
// Option A: Verify agentType is truthy
console.assert(agentType, 'agentType must be set for agent:ready detection');

// Option B: Widen the detection regex in main.ts
function detectAgentPrompt(buffer: string): boolean {
  const lines = buffer.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) {
      // Match ">", "? ", "$", "claude> ", "opencode> ", "PS ...> "
      return /^[\w\-.]*[>?$]\s*$/.test(trimmed) || /^>\s/.test(trimmed);
    }
  }
  return false;
}

// Option C: Add fallback — after 8s, check if output contains the agent's welcome message
// and fire agent:ready manually

// Option D: Don't rely on prompt detection at all — use a handshake protocol
// Write a known string to PTY, wait for agent to echo it back or respond
```

## Known Issues

| Issue | Status | Root Cause | Workaround |
|-------|--------|------------|------------|
| Agent CLI (`claude`, `opencode`) not on PATH | Open | No launch verification | Check `where <agent>` before spawn; show install prompt |
| `detectAgentPrompt` regex doesn't match agent prompt format | Open | Regex too strict for some CLIs | Widen regex or use handshake protocol |
| `ContextAssemblyService` not compiled | Open | Not in `package.json` build command | Add to `tsc` command in build:renderer script |
| Multiple data handlers on same terminal | Open | `terminal:create` and `spawn-terminal` both register handlers | Remove legacy `terminal:create` or deduplicate |
| Multiple terminals can share same session ID | Open | Session ↔ terminal mapping not enforced | Add unique constraint or validation |

## Verification

After applying any fix, verify with:

1. **Console logs:** `agent:ready` should fire within 5-15s after spawn
2. **Terminal display:** System prompt text should appear AFTER agent welcome message, not interleaved with PowerShell startup
3. **Agent response:** The agent should respond to the system prompt message (not to PowerShell error output)
4. **User prompt:** `handleSendToTerminal` should work during active sessions (already-working path vs broken init path)
5. **Build:** `npm run build` must pass
