# Context Bundle — DeskFlow Terminal Workspace

## Overview

DeskFlow is an Electron + React + better-sqlite3 desktop app. The terminal workspace renders xterm.js terminals connected to node-pty processes. The system handles two distinct input modes: **raw shell** (plain keystrokes) and **agent mode** (TUI apps like OpenCode, Claude Code that need bracketed paste + prompt detection).

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                       │
│                                                           │
│  TerminalWindow.tsx                                       │
│  ├── TerminalPane (xterm.js Terminal instance)            │
│  │   ├── terminal.onData(data) → input gate              │
│  │   ├── terminalReadyStates map (input lock)             │
│  │   ├── inputBuffers map (pending keystrokes)            │
│  │   └── fitAddon + ResizeObserver → terminalResize IPC   │
│  └── TerminalLayout                                       │
│      ├── handleTerminalReady → measureSpawnSize → spawnTerminal │
│      └── spawnedTerminalsRef (prevents double-spawn)      │
│                                                           │
│  TerminalPage.tsx                                         │
│  ├── spawnTerminal(id, cwd, agentType, cols, rows)        │
│  ├── registerTerminal(id, agentType)                      │
│  ├── initializeTerminal(id, agent, resumeId, initContent) │
│  └── Event listeners: create-terminal, terminal-created,  │
│      conductor:spawn-for-conductor                        │
├─────────────────────────────────────────────────────────┤
│                     IPC BRIDGE                             │
│  preload.ts bridges:                                      │
│  ├── spawnTerminal → 'spawn-terminal'                     │
│  ├── terminalWriteRaw → 'terminal:write-raw'              │
│  ├── terminalWrite → 'terminal:write-old-format'          │
│  ├── terminalResize → 'terminal:resize-old-format'        │
│  ├── agentSend → 'agent:send'                             │
│  ├── onTerminalReady → 'terminal:ready'                   │
│  ├── onTerminalData → 'terminal:data'                     │
│  └── onTerminalExit → 'terminal:exit'                     │
├─────────────────────────────────────────────────────────┤
│                    MAIN PROCESS                            │
│                                                           │
│  terminalManager:                                         │
│  ├── spawn(id, cwd, cols, rows) → node-pty.spawn          │
│  ├── write(id, data) → pty.write(data)                    │
│  ├── resize(id, cols, rows) → pty.resize(cols, rows)      │
│  ├── kill(id) → pty.kill()                                │
│  └── getDataHandler(id, cb) → pty.onData(cb)              │
│                                                           │
│  Agent State Machine:                                     │
│  ├── AGENT_CONFIGS: opencode, claude                      │
│  ├── agentStates map: launching → ready → busy → ready    │
│  ├── detectAgentPrompt: regex-based prompt detection      │
│  ├── buildAgentInputPayload: bracketed paste wrapping     │
│  └── pendingWrites queue: queued during launching/busy    │
│                                                           │
│  IPC Handlers:                                            │
│  ├── 'spawn-terminal' → terminalManager.spawn + agent setup│
│  ├── 'terminal:write-raw' → terminalManager.write (raw)   │
│  ├── 'terminal:write' → terminalManager.write (raw)       │
│  ├── 'terminal:write-old-format' → queued if agent busy   │
│  ├── 'agent:send' → payload-wrapped, queued if busy       │
│  ├── 'terminal:resize' → terminalManager.resize           │
│  └── 'terminal:destroy' → terminalManager.kill            │
└─────────────────────────────────────────────────────────┘
```

---

## Input Flow — Keystroke to PTY

### Path A: Direct user typing (xterm.js → PTY)

```
User types in xterm.js
    │
    ▼
terminal.onData(data)                           [TerminalWindow.tsx:218]
    │
    ├─ if terminalReadyStates.get(id) === true:
    │    → window.deskflowAPI.terminalWriteRaw(id, data)
    │        → ipcRenderer.invoke('terminal:write-raw', id, data)  [preload.ts]
    │            → terminalManager.write(id, data)                 [main.ts]
    │                → t.pty.write(data)                           [node-pty]
    │
    └─ if NOT ready:
         → inputBuffers.get(id).push(data)   (buffered until ready)
```

**Key detail**: `terminal:write-raw` is a PASSTHROUGH — no queuing, no agent payload wrapping, no DB recording. Raw bytes go straight to the PTY.

### Path B: Programmatic write (agent sends text)

```
window.deskflowAPI.agentSend(id, data, agentType)
    │
    ▼
ipcRenderer.invoke('agent:send', id, data, agentType)  [preload.ts]
    │
    ▼
agent:send handler in main.ts
    │
    ├─ if agent phase is 'launching' or 'busy':
    │    → st.pendingWrites.push(data)    (QUEUED)
    │    → return { success: true, queued: true }
    │
    └─ if agent phase is 'ready':
         → payload = buildAgentInputPayload(data, agentType)
         → terminalManager.write(id, payload)
         → st.phase = 'busy'
```

### Path C: Display-only write (banner text, no PTY)

```
window.deskflowAPI.terminalWriteDisplay(id, data)
    │
    ▼
ipcRenderer.invoke('terminal:write-display', id, data)
    │
    ▼
broadcast('terminal:data', id, data)  (goes directly to xterm.js, NOT to PTY)
```

---

## Output Flow — PTY to Display

```
node-pty proc.onData(callback)                   [main.ts spawn handler]
    │
    ▼
broadcast('terminal:data', id, data)             [main.ts]
    │
    ▼
ipcRenderer.on('terminal:data')                  [preload.ts]
    │
    ▼
TerminalWindow: onTerminalData callback           [TerminalWindow.tsx:245]
    │
    ├── terminalRef.current.write(data)           (renders in xterm.js)
    │
    └── if (!terminalReadyStates.get(id)):
         → terminalReadyStates.set(id, true)      (UNLOCK INPUT)
         → flush inputBuffers → terminalWriteRaw
```

First PTY output is the definitive "shell is alive" signal that unlocks input.

---

## Terminal Readiness / Input Lock System

### Module-level state (shared across all terminal instances):

```typescript
const inputBuffers = new Map<string, string[]>();       // pending keystrokes
const terminalReadyStates = new Map<string, boolean>();  // input lock
```

### Three mechanisms to unlock input:

1. **`terminal:ready` IPC event** (from main.ts, fires on first PTY output):
   ```typescript
   terminalReadyStates.set(terminalId, true);
   flush inputBuffers → terminalWriteRaw
   setTimeout(fitAddon.fit(), 250)  // refit after unlock
   ```

2. **First PTY output received** (backup — in case `terminal:ready` is missed):
   ```typescript
   if (!terminalReadyStates.get(terminalId)) {
     terminalReadyStates.set(terminalId, true);
     flush inputBuffers → terminalWriteRaw
   }
   ```

3. **2.5 second timeout** (last resort safety net):
   ```typescript
   setTimeout(() => {
     if (!terminalReadyStates.get(terminalId)) {
       terminalReadyStates.set(terminalId, true);
       flush inputBuffers → terminalWriteRaw
     }
   }, 2500);
   ```

---

## PTY Spawn Flow

```
TerminalPane mounts → onTerminalReady(terminalId)
    │
    ▼
TerminalLayout.handleTerminalReady(terminalId)     [TerminalWindow.tsx:629]
    │
    ├─ if already spawned → dispatch 'terminal:refit-{id}' → return
    │
    └─ first time:
         → spawnedTerminalsRef.add(id)
         → await 2x requestAnimationFrame (wait for layout)
         → { cols, rows } = measureSpawnSize(id)  (reads xterm DOM)
         → agentType = getDefaultAgent()
         → await spawnTerminal(id, projectPath, agentType, cols, rows)
         → await 2x requestAnimationFrame
         → dispatch 'terminal:refit-{id}'  (sync xterm ↔ PTY)
```

### measureSpawnSize:

```typescript
function measureSpawnSize(terminalId: string): { cols: number; rows: number } {
  const el = document.querySelector(`[data-terminal-id="${terminalId}"]`);
  // Read actual cell dimensions from xterm DOM
  // cellW from .xterm-char-measure-element width
  // cellH from .xterm-rows > div height
  // cols = floor((containerWidth - 8) / cellW)
  // rows = floor((containerHeight - 8) / cellH)
  // Fallback: { cols: 80, rows: 24 }
}
```

### spawn-terminal IPC handler:

```typescript
// main.ts
ipcMain.handle('spawn-terminal', async (_event, id, cwd, agentType, cols, rows) => {
  cols = cols || 80;
  rows = rows || 24;
  terminalManager.spawn(id, cwd, cols, rows);
  
  if (agentType) {
    agentStates.set(id, {
      agentType, phase: 'launching', dataBuffer: '',
      idleSeq: 0, launchStartedAt: Date.now(), pendingWrites: []
    });
    startAgentTimeout(id, agentType);
  }
  
  // Register PTY data handler → broadcasts terminal:ready + terminal:data
  terminalManager.getDataHandler(id, function(data) {
    broadcast('terminal:ready', id);  // first output only
    broadcast('terminal:data', id, data);
    // Agent state machine (prompt detection, phase transitions)
  });
  
  terminalManager.getExitHandler(id, (exitCode, signal) => {
    broadcast('terminal:exit', id, exitCode, signal, intentional);
  });
});
```

---

## Agent State Machine

### Phases:

```
launching → ready → busy → ready (loop)
                     │
                     ├─ attention (needs user action)
                     │
                     └─ blocked (escalation)
```

### AGENT_CONFIGS:

```typescript
const AGENT_CONFIGS = {
  opencode: {
    readyRegex: /^(?:opencode)?\s*>\s*$/i,  // matches ">" prompt
    bracketedPaste: true,                     // wraps input in \x1b[200~...\x1b[201~
  },
  claude: {
    readyRegex: /^(?:claude)?\s*>\s*$/i,
    bracketedPaste: true,
  },
};
```

### Prompt detection:

```typescript
function detectAgentPrompt(buffer: string, agentType?: string): boolean {
  const clean = stripAnsi(buffer);      // remove ANSI escape codes
  const lines = clean.split(/\r?\n/);
  // Check last non-empty line against agent's readyRegex
  return getAgentConfig(agentType).readyRegex.test(trimmed);
}
```

### buildAgentInputPayload:

```typescript
function buildAgentInputPayload(data: string, agentType?: string): string {
  const normalized = data.replace(/\r\n?/g, '\n').trimEnd();
  if (cfg.bracketedPaste) {
    return '\x1b[200~' + normalized + '\x1b[201~\r';  // bracketed paste mode
  }
  return normalized + '\r';  // plain CR-terminated
}
```

Bracketed paste tells the TUI "this is pasted text, not individual keystrokes" — critical for OpenCode/Claude Code TUIs that need to distinguish single-key input from bulk input.

### Pending writes queue:

```typescript
// When agent is launching or busy, writes are queued:
if (st.phase === 'launching' || st.phase === 'busy') {
  st.pendingWrites.push(data);
  return { queued: true };
}

// When agent becomes ready, flush the queue:
function flushPendingAgentWrites(id, st) {
  for (const w of st.pendingWrites) {
    terminalManager.write(id, buildAgentInputPayload(w, st.agentType));
  }
  st.pendingWrites = [];
}
```

---

## Resize / Refit System

### Sync fit (on mount):

```typescript
// TerminalPane useEffect — runs once on mount
terminal.open(container);
fitAddon.fit();
terminalResize(terminalId, terminal.cols, terminal.rows);
```

### ResizeObserver (triggers on container size change):

```typescript
const ro = new ResizeObserver(() => {
  fitAddon.fit();
  terminalResize(terminalId, terminal.cols, terminal.rows);
  ro.disconnect();  // one-shot
});
ro.observe(container);
```

### Refit event (post-spawn):

```typescript
// Dispatched after PTY spawn to sync xterm ↔ PTY dimensions
window.addEventListener('terminal:refit-' + terminalId, () => {
  fitAddon.fit();
  terminalResize(terminalId, terminal.cols, terminal.rows);
});
```

### terminalResize IPC:

```typescript
// preload.ts
terminalResize: (terminalId, cols, rows) => ipcRenderer.invoke('terminal:resize-old-format', terminalId, cols, rows)

// main.ts
ipcMain.handle('terminal:resize', async (_event, terminalId, cols, rows) => {
  return terminalManager.resize(terminalId, cols, rows);
  // → node-pty proc.resize(cols, rows)
});
```

---

## TUI Handling (OpenCode, Claude Code)

### What makes TUIs different:

1. **Full-screen redraw**: TUIs use `\x1b[H` (cursor home) + ANSI escape sequences to redraw the entire screen each frame. Data payloads are 27-28KB per frame.
2. **Bracketed paste**: TUIs need `\x1b[200~` ... `\x1b[201~` wrapping to distinguish pasted text from keystrokes.
3. **Terminal dimensions**: TUIs render based on the PTY's cols/rows. If dimensions are wrong, content overflows or pushes down.
4. **Synchronized output**: TUIs use `\x1b[?2026h` / `\x1b[?2026l` for synchronized rendering.

### How DeskFlow handles TUIs:

1. **Correct dimensions at spawn**: `measureSpawnSize()` reads actual xterm.js cell dimensions from DOM before spawning PTY.
2. **Post-spawn refit**: `terminal:refit-{id}` event fires after spawn to sync dimensions.
3. **Bracketed paste mode**: `buildAgentInputPayload()` wraps input in `\x1b[200~...\x1b[201~\r` for agents with `bracketedPaste: true`.
4. **Prompt detection**: `detectAgentPrompt()` uses regex to detect the TUI's input prompt (`>` for OpenCode/Claude).
5. **Agent state machine**: Tracks whether agent is `launching`, `ready`, `busy`, or `attention` to queue writes appropriately.

---

## File Reference

| File | Lines | Role |
|------|-------|------|
| `src/components/TerminalWindow.tsx` | 802 | xterm.js lifecycle, input/output flow, fit/resize |
| `src/pages/TerminalPage.tsx` | 5570+ | spawnTerminal, registerTerminal, initializeTerminal, event listeners |
| `src/main.ts` | 25700+ | terminalManager, agent state machine, IPC handlers, prompt detection |
| `src/preload.ts` | 1160+ | IPC bridges between renderer and main |

---

## Known Issues / Edge Cases

1. **EPIPE crash**: `console.log` in pollForeground writes to stdout. If terminal closes, pipe breaks → uncaught exception kills app. Fix: `process.stdout.on('error', () => {})` at top of main.ts.

2. **Terminal dimensions mismatch**: If `measureSpawnSize()` runs before xterm.js finishes layout, it returns 80x24 fallback. The TUI renders for wrong dimensions → content pushes down. Fix: double requestAnimationFrame wait + post-spawn refit.

3. **Input buffer loss**: If input is typed before PTY spawns (before `terminal:ready`), keystrokes are buffered. If the buffer flush fails (IPC error), keystrokes are lost silently.

4. **Agent prompt detection false positives**: The `readyRegex` can match shell prompts that look like agent prompts (e.g., a shell prompt ending with `>`). The `looksLikeShell()` check helps but isn't foolproof.

5. **Race between terminal:ready and first PTY output**: Both set `terminalReadyStates` to true. The first one to fire wins, the second is a no-op. This is correct behavior but can cause timing-dependent behavior.
