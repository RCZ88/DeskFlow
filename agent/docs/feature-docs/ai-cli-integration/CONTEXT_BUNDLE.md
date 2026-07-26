# CONTEXT BUNDLE — AI Agent CLI Integration

## Purpose

This bundle contains the ACTUAL source code for all files involved in AI agent terminal integration. The Architect can use this to design how opencode, claude-code, codex, and gemini CLIs should be integrated into the DeskFlow terminal workspace.

---

## 1. TerminalPane Component (xterm.js setup)

**File:** `src/components/TerminalWindow.tsx` (lines 103-471)

### TerminalPane Interface
```typescript
interface TerminalPaneProps {
  terminalId: string;
  isActive: boolean;
  onTerminalReady: (id: string) => void;
  onSplit: (id: string, direction: 'horizontal' | 'vertical') => void;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  agentStatus?: 'spawning' | 'waiting' | 'ready' | 'timeout';
  onRetryInit?: (terminalId: string) => void;
}
```

### Terminal Creation (lines 113-192)
```typescript
useEffect(() => {
  if (!containerRef.current || terminalRef.current) return;

  const terminal = new Terminal({
    theme: {
      background: '#0d0d0d',
      foreground: '#e0e0e0',
      cursor: '#00ff00',
      // ... full color theme
    },
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

  // Sync fit BEFORE onTerminalReady fires
  if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
    try { fitAddon.fit(); } catch {}
    try { window.deskflowAPI?.terminalResize?.(terminalId, terminal.cols, terminal.rows); } catch {}
  }

  // ResizeObserver for dynamic resizing
  const ro = new ResizeObserver(debounce(() => {
    if (terminalRef.current) {
      try { fitAddon.fit(); } catch {}
      try { window.deskflowAPI?.terminalResize?.(terminalId, terminal.cols, terminal.rows); } catch {}
    }
  }, 100));
  ro.observe(containerRef.current);

  onTerminalReady(terminalId);

  return () => { ro.disconnect(); terminal.dispose(); };
}, [terminalId, onTerminalReady]);
```

### Input Handling (lines 216-232)
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

### PTY Output Handling (lines 244-264)
```typescript
const cleanupData = window.deskflowAPI.onTerminalData?.((id, data) => {
  if (id === terminalId && terminalRef.current) {
    terminalRef.current.write(data);
    // Unlock input when real output arrives
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
```

### Container Element (lines 407-416)
```tsx
<div
  ref={containerRef}
  className="relative w-full h-full min-h-0 overflow-hidden"
  style={{ outline: isActive ? '2px solid rgb(34 197 94)' : 'none', outlineOffset: '-2px' }}
  data-terminal-id={terminalId}
>
```

---

## 2. TerminalLayout Component

**File:** `src/components/TerminalWindow.tsx` (lines 669-796)

### Empty State / Center Button (lines 755-778)
```typescript
if (!layout || getLeafIds(layout).length === 0) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-zinc-500 bg-[#0d0d0d] overflow-hidden z-10">
      <div className="flex flex-col items-center gap-3">
        <TerminalIcon className="w-8 h-8 text-zinc-600" />
        <button
          onClick={() => {
            const newId = `term-${Date.now()}`;
            const agentType = getDefaultAgent();
            const { cols, rows } = measureSpawnSize(newId);
            spawnedTerminalsRef.current.add(newId);
            onLayoutChange({ type: 'leaf', terminalId: newId });
            spawnTerminal(newId, projectPath, agentType, cols, rows).then(() => {
              window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: newId } }));
            });
          }}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm whitespace-nowrap"
        >
          + Open Terminal
        </button>
      </div>
    </div>
  );
}
```

### Normal Layout (lines 780-795)
```typescript
return (
  <div className="w-full h-full min-h-0 bg-[#0d0d0d] overflow-hidden flex flex-col">
    <PaneRenderer
      node={layout}
      activeTerminalId={activeTerminalId}
      onTerminalReady={handleTerminalReady}
      onSplit={handleSplit}
      onClose={handleClose}
      onFocus={onActiveTerminalChange}
      onDragHandle={handleSplitDrag}
      path={[]}
      agentStatuses={agentStatuses}
      onRetryInit={onRetryInit}
    />
  </div>
);
```

---

## 3. PaneRenderer Component

**File:** `src/components/TerminalWindow.tsx` (lines 515-581)

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
            <PaneRenderer node={child} ... />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
```

---

## 4. Terminal Spawning (TerminalPage.tsx)

**File:** `src/pages/TerminalPage.tsx`

### spawnTerminal (lines 1139-1156)
```typescript
const spawnTerminal = useCallback(async (terminalId: string, cwd?: string, agentType?: string, cols?: number, rows?: number) => {
  if (!window.deskflowAPI) {
    showError('Terminal API not available - cannot create terminal', 'error');
    return false;
  }
  try {
    const result = await window.deskflowAPI.spawnTerminal(terminalId, cwd || '', agentType, cols, rows);
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

### initializeTerminal (lines 933-1060)
```typescript
const initializeTerminal = useCallback(async (terminalId: string, agent: string, resumeId?: string, initContent?: string, systemPrompt?: string, projectPath?: string) => {
  if (initializingTerminals.current.has(terminalId)) return;
  initializingTerminals.current.add(terminalId);
  try {
    // 1. Verify agent availability
    if (window.deskflowAPI?.verifyAgent) {
      const verifyResult = await window.deskflowAPI.verifyAgent(agent);
      if (!verifyResult?.found) {
        if (agent !== 'opencode') {
          showError(verifyResult?.installHint || `Agent '${agent}' not found.`, 'warning');
          return;
        }
      }
    }

    // 2. Wait for terminal ready
    await new Promise<void>((resolve) => {
      let done = false;
      const remover = window.deskflowAPI?.onTerminalReady?.((id) => {
        if (id === terminalId && !done) { done = true; remover?.(); resolve(); }
      });
      setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 3000);
    });

    // 3. Small pause to let shell render
    await new Promise(r => setTimeout(r, 200));

    // 4. Send init content / system prompt
    if (initContent || systemPrompt) {
      const combined = systemPrompt ? `${systemPrompt}\n\n${initContent || ''}` : initContent || '';
      const sendResult = await window.deskflowAPI.agentSend(terminalId, combined, agent);
    }

    // 5. Capture session ID for resume (opencode-specific)
    if (agent === 'opencode' && projectPath) {
      // ... capture session ID from opencode.db
    }
  } finally {
    initializingTerminals.current.delete(terminalId);
  }
}, []);
```

### handleSendToTerminal (lines 1411-1413)
```typescript
const handleSendToTerminal = useCallback(async (terminalId: string, message: string, agentType?: string) => {
  const result = await window.deskflowAPI.agentSend(terminalId, message, agentType);
}, []);
```

---

## 5. IPC Bridge (Preload)

**File:** `src/preload.ts`

```typescript
// Terminal operations
terminalWrite: (terminalId: string, data: string) => ipcRenderer.invoke('terminal:write', terminalId, data),
terminalWriteRaw: (terminalId: string, data: string) => ipcRenderer.invoke('terminal:write-raw', terminalId, data),
terminalResize: (terminalId: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', terminalId, cols, rows),
terminalDestroy: (terminalId: string) => ipcRenderer.invoke('terminal:destroy', terminalId),
spawnTerminal: (terminalId: string, cwd?: string, agentType?: string, cols?: number, rows?: number) => ipcRenderer.invoke('terminal:spawn', terminalId, cwd, agentType, cols, rows),

// Agent operations
verifyAgent: (agentType: string) => ipcRenderer.invoke('verify-agent', agentType),
agentSend: (terminalId: string, content: string, agentType?: string) => ipcRenderer.invoke('agent:send', terminalId, content, agentType),
retryAgentLaunch: (terminalId: string, agentType: string) => ipcRenderer.invoke('retry-agent-launch', terminalId, agentType),

// Events
onTerminalData: (callback) => ipcRenderer.on('terminal:data', (_, id, data) => callback(id, data)),
onTerminalExit: (callback) => ipcRenderer.on('terminal:exit', (_, id, exitCode, signal, intentional) => callback(id, exitCode, signal, intentional)),
onTerminalReady: (callback) => ipcRenderer.on('terminal:ready', (_, id) => callback(id)),
```

---

## 6. AI Agent Types

**File:** `src/pages/IDEProjectsPage.tsx` (lines 171-186)

```typescript
const AGENT_DETAILS: Record<string, { name: string; icon: string; color: string; provider: string }> = {
  'claude-code': { name: 'Claude Code', icon: 'claude', color: '#f97316', provider: 'Anthropic' },
  'gemini': { name: 'Gemini CLI', icon: 'gemini', color: '#4285f4', provider: 'Google' },
  'opencode': { name: 'OpenCode', icon: 'opencode', color: '#3b82f6', provider: 'OpenCode' },
  'codex': { name: 'Codex CLI', icon: 'codex', color: '#10b981', provider: 'OpenAI' },
};
```

---

## 7. measureSpawnSize Function

**File:** `src/components/TerminalWindow.tsx` (lines 590-668)

```typescript
function measureSpawnSize(terminalId: string): { cols: number; rows: number } {
  try {
    const el = document.querySelector(`[data-terminal-id="${terminalId}"]`) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const charMeasure = el.querySelector('.xterm-char-measure-element') as HTMLElement | null;
      const rowEl = el.querySelector('.xterm-rows > div') as HTMLElement | null;
      
      if (charMeasure && rowEl) {
        const charWidth = charMeasure.getBoundingClientRect().width || 8.4;
        const charHeight = rowEl.getBoundingClientRect().height || 17;
        const cols = Math.floor(rect.width / charWidth);
        const rows = Math.floor(rect.height / charHeight);
        if (cols > 0 && rows > 0) return { cols, rows };
      }
    }
  } catch {}
  return { cols: 80, rows: 24 };
}
```

---

## 8. Key Design Questions

1. **How do AI CLIs accept input?**
   - opencode: TUI with text input field? stdin?
   - claude-code: stdin? readline?
   - codex: stdin? TUI?
   - gemini CLI: stdin? API?

2. **How to prevent TUI "push down"?**
   - xterm.js container must have fixed dimensions
   - PTY spawn dimensions must match actual container size
   - Full-screen TUI apps must not expand the container

3. **How to inject prompts into CLI textboxes?**
   - `terminal.write()` writes to xterm.js display
   - `terminalWriteRaw()` sends to PTY stdin
   - Need to understand each CLI's input mechanism

4. **How to handle terminal resize?**
   - ResizeObserver on container → `fitAddon.fit()` → `terminalResize()` to PTY
   - Must happen BEFORE PTY spawn for correct initial dimensions
