import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, X, Loader2, Clock, CheckCircle2, AlertCircle, Ban, ChevronRight, Terminal as TerminalIcon } from 'lucide-react';

interface AgentPrompt {
  id: string; sessionId: string | null; projectId: string | null; content: string;
  title: string | null; status: string; progress: number; category: string;
  tags: string[]; resultSummary: string | null; sessionTopic: string | null;
  createdAt: string; updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending', color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30', dot: 'bg-zinc-400' },
  in_progress: { label: 'In Progress', color: 'text-blue-400 bg-blue-900/20 border-blue-800/30', dot: 'bg-blue-400' },
  completed: { label: 'Completed', color: 'text-green-400 bg-green-900/20 border-green-800/30', dot: 'bg-green-400' },
  failed: { label: 'Failed', color: 'text-red-400 bg-red-900/20 border-red-800/30', dot: 'bg-red-400' },
  cancelled: { label: 'Cancelled', color: 'text-zinc-500 bg-zinc-800/20 border-zinc-700/20', dot: 'bg-zinc-500' },
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock, in_progress: Loader2, completed: CheckCircle2, failed: AlertCircle, cancelled: Ban,
};

interface PromptsWorkspaceProps {
  projectId?: string;
  sessions?: Array<{ id: string; topic: string | null }>;
}

export default function PromptsWorkspace({ projectId, sessions }: PromptsWorkspaceProps) {
  const [prompts, setPrompts] = useState<AgentPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedPrompt, setSelectedPrompt] = useState<AgentPrompt | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newSessionId, setNewSessionId] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await (window as any).deskflowAPI?.agentPrompts?.list({ projectId });
      if (r?.success) setPrompts(r.data || []);
    } catch (e) { console.error('[PromptsWorkspace] load', e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [load]);

  const filtered = filter === 'all' ? prompts : prompts.filter(p => p.status === filter);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setCreating(true);
    try {
      const r = await (window as any).deskflowAPI?.agentPrompts?.create({
        sessionId: newSessionId || undefined,
        projectId,
        content: newContent.trim(),
        title: newTitle.trim() || undefined,
        category: newCategory,
      });
      if (r?.success) {
        setShowNew(false);
        setNewTitle('');
        setNewContent('');
        setNewCategory('general');
        setNewSessionId('');
        load();
      }
    } catch (e) { console.error('[PromptsWorkspace] create', e); }
    finally { setCreating(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    setSavingId(id);
    try {
      await (window as any).deskflowAPI?.agentPrompts?.update({ id, status });
      load();
    } catch (e) { console.error('[PromptsWorkspace] update status', e); }
    finally { setSavingId(null); }
  };

  const handleProgressUpdate = async (id: string, progress: number) => {
    setUpdatingProgress(id);
    try {
      await (window as any).deskflowAPI?.agentPrompts?.update({ id, progress });
      load();
    } catch (e) { console.error('[PromptsWorkspace] update progress', e); }
    finally { setUpdatingProgress(null); }
  };

  const handleDelete = async (id: string) => {
    try {
      await (window as any).deskflowAPI?.agentPrompts?.delete(id);
      if (selectedPrompt?.id === id) setSelectedPrompt(null);
      load();
    } catch (e) { console.error('[PromptsWorkspace] delete', e); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="flex gap-1">
          {['all', 'pending', 'in_progress', 'completed', 'failed', 'cancelled'].map(s => {
            const cfg = s === 'all' ? { label: 'All', color: 'text-zinc-300', dot: '' } : STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${filter === s
                  ? 'bg-green-900/30 text-green-300 border border-green-800/40'
                  : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/30 hover:bg-zinc-700/40'}`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600/80 hover:bg-green-500 text-green-50 text-[10px] font-medium rounded-lg transition-colors active:scale-95"
        >
          <Plus className="w-3 h-3" /> New Prompt
        </button>
      </div>

      {/* Prompt list */}
      <div className="flex-1 overflow-y-auto ws-scroll space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No prompts yet</p>
            <button onClick={() => setShowNew(true)} className="mt-2 text-[10px] text-green-400 hover:text-green-300 underline">Create one</button>
          </div>
        ) : filtered.map(p => {
          const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
          const StatusIcon = STATUS_ICONS[p.status] || Clock;
          return (
            <div key={p.id}
              onClick={() => setSelectedPrompt(p)}
              className="group cursor-pointer rounded-lg border border-zinc-800/50 bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-zinc-700/50 transition-all px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon className={`w-3 h-3 ${sc.dot.replace('bg-', 'text-') || 'text-zinc-400'} ${p.status === 'in_progress' ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-medium text-zinc-200 truncate">{p.title || 'Untitled Prompt'}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{p.content}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${sc.color}`}>{sc.label}</span>
                  {p.sessionTopic && (
                    <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                      <TerminalIcon className="w-2.5 h-2.5" />
                      <span className="max-w-[60px] truncate">{p.sessionTopic}</span>
                    </span>
                  )}
                  <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>
              {p.status === 'in_progress' && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-[9px] text-zinc-500 w-7 text-right">{p.progress}%</span>
                </div>
              )}
              {p.resultSummary && (
                <p className="mt-1.5 text-[9px] text-zinc-500 line-clamp-1 italic">{p.resultSummary}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[8px] text-zinc-600">{new Date(p.createdAt).toLocaleString()}</span>
                {p.category !== 'general' && <span className="text-[8px] text-zinc-600 capitalize">· {p.category}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPrompt(null)}>
          <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl w-[480px] max-h-[80vh] overflow-y-auto ws-scroll shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-zinc-200">{selectedPrompt.title || 'Untitled Prompt'}</span>
              </div>
              <button onClick={() => setSelectedPrompt(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Status controls */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Status</label>
                <div className="flex gap-1.5">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <button key={k} onClick={() => handleStatusUpdate(selectedPrompt.id, k)}
                      disabled={savingId === selectedPrompt.id}
                      className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${selectedPrompt.status === k
                        ? v.color + ' ring-1 ring-inset ring-white/10'
                        : 'text-zinc-500 bg-zinc-800/30 border-zinc-700/30 hover:bg-zinc-700/40'}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress slider */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Progress: {selectedPrompt.progress}%</label>
                <input type="range" min={0} max={100} value={selectedPrompt.progress}
                  onChange={e => handleProgressUpdate(selectedPrompt.id, parseInt(e.target.value))}
                  disabled={updatingProgress === selectedPrompt.id}
                  className="w-full h-1.5 rounded-full appearance-none bg-zinc-800 accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Session info */}
              {selectedPrompt.sessionTopic && (
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 bg-zinc-800/30 rounded-lg px-3 py-2">
                  <TerminalIcon className="w-3 h-3 text-green-400" />
                  <span>Session: {selectedPrompt.sessionTopic}</span>
                </div>
              )}

              {/* Content */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Content</label>
                <div className="bg-zinc-800/40 rounded-lg p-3 text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto ws-scroll">{selectedPrompt.content}</div>
              </div>

              {/* Result summary */}
              {selectedPrompt.resultSummary && (
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Result</label>
                  <div className="bg-green-900/10 border border-green-800/20 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">{selectedPrompt.resultSummary}</div>
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center justify-between text-[9px] text-zinc-600">
                <span>Created: {new Date(selectedPrompt.createdAt).toLocaleString()}</span>
                <span>Updated: {new Date(selectedPrompt.updatedAt).toLocaleString()}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button onClick={() => { setSelectedPrompt(null); handleDelete(selectedPrompt.id); }}
                  className="px-3 py-1.5 bg-red-900/30 hover:bg-red-800/40 text-red-400 text-[10px] font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Prompt Dialog */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl w-[420px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-200">New Prompt</span>
              <button onClick={() => setShowNew(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Optional title"
                  className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/30" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Content *</label>
                <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Enter prompt content..."
                  rows={5} className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 resize-none font-mono" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Category</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-green-500/30">
                    <option value="general">General</option>
                    <option value="debug">Debug</option>
                    <option value="feature">Feature</option>
                    <option value="review">Review</option>
                    <option value="research">Research</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Session</label>
                  <select value={newSessionId} onChange={e => setNewSessionId(e.target.value)}
                    className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-green-500/30">
                    <option value="">None</option>
                    {(sessions || []).map(s => (
                      <option key={s.id} value={s.id}>{s.topic || s.id}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowNew(false)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium rounded-lg transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={!newContent.trim() || creating}
                  className="px-3 py-1.5 bg-green-600/80 hover:bg-green-500 text-green-50 text-[10px] font-medium rounded-lg transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
