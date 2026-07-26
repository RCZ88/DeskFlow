import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  terminal_id: string | null;
  skill_used: string | null;
  user_notes: string | null;
  fix_description: string | null;
  files: string[];
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  'NEW': { color: 'bg-red-500', icon: '🔴', label: 'New' },
  'Not Started': { color: 'bg-gray-500', icon: '⚪', label: 'Not Started' },
  'In Progress': { color: 'bg-blue-500', icon: '🔵', label: 'In Progress' },
  'AI Attempted Fix': { color: 'bg-yellow-500', icon: '🟡', label: 'AI Attempted' },
  'User Testing': { color: 'bg-purple-500', icon: '🟣', label: 'User Testing' },
  'Fixed': { color: 'bg-green-500', icon: '🟢', label: 'Fixed' },
  'Irrelevant': { color: 'bg-gray-400', icon: '⚫', label: 'Irrelevant' }
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ProblemsTab: React.FC<{
  projectId?: string;
  projectPath?: string;
  projects?: { id: string; name: string; path: string }[];
  onSelectProject?: (id: string) => void;
  sessions?: { id: string; status: string }[];
}> = ({ projectId, projectPath: propProjectPath, projects, onSelectProject, sessions = [] }) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  const resolvedProject = projects?.find(p => p.id === projectId);
  const computedProjectPath = resolvedProject?.path || propProjectPath || '';

  const loadProblems = useCallback(async () => {
    try {
      const result = await window.deskflowAPI?.getProblems?.(projectId, computedProjectPath);
      if (result?.success) {
        setProblems(result.data || []);
      }
    } catch (e) {
      console.error('[ProblemsTab] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId, computedProjectPath]);

  useEffect(() => {
    loadProblems();
    const interval = setInterval(loadProblems, 5000);
    return () => clearInterval(interval);
  }, [loadProblems]);

  // Auto-compaction: check active sessions every 60s
  useEffect(() => {
    if (!window.deskflowAPI?.checkSessionCompaction) return;
    const check = async () => {
      for (const session of sessions) {
        if (session.status !== 'active') continue;
        try {
          const result = await window.deskflowAPI.checkSessionCompaction({
            sessionId: session.id,
            messageThreshold: 500,
          });
          if (result?.needsCompaction) {
            console.log('[SessionCompaction] Session', session.id, 'needs compaction (', result.messageCount, 'messages )');
            const compactResult = await window.deskflowAPI.compactSession?.({ sessionId: session.id });
            if (compactResult?.success) {
              console.log('[SessionCompaction] Compacted', session.id, '->', compactResult.newSessionId);
            }
          }
        } catch (err) {
          console.error('[SessionCompaction] Error checking session', session.id, err);
        }
      }
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [sessions]);

  const filteredProblems = problems.filter(p => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return ['NEW', 'In Progress', 'AI Attempted Fix', 'User Testing'].includes(p.status);
    return p.status === filterStatus;
  });

  const groupedProblems = filteredProblems.reduce((acc, p) => {
    const status = p.status || 'NEW';
    if (!acc[status]) acc[status] = [];
    acc[status].push(p);
    return acc;
  }, {} as Record<string, Problem[]>);

  const handleStatusChange = async (problemId: string, status: string) => {
    await window.deskflowAPI?.updateProblemStatus?.({ problemId, status, projectId });
    setProblems(prev => prev.map(p => p.id === problemId ? { ...p, status } : p));
    setSelectedProblem(prev => prev?.id === problemId ? { ...prev, status } : prev);
    loadProblems();
  };

  const handleCreateProblem = async (title: string, priority?: string) => {
    const result = await window.deskflowAPI?.createProblem?.({ title, priority, projectId });
    loadProblems();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
        >
          <option value="all">All Issues</option>
          <option value="active">Active</option>
          <option value="NEW">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Fixed">Fixed</option>
        </select>
        <button
          onClick={() => setShowNewDialog(true)}
          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Project Path + File Info */}
      <div className="mb-2 px-2 py-1 bg-zinc-800/50 rounded">
        {computedProjectPath ? (
          <>
            <div className="text-[10px] text-zinc-500 truncate" title={computedProjectPath}>
              📁 {resolvedProject?.name || 'Project'} — {computedProjectPath}
            </div>
            <div className="text-[10px] text-zinc-600 truncate mt-0.5">
              agent/PROBLEMS.md • {problems.length} issues parsed
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-[10px] text-yellow-500">⚠️ No project selected</div>
            <select
              value=""
              onChange={(e) => { if (e.target.value) onSelectProject?.(e.target.value); }}
              className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-xs text-zinc-200"
            >
              <option value="">-- Choose project --</option>
              {projects?.filter(p => p.id).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Problems List */}
      {loading ? (
        <div className="text-xs text-zinc-500 py-4 text-center">Loading...</div>
      ) : filteredProblems.length === 0 ? (
        <div className="text-xs text-zinc-500 py-4 text-center">No problems found</div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.entries(groupedProblems).map(([status, statusProblems]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status]?.color || 'bg-gray-500'}`} />
                <span className="text-xs font-medium text-zinc-400">{status}</span>
                <span className="text-xs text-zinc-600">({statusProblems.length})</span>
              </div>
              {statusProblems.map((problem) => (
                <div
                  key={problem.id}
                  onClick={() => setSelectedProblem(problem)}
                  className={`p-2 bg-zinc-800 rounded mb-2 cursor-pointer hover:bg-zinc-750 border-l-2 ${
                    problem.priority === 'critical' ? 'border-l-red-500' :
                    problem.priority === 'high' ? 'border-l-orange-500' :
                    problem.priority === 'medium' ? 'border-l-yellow-500' :
                    'border-l-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-200">{problem.id}</span>
                    <span className="text-xs text-zinc-500 capitalize">{problem.priority}</span>
                  </div>
                  <div className="text-sm text-white mt-1 line-clamp-2">{problem.title}</div>
                  {problem.terminal_id && (
                    <div className="text-xs text-purple-400 mt-1">
                      Terminal: {problem.terminal_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Problem Detail Modal */}
      {selectedProblem && (
        <ProblemDetailModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* New Problem Dialog */}
      {showNewDialog && (
        <NewProblemDialog
          onClose={() => setShowNewDialog(false)}
          onCreate={() => { setShowNewDialog(false); loadProblems(); }}
          projectId={projectId}
          projectPath={computedProjectPath}
        />
      )}
    </div>
  );
};

const ProblemDetailModal: React.FC<{
  problem: Problem;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}> = ({ problem, onClose, onStatusChange }) => {
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [isSending, setIsSending] = useState(false);

  const handleSendInstructions = async () => {
    if (!additionalInstructions.trim() || !problem.terminal_id || isSending) return;
    setIsSending(true);
    try {
      await window.deskflowAPI?.terminalWrite?.(problem.terminal_id, additionalInstructions + '\r\n');
      setAdditionalInstructions('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]">
      <div className="bg-gray-800 rounded-xl p-5 w-full max-w-md border border-gray-700 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{problem.id}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">×</button>
        </div>
        
        <p className="text-white mb-4">{problem.title}</p>

        {/* Status Buttons */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Status</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() => onStatusChange(problem.id, status)}
                className={`px-2 py-1 rounded text-xs ${problem.status === status ? `${config.color} text-white` : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Open in Terminal Button */}
        <div className="mb-4">
          <button
            onClick={async () => {
              if (problem.terminal_id) {
                window.dispatchEvent(new CustomEvent('focus-terminal', { detail: { terminalId: problem.terminal_id } }));
                onClose();
              } else {
                const result = await window.deskflowAPI?.assignProblemToTerminal?.({ problemId: problem.id });
                if (result?.success) {
                  window.dispatchEvent(new CustomEvent('create-terminal-for-problem', {
                    detail: { terminalId: result.data.terminalId, prompt: result.data.prompt }
                  }));
                  onClose();
                }
              }
            }}
            className={`w-full px-3 py-2 rounded text-sm text-white flex items-center justify-center gap-2 ${
              problem.terminal_id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {problem.terminal_id ? 'Open in Terminal' : 'Assign to Terminal'}
          </button>
        </div>

        {/* Send Instructions (if terminal assigned) */}
        {problem.terminal_id && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">Send Instructions to Terminal</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="Type instructions..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleSendInstructions()}
              />
              <button
                onClick={handleSendInstructions}
                disabled={isSending}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm text-white flex items-center gap-1 min-w-[60px] justify-center"
              >
                {isSending ? (
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        {problem.user_notes && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1">User Notes</div>
            <div className="text-sm text-gray-300 bg-gray-900 p-2 rounded">{problem.user_notes}</div>
          </div>
        )}

        {/* Meta */}
        <div className="text-xs text-gray-500 border-t border-gray-700 pt-3 mt-4">
          <div>Priority: {problem.priority}</div>
          <div>Category: {problem.category}</div>
          <div>Created: {new Date(problem.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};

const NewProblemDialog: React.FC<{
  onClose: () => void;
  onCreate: () => void;
  projectId?: string;
  projectPath?: string;
}> = ({ onClose, onCreate, projectId, projectPath }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [skills, setSkills] = useState<{ id: string; name: string; description: string }[]>([]);

  useEffect(() => {
    window.deskflowAPI?.getSkills?.().then(result => {
      if (result?.success) setSkills(result.data || []);
    });
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const result = await window.deskflowAPI?.createProblem?.({ 
      title, 
      priority, 
      category,
      skill_id: selectedSkill || undefined,
      projectId,
      projectPath
    });
    if (result?.success) onCreate();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]">
      <div className="bg-gray-800 rounded-xl p-5 w-full max-w-md border border-gray-700">
        <h2 className="text-lg font-bold text-white mb-4">New Problem</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              placeholder="Brief description"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="">Select...</option>
                <option value="terminal">Terminal</option>
                <option value="dashboard">Dashboard</option>
                <option value="external">External</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          {skills.length > 0 && (
            <div>
              <label className="block text-xs text-gray-400 mb-2">Skill (optional)</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
                <button
                  onClick={() => setSelectedSkill('')}
                  className={`p-2 rounded text-xs text-left border transition-colors ${
                    selectedSkill === ''
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">No skill</div>
                </button>
                {skills.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkill(skill.id)}
                    className={`p-2 rounded text-xs text-left border transition-colors ${
                      selectedSkill === skill.id
                        ? 'bg-purple-600/30 border-purple-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium truncate">{skill.name}</div>
                    {skill.description && (
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">{skill.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded">Create</button>
        </div>
      </div>
    </div>
  );
};

export { ProblemsTab, ProblemDetailModal, NewProblemDialog };
export type { Problem };
