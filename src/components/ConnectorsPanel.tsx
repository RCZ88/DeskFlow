import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Calendar, Plus, Check, AlertCircle, RefreshCw, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { ConnectorConfig } from '../types/connectors';

interface ConnectorsPanelProps {
  onSetup?: () => void;
}

export function ConnectorsPanel({ onSetup }: ConnectorsPanelProps) {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recentItems, setRecentItems] = useState<Record<string, any[]>>({});

  const loadConnectors = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.connectors.list();
      if (r.success) setConnectors(r.connectors);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await window.deskflowAPI!.connectors.sync(id);
      await loadConnectors();
      if (expandedId === id) await loadItems(id);
    } catch {}
    setSyncingId(null);
  };

  const handleRemove = async (id: string) => {
    try {
      await window.deskflowAPI!.connectors.remove(id);
      setConnectors(prev => prev.filter(c => c.id !== id));
      setExpandedId(null);
    } catch {}
  };

  const loadItems = async (id: string) => {
    try {
      const r = await window.deskflowAPI!.connectors.items(id, { limit: 5 });
      if (r.success) setRecentItems(prev => ({ ...prev, [id]: r.items }));
    } catch {}
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    await loadItems(id);
  };

  const connectorIcon = (type: string) => type === 'email' ? Mail : Calendar;
  const connectorColor = (type: string) => type === 'email' ? 'pink' : 'cyan';
  const colorClasses: Record<string, string> = {
    pink: 'bg-pink-500/10 text-pink-400 ring-pink-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
  };
  const dotColor: Record<string, string> = {
    connected: 'bg-emerald-400',
    error: 'bg-red-400',
    disconnected: 'bg-zinc-500',
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-zinc-900/40 ring-1 ring-zinc-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-1 rounded-full bg-zinc-700" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Connected Services</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Your data sources for AI context</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-lg bg-zinc-800/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900/40 ring-1 ring-zinc-800 p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-8 w-1 rounded-full bg-cyan-500" />
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Connected Services</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Your data sources for AI context</p>
        </div>
        <button
          onClick={onSetup}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Connect
        </button>
      </div>

      {connectors.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-zinc-800/50 ring-1 ring-zinc-700/50">
            <Mail className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400">No services connected yet</p>
          <p className="text-xs text-zinc-600 mt-1">Connect email or calendar to give AI context about your day</p>
          <button
            onClick={onSetup}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20 hover:bg-pink-500/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Connect your first service
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {connectors.map((conn) => {
              const Icon = connectorIcon(conn.type);
              const color = connectorColor(conn.type);
              const isExpanded = expandedId === conn.id;
              const items = recentItems[conn.id] || [];
              return (
                <motion.div
                  key={conn.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg bg-zinc-800/40 ring-1 ring-zinc-700/30 overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-800/60 transition-colors"
                    onClick={() => toggleExpand(conn.id)}
                  >
                    <div className={`grid h-8 w-8 place-items-center rounded-lg ring-1 ${colorClasses[color] || colorClasses.pink}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100 truncate">{conn.displayName}</span>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotColor[conn.status] || dotColor.disconnected}`} />
                        {conn.lastSync && (
                          <span className="text-[10px] text-zinc-600">
                            {new Date(conn.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 capitalize">{conn.provider} · {conn.status}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSync(conn.id); }}
                        disabled={syncingId === conn.id}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors disabled:opacity-40"
                        title="Sync"
                      >
                        {syncingId === conn.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(conn.id); }}
                        className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className={`h-4 w-4 text-zinc-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && items.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-zinc-700/30"
                      >
                        <div className="p-3 space-y-1.5">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-start gap-2 text-xs">
                              <span className="text-zinc-600 shrink-0 mt-0.5">
                                {item.itemType === 'email' ? '📧' : '📅'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-zinc-300 block truncate">{item.subject}</span>
                                <span className="text-zinc-600 text-[10px]">
                                  {new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
