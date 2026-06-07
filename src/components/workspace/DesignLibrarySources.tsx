import { useState, useRef, useEffect } from 'react';
import { Sparkles, Wand2, BookOpen, MoreVertical, Play, Square } from 'lucide-react';

interface DesignLibrary {
  id: '21st-dev' | 'aceternity' | 'refero';
  label: string;
  description: string;
  enabled: boolean;
  icon: any;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  itemCount: number;
  accentColor: string;
}

interface DesignLibrarySourcesProps {
  libraries: DesignLibrary[];
  onBrowse: (id: '21st-dev' | 'aceternity' | 'refero') => void;
  onToggle: (id: '21st-dev' | 'aceternity' | 'refero', enabled: boolean) => void;
  onConfigure?: (id: '21st-dev' | 'aceternity' | 'refero') => void;
  onStartServer?: (id: '21st-dev' | 'aceternity' | 'refero') => void;
  onStopServer?: (id: '21st-dev' | 'aceternity' | 'refero') => void;
}

export default function DesignLibrarySources({ libraries, onBrowse, onToggle, onConfigure, onStartServer, onStopServer }: DesignLibrarySourcesProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getStatusText = (status: DesignLibrary['status'], itemCount: number) => {
    switch (status) {
      case 'connected':
        return `Connected · ${itemCount} items`;
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection error';
      default:
        return 'Not connected';
    }
  };

  const getStatusColor = (status: DesignLibrary['status']) => {
    switch (status) {
      case 'connected': return '#22d3ee';
      case 'connecting': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-zinc-200">Design Library Sources</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {libraries.map((library) => {
          const Icon = library.icon;
          const isConnected = library.status === 'connected';
          const isConnecting = library.status === 'connecting';
          const canBrowse = isConnected && library.enabled;

          return (
            <div
              key={library.id}
              className="rounded-xl p-4 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 flex flex-col gap-2 relative"
              style={{
                borderTop: `3px solid ${library.accentColor}/30`,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: library.accentColor }} />
                  <span className="text-sm font-semibold text-zinc-100">{library.label}</span>
                </div>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === library.id ? null : library.id)}
                    className="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-colors duration-150"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {menuOpen === library.id && (
                    <div className="absolute right-0 top-8 z-20 w-40 py-1 rounded-lg bg-zinc-800 border border-zinc-700/60 shadow-xl">
                      <button
                        onClick={() => { setMenuOpen(null); onConfigure?.(library.id); }}
                        className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:bg-zinc-700/60 transition-colors"
                      >
                        Configure
                      </button>
                      <button
                        onClick={() => { setMenuOpen(null); onToggle(library.id, !library.enabled); }}
                        className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:bg-zinc-700/60 transition-colors"
                      >
                        {library.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: getStatusColor(library.status) }}
                />
                <span
                  className={
                    library.status === 'connected' ? 'text-zinc-400' :
                    library.status === 'error' ? 'text-red-400' :
                    'text-zinc-600'
                  }
                >
                  {getStatusText(library.status, library.itemCount)}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-500 line-clamp-2">{library.description}</p>

              {/* Actions */}
              <div className="flex gap-2 mt-1">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => onBrowse(library.id)}
                      disabled={!canBrowse}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-colors duration-150"
                    >
                      Browse
                    </button>
                    <button
                      onClick={() => onStopServer?.(library.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-red-500/10 text-red-400 hover:bg-red-500/20
                        transition-colors duration-150 inline-flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" />
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onStartServer?.(library.id)}
                    disabled={isConnecting}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60
                      disabled:opacity-50 disabled:cursor-wait
                      transition-colors duration-150 inline-flex items-center gap-1"
                  >
                    {isConnecting ? (
                      <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {!libraries.some(lib => lib.enabled) && (
        <div className="text-center py-4">
          <p className="text-xs text-zinc-600">
            Connect design libraries to browse 2000+ components and design systems
          </p>
        </div>
      )}
    </div>
  );
}
