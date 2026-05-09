import { useEffect, useState, useCallback, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Plus, X, Monitor, Play, Trash2, Clock, FolderOpen, Zap, Settings, PanelLeftClose, PanelLeft, GripVertical, Info, PieChart, AlertCircle, FileText, Send, Folder, Link, Terminal as TerminalIcon } from 'lucide-react';
import { TerminalLayout, PaneNode } from '../components/TerminalWindow';
import { useTerminalLayout } from '../hooks/useTerminalLayout';
import '@xterm/xterm/css/xterm.css';

function generateTerminalId(): string {
  return `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface Preset {
  id: string;
  name: string;
  command: string;
  category?: string;
}

interface Session {
  id: string;
  agent: string;
  topic: string;
  resume_id?: string;
  started_at: string;
  total_cost_usd?: number;
}

const loggedErrors = new Set<string>();

function logOnce(key: string, message: string, ...args: any[]) {
  if (!loggedErrors.has(key)) {
    loggedErrors.add(key);
    console.warn(message, ...args);
  }
}

export default function TerminalPage({ projectId: propProjectId }: { projectId?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(288); // 72 * 4 = 288px
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'sessions' | 'map' | 'analytics' | 'problems' | 'requests' | 'files'>(() => {
    const saved = localStorage.getItem('terminal-activeTab');
    return (saved as any) || 'presets';
  });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPreset, setNewPreset] = useState({ name: '', command: '', category: '' });
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; path: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(propProjectId || '');
  const [hoveredPane, setHoveredPane] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<{ totalTokens: number; totalCost: number; byTool: Record<string, any> | null } | null>(null);
  
  // Terminal binding state
  const [terminalBindings, setTerminalBindings] = useState<Record<string, {
    terminalId: string;
    projectId: string | null;
    activeProblemId: string | null;
    status: string;
    agentType: string | null;
  }>>({});
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [showInstructionInput, setShowInstructionInput] = useState(false);
  const [instructionText, setInstructionText] = useState('');

  // Persistent layout for this project
  const effectiveProjectId = propProjectId || selectedProject;
  const { layout: terminalLayout, setLayout: setTerminalLayout, isLoading: layoutLoading, resetLayout } = useTerminalLayout(
    effectiveProjectId || null,
    { id: 'root', type: 'leaf', terminalId: 'term-initial', size: 50 }
  );

  // Load terminal bindings
  const loadTerminalBindings = useCallback(async () => {
    if (!window.deskflowAPI) return;
    try {
      const result = await window.deskflowAPI.getTerminalBindings();
      if (result?.success) {
        const bindingsMap: typeof terminalBindings = {};
        for (const b of result.data || []) {
          bindingsMap[b.terminal_id] = {
            terminalId: b.terminal_id,
            projectId: b.project_id,
            activeProblemId: b.active_problem_id,
            status: b.status,
            agentType: b.agent_type
          };
        }
        setTerminalBindings(bindingsMap);
      }
    } catch (e) {
      console.error('[TerminalPage] Failed to load terminal bindings:', e);
    }
  }, []);

  // Register terminal with binding
  const registerTerminal = useCallback(async (terminalId: string) => {
    if (!window.deskflowAPI) return;
    try {
      await window.deskflowAPI.registerTerminal({
        terminalId,
        projectId: selectedProject || undefined,
        agentType: 'claude',
        status: 'active'
      });
      setActiveTerminalId(terminalId);
      loadTerminalBindings();
    } catch (e) {
      console.error('[TerminalPage] Failed to register terminal:', e);
    }
  }, [selectedProject, loadTerminalBindings]);

  // Send instruction to terminal
  const sendInstruction = useCallback(async () => {
    if (!window.deskflowAPI || !activeTerminalId || !instructionText.trim()) return;
    try {
      await window.deskflowAPI.terminalWrite(activeTerminalId, instructionText + '\n');
      setInstructionText('');
      setShowInstructionInput(false);
    } catch (e) {
      console.error('[TerminalPage] Failed to send instruction:', e);
    }
  }, [activeTerminalId, instructionText]);

  // Resize sidebar
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(200, Math.min(600, startWidth + delta));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  useEffect(() => {
    loadTerminalBindings();
  }, [loadTerminalBindings]);

  useEffect(() => {
    const interval = setInterval(loadTerminalBindings, 5000);
    return () => clearInterval(interval);
  }, [loadTerminalBindings]);

  const loadPresets = useCallback(async () => {
    if (!window.deskflowAPI) return;
    try {
      const data = await window.deskflowAPI.getTerminalPresets(selectedProject || undefined);
      setPresets(data || []);
    } catch (e) {
      logOnce('terminal-presets', '[TerminalPage] Failed to load presets:', e);
    }
  }, [selectedProject]);

  const loadSessions = useCallback(async () => {
    if (!window.deskflowAPI) return;
    try {
      const data = await window.deskflowAPI.getTerminalSessions(selectedProject || undefined, 20);
      setSessions(data || []);
    } catch (e) {
      logOnce('terminal-sessions', '[TerminalPage] Failed to load sessions:', e);
    }
  }, [selectedProject]);

  const loadProjects = useCallback(async () => {
    if (!window.deskflowAPI) return;
    try {
      const data = await window.deskflowAPI.getProjects();
      setProjects(data || []);
    } catch (e) {
      logOnce('terminal-projects', '[TerminalPage] Failed to load projects:', e);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    // Load project from localStorage if no propProjectId
    if (!propProjectId) {
      const stored = localStorage.getItem('terminal-project');
      if (stored) setSelectedProject(stored);
    }
  }, [loadProjects]);

  useEffect(() => {
    if (activeTab === 'presets') {
      loadPresets();
    } else if (activeTab === 'sessions') {
      loadSessions();
    } else if (activeTab === 'map' && window.deskflowAPI) {
      window.deskflowAPI.getAIUsageSummary('day').then(setAiSummary).catch(() => {});
    }
  }, [activeTab, selectedProject, loadPresets, loadSessions]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('terminal-activeTab', activeTab);
  }, [activeTab]);

  const spawnTerminal = useCallback(async (terminalId: string, cwd?: string) => {
    console.log('[TerminalPage] spawnTerminal called:', terminalId, cwd);
    if (!window.deskflowAPI) {
      console.log('[TerminalPage] No deskflowAPI!');
      return false;
    }
    try {
      const result = await window.deskflowAPI.spawnTerminal(terminalId, cwd || '');
      console.log('[TerminalPage] spawnTerminal result:', result);
      if (!result.success) {
        logOnce('terminal-spawn', '[TerminalPage] Failed to spawn shell:', result.error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[TerminalPage] spawnTerminal error:', e);
      logOnce('terminal-spawn', '[TerminalPage] Failed to spawn terminal:', e);
      return false;
    }
  }, []);

  const handleLayoutChange = useCallback((layout: PaneNode) => {
    setTerminalLayout(layout);
  }, []);

  const flattenPanes = useCallback((node: PaneNode): PaneNode[] => {
    if (node.type === 'leaf') {
      return [node];
    }
    if (node.children) {
      return node.children.flatMap(flattenPanes);
    }
    return [];
  }, []);

  const handleAddPreset = useCallback(async () => {
    if (!window.deskflowAPI || !newPreset.name || !newPreset.command) return;
    try {
      const result = await window.deskflowAPI.addTerminalPreset({
        projectId: selectedProject || undefined,
        name: newPreset.name,
        command: newPreset.command,
        category: newPreset.category || undefined,
      });
      if (result.success) {
        setNewPreset({ name: '', command: '', category: '' });
        setShowAddPreset(false);
        loadPresets();
      } else {
        logOnce('terminal-add-preset', '[TerminalPage] Failed to add preset:', result.error);
      }
    } catch (e) {
      logOnce('terminal-add-preset', '[TerminalPage] Failed to add preset:', e);
    }
  }, [newPreset, selectedProject, loadPresets]);

  const handleRemovePreset = useCallback(async (presetId: string) => {
    if (!window.deskflowAPI) return;
    try {
      await window.deskflowAPI.removeTerminalPreset(presetId);
      loadPresets();
    } catch (e) {
      console.warn('[TerminalPage] Failed to remove preset:', e);
    }
  }, [loadPresets]);

  const handleExecutePreset = useCallback(async (preset: Preset) => {
    if (!window.deskflowAPI) return;
    try {
      await window.deskflowAPI.executeTerminalPreset(preset.id);
    } catch (e) {
      console.warn('[TerminalPage] Failed to execute preset:', e);
    }
  }, []);

  const handleResumeSession = useCallback(async (session: Session) => {
    if (!window.deskflowAPI || !session.resume_id) return;
    try {
      const resumeId = await window.deskflowAPI.getTerminalSessionResumeId(session.id);
      if (resumeId) {
        const command = session.agent === 'claude' || session.agent === 'Claude Code'
          ? `claude resume ${resumeId}`
          : `opencode resume ${resumeId}`;
        window.deskflowAPI.writeTerminal('active', command + '\n');
      }
    } catch (e) {
      console.warn('[TerminalPage] Failed to resume session:', e);
    }
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex bg-black text-white">
      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">DeskFlow Terminal</span>
            {projects.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300"
                  >
                    <option value="">Select Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {selectedProject && projects.find(p => p.id === selectedProject) && (
                    <div className="text-xs text-zinc-500 mt-1 flex gap-2">
                      <span>{projects.find(p => p.id === selectedProject)?.primary_language}</span>
                      <span>{projects.find(p => p.id === selectedProject)?.vcs_type}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    console.log('[TerminalPage] Open Terminal clicked, selectedProject:', selectedProject);
                    if (!selectedProject) {
                      alert('Please select a project first');
                      return;
                    }
                    const proj = projects.find(p => p.id === selectedProject);
                    console.log('[TerminalPage] Found project:', proj);
                    if (proj) {
                      // Add terminal to layout first
                      const termId = `term-${Date.now()}`;
                      const newPane = {
                        id: termId,
                        type: 'leaf' as const,
                        terminalId: termId,
                        size: 50
                      };
                      
                      // If layout is a single leaf, convert to split
                      if (terminalLayout && terminalLayout.type === 'leaf') {
                        const newLayout = {
                          id: 'root',
                          type: 'split' as const,
                          splitType: 'horizontal' as const,
                          direction: 'right' as const,
                          size: 100,
                          children: [terminalLayout, newPane]
                        };
                        setTerminalLayout(newLayout);
                      } else {
                        // Add to existing split layout
                        // For simplicity, just create a new split layout
                        const newLayout = {
                          id: 'root',
                          type: 'split' as const,
                          splitType: 'horizontal' as const,
                          direction: 'right' as const,
                          size: 100,
                          children: [terminalLayout || { id: 'root', type: 'leaf' as const, terminalId: 'term-initial', size: 50 }, newPane]
                        };
                        setTerminalLayout(newLayout);
                      }
                      
                      // Then spawn the terminal
                      console.log('[TerminalPage] Calling spawnTerminal with:', termId, proj.path);
                      await spawnTerminal(termId, proj.path);
                      
                      // Register terminal binding
                      await registerTerminal(termId);
                      
                      // Save terminal session for health tracking
                      await window.deskflowAPI?.saveTerminalSession?.({
                        id: termId,
                        projectId: selectedProject,
                        agent: 'claude',
                        topic: `Terminal session for ${proj.name}`,
                        workingDirectory: proj.path
                      });
                    }
                  }}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Open Terminal
                </button>
              </div>
            )}
            
            {/* Terminal Status Indicator */}
            {activeTerminalId && terminalBindings[activeTerminalId] && (
              <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-zinc-800/50 rounded text-xs">
                <TerminalIcon className="w-3 h-3 text-green-400" />
                <span className="text-zinc-400">
                  {terminalBindings[activeTerminalId].agentType || 'claude'}
                </span>
                {terminalBindings[activeTerminalId].activeProblemId && (
                  <span className="px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">
                    #{terminalBindings[activeTerminalId].activeProblemId}
                  </span>
                )}
                <span className="text-green-400">●</span>
              </div>
            )}
            
            {/* Quick Instruction Input */}
            {activeTerminalId && (
              <button
                onClick={() => setShowInstructionInput(!showInstructionInput)}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                Send
              </button>
            )}
          </div>
        </div>
        
        {/* Instruction Input Bar */}
        {showInstructionInput && activeTerminalId && (
          <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendInstruction()}
                placeholder="Type instruction to send to terminal..."
                className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500"
              />
              <button
                onClick={sendInstruction}
                disabled={!instructionText.trim()}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs rounded flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                Send
              </button>
              <button
                onClick={() => { setShowInstructionInput(false); setInstructionText(''); }}
                className="px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        <div className="flex-1 relative">
          <TerminalLayout spawnTerminal={spawnTerminal} onLayoutChange={handleLayoutChange} />
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs p-2 rounded">
            Terminal Layout: {terminalLayout ? `${terminalLayout.type} (${terminalLayout.terminalId || 'split'})` : 'null'}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div 
          className="bg-zinc-900 border-l border-zinc-800 flex flex-col relative"
          style={{ width: sidebarWidth }}
        >
          {/* Resize Handle */}
          <div 
            className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-green-500/50 transition-colors ${isResizing ? 'bg-green-500' : ''}`}
            onMouseDown={startResize}
          />
          
          {/* Sidebar Header with Collapse Button */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-500 font-medium">Terminal</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Tab Headers */}
          <div className="flex border-b border-zinc-800 flex-wrap">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-2 py-2 text-xs font-medium ${
                activeTab === 'presets' ? 'text-green-400 border-b-2 border-green-500' : 'text-zinc-400'
              }`}
            >
              <Zap className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-2 py-2 text-xs font-medium ${
                activeTab === 'sessions' ? 'text-green-400 border-b-2 border-green-500' : 'text-zinc-400'
              }`}
            >
              <Clock className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-2 py-2 text-xs font-medium ${
                activeTab === 'map' ? 'text-green-400 border-b-2 border-green-500' : 'text-zinc-400'
              }`}
            >
              <Monitor className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-2 py-2 text-xs font-medium ${
                activeTab === 'analytics' ? 'text-green-400 border-b-2 border-green-500' : 'text-zinc-400'
              }`}
            >
              <PieChart className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTab('problems')}
              className={`px-2 py-2 text-xs font-medium ${
                activeTab === 'problems' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-zinc-400 hover:text-purple-300'
              }`}
              title="Problems"
            >
              <AlertCircle className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-2 py-2 text-xs font-medium ${
                activeTab === 'requests' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-zinc-400 hover:text-blue-300'
              }`}
              title="Requests"
            >
              <FileText className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-2 py-2 text-xs font-medium ${
                activeTab === 'files' ? 'text-yellow-400 border-b-2 border-yellow-500' : 'text-zinc-400 hover:text-yellow-300'
              }`}
              title="Agent Files"
            >
              <Folder className="w-3 h-3" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* New Problem/Request buttons - always visible in problems/requests tabs */}
            {(activeTab === 'problems' || activeTab === 'requests') && (
              <div className="mb-2 flex gap-2">
                <button
                  onClick={() => {
                    if (activeTab === 'problems') setShowNewDialog(true);
                    else setShowNewRequestDialog(true);
                  }}
                  className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${
                    activeTab === 'problems' 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  New
                </button>
              </div>
            )}
            {/* Project Stats */}
            {selectedProject && projects.find(p => p.id === selectedProject) && (
              <div className="mb-4 p-2 bg-zinc-800/50 rounded-lg">
                <div className="text-xs text-zinc-400 mb-2">Project Stats</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Language:</span>
                    <span className="text-zinc-300">{projects.find(p => p.id === selectedProject)?.primary_language || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">VCS:</span>
                    <span className="text-zinc-300">{projects.find(p => p.id === selectedProject)?.vcs_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">IDE:</span>
                    <span className="text-zinc-300">{projects.find(p => p.id === selectedProject)?.default_ide || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'presets' && (
              <div>
                <button
                  onClick={() => setShowAddPreset(true)}
                  className="w-full mb-2 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Preset
                </button>

                {showAddPreset && (
                  <div className="mb-2 p-2 bg-zinc-800 rounded">
                    <input
                      type="text"
                      placeholder="Name (e.g., 'Run Tests')"
                      value={newPreset.name}
                      onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                      className="w-full mb-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Command (e.g., 'npm test')"
                      value={newPreset.command}
                      onChange={(e) => setNewPreset({ ...newPreset, command: e.target.value })}
                      className="w-full mb-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Category (optional)"
                      value={newPreset.category}
                      onChange={(e) => setNewPreset({ ...newPreset, category: e.target.value })}
                      className="w-full mb-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleAddPreset}
                        className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setShowAddPreset(false); setNewPreset({ name: '', command: '', category: '' }); }}
                        className="flex-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {presets.length === 0 ? (
                  <p className="text-xs text-zinc-500">No presets yet. Add one to get started.</p>
                ) : (
                  presets.map((preset) => (
                    <div key={preset.id} className="mb-2 p-2 bg-zinc-800 rounded group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-200">{preset.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => handleExecutePreset(preset)}
                            className="p-1 hover:bg-zinc-700 rounded"
                            title="Run"
                          >
                            <Play className="w-3 h-3 text-green-400" />
                          </button>
                          <button
                            onClick={() => handleRemovePreset(preset.id)}
                            className="p-1 hover:bg-zinc-700 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 font-mono truncate">{preset.command}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'sessions' && (
              <div>
                {sessions.length === 0 ? (
                  <p className="text-xs text-zinc-500">No sessions yet.</p>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id} className="mb-2 p-2 bg-zinc-800 rounded group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-200">{session.agent}</span>
                        {session.resume_id && (
                          <button
                            onClick={() => handleResumeSession(session)}
                            className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-green-200 text-xs rounded opacity-0 group-hover:opacity-100"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">{session.topic || 'No topic'}</div>
                      <div className="text-xs text-zinc-600 mt-1">
                        {formatDate(session.started_at)}
                        {session.total_cost_usd !== undefined && (
                          <span className="ml-2">${session.total_cost_usd.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'map' && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Visual map of terminal panes</p>
                {!terminalLayout ? (
                  <p className="text-xs text-zinc-600">No terminals open</p>
                ) : (
                  <div className="relative w-full aspect-square bg-zinc-900 rounded border border-zinc-700">
                    <div className="absolute inset-2 grid grid-cols-2 gap-1">
                      {flattenPanes(terminalLayout).map((pane, idx) => (
                        <button
                          key={pane.id}
                          className={`relative bg-zinc-800 rounded border ${
                            hoveredPane === pane.id ? 'border-green-500' : 'border-zinc-700'
                          } hover:border-green-500 cursor-pointer transition-colors`}
                          onMouseEnter={() => setHoveredPane(pane.id)}
                          onMouseLeave={() => setHoveredPane(null)}
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('focus-terminal', { detail: { terminalId: pane.terminalId || pane.id } }));
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-zinc-500">T{idx + 1}</span>
                          </div>
                          {hoveredPane === pane.id && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                              <div className="font-medium">{pane.terminalId || pane.id}</div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <p className="text-xs text-zinc-500 mb-3">AI Usage Summary</p>
                
                {/* Today's Overview */}
                <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-2">Today</div>
                  <div className="flex gap-4">
                    <div>
                      <div className="text-lg font-bold text-white">
                        {aiSummary?.totalTokens?.toLocaleString() || 0}
                      </div>
                      <div className="text-xs text-zinc-500">Tokens</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-emerald-400">
                        ${aiSummary?.totalCost?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-zinc-500">Cost</div>
                    </div>
                  </div>
                </div>

                {/* By Agent Breakdown */}
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-2">By Agent</div>
                  {!aiSummary?.byTool || Object.keys(aiSummary.byTool).length === 0 ? (
                    <p className="text-xs text-zinc-600">No data</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(aiSummary.byTool).map(([agent, data]: [string, any]) => (
                        <div key={agent} className="flex items-center justify-between">
                          <span className="text-xs text-zinc-300 truncate">{agent}</span>
                          <span className="text-xs text-zinc-500">
                            {data.tokens?.toLocaleString() || 0} tokens
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'problems' && (
              <ProblemsTab projectId={selectedProject} />
            )}

            {activeTab === 'requests' && (
              <RequestsTab onNewRequest={() => setShowNewRequestDialog(true)} />
            )}

            {activeTab === 'files' && (
              <FilesTab projectId={selectedProject} projects={projects} />
            )}

            {showNewRequestDialog && (
              <NewRequestDialog
                onClose={() => setShowNewRequestDialog(false)}
                onCreate={() => { setShowNewRequestDialog(false); }}
              />
            )}
          </div>
        </div>
      )}

      {/* Collapse Button - shown when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 z-50 border-l border-zinc-700"
          style={{ transform: 'translateY(-50%)' }}
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PROBLEMS TAB COMPONENT
// ─────────────────────────────────────────────

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

const ProblemsTab: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [projectPath, setProjectPath] = useState<string>('');

  const loadProblems = useCallback(async () => {
    try {
      const result = await window.deskflowAPI?.getProblems?.(projectId);
      if (result?.success) {
        setProblems(result.data || []);
        if (result.projectPath) setProjectPath(result.projectPath);
      }
    } catch (e) {
      console.error('[ProblemsTab] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProblems();
    const interval = setInterval(loadProblems, 5000);
    return () => clearInterval(interval);
  }, [loadProblems]);

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
        <div className="text-[10px] text-zinc-500 truncate" title={projectPath}>
          📁 {projectPath || 'No project selected'}
        </div>
        {projectPath && (
          <div className="text-[10px] text-zinc-600 truncate mt-0.5">
            agent/PROBLEMS.md • {problems.length} issues parsed
          </div>
        )}
        {!projectPath && (
          <div className="text-[10px] text-yellow-500 mt-0.5">
            ⚠️ Select a project to view problems
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

  const handleSendInstructions = async () => {
    if (!additionalInstructions.trim() || !problem.terminal_id) return;
    await window.deskflowAPI?.terminalWrite?.(problem.terminal_id, additionalInstructions + '\n');
    setAdditionalInstructions('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 max-h-[80vh] overflow-y-auto">
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
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
              >
                Send
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
}> = ({ onClose, onCreate }) => {
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
      skill_id: selectedSkill || undefined
    });
    if (result?.success) onCreate();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
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
              <label className="block text-xs text-gray-400 mb-1">Skill (optional)</label>
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="">No skill</option>
                {skills.map(skill => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
                ))}
              </select>
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

// ─────────────────────────────────────────────
// REQUESTS TAB COMPONENT
// ─────────────────────────────────────────────

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

const REQUEST_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'Pending': { color: 'bg-yellow-500', label: 'Pending' },
  'In Progress': { color: 'bg-blue-500', label: 'In Progress' },
  'Completed': { color: 'bg-green-500', label: 'Completed' },
  'Cancelled': { color: 'bg-gray-500', label: 'Cancelled' }
};

const RequestsTab: React.FC<{ onNewRequest: () => void }> = ({ onNewRequest }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const result = await window.deskflowAPI?.getRequests?.();
      if (result?.success) {
        setRequests(result.data || []);
      }
    } catch (e) {
      console.error('[RequestsTab] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

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

      {/* Requests List */}
      {loading ? (
        <div className="text-xs text-zinc-500 py-4 text-center">Loading...</div>
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
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// FILES TAB COMPONENT
// ─────────────────────────────────────────────

interface AgentFile {
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
}

const FilesTab: React.FC<{ projectId?: string; projects?: { id: string; name: string; path: string }[] }> = ({ projectId, projects }) => {
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [initStatus, setInitStatus] = useState<'idle' | 'checking' | 'ready' | 'init-ok' | 'error'>('idle');

  const project = projects?.find(p => p.id === projectId);
  const projectPath = project?.path || '';

  const loadFiles = useCallback(async () => {
    if (!window.deskflowAPI || !projectPath) {
      setLoading(false);
      setInitStatus('idle');
      return;
    }
    setLoading(true);
    setError(null);
    setInitStatus('checking');
    try {
      const result = await window.deskflowAPI.readAgentFiles?.(projectPath);
      if (result?.success) {
        setFiles(result.data || []);
        setInitStatus('ready');
      } else {
        setError(result?.error || 'Failed to load files');
        setInitStatus('error');
      }
    } catch (e) {
      console.error('[FilesTab] Failed to load:', e);
      setError('Failed to load files');
      setInitStatus('error');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const handleSetup = async () => {
    if (!window.deskflowAPI || !projectPath || !projectId) return;
    setInitStatus('checking');
    try {
      const result = await window.deskflowAPI.trackerMindSetup?.('init-all', projectId);
      if (result?.success) {
        setInitStatus('init-ok');
        loadFiles();
      } else {
        setError(result?.error || 'Setup failed');
        setInitStatus('error');
      }
    } catch (e) {
      console.error('[FilesTab] Setup failed:', e);
      setError('Setup failed');
      setInitStatus('error');
    }
  };

  const loadFileContent = useCallback(async (file: AgentFile) => {
    if (!window.deskflowAPI || file.isDirectory || !projectPath) return;
    try {
      const result = await window.deskflowAPI.readAgentFile?.(file.path, projectPath);
      if (result?.success) {
        setFileContent(result.data);
      }
    } catch (e) {
      console.error('[FilesTab] Failed to load content:', e);
    }
  }, [projectPath]);

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 10000);
    return () => clearInterval(interval);
  }, [loadFiles]);

  const handleFileClick = (file: AgentFile) => {
    setSelectedFile(file.name);
    loadFileContent(file);
  };

  const statusColors: Record<string, string> = {
    'idle': 'text-zinc-500',
    'checking': 'text-yellow-400',
    'ready': 'text-green-400',
    'init-ok': 'text-green-400',
    'error': 'text-red-400'
  };
  const statusLabels: Record<string, string> = {
    'idle': '⚪ Not initialized',
    'checking': '⏳ Checking...',
    'ready': '✅ Ready',
    'init-ok': '✅ Initialized',
    'error': '❌ Error'
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Setup button */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs ${statusColors[initStatus]}`}>
          {statusLabels[initStatus]}
        </span>
        {projectPath && (
          <button
            onClick={handleSetup}
            disabled={initStatus === 'checking'}
            className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white text-xs rounded flex items-center gap-1"
            title="Initialize agent directory structure"
          >
            <Zap className="w-3 h-3" />
            {initStatus === 'ready' || initStatus === 'init-ok' ? 'Re-init' : 'Setup'}
          </button>
        )}
      </div>

      {/* Project path display */}
      {projectPath ? (
        <div className="mb-2 px-2 py-1.5 bg-zinc-800/50 rounded">
          <div className="text-xs text-zinc-300 truncate" title={projectPath}>
            📂 {project?.name || 'Project'}
          </div>
          <div className="text-[10px] text-zinc-500 truncate mt-0.5" title={projectPath}>
            {projectPath}
          </div>
        </div>
      ) : (
        <div className="mb-2 px-2 py-1.5 bg-zinc-800/50 rounded">
          <div className="text-xs text-yellow-400">⚠️ No project selected</div>
          <div className="text-[10px] text-zinc-600 mt-0.5">Select a project above to view agent files</div>
        </div>
      )}

      {/* Files List */}
      {loading ? (
        <div className="text-xs text-yellow-400 py-4 text-center">⏳ Loading agent files...</div>
      ) : error ? (
        <div className="text-xs text-red-400 py-4 text-center">{error}</div>
      ) : !projectPath ? (
        <div className="text-xs text-zinc-500 py-4 text-center">
          Select a project to view agent files
        </div>
      ) : files.length === 0 ? (
        <div className="text-xs text-zinc-500 py-4 text-center">
          No agent/ files found.<br />
          Click <strong>Setup</strong> to initialize.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="text-[10px] text-zinc-600 mb-1 px-1">
            {files.length} file{files.length !== 1 ? 's' : ''} in agent/
          </div>
          {files.map((file) => (
            <div
              key={file.path}
              onClick={() => handleFileClick(file)}
              className={`p-2 rounded mb-1 cursor-pointer flex items-center gap-2 ${
                selectedFile === file.name 
                  ? 'bg-zinc-700 border border-zinc-600' 
                  : 'bg-zinc-800 hover:bg-zinc-750'
              }`}
            >
              <Folder className={`w-4 h-4 ${file.isDirectory ? 'text-yellow-400' : 'text-zinc-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{file.name}</div>
                <div className="text-[10px] text-zinc-600 truncate">{file.path}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Content Preview */}
      {selectedFile && fileContent && (
        <div className="mt-2 p-2 bg-zinc-900 rounded border border-zinc-700 max-h-48 overflow-y-auto">
          <div className="text-xs text-zinc-400 mb-1 flex items-center justify-between">
            <span>📄 {selectedFile}</span>
            <span className="text-zinc-600">{(fileContent.length / 1024).toFixed(1)} KB</span>
          </div>
          <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap font-mono">
            {fileContent.substring(0, 2000)}
            {fileContent.length > 2000 && '\n...\n(truncated)'}
          </pre>
        </div>
      )}
    </div>
  );
};

// NewRequestDialog rendered inline within TerminalPage via showNewRequestDialog