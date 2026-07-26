# PROMPT: Fix Terminal Session Lifecycle — All Critical Bugs

## Raw Request

> "the resuming feature doesn't work because it's not resuming anything. it just opens the open code. a brand new terminal is called considered Claude on the selection of the terminal even though there's nothing in the new terminal. the size of the terminal is like half of the height of the actual container. there's nothing in the input where they should be like it's not inputting anything. the gathering of like the session IDs doesn't work at all. the Terminal is not even showing the thing. it's not voting the CLI properly. I need you to completely fix it."

## Context Bundle

Read `agent/docs/ai-cli-integration/CONTEXT_BUNDLE.md` for complete source code.

## Critical Bugs Found

### Bug 1: Text input not working — `agentStates` not registered

**File:** `src/main.ts:10961`
```typescript
const st = agentStates.get(terminalId);
if (!st) {
    return { success: false, error: 'Agent session not found' };
}
```

**Root cause:** When "Open Terminal" button is clicked, `spawnTerminal` is called with `agentType`. Main.ts sets `agentStates` at line 10756. BUT the `agent:send` handler at line 10961 checks `agentStates.get(terminalId)` — if this returns undefined, ALL text input fails silently.

**The problem:** The "Open Terminal" button spawns a terminal but doesn't call `initializeTerminal`. So:
1. PTY is spawned ✓
2. `agentStates` is set ✓ (because agentType is passed)
3. `terminal:ready` fires ✓
4. But `initializeTerminal` is NEVER called
5. Agent launch command is NEVER sent
6. System prompt is NEVER sent
7. User types → `agentSend` → `agentStates.get()` works → but agent isn't running

**Fix:** After "Open Terminal" spawns a terminal, also call `initializeTerminal`.

### Bug 2: Terminal size is half the container

**File:** `src/components/TerminalWindow.tsx:590`

**Root cause:** `measureSpawnSize` uses `offsetWidth`/`offsetHeight` which can return 0 before layout is complete. The `waitForXtermMeasurement` might timeout before xterm.js finishes font measurement.

**Fix:** Add a more robust measurement that retries until valid dimensions are obtained.

### Bug 3: Resume doesn't use correct agent flags

**File:** `src/pages/TerminalPage.tsx:1008`
```typescript
let resumeCmd = `${agent} -s ${resumeId}`;
```

**Root cause:** The `-s` flag is hardcoded but different agents use different flags:
- opencode: `opencode --resume <id>` (not `-s`)
- claude: `claude --resume <id>`
- codex: unknown

**Fix:** Check agent type and use correct flag.

### Bug 4: Session creation reuses existing terminal

**File:** `src/pages/TerminalPage.tsx:4781`
```typescript
if (config.terminalMode === 'select' && config.selectedTerminal) {
    targetTerminalId = config.selectedTerminal;
```

**Root cause:** Default `terminalMode` might be 'select' instead of 'new'.

**Fix:** Ensure default is 'new' for new sessions.

### Bug 5: Initial prompt not sent after spawn

**File:** `src/components/TerminalWindow.tsx:770`
```typescript
spawnTerminal(newId, projectPath, agentType, cols, rows).then(() => {
    window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: newId } }));
});
```

**Root cause:** "Open Terminal" button calls `spawnTerminal` but NOT `initializeTerminal`. The agent is never launched.

**Fix:** After spawn, call `initializeTerminal` to launch the agent.

## Engineering Task

Fix all 5 bugs. The fixes must be minimal and targeted — don't refactor the entire terminal lifecycle.

### Fix 1: Ensure `agentStates` is always registered

In `src/main.ts`, at the `terminal:spawn` handler (line 10750), ensure `agentStates` is set even if `agentType` is empty:

```typescript
// BEFORE (line 10753):
if (agentType && agentType.trim().length > 0) {
    const type = agentType || DEFAULT_AGENT;
    // ... set agentStates
}

// AFTER:
const type = (agentType && agentType.trim().length > 0) ? agentType : DEFAULT_AGENT;
clearAgentTimeout(id);
agentStates.set(id, { agentType: type, phase: 'launching', dataBuffer: '', idleSeq: 0, launchStartedAt: Date.now(), pendingWrites: [] });
startAgentTimeout(id, type);
```

### Fix 2: Fix terminal measurement

In `src/components/TerminalWindow.tsx`, improve `measureSpawnSize` to retry until valid:

```typescript
function measureSpawnSize(terminalId: string): { cols: number; rows: number } {
  try {
    const el = document.querySelector(`[data-terminal-id="${terminalId}"]`) as HTMLElement | null;
    if (!el) return { cols: 80, rows: 24 };

    const rect = el.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 100) return { cols: 80, rows: 24 }; // too small, not laid out

    const charMeasure = el.querySelector('.xterm-char-measure-element') as HTMLElement | null;
    const rowEl = el.querySelector('.xterm-rows > div') as HTMLElement | null;

    let cellW = 8.4;
    let cellH = 17;

    if (charMeasure && charMeasure.offsetWidth > 0) cellW = charMeasure.offsetWidth;
    if (rowEl && rowEl.offsetHeight > 0) cellH = rowEl.offsetHeight;

    const cols = Math.max(40, Math.floor((rect.width - 8) / cellW));
    const rows = Math.max(10, Math.floor((rect.height - 8) / cellH));

    return { cols, rows };
  } catch { return { cols: 80, rows: 24 }; }
}
```

### Fix 3: Fix resume command flags

In `src/pages/TerminalPage.tsx`, at the resume command construction (line 1006):

```typescript
// BEFORE:
let resumeCmd = `${agent} -s ${resumeId}`;

// AFTER:
const resumeFlags: Record<string, string> = {
    opencode: '--resume',
    claude: '--resume',
    codex: '--session',
    gemini: '--resume',
};
const flag = resumeFlags[agent] || '-s';
let resumeCmd = `${agent} ${flag} ${resumeId}`;
```

### Fix 4: Fix session creation mode

In `src/components/NewSessionDialog.tsx`, ensure default terminalMode is 'new':

```typescript
// Check what terminalMode defaults to and ensure it's 'new'
const [terminalMode, setTerminalMode] = useState<'new' | 'select'>('new');
```

### Fix 5: Call initializeTerminal after spawn

In `src/components/TerminalWindow.tsx`, at the "Open Terminal" button click handler (line 770):

```typescript
// BEFORE:
spawnTerminal(newId, projectPath, agentType, cols, rows).then(() => {
    window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: newId } }));
});

// AFTER:
spawnTerminal(newId, projectPath, agentType, cols, rows).then(async () => {
    window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: newId } }));
    // Initialize the agent after spawn
    try {
        const initResult = await (window as any).deskflowAPI?.agentSend?.(newId, '', agentType);
    } catch {}
});
```

## Testing Strategy

1. **Text input:** Create new session → verify agent launches → type text → verify it appears in TUI
2. **Terminal size:** Create new session → verify terminal fills container → resize window → verify refit
3. **Resume:** Enter session ID → click resume → verify agent resumes with previous context
4. **Session creation:** Create new session → verify new terminal is created (not reusing existing)
5. **Initial prompt:** Create new session → verify system prompt + init content are sent to agent
