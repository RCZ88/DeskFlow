import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';

interface Request {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  linked_problems: string[];
  created_at: string;
  updated_at: string;
}

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

const REQUEST_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'Pending': { color: 'bg-yellow-500', label: 'Pending' },
  'In Progress': { color: 'bg-blue-500', label: 'In Progress' },
  'Completed': { color: 'bg-green-500', label: 'Completed' },
  'Cancelled': { color: 'bg-gray-500', label: 'Cancelled' }
};

const RequestsTab: React.FC<{ projectId?: string; projectPath?: string; onNewRequest: () => void; projects?: { id: string; name: string; path: string }[]; onSelectProject?: (id: string) => void }> = ({ projectId, projectPath: propProjectPath, onNewRequest, projects, onSelectProject }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const result = await window.deskflowAPI?.getRequests?.(projectId);
      if (result?.success) {
        setRequests(result.data || []);
      }
    } catch (e) {
      console.error('[RequestsTab] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const groupedRequests = filteredRequests.reduce((acc, r) => {
    const status = r.status || 'Pending';
    if (!acc[status]) acc[status] = [];
    acc[status].push(r);
    return acc;
  }, {} as Record<string, Request[]>);

  const handleStatusChange = async (requestId: string, status: string) => {
    await window.deskflowAPI?.updateRequestStatus?.({ requestId, status });
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
    setSelectedRequest(prev => prev?.id === requestId ? { ...prev, status } : prev);
    loadRequests();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
        >
          <option value="all">All Requests</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <button
          onClick={onNewRequest}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Project path display */}
      <div className="mb-2 px-2 py-1 bg-zinc-800/50 rounded">
        {(() => {
          const resolvedProject = projects?.find(p => p.id === projectId);
          const displayPath = propProjectPath || resolvedProject?.path || '';
          if (displayPath || resolvedProject) {
            return (
              <>
                <div className="text-[10px] text-zinc-500 truncate" title={displayPath}>
                  📁 {resolvedProject?.name || 'Project'}
                </div>
                <div className="text-[10px] text-zinc-600 truncate mt-0.5">
                  agent/REQUESTS.md
                </div>
              </>
            );
          }
          return (
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
          );
        })()}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-xs text-zinc-500 py-4 text-center">Loading...</div>
      ) : !projectId ? (
        <div className="text-xs text-zinc-500 py-4 text-center">Select a project to view requests</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-xs text-zinc-500 py-4 text-center">No requests found</div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.entries(groupedRequests).map(([status, statusRequests]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`w-2 h-2 rounded-full ${REQUEST_STATUS_CONFIG[status]?.color || 'bg-gray-500'}`} />
                <span className="text-xs font-medium text-zinc-400">{status}</span>
                <span className="text-xs text-zinc-600">({statusRequests.length})</span>
              </div>
              {statusRequests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`p-2 bg-zinc-800 rounded mb-2 cursor-pointer hover:bg-zinc-750 border-l-2 ${
                    request.priority === 'high' ? 'border-l-blue-500' :
                    request.priority === 'medium' ? 'border-l-cyan-500' :
                    'border-l-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-200">#{request.id}</span>
                    <span className="text-xs text-zinc-500 capitalize">{request.priority}</span>
                  </div>
                  <div className="text-sm text-white mt-1 line-clamp-2">{request.title}</div>
                  {request.linked_problems.length > 0 && (
                    <div className="text-xs text-blue-400 mt-1">
                      Linked: {request.linked_problems.map(p => `#${p}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

{/* Request Detail Modal */}
{selectedRequest && (
  <RequestDetailModal
    request={selectedRequest}
    onClose={() => setSelectedRequest(null)}
    onStatusChange={handleStatusChange}
    projectId={projectId}
  />
)}
    </div>
  );
};

const RequestDetailModal: React.FC<{
  request: Request;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  projectId?: string;
}> = ({ request, onClose, onStatusChange, projectId }) => {
  const [linkProblemId, setLinkProblemId] = useState('');
  const [allProblems, setAllProblems] = useState<Problem[]>([]);

  useEffect(() => {
    window.deskflowAPI?.getProblems?.(projectId).then((result: any) => {
      if (result?.success) setAllProblems(result.data || []);
    });
  }, [projectId]);

  const handleLinkProblem = async () => {
    if (!linkProblemId) return;
    await window.deskflowAPI?.linkProblemToRequest?.({ requestId: request.id, problemId: linkProblemId, projectId });
    setLinkProblemId('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]">
      <div className="bg-gray-800 rounded-xl p-5 w-full max-w-md border border-gray-700 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Request #{request.id}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">×</button>
        </div>

        <p className="text-white mb-4">{request.title}</p>

        {request.description && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1">Description</div>
            <div className="text-sm text-gray-300 bg-gray-900 p-2 rounded">{request.description}</div>
          </div>
        )}

        {/* Status Buttons */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Status</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(REQUEST_STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() => onStatusChange(request.id, status)}
                className={`px-2 py-1 rounded text-xs ${request.status === status ? `${config.color} text-white` : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Linked Problems */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Linked Problems</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {request.linked_problems.length === 0 ? (
              <span className="text-xs text-gray-500">No linked problems</span>
            ) : request.linked_problems.map(pid => (
              <span key={pid} className="px-1.5 py-0.5 bg-blue-600/30 text-blue-300 text-[10px] rounded">
                #{pid}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={linkProblemId}
              onChange={(e) => setLinkProblemId(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
            >
              <option value="">Link a problem...</option>
              {allProblems
                .filter(p => !request.linked_problems.includes(p.id))
                .map(p => (
                  <option key={p.id} value={p.id}>#{p.id} - {p.title}</option>
                ))}
            </select>
            <button
              onClick={handleLinkProblem}
              disabled={!linkProblemId}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-xs rounded"
            >
              Link
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="text-xs text-gray-500 border-t border-gray-700 pt-3 mt-4">
          <div>Priority: {request.priority}</div>
          <div>Category: {request.category}</div>
          <div>Created: {new Date(request.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};

const NewRequestDialog: React.FC<{
  projectId?: string;
  onClose: () => void;
  onCreate: () => void;
}> = ({ projectId, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const result = await window.deskflowAPI?.createRequest?.({ title, description, priority, category: 'Feature', projectId });
    if (result?.success) onCreate();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]">
      <div className="bg-gray-800 rounded-xl p-5 w-full max-w-md border border-gray-700">
        <h2 className="text-lg font-bold text-white mb-4">New Request</h2>
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
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              rows={3}
              placeholder="What was requested?"
            />
          </div>
          <div>
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
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">Create</button>
        </div>
      </div>
    </div>
  );
};

export { Request, Problem, REQUEST_STATUS_CONFIG, RequestsTab, RequestDetailModal, NewRequestDialog };
