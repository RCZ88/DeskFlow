import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Circle, Play, UserCheck, AlertCircle, MessageSquare, X } from 'lucide-react';

interface ChecklistItem {
  id: string;
  parentType: 'problem' | 'request';
  parentId: string;
  step: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  requiresHuman: boolean;
  humanApproved: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Problem {
  id: string;
  title: string;
  status: string;
}

interface Request {
  id: string;
  title: string;
  status: string;
}

interface ChecklistPanelProps {
  projectId?: string;
  projectPath?: string;
  problems: Problem[];
  requests: Request[];
}

export function ChecklistPanel({ projectId, projectPath, problems, requests }: ChecklistPanelProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [parentFilter, setParentFilter] = useState<'all' | 'problem' | 'request'>('all');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingNotes && notesRef.current) {
      notesRef.current.focus();
      notesRef.current.setSelectionRange(notesRef.current.value.length, notesRef.current.value.length);
    }
  }, [editingNotes]);

  const loadItems = useCallback(async () => {
    try {
      const result = await (window as any).deskflowAPI?.getChecklists?.(projectId, projectPath);
      if (result?.success) {
        setItems(result.data || []);
      }
    } catch (e) {
      console.warn('[ChecklistPanel] Failed to load:', e);
    }
    setLoading(false);
  }, [projectId, projectPath]);

  useEffect(() => {
    loadItems();
    const interval = setInterval(loadItems, 5000);
    return () => clearInterval(interval);
  }, [loadItems]);

  const handleStatusChange = async (id: string, status: 'pending' | 'in_progress' | 'completed') => {
    await (window as any).deskflowAPI?.updateChecklistItem?.({ id, updates: { status } });
    loadItems();
  };

  const handleApprove = async (id: string, approved: boolean) => {
    await (window as any).deskflowAPI?.updateChecklistItem?.({ id, updates: { humanApproved: approved } });
    loadItems();
  };

  const handleDelete = async (id: string) => {
    await (window as any).deskflowAPI?.deleteChecklistItem?.({ id, projectId, projectPath });
    loadItems();
  };

  const handleSaveNotes = async (id: string) => {
    await (window as any).deskflowAPI?.updateChecklistItem?.({ id, updates: { notes: notesDraft } });
    setEditingNotes(null);
    loadItems();
  };

  const handleStartEditNotes = (item: ChecklistItem) => {
    setNotesDraft(item.notes || '');
    setEditingNotes(item.id);
  };

  const getParentTitle = (type: string, id: string): string => {
    if (type === 'problem') {
      const p = problems.find(x => x.id === id);
      return p ? `#${p.id}: ${p.title}` : `Problem #${id}`;
    }
    const r = requests.find(x => x.id === id);
    return r ? `#${r.id}: ${r.title}` : `Request #${id}`;
  };

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (parentFilter !== 'all' && i.parentType !== parentFilter) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const key = `${item.parentType}-${item.parentId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const pendingCount = items.filter(i => i.status !== 'completed' || !i.humanApproved).length;
  const awaitingHuman = items.filter(i => i.status === 'completed' && i.requiresHuman && !i.humanApproved).length;

  if (loading) {
    return <div className="p-3 text-xs text-zinc-500">Loading checklists...</div>;
  }

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex gap-1 text-[10px]">
          <span className="text-zinc-400">Pending:</span>
          <span className={pendingCount > 0 ? 'text-yellow-400' : 'text-green-400'}>{pendingCount}</span>
          {awaitingHuman > 0 && (
            <>
              <span className="text-zinc-400 ml-1">Awaiting you:</span>
              <span className="text-cyan-400">{awaitingHuman}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
          className="flex-1 bg-zinc-800 text-zinc-300 text-[10px] rounded px-1.5 py-1 border border-zinc-700 outline-none"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={parentFilter}
          onChange={e => setParentFilter(e.target.value as any)}
          className="flex-1 bg-zinc-800 text-zinc-300 text-[10px] rounded px-1.5 py-1 border border-zinc-700 outline-none"
        >
          <option value="all">All types</option>
          <option value="problem">Problems</option>
          <option value="request">Requests</option>
        </select>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-xs text-zinc-600 text-center py-6">
          <Clipboard className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p>No checklist items yet</p>
          <p className="text-[10px] mt-1">The AI will create checklists when working on problems/requests</p>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(grouped).map(([key, groupItems]) => {
          const first = groupItems[0];
          const isExpanded = expandedParents.has(key) || expandedParents.size === 0;
          const done = groupItems.filter(i => i.status === 'completed').length;
          const allDone = done === groupItems.length;

          return (
            <div key={key} className="bg-zinc-800/40 rounded border border-zinc-700/50 overflow-hidden">
              <button
                onClick={() => {
                  const next = new Set(expandedParents);
                  if (isExpanded) next.delete(key);
                  else next.add(key);
                  setExpandedParents(next);
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-700/30 transition-colors"
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${allDone ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-[10px] font-medium text-zinc-300 truncate flex-1 text-left">
                  {getParentTitle(first.parentType, first.parentId)}
                </span>
                <span className={`text-[10px] ${allDone ? 'text-green-400' : 'text-zinc-500'}`}>
                  {done}/{groupItems.length}
                </span>
                <span className="text-zinc-600 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-700/30">
                  {groupItems.map(item => {
                    const hasIssue = item.requiresHuman && item.status === 'completed' && !item.humanApproved;

                    return (
                      <div key={item.id} className="flex items-start gap-1.5 px-2 py-1.5 hover:bg-zinc-700/20 border-b border-zinc-700/20 last:border-0">
                        <button
                          onClick={() => {
                            const next = item.status === 'pending' ? 'in_progress' :
                              item.status === 'in_progress' ? 'completed' : 'pending';
                            handleStatusChange(item.id, next);
                          }}
                          className="mt-0.5 flex-shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
                          title={`Status: ${item.status}`}
                        >
                          {item.status === 'completed' ? (
                            <CheckCircle className={`w-3 h-3 ${item.humanApproved ? 'text-green-400' : 'text-yellow-500'}`} />
                          ) : item.status === 'in_progress' ? (
                            <Play className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <Circle className="w-3 h-3 text-zinc-500" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-zinc-300 leading-tight">{item.description}</p>
                          {editingNotes === item.id ? (
                            <div className="mt-1">
                              <textarea
                                ref={notesRef}
                                value={notesDraft}
                                onChange={e => setNotesDraft(e.target.value)}
                                onKeyDown={e => {
                                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveNotes(item.id);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingNotes(null);
                                  }
                                }}
                                className="w-full bg-zinc-900 text-zinc-300 text-[10px] rounded border border-zinc-600 px-1.5 py-1 outline-none resize-none"
                                rows={2}
                                placeholder="What's still not working? Add your notes here..."
                              />
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  onClick={() => handleSaveNotes(item.id)}
                                  className="px-1.5 py-0.5 bg-cyan-800 hover:bg-cyan-700 text-cyan-200 text-[9px] rounded transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingNotes(null)}
                                  className="px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 text-[9px] rounded transition-colors"
                                >
                                  Cancel
                                </button>
                                <span className="text-[8px] text-zinc-600 ml-1">Ctrl+Enter to save, Esc to cancel</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {item.notes && (
                                <p className="text-[9px] text-zinc-500 mt-0.5 italic flex items-start gap-1">
                                  <MessageSquare className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                                  <span>{item.notes}</span>
                                </p>
                              )}
                            </>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] ${
                              item.status === 'completed' ? 'text-green-500' :
                              item.status === 'in_progress' ? 'text-cyan-500' : 'text-zinc-500'
                            }`}>
                              {item.status.replace('_', ' ')}
                            </span>
                            {item.requiresHuman && (
                              <span className={`text-[9px] flex items-center gap-0.5 ${
                                item.humanApproved ? 'text-green-400' : 'text-amber-400'
                              }`}>
                                <UserCheck className="w-2.5 h-2.5" />
                                {item.humanApproved ? 'Approved' : 'Needs your approval'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => handleStartEditNotes(item)}
                            className={`p-0.5 rounded transition-colors ${
                              item.notes ? 'text-cyan-500 hover:text-cyan-300' : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                            title={item.notes ? 'Edit note' : 'Add a note'}
                          >
                            <MessageSquare className={`w-2.5 h-2.5 ${item.notes ? 'fill-cyan-500/20' : ''}`} />
                          </button>
                          {item.requiresHuman && !item.humanApproved && item.status === 'completed' && (
                            <button
                              onClick={() => handleApprove(item.id, true)}
                              className="px-1.5 py-0.5 bg-cyan-800 hover:bg-cyan-700 text-cyan-200 text-[9px] rounded transition-colors"
                              title="Approve this step"
                            >
                              Approve
                            </button>
                          )}
                          {item.humanApproved && (
                            <button
                              onClick={() => handleApprove(item.id, false)}
                              className="px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[9px] rounded transition-colors"
                              title="Revoke approval"
                            >
                              Revoke
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-0.5 text-zinc-600 hover:text-red-400 text-[9px] transition-colors"
                            title="Delete item"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {awaitingHuman > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-cyan-900/30 border border-cyan-700/40 rounded text-[10px] text-cyan-300">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {awaitingHuman} item{awaitingHuman > 1 ? 's' : ''} awaiting your approval
        </div>
      )}
    </div>
  );
}

function Clipboard(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
