# CONTEXT_BUNDLE: Terminal Agent Prompt Architecture

## Problem Statement

Terminal agent prompting is broken. When the app spawns a terminal and tries to send text (system prompt, user instructions) to the AI agent CLI (opencode/claude), the text goes to the **wrong process** — it lands in PowerShell instead of reaching the agent. The app has a mechanism (`agent:ready` event + `detectAgentPrompt`) intended to solve this, but it has multiple flaws that make it unreliable.

## Architecture Overview

### PTY Data Flow

```
User prompt / System init text
        │
        ▼
IPC: 'terminal-write' → main.ts handler
        │
        ▼
terminalManager.write(id, data) → t.pty.write(data)
        │
        ▼
node-pty writes to PTY master file descriptor → kernel PTY buffer
        │
        ▼
PTY slave → stdin of FOREGROUND process in the terminal
```

**Critical constraint:** `t.pty.write()` writes to the PTY's stdin buffer, NOT to a specific process. Whichever process is currently the foreground process in the terminal receives the data. The sequence is:
1. PTY spawns → PowerShell is the foreground process
2. Write `claude\r\n` → PowerShell reads "claude\n", starts the `claude` process
3. `claude` process inherits stdin/stdout/stderr from the PTY
4. **Only after claude starts** and reads from stdin does it receive our writes
5. Before that, PowerShell reads anything written to stdin (and tries to execute it as commands)

### File Map

| File | Role |
|------|------|
| `src/main.ts` | Electron main process — IPC handlers, PTY management, prompt detection |
| `src/preload.ts` | Preload bridge — exposes IPC channels to renderer |
| `src/pages/TerminalPage.tsx` | Renderer — terminal UI, session creation, init flow |
| `src/components/NewSessionDialog.tsx` | Renderer — session creation dialog, agent type selection |

---

## Source Code: Key Sections

### 1. `detectAgentPrompt` — main.ts:6221-6230

```typescript
function detectAgentPrompt(buffer: string): boolean {
  const lines = buffer.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) {
      return /^[>?$]\s*$/.test(trimmed);
    }
  }
  return false;
}
```

**What it does:** Checks if the last non-empty line of accumulated PTY output is exactly `>`, `?`, or `$` (optionally followed by whitespace), on its own line.

**What it's supposed to do:** Detect when the agent CLI has started and is showing its prompt, indicating it's ready to receive input.

**What goes wrong:**
- Regex `/^[>?$]\s*$/` matches ONLY a bare prompt character alone on a line
- Does NOT match: `opencode>`, `claude> `, `PS C:\Users\>`, `> some text`
- Many CLIs output the agent name before the prompt character (e.g., `claude> `)
- The data buffer accumulates ALL output including ANSI escape sequences, making the match fragile

### 2. `spawn-terminal` IPC handler — main.ts:6625-6715

```typescript
ipcMain.handle('spawn-terminal', async (_event, id: string, cwd?: string, agentType?: string) => {
    try {
        const result = terminalManager.spawn(id, cwd || '', 80, 24);
        if (result.success) {
            let agentReady = false;
            let dataBuffer = '';

            terminalManager.getDataHandler(id, function (data) {
                // ... forward data to all windows ...
                dataBuffer += data;
                if (dataBuffer.length > 10000) dataBuffer = dataBuffer.slice(-5000);

                const promptDetected = detectAgentPrompt(dataBuffer);
                if (!agentReady && agentType && promptDetected) {
                    agentReady = true;
                    clearAgentTimeout(id);
                    for (const win of windows) {
                        if (!win.isDestroyed()) {
                            try { win.webContents.send('agent:ready', { terminalId: id }); } catch {}
                        }
                    }
                }
                // ... parse output, detect edits, task completion ...
            });

            // ... exit handler ...

            for (const win of windows) {
                if (!win.isDestroyed()) {
                    try { win.webContents.send('terminal:ready', id); } catch {}
                }
            }

            if (agentType && sender) {
                startAgentTimeout(id, agentType, sender);
            }
        }
    } catch (e) { ... }
});
```

**Key points:**
- `agentType` is the 3rd parameter — optional, defaults to `undefined`
- `agent:ready` ONLY fires if `agentType` is truthy AND `promptDetected` is true
- `agent:ready` fires to ALL BrowserWindows, not just the sender
- There's a fallback 30-second timeout (`agent:timeout`) that fires if `agent:ready` never fires
- `terminal:ready` fires immediately after spawn (before the agent is ready)

### 3. `onAgentReady` preload bridge — preload.ts:271-275

```typescript
onAgentReady: (callback: (data: { terminalId: string }) => void) => {
    const handler = (_event: any, data: { terminalId: string }) => callback(data);
    ipcRenderer.on('agent:ready', handler);
    return () => ipcRenderer.removeListener('agent:ready', handler);
},
```

Standard IPC listener with cleanup function return. Same pattern as `onTerminalReady`.

### 4. `spawnTerminal` preload bridge — preload.ts:246

```typescript
spawnTerminal: (terminalId: string, cwd?: string, agentType?: string) =>
    ipcRenderer.invoke('spawn-terminal', terminalId, cwd, agentType),
```

### 5. `initializeTerminal` — TerminalPage.tsx:442-526

```typescript
const initializeTerminal = useCallback(async (terminalId: string, agent: string, resumeId?: string, initContent?: string, systemPrompt?: string) => {
    if (initializingTerminals.current.has(terminalId)) { return; }
    initializingTerminals.current.add(terminalId);
    try {
        // 1. Wait for terminal:ready (8s timeout)
        await new Promise<void>((resolve) => {
            let done = false;
            const remover = window.deskflowAPI?.onTerminalReady?.((id: string) => {
                if (id === terminalId && !done) { done = true; remover?.(); resolve(); }
            });
            setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 8000);
        });

        await new Promise(r => setTimeout(r, 200));

        // 2. Write launch command
        const NL = '\r\n';
        const launchCommand = resumeId ? `${agent} --resume ${resumeId}${NL}` : `${agent}${NL}`;
        await window.deskflowAPI?.terminalWrite?.(terminalId, launchCommand);

        // 3. Wait for agent:ready (15s timeout)
        await new Promise<void>((resolve) => {
            let done = false;
            const remover = window.deskflowAPI?.onAgentReady?.((data: { terminalId: string }) => {
                if (data.terminalId === terminalId && !done) {
                    done = true;
                    remover?.();
                    resolve();
                }
            });
            setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 15000);
        });

        // 4. Write system prompt
        if (systemPrompt) {
            await window.deskflowAPI?.terminalWrite?.(terminalId, systemPrompt + '\r\n');
        } else {
            const prefs = await window.deskflowAPI?.getPreferences?.();
            const prompt = (prefs?.systemPrompts || {})[agent] || '';
            if (prompt) await window.deskflowAPI.terminalWrite(terminalId, prompt + '\r\n');
        }

        // 5. Write init content (INITIALIZE.md, problems, requests)
        if (initContent) {
            await new Promise(r => setTimeout(r, 300));
            await window.deskflowAPI?.terminalWrite?.(terminalId, initContent + '\r\n');
        }

        // 6. Write thought process instruction (if enabled)
        if (thoughtProcessEnabled) {
            await window.deskflowAPI.terminalWrite(terminalId, thoughtInstruction + '\r\n');
        }
    } finally {
        initializingTerminals.current.delete(terminalId);
    }
}, [selectedProject, projects]);
```

**Key issues:**
- Steps 4-6 write multiple messages with no guarantee the agent has finished processing the previous one
- The `agent:ready` event ONLY fires on the FIRST prompt detection — subsequent prompts are not waited for
- No verification that the agent actually started (no `where.exe` check, no error output parsing)

### 6. `handleCreateNewSession` — TerminalPage.tsx:775-847

```typescript
const handleCreateNewSession = useCallback(async (name?, summary?, prompt?) => {
    // ... create UI tab ...
    const spawnResult = await window.deskflowAPI.spawnTerminal(newTerminalId, cwd, 'claude');
    // ... error handling ...
    await registerTerminal(newTerminalId);
    await initializeTerminal(newTerminalId, 'claude', undefined);

    // Write user prompt AFTER init (no duplicate agent:ready listener)
    if (prompt && prompt.trim()) {
        await window.deskflowAPI?.terminalWrite?.(newTerminalId, prompt + '\r\n');
    }
    // ... save session ...
}, [...]);
```

### 7. `handleSendToTerminal` — TerminalPage.tsx:753-773

```typescript
const handleSendToTerminal = useCallback(async (terminalId: string, message: string) => {
    const result = await window.deskflowAPI.terminalWrite(terminalId, message + '\r\n');
    if (result && !result.success) {
        showError(`Terminal not responding: ${result.error || 'Unknown error'}`, 'error');
        return false;
    }
    // ... cleanup, fire-and-forget summary update ...
    return true;
}, [...]);
```

### 8. NewSessionDialog agent type default — NewSessionDialog.tsx:245

```typescript
const [agentType, setAgentType] = useState('opencode');
```

Default agent is `'opencode'`. But `handleCreateNewSession` hardcodes `'claude'`. These must match.

---

## Data Structures

### terminal_messages table (SQLite)

```sql
CREATE TABLE terminal_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'in_progress', 'completed', 'failed'))
);
```

### SpawnTerminalResult (implicit)

```typescript
interface SpawnTerminalResult {
    success: boolean;
    error?: string;
}
```

### TerminalWriteResult (implicit)

```typescript
interface TerminalWriteResult {
    success: boolean;
    error?: string;
}
```

---

## IPC Endpoints

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `spawn-terminal` | renderer→main | `(id, cwd, agentType?)` | Create PTY, start data/exit handlers, fire `agent:ready` when prompt detected |
| `terminal-write` | renderer→main | `(id, data)` | Write to PTY stdin via `t.pty.write(data)` |
| `agent:ready` | main→renderer | `{terminalId}` | Fired when agent CLI shows prompt character |
| `agent:timeout` | main→renderer | `{terminalId, agentType}` | Fired if agent:ready not detected within 30s |
| `terminal:ready` | main→renderer | `terminalId` | Fired immediately after PTY spawns |
| `terminal:data` | main→renderer | `(id, data)` | Forward PTY output to all windows |
| `terminal:exit` | main→renderer | `(id, exitCode, signal)` | PTY process exited |

---

## Known Issues & Design Constraints

1. **No launch verification**: The app writes `claude\r\n` (or `opencode\r\n`) without checking if the binary exists. If it's not on PATH, PowerShell shows an error and all subsequent writes go to PowerShell.

2. **Regex too strict**: `/^[>?$]\s*$/` doesn't match agent CLIs that prefix the prompt with a name (e.g., `claude> `, `opencode> `, `user@host:~$ `).

3. **ANSI escape pollution**: The `dataBuffer` includes raw ANSI escape sequences (\x1b[...), which can interfere with prompt detection. The buffer is never cleaned.

4. **No handshake protocol**: There's no two-way verification that the agent received a message. Write is fire-and-forget via PTY.

5. **Multiple simultaneous writes**: `initializeTerminal` writes 3-4 messages (system prompt, init content, thought instruction) with only 300ms delays between them, without waiting for the agent to process each one.

6. **agentType mismatch**: NewSessionDialog defaults to `'opencode'`, but `handleCreateNewSession` hardcodes `'claude'`.

7. **Dead code**: `initializeTerminal` dependency array includes `selectedProject` and `projects` but no longer uses them (was using them for cwd, now uses explicit params).

8. **ContextAssemblyService, RAGService, ProjectContextService** are defined in `src/services/` but NOT compiled — they're not in the `package.json` build command. They exist but cannot be imported.
