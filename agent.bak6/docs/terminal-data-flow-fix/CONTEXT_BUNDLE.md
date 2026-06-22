# Terminal Data Flow — Context Bundle

## Architecture Overview

The terminal subsystem has three layers:

1. **Main process** (`src/main.ts`) — PTY lifecycle via `terminalManager` object (inline, no class)
2. **Preload bridge** (`src/preload.ts`) — IPC channels exposing terminal events to renderer
3. **Renderer** (`src/components/TerminalWindow.tsx`, `src/pages/TerminalPage.tsx`) — xterm.js terminal + event handlers

### Data Flow

```
User types → xterm.onData() → terminalWriteRaw IPC → main.ts write handler → node-pty proc.write()
                                                                                    ↓
node-pty proc.onData() callback → C2 data handler → broadcast('terminal:data', id, data)
                                                                                    ↓
ipcRenderer.on('terminal:data') → onTerminalData callback → terminalRef.current.write(data) → xterm renders
```

## Key Problem

When a terminal is spawned via `spawn-terminal`, the PTY process starts (PID confirmed), writes via `terminalWriteRaw` succeed (`{success: true}`), but NO PTY output ever reaches xterm. The xterm shows only "Starting shell..." indefinitely. Both `terminal:ready` (3s fallback) and `terminal:data` broadcasts appear to not reach the renderer, or the renderer doesn't process them.

---

## 1. Main Process — `terminalManager` Object (src/main.ts:8375-8436)

This is an inline object (not a class) stored in main.ts. All terminal PTY operations go through it.

```javascript
// Line 8376
const terminalManager = {
  terminals: new Map(),
  intentionalKills: new Set<string>(),
  spawnTimes: new Map<string, number>(),
  spawn(id: string, cwd: string, cols: number = 80, rows: number = 24) {
    // ... spawns node-pty proc, stores { id, pty: ip, cwd }, returns { success: true }
  },
  write(id: string, data: string) {
    const t = this.terminals.get(id);
    if (t) { t.pty.write(data); return true; }
    return false;
  },
  kill(id: string) {
    // adds to intentionalKills, kills proc, deletes from terminals map
  },
  getDataHandler(id: string, cb: (d: string) => void) {
    const t = this.terminals.get(id);
    if (t) t.pty.onData(cb);  // registers proc.onData callback
  },
  getExitHandler(id: string, cb: (code: number, sig: string) => void) {
    const t = this.terminals.get(id);
    if (t) t.pty.onExit((result) => cb(result.exitCode, result.signal?.toString() ?? ''));
  }
};
```

**Critical detail for `getDataHandler`:** Each call to `t.pty.onData(cb)` adds a NEW listener via node-pty. If called twice for the same PTY, both callbacks fire. The callback is never removed (no disposable handled).

## 2. Main Process — `broadcast` Function (src/main.ts:8168-8174)

```javascript
function broadcast(event: string, ...args: any[]) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      try { win.webContents.send(event, ...args); } catch {}
    }
  }
}
```

Sends event to ALL non-destroyed windows. Used for `terminal:data`, `terminal:ready`, `terminal:exit`, `agent:ready`, `agent:timeout`, etc.

## 3. Main Process — Ready Fallback (src/main.ts:8097-8118)

```javascript
const terminalReadySent = new Set<string>();
const readyTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function armTerminalReadyFallback(id: string) {
  const timer = setTimeout(() => {
    if (!terminalReadySent.has(id)) {
      terminalReadySent.add(id);
      broadcast('terminal:ready', id);
    }
    readyTimeouts.delete(id);
  }, 3000);
  readyTimeouts.set(id, timer);
}

function clearTerminalReadyFallback(id: string) {
  const timer = readyTimeouts.get(id);
  if (timer) { clearTimeout(timer); readyTimeouts.delete(id); }
}
```

The 3-second fallback broadcasts `terminal:ready` if no PTY data arrived. BUT: `clearTerminalReadyFallback` is called by:
- The data handler (when first data arrives — line 8664)
- `terminalManager.kill()` — line 8424

If the fallback fires and adds to `terminalReadySent`, subsequent data handler calls skip the ready broadcast (since `terminalReadySent.has(id)` is true).

## 4. Main Process — C2 Handler: `spawn-terminal` (src/main.ts:8650-8755)

THIS is the only terminal creation path used. `terminal:create` (C1, line 8543) exists but is never called.

```javascript
ipcMain.handle('spawn-terminal', async (_event, id: string, cwd?: string, agentType?: string) => {
    try {
        const result = terminalManager.spawn(id, cwd || '', 80, 24);
        if (result.success) {
            const type = agentType || DEFAULT_AGENT;
            clearAgentTimeout(id);
            agentStates.set(id, { agentType: type, phase: 'launching', dataBuffer: '', idleSeq: 0 });
            startAgentTimeout(id, type);
            armTerminalReadyFallback(id);

            terminalManager.getDataHandler(id, function (data) {
                console.log('[TERMINAL_DEBUG] C2 data callback FIRED for', id, 'data length:', data.length, 'data:', JSON.stringify(data.substring(0, 200)));
                if (!terminalReadySent.has(id)) {
                    terminalReadySent.add(id);
                    clearTerminalReadyFallback(id);
                    broadcast('terminal:ready', id);
                }
                broadcast('terminal:data', id, data);
                // ... agent state management ...
            });

            terminalManager.getExitHandler(id, (exitCode: number, signal: string) => {
                clearAgentTimeout(id);
                failPendingWrites(id);
                const intentional = terminalManager.intentionalKills.has(id);
                const spawnTime = terminalManager.spawnTimes.get(id);
                const isRecentSpawn = spawnTime && (Date.now() - spawnTime < 2000);
                terminalManager.spawnTimes.delete(id);
                broadcast('terminal:exit', id, exitCode, signal, intentional || !!isRecentSpawn);
            });
        }
        return result;
    } catch (err: any) {
        console.error('[DeskFlow] spawn-terminal error:', err.message);
        return { success: false, error: err.message };
    }
});
```

## 5. Main Process — `write-terminal` Handler

```javascript
// The handler that terminalWriteRaw IPC calls:
ipcMain.handle('terminal:write-raw', (event, terminalId: string, data: string) => {
  const ok = terminalManager.write(terminalId, data);
  return { success: ok };
});
```

## 6. Preload Bridges (src/preload.ts)

### Spawn Terminal (line 283)
```javascript
spawnTerminal: (terminalId: string, cwd?: string, agentType?: string) => 
    ipcRenderer.invoke('spawn-terminal', terminalId, cwd, agentType),
```

### Write Raw (line 300)
```javascript
terminalWriteRaw: (terminalId: string, data: string) => 
    ipcRenderer.invoke('terminal:write-raw', terminalId, data),
```

### Terminal Data Listener — onTerminalData (lines 287-291) — returns cleanup function
```javascript
onTerminalData: (callback: (terminalId: string, data: string) => void) => {
    const handler = (_event: any, terminalId: string, data: string) => callback(terminalId, data);
    ipcRenderer.on('terminal:data', handler);
    return () => ipcRenderer.removeListener('terminal:data', handler);
},
```

### Terminal Data Listener — terminalAPI.onData (lines 341-346) — NO cleanup, adds raw listener
```javascript
terminalAPI: {
    // ...
    onData: (callback: (id: string, data: string) => void) => {
        ipcRenderer.on('terminal:data', (_event, id, data) => callback(id, data));
    },
    removeDataListener: () => {
        ipcRenderer.removeAllListeners('terminal:data');
    }
},
```

**⚠️ CONFLICT:** Both `onTerminalData` (line 287) and `terminalAPI.onData` (line 341) listen on the SAME channel `terminal:data`. `terminalAPI.removeDataListener` (line 344) calls `removeAllListeners('terminal:data')` which destroys ALL listeners, including the one from `onTerminalData`.

### Terminal Ready Listener (lines 303-307)
```javascript
onTerminalReady: (callback: (id: string) => void) => {
    const handler = (_event: any, id: string) => callback(id);
    ipcRenderer.on('terminal:ready', handler);
    return () => ipcRenderer.removeListener('terminal:ready', handler);
},
```

## 7. Renderer — TerminalWindow.tsx (src/components/TerminalWindow.tsx)

### Key State
```typescript
const terminalRef = useRef<xterm.Terminal | null>(null);
const [isDead, setIsDead] = useState(false);
const [exitWasCrash, setExitWasCrash] = useState(false);
const isManualKillRef = useRef(false);
```

### Input Buffering (lines 176-192)
```typescript
useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    const disposable = terminal.onData((data) => {
        const isReady = terminalReadyStates.get(terminalId);
        if (isReady) {
            window.deskflowAPI?.terminalWriteRaw?.(terminalId, data);
        } else {
            const buffer = inputBuffers.get(terminalId) || [];
            buffer.push(data);
            inputBuffers.set(terminalId, buffer);
        }
    });
    return () => disposable.dispose();
}, [terminalId]);
```

### Data Handler — TerminalPane (lines 194-226)
```typescript
useEffect(() => {
    if (!window.deskflowAPI) return;

    const cleanupData = window.deskflowAPI.onTerminalData?.((id, data) => {
        if (id === terminalId && terminalRef.current) {
            terminalRef.current.write(data);   // <-- writes to xterm
        }
    });

    const cleanupExit = window.deskflowAPI.onTerminalExit?.((id, exitCode, _signal, intentional) => {
        if (id === terminalId && terminalRef.current) {
            const crashed = exitCode !== 0 && !isManualKillRef.current && !intentional;
            terminalRef.current.write(`\r\n\x1b[${crashed ? '31' : '90'}mProcess exited with code ${exitCode}\x1b[0m\r\n`);
            terminalReadyStates.set(terminalId, false);
            setExitWasCrash(crashed);
            setIsDead(true);
            window.dispatchEvent(new CustomEvent('terminal:crashed', { detail: { terminalId: id, exitCode, crashed } }));
            isManualKillRef.current = false;
        }
    });

    const cleanupReady = window.deskflowAPI.onTerminalReady?.((id) => {
        if (id === terminalId) {
            setIsDead(false);
            setExitWasCrash(false);
            terminalReadyStates.set(terminalId, true);
            const buffer = inputBuffers.get(terminalId) || [];
            buffer.forEach((bufferedData) => {
                window.deskflowAPI?.terminalWriteRaw?.(terminalId, bufferedData);
            });
            inputBuffers.set(terminalId, []);
        }
    });

    return () => {
        cleanupData?.();
        cleanupExit?.();
        cleanupReady?.();
    };
}, [terminalId]);
```

## 8. Renderer — TerminalPage.tsx (src/pages/TerminalPage.tsx)

### spawnTerminal (lines 1674-1692)
```typescript
const spawnTerminal = useCallback(async (terminalId: string, cwd?: string, agentType?: string) => {
    if (!window.deskflowAPI) {
        showError('Terminal API not available - cannot create terminal', 'error');
        return false;
    }
    try {
        const result = await window.deskflowAPI.spawnTerminal(terminalId, cwd || '', agentType);
        if (!result.success) {
            showError(`Failed to spawn shell: ${result.error || 'Unknown error'}`, 'error');
            return false;
        }
        return true;
    } catch (e) {
        console.error('[TerminalPage] spawnTerminal error:', e);
        showError(`Terminal creation failed: ${(e as any).message}`, 'error');
        return false;
    }
}, [showError]);
```

### handleCreateTerminal (lines 1708-1721)
```typescript
useEffect(() => {
    const handleCreateTerminal = async (e: CustomEvent) => {
        const d = e.detail as { terminalId: string; cwd?: string; agent?: string; sessionName?: string };
        userCreatedTerminalRef.current = true;
        window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId: d.terminalId } }));
        await spawnTerminal(d.terminalId, d.cwd || propProjectPath, d.agent);
        window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: d.terminalId, agent: d.agent } }));
        if (d.agent && d.agent.length > 0) {
            await initializeTerminal(d.terminalId, d.agent, undefined, undefined, undefined, d.cwd || propProjectPath);
        }
    };
    window.addEventListener('create-terminal', handleCreateTerminal as EventListener);
    return () => window.removeEventListener('create-terminal', handleCreateTerminal as EventListener);
}, [spawnTerminal, initializeTerminal, propProjectPath]);
```

## 9. Known Verified Facts (from Probe testing)

1. **PTY spawns successfully** — PID confirmed in main console (e.g., PID 3632, then PID 35888)
2. **No crash overlay** — `intentionalKills` + `spawnTimes` guard works correctly
3. **Close terminal works** — "KILL: term-..." logged, "+ Open Terminal" returns, no crash exit
4. **terminalWriteRaw returns `{success: true}`** — writes reach the PTY
5. **xterm shows only "Starting shell..."** — no PTY output appears, no cmd.exe prompt
6. **agent:timeout fires after 30s** — this is a separate issue (agent launch timeout)
7. **terminal:ready (3s fallback) fires** — confirmed via renderer console logs (seq 41-42):
   - `[DEBUG:TW] TerminalPane mounted, calling onTerminalReady: term-...`
   - `[DEBUG:TW] handleTerminalReady called: term-... spawnedTerminalsRef.has: true`
   - `[DEBUG:TW] handleTerminalReady: already spawned, dispatching ready-custom`
8. **No `terminal:data` logs appear in renderer console** — the `onTerminalData` callback never fires OR the data is empty/not rendered

## 10. Suspicious Areas to Investigate

### A. `broadcast()` window target
The `broadcast` function iterates `BrowserWindow.getAllWindows()`. If the app uses multiple windows (e.g., a hidden background window), the broadcast could be going to the wrong window. Check if only 1 window exists at terminal time.

### B. `terminal:data` vs `terminalAPI.onData` conflict
Two sets of `ipcRenderer.on('terminal:data')` listeners exist in preload.ts:
- `onTerminalData` (line 287) — returns cleanup function
- `terminalAPI.onData` (line 341) — no cleanup, raw listener
- `terminalAPI.removeDataListener` (line 344) — **calls `removeAllListeners('terminal:data')`** which kills BOTH

Check if any code calls `removeAllListeners` or `terminalAPI.removeDataListener`.

### C. C1 vs C2 duplicate data handler
Both C1 (`terminal:create`, never called) and C2 (`spawn-terminal`, active) register data handlers. If both were somehow triggered for the same terminal, there would be two callbacks. Not the current issue since C1 is never called, but worth understanding.

### D. Empty PTY output on Windows
On Windows, `cmd.exe` may not output a prompt immediately. It may wait for input first. The 3-second `armTerminalReadyFallback` should handle this, but after the fallback fires and buffered input is sent, the response still doesn't render. Check if `cmd.exe` is producing empty data or control sequences that xterm doesn't render.

### E. `handleTerminalReady` in TerminalWindow.tsx
The `useEffect` at line 146 registers a listener for `onTerminalReady` — but ALSO checks `spawnedTerminalsRef` and dispatches a custom event. If `handleTerminalReady` is called but the data handler cleanup hasn't been set up yet (race between useEffect ordering), data could be lost. Check useEffect ordering in TerminalWindow.tsx.

---

## IPC Channel Summary

| Channel | Direction | Purpose | File:Line |
|---------|-----------|---------|-----------|
| `spawn-terminal` | renderer→main | Spawn new PTY | main.ts:8650 |
| `terminal:write-raw` | renderer→main | Write data to PTY | main.ts (search) |
| `terminal:data` | main→renderer | PTY output data | main.ts:8667, preload.ts:287/341 |
| `terminal:ready` | main→renderer | Terminal ready to receive input | main.ts:8665, preload.ts:303 |
| `terminal:exit` | main→renderer | PTY exited | main.ts:8747, preload.ts:292 |
| `terminal:resize-old-format` | renderer→main | Resize PTY | main.ts (search) |
| `terminal:destroy-old-format` | renderer→main | Destroy terminal | preload.ts:302 |
| `agent:timeout` | main→renderer | Agent init timed out | main.ts:8158 |

## Shell Configuration

Windows cmd.exe spawned via node-pty:
```javascript
const shell = process.platform === 'win32' ? (process.env.COMSPEC || 'powershell.exe') : ...
const proc = pty.spawn(shell, [], { name: 'xterm-256color', cols, rows, cwd: workingDir, env: process.env });
```
