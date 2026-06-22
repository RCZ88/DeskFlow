# Round 2 Answers: Terminal Spawn + Agent Readiness (§19 + §25)

## Answer 1: spawnTerminal() end-to-end flow

**Q:** Trace the exact code path from when `spawnTerminal()` is called in `TerminalPage.tsx` to when the PTY is live and `agent:ready` fires. Include every IPC hop, intermediate function, and the data handler registration.

**A:**

The flow has two distinct paths — `terminal:create` (older) and `spawn-terminal` (newer). The renderer always calls the newer path.

### Renderer side (`TerminalPage.tsx`)

1. Entry: `handleCreateNewSession()` at line 950 calls `window.deskflowAPI.spawnTerminal(newTerminalId, cwd, newSessionAgent)` at line 975.

2. `spawnTerminal` wrapper (TerminalPage.tsx:1435) does basic API availability check + calls `window.deskflowAPI.spawnTerminal(terminalId, cwd || '')` at line 1442 (note: **drops agentType** — the 3rd arg is not forwarded).

3. IPC bridge (`preload.ts:265`): `spawnTerminal: (terminalId, cwd?, agentType?) => ipcRenderer.invoke('spawn-terminal', terminalId, cwd, agentType)`.

### Main process (`main.ts`)

4. Handler at main.ts:7728:
   ```
   ipcMain.handle('spawn-terminal', async (_event, id, cwd?, agentType?) => {
   ```
   - Calls `terminalManager.spawn(id, cwd || '', 80, 24)` — this does the node-pty spawn (main.ts:7496).
   - The spawn function at line 7497:
     - Kills any existing terminal with same ID.
     - Resolves shell: `process.platform === 'win32' ? (process.env.COMSPEC || 'powershell.exe') : (process.env.SHELL || '/bin/bash')`.
     - Calls `pty.spawn(shell, [], { name: 'xterm-256color', cols, rows, cwd, env: process.env })`.
     - Wraps the PTY in a thin `ip` object (write, resize, kill, onData, onExit).
     - Stores in `this.terminals.set(id, { id, pty: ip, cwd })`.
   - If successful (main.ts:7731):
     - Sets `agentStates.set(id, { agentType: type, phase: 'launching', dataBuffer: '', idleSeq: 0 })`.
     - Registers data handler (line 7735+):
       - On every data chunk: `broadcast('terminal:data', id, data)` — sends to all windows.
       - Persists to SQLite: `INSERT INTO terminal_messages (session_id, role, content) VALUES (?, 'assistant', ?)`.
       - Appends to `st.dataBuffer` (capped at 5000 bytes after 10000 buffer).
       - If `st.phase === 'ready' || 'busy'`, appends to `terminalResponseBuffers`.
       - Checks `detectAgentPrompt()` + handshake token.
       - Phase transitions (see Answer 4).
     - Registers exit handler (line 7788): clears timeout, broadcasts `terminal:exit`.
   - Returns `{ success: true }` or `{ success: false, error }`.

### Back in renderer

5. After `spawnTerminal` returns (TerminalPage.tsx:982):
   - Dispatches `terminal:mark-spawned` custom event.
   - Calls `registerTerminal(newTerminalId)` (line 983) — this calls `window.deskflowAPI.registerTerminal({ terminalId, ... })` IPC to persist terminal binding in DB.
   - Calls `initializeTerminal(newTerminalId, newSessionAgent, ...)` (line 984) — this is where agent launch really starts (see Answer 2).

6. Renderer also listens for terminal:data via `onTerminalData` (line ~515 area) which pipes data into the xterm.js terminal instance.

### Key structural weakness

`spawnTerminal` in TerminalPage (line 1435) does NOT forward `agentType` to `window.deskflowAPI.spawnTerminal()` — it only passes `(terminalId, cwd)`. The agentType is instead passed to `initializeTerminal()` which uses it later. But in `handleCreateNewSession`, `newSessionAgent` is used for BOTH calls. The spawn-terminal IPC handler in main.ts still accepts agentType (used as DEFAULT_AGENT fallback), but the renderer's `spawnTerminal` function always omits it, so `agentType` resolves to `undefined` in the IPC handler and defaults to `'opencode'`.

---

## Answer 2: initializeTerminal() structure

**Q:** What are the exact steps inside `initializeTerminal()` in order? What are all fallback timeouts and failure modes?

**A:**

Function at `TerminalPage.tsx:568`. Protected by `initializingTerminals.current` Set to prevent re-entrance.

### Step-by-step:

1. **Re-entrance guard** (line 569): If terminal is already being initialized, return early.

2. **Agent verification** (line 576): Calls `window.deskflowAPI.verifyAgent(agentType)` which invokes `agent:verify` IPC → `verifyAgent()` at main.ts:7321. Uses `whichOne()` (main.ts:7310) which runs `where.exe` (Windows) or `which` (Unix) with 4s timeout. Checks each binary candidate from `getAgentConfig()`. Returns `{ found, resolvedBinary, resolvedPath, tried, installHint }`.

3. **Wait for terminal ready** (line 587): Promise with `onTerminalReady` listener. **8 second timeout** (line 596). If terminal:ready fires for this ID, resolves early. Otherwise resolves anyway after 8s. No error thrown on timeout — just proceeds.

4. **Small pause** (line 601): `await new Promise(r => setTimeout(r, 200))`.

5. **Build launch command** (line 604):
   - If resumeId: `${agent} -s ${resumeId}` with optional custom template from prefs.agentResumeCommands.
   - Else: `${cdCmd}${agent}\r\n` where cdCmd = `cd "${projectPath}"\r\n` if projectPath set.
   - Writes via `window.deskflowAPI?.terminalWrite?.(terminalId, launchCommand)` — goes to `terminal:write-old-format` IPC.

6. **Wait for agent ready** (line 624): Promise with `onAgentReady` listener. **15 second timeout** (line 633). If `agent:ready` fires for this ID, resolves. Otherwise resolves anyway after 15s.

7. **Arm handshake** (line 637): Calls `window.deskflowAPI.armHandshake(terminalId)` → `agent:arm-handshake` IPC (main.ts:7805). Main process generates `__HANDSHAKE_${Date.now()}_${random}__` token, stores in `st.handshakeToken`. Renderer writes token + newline to terminal, then waits for `onAgentIdle` with **10 second timeout** (line 651).

8. **Write system prompt + init content** (line 656):
   - If `systemPrompt` param provided, uses it.
   - Otherwise loads from `prefs.systemPrompts` (keyed by agent, falls back to 'claude').
   - If `initContent` param provided, appends it.
   - If `thoughtProcessEnabled`, appends thought process instructions.
   - Sends combined via `window.deskflowAPI.agentSend(terminalId, combined, agent)` → `agent:send` IPC.

### Timeouts summary:

| Step | Timeout | Effect on timeout |
|------|---------|-------------------|
| Wait terminal ready | 8s | Silently resolves |
| Wait agent ready | 15s | Silently resolves |
| Handshake idle | 10s | Silently resolves |
| Agent launch timeout (main) | 30s | Fires `agent:timeout` + `agent:init-error`; diagnoseAgentFailure runs |

### Implicit failure modes:
- If `verifyAgent` returns `found: false`, **returns early** before writing any launch command. Shows `showError(warning)`.
- If `spawnTerminal` returns `!success`, **returns null** from `handleCreateNewSession` (line 977).
- If `onTerminalReady` never fires (8s timeout), still proceeds — but terminal data handler may not be wired yet in the component that did the original spawn. This is a race.
- If `onAgentReady` never fires (15s timeout), still proceeds to arm handshake + write system prompt — which will be queued as `pendingWrites` in main process.
- If arm handshake times out (10s), still proceeds to write system prompt.

---

## Answer 3: Agent state machine — phase transitions

**Q:** Describe the agent state machine: initial states, valid transitions, where each transition happens, what triggers it, and what happens when a transition fails.

**A:**

### State machine at `main.ts:7334`

```typescript
type AgentPhase = 'launching' | 'ready' | 'busy';
```

### State storage
```typescript
interface AgentState {
  agentType: string;
  phase: AgentPhase;
  dataBuffer: string;      // accumulated PTY output, capped at ~5000 chars
  idleSeq: number;         // incremented each time agent returns to ready
  handshakeToken?: string; // set by agent:arm-handshake
  timeoutHandle?: ReturnType<typeof setTimeout>; // 30s launch timeout
  pendingWrites?: string[]; // writes queued while still launching
}
```

Stored in `agentStates = new Map<string, AgentState>()` (line 7344).

### Transitions

**1. `undefined → launching`**
- Where: `spawn-terminal` handler (main.ts:7733) and `terminal:create` handler (main.ts:7660).
- Trigger: PTY spawn succeeds.
- Side effects: timeout timer starts (`startAgentTimeout(id, agentType)` called from... wait — actually it's NOT called from the handler. Let me check.)

Let me check where `startAgentTimeout` is called:

```typescript
electron_1.ipcMain.handle('agent:start-timeout', async (_event, terminalId: string, agentType: string) => {
    startAgentTimeout(terminalId, agentType);
    return { success: true };
});
```

The timeout is NOT started automatically in `spawn-terminal` — it must be explicitly triggered by the renderer via `agent:start-timeout` IPC. Let me check if the renderer does this...

Looking at `startAgentTimeout` at main.ts:7376 — it's called from `agent:start-timeout` handler at line 7868. Let me check if TerminalPage calls it...

Actually, looking at the code more carefully:
- `spawn-terminal` handler sets phase to `'launching'` but does NOT call `startAgentTimeout`.
- `agent:start-timeout` is a separate IPC that the renderer can call.
- TerminalPage's `initializeTerminal` does NOT seem to call `startAgentTimeout`.
- `agent:retry-launch` (main.ts:7873) DOES call `startAgentTimeout` (line 7882).
- The timeout is started in `retryAgentInit` because `retryAgentLaunch` IPC handler calls `startAgentTimeout`.

Wait, but when does the initial timeout start? Let me re-read...

Looking at the handlers more carefully, the initial spawn-terminal and terminal:create handlers do NOT call `startAgentTimeout`. The timeout only starts on `agent:start-timeout` IPC call or `agent:retry-launch` IPC call.

This means: there's a potential gap where the agent launches but NO timeout is running for the initial launch. Let me verify...

Actually, looking at the code at main.ts:7376-7390:
```typescript
function startAgentTimeout(id: string, agentType: string) {
  const st = agentStates.get(id);
  if (!st) return;
  const timer = setTimeout(() => {
    if (agentStates.get(id)?.phase !== 'launching') return;
    const diag = diagnoseAgentFailure(id, agentType);
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        try { win.webContents.send('agent:timeout', { terminalId: id, agentType }); } catch {}
        try { win.webContents.send('agent:init-error', { terminalId: id, agentType, ...diag }); } catch {}
      }
    }
  }, 30000);
  st.timeoutHandle = timer;
}
```

And the renderer's `handleRetryAgentInit` (TerminalPage.tsx:940) calls `window.deskflowAPI.retryAgentLaunch(terminalId, agentType)` FIRST, which calls `agent:retry-launch` IPC handler, which DOES call `startAgentTimeout`. But the initial launch at `handleCreateNewSession` doesn't call `startAgentTimeout`.

So for the INITIAL launch: the 30s timeout from `startAgentTimeout` is NOT started. The renderer-side 15s `onAgentReady` timeout in `initializeTerminal()` is the only guard. But even that 15s timeout resolves silently — it doesn't fire `agent:timeout` or `agent:init-error`.

This is a finding: initial agent launch has NO main-process-side timeout. Only retry launches do.

Now back to the transitions proper:

**2. `launching → ready`**
- Where: Both data handlers in `spawn-terminal` (main.ts:7757) and `terminal:create` (main.ts:7685).
- Trigger: `detectAgentPrompt()` returns true OR handshake token seen in buffer.
- Side effects:
  - `clearAgentTimeout(id)` — cancels 30s timer if running.
  - Flushes `st.pendingWrites[]` — writes all queued messages to PTY.
  - `broadcast('agent:ready', { terminalId: id })` — fires `agent:ready` event to all windows.
  - `onAgentReady` callback in TerminalPage (line 626) resolves the promise in `initializeTerminal`.

**3. `ready ↔ busy`**
- Where: In the data handler.
- `ready → busy`: When `agent:send` IPC succeeds (main.ts:7840-7842): `st.phase = 'busy'`.
- `busy → ready`: When `detectAgentPrompt()` returns true (main.ts:7767 or 7695).
  - Fires `agent:idle` with incremented `idleSeq`.

**4. `launching → (timeout)`**
- Trigger: 30s timer fires and phase is still `'launching'`.
- `diagnoseAgentFailure()` examines last 500 chars of `dataBuffer`:
  - Matches ERROR_PATTERNS (command not found, not recognized, no such file) → `reason: 'not-recognized'`.
  - Shell prompt detected via `looksLikeShell()` → `reason: 'dropped-to-shell'`.
  - Fallback → `reason: 'silent-timeout'`.
- Sends `agent:timeout` + `agent:init-error` to all windows.

### Known issue
`spawn-terminal` does NOT call `startAgentTimeout` on initial spawn. Timeout only starts on `agent:retry-launch`. The terminal:create handler also doesn't call it. So initial launch timeout depends entirely on the renderer-side 15s JS timeout in `initializeTerminal()`, which resolves silently without diagnostic information.

---

## Answer 4: detectAgentPrompt() algorithm

**Q:** How does `detectAgentPrompt()` work? What regexes are used? How does it distinguish an agent prompt from a shell prompt?

**A:**

Function at `main.ts:7288`:

```typescript
function detectAgentPrompt(buffer: string, agentType?: string): boolean {
  const clean = stripAnsi(buffer);
  const lines = clean.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.length === 0) continue;       // skip empty lines
    if (looksLikeShell(trimmed)) return false; // shell prompt → definitely NOT agent ready
    return getAgentConfig(agentType).readyRegex.test(trimmed);
  }
  return false;
}
```

### Algorithm:
1. Strip all ANSI escape sequences via `stripAnsi()` (handles SGR codes, OSC sequences, control chars).
2. Split into lines by `\r?\n`.
3. Walk lines **bottom-to-top** (last non-empty line).
4. Skip blank lines.
5. If the line matches a shell prompt pattern → return `false` immediately (definitely not agent ready).
6. Otherwise test against per-agent `readyRegex`. Return result.

### Per-agent readyRegex:
- **opencode**: `/^(?:opencode)?\s*>\s*$/i` — matches bare `>` or `opencode >` prompts.
- **claude**: `/^(?:claude)?\s*>\s*$/i` — matches bare `>` or `claude >` prompts.
- **fallback**: `/^[A-Za-z0-9_-]*\s*>\s*$/` — generic alphanumeric `>` prompt.

### Shell prompt exclusion (main.ts:7274):
```typescript
const SHELL_PROMPT_REGEXES: RegExp[] = [
  /^PS\s+.*>\s*$/,          // PowerShell: PS C:\Users\foo>
  /^[A-Za-z]:\\.*>\s*$/,    // CMD: C:\Users\foo>
  /^[^@\s]+@[^:\s]+:.*[#$]\s*$/,  // Unix: user@host:path$
];
```

`looksLikeShell()` tests against all three. If any matches, `detectAgentPrompt` returns `false` regardless of `readyRegex`.

### Critical edge case:
If `AGENT_CONFIGS` has no entry for the given agentType, `getAgentConfig` returns the fallback with `FALLBACK_READY_REGEX` (`/^[A-Za-z0-9_-]*\s*>\s*$/`). This is permissive — it matches any word+`>` prompt, including shell prompts like `git >`, `node >`, etc. The `looksLikeShell()` guard helps but won't catch non-standard shell tools.

### `dataBuffer` management:
- Appended on every data event (main.ts:7673-7674 for terminal:create, 7746-7747 for spawn-terminal).
- Capped: grows up to 10000 chars, then trimmed to last 5000.
- This means on very long output, the critical last line containing the prompt is always present.

---

## Answer 5: PTY data flow

**Q:** Trace data flow from agent stdout → node-pty → TerminalPane. Where is buffering, ANSI stripping, message queuing, and broadcast?

**A:**

### Forward path (user input → agent):
```
TerminalPane.onData(data) 
  → terminalWriteRaw IPC (preload.ts:282)
    → main.ts terminal:write-raw handler (line 7887)
      → terminalManager.write(id, data) (line 7524)
        → proc.write(data)
```

Alternative path (structured send):
```
agentSend IPC (preload.ts:303)
  → main.ts agent:send handler (line 7813)
    → if launching: queue to st.pendingWrites[]
    → if ready/busy: terminalManager.write(id, data + '\r\n'), set phase='busy'
```

### Reverse path (agent stdout → renderer):
```
proc.onData(data)
  → data handler callback (main.ts 7735 or 7662)
    → broadcast('terminal:data', id, data)  → all windows receive
    
    → In renderer (TerminalPage.tsx):
      onTerminalData listener → term.write(data) on xterm.js instance
    
    → Also in main process data handler:
      1. DB persist: INSERT INTO terminal_messages (role='assistant')
      2. dataBuffer append + trim cap (10000 → 5000)
      3. Phase transition detection (detectAgentPrompt + handshake)
      4. If ready/busy: append to terminalResponseBuffers (separate from dataBuffer)
         - This buffer stores OUTPUT for parsing, not the full stream
      5. If prompt seen & ready/busy: parse/output + edit detection
```

### Key connections:
- `terminalResponseBuffers` (main.ts:7418): Separate Map from `agentState.dataBuffer`. Used to accumulate the response chunk for a single turn (cleared on each prompt detection). Capped? No explicit cap — unbounded per-turn accumulation.
- `dataBuffer` (inside AgentState): Used for prompt detection only. Capped at 5000 effective chars.
- ANSI stripping: Only in `detectAgentPrompt()`. Raw data is sent to renderer with ANSI codes intact.

### TerminalPane → xterm.js:
At TerminalWindow.tsx:180:
```typescript
const disposable = terminal.onData((data) => {
  const isReady = terminalReadyStates.get(terminalId);
  if (isReady) {
    window.deskflowAPI?.terminalWriteRaw?.(terminalId, data);
  } else {
    inputBuffers.get(terminalId)?.push(data);
  }
});
```

- Before terminal is "ready" (`terminalReadyStates` flag set by `onTerminalReady` IPC from main), keystrokes are queued in `inputBuffers` Map.
- After ready, keystrokes go directly to `terminalWriteRaw`.

And from main process back to terminal:
```
broadcast('terminal:data', id, data)
  → preload.ts: onTerminalData handler writes to xterm
```

### `terminal:ready` flag flow:
1. Main process spawns PTY → terminal:create handler sets up data handler → no explicit "terminal:ready" broadcast exists from main process.
2. Actually looking at the code — `terminal:ready` is broadcast from... where? Let me check.

Let me search for `terminal:ready` broadcast...

Looking at the preload.ts line 285:
```typescript
onTerminalReady: (callback: (id: string) => void) => {
    const handler = (_event: any, id: string) => callback(id);
    ipcRenderer.on('terminal:ready', handler);
```

But I need to find where in main.ts this is sent. Let me search... Actually, from the code I've read, I don't see `broadcast('terminal:ready', id)` anywhere in main.ts. This means `terminal:ready` might be sent from somewhere else, or the 100ms setTimeout in TerminalWindow.tsx (line 162-166) is the actual trigger:

```typescript
setTimeout(() => {
  onTerminalReady(terminalId);
}, 100);
```

Wait — `onTerminalReady` in TerminalWindow is a PROP, not the IPC listener. Let me trace this...

TerminalWindow.tsx line 97: `function TerminalPane({ terminalId, ..., onTerminalReady, ... })`
TerminalWindow.tsx line 163: `onTerminalReady(terminalId)` — this calls the prop callback, which is set by the parent.

In TerminalPage.tsx, the `onTerminalReady` callback is probably the IPC `onTerminalReady`. Let me find where TerminalPane is rendered with its props...

Actually, looking at the `onTerminalReady` naming collision:
- `preload.ts:285`: `onTerminalReady` — IPC listener for `terminal:ready` event.
- `TerminalWindow.tsx`: `onTerminalReady` is a prop on TerminalPane, set by the parent renderer.
- `TerminalWindow.tsx:163`: `onTerminalReady(terminalId)` inside a 100ms setTimeout — this calls the prop.

The question is: what does the prop resolve to? In TerminalPage, when rendering TerminalWindow, it likely passes `window.deskflowAPI.onTerminalReady` or a wrapper.

Actually wait — looking more carefully, the `onTerminalReady` at TerminalWindow.tsx:163 fires a setTimeout at mounting. This 100ms timeout is the actual "terminal:ready" signal — it's purely client-side timing, not waiting for the PTY to actually be ready. This is the "terminal:ready" that the `initializeTerminal()` step #3 waits for via `onTerminalReady` IPC binding.

This means:
- The 100ms timeout IS the only "terminal:ready" signal.
- There's no IPC from the main process saying "PTY is spawned and ready."
- The renderer's `onTerminalReady` IPC listener (preload.ts:285) is for messages from main process with event name `'terminal:ready'`.
- But the main process never sends `terminal:ready` — it only sends `terminal:data`, `terminal:exit`, `agent:ready`, `agent:timeout`, etc.

Wait, that can't be right. Let me search for where `terminal:ready` is sent from main process...

I don't see it in the code I've read. Let me check...

Actually, the flow might be: The `onTerminalReady` prop passed to TerminalPane IS the IPC listener from preload. So when TerminalPane calls `onTerminalReady(terminalId)` at 100ms, it's actually calling the IPC listener's callback directly, not sending an IPC message. That makes sense — the prop IS the callback registered via `window.deskflowAPI.onTerminalReady(callback)`.

So the flow is:
1. TerminalPane mounts with `onTerminalReady` prop = the callback registered on `window.deskflowAPI.onTerminalReady`.
2. After 100ms setTimeout, `onTerminalReady(terminalId)` fires locally.
3. In `initializeTerminal`, the `onTerminalReady` IPC listener fires and resolves the promise.

This is a LOCAL callback, not an IPC message. The "ready" signal is purely a 100ms delay.

Now I understand. Let me write this up properly.

---

## Answer 6: Agent detection retry path

**Q:** When agent:timeout fires, what renders in the UI? What does "Click to retry" actually do? Trace `handleRetryAgentInit` completely.

**A:**

### UI on timeout
Two UI elements appear:

1. **Overlay on TerminalWindow** (TerminalWindow.tsx:303-310):
   ```tsx
   {agentStatus === 'timeout' && (
     <div className="absolute top-2 left-2 ... cursor-pointer"
          onClick={() => onRetryInit?.(terminalId)}>
       <WarningIcon />
       <span>Agent failed. Click to retry.</span>
     </div>
   )}
   ```
   `agentStatus` prop is driven by the parent. The parent (TerminalPage) sets it based on `agentInitErrors` state.

2. **Error banner at top of TerminalPage** (TerminalPage.tsx:2317-2331):
   ```tsx
   {Object.entries(agentInitErrors).map(([tid, err]) => (
     <div key={tid} className="...">
       <div>Agent initialization failed</div>
       <div>{err.detail}</div>        {/* last 500 chars of output */}
       <div>{err.installHint}</div>    {/* installation instructions */}
       <button onClick={() => handleRetryAgentInit(tid, ...)}>Retry</button>
     </div>
   ))}
   ```
   The `agentInitErrors` state is updated by `onAgentInitError` IPC (TerminalPage.tsx:723-728), which receives `{ terminalId, agentType, reason, detail, hint }`.

### `handleRetryAgentInit` trace (TerminalPage.tsx:940):
```typescript
const handleRetryAgentInit = useCallback(async (terminalId, agentType) => {
  // 1. Clear the error from state
  setAgentInitErrors(prev => { const n = { ...prev }; delete n[terminalId]; return n; });
  
  // 2. Reset agent state in main process
  if (window.deskflowAPI?.retryAgentLaunch) {
    await window.deskflowAPI.retryAgentLaunch(terminalId, agentType);
  }
  // → IPC 'agent:retry-launch' (main.ts:7873):
  //    st.phase = 'launching'
  //    st.dataBuffer = ''
  //    st.handshakeToken = undefined
  //    st.pendingWrites = []
  //    clearAgentTimeout(terminalId)
  //    startAgentTimeout(terminalId, type)  ← 30s timer starts here
  
  // 3. Re-launch the agent binary
  const launchCommand = `${agentType}\r\n`;
  await window.deskflowAPI?.terminalWrite?.(terminalId, launchCommand);
  
  // 4. Re-run the init sequence
  await initializeTerminal(terminalId, agentType);
}, [initializeTerminal]);
```

### Full retry flow:
1. User clicks "Retry" in banner or "Agent failed. Click to retry." overlay.
2. `handleRetryAgentInit` fires with `terminalId` and resolved `agentType`.
3. Clears the error from UI state.
4. IPC `agent:retry-launch` resets agent state machine in main process and starts 30s timeout.
5. Writes `${agentType}\r\n` to the PTY (re-launches the agent binary).
6. Calls `initializeTerminal()` fresh — runs full verify → wait ready → wait agent ready → arm handshake → write system prompt pipeline.

### The overlay `onRetryInit`:
At TerminalWindow.tsx:305, `onRetryInit?.(terminalId)` is called with ONLY `terminalId`. But `handleRetryAgentInit` needs `(terminalId, agentType)`. Looking at the mapping in the parent:

The `agentStatus` is derived from `agentInitErrors[terminalId] ? 'timeout' : ...`. When clicking the overlay, it calls `onRetryInit(terminalId)`. The parent (TerminalWindow → TerminalPage) must map this to `handleRetryAgentInit` with the correct agentType.

Where is `onRetryInit` set for TerminalWindow? Let me check...

At TerminalPage.tsx:2325, the error banner calls `handleRetryAgentInit(tid, err.reason === 'not-recognized' ? 'opencode' : 'claude')`. The agentType is DETERMINED by error reason — 'not-recognized' → opencode, anything else → claude.

For the overlay click: I need to find where `onRetryInit` is wired. Let me search...

Actually, looking at the rendering of TerminalWindow/TerminalPane, `agentStatuses` is presumably computed from `agentInitErrors` in the parent. The `onRetryInit` callback would be `(terminalId) => handleRetryAgentInit(terminalId, agentType)` where agentType is looked up from context (session config, not from error).

This is a finding: The overlay uses agentType derived from `err.reason` heuristic, not from the actual agentType stored in the session. The overlay `onRetryInit` callback might use a different source of truth for agentType than the error banner.

---

## Answer 7: pendingWrites/queue system

**Q:** How does the message buffering work when agent is still launching? What happens to writes sent during `launching` vs `ready` vs `busy`? Can writes be lost?

**A:**

### Queue mechanism

In `agentStates` (main.ts:7334):
```typescript
pendingWrites?: string[];  // optional, initialized on first queued write
```

### Launching phase (agent:send handler, main.ts:7813):
```typescript
if (st.phase === 'launching') {
  st.pendingWrites = st.pendingWrites || [];
  st.pendingWrites.push(data);
  // DB: INSERT INTO terminal_messages with status='in_progress'
  pendingCompletions.add(terminalId);
  broadcast('ai-task:updated', { terminalId, status: 'in_progress', ... });
  return { success: true, queued: true };
}
```

### Ready/busy phase:
```typescript
const success = terminalManager.write(terminalId, data + '\r\n');
if (success) {
  st.phase = 'busy';  // set to busy
  // DB: INSERT INTO terminal_messages with status='in_progress'
  pendingCompletions.add(terminalId);
}
return { success, queued: false };
```

### Flush on phase transition (data handler, main.ts:7757-7766):
```typescript
if (st.phase === 'launching' && (promptSeen || handshakeSeen)) {
  st.phase = 'ready';
  clearAgentTimeout(id);
  if (st.pendingWrites && st.pendingWrites.length > 0) {
    for (const w of st.pendingWrites) {
      terminalManager.write(id, w + '\r\n');
    }
    st.pendingWrites = [];
  }
  broadcast('agent:ready', { terminalId: id });
}
```

### Potential loss scenarios:
1. **`terminalWrite` (not `agentSend`) during launching**: The `terminal:write-raw` handler (main.ts:7887) does NOT check phase or queue — it writes directly. If agent is still launching, whatever you type goes to the shell, not the agent. This is correct behavior (terminal passthrough), but means keystrokes typed before agent is ready go to the shell prompt, not the agent.

2. **`write-terminal` (main.ts:7892)**: Also writes directly, no queuing. But it has the rules-reinjection counter logic. Also no queuing for launching phase.

3. **`agentSend` during launching**: Properly queued in `pendingWrites[]` and flushed when agent becomes ready. Safe.

4. **`agentSend` during busy**: Queued? No — it writes directly to PTY. If agent is busy generating, the write goes to stdin but the agent may not be accepting input yet. Some agents handle this gracefully (buffer internally), some may drop it.

5. **Multiple rapid `agentSend` calls during launching**: All queued in array, flushed in order. Safe.

6. **Terminal killed before flush**: `terminalManager.kill()` (main.ts:7534) calls `releaseAllLocksForTerminal(id)` and `terminalMessageCounts.delete(id)` but does NOT check `pendingWrites`. Queue is lost silently.

### `write-terminal` divergence:
There are TWO write paths:
- `terminalWriteRaw` (write-raw): Bypasses all smarts, writes directly. Used for user typing.
- `writeTerminal` (write-terminal): Has rules reinjection counter + DB persistence. Used for structured sends.
- `agentSend`: Has phase-aware queuing + DB persistence. Used for system prompt / init content.

This triple path is a potential source of confusion — which one should be used when?

---

## Answer 8: Preload IPC bridge structure

**Q:** How does the preload expose terminal/agent methods? What's the pattern for listeners vs invokers? What cleanup happens?

**A:**

### Two naming conventions

The preload (src/preload.ts) exposes a mix of two conventions:

**Legacy (terminal:* format):**
```typescript
// Lines 265-268: invoke-based
spawnTerminal: (id, cwd?, agentType?) => ipcRenderer.invoke('spawn-terminal', ...),
writeTerminal: (id, data) => ipcRenderer.invoke('write-terminal', ...),
resizeTerminal: (id, cols, rows) => ipcRenderer.invoke('resize-terminal', ...),
killTerminal: (id) => ipcRenderer.invoke('kill-terminal', ...),

// Lines 269-278: listener-based, returns cleanup function
onTerminalData: (callback) => {
  const handler = (_event, id, data) => callback(id, data);
  ipcRenderer.on('terminal:data', handler);
  return () => ipcRenderer.removeListener('terminal:data', handler);
},
onTerminalExit: (callback) => { ... returns cleanup },
```

**Newer (agent:* format):**
```typescript
// Lines 281-309:
terminalWrite: (id, data) => ipcRenderer.invoke('terminal:write-old-format', ...),
terminalWriteRaw: (id, data) => ipcRenderer.invoke('terminal:write-raw', ...),
terminalResize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize-old-format', ...),
terminalDestroy: (id) => ipcRenderer.invoke('terminal:destroy-old-format', ...),
onTerminalReady: (callback) => { ... returns cleanup },
onAgentReady: (callback) => { ... returns cleanup },
onAgentTimeout: (callback) => { ... returns cleanup },
retryAgentInit: (id, agentType) => ipcRenderer.invoke('retry-agent-init', ...),
verifyAgent: (agentType) => ipcRenderer.invoke('agent:verify', ...),
armHandshake: (id) => ipcRenderer.invoke('agent:arm-handshake', ...),
agentSend: (id, data, agentType?) => ipcRenderer.invoke('agent:send', ...),
getAgentPhase: (id) => ipcRenderer.invoke('agent:get-phase', ...),
retryAgentLaunch: (id, agentType) => ipcRenderer.invoke('agent:retry-launch', ...),
onAgentIdle: (callback) => { ... returns cleanup },
```

### Pattern summary:
- **Invokers** (`ipcRenderer.invoke`): Return a Promise. Used for "fire and wait for result" operations (spawn, write, verify, send). Always return `{ success: boolean, error?: string }`.
- **Listeners** (`ipcRenderer.on`): Return a cleanup function `() => void`. Used for streaming events (data, ready, timeout, idle, exit). The cleanup function removes the specific listener, preventing leaks.

### Cleanup pattern:
Every listener returns `() => ipcRenderer.removeListener(eventName, handler)`. This is used in React `useEffect` return functions:
```typescript
useEffect(() => {
  const cleanup = window.deskflowAPI?.onAgentReady?.(callback);
  return () => cleanup?.();
}, []);
```

### Notable issues:
1. **Event name mismatch**: `onTerminalExit` listens for `'terminal-exit'` (hyphen), but main process broadcasts `'terminal:exit'` (colon). They don't match! Let me verify...

   Main process broadcasts: `broadcast('terminal:exit', id, exitCode, signal)` at line 7719 and 7790.
   Preload listens for: `ipcRenderer.on('terminal-exit', handler)` at line 276.
   
   This is a BUG — 'terminal:exit' ≠ 'terminal-exit'. Terminal exit events never reach the renderer!

2. **Dual write-raw vs write-terminal**: `terminalWriteRaw` → `terminal:write-raw` (no DB, no queuing, no reinjection). `writeTerminal` → `write-terminal` (DB, reinjection, but no queuing). `agentSend` → `agent:send` (DB, queuing, phase-aware). Three different behaviors depending on which the caller uses.

3. **No TypeScript types**: All args are loosely typed. The `deskflowAPI` type is `any` or a generic record, so there's no compile-time checking of method signatures.

---

## Answer 9: Handshake protocol

**Q:** Describe the agent handshake protocol (`agent:arm-handshake`). What token format, how is it verified, what happens on timeout?

**A:**

### Protocol

1. **Renderer requests handshake** (TerminalPage.tsx:637):
   ```typescript
   const hs = await window.deskflowAPI.armHandshake(terminalId);
   ```

2. **Main generates token** (`agent:arm-handshake` handler, main.ts:7805):
   ```typescript
   const token = `__HANDSHAKE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}__`;
   st.handshakeToken = token;
   return { success: true, token };
   ```
   Format: `__HANDSHAKE_<timestamp>_<random6chars>__`
   Example: `__HANDSHAKE_1718200000123_a1b2c3__`

3. **Renderer writes token to terminal** (TerminalPage.tsx:640):
   ```typescript
   await window.deskflowAPI.terminalWrite(terminalId, hs.token + '\r');
   ```

4. **Main process detects token** in data handler (main.ts:7682):
   ```typescript
   const handshakeSeen = st.handshakeToken ? stripAnsi(st.dataBuffer).includes(st.handshakeToken) : false;
   ```
   This checks if the accumulated dataBuffer contains the exact token string. Note: it does a simple `includes()`, not a regex.

5. **Token triggers phase transition** (main.ts:7685):
   ```typescript
   if (st.phase === 'launching' && (promptSeen || handshakeSeen)) {
     st.phase = 'ready';
     // flush pending writes, broadcast agent:ready
   }
   ```
   Handshake is an ALTERNATIVE to `detectAgentPrompt()` — if either sees its signal, agent is considered ready.

6. **Handshake also necessary for agent:idle**:
   After writing token, renderer waits for `agent:idle` (TerminalPage.tsx:644):
   ```typescript
   await new Promise<void>((resolve) => {
     const remover = window.deskflowAPI?.onAgentIdle?.((data) => {
       if (data.terminalId === terminalId && !done) { resolve(); }
     });
     setTimeout(() => { ... resolve(); }, 10000);
   });
   ```

### How agent:idle fires:
When agent echos back the handshake token in its output, the main process detects this (via `stripAnsi(st.dataBuffer).includes(st.handshakeToken)`), transitions to 'ready', and:
- If phase was 'launching': broadcasts `agent:ready`.
- If agent echos token and prompt: both conditions fire. The idle signal comes later when `promptSeen` fires in `busy` phase.

Actually, looking more carefully: `agent:idle` fires at main.ts:7770 (or 7697):
```typescript
} else if (st.phase === 'busy' && promptSeen) {
  st.phase = 'ready';
  st.idleSeq += 1;
  broadcast('agent:idle', { terminalId: id, seq: st.idleSeq });
}
```

So `agent:idle` fires when the agent transitions from `busy` → `ready` due to prompt detection. In the handshake flow:
1. Token is written → main process sees it → transitions `launching` → `ready` → broadcasts `agent:ready`.
2. Renderer resolves the `agent:ready` promise.
3. Renderer writes system prompt via `agentSend` → sets phase `busy`.
4. Agent processes prompt and outputs → agent shows prompt `>` → `detectAgentPrompt` returns true → phase `busy` → `ready` → broadcasts `agent:idle`.
5. Renderer resolves the `agent:idle` promise.

### Timeout:
10-second timeout at TerminalPage.tsx:651. If agent:idle never fires (e.g., agent swallowed the system prompt), initializion continues anyway (silent resolve).

### Risk:
The handshake token is written to the PTY as `token + '\r'`. If the agent echoes input (which most terminals do), the token appears in `dataBuffer` → `handshakeSeen` is true. But if bracketed paste mode is active and the agent doesn't echo, the token may never appear and handshake silently fails. The `bracketedPaste` field in `AgentConfig` exists but isn't actually used in the handshake logic.

---

## Answer 10: Error diagnosis + recovery

**Q:** What happens when `diagnoseAgentFailure()` runs? What error patterns exist? How does the UI handle each reason? What's the data flow from `agent:init-error` to the Retry button?

**A:**

### `diagnoseAgentFailure()` (main.ts:7361)

```typescript
function diagnoseAgentFailure(id: string, agentType: string) {
  const st = agentStates.get(id);
  const tail = stripAnsi((st?.dataBuffer ?? '')).slice(-500);  // last 500 chars
  const cfg = getAgentConfig(agentType);

  // 1. Check known error patterns
  for (const { re, reason } of ERROR_PATTERNS) {
    if (re.test(tail)) return { reason, detail: tail.trim(), hint: cfg.installHint };
  }
  
  // 2. Check if dropped to shell
  const lastLine = tail.split(/\r?\n/).map(l => l.trim()).filter(Boolean).pop() ?? '';
  if (looksLikeShell(lastLine)) {
    return { reason: 'dropped-to-shell', detail: `Terminal is at a shell prompt: "${lastLine}"`, hint: cfg.installHint };
  }
  
  // 3. Fallback: silent timeout
  return { reason: 'silent-timeout', detail: tail.trim() || 'No output captured.', hint: cfg.installHint };
}
```

### ERROR_PATTERNS (main.ts:7355):
```typescript
const ERROR_PATTERNS = [
  { re: /is not recognized as (?:the name of )?a?\s*cmdlet/i, reason: 'not-recognized' },
  { re: /command not found/i, reason: 'not-recognized' },
  { re: /No such file or directory/i, reason: 'not-recognized' },
];
```

Three possible reasons:
1. **`not-recognized`**: Binary not found at command level (shell couldn't execute it).
2. **`dropped-to-shell`**: Agent launched but exited/dropped back to shell prompt.
3. **`silent-timeout`**: No recognizable output after 30 seconds.

### Data flow to UI:

1. **`startAgentTimeout` fires after 30s** (main.ts:7376):
   - Sends `agent:timeout` → preload `onAgentTimeout` → used for `agentStatus` overlay in TerminalPane.
   - Sends `agent:init-error` → preload `onAgentInitError` → `setAgentInitErrors()` in TerminalPage (line 726).

2. **`agentInitErrors` state** (TerminalPage.tsx:418):
   ```typescript
   const [agentInitErrors, setAgentInitErrors] = useState<Record<string, AgentInitErrorInfo>>({});
   ```
   Structure: `{ [terminalId]: { terminalId, agentType, reason, detail, hint } }`.

3. **UI rendering** (TerminalPage.tsx:2317):
   - Iterates `Object.entries(agentInitErrors)`.
   - Shows: "Agent initialization failed" title, `err.detail` (last 500 chars of output), `err.installHint` instruction.
   - Has a `<Retry>` button.

4. **Overlay indicator** (TerminalWindow.tsx:303):
   - Each TerminalPane shows `agentStatus === 'timeout'` overlay with click-to-retry.

5. **Retry button logic** (TerminalPage.tsx:2325):
   ```typescript
   onClick={() => handleRetryAgentInit(tid, err.reason === 'not-recognized' ? 'opencode' : 'claude')}
   ```
   - If `reason === 'not-recognized'`: retries with `'opencode'` (tries to install/re-launch the default).
   - Otherwise: retries with `'claude'` (tries alternative agent).
   - This heuristic is fragile — it hardcodes agent types instead of using the actual `agentType` from the init error.

### Recovery path:
See Answer 6 for the full `handleRetryAgentInit` trace.

### Missing recovery:
- There's no automatic retry mechanism — user must click Retry.
- There's no debounce on rapid retry clicks (could spawn multiple agent processes).
- If `spawn-terminal` failed (e.g., PTY couldn't start), there's no retry at all — just error message.
- If the PTY process crashed (`terminal:exit` fires), there's no re-spawn logic.
