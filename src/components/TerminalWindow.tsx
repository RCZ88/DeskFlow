import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { getDefaultAgent } from '../lib/defaults';
import '@xterm/xterm/css/xterm.css';

declare global {
  interface Window {
    deskflowAPI?: {
      terminalWrite: (terminalId: string, data: string) => Promise<{ success: boolean }>;
      terminalWriteRaw: (terminalId: string, data: string) => Promise<{ success: boolean }>;
      terminalResize: (terminalId: string, cols: number, rows: number) => Promise<{ success: boolean }>;
      terminalDestroy: (terminalId: string) => Promise<{ success: boolean }>;
      onTerminalData: (callback: (id: string, data: string) => void) => (() => void);
      onTerminalExit: (callback: (id: string, exitCode: number, signal: string) => void) => (() => void);
      onTerminalReady: (callback: (id: string) => void) => (() => void);
      onAgentReady: (callback: (data: { terminalId: string }) => void) => (() => void);
      onAgentTimeout: (callback: (data: { terminalId: string; agentType: string }) => void) => (() => void);
      retryAgentInit: (terminalId: string, agentType: string) => Promise<{ success: boolean }>;
      spawnTerminal: (terminalId: string, cwd?: string, agentType?: string) => Promise<boolean>;
      onAiTaskUpdated: (callback: (data: { terminalId: string; status: string; messageId?: string }) => void) => (() => void);
      onAiTaskFileChanged: (callback: (data: { tasks: any[] }) => void) => (() => void);
      getPromptStatus: (terminalId?: string) => Promise<{ success: boolean; data: any[] }>;
      aiTaskWatch: (projectPath: string) => Promise<{ success: boolean }>;
      aiTaskStopWatch: (projectPath: string) => Promise<{ success: boolean }>;
      aiTaskAdd: (task: { terminalId: string; prompt: string; agent: string; sessionId?: string; projectPath?: string }) => Promise<{ success: boolean; task?: any }>;
    };
  }
}

export interface PaneNode {
  type: 'leaf' | 'split';
  terminalId?: string;
  direction?: 'horizontal' | 'vertical';
  splitRatio?: number;
  children?: [PaneNode, PaneNode];
}

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

interface TerminalLayoutProps {
  layout: PaneNode | null;
  activeTerminalId: string | null;
  spawnTerminal: (id: string, cwd?: string, agentType?: string) => Promise<boolean>;
  onLayoutChange: (layout: PaneNode) => void;
  onActiveTerminalChange: (id: string) => void;
  onCloseTerminal: (id: string) => void;
  projectPath?: string;
  agentStatuses?: Record<string, 'spawning' | 'waiting' | 'ready' | 'timeout'>;
  onRetryInit?: (terminalId: string) => void;
}

const inputBuffers = new Map<string, string[]>();
const terminalReadyStates = new Map<string, boolean>();

export function replaceLeafTerminalId(node: PaneNode, targetId: string, newId: string): PaneNode {
  if (node.type === 'leaf') {
    return node.terminalId === targetId ? { ...node, terminalId: newId } : node;
  }
  return {
    ...node,
    children: [
      replaceLeafTerminalId(node.children![0], targetId, newId),
      replaceLeafTerminalId(node.children![1], targetId, newId),
    ],
  };
}

export function findLeafById(node: PaneNode | null, id: string | null): PaneNode | null {
  if (!node || !id) return null;
  if (node.type === 'leaf') {
    return node.terminalId === id ? node : null;
  }
  const [left, right] = node.children!;
  return findLeafById(left, id) || findLeafById(right, id);
}

function findFirstLeaf(node: PaneNode): PaneNode | null {
  if (node.type === 'leaf') return node;
  return findFirstLeaf(node.children![0]) || findFirstLeaf(node.children![1]);
}

function TerminalPane({ terminalId, isActive, onTerminalReady, onSplit, onClose, onFocus, agentStatus, onRetryInit }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#0d0d0d',
        foreground: '#e0e0e0',
        cursor: '#00ff00',
        cursorAccent: '#0d0d0d',
        selectionBackground: '#3b82f680',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.open(containerRef.current);
    requestAnimationFrame(() => fitAddon.fit());

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    inputBuffers.set(terminalId, []);
    terminalReadyStates.set(terminalId, false);

    terminal.write('\x1b[33mStarting shell...\x1b[0m\r\n');

    console.log('[DEBUG:TW] TerminalPane mounted, scheduling onTerminalReady in 100ms:', terminalId);
    setTimeout(() => {
      console.log('[DEBUG:TW] Calling onTerminalReady:', terminalId);
      onTerminalReady(terminalId);
    }, 100);

    return () => {
      terminal.dispose();
      terminalRef.current = null;
      inputBuffers.delete(terminalId);
      terminalReadyStates.delete(terminalId);
    };
  }, [terminalId, onTerminalReady]);

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

  useEffect(() => {
    if (!window.deskflowAPI) return;

    const cleanupData = window.deskflowAPI.onTerminalData?.((id, data) => {
      if (id === terminalId && terminalRef.current) {
        terminalRef.current.write(data);
      }
    });

    const cleanupExit = window.deskflowAPI.onTerminalExit?.((id, exitCode) => {
      if (id === terminalId && terminalRef.current) {
        terminalRef.current.write(`\r\n\x1b[31mProcess exited with code ${exitCode}\x1b[0m\r\n`);
        terminalReadyStates.set(terminalId, false);
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
      }
    });

    return () => {
      cleanupData?.();
      cleanupExit?.();
      cleanupReady?.();
    };
  }, [terminalId]);

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const terminal = terminalRef.current;
        if (terminal) {
          window.deskflowAPI?.terminalResize?.(terminalId, terminal.cols, terminal.rows);
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [terminalId]);

  useEffect(() => {
    if (isActive && terminalRef.current) {
      terminalRef.current.focus();
      // Re-fit when becoming active (tab switch may have changed layout)
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ outline: isActive ? '2px solid rgb(34 197 94)' : 'none', outlineOffset: '-2px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onFocus(terminalId)}
    >
      <style>{`.xterm-helper-textarea { display: none !important; }`}</style>
      {isHovered && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onSplit(terminalId, 'vertical'); }}
            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-400"
            title="Split Vertical"
          >
            ⋮
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSplit(terminalId, 'horizontal'); }}
            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-400"
            title="Split Horizontal"
          >
            ⋯
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(terminalId); }}
            className="p-1 bg-red-900/50 hover:bg-red-800 rounded text-xs text-red-400"
            title="Close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Agent status indicator (non-blocking) */}
      {agentStatus === 'waiting' && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-sm rounded-full px-2.5 py-1 z-10 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] text-cyan-400 font-medium">Initializing agent...</span>
        </div>
      )}
      {agentStatus === 'timeout' && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-sm rounded-full px-2.5 py-1 z-10 cursor-pointer"
             onClick={() => onRetryInit?.(terminalId)}>
          <svg className="w-2.5 h-2.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] text-amber-400 font-medium">Agent failed. Click to retry.</span>
        </div>
      )}
    </div>
  );
}

function SplitHandle({ direction, onDrag }: { direction: 'horizontal' | 'vertical'; onDrag: (delta: number) => void }) {
  const isDragging = useRef(false);
  const lastPos = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - lastPos.current;
      lastPos.current = currentPos;
      onDrag(delta);
    };
    const handleMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`flex-shrink-0 bg-zinc-800 hover:bg-green-600 transition-colors ${
        direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
      }`}
    />
  );
}

export function getLeafIds(node: PaneNode): string[] {
  if (node.type === 'leaf') return node.terminalId ? [node.terminalId] : [];
  if (!node.children || node.children.length < 2) return [];
  return [...getLeafIds(node.children[0]), ...getLeafIds(node.children[1])];
}

function PaneRenderer({
  node,
  activeTerminalId,
  onTerminalReady,
  onSplit,
  onClose,
  onFocus,
  onDragHandle,
  path,
  agentStatuses,
  onRetryInit,
}: {
  node: PaneNode;
  activeTerminalId: string | null;
  onTerminalReady: (id: string) => void;
  onSplit: (id: string, direction: 'horizontal' | 'vertical') => void;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onDragHandle: (path: number[], delta: number) => void;
  path: number[];
  agentStatuses?: Record<string, 'spawning' | 'waiting' | 'ready' | 'timeout'>;
  onRetryInit?: (terminalId: string) => void;
}) {
  if (node.type === 'leaf') {
    return (
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
    );
  }

  const dir = node.direction || 'vertical';
  const ratio = node.splitRatio || 0.5;
  const flexDir = dir === 'horizontal' ? 'flex-row' : 'flex-col';

  return (
    <div className={`flex ${flexDir} w-full h-full`}>
      <div style={{ flex: ratio }}>
        <PaneRenderer
          node={node.children![0]}
          activeTerminalId={activeTerminalId}
          onTerminalReady={onTerminalReady}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
          onDragHandle={onDragHandle}
          path={[...path, 0]}
          agentStatuses={agentStatuses}
          onRetryInit={onRetryInit}
        />
      </div>
      <SplitHandle direction={dir} onDrag={(delta) => onDragHandle(path, delta)} />
      <div style={{ flex: 1 - ratio }}>
        <PaneRenderer
          node={node.children![1]}
          activeTerminalId={activeTerminalId}
          onTerminalReady={onTerminalReady}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
          onDragHandle={onDragHandle}
          path={[...path, 1]}
          agentStatuses={agentStatuses}
          onRetryInit={onRetryInit}
        />
      </div>
    </div>
  );
}

export function TerminalLayout({
  layout,
  activeTerminalId,
  spawnTerminal,
  onLayoutChange,
  onActiveTerminalChange,
  onCloseTerminal,
  projectPath,
  agentStatuses,
  onRetryInit,
}: TerminalLayoutProps) {
  const spawnedTerminalsRef = useRef(new Set<string>());

  useEffect(() => {
    const handleCleanup = (e: CustomEvent) => {
      const { terminalId } = e.detail as { terminalId: string };
      spawnedTerminalsRef.current.delete(terminalId);
    };

    window.addEventListener('terminal-cleanup', handleCleanup as EventListener);
    return () => window.removeEventListener('terminal-cleanup', handleCleanup as EventListener);
  }, []);

  const handleSplit = useCallback((terminalId: string, direction: 'horizontal' | 'vertical') => {
    if (!layout) return;
    const newTerminalId = `term-${Date.now()}`;
    spawnedTerminalsRef.current.add(newTerminalId);
    onLayoutChange(splitPane(layout, terminalId, newTerminalId, direction));
    
    const agentType = getDefaultAgent();
    spawnTerminal(newTerminalId, projectPath, agentType).then(() => {
      window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: newTerminalId } }));
    });
  }, [layout, spawnTerminal, onLayoutChange, projectPath]);

  const handleClose = useCallback((terminalId: string) => {
    window.dispatchEvent(new CustomEvent('close-pane', { detail: { terminalId } }));
  }, []);

  const handleSplitDrag = useCallback((parentPath: number[], delta: number) => {
    if (!layout) return;
    onLayoutChange(adjustSplitRatio(layout, parentPath, delta));
  }, [layout, onLayoutChange]);

  const handleTerminalReady = useCallback(async (terminalId: string) => {
    console.log('[DEBUG:TW] handleTerminalReady called:', terminalId, 'spawnedTerminalsRef.has:', spawnedTerminalsRef.current.has(terminalId));
    if (spawnedTerminalsRef.current.has(terminalId)) {
      console.log('[DEBUG:TW] handleTerminalReady: already spawned, dispatching ready-custom');
      window.dispatchEvent(new CustomEvent('terminal:ready-custom', { detail: { id: terminalId } }));
      return;
    }
    spawnedTerminalsRef.current.add(terminalId);
    const agentType = getDefaultAgent();
    console.log('[DEBUG:TW] handleTerminalReady: spawning terminal...', terminalId, agentType);
    const result = await spawnTerminal(terminalId, projectPath, agentType);
    console.log('[DEBUG:TW] handleTerminalReady: spawnTerminal result:', terminalId, JSON.stringify(result));
    window.dispatchEvent(new CustomEvent('terminal:ready-custom', { detail: { id: terminalId } }));
    console.log('[DEBUG:TW] handleTerminalReady: done for', terminalId);
  }, [spawnTerminal, projectPath]);

  if (!layout || getLeafIds(layout).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-[#0d0d0d]">
        <button
          onClick={() => {
            const newId = `term-${Date.now()}`;
            const agentType = getDefaultAgent();
            onLayoutChange({ type: 'leaf', terminalId: newId });
            spawnTerminal(newId, projectPath, agentType).then(() => {
              window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: newId } }));
            });
          }}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
        >
          + Open Terminal
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0d0d0d] overflow-hidden">
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
}

export function removePane(layout: PaneNode, terminalId: string): PaneNode {
  if (layout.type === 'leaf') {
    return layout.terminalId === terminalId ? null! : layout;
  }
  const [left, right] = layout.children!;
  const newLeft = removePane(left, terminalId);
  const newRight = removePane(right, terminalId);
  if (!newLeft) return newRight;
  if (!newRight) return newLeft;
  return { ...layout, children: [newLeft, newRight] };
}

export function splitPane(layout: PaneNode, targetId: string, newTerminalId: string, direction: 'horizontal' | 'vertical'): PaneNode {
  if (layout.type === 'leaf') {
    if (layout.terminalId === targetId) {
      return { type: 'split', direction, splitRatio: 0.5, children: [layout, { type: 'leaf', terminalId: newTerminalId }] };
    }
    return layout;
  }
  const [left, right] = layout.children!;
  return { ...layout, children: [splitPane(left, targetId, newTerminalId, direction), splitPane(right, targetId, newTerminalId, direction)] };
}

export function findGroupIndex(layouts: PaneNode[], terminalId: string): number {
  for (let i = 0; i < layouts.length; i++) {
    if (findLeafById(layouts[i], terminalId)) return i;
  }
  return -1;
}

export function removeFromLayouts(layouts: PaneNode[], terminalId: string): PaneNode[] {
  return layouts
    .map(l => {
      if (l.type === 'leaf') {
        return l.terminalId === terminalId ? null : l;
      }
      const updated = removePane(l, terminalId);
      if (!updated) return null;
      const leaves = getLeafIds(updated);
      return leaves.length > 0 ? updated : null;
    })
    .filter((l): l is PaneNode => l !== null);
}

export function insertIntoLayout(layout: PaneNode | null, newTerminalId: string, targetId?: string): PaneNode {
  if (!layout) {
    return { type: 'leaf', terminalId: newTerminalId };
  }
  const target = targetId || findFirstLeaf(layout)?.terminalId;
  if (target) {
    return splitPane(layout, target, newTerminalId, 'vertical');
  }
  return { type: 'leaf', terminalId: newTerminalId };
}

export function toggleSplitDirection(node: PaneNode, path: number[]): PaneNode {
  if (path.length === 0) {
    if (node.type === 'split') {
      return { ...node, direction: node.direction === 'horizontal' ? 'vertical' : 'horizontal' };
    }
    return node;
  }
  if (node.type === 'split' && node.children) {
    return {
      ...node,
      children: [
        path[0] === 0 ? toggleSplitDirection(node.children[0], path.slice(1)) : node.children[0],
        path[0] === 1 ? toggleSplitDirection(node.children[1], path.slice(1)) : node.children[1],
      ],
    };
  }
  return node;
}

function adjustSplitRatio(layout: PaneNode, path: number[], delta: number): PaneNode {
  if (layout.type !== 'split') return layout;
  if (path.length === 0) {
    const currentRatio = layout.splitRatio || 0.5;
    const adjustment = delta * 0.001;
    return { ...layout, splitRatio: Math.max(0.1, Math.min(0.9, currentRatio + adjustment)) };
  }
  const [left, right] = layout.children!;
  const nextIndex = path[0];
  return {
    ...layout,
    children: [
      nextIndex === 0 ? adjustSplitRatio(left, path.slice(1), delta) : left,
      nextIndex === 1 ? adjustSplitRatio(right, path.slice(1), delta) : right,
    ],
  };
}

export default TerminalLayout;
