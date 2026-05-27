import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, FileText, CheckCircle2, Plus, Terminal, Clock,
  ArrowUp, ArrowDown, X, ExternalLink, Send, Link, Filter,
  Bug, Lightbulb, ListChecks, RefreshCw
} from 'lucide-react';

interface Problem {
  id: string; title: string; status: string; priority: string; category: string;
  terminal_id: string | null; skill_used: string | null; user_notes: string | null;
  fix_description: string | null; files: string[]; created_at: string; updated_at: string;
}

interface Request {
  id: string; title: string; description: string; status: string; priority: string;
  category: string; linked_problems: string[]; created_at: string; updated_at: string;
}

interface IssueWorkspaceProps {
  projectId?: string; projectPath?: string;
  projects?: { id: string; name: string; path: string }[];
  onSelectProject?: (id: string) => void;
}

type SubTab = 'problems' | 'requests' | 'checklists';

const PROBLEM_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'NEW': { color: 'bg-red-500', label: 'New' },
  'Not Started': { color: 'bg-zinc-500', label: 'Not Started' },
  'In Progress': { color: 'bg-blue-500', label: 'In Progress' },
  'AI Attempted Fix': { color: 'bg-amber-500', label: 'AI Attempted' },
  'User Testing': { color: 'bg-purple-500', label: 'User Testing' },
  'Fixed': { color: 'bg-emerald-500', label: 'Fixed' },
  'Irrelevant': { color: 'bg-zinc-400', label: 'Irrelevant' },
};

const REQUEST_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'Pending': { color: 'bg-amber-500', label: 'Pending' },
  'In Progress': { color: 'bg-blue-500', label: 'In Progress' },
  'Completed': { color: 'bg-emerald-500', label: 'Completed' },
  'Cancelled': { color: 'bg-zinc-500', label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<string, { color: string; border: string; icon: typeof ArrowUp }> = {
  critical: { color: 'text-red-400', border: 'border-l-red-500', icon: ArrowUp },
  high: { color: 'text-orange-400', border: 'border-l-orange-500', icon: ArrowUp },
  medium: { color: 'text-yellow-400', border: 'border-l-yellow-500', icon: ArrowDown },
  low: { color: 'text-zinc-500', border: 'border-l-zinc-600', icon: ArrowDown },
};

const SUB_TABS: { key: SubTab; label: string; icon: typeof Bug; color: string }[] = [
  { key: 'problems', label: 'Problems', icon: Bug, color: 'text-purple-400' },
  { key: 'requests', label: 'Requests', icon: Lightbulb, color: 'text-blue-400' },
  { key: 'checklists', label: 'Checklists', icon: ListChecks, color: 'text-emerald-400' },
];

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusPill({ status, config }: { status: string; config: Record<string, { color: string; label: string }> }) {
  const c = config[status] || { color: 'bg-zinc-500', label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${c.color}/10 text-${c.color.replace('bg-', '')} border border-${c.color.replace('bg-', '')}/20`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.color}`} />
      {c.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY_CONFIG[priority] || { color: 'text-zinc-500', border: 'border-l-zinc-600', icon: ArrowDown };
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium ${p.color}`}>
      <p.icon className="w-2.5 h-2.5" />
      {priority}
    </span>
  );
}

export default function IssuesWorkspace({ projectId, projectPath, projects, onSelectProject }: IssueWorkspaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('problems');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showNewProblem, setShowNewProblem] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);

  const loadProblems = useCallback(async () => {
    try {
      const r = await window.deskflowAPI?.getProblems?.(projectId, projectPath);
      if (r?.success) setProblems(r.data || []);
    } catch (e) { console.error('[IssuesWorkspace] loadProblems', e); }
    finally { setProblemsLoading(false); }
  }, [projectId, projectPath]);

  const loadRequests = useCallback(async () => {
    try {
      const r = await window.deskflowAPI?.getRequests?.(projectId);
      if (r?.success) setRequests(r.data || []);
    } catch (e) { console.error('[IssuesWorkspace] loadRequests', e); }
    finally { setRequestsLoading(false); }
  }, [projectId]);

  useEffect(() => { loadProblems(); const i = setInterval(loadProblems, 5000); return () => clearInterval(i); }, [loadProblems]);
  useEffect(() => { loadRequests(); const i = setInterval(loadRequests, 5000); return () => clearInterval(i); }, [loadRequests]);

  const filteredProblems = problems.filter(p => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return ['NEW', 'Not Started', 'In Progress', 'AI Attempted Fix', 'User Testing'].includes(p.status);
    return p.status === filterStatus;
  });

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const handleProblemStatus = async (id: string, status: string) => {
    await window.deskflowAPI?.updateProblemStatus?.({ problemId: id, status, projectId });
    loadProblems();
  };

  const handleRequestStatus = async (id: string, status: string) => {
    await window.deskflowAPI?.updateRequestStatus?.({ requestId: id, status });
    loadRequests();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 px-1 py-1.5 bg-zinc-900/60 border border-zinc-800/50 rounded-lg mb-3">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
              activeSubTab === tab.key
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${activeSubTab === tab.key ? tab.color : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-zinc-500" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="all">All Items</option>
            <option value="active">Active</option>
            {Object.entries(activeSubTab === 'problems' ? PROBLEM_STATUS_CONFIG : REQUEST_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => activeSubTab === 'problems' ? setShowNewProblem(true) : setShowNewRequest(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-[10px] font-medium rounded-lg transition-all"
        >
          <Plus className="w-3 h-3" />
          New {activeSubTab === 'problems' ? 'Problem' : 'Request'}
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'problems' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {problemsLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-[11px]">Loading...</span>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
              <Bug className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-[11px]">No problems found</p>
            </div>
          ) : filteredProblems.map(p => (
            <ProblemCard key={p.id} problem={p} onClick={() => setSelectedProblem(p)} />
          ))}
        </div>
      )}

      {activeSubTab === 'requests' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {requestsLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-[11px]">Loading...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
              <Lightbulb className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-[11px]">No requests found</p>
            </div>
          ) : filteredRequests.map(r => (
            <RequestCard key={r.id} request={r} onClick={() => setSelectedRequest(r)} />
          ))}
        </div>
      )}

      {activeSubTab === 'checklists' && (
        <ChecklistSubTab projectId={projectId} projectPath={projectPath} problems={problems} requests={requests} />
      )}

      {/* Problem Detail Modal */}
      {selectedProblem && (
        <ProblemDetailModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onStatusChange={handleProblemStatus}
          projectId={projectId}
        />
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={handleRequestStatus}
          projectId={projectId}
        />
      )}

      {/* New Problem Dialog */}
      {showNewProblem && (
        <NewProblemDialog
          onClose={() => setShowNewProblem(false)}
          onCreate={() => { setShowNewProblem(false); loadProblems(); }}
          projectId={projectId}
          projectPath={projectPath}
        />
      )}

      {/* New Request Dialog */}
      {showNewRequest && (
        <NewRequestDialog
          onClose={() => setShowNewRequest(false)}
          onCreate={() => { setShowNewRequest(false); loadRequests(); }}
          projectId={projectId}
        />
      )}
    </div>
  );
}

// ── Problem Card ──

function ProblemCard({ problem, onClick }: { problem: Problem; onClick: () => void }) {
  const priority = PRIORITY_CONFIG[problem.priority] || PRIORITY_CONFIG.medium;
  return (
    <div
      onClick={onClick}
      className={`bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-3
        hover:border-zinc-700/50 hover:bg-zinc-900/60 transition-all cursor-pointer
        border-l-2 ${priority.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusPill status={problem.status} config={PROBLEM_STATUS_CONFIG} />
            <PriorityBadge priority={problem.priority} />
            <span className="text-[9px] font-mono text-zinc-600">{problem.id}</span>
          </div>
          <p className="text-sm text-zinc-200 font-medium leading-snug line-clamp-2">{problem.title}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-[9px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formatRelative(problem.created_at)}
        </span>
        {problem.terminal_id && (
          <span className="flex items-center gap-1 text-purple-400/70">
            <Terminal className="w-2.5 h-2.5" />
            {problem.terminal_id.slice(0, 8)}
          </span>
        )}
        {problem.files.length > 0 && (
          <span className="flex items-center gap-1 text-zinc-600">
            <FileText className="w-2.5 h-2.5" />
            {problem.files.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Request Card ──

function RequestCard({ request, onClick }: { request: Request; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-3
        hover:border-zinc-700/50 hover:bg-zinc-900/60 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusPill status={request.status} config={REQUEST_STATUS_CONFIG} />
            <PriorityBadge priority={request.priority} />
            <span className="text-[9px] font-mono text-zinc-600">#{request.id}</span>
          </div>
          <p className="text-sm text-zinc-200 font-medium leading-snug line-clamp-2">{request.title}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-[9px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formatRelative(request.created_at)}
        </span>
        {request.linked_problems.length > 0 && (
          <span className="flex items-center gap-1 text-blue-400/70">
            <Link className="w-2.5 h-2.5" />
            {request.linked_problems.length} linked
          </span>
        )}
      </div>
    </div>
  );
}

// ── Problem Detail Modal ──

function ProblemDetailModal({
  problem, onClose, onStatusChange, projectId
}: {
  problem: Problem; onClose: () => void; onStatusChange: (id: string, status: string) => void; projectId?: string;
}) {
  const [instructions, setInstructions] = useState('');
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState(problem.user_notes || '');

  const handleSend = async () => {
    if (!instructions.trim() || !problem.terminal_id || sending) return;
    setSending(true);
    try { await window.deskflowAPI?.terminalWrite?.(problem.terminal_id, instructions + '\n'); setInstructions(''); }
    finally { setSending(false); }
  };

  const handleSaveNotes = async () => {
    await window.deskflowAPI?.updateProblem?.({ id: problem.id, user_notes: notes, projectId });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Bug className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">{problem.id}</h2>
              <p className="text-sm text-zinc-300 mt-0.5">{problem.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>

        {/* Status Pills */}
        <div className="mb-4">
          <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Status</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PROBLEM_STATUS_CONFIG).map(([s, c]) => (
              <button
                key={s}
                onClick={() => onStatusChange(problem.id, s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
                  problem.status === s
                    ? `${c.color} text-white border-transparent shadow-sm`
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Actions */}
        <div className="mb-4">
          <button
            onClick={async () => {
              if (problem.terminal_id) {
                window.dispatchEvent(new CustomEvent('focus-terminal', { detail: { terminalId: problem.terminal_id } }));
                onClose();
              } else {
                const r = await window.deskflowAPI?.assignProblemToTerminal?.({ problemId: problem.id });
                if (r?.success) {
                  window.dispatchEvent(new CustomEvent('create-terminal-for-problem', {
                    detail: { terminalId: r.data.terminalId, prompt: r.data.prompt }
                  }));
                  onClose();
                }
              }
            }}
            className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl text-[11px] text-zinc-300 flex items-center justify-center gap-2 transition-all"
          >
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            {problem.terminal_id ? 'Open in Terminal' : 'Assign & Create Terminal'}
          </button>
        </div>

        {/* Send Instructions */}
        {problem.terminal_id && (
          <div className="mb-4">
            <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Send to Terminal</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type instruction..."
                className="flex-1 bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50"
              />
              <button
                onClick={handleSend}
                disabled={sending || !instructions.trim()}
                className="px-3 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-[11px] flex items-center gap-1 transition-all"
              >
                {sending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Notes</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            rows={2}
            placeholder="Add notes..."
            className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 resize-none"
          />
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-zinc-600 border-t border-zinc-800/50 pt-3 mt-2">
          <span>Category: <span className="text-zinc-400">{problem.category || '—'}</span></span>
          <span>Skill: <span className="text-zinc-400">{problem.skill_used || '—'}</span></span>
          <span>Created: <span className="text-zinc-400">{new Date(problem.created_at).toLocaleDateString()}</span></span>
          {problem.fix_description && (
            <span>Fix: <span className="text-zinc-400">{problem.fix_description}</span></span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Request Detail Modal ──

function RequestDetailModal({
  request, onClose, onStatusChange, projectId
}: {
  request: Request; onClose: () => void; onStatusChange: (id: string, status: string) => void; projectId?: string;
}) {
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [linkId, setLinkId] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(request.description || '');

  useEffect(() => {
    window.deskflowAPI?.getProblems?.(projectId).then((r: any) => {
      if (r?.success) setAllProblems(r.data || []);
    });
  }, [projectId]);

  const handleLink = async () => {
    if (!linkId) return;
    await window.deskflowAPI?.linkProblemToRequest?.({ requestId: request.id, problemId: linkId, projectId });
    setLinkId('');
  };

  const handleSaveDesc = async () => {
    await window.deskflowAPI?.updateRequest?.({ id: request.id, description: desc });
    setEditingDesc(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Lightbulb className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">#{request.id}</h2>
              <p className="text-sm text-zinc-300 mt-0.5">{request.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>

        {/* Description */}
        <div className="mb-4">
          <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Description</div>
          {editingDesc ? (
            <div className="space-y-2">
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-[11px] text-zinc-300 focus:outline-none focus:border-pink-500/50 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveDesc} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-[10px] rounded-lg">Save</button>
                <button onClick={() => { setEditingDesc(false); setDesc(request.description || ''); }} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] rounded-lg">Cancel</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingDesc(true)}
              className="bg-zinc-950 border border-zinc-800/50 rounded-lg px-3 py-2 text-[11px] text-zinc-400 cursor-text hover:border-zinc-700/50 transition-colors min-h-[2.5rem]"
            >
              {request.description || 'No description — click to add...'}
            </div>
          )}
        </div>

        {/* Status Pills */}
        <div className="mb-4">
          <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Status</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(REQUEST_STATUS_CONFIG).map(([s, c]) => (
              <button
                key={s}
                onClick={() => onStatusChange(request.id, s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
                  request.status === s
                    ? `${c.color} text-white border-transparent shadow-sm`
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Linked Problems */}
        <div className="mb-4">
          <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Linked Problems</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {request.linked_problems.length === 0 ? (
              <span className="text-[10px] text-zinc-600">None</span>
            ) : request.linked_problems.map(pid => (
              <span key={pid} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] rounded-full border border-purple-500/20">
                #{pid}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={linkId}
              onChange={e => setLinkId(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-pink-500/50"
            >
              <option value="">Link a problem...</option>
              {allProblems.filter(p => !request.linked_problems.includes(p.id)).map(p => (
                <option key={p.id} value={p.id}>#{p.id} — {p.title.slice(0, 40)}</option>
              ))}
            </select>
            <button onClick={handleLink} disabled={!linkId} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-[10px] rounded-lg transition-all">
              <Link className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-zinc-600 border-t border-zinc-800/50 pt-3 mt-2">
          <span>Category: <span className="text-zinc-400">{request.category || '—'}</span></span>
          <span>Created: <span className="text-zinc-400">{new Date(request.created_at).toLocaleDateString()}</span></span>
        </div>
      </div>
    </div>
  );
}

// ── New Problem Dialog ──

function NewProblemDialog({ onClose, onCreate, projectId, projectPath }: {
  onClose: () => void; onCreate: () => void; projectId?: string; projectPath?: string;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const r = await window.deskflowAPI?.createProblem?.({ title, priority, category: category || undefined, projectId, projectPath });
    if (r?.success) onCreate();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-5 w-full max-w-sm shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">New Problem</h2>
        <div className="space-y-3">
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Brief description" autoFocus
            className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50"
          />
          <div className="flex gap-3">
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-pink-500/50">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-pink-500/50">
              <option value="">Category</option>
              <option value="terminal">Terminal</option>
              <option value="dashboard">Dashboard</option>
              <option value="external">External</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] rounded-lg transition-all">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-[11px] rounded-lg transition-all">Create</button>
        </div>
      </div>
    </div>
  );
}

// ── New Request Dialog ──

function NewRequestDialog({ onClose, onCreate, projectId }: {
  onClose: () => void; onCreate: () => void; projectId?: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const r = await window.deskflowAPI?.createRequest?.({ title, description, priority, category: 'Feature', projectId });
    if (r?.success) onCreate();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-5 w-full max-w-sm shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">New Request</h2>
        <div className="space-y-3">
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Brief description" autoFocus
            className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50"
          />
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            rows={2} placeholder="What was requested?"
            className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 resize-none"
          />
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-pink-500/50">
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] rounded-lg transition-all">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-[11px] rounded-lg transition-all">Create</button>
        </div>
      </div>
    </div>
  );
}

// ── Checklists Sub-Tab ──

function ChecklistSubTab({ projectId, projectPath, problems, requests }: {
  projectId?: string; projectPath?: string; problems: Problem[]; requests: Request[];
}) {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'problem' | 'request'>('all');
  const [filterSub, setFilterSub] = useState('all');

  const load = useCallback(async () => {
    try {
      const r = await window.deskflowAPI?.getChecklists?.(projectId, projectPath);
      if (r?.success) setChecklists(r.data || []);
    } catch (e) { console.error('[ChecklistSubTab] load', e); }
    finally { setLoading(false); }
  }, [projectId, projectPath]);

  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);

  const items = checklists.filter((c: any) => {
    if (filterType !== 'all' && c.parentType !== filterType) return false;
    if (filterSub === 'all') return true;
    return c.status === filterSub;
  });

  const grouped = items.reduce((acc: any, c: any) => {
    const key = `${c.parentType}:${c.parentId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
          className="bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none">
          <option value="all">All Types</option>
          <option value="problem">Problems</option>
          <option value="request">Requests</option>
        </select>
        <select value={filterSub} onChange={e => setFilterSub(e.target.value)}
          className="bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-zinc-500">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          <span className="text-[11px]">Loading...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
          <ListChecks className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-[11px]">No checklist items yet</p>
        </div>
      ) : (
        Object.entries(grouped).map(([key, groupItems]: [string, any[]]) => {
          const [parentType, parentId] = key.split(':');
          const parent = parentType === 'problem'
            ? problems.find(p => p.id === parentId)
            : requests.find(r => r.id === parentId);
          const done = groupItems.filter((i: any) => i.status === 'completed').length;
          const awaiting = groupItems.filter((i: any) => i.requiresHuman && !i.humanApproved).length;
          return (
            <div key={key} className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-zinc-800/40 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${parentType === 'problem' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                  <span className="text-[10px] font-medium text-zinc-400 truncate">{parent?.title || parentId}</span>
                  <span className="text-[9px] text-zinc-600">({parentId})</span>
                </div>
                <div className="flex items-center gap-2">
                  {awaiting > 0 && <span className="text-[9px] text-amber-400">{awaiting} awaiting</span>}
                  <span className="text-[9px] text-zinc-500">{done}/{groupItems.length}</span>
                </div>
              </div>
              <div className="divide-y divide-zinc-800/30">
                {groupItems.map((item: any) => (
                  <ChecklistRow key={item.id} item={item} onUpdate={load} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function ChecklistRow({ item, onUpdate }: { item: any; onUpdate: () => void }) {
  const statusCycle: Record<string, string> = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
  const statusColors: Record<string, string> = {
    pending: 'border-zinc-700 bg-zinc-800',
    in_progress: 'border-blue-500/50 bg-blue-500/20',
    completed: 'border-emerald-500/50 bg-emerald-500/20',
  };
  const statusDots: Record<string, string> = {
    pending: 'bg-zinc-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-emerald-500',
  };

  const handleToggle = async () => {
    const next = statusCycle[item.status] || 'pending';
    await window.deskflowAPI?.updateChecklistItem?.({ id: item.id, status: next });
    onUpdate();
  };

  const handleApprove = async () => {
    await window.deskflowAPI?.updateChecklistItem?.({ id: item.id, humanApproved: !item.humanApproved });
    onUpdate();
  };

  return (
    <div className="flex items-start gap-2 px-3 py-2 hover:bg-zinc-800/20 transition-colors">
      <button
        onClick={handleToggle}
        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${statusColors[item.status] || statusColors.pending}`}
      >
        {item.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium ${item.status === 'completed' ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
            Step {item.step}: {item.description}
          </span>
        </div>
        {item.notes && <div className="text-[9px] text-zinc-500 mt-0.5">{item.notes}</div>}
        {item.requiresHuman && (
          <button
            onClick={handleApprove}
            className={`mt-1 px-2 py-0.5 rounded text-[9px] border transition-all ${
              item.humanApproved
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            {item.humanApproved ? 'Approved' : 'Awaiting Approval'}
          </button>
        )}
      </div>
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${statusDots[item.status] || 'bg-zinc-500'}`} />
    </div>
  );
}
