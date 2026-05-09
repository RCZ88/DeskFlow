import { useEffect, useRef, useState, useCallback } from 'react';
import { useTerminalLayout } from '../hooks/useTerminalLayout';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';



declare global {
  interface Window {
    deskflowAPI?: {
      writeTerminal: (terminalId: string, data: string) => Promise<{ success: boolean }>;
      resizeTerminal: (terminalId: string, cols: number, rows: number) => Promise<{ success: boolean }>;
      spawnTerminal: (terminalId: string, cwd: string) => Promise<{ success: boolean; error?: string }>;
      killTerminal: (terminalId: string) => Promise<{ success: boolean }>;
      onTerminalData?: (callback: (data: { terminalId: string; data: string }) => void) => (() => void);
    };
  }
}

interface TerminalPaneProps {
  terminalId: string;
  onTerminalReady?: (terminalId: string, terminal: Terminal) => void;
  onFocus?: (terminalId: string) => void;
}

export function TerminalPane({ terminalId, onTerminalReady, onFocus }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const hasReceivedData = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('[TerminalPane] Mounting for terminalId:', terminalId);

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#0d0d0d',
        foreground: '#e0e0e0',
        cursor: '#00ff00',
        selection: 'rgba(0, 255, 0, 0.3)',
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
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.onData((data) => {
      if (window.deskflowAPI) {
        window.deskflowAPI.terminalAPI?.write(terminalId, data);
      }
    });

    if (terminal.onFocus) {
      terminal.onFocus(() => {
        onFocus?.(terminalId);
      });
    }

    // Write placeholder text BEFORE calling onTerminalReady so it appears immediately
    terminal.write('Terminal initialized. Waiting for shell...\r\n');
    
    onTerminalReady?.(terminalId, terminal);
    
    // Diagnostic: if no data received after 5 seconds, show diagnostic message
    const diagTimeout = setTimeout(() => {
      if (!hasReceivedData.current && terminalRef.current) {
        terminalRef.current.write('\r\n\x1b[33m[Diagnostic] No shell data received after 5s. Shell may have failed to spawn.\x1b[0m\r\n');
      }
    }, 5000);
    
    // Check container dimensions
    setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        console.log('[TerminalPane] Container dimensions:', rect.width, 'x', rect.height);
      }
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (window.deskflowAPI) {
        window.deskflowAPI.terminalAPI?.resize(terminalId, terminal.cols, terminal.rows);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(diagTimeout);
      resizeObserver.disconnect();
      terminal.dispose();
      window.deskflowAPI.terminalAPI?.destroy(terminalId);
    };
  }, [terminalId]);

  // Listen for data from the PTY
  useEffect(() => {
    if (!window.deskflowAPI || !window.deskflowAPI.onTerminalData) return;

    const handleData = (data: { terminalId: string; data: string }) => {
      if (data.terminalId === terminalId && terminalRef.current) {
        // Clear placeholder text on first real data from shell
        if (!hasReceivedData.current) {
          hasReceivedData.current = true;
          terminalRef.current.clear();
        }
        terminalRef.current.write(data.data);
      }
    };

    // Register listener and get cleanup function
    const cleanup = window.deskflowAPI.onTerminalData((data) => {
      console.log('[TerminalPane] Data received:', data.terminalId, 'data length:', data.data.length, 'expected:', terminalId);
      if (data.terminalId === terminalId) {
        console.log('[TerminalPane] Writing data to xterm for', terminalId);
      }
      handleData(data);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [terminalId]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-[#0d0d0d] overflow-hidden relative"
      style={{ minHeight: '300px', minWidth: '300px' }}
      onClick={() => onFocus && onFocus(terminalId)}
    />
  );
}

interface SplitDirection {
  type: 'horizontal' | 'vertical';
  direction: 'left' | 'right' | 'top' | 'bottom';
}

export interface PaneNode {
  id: string;
  type: 'leaf' | 'split';
  terminalId?: string;
  splitType?: SplitDirection['type'];
  direction?: SplitDirection['direction'];
  children?: [PaneNode, PaneNode];
  size: number;
}

interface TerminalLayoutProps {
  initialLayout?: PaneNode;
  onPaneClick?: (paneId: string) => void;
  onLayoutChange?: (layout: PaneNode) => void;
  onActiveTerminalChange?: (terminalId: string) => void;
  spawnTerminal: (terminalId: string, cwd?: string) => Promise<boolean>;
  defaultCwd?: string;
}

function createPaneNode(id: string): PaneNode {
  return { id, type: 'leaf', terminalId: id, size: 50 };
}

export function TerminalLayout({ initialLayout, onPaneClick, onLayoutChange, onActiveTerminalChange, spawnTerminal, defaultCwd }: TerminalLayoutProps) {
  const { layout, setLayout, isLoading } = useTerminalLayout(initialLayout);
  const [activeTerminal, setActiveTerminal] = useState<string>('root');
  // Use a ref for spawn tracking so it resets when this layout instance unmounts
  const spawnedTerminalsRef = useRef(new Set<string>());

  // CRITICAL: Clear spawn tracking when project/CWD changes
  // This ensures terminals respawn when switching projects
  useEffect(() => {
    console.log('[TerminalLayout] CWD changed to:', defaultCwd, '- clearing spawn tracking');
    spawnedTerminalsRef.current.clear();
  }, [defaultCwd]);

  useEffect(() => {
    if (layout && onLayoutChange) {
      onLayoutChange(layout);
    }
  }, [layout, onLayoutChange]);

  // Initialize active terminal to the first leaf in the layout
  useEffect(() => {
    if (layout) {
      const findFirstLeaf = (node: PaneNode): string | null => {
        if (node.type === 'leaf') return node.terminalId || node.id;
        if (node.children) {
          for (const child of node.children) {
            const found = findFirstLeaf(child);
            if (found) return found;
          }
        }
        return null;
      };
      const firstTerminal = findFirstLeaf(layout);
      if (firstTerminal && firstTerminal !== activeTerminal) {
        console.log('[TerminalLayout] Setting initial active terminal:', firstTerminal);
        setActiveTerminal(firstTerminal);
      }
    }
  }, [layout]);

  useEffect(() => {
    onActiveTerminalChange?.(activeTerminal);
  }, [activeTerminal, onActiveTerminalChange]);

  const splitPane = useCallback((parentId: string, direction: SplitDirection) => {
    if (!layout) return;
    const newTerminalId = `term-${Date.now()}`;
    const newPane: PaneNode = {
      id: newTerminalId,
      type: 'leaf',
      terminalId: newTerminalId,
      size: 50,
    };

    const updateLayout = (node: PaneNode): PaneNode => {
      if (node.id === parentId && node.type === 'leaf') {
        return {
          id: node.id + '-split',
          type: 'split',
          splitType: direction.type === 'horizontal' ? 'horizontal' : 'vertical',
          direction: direction.direction,
          size: 100,
          children: [node, newPane]
        };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateLayout) as [PaneNode, PaneNode] };
      }
      return node;
    };

    setLayout(updateLayout(layout));
    setActiveTerminal(newTerminalId);
    spawnTerminal(newTerminalId, defaultCwd);
  }, [layout, setLayout, spawnTerminal, defaultCwd]);

  const closePane = useCallback((paneId: string) => {
    if (!layout) return;
    // Find the terminalId for this pane so we can kill the process
    const findTerminalId = (node: PaneNode): string | null => {
      if (node.id === paneId) return node.terminalId || node.id;
      if (node.children) {
        for (const child of node.children) {
          const found = findTerminalId(child);
          if (found) return found;
        }
      }
      return null;
    };
    const termId = findTerminalId(layout);
    if (termId) {
      spawnedTerminalsRef.current.delete(termId);
      // Actually kill the terminal process via IPC
      if (window.deskflowAPI?.terminalAPI?.destroy) {
        window.deskflowAPI.terminalAPI.destroy(termId);
      }
    }
    const removeAndReparent = (node: PaneNode): PaneNode | null => {
      if (node.id === paneId) return null;
      if (node.children) {
        const newChildren = node.children.map(c => removeAndReparent(c)).filter(Boolean) as [PaneNode, PaneNode];
        if (newChildren.length === 1) return newChildren[0];
        return { ...node, children: newChildren };
      }
      return node;
    };
    const closed = removeAndReparent(layout);
    setLayout(closed || createPaneNode('root'));
  }, [layout, setLayout]);

  const handleTerminalReady = useCallback(async (terminalId: string, terminal: Terminal) => {
    console.log('[TerminalLayout] Terminal ready:', terminalId);
    // Only spawn if not already spawned in THIS layout instance
    if (spawnedTerminalsRef.current.has(terminalId)) {
      console.log('[TerminalLayout] Terminal already spawned in this layout:', terminalId);
      return;
    }
    spawnedTerminalsRef.current.add(terminalId);
    console.log('[TerminalLayout] Spawning terminal:', terminalId, 'cwd:', defaultCwd);
    try {
      const result = await spawnTerminal(terminalId, defaultCwd);
      console.log('[TerminalLayout] Spawn result:', result);
      if (!result) {
        spawnedTerminalsRef.current.delete(terminalId); // Allow retry
        terminal.write('\r\n\x1b[31m[ERROR] Failed to spawn terminal shell.\x1b[0m\r\n');
      }
    } catch (e: any) {
      spawnedTerminalsRef.current.delete(terminalId); // Allow retry
      console.error('[TerminalLayout] Spawn error:', e);
      terminal.write(`\r\n\x1b[31m[ERROR] Terminal spawn failed: ${e.message}\x1b[0m\r\n`);
    }
  }, [spawnTerminal, defaultCwd]);

  useEffect(() => {
    const handleClosePaneEvent = (e: CustomEvent) => {
      closePane(e.detail.paneId);
    };
    window.addEventListener('close-pane', handleClosePaneEvent as EventListener);
    return () => {
      window.removeEventListener('close-pane', handleClosePaneEvent as EventListener);
    };
  }, [closePane]);

  const renderPane = (node: PaneNode, direction?: SplitDirection): JSX.Element => {
    if (node.type === 'leaf') {
      return (
        <div 
          key={node.id}
          className={`relative flex flex-1 ${node.terminalId === activeTerminal ? 'ring-2 ring-green-500' : ''}`}
          style={{ flexBasis: `${node.size}%`, minWidth: '100px', minHeight: '200px' }}
        >
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 relative">
              <TerminalPane
                terminalId={node.terminalId || node.id}
                onTerminalReady={handleTerminalReady}
                onFocus={setActiveTerminal}
              />
            </div>
            <SplitControls paneId={node.id} onSplit={(dir) => splitPane(node.id, dir)} />
          </div>
        </div>
      );
    }

    if (node.type === 'split' && node.children) {
      const direction: SplitDirection = {
        type: node.splitType || 'horizontal',
        direction: node.direction || 'right',
      };
      return (
        <div 
          key={node.id}
          className={`flex flex-1 ${node.splitType === 'horizontal' ? 'flex-row' : 'flex-col'}`}
          style={{ width: '100%', height: '100%' }}
        >
          {node.children.map((child, idx) => (
            <div key={idx} className="flex-1" style={{ minWidth: '100px', minHeight: '100px' }}>
              {renderPane(child, { type: node.splitType || 'horizontal', direction: idx === 0 ? 'left' : 'right' })}
            </div>
          ))}
          <SplitHandle splitType={node.splitType} />
        </div>
      );
    }

    return <div key={node.id} />;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-zinc-500">Loading layout...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0d0d0d] flex flex-col" style={{ height: '100%', minHeight: '400px' }}>
      {layout && renderPane(layout)}
    </div>
  );
}

interface SplitControlsProps {
  paneId: string;
  onSplit: (direction: SplitDirection) => void;
}

function SplitControls({ paneId, onSplit }: SplitControlsProps) {
  const [showControls, setShowControls] = useState(false);

  const handleClose = useCallback(() => {
    window.dispatchEvent(new CustomEvent('close-pane', { detail: { paneId } }));
  }, [paneId]);

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-10"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {showControls && (
        <>
          <button
            className="absolute top-1 left-1 w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded pointer-events-auto opacity-50 hover:opacity-100"
            onClick={() => onSplit({ type: 'vertical', direction: 'left' })}
            title="Split Left"
          >
            ⊣
          </button>
          <button
            className="absolute top-1 right-8 w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded pointer-events-auto opacity-50 hover:opacity-100"
            onClick={() => onSplit({ type: 'vertical', direction: 'right' })}
            title="Split Right"
          >
            ⊢
          </button>
          <button
            className="absolute top-1 right-1 w-6 h-6 bg-zinc-800 hover:bg-red-900 text-red-400 rounded pointer-events-auto opacity-50 hover:opacity-100"
            onClick={handleClose}
            title="Close Pane"
          >
            ✕
          </button>
          <button
            className="absolute top-8 left-1 w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded pointer-events-auto opacity-50 hover:opacity-100"
            onClick={() => onSplit({ type: 'horizontal', direction: 'top' })}
            title="Split Top"
          >
            ⊤
          </button>
          <button
            className="absolute bottom-1 right-1 w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded pointer-events-auto opacity-50 hover:opacity-100"
            onClick={() => onSplit({ type: 'horizontal', direction: 'bottom' })}
            title="Split Bottom"
          >
            ⊥
          </button>
        </>
      )}
    </div>
  );
}

interface SplitHandleProps {
  splitType?: 'horizontal' | 'vertical';
}

function SplitHandle({ splitType }: SplitHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className={`flex-shrink-0 ${
        splitType === 'horizontal' ? 'w-1 cursor-col-resize hover:bg-green-600' : 'h-1 cursor-row-resize hover:bg-green-600'
      } ${isDragging ? 'bg-green-500' : 'bg-zinc-800'}`}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
    />
  );
}

export default TerminalLayout;