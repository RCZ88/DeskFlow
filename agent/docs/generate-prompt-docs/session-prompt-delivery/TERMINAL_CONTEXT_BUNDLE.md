# TERMINAL CONTEXT BUNDLE — DeskFlow Workspace

## File: src/pages/TerminalPage.tsx
### Lines 935-1088: initializeTerminal()
```typescript
// Line 935
const initializeTerminal = useCallback(async (terminalId: string, agent: string, resumeId?: string, initContent?: string, systemPrompt?: string, projectPath?: string) => {
    if (initializingTerminals.current.has(terminalId)) {
      console.log('[TerminalPage] Already initializing terminal:', terminalId);
      return;
    }
    initializingTerminals.current.add(terminalId);
    try {
      // Line 942 — VERIFY AGENT AVAILABILITY
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

      // Line 956 — WAIT FOR TERMINAL READY (500ms timeout)
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

      // Line 974 — small pause to let shell render
      await new Promise(r => setTimeout(r, 200));

      // Line 977 — Clear scrollback before TUI launches
      try { await window.deskflowAPI.terminalWrite(terminalId, '\x1b[2J\x1b[H\x1b[3J'); } catch {}

      // Line 981 — VERIFY resumeId against opencode's session list
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

      // Line 996 — WRITE BANNER
      let banner = `\r\n[resume] terminal ${terminalId} · looking up opencode session for ${projectPath || ''}…\r\n`;
      if (resumeId) {
        banner += `[resume] found opencode session ${resumeId} (source: db)\r\n`;
      } else {
        banner += `[resume] NO opencode session found — starting a FRESH session\r\n`;
      }
      (window.deskflowAPI as any)?.terminalWriteDisplay?.(terminalId, banner);

      // Line 1005 — LAUNCH AGENT (fresh — no -s unless explicit resume)
      const cdCmd = projectPath ? `cd "${projectPath}"\r\n` : '';
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
        launchCommand = `${cdCmd}${resumeCmd}\r\n`;
      } else {
        launchCommand = `${cdCmd}${agent}\r\n`;
      }
      const r2 = await window.deskflowAPI?.terminalWriteRaw?.(terminalId, launchCommand);
      console.log('[TerminalPage] Wrote launch command:', JSON.stringify(launchCommand), 'result:', r2);

      // Line 1033 — WAIT FOR AGENT TO BE READY (1.5s timeout)
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

      // Line 1048 — SETTLE: let TUI fully grab the PTY before first flush
      await new Promise(r => setTimeout(r, 200));

      // Line 1055 — WRITE SYSTEM PROMPT + INIT CONTENT AS SINGLE SEND
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
        parts.push(`## Thought Process\n\nBefore providing your final answer, you MUST show your thought process in a <thought_process> block. This should include:\n- How you interpret the request and what you need to do\n- Which files or code areas you're considering\n- Tradeoffs you're weighing between different approaches\n- Why you chose the approach you did\n- Any potential pitfalls or edge cases to watch for\n\nKeep the thought process concise and focused — 3-10 sentences is usually sufficient.`);
      }
      // Line 1071 — THE BROKEN PART: uses terminalWriteRaw instead of agentSend
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
    } catch (e) {
      console.error('[TerminalPage] initializeTerminal failed:', e);
    } finally {
      initializingTerminals.current.delete(terminalId);
    }
  }, [thoughtProcessEnabled, showError]);
```

---

## File: src/main.ts
### Lines 10022-10047: AgentConfig and AGENT_CONFIGS
```typescript
// Line 10022
interface AgentConfig {
  binaryCandidates: string[];
  readyRegex: RegExp;
  installHint: string;
  bracketedPaste: boolean;
}

const DEFAULT_AGENT = 'opencode';

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
};

const FALLBACK_READY_REGEX = /^[A-Za-z0-9_-]*\s*>\s*$/;
```

### Lines 10131-10166: AgentState, agentStates, buildAgentInputPayload, flushPendingAgentWrites, markAgentReady
```typescript
// Line 10131
interface AgentState {
  agentType: string;
  phase: AgentPhase;
  dataBuffer: string;
  idleSeq: number;
  launchStartedAt: number;
  handshakeToken?: string;
  timeoutHandle?: ReturnType<typeof setTimeout>;
  pendingWrites?: string[];
  currentModel?: string;
}
const agentStates = new Map<string, AgentState>();

// Line 10144
function buildAgentInputPayload(data: string, agentType?: string): string {
  const normalized = String(data ?? '').replace(/\r\n?/g, '\n').trimEnd();
  const cfg = getAgentConfig(agentType);
  if (cfg.bracketedPaste) {
    return '\x1b[200~' + normalized + '\x1b[201~\r';
  }
  return normalized + '\r';
}

// Line 10159
function flushPendingAgentWrites(id: string, st: AgentState) {
  if (!st.pendingWrites || st.pendingWrites.length === 0) return;
  const writes = [...st.pendingWrites];
  st.pendingWrites = [];
  for (const w of writes) {
    terminalManager.write(id, buildAgentInputPayload(w, st.agentType));
  }
}

// Line 10168
function markAgentReady(id: string, st: AgentState) {
  if (st.phase !== 'launching') return;
  st.phase = 'ready';
  clearAgentTimeout(id);
  flushPendingAgentWrites(id, st);
  broadcast('agent:ready', { terminalId: id });
}
```

### Lines 11097-11176: agent:send, terminal:write-raw, terminal:write-display IPC handlers
```typescript
// Line 11097
electron_1.ipcMain.handle('agent:send', async (_event, terminalId: string, data: string, agentType?: string) => {
    const st = agentStates.get(terminalId);
    if (!st) {
        return { success: false, error: 'Agent session not found' };
    }
    const type = agentType || DEFAULT_AGENT;
    const recordPrompt = () => {
        if (!db || !data || data.trim().length < 1) return undefined;
        try {
            const sid = getSessionIdForTerminal(terminalId);
            if (!sid) return undefined;
            pendingCompletions.add(terminalId);
            return db.prepare('INSERT INTO terminal_messages (session_id, role, content, status) VALUES (?, ?, ?, ?)').run(sid, 'user', data, 'in_progress');
        } catch (_e) { return undefined; }
    };
    const notifyTask = (messageId: number | bigint | undefined) => {
        try {
            const { BrowserWindow } = require('electron');
            const windows = BrowserWindow.getAllWindows();
            for (const win of windows) {
                if (!win.isDestroyed()) {
                    try {
                        win.webContents.send('ai-task:updated', { terminalId, status: 'in_progress', messageId });
                    } catch (e) { /* silent */ }
                }
            }
        } catch (_e) { /* silent */ }
    };

    // Line 11126 — QUEUES writes if agent is launching or busy
    if (st.phase === 'launching' || st.phase === 'busy') {
        st.pendingWrites = st.pendingWrites || [];
        st.pendingWrites.push(data);
        const result = recordPrompt();
        if (result) notifyTask(result.lastInsertRowid);
        return { success: true, queued: true };
    }
    // Line 11133 — WRITES immediately if agent is ready
    const payload = buildAgentInputPayload(data, st.agentType || type);
    const success = terminalManager.write(terminalId, payload);
    if (success) {
        st.phase = 'busy';
        const result = recordPrompt();
        if (result) notifyTask(result.lastInsertRowid);
    }
    return { success, queued: false };
});

// Line 11169
electron_1.ipcMain.handle('terminal:write-raw', async (_event, terminalId: string, data: string) => {
    const success = terminalManager.write(terminalId, data);
    return { success };
});

// Line 11174
electron_1.ipcMain.handle('terminal:write-display', async (_event, terminalId: string, data: string) => {
    broadcast('terminal:data', terminalId, data);
    return { success: true };
});
```

---

## File: src/preload.ts
### IPC Bridge Definitions
```typescript
// Line 320 — spawnTerminal
spawnTerminal: (terminalId: string, cwd?: string, agentType?: string, cols?: number, rows?: number) =>
  ipcRenderer.invoke('spawn-terminal', terminalId, cwd, agentType, cols, rows),

// Line 389 — terminalResize
terminalResize: (terminalId: string, cols: number, rows: number) =>
  ipcRenderer.invoke('terminal:resize-old-format', terminalId, cols, rows),

// Line ~395 — terminalWriteRaw
terminalWriteRaw: (terminalId: string, data: string) =>
  ipcRenderer.invoke('terminal:write-raw', terminalId, data),

// Line ~400 — terminalWrite
terminalWrite: (terminalId: string, data: string) =>
  ipcRenderer.invoke('terminal:write', terminalId, data),

// Line ~405 — terminalWriteDisplay
terminalWriteDisplay: (terminalId: string, data: string) =>
  ipcRenderer.invoke('terminal:write-display', terminalId, data),

// Line ~410 — agentSend
agentSend: (terminalId: string, data: string, agentType?: string) =>
  ipcRenderer.invoke('agent:send', terminalId, data, agentType),

// Line ~415 — verifyAgent
verifyAgent: (agentType: string) =>
  ipcRenderer.invoke('agent:verify', agentType),

// Line ~420 — onTerminalReady
onTerminalReady: (callback: (data: { terminalId: string }) => void) => {
  const handler = (_event: any, data: { terminalId: string }) => callback(data);
  ipcRenderer.on('terminal:ready', handler);
  return () => ipcRenderer.removeListener('terminal:ready', handler);
},

// Line ~430 — onAgentReady
onAgentReady: (callback: (data: { terminalId: string }) => void) => {
  const handler = (_event: any, data: { terminalId: string }) => callback(data);
  ipcRenderer.on('agent:ready', handler);
  return () => ipcRenderer.removeListener('agent:ready', handler);
},

// Line ~440 — onTerminalData
onTerminalData: (callback: (terminalId: string, data: string) => void) => {
  const handler = (_event: any, terminalId: string, data: string) => callback(terminalId, data);
  ipcRenderer.on('terminal:data', handler);
  return () => ipcRenderer.removeListener('terminal:data', handler);
},

// Line ~450 — onTerminalExit
onTerminalExit: (callback: (terminalId: string, exitCode: number, signal?: number, intentional?: boolean) => void) => {
  const handler = (_event: any, terminalId: string, exitCode: number, signal?: number, intentional?: boolean) => callback(terminalId, exitCode, signal, intentional);
  ipcRenderer.on('terminal:exit', handler);
  return () => ipcRenderer.removeListener('terminal:exit', handler);
},
```

---

## File: src/components/TerminalWindow.tsx
### Lines 103-471: TerminalPane Component (key sections)
```typescript
// Line 103 — TerminalPane component
function TerminalPane({ terminalId, isActive, onTerminalReady, onSplit, onClose, onFocus, agentStatus, onRetryInit }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Line 113 — Terminal creation and xterm.js setup
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

    // Line 156 — terminal.onResize → IPC resize
    terminal.onResize(({ cols, rows }) => {
      window.deskflowAPI?.terminalResize?.(terminalId, cols, rows);
    });

    // Line 163 — Sync fit after open
    if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
      try { fitAddon.fit(); } catch {}
    }

    // Line 169 — Single debounced ResizeObserver
    const ro = new ResizeObserver(debounce(() => {
      if (terminalRef.current && containerRef.current) {
        try { fitAddon.fit(); } catch {}
      }
    }, 150));
    ro.observe(containerRef.current);

    inputBuffers.set(terminalId, []);
    terminalReadyStates.set(terminalId, false);
    terminal.write('\x1b[33mStarting shell...\x1b[0m\r\n');
    onTerminalReady(terminalId);

    return () => { ro.disconnect(); terminal.dispose(); terminalRef.current = null; };
  }, [terminalId, onTerminalReady]);

  // Line 218 — Input handling: terminal.onData → terminalWriteRaw or buffer
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

  // Line 246 — onTerminalData listener: writes PTY output to xterm, unlocks input
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
    // Line 280 — onTerminalReady listener: unlocks input, flushes buffer
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
        setTimeout(() => {
          const fa = fitAddonRef.current;
          const t = terminalRef.current;
          if (fa && t) { fa.fit(); }
        }, 250);
      }
    });
    // Line 299 — 2.5s safety timeout for input unlock
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
```

### Lines 590-618: measureSpawnSize()
```typescript
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
```

### Lines 725-756: handleTerminalReady()
```typescript
const handleTerminalReady = useCallback(async (terminalId: string) => {
  console.log('[DEBUG:TW] handleTerminalReady called:', terminalId);
  if (spawnedTerminalsRef.current.has(terminalId)) {
    window.dispatchEvent(new CustomEvent('terminal:refit-' + terminalId));
    return;
  }
  spawnedTerminalsRef.current.add(terminalId);
  await waitForXtermMeasurement(terminalId);
  const { cols: finalCols, rows: finalRows } = measureSpawnSize(terminalId);
  const agentType = getDefaultAgent();
  console.log(`[FIT] Spawning terminal ${terminalId} at ${finalCols}x${finalRows}`);
  const result = await spawnTerminal(terminalId, projectPath, agentType, finalCols, finalRows);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try { fitAddonRef.current?.fit(); } catch {}
  window.dispatchEvent(new CustomEvent('terminal:refit-' + terminalId));
  window.dispatchEvent(new CustomEvent('terminal:ready-custom', { detail: { id: terminalId } }));
}, [spawnTerminal, projectPath]);
```

### Lines 517-584: PaneRenderer Component
```typescript
function PaneRenderer({ node, activeTerminalId, onTerminalReady, onSplit, onClose, onFocus, onDragHandle, path, agentStatuses, onRetryInit }) {
  if (node.type === 'leaf') {
    return (
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
        <TerminalPane
          terminalId={node.terminalId!}
          isActive={node.terminalId === activeTerminalId}
          onTerminalReady={onTerminalReady}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
          agentStatus={agentStatuses?.[node.terminalId!]}
          onRetryInit={onRetryInit}
        />
      </div>
    );
  }
  const dir = node.direction || 'vertical';
  const flexDir = dir === 'horizontal' ? 'flex-row' : 'flex-col';
  const children = node.children || [];
  return (
    <div className={`flex ${flexDir} w-full h-full min-h-0`}>
      {children.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <SplitHandle direction={dir} onDrag={(delta) => onDragHandle(path, delta)} />}
          <div className="min-h-0 min-w-0 overflow-hidden flex flex-col" style={{ flex: 1 }}>
            <PaneRenderer node={child} activeTerminalId={activeTerminalId} onTerminalReady={onTerminalReady} onSplit={onSplit} onClose={onClose} onFocus={onFocus} onDragHandle={onDragHandle} path={[...path, i]} agentStatuses={agentStatuses} onRetryInit={onRetryInit} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
```

### Lines 783-798: TerminalLayout Component
```typescript
export function TerminalLayout({ layout, activeTerminalId, spawnTerminal, onLayoutChange, onActiveTerminalChange, onCloseTerminal, projectPath, agentStatuses, onRetryInit }) {
  // ... (see full source in TerminalWindow.tsx)
  return (
    <div className="w-full h-full min-h-0 bg-[#0d0d0d] overflow-hidden flex flex-col">
      <PaneRenderer node={layout} activeTerminalId={activeTerminalId} onTerminalReady={handleTerminalReady} onSplit={handleSplit} onClose={handleClose} onFocus={onActiveTerminalChange} onDragHandle={handleSplitDrag} path={[]} agentStatuses={agentStatuses} onRetryInit={onRetryInit} />
    </div>
  );
}
```

### Module-Level Variables
```typescript
const inputBuffers = new Map<string, string[]>();
const terminalReadyStates = new Map<string, boolean>();
```
