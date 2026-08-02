# Context Bundle — TUI CLI Agent Interaction System

> Full code context for the Architect. The Architect has NO file system access — all source is embedded here. The project is named RHEO (formerly DeskFlow).

---

## 1. Architecture Overview

The terminal/agent interaction flow has 4 layers:

**Renderer → IPC → Main process → node-pty**

```
TerminalPage.tsx
  └─ NewSessionDialog → onCreate(config)    [user clicks "Start Agent"]
      └─ window.deskflowAPI.spawnTerminal(id,cwd,agentType,cols,rows)
          └─ IPC handler 'spawn-terminal' in main.ts
              └─ terminalManager.spawn(id,cwd,cols,rows)
                  └─ node-pty spawn(shell, [], { cwd })

TerminalPage.tsx
  └─ initializeTerminal(id,agent,resumeId,initContent,systemPrompt,projectPath)
      └─ window.deskflowAPI.terminalWriteRaw(id, launchCommand)  // e.g. "cd /path\r\nopencode\r\n"
      └─ waits for agent:ready event (or timeout)
      └─ window.deskflowAPI.agentSend(id, combinedPrompt, agentType)
          └─ IPC 'agent:send' in main.ts
              └─ buildAgentInputPayload(data, agentType)  →  "\x1b[200~prompt\x1b[201~\r"
              └─ terminalManager.write(id, payload)

TerminalWindow.tsx (xterm.js)
  └─ TerminalPane mounts → xterm init → onTerminalReady(id)
      └─ handleTerminalReady(id) in TerminalLayout
          └─ checks spawnedTerminalsRef (mark-spawned event)
          └─ if NOT marked → spawnTerminal(id)  [NEW terminal path]
          └─ if marked → refit + ready-custom event  [SESSION-ONLY path, avoids double spawn]
  
  └─ onData → terminalWriteRaw(id, keystroke)  [user input to PTY]
  └─ onTerminalData(id, data) → xterm.write(data)  [PTY output to display]
```

---

## 2. Data Structures

### AGENT_CONFIGS (`src/main.ts:10339-10364`)
```typescript
interface AgentConfig {
  binaryCandidates: string[];   // ['opencode', 'opencode.cmd', 'opencode.exe']
  readyRegex: RegExp;            // /^(?:opencode)?\s*>\s*$/i
  installHint: string;           // human-readable install instructions
  bracketedPaste: boolean;       // if true, uses \x1b[200~...\x1b[201~ wrapping
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  opencode: { binaryCandidates: ['opencode','opencode.cmd','opencode.exe'], readyRegex: /^(?:opencode)?\s*>\s*$/i, installHint: 'npm i -g opencode-ai', bracketedPaste: true },
  claude:   { binaryCandidates: ['claude','claude.cmd','claude.exe'], readyRegex: /^(?:claude)?\s*>\s*$/i, installHint: 'npm i -g @anthropic-ai/claude-code', bracketedPaste: true },
  gemini:   { binaryCandidates: ['gemini','gemini.cmd','gemini.exe'], readyRegex: /^(?:gemini)?\s*>\s*$/i, installHint: 'npm i -g @google/gemini-cli', bracketedPaste: true },
  codex:    { binaryCandidates: ['codex','codex.cmd','codex.exe'], readyRegex: /^(?:codex)?\s*>\s*$/i, installHint: 'npm i -g @openai/codex', bracketedPaste: true },
};
const DEFAULT_AGENT = 'opencode';
const FALLBACK_READY_REGEX = /^[A-Za-z0-9_-]*\s*>\s*$/;
```

### AgentState Machine (main.ts:10450-10461)
```typescript
type AgentPhase = 'launching' | 'ready' | 'busy' | 'attention';

interface AgentState {
  agentType: string;
  phase: AgentPhase;
  dataBuffer: string;             // accumulated PTY output for prompt detection
  idleSeq: number;                // incremented each time agent returns to ready
  launchStartedAt: number;        // Date.now() when agent was spawned
  handshakeToken?: string;        // NOT used currently (disabled)
  timeoutHandle?: ReturnType<typeof setTimeout>;
  pendingWrites?: string[];       // writes queued while busy/launching
  currentModel?: string;
}

const agentStates = new Map<string, AgentState>();
```

### SessionConfig (from NewSessionDialog → TerminalPage.tsx)
```typescript
// Passed from NewSessionDialog via onCreate(config)
interface SessionConfig {
  id: string;                  // generated UUID
  name: string;                // user-visible session name
  agentType: string;           // 'opencode' | 'claude' | 'gemini' | 'codex'
  initContent?: string;        // initial prompt / context text
  customSystemPrompt?: string; // system prompt override
  resumeId?: string;           // opencode session ID to resume
  terminalMode?: 'new' | 'select';
  selectedTerminal?: string;
  modelTier?: string;
  contextConfig?: any;
  includeDefaultInit?: boolean;
  initializeFile?: string;
  problemIds?: string[];
  requestIds?: string[];
}
```

### terminal_sessions DB Table (main.ts:2202-2216)
```sql
CREATE TABLE terminal_sessions (
  id TEXT PRIMARY KEY,                              -- DeskFlow session ID (UUID)
  preset_id TEXT,                                   -- optional preset
  project_id TEXT,                                  -- project this session belongs to
  agent TEXT,                                       -- 'opencode' | 'claude' | etc.
  resume_id TEXT,                                   -- opencode session ID (the key field)
  topic TEXT,                                       -- user-visible session name
  working_directory TEXT,                           -- cwd for the terminal
  terminal_id TEXT,                                 -- PTY terminal instance ID
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migration-added columns:
--   category TEXT DEFAULT 'other'
--   status TEXT DEFAULT 'active'
--   product_area TEXT DEFAULT ''
--   description TEXT DEFAULT ''
--   auto_tags TEXT DEFAULT '[]'
--   category_confirmed INTEGER DEFAULT 0
--   subpage TEXT DEFAULT 'work/sessions'
--   auto_named INTEGER DEFAULT 0
```

### AgentConfig (style guide, non-code)
```yaml
# This is the external agent configuration format, stored in DB.
# Each agent has a TUI interaction profile:
agent_configs:
  - id: opencode
    label: OpenCode AI
    icon: Bot
    color: "#8b5cf6"             # violet
    defaultModel: claude-sonnet-4-20250514
    binaryCandidates: [opencode, opencode.cmd, opencode.exe]
    readyRegex: "^(?:opencode)?\\s*>\\s*$"
    installHint: "npm i -g opencode-ai"
    supportsResume: true
    resumeFlag: --resume
    bracketedPaste: true
```

---

## 3. Key Component Source

### initializeTerminal (TerminalPage.tsx:949-1101)

Full source of the function that orchestrates agent launch. Called after PTY is spawned.

```typescript
const initializeTerminal = useCallback(async (terminalId: string, agent: string, resumeId?: string, initContent?: string, systemPrompt?: string, projectPath?: string) => {
    if (initializingTerminals.current.has(terminalId)) return;
    initializingTerminals.current.add(terminalId);
    try {
        // Step 1: Verify agent binary exists on PATH
        if (window.deskflowAPI?.verifyAgent) {
            const verifyResult = await window.deskflowAPI.verifyAgent(agent);
            if (!verifyResult?.found && agent !== 'opencode') {
                showError(verifyResult?.installHint, 'warning');
                return;
            }
        }

        // Step 2: Wait for terminal ready event (or 500ms timeout)
        await new Promise<void>((resolve) => {
            let done = false;
            const remover = window.deskflowAPI?.onTerminalReady?.((id: string) => {
                if (id === terminalId && !done) { done = true; remover?.(); resolve(); }
            });
            setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 500);
        });

        // Step 3: Clear scrollback
        await window.deskflowAPI.terminalWrite(terminalId, '\x1b[2J\x1b[H\x1b[3J');

        // Step 4: Validate resumeId against opencode DB
        if (resumeId) {
            const checkResult = await window.deskflowAPI.checkSessionExists?.(resumeId);
            if (checkResult && !checkResult.exists) resumeId = undefined;
        }

        // Step 5: Write banner to terminal display
        let banner = `\r\n[resume] terminal ${terminalId} · looking up opencode session...\r\n`;
        window.deskflowAPI?.terminalWriteDisplay?.(terminalId, banner);

        // Step 6: Launch the agent binary
        const cdCmd = projectPath ? `cd "${projectPath}"\r\n` : '';
        let launchCommand: string;
        if (resumeId) {
            const resumeFlags: Record<string, string> = { opencode: '--resume', claude: '--resume', codex: '--session', gemini: '--resume' };
            launchCommand = `${cdCmd}${agent} ${resumeFlags[agent] || '-s'} ${resumeId}\r\n`;
        } else {
            launchCommand = `${cdCmd}${agent}\r\n`;  // fresh launch
        }
        await window.deskflowAPI?.terminalWriteRaw?.(terminalId, launchCommand);

        // Step 7: Wait for agent:ready event (Claude 5s, others 1.5s)
        const readyTimeout = agent === 'claude' ? 5000 : 1500;
        await new Promise<void>((resolve) => {
            let done = false;
            const remover = window.deskflowAPI?.onAgentReady?.((data) => {
                if (data.terminalId === terminalId && !done) { done = true; remover?.(); resolve(); }
            });
            setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, readyTimeout);
        });

        // Step 7b: Dummy Enter fallback if still launching
        const phase = await window.deskflowAPI?.agentGetPhase?.(terminalId);
        if (phase === 'launching') {
            await window.deskflowAPI?.terminalWriteRaw?.(terminalId, '\r');
            await new Promise(r => setTimeout(r, 1000));
        }

        // Step 8: Send system prompt via agentSend
        const promptParts = systemPrompt ? [systemPrompt] : [];
        if (systemPrompt && promptParts.length > 0 && window.deskflowAPI?.agentSend) {
            const combined = promptParts.join('\n\n');
            const sendResult = await window.deskflowAPI.agentSend(terminalId, combined, agent);
            if (!sendResult?.success) {
                console.warn('[TerminalPage] Failed to send initialization prompt:', sendResult?.error);
            }
        }
    } catch (e) {
        console.error('[TerminalPage] initializeTerminal failed:', e);
    } finally {
        initializingTerminals.current.delete(terminalId);
    }
}, [/* deps */]);
```

### handleTerminalReady (TerminalWindow.tsx:726-767)

```typescript
const handleTerminalReady = useCallback(async (terminalId: string) => {
    // If terminal was already spawned by onCreate (mark-spawned event seen),
    // skip spawn and just refit + fire ready-custom
    if (spawnedTerminalsRef.current.has(terminalId)) {
        window.dispatchEvent(new CustomEvent('terminal:refit-' + terminalId));
        window.dispatchEvent(new CustomEvent('terminal:ready-custom', { detail: { id: terminalId } }));
        return;
    }
    // Otherwise, this is a "Open Terminal" button click — spawn fresh
    spawnedTerminalsRef.current.add(terminalId);

    // Wait for xterm.js to have real dimensions
    const termInst = terminalInstances.get(terminalId);
    const fitInst = fitAddonInstances.get(terminalId);
    if (termInst) {
        await new Promise<void>((resolve) => {
            const check = () => {
                if (termInst.cols > 0 && termInst.rows > 0) resolve();
                else { try { fitInst?.fit(); } catch {} setTimeout(check, 50); }
            };
            check();
        });
    }

    const finalCols = termInst?.cols || 80;
    const finalRows = termInst?.rows || 24;
    const agentType = getDefaultAgent();
    const result = await spawnTerminal(terminalId, projectPath, agentType, finalCols, finalRows);

    // Refit after PTY spawn
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try { fitAddonInstances.get(terminalId)?.fit(); } catch {}
    window.dispatchEvent(new CustomEvent('terminal:refit-' + terminalId));
    window.dispatchEvent(new CustomEvent('terminal:ready-custom', { detail: { id: terminalId } }));
}, [spawnTerminal, projectPath]);
```

### `onCreate` handler — Full Session Creation (TerminalPage.tsx:4006-4110)
```typescript
onCreate={async (config: SessionConfig) => {
    const proj = projects.find(p => p.id === selectedProject);
    const cwd = proj?.path || '';
    const agent = config.agentType;
    const sessionName = config.name.trim() || `Session ${sessions.length + 1}`;
    localStorage.setItem('terminal-defaultAgent', agent);
    setShowNewSessionDialog(false);

    // Add optimistic session to list
    const optimisticSession = { id: config.id, agent, topic: sessionName, created_at: new Date().toISOString(), status: 'initializing' };
    setSessions(prev => [optimisticSession, ...prev]);

    // Resolve init content (problems, requests, files, etc.)
    let initContent = config.initContent || '';
    if (!config.resumeId && !config.initContent) {
        if (config.includeDefaultInit) { /* read INITIALIZE.md */ }
        if (config.initializeFile) { /* read custom init file */ }
        if (config.problemIds?.length) { /* append problem list */ }
        if (config.requestIds?.length) { /* append request list */ }
    }
    const systemPrompt = config.customSystemPrompt || undefined;

    // DETERMINE TERMINAL
    let targetTerminalId = '';
    const isNewTerminal = config.terminalMode !== 'select' || !config.selectedTerminal;

    if (isNewTerminal) {
        targetTerminalId = generateTerminalId();
        // Add to tab + layout
        setTerminalTabs(prev => ({ ...prev, [targetTerminalId]: { name: proj?.name || sessionName, agent } }));
        setActiveTerminalId(targetTerminalId);
        // [RACE-FIX] Mark spawned BEFORE await to prevent double-spawn
        window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId: targetTerminalId } }));
        const spawnRes = await window.deskflowAPI.spawnTerminal(targetTerminalId, cwd, agent);
        if (!spawnRes?.success) {
            window.dispatchEvent(new CustomEvent('terminal-cleanup', { detail: { terminalId: targetTerminalId } }));
            return;
        }
        await registerTerminal(targetTerminalId, agent);
        await initializeTerminal(targetTerminalId, agent, config.resumeId, initContent, systemPrompt, cwd);
    } else {
        targetTerminalId = config.selectedTerminal!;
        setActiveTerminalId(targetTerminalId);
        await initializeTerminal(targetTerminalId, agent, config.resumeId, initContent, systemPrompt, cwd);
    }

    // SAVE SESSION TO DB
    const sessionResult = await window.deskflowAPI?.saveTerminalSession?.({...});
    if (sessionResult?.success) {
        await window.deskflowAPI?.saveSessionConfig?.(config.id, config, proj?.path);
        loadSessions();
    }
}}
```

### captureOpencodeSessionId IPC Handler (main.ts:11594-11629)
```typescript
ipcMain.handle('capture-opencode-session-id', async (_event, workspaceDir: string, sinceTimestamp?: number) => {
    try {
        const homedir = require('os').homedir();
        const dbPath = path.join(homedir, '.local', 'share', 'opencode', 'opencode.db');
        if (!fs.existsSync(dbPath)) {
            return { success: false, sessionId: null, source: 'generated', reason: 'opencode db not found' };
        }
        const Database = require('better-sqlite3');
        const odb = new Database(dbPath, { readonly: true });
        try {
            const normDir = (p: any) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
            const targetDir = normDir(workspaceDir);
            const sinceISO = sinceTimestamp ? new Date(sinceTimestamp).toISOString() : null;
            const candidates = odb.prepare('SELECT id, directory, time_created FROM session ORDER BY time_created DESC').all();
            let row = candidates.find((r: any) => normDir(r.directory) === targetDir && (!sinceISO || String(r.time_created) >= sinceISO));
            if (!row && sinceISO) {
                row = candidates.find((r: any) => String(r.time_created) >= sinceISO);
            }
            odb.close();
            if (row && row.id) {
                return { success: true, sessionId: row.id, source: 'db' };
            }
            return { success: false, sessionId: null, source: 'generated', reason: 'no session for directory' };
        } catch (e) {
            odb.close();
            return { success: false, sessionId: null, source: 'generated', reason: String(e) };
        }
    } catch (err) {
        return { success: false, sessionId: null, source: 'generated', error: String(err) };
    }
});
```

### TerminalManager (main.ts:11000-11077)
```typescript
const terminalManager = {
    terminals: new Map(),           // Map<string, { id, pty, cwd, pid }>
    intentionalKills: new Set<string>(),
    spawnTimes: new Map<string, number>(),
    dataSubscribers: new Map<string, Set<(d: string) => void>>(),

    has(id: string) { return this.terminals.has(id); },

    onData(id: string, cb: (d: string) => void): () => void {
        const t = this.terminals.get(id);
        if (t) t.pty.onData(cb);
        if (!this.dataSubscribers.has(id)) this.dataSubscribers.set(id, new Set());
        this.dataSubscribers.get(id)!.add(cb);
        return () => { this.dataSubscribers.get(id)?.delete(cb); };
    },

    spawn(id: string, cwd: string, cols: number = 80, rows: number = 24) {
        if (this.terminals.has(id)) this.kill(id);  // dedupe
        const os = require('os');
        const fs = require('fs');
        const pty = require('node-pty');
        const shell = process.platform === 'win32'
            ? (process.env.COMSPEC || 'powershell.exe')
            : (process.env.SHELL || '/bin/bash');
        let workingDir = cwd || os.homedir();
        try { if (!fs.existsSync(workingDir)) workingDir = os.homedir(); } catch {}
        const proc = pty.spawn(shell, [], { name: 'xterm-256color', cols, rows, cwd: workingDir, env: process.env });
        this.spawnTimes.set(id, Date.now());
        const ip = {
            write: (data: string) => proc.write(data),
            resize: (c: number, r: number) => proc.resize(c, r),
            kill: () => proc.kill(),
            onData: (cb: (d: string) => void) => proc.onData(cb),
            onExit: (cb: (code: number, sig: string) => void) => proc.onExit(cb),
        };
        this.terminals.set(id, { id, pty: ip, cwd, pid: proc.pid });
        return { success: true };
    },

    write(id: string, data: string) {
        const t = this.terminals.get(id);
        if (t) { t.pty.write(data); return true; }
        return false;
    },

    resize(id: string, cols: number, rows: number) { /* ... */ },
    kill(id: string) { /* cleanup + release locks */ },
    getDataHandler(id: string, cb: (d: string) => void) { /* ... */ },
    getExitHandler(id: string, cb: (code: number, sig: string) => void) { /* ... */ },
};
```

### spawn-terminal IPC Handler (main.ts: ~11430-11488)
```typescript
ipcMain.handle('spawn-terminal', async (_event, terminalId, cwd, agentType, cols, rows) => {
    const result = terminalManager.spawn(terminalId, cwd, cols, rows);
    if (result.success) {
        const type = (agentType && agentType.trim().length > 0) ? agentType : DEFAULT_AGENT;
        clearAgentTimeout(terminalId);
        agentStates.set(terminalId, { agentType: type, phase: 'launching', dataBuffer: '', idleSeq: 0, launchStartedAt: Date.now(), pendingWrites: [] });
        startAgentTimeout(terminalId, type);
        armTerminalReadyFallback(terminalId);

        // Data batching + agent state machine
        const dataBatchBuffers = new Map<string, string>();
        const dataBatchTimers = new Map<string, ReturnType<typeof setTimeout>>();

        terminalManager.getDataHandler(terminalId, function (data) {
            // Coalesce data in same tick
            const existing = dataBatchBuffers.get(terminalId) || '';
            dataBatchBuffers.set(terminalId, existing + data);
            if (!dataBatchTimers.has(terminalId)) {
                dataBatchTimers.set(terminalId, setImmediate(() => {
                    dataBatchTimers.delete(terminalId);
                    const batched = dataBatchBuffers.get(terminalId);
                    dataBatchBuffers.delete(terminalId);
                    if (batched) broadcast('terminal:data', terminalId, batched);
                }) as any);
            }

            // Save to terminal_messages
            const sid = db.prepare('SELECT id FROM terminal_sessions WHERE terminal_id = ? ORDER BY created_at DESC LIMIT 1').get(terminalId)?.id;
            if (sid) db.prepare('INSERT INTO terminal_messages (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'assistant', data);

            // Agent state machine
            const st = agentStates.get(terminalId);
            if (!st) return;
            st.dataBuffer += data;
            if (st.dataBuffer.length > 10000) st.dataBuffer = st.dataBuffer.slice(-5000);

            const promptSeen = detectAgentPrompt(st.dataBuffer, st.agentType);
            const actionRequired = detectActionRequired(st.dataBuffer);

            if (st.phase === 'launching' && (isAgentReady() || hasEnoughAgentOutputToAcceptInput(st))) {
                markAgentReady(terminalId, st);
            } else if ((st.phase === 'busy' || st.phase === 'attention') && promptSeen) {
                st.phase = 'ready';
                st.idleSeq += 1;
                flushPendingAgentWrites(terminalId, st);
                broadcast('agent:idle', { terminalId, seq: st.idleSeq });
            } else if (st.phase === 'busy' && actionRequired) {
                st.phase = 'attention';
            } else if (st.phase === 'attention' && !actionRequired && data.length > 0) {
                st.phase = 'busy';
            }
        });
    }
    return result;
});
```

### agent:send IPC Handler (main.ts:11505-11556)
```typescript
ipcMain.handle('agent:send', async (_event, terminalId: string, data: string, agentType?: string) => {
    const st = agentStates.get(terminalId);
    if (!st) return { success: false, error: 'Agent session not found' };

    if (st.phase === 'launching' || st.phase === 'busy') {
        // Queue writes for later
        st.pendingWrites = st.pendingWrites || [];
        st.pendingWrites.push(data);
        recordPrompt();
        return { success: true, queued: true };
    }

    // Build payload and write to PTY
    const payload = buildAgentInputPayload(data, st.agentType || type);
    const success = terminalManager.write(terminalId, payload);
    if (success) {
        st.phase = 'busy';
        recordPrompt();
    }
    return { success, queued: false };
});
```

### buildAgentInputPayload (main.ts:10464-10468)
```typescript
function buildAgentInputPayload(data: string, agentType?: string): string {
    const normalized = String(data ?? '').replace(/\r\n?/g, '\n').trimEnd();
    const cfg = getAgentConfig(agentType);
    if (cfg.bracketedPaste) {
        return '\x1b[200~' + normalized + '\x1b[201~\r';
    }
    return normalized + '\n';
}
```

### detectAgentPrompt (main.ts:10399-10414)
```typescript
function detectAgentPrompt(buffer: string, agentType?: string): boolean {
    const clean = stripAnsi(buffer);    // removes all ANSI escape sequences
    const lines = clean.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (trimmed.length === 0) continue;
        if (looksLikeShell(trimmed)) return false;  // reject shell prompts
        const regex = getAgentConfig(agentType).readyRegex;
        return regex.test(trimmed);   // e.g. /^(?:opencode)?\s*>\s*$/i
    }
    return false;
}
```

### hasEnoughAgentOutputToAcceptInput (main.ts:10496-10503)
```typescript
function hasEnoughAgentOutputToAcceptInput(state: AgentState): boolean {
    const cfg = getAgentConfig(state.agentType);
    if (!cfg.bracketedPaste) return false;
    const lastLine = stripAnsi(state.dataBuffer).split(/\r?\n/).filter(Boolean).pop() || '';
    const notShell = !looksLikeShell(lastLine);
    return notShell && state.dataBuffer.trim().length > 0;
}
```

---

## 4. IPC Bridge (preload.ts)

### Agent-related channels exposed to renderer:
```typescript
// Terminal lifecycle
deskflowAPI: {
    spawnTerminal(terminalId, cwd, agentType?, cols?, rows?) → invoke('spawn-terminal')
    registerTerminal({ terminalId, projectId, agentType, status }) → invoke('register-terminal')
    terminalWriteRaw(terminalId, data) → invoke('terminal:write-raw')
    terminalWriteDisplay(terminalId, data) → invoke('terminal:write-display')
    terminalWrite(terminalId, data) → invoke('write-terminal')
    terminalResize(terminalId, cols, rows)
    terminalDestroy(terminalId)

    // Event listeners (main → renderer)
    onTerminalReady(callback)                   // PTY spawned and data flowing
    onTerminalData(callback)                    // raw PTY output
    onTerminalExit(callback)
    onAgentReady(callback)                      // agent prompt detected
    onAgentTimeout(callback)
    onAgentIdle(callback)
    onAgentInitError(callback)
    onAiTaskUpdated(callback)

    // Agent interaction
    agentSend(terminalId, data, agentType?)     → invoke('agent:send')
    agentGetPhase(terminalId)                   → invoke('agent:get-phase')
    verifyAgent(agentType)                      → invoke('agent:verify')
    armHandshake(terminalId)                    → invoke('agent:arm-handshake')
    retryAgentLaunch(terminalId, agentType)     → invoke('agent:retry-launch')
    setSessionModel(terminalId, model, agentType?)

    // Session management
    saveTerminalSession(session)                → invoke('save-terminal-session')
    getTerminalSessions(projectId?, limit?)
    getTerminalSessionById(sessionId)
    getTerminalSessionResumeId(sessionId)
    deleteTerminalSession(sessionId)
    checkSessionExists(sessionId)               → invoke('check-session-exists')
    captureOpencodeSessionId(workspaceDir, sinceTimestamp?) → invoke('capture-opencode-session-id')
    listOpencodeSessions(workspaceDir)          → invoke('list-opencode-sessions')
    updateSessionResumeId(sessionId, resumeId)  → invoke('update-session-resume-id')
    saveSessionConfig(sessionId, config, projectPath?)
    loadSessionConfig(sessionId, projectPath?)
    updateSessionCategory(data)
    getSessionMessages(sessionId, agentType?)
    summarizeSession(sessionId, projectPath?)

    // Terminal API (alternate, newer)
    terminalAPI: {
        create(id, cwd, cols, rows) → invoke('terminal:create')
        write(id, data) → invoke('terminal:write')
        resize(id, cols, rows) → invoke('terminal:resize')
        destroy(id) → invoke('terminal:destroy')
        onData(callback)
        removeDataListener()
    }
}
```

### `spawn-terminal` IPC (main.ts):
```typescript
ipcMain.handle('spawn-terminal', async (_event, terminalId, cwd, agentType, cols, rows) => {
    // Creates node-pty process, sets up agent state machine, data batching, output parsing
    // Returns { success: boolean, error?: string }
});
```

---

## 5. Current Problems — Why the System is FAKE

### Problem 1: Raw PTY text write, no TUI awareness

`buildAgentInputPayload` wraps prompt text in `\x1b[200~...\x1b[201~\r` (Bracketed Paste). This is a terminal escape sequence that says "the following text is pasted." It works for CLI apps that read stdin, but TUI apps like opencode have their own input handling:

- opencode uses a readline-style prompt (`opencode> `) with navigation, autocomplete, multi-line editing
- Bracketed paste mode TELLS the terminal to treat pasted text as-is, but the TUI must *support* bracketed paste. If it does (most modern TUIs do), the text appears in the edit buffer, then `\r` submits it.
- The problem: this is indistinguishable from the user typing. There's NO tool/mode awareness, NO output parse feedback before the next write, NO handling of TUI states (confirm prompts, error dialogs, file selection).

### Problem 2: Session ID retrieval is a HACK

`captureOpencodeSessionId` opens opencode's SQLite DB directly (`~/.local/share/opencode/opencode.db`), reads the `session` table, and tries to path-match the current working directory against `session.directory`. This is fragile because:
- Path normalization may differ
- Multiple sessions can match the same directory
- The session table has no concept of "this is the session running in THIS terminal"
- It has no connection to the actual PTY process

**The system should instead retrieve the session ID from the agent's output stream** — opencode prints its session ID on startup or in response to a command. The renderer should watch for it in PTY output, not query a separate database.

### Problem 3: Agent ready detection is primitive

`detectAgentPrompt` strips ANSI, splits by newline, and checks if the last non-empty line matches `^(?:opencode)?\s*>\s*$`. But:
- The TUI prompt may include ANSI formatting that's not fully stripped
- The prompt may appear mid-output, not at end of buffer
- Shell prompts (Windows cmd `C:\>`, PS `PS >`, bash `user@host: $`) must be distinguished — but the regex IS indistinguishable from a shell prompt

### Problem 4: No output parsing for structured data

The agent's output is NEVER parsed for session IDs, confirmation prompts, file change notifications, or structured responses. The only parsing is `detectActionRequired` and `detectEditsInOutput`, both using simple regex on the accumulated buffer.

### Problem 5: System prompt assembly is renderer-side

The 8-layer system prompt (default + general + agent-specific + project-specific + init content + thought process + auto-context + config directives) is assembled in `initializeTerminal()` and sent as one big text blob via `agentSend`. There's no split-into-multiple-messages, no streaming feedback, no verification that the agent accepted it.

---

## 6. How opencode CLI Actually Works

Based on the project's opencode integration:
1. User runs `opencode` in a terminal → opens a TUI with prompt `opencode> `
2. User types a natural language instruction or slash command
3. opencode processes it, may show intermediate thinking, then responds
4. After response, prompt returns to `opencode> `
5. Session IDs are stored in opencode's SQLite DB at `~/.local/share/opencode/opencode.db`
6. opencode supports `--resume <session_id>` to continue a previous session
7. opencode does NOT print the session ID to stdout during normal operation
8. But: `opencode --session-id` or equivalent may output it, OR the session ID can be obtained from the DB

**Key insight:** opencode DOES output its session ID indirectly — when it starts, it creates a row in its `session` table. The current DB path-match approach works for finding the session, but it's fragile and disconnected from the terminal process. A better approach would be:
- Inject a command that retrieves the session ID from opencode's output
- OR: Use the DB but with PID-based matching (correlate opencode's PID from node-pty to the session row)
- OR: Listen for the session ID in opencode's initial output stream
