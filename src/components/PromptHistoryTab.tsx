import { useEffect, useState, useMemo, useRef } from 'react';
import { MessageSquare, Search, Bug, Sparkles, Terminal, Clock, ChevronDown, ChevronRight, X, Loader2, CheckCircle2, Circle, ArrowRight, Trash2, Eye } from 'lucide-react';

interface PromptEntry {
  id: number;
  session_id: string;
  prompt: string;
  sent_at: string;
  status?: string;
  session_id_ref: string | null;
  session_topic: string | null;
  agent: string | null;
  category: string | null;
  product_area: string | null;
  session_status: string | null;
  active_problem_id: string | null;
  active_request_id: string | null;
  project_id: string | null;
  binding_agent: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', icon: Circle, label: 'Pending' },
  in_progress: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: Loader2, label: 'Processing' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2, label: 'Completed' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: X, label: 'Failed' },
};

const AGENT_COLORS: Record<string, string> = {
  opencode: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  claude: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  aider: 'bg-green-500/20 text-green-400 border-green-500/30',
  codex: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\n.*$/s, '') + '…';
}

const LIMIT_OPTIONS = [3, 5, 10, 20, 50, 100];

const PromptHistoryTab: React.FC<{
  projectId?: string;
  projectPath?: string;
  onNavigateToSession?: (sessionId: string) => void;
}> = ({ projectId, projectPath, onNavigateToSession }) => {
  const [entries, setEntries] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, string>>({});
  const liveStatusRef = useRef<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');
  const [visibleLimit, setVisibleLimit] = useState(5);
  const [showOlder, setShowOlder] = useState(false);
  const [deleting, setDeleting] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const api = (window as any).deskflowAPI;
        const prefs = await api?.getPreferences?.();
        if (prefs?.promptHistoryLimit != null) {
          setVisibleLimit(prefs.promptHistoryLimit);
        }
      } catch {}
    };
    loadPrefs();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const api = (window as any).deskflowAPI;
        const result = await api?.getPromptHistory?.({ projectId, limit: 200 });
        if (result?.success) {
          setEntries(result.data);
        }
        const statusResult = await api?.getPromptStatus?.();
        if (statusResult?.success) {
          const statusMap: Record<string, string> = {};
          for (const row of statusResult.data) {
            statusMap[`${row.session_id}:${row.id}`] = row.status || 'completed';
          }
          setLiveStatuses(statusMap);
          liveStatusRef.current = statusMap;
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [projectId]);

  useEffect(() => {
    const api = (window as any).deskflowAPI;
    if (!api?.onAiTaskUpdated) return;

    const cleanup = api.onAiTaskUpdated((data: { terminalId: string; status: string; messageId?: string }) => {
      if (data.messageId) {
        const key = `${data.terminalId}:${data.messageId}`;
        liveStatusRef.current[key] = data.status;
        setLiveStatuses({ ...liveStatusRef.current });
      } else {
        setEntries(prev => prev.map(e =>
          e.session_id === data.terminalId ? { ...e, status: data.status } : e
        ));
      }
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  useEffect(() => {
    if (!projectPath) return;
    const api = (window as any).deskflowAPI;
    if (!api?.aiTaskWatch) return;
    api.aiTaskWatch(projectPath);
    return () => { api.aiTaskStopWatch?.(projectPath); };
  }, [projectPath]);

  useEffect(() => {
    const api = (window as any).deskflowAPI;
    if (!api?.onAiTaskFileChanged) return;

    const cleanup = api.onAiTaskFileChanged((data: { tasks: any[] }) => {
      if (!data.tasks?.length) return;
      const taskMap = new Map(data.tasks.map(t => [t.terminal_id + ':' + t.id, t]));
      setEntries(prev => prev.map(e => {
        for (const [key, task] of taskMap) {
          if (key.startsWith(e.session_id)) {
            return { ...e, status: task.status };
          }
        }
        return e;
      }));
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (entry: PromptEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(prev => new Set(prev).add(entry.id));
    try {
      await (window as any).deskflowAPI?.deleteTerminalMessage?.(entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch {}
    setDeleting(prev => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
  };

  const handleLimitChange = async (limit: number) => {
    setVisibleLimit(limit);
    setShowOlder(false);
    try {
      await (window as any).deskflowAPI?.setPreference?.('promptHistoryLimit', limit);
    } catch {}
  };

  const agents = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => { if (e.agent) set.add(e.agent); });
    return [...set].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.prompt?.toLowerCase().includes(q)) ||
        (e.session_topic?.toLowerCase().includes(q)) ||
        (e.session_id?.toLowerCase().includes(q)) ||
        (e.active_problem_id?.toLowerCase().includes(q)) ||
        (e.active_request_id?.toLowerCase().includes(q))
      );
    }
    if (agentFilter) {
      result = result.filter(e => e.agent === agentFilter);
    }
    return result;
  }, [entries, search, agentFilter]);

  const getStatus = (entry: PromptEntry): string => {
    const key = `${entry.session_id}:${entry.id}`;
    return liveStatuses[key] || entry.status || 'completed';
  };

  // Split into visible and older
  const visibleCount = visibleLimit;
  const visibleEntries = useMemo(() => {
    if (showOlder) return filtered;
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount, showOlder]);
  const olderCount = filtered.length - visibleCount;

  // Group entries by session for grouped view
  const groupedEntries = useMemo(() => {
    if (viewMode !== 'grouped') return null;
    const groups = new Map<string, { topic: string; entries: PromptEntry[] }>();
    for (const entry of visibleEntries) {
      const key = entry.session_id_ref || entry.session_id || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, { topic: entry.session_topic || 'Unknown Session', entries: [] });
      }
      groups.get(key)!.entries.push(entry);
    }
    return Array.from(groups.entries());
  }, [visibleEntries, viewMode]);

  const renderEntry = (entry: PromptEntry) => {
    const isExpanded = expanded.has(entry.id);
    const preview = isExpanded ? entry.prompt : truncate(entry.prompt, 120);
    const agentColor = AGENT_COLORS[entry.agent || ''] || 'bg-zinc-700 text-zinc-300';
    const status = getStatus(entry);
    const st = STATUS_STYLES[status] || STATUS_STYLES.completed;
    const StatusIcon = st.icon;
    const isDeleting = deleting.has(entry.id);

    return (
      <div
        key={entry.id}
        className={`bg-zinc-800/40 rounded-lg border overflow-hidden transition-all ${
          status === 'in_progress' ? 'border-cyan-500/40 border-2' : 'border-zinc-700/50 hover:border-zinc-600/60'
        } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
      >
        <div className="flex items-start gap-2 p-2.5 cursor-pointer group" onClick={() => toggleExpand(entry.id)}>
          <div className="mt-0.5 flex-shrink-0">
            {isExpanded
              ? <ChevronDown className="w-3 h-3 text-zinc-500" />
              : <ChevronRight className="w-3 h-3 text-zinc-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${st.bg} ${st.text}`}>
                <StatusIcon className={`w-2.5 h-2.5 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
                {st.label}
              </span>
            </div>
            <div className="text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap line-clamp-2">
              {preview || <span className="text-zinc-500 italic">(empty prompt)</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {entry.session_topic && (
                <span
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer truncate max-w-[180px] underline decoration-dotted underline-offset-2"
                  onClick={(e) => { e.stopPropagation(); onNavigateToSession?.(entry.session_id_ref || entry.session_id); }}
                >
                  <Terminal className="w-2.5 h-2.5 inline mr-0.5" />
                  {entry.session_topic}
                </span>
              )}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${agentColor}`}>
                {entry.agent || 'unknown'}
              </span>
              <span className="text-[9px] text-zinc-500 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatTime(entry.sent_at)}
              </span>
              <button
                onClick={(e) => handleDelete(entry, e)}
                className="ml-auto p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete this prompt"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-zinc-700/30 px-2.5 py-2 space-y-2">
            <div className="bg-zinc-900/50 rounded p-2">
              <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {entry.prompt}
              </pre>
            </div>
            <div className={`flex items-center gap-2 px-2 py-1 rounded ${st.bg}`}>
              <StatusIcon className={`w-3 h-3 ${st.text} ${status === 'in_progress' ? 'animate-spin' : ''}`} />
              <span className={`text-[10px] font-medium ${st.text}`}>
                {status === 'in_progress' ? 'AI is processing this prompt...' : st.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
              {entry.session_topic && (
                <div>
                  <span className="text-zinc-500">Session:</span>{' '}
                  <span
                    className="text-cyan-400 hover:text-cyan-300 cursor-pointer underline decoration-dotted underline-offset-2"
                    onClick={(e) => { e.stopPropagation(); onNavigateToSession?.(entry.session_id_ref || entry.session_id); }}
                  >
                    {entry.session_topic}
                  </span>
                </div>
              )}
              <div>
                <span className="text-zinc-500">Terminal:</span>{' '}
                <span className="text-zinc-400 font-mono text-[9px]">{entry.session_id}</span>
              </div>
              {entry.agent && (
                <div>
                  <span className="text-zinc-500">Agent:</span>{' '}
                  <span className="text-zinc-300">{entry.agent}</span>
                </div>
              )}
              {entry.category && (
                <div>
                  <span className="text-zinc-500">Category:</span>{' '}
                  <span className="text-zinc-300">{entry.category}</span>
                </div>
              )}
              {entry.product_area && (
                <div>
                  <span className="text-zinc-500">Area:</span>{' '}
                  <span className="text-zinc-300">{entry.product_area}</span>
                </div>
              )}
              <div>
                <span className="text-zinc-500">Sent:</span>{' '}
                <span className="text-zinc-300">{new Date(entry.sent_at).toLocaleString()}</span>
              </div>
            </div>
            {(entry.active_problem_id || entry.active_request_id) && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {entry.active_problem_id && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                    <Bug className="w-2.5 h-2.5" />
                    Problem #{entry.active_problem_id}
                  </span>
                )}
                {entry.active_request_id && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Request #{entry.active_request_id}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-xs text-yellow-400 py-8 text-center animate-pulse">Loading prompt history…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Search + Filter + Limit */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded pl-7 pr-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-500"
            placeholder="Search prompts, sessions, problems…"
          />
        </div>
        <button
          onClick={() => setViewMode(v => v === 'flat' ? 'grouped' : 'flat')}
          className={`text-[9px] px-1.5 py-1 rounded border transition-colors ${
            viewMode === 'grouped' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
          }`}
          title="Toggle session grouping"
        >
          {viewMode === 'grouped' ? 'Grouped' : 'Flat'}
        </button>
        {agents.length > 1 && (
          <select
            value={agentFilter || ''}
            onChange={e => setAgentFilter(e.target.value || null)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-[10px] text-zinc-300"
          >
            <option value="">All agents</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {/* Visible count selector */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-zinc-500">
          {visibleEntries.length} prompt{visibleEntries.length !== 1 ? 's' : ''}
          {filtered.length !== entries.length && ` (filtered)`}
          {viewMode === 'grouped' && groupedEntries && ` in ${groupedEntries.length} session${groupedEntries.length !== 1 ? 's' : ''}`}
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-2.5 h-2.5 text-zinc-600" />
          <span className="text-[9px] text-zinc-600 mr-0.5">Show:</span>
          <select
            value={visibleLimit}
            onChange={e => handleLimitChange(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[9px] text-zinc-300"
          >
            {LIMIT_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped view */}
      {viewMode === 'grouped' && groupedEntries ? (
        <div className="space-y-4">
          {groupedEntries.map(([sessionId, group]) => (
            <div key={sessionId} className="bg-zinc-800/20 rounded-lg border border-zinc-700/30 overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800/40 border-b border-zinc-700/30 cursor-pointer hover:bg-zinc-800/60 transition-colors group"
                onClick={() => onNavigateToSession?.(sessionId)}
              >
                <Terminal className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                <span className="text-[11px] text-zinc-300 font-medium truncate flex-1">
                  {group.topic}
                </span>
                <span className="text-[9px] text-zinc-600">{group.entries.length} prompt{group.entries.length !== 1 ? 's' : ''}</span>
                {onNavigateToSession && (
                  <ArrowRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                )}
              </div>
              <div className="divide-y divide-zinc-700/20">
                {group.entries.map(entry => (
                  <div
                    key={entry.id}
                    className={`hover:bg-zinc-800/30 transition-colors ${
                      getStatus(entry) === 'in_progress' ? 'bg-cyan-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 p-2.5 cursor-pointer" onClick={() => toggleExpand(entry.id)}>
                      <div className="mt-0.5 flex-shrink-0">
                        {expanded.has(entry.id)
                          ? <ChevronDown className="w-3 h-3 text-zinc-500" />
                          : <ChevronRight className="w-3 h-3 text-zinc-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${STATUS_STYLES[getStatus(entry)]?.bg || STATUS_STYLES.completed.bg} ${STATUS_STYLES[getStatus(entry)]?.text || STATUS_STYLES.completed.text}`}>
                            {(() => {
                              const s = getStatus(entry);
                              const Icon = STATUS_STYLES[s]?.icon || CheckCircle2;
                              return <Icon className={`w-2.5 h-2.5 ${s === 'in_progress' ? 'animate-spin' : ''}`} />;
                            })()}
                            {STATUS_STYLES[getStatus(entry)]?.label || 'Completed'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${AGENT_COLORS[entry.agent || ''] || 'bg-zinc-700 text-zinc-300'}`}>
                            {entry.agent || 'unknown'}
                          </span>
                          <span className="text-[9px] text-zinc-500 flex items-center gap-0.5 ml-auto">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(entry.sent_at)}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap line-clamp-2">
                          {truncate(entry.prompt, 120) || <span className="text-zinc-500 italic">(empty prompt)</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(entry, e)}
                        className="p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all self-center flex-shrink-0"
                        title="Delete this prompt"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {expanded.has(entry.id) && (
                      <div className="border-t border-zinc-700/20 px-2.5 py-2 space-y-2 ml-5">
                        <div className="bg-zinc-900/50 rounded p-2">
                          <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">{entry.prompt}</pre>
                        </div>
                        <div className={`flex items-center gap-2 px-2 py-1 rounded ${STATUS_STYLES[getStatus(entry)]?.bg || 'bg-green-500/20'}`}>
                          {(/in_progress/.test(getStatus(entry)) ? <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-green-400" />)}
                          <span className="text-[10px] font-medium text-zinc-300">
                            {getStatus(entry) === 'in_progress' ? 'AI is processing this prompt...' : (STATUS_STYLES[getStatus(entry)]?.label || 'Completed')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                          {entry.session_topic && (
                            <div className="col-span-2">
                              <span className="text-zinc-500">Session:</span>{' '}
                              <span className="text-cyan-400 hover:text-cyan-300 cursor-pointer underline decoration-dotted underline-offset-2"
                                onClick={(e) => { e.stopPropagation(); onNavigateToSession?.(entry.session_id_ref || entry.session_id); }}>
                                {entry.session_topic} <ArrowRight className="w-2.5 h-2.5 inline" />
                              </span>
                            </div>
                          )}
                          <div><span className="text-zinc-500">Terminal:</span> <span className="text-zinc-400 font-mono text-[9px]">{entry.session_id}</span></div>
                          {entry.agent && <div><span className="text-zinc-500">Agent:</span> <span className="text-zinc-300">{entry.agent}</span></div>}
                          {entry.category && <div><span className="text-zinc-500">Category:</span> <span className="text-zinc-300">{entry.category}</span></div>}
                          {entry.product_area && <div><span className="text-zinc-500">Area:</span> <span className="text-zinc-300">{entry.product_area}</span></div>}
                          <div><span className="text-zinc-500">Sent:</span> <span className="text-zinc-300">{new Date(entry.sent_at).toLocaleString()}</span></div>
                        </div>
                        {(entry.active_problem_id || entry.active_request_id) && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {entry.active_problem_id && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"><Bug className="w-2.5 h-2.5" /> Problem #{entry.active_problem_id}</span>}
                            {entry.active_request_id && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Request #{entry.active_request_id}</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat view */
        <div className="space-y-1.5">
          {visibleEntries.map(entry => renderEntry(entry))}
        </div>
      )}

      {/* Show older toggle */}
      {!showOlder && olderCount > 0 && (
        <button
          onClick={() => setShowOlder(true)}
          className="w-full py-2 text-[10px] text-zinc-500 hover:text-zinc-300 bg-zinc-800/20 hover:bg-zinc-800/40 rounded-lg border border-zinc-700/30 transition-colors"
        >
          Show {olderCount} older prompt{olderCount !== 1 ? 's' : ''}
        </button>
      )}

      {filtered.length === 0 && (
        <div className="py-8 text-center">
          <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">
            {search ? 'No matching prompts' : 'No prompts sent yet'}
          </p>
          {!search && (
            <p className="text-[10px] text-zinc-600 mt-1">
              Prompts will appear here after you send instructions to the AI.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptHistoryTab;