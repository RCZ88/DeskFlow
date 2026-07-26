# PROMPT #2: Deep Research — AI Agent TUI/CLI Interaction & Terminal Integration

## Your Role
You are a terminal systems researcher and TUI integration specialist. You have been given the ACTUAL source code from a real-world project (DeskFlow — an Electron + React + xterm.js desktop app with a terminal workspace). Your job is to produce a comprehensive technical reference that the project's engineers can use to fix their terminal integration issues.

## Project Overview
- **Stack:** Electron (main + renderer), React (frontend), xterm.js (terminal rendering), node-pty (PTY spawning), better-sqlite3 (DB)
- **Problem:** When spawning AI agent CLIs (OpenCode, Claude Code, Gemini CLI, Codex CLI) inside xterm.js terminals, the TUI content gets "pushed down" (old shell output visible above TUI), and initial prompts are never delivered to the TUI's input field.
- **Your task:** Research how each CLI works internally, how TUI frameworks render to terminals, how PTY dimensions affect rendering, and how to programmatically inject text into TUI input fields. Then produce specific integration recommendations for this exact codebase.

---

## PART A: ACTUAL SOURCE CODE (Ground Truth)

The following is the ACTUAL source code from the project. Do not assume it works differently.

### A1. TerminalPage.tsx — initializeTerminal() (lines 935-1088)

```typescript
const initializeTerminal = useCallback(async (terminalId: string, agent: string, resumeId?: string, initContent?: string, systemPrompt?: string, projectPath?: string) => {
    if (initializingTerminals.current.has(terminalId)) {
      console.log('[TerminalPage] Already initializing terminal:', terminalId);
      return;
    }
    initializingTerminals.current.add(terminalId);
    try {
      // VERIFY AGENT AVAILABILITY
      if (window.deskflowAPI?.verifyAgent) {
        const verifyResult = await window.deskflowAPI.verifyAgent(agent);
        console.log('[RESUME-DBG] verifyAgent', agent, JSON.stringify(verifyResult));
        if (!verifyResult?.found) {
          if (agent !== 'opencode') {
            console.warn('[TerminalPage] Agent not found on PATH:', agent);
            showError(verifyResult?.installHint || `Agent '${agent}' not found. Install it and restart.`, 'warning');
            return;
          }
          console.log('[RESUME-DBG] Allowing opencode despite verifyAgent false-negative');
        }
      }

      // WAIT FOR TERMINAL READY (500ms timeout)
      try {
        await new Promise<void>((resolve) => {
          let done = false;
          const remover = window.deskflowAPI?.onTerminalReady?.((id: string) => {
            if (id === terminalId && !done) {
              done = true;
              remover?.();
              resolve();
            }
          });
          setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 500);
        });
      } catch {}
      console.log('[RESUME-DBG] terminal-ready wait complete for', terminalId);

      // small pause to let shell render
      await new Promise(r => setTimeout(r, 200));

      // Clear scrollback before TUI launches
      try { await window.deskflowAPI.terminalWrite(terminalId, '[2J[H[3J'); } catch {}

      // VERIFY resumeId against opencode's session list
      if (resumeId && resumeId.trim().length > 0) {
        try {
          const checkResult = await (window.deskflowAPI as any)?.checkSessionExists?.(resumeId);
          if (checkResult && !checkResult.exists) {
            console.log('[RESUME-DBG] Stored resumeId', resumeId, 'not found in opencode — starting fresh');
            resumeId = undefined;
          }
        } catch (e) {
          console.warn('[RESUME-DBG] Resume validation error, proceeding with resumeId:', e);
        }
      }

      // WRITE BANNER (display-only, no PTY)
      let banner = `
[resume] terminal ${terminalId} · looking up opencode session for ${projectPath || ''}…
`;
      if (resumeId) {
        banner += `[resume] found opencode session ${resumeId} (source: db)
`;
      } else {
        banner += `[resume] NO opencode session found — starting a FRESH session
`;
      }
      (window.deskflowAPI as any)?.terminalWriteDisplay?.(terminalId, banner);

      // LAUNCH AGENT (writes cd + agent command via terminalWriteRaw — this is a SHELL COMMAND, not an agent message)
      const cdCmd = projectPath ? `cd "${projectPath}"
` : '';
      let launchCommand: string;
      if (resumeId && resumeId.trim().length > 0) {
        const resumeFlags: Record<string, string> = {
          opencode: '--resume',
          claude: '--resume',
          codex: '--session',
          gemini: '--resume',
        };
        let resumeCmd = `${agent} ${resumeFlags[agent] || '-s'} ${resumeId}`;
        try {
          const prefs = await window.deskflowAPI?.getPreferences?.();
          const templates: Record<string, string> = prefs?.agentResumeCommands || {};
          const template = templates[agent];
          if (template) {
            resumeCmd = template.replace('{agent}', agent).replace('{resumeId}', resumeId);
          }
        } catch {}
        launchCommand = `${cdCmd}${resumeCmd}
`;
      } else {
        launchCommand = `${cdCmd}${agent}
`;
      }
      const r2 = await window.deskflowAPI?.terminalWriteRaw?.(terminalId, launchCommand);
      console.log('[TerminalPage] Wrote launch command:', JSON.stringify(launchCommand), 'result:', r2);

      // WAIT FOR AGENT TO BE READY (1.5s timeout)
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

      // SETTLE: let TUI fully grab the PTY before first flush
      await new Promise(r => setTimeout(r, 200));

      // ASSEMBLE PROMPT FROM systemPrompt + initContent + thoughtProcess
      const parts: string[] = [];
      if (systemPrompt) {
        parts.push(systemPrompt);
      } else {
        const prefs = await window.deskflowAPI?.getPreferences?.();
        const prompts = prefs?.systemPrompts || {};
        const prompt = prompts[agent] || prompts['claude'] || '';
        if (prompt) parts.push(prompt);
      }
      if (initContent) {
        parts.push(initContent);
      }
      if (thoughtProcessEnabled) {
        parts.push(`## Thought Process

Before providing your final answer, you MUST show your thought process in a <thought_process> block...`);
      }

      // ⚠️ THE BROKEN PART: uses terminalWriteRaw instead of agentSend
      if (parts.length > 0 && window.deskflowAPI?.terminalWriteRaw) {
        const combined = parts.join('

');
        const payload = '[200~' + combined + '[201~';
        const sendResult = await window.deskflowAPI.terminalWriteRaw(terminalId, payload);
        if (!sendResult?.success) {
          showError('Failed to send initialization prompt to terminal', 'error');
        } else {
          console.log('[TerminalPage] Sent initialization prompt via terminalWriteRaw:', combined.length, 'chars');
        }
      }
    } catch (e) {
      console.error('[TerminalPage] initializeTerminal failed:', e);
    } finally {
      initializingTerminals.current.delete(terminalId);
    }
  }, [thoughtProcessEnabled, showError]);
```

### A2. main.ts — Agent Configs, State Machine, IPC Handlers

```typescript
// AGENT_CONFIGS — NOTE: only opencode and claude are defined. codex and gemini are MISSING.
interface AgentConfig {
  binaryCandidates: string[];
  readyRegex: RegExp;
  installHint: string;
  bracketedPaste: boolean;
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  opencode: {
    binaryCandidates: ['opencode', 'opencode.cmd', 'opencode.exe'],
    readyRegex: /^(?:opencode)?\s*>\s*$/i,
    installHint: 'Install with: npm i -g opencode-ai (then restart the app)',
    bracketedPaste: true,
  },
  claude: {
    binaryCandidates: ['claude', 'claude.cmd', 'claude.exe'],
    readyRegex: /^(?:claude)?\s*>\s*$/i,
    installHint: 'Install with: npm i -g @anthropic-ai/claude-code (then restart the app)',
    bracketedPaste: true,
  },
  // ❌ MISSING: codex and gemini configs
};

const FALLBACK_READY_REGEX = /^[A-Za-z0-9_-]*\s*>\s*$/;

// AgentState interface
interface AgentState {
  agentType: string;
  phase: AgentPhase; // 'launching' | 'ready' | 'busy' | 'attention' | 'blocked'
  dataBuffer: string;
  idleSeq: number;
  launchStartedAt: number;
  handshakeToken?: string;
  timeoutHandle?: ReturnType<typeof setTimeout>;
  pendingWrites?: string[];
  currentModel?: string;
}
const agentStates = new Map<string, AgentState>();

// buildAgentInputPayload — wraps input in bracketed paste for TUI CLIs
function buildAgentInputPayload(data: string, agentType?: string): string {
  const normalized = String(data ?? '').replace(/
?/g, '
').trimEnd();
  const cfg = getAgentConfig(agentType);
  if (cfg.bracketedPaste) {
    return '[200~' + normalized + '[201~';
  }
  return normalized + '';
}

// flushPendingAgentWrites — called when agent becomes ready
function flushPendingAgentWrites(id: string, st: AgentState) {
  if (!st.pendingWrites || st.pendingWrites.length === 0) return;
  const writes = [...st.pendingWrites];
  st.pendingWrites = [];
  for (const w of writes) {
    terminalManager.write(id, buildAgentInputPayload(w, st.agentType));
  }
}

// markAgentReady — transitions from 'launching' to 'ready', flushes queue
function markAgentReady(id: string, st: AgentState) {
  if (st.phase !== 'launching') return;
  st.phase = 'ready';
  clearAgentTimeout(id);
  flushPendingAgentWrites(id, st);
  broadcast('agent:ready', { terminalId: id });
}

// agent:send IPC handler — QUEUES writes if agent is launching or busy
ipcMain.handle('agent:send', async (_event, terminalId: string, data: string, agentType?: string) => {
    const st = agentStates.get(terminalId);
    if (!st) {
        return { success: false, error: 'Agent session not found' };
    }
    const type = agentType || DEFAULT_AGENT;

    // Records prompt to DB
    const recordPrompt = () => {
        if (!db || !data || data.trim().length < 1) return undefined;
        try {
            const sid = getSessionIdForTerminal(terminalId);
            if (!sid) return undefined;
            pendingCompletions.add(terminalId);
            return db.prepare('INSERT INTO terminal_messages (session_id, role, content, status) VALUES (?, ?, ?, ?)').run(sid, 'user', data, 'in_progress');
        } catch (_e) { return undefined; }
    };

    // QUEUES writes if agent is launching or busy
    if (st.phase === 'launching' || st.phase === 'busy') {
        st.pendingWrites = st.pendingWrites || [];
        st.pendingWrites.push(data);
        const result = recordPrompt();
        return { success: true, queued: true };
    }

    // WRITES immediately if agent is ready
    const payload = buildAgentInputPayload(data, st.agentType || type);
    const success = terminalManager.write(terminalId, payload);
    if (success) {
        st.phase = 'busy';
        const result = recordPrompt();
    }
    return { success, queued: false };
});

// terminal:write-raw — DIRECT passthrough to PTY, NO queuing, NO agent state tracking
ipcMain.handle('terminal:write-raw', async (_event, terminalId: string, data: string) => {
    const success = terminalManager.write(terminalId, data);
    return { success };
});

// terminal:write-display — broadcasts to renderer ONLY, does NOT write to PTY
ipcMain.handle('terminal:write-display', async (_event, terminalId: string, data: string) => {
    broadcast('terminal:data', terminalId, data);
    return { success: true };
});
```

### A3. preload.ts — IPC Bridge

```typescript
// NOTE: terminalResize uses 'terminal:resize-old-format' channel name
terminalResize: (terminalId: string, cols: number, rows: number) =>
  ipcRenderer.invoke('terminal:resize-old-format', terminalId, cols, rows),

terminalWriteRaw: (terminalId: string, data: string) =>
  ipcRenderer.invoke('terminal:write-raw', terminalId, data),

terminalWrite: (terminalId: string, data: string) =>
  ipcRenderer.invoke('terminal:write', terminalId, data),

terminalWriteDisplay: (terminalId: string, data: string) =>
  ipcRenderer.invoke('terminal:write-display', terminalId, data),

agentSend: (terminalId: string, data: string, agentType?: string) =>
  ipcRenderer.invoke('agent:send', terminalId, data, agentType),

verifyAgent: (agentType: string) =>
  ipcRenderer.invoke('agent:verify', agentType),

onTerminalReady: (callback: (data: { terminalId: string }) => void) => {
  const handler = (_event: any, data: { terminalId: string }) => callback(data);
  ipcRenderer.on('terminal:ready', handler);
  return () => ipcRenderer.removeListener('terminal:ready', handler);
},

onAgentReady: (callback: (data: { terminalId: string }) => void) => {
  const handler = (_event: any, data: { terminalId: string }) => callback(data);
  ipcRenderer.on('agent:ready', handler);
  return () => ipcRenderer.removeListener('agent:ready', handler);
},

onTerminalData: (callback: (terminalId: string, data: string) => void) => {
  const handler = (_event: any, terminalId: string, data: string) => callback(terminalId, data);
  ipcRenderer.on('terminal:data', handler);
  return () => ipcRenderer.removeListener('terminal:data', handler);
},
```

### A4. TerminalWindow.tsx — TerminalPane, measureSpawnSize, handleTerminalReady

```typescript
// TerminalPane mount effect
useEffect(() => {
  if (!containerRef.current || terminalRef.current) return;
  const terminal = new Terminal({
    theme: { background: '#0d0d0d', foreground: '#e0e0e0', cursor: '#00ff00', ... },
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    cursorBlink: true,
    scrollback: 5000,
    cursorStyle: 'bar',
    windowsMode: true,
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon());
  terminal.open(containerRef.current);
  terminalRef.current = terminal;
  fitAddonRef.current = fitAddon;

  // terminal.onResize → IPC resize
  terminal.onResize(({ cols, rows }) => {
    window.deskflowAPI?.terminalResize?.(terminalId, cols, rows);
  });

  // Sync fit after open
  if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
    try { fitAddon.fit(); } catch {}
  }

  // Single debounced ResizeObserver
  const ro = new ResizeObserver(debounce(() => {
    if (terminalRef.current && containerRef.current) {
      try { fitAddon.fit(); } catch {}
    }
  }, 150));
  ro.observe(containerRef.current);

  inputBuffers.set(terminalId, []);
  terminalReadyStates.set(terminalId, false);
  terminal.write('[33mStarting shell...[0m
');
  onTerminalReady(terminalId);

  return () => { ro.disconnect(); terminal.dispose(); terminalRef.current = null; };
}, [terminalId, onTerminalReady]);

// Input handling: terminal.onData → terminalWriteRaw or buffer
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

// onTerminalData listener: writes PTY output to xterm, unlocks input
useEffect(() => {
  if (!window.deskflowAPI) return;
  const cleanupData = window.deskflowAPI.onTerminalData?.((id, data) => {
    if (id === terminalId && terminalRef.current) {
      terminalRef.current.write(data);
      if (!terminalReadyStates.get(terminalId)) {
        terminalReadyStates.set(terminalId, true);
        const pending = inputBuffers.get(terminalId) || [];
        pending.forEach((bufferedData) => {
          window.deskflowAPI?.terminalWriteRaw?.(terminalId, bufferedData);
        });
        inputBuffers.set(terminalId, []);
      }
    }
  });
  const cleanupReady = window.deskflowAPI.onTerminalReady?.((id) => {
    if (id === terminalId) {
      terminalReadyStates.set(terminalId, true);
      const buffer = inputBuffers.get(terminalId) || [];
      buffer.forEach((bufferedData) => {
        window.deskflowAPI?.terminalWriteRaw?.(terminalId, bufferedData);
      });
      inputBuffers.set(terminalId, []);
      setTimeout(() => {
        const fa = fitAddonRef.current;
        const t = terminalRef.current;
        if (fa && t) { fa.fit(); }
      }, 250);
    }
  });
  // 2.5s safety timeout for input unlock
  const inputUnlockFallback = setTimeout(() => {
    if (!terminalReadyStates.get(terminalId)) {
      terminalReadyStates.set(terminalId, true);
      const pending = inputBuffers.get(terminalId) || [];
      pending.forEach((bufferedData) => {
        window.deskflowAPI?.terminalWriteRaw?.(terminalId, bufferedData);
      });
      inputBuffers.set(terminalId, []);
    }
  }, 2500);
  return () => { clearTimeout(inputUnlockFallback); cleanupData?.(); cleanupReady?.(); };
}, [terminalId]);

// measureSpawnSize
function measureSpawnSize(terminalId: string): { cols: number; rows: number } {
  try {
    const el = document.querySelector(`[data-terminal-id="${terminalId}"]`) as HTMLElement | null;
    if (!el) return { cols: 80, rows: 24 };
    const rect = el.getBoundingClientRect();
    const charMeasure = el.querySelector('.xterm-char-measure-element') as HTMLElement | null;
    const rowEl = el.querySelector('.xterm-rows > div') as HTMLElement | null;
    if (charMeasure && rowEl) {
      const charWidth = charMeasure.offsetWidth || 8.4;
      const charHeight = rowEl.offsetHeight || 17;
      const cols = Math.max(40, Math.floor((rect.width - 8) / charWidth));
      const rows = Math.max(10, Math.floor((rect.height - 8) / charHeight));
      if (cols > 0 && rows > 0) {
        console.log(`[FIT] Measured: ${cols}x${rows} (cell: ${charWidth.toFixed(1)}x${charHeight.toFixed(1)})`);
        return { cols, rows };
      }
    }
  } catch (e) { console.error('[FIT] measureSpawnSize error:', e); }
  console.warn('[FIT] measureSpawnSize fallback: 80x24');
  return { cols: 80, rows: 24 };
}

// handleTerminalReady
const handleTerminalReady = useCallback(async (terminalId: string) => {
  console.log('[DEBUG:TW] handleTerminalReady called:', terminalId);
  if (spawnedTerminalsRef.current.has(terminalId)) {
    window.dispatchEvent(new CustomEvent('terminal:refit-' + terminalId));
    return;
  }
  spawnedTerminalsRef.current.add(terminalId);
  await waitForXtermMeasurement(terminalId); // implementation not shown in bundle
  const { cols: finalCols, rows: finalRows } = measureSpawnSize(terminalId);
  const agentType = getDefaultAgent();
  console.log(`[FIT] Spawning terminal ${terminalId} at ${finalCols}x${finalRows}`);
  const result = await spawnTerminal(terminalId, projectPath, agentType, finalCols, finalRows);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try { fitAddonRef.current?.fit(); } catch {}
  window.dispatchEvent(new CustomEvent('terminal:refit-' + terminalId));
  window.dispatchEvent(new CustomEvent('terminal:ready-custom', { detail: { id: terminalId } }));
}, [spawnTerminal, projectPath]);

// Module-level variables
const inputBuffers = new Map<string, string[]>();
const terminalReadyStates = new Map<string, boolean>();
```

---

## PART B: Research Mandate

### B1. Per-CLI Deep Dives

For EACH of the 4 AI agent CLIs, research and document:

#### 1. OpenCode CLI (`opencode`)
- **What is it?** Go-based CLI using Bubble Tea (Charm TUI framework)
- **How does it accept input?** Does Bubble Tea read from stdin via a `tea.Program`? Does it use a `textarea` or `textinput` bubble? How does the Elm architecture handle stdin?
- **How to programmatically send a prompt?** Can you write raw bytes to PTY stdin? Does it need bracketed paste (`\x1b[200~...\x1b[201~`)? What happens if you send text without bracketed paste?
- **Session management:** How are sessions created, listed, resumed? Is there `opencode serve` (HTTP API)? What is `opencode.db`? Can you query it?
- **Output format:** Does it use ANSI escape codes for full-screen TUI redraw? What is the data volume per frame?
- **Terminal requirements:** Minimum dimensions? Does it enter alternate screen buffer (`\x1b[?1049h`)? How does it handle SIGWINCH?
- **Prompt detection:** What does its ready prompt look like? The current regex is `/^(?:opencode)?\s*>\s*$/i` — is this accurate? What does the actual TUI prompt render as?
- **Headless mode:** Does `opencode run` exist? `opencode exec`? Any non-TUI mode?

#### 2. Claude Code CLI (`claude`)
- **What is it?** Node.js-based CLI using Ink (React TUI framework)
- **How does it accept input?** Does Ink use `useInput` hook? Does it use `<TextInput>`? How does Ink handle stdin?
- **How to programmatically send a prompt?** Does Ink respect bracketed paste? What happens with raw stdin writes?
- **Session management:** How are conversations persisted? `--resume` flag? Session files location?
- **Output format:** ANSI? `stream-json` mode (`--output-format stream-json`)?
- **Terminal requirements:** Full-screen redraw? Alternate screen buffer? SIGWINCH?
- **Prompt detection:** Current regex is `/^(?:claude)?\s*>\s*$/i` — accurate?
- **Headless mode:** `claude -p`? `--print`? `--bare`? `--output-format json`?

#### 3. Gemini CLI (`gemini`)
- **What is it?** Google's AI CLI. What language/framework? Does it even have a TUI?
- **How does it accept input?** TUI or stdin-only?
- **How to programmatically send a prompt?**
- **Session management:** Does it have sessions?
- **Output format:** ANSI? JSON?
- **Terminal requirements:**
- **Prompt detection:**
- **Headless mode:** Scripting mode?
- **NOTE:** This CLI is NOT configured in the project's `AGENT_CONFIGS`. The project needs to know if it should be added and how.

#### 4. Codex CLI (`codex`)
- **What is it?** OpenAI's CLI. What language/framework?
- **How does it accept input?** TUI or command-line arguments?
- **How to programmatically send a prompt?** `codex exec "prompt"`? `--full-auto`?
- **Session management:** Does it have sessions?
- **Output format:** ANSI? JSON? Plain text?
- **Terminal requirements:**
- **Prompt detection:**
- **Headless mode:** `codex exec`? `--full-auto`?
- **NOTE:** This CLI is also NOT configured in `AGENT_CONFIGS`.

### B2. Cross-Cutting Technical Research

#### TUI Framework Fundamentals
- How do Bubble Tea, Ink, and similar frameworks render to the terminal?
- What ANSI escape sequences do they use? (alternate screen buffer `\x1b[?1049h/l`, cursor positioning `\x1b[H`, clear screen `\x1b[2J`, etc.)
- How do they handle stdin input vs. pasted text?
- What is "bracketed paste mode" (`\x1b[?2004h` to enable, `\x1b[200~...\x1b[201~` to wrap)? Why is it critical for TUIs?
- How do TUI frameworks distinguish between keystrokes and pasted text?
- What is the "alternate screen buffer" and how does it affect scrollback?

#### PTY Interaction Mechanics
- How does `node-pty` work? What is the relationship between PTY dimensions and TUI rendering?
- What happens when PTY dimensions (cols/rows) don't match the terminal container size?
- What is `SIGWINCH` and how does it trigger TUI redraw?
- Why does a TUI "push down" when spawned with wrong dimensions? (The TUI clears N rows based on PTY rows, but the container is larger → old content remains visible below)
- How does xterm.js's `FitAddon` calculate cols/rows from container dimensions?
- What is xterm.js's `CharMeasure` and why does it measure fonts asynchronously?

#### Programmatic Text Injection
- Methods for sending text to a PTY: `pty.write()`, `terminal.write()`, IPC bridges
- Difference between writing to PTY stdin vs. writing to xterm.js display
- When to use bracketed paste vs. raw text vs. individual keystrokes
- How to simulate "Enter" key: `\r`, `\n`, `\r\n` — which one and when?
- How to handle multi-line prompts in TUI input fields
- How to handle special characters (quotes, backticks, code blocks) in pasted text

#### TUI State Detection
- How can an external system detect if a TUI is ready for input?
- Prompt detection strategies: regex on output buffer, screen buffer parsing, timing-based
- What are the limitations of regex-based prompt detection?
- How to parse xterm.js's internal screen buffer to "read" the TUI state
- What is the `terminal.buffer.active` API in xterm.js?

#### Terminal Dimension Synchronization
- The complete flow: container resize → xterm.js fit → PTY resize → TUI redraw
- Race conditions: xterm.js font measurement vs. PTY spawn timing
- Why `requestAnimationFrame` is insufficient for xterm.js measurement
- Best practices for measuring terminal dimensions before PTY spawn
- Post-spawn resize verification strategies

#### Session & Context Management
- How do different CLIs store session data? (SQLite, JSON files, cloud)
- How to programmatically list, resume, or export sessions
- How to inject system prompts, context files, or project rules into each CLI
- Differences between "one-shot" mode and "interactive session" mode

---

## PART C: Specific Issues to Address

Based on the actual source code provided, address these specific problems:

### Issue 1: Prompt Delivery Failure (CRITICAL)
**Current code at TerminalPage.tsx:1071:**
```typescript
if (parts.length > 0 && window.deskflowAPI?.terminalWriteRaw) {
  const combined = parts.join('

');
  const payload = '[200~' + combined + '[201~';
  const sendResult = await window.deskflowAPI.terminalWriteRaw(terminalId, payload);
}
```
This uses `terminalWriteRaw` which BYPASSES the agent state machine. The `agent:send` handler has a queue that holds writes until the agent is ready, but `terminalWriteRaw` skips this.

**Question:** Should this be changed to `agentSend`? What are the trade-offs? Does `agentSend` properly handle bracketed paste for all agents? What about the 1.5s timeout — is it too short for cold starts?

### Issue 2: Missing Agent Configs
**Current `AGENT_CONFIGS` only has `opencode` and `claude`. `codex` and `gemini` are missing.**

**Question:** What should the configs for `codex` and `gemini` look like? Do they even use TUIs? Do they need bracketed paste? What are their ready regexes?

### Issue 3: Terminal Dimension Mismatch
**Current `measureSpawnSize` has `Math.max(40, ...)` and `Math.max(10, ...)` minimums, and a fallback of 80×24.**

**Question:** If the TUI is spawned at 80×24 but the container is actually 140×45, what exactly happens? How does the TUI's alternate screen buffer interact with xterm.js's scrollback? Why does content appear "pushed down"?

### Issue 4: `terminalResize` Channel Name Mismatch
**In preload.ts:** `terminalResize` uses `'terminal:resize-old-format'`. Is there a newer format? Should this be updated?

### Issue 5: `terminalWrite` vs `terminalWriteRaw` vs `agentSend`
The project has three write paths:
- `terminalWrite` → `'terminal:write'` IPC → ??? (handler not shown in bundle)
- `terminalWriteRaw` → `'terminal:write-raw'` IPC → direct PTY write
- `agentSend` → `'agent:send'` IPC → queued, state-tracked, DB-recorded

**Question:** When should each be used? What is `'terminal:write'` for? Is there a missing handler?

---

## PART D: Output Requirements

Produce a single comprehensive document: `TUI_CLI_RESEARCH_REPORT.md`

### Required Sections:

```markdown
# TUI/CLI Research Report — DeskFlow Terminal Integration

## Executive Summary
[1-2 paragraphs summarizing key findings and recommended architecture]

## 1. Per-CLI Deep Dives

### 1.1 OpenCode CLI
[All subsections from B1]

### 1.2 Claude Code CLI
[All subsections from B1]

### 1.3 Gemini CLI
[All subsections from B1]

### 1.4 Codex CLI
[All subsections from B1]

## 2. Cross-Cutting Technical Reference

### 2.1 TUI Framework Fundamentals
### 2.2 PTY Interaction Mechanics
### 2.3 Programmatic Text Injection
### 2.4 TUI State Detection
### 2.5 Terminal Dimension Synchronization
### 2.6 Session & Context Management

## 3. DeskFlow-Specific Integration Architecture

### 3.1 Recommended Input Strategy Per Agent
[Table: Agent | Input Method | Detection Strategy | Prompt Injection Method | Session Management | Headless Available]

### 3.2 Recommended Terminal Spawn Flow
[Step-by-step flow with exact timing, measurement, and resize logic for THIS codebase]

### 3.3 Recommended Agent State Machine
[How to track agent phases: launching → ready → busy → ready]

### 3.4 Recommended Prompt Delivery System
[How to ensure prompts are never lost, queued properly, and delivered when the TUI is ready]

### 3.5 Recommended Fallback Strategies
[What to do when headless mode is unavailable, when TUI detection fails, etc.]

## 4. Specific Issue Resolution

### 4.1 Fix: Prompt Delivery (Issue 1)
[Exact code change for TerminalPage.tsx:1071]

### 4.2 Fix: Missing Agent Configs (Issue 2)
[Exact configs to add to AGENT_CONFIGS]

### 4.3 Fix: Terminal Dimensions (Issue 3)
[Exact changes to measureSpawnSize and spawn flow]

### 4.4 Fix: Resize Channel (Issue 4)
[Recommendation for terminalResize channel]

### 4.5 Fix: Write Path Clarification (Issue 5)
[When to use each write method]

## 5. Implementation Checklist

### 5.1 Immediate Fixes (for current bugs)
- [ ] Fix A: [specific change with file path and line number]
- [ ] Fix B: [specific change]

### 5.2 Short-Term Improvements
- [ ] Improvement 1: [specific change]
- [ ] Improvement 2: [specific change]

### 5.3 Long-Term Architecture
- [ ] Architecture change 1: [specific change]
- [ ] Architecture change 2: [specific change]

## 6. Code Examples

### 6.1 OpenCode Prompt Injection
```typescript
// Working example for this codebase
```

### 6.2 Claude Code Prompt Injection
```typescript
// Working example for this codebase
```

### 6.3 Gemini CLI Prompt Injection
```typescript
// Working example for this codebase
```

### 6.4 Codex CLI Prompt Injection
```typescript
// Working example for this codebase
```

### 6.5 Robust Terminal Dimension Measurement
```typescript
// For this codebase's measureSpawnSize
```

### 6.6 Agent State Machine
```typescript
// Recommended implementation for this codebase
```
```

## Research Standards
- Do NOT guess. If you don't know something, say "RESEARCH NEEDED" and explain what would need to be verified.
- Cite sources where possible (official docs, GitHub repos, CLI `--help` output).
- Include actual command-line examples (e.g., `opencode --help`, `claude --version`).
- If a CLI doesn't have a feature, explicitly say "NOT SUPPORTED" rather than omitting it.
- For code examples, assume the DeskFlow tech stack: Electron, React, TypeScript, xterm.js, node-pty.
- The code in Part A is the ground truth. Do not contradict it unless you have verified the behavior.
