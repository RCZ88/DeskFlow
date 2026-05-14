import { useState, useEffect } from 'react';

export interface SessionConfig {
  id: string;
  name: string;
  agentType: 'claude' | 'opencode';
  terminalMode: 'create' | 'select';
  selectedTerminal: string;
  initializeFile?: string;
  customSystemPrompt?: string;
  includeDefaultInit: boolean;
  problemIds: string[];
  requestIds: string[];
  // Pre-built init content (used in initialize mode)
  initContent?: string;
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

interface NewSessionDialogProps {
  open: boolean;
  mode?: 'create' | 'initialize';
  onClose: () => void;
  onCreate: (config: SessionConfig) => void;
  problems: Problem[];
  requests: Request[];
  projectPath: string;
  terminalTabs: Record<string, { name: string; agent: string }>;
  defaultAgent: string;
}

export function NewSessionDialog({
  open,
  mode = 'create',
  onClose,
  onCreate,
  problems,
  requests,
  projectPath,
  terminalTabs,
  defaultAgent,
}: NewSessionDialogProps) {
  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState<'claude' | 'opencode'>('opencode');
  const [terminalMode, setTerminalMode] = useState<'create' | 'select'>('create');
  const [selectedTerminal, setSelectedTerminal] = useState('');
  const [includeDefaultInit, setIncludeDefaultInit] = useState(true);
  const [customInitFile, setCustomInitFile] = useState('');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [initFiles, setInitFiles] = useState<string[]>([]);
  const [agentFiles, setAgentFiles] = useState<{ name: string; path: string }[]>([]);
  const [selectedAgentFiles, setSelectedAgentFiles] = useState<string[]>([]);
  const [agentsMdContent, setAgentsMdContent] = useState('');
  const [loadingAgentsMd, setLoadingAgentsMd] = useState(false);
  const [includeAgentsMd, setIncludeAgentsMd] = useState(true);
  const [baseSystemPrompt, setBaseSystemPrompt] = useState('');

  useEffect(() => {
    if (open) {
      setAgentType(defaultAgent as 'claude' | 'opencode');
      setTerminalMode('create');
      setSelectedTerminal('');
      setName('');
      setIncludeDefaultInit(true);
      setCustomInitFile('');
      setCustomSystemPrompt('');
      setSelectedProblems([]);
      setSelectedRequests([]);
      setSelectedAgentFiles([]);
      setIncludeAgentsMd(true);
      loadInitFiles();
      if (mode === 'initialize' && projectPath) {
        loadAgentsContext();
      }
    }
  }, [open, defaultAgent, mode, projectPath]);

  const loadInitFiles = async () => {
    if (!projectPath) return;
    try {
      const result = await (window as any).deskflowAPI?.listInitFiles?.(projectPath);
      if (result?.success) {
        setInitFiles(result.data || []);
      }
    } catch {}
  };

  const loadAgentsContext = async () => {
    setLoadingAgentsMd(true);
    try {
      const dapi = (window as any).deskflowAPI;
      if (!dapi) return;

      // Read agents.md
      const agentsResult = await dapi.readAgentFileContent?.('agents.md', projectPath);
      if (agentsResult?.success && agentsResult.data) {
        setAgentsMdContent(agentsResult.data);
      }

      // List agent directory files
      const filesResult = await dapi.listAgentDirFiles?.(projectPath);
      if (filesResult?.success) {
        setAgentFiles(filesResult.data || []);
      }

      // Read base system prompt
      const promptResult = await dapi.getBaseSystemPrompt?.(agentType);
      if (promptResult?.success && promptResult.data) {
        setBaseSystemPrompt(promptResult.data);
      }
    } catch {}
    setLoadingAgentsMd(false);
  };

  const handleCreate = async () => {
    const sessionId = `session-${Date.now()}`;
    const config: SessionConfig = {
      id: sessionId,
      name: name.trim() || (mode === 'initialize' ? `Initialize ${agentType}` : `${agentType} session`),
      agentType,
      terminalMode,
      selectedTerminal,
      initializeFile: customInitFile || undefined,
      customSystemPrompt: customSystemPrompt || baseSystemPrompt || undefined,
      includeDefaultInit: mode === 'create' ? includeDefaultInit : false,
      problemIds: selectedProblems,
      requestIds: selectedRequests,
    };

    // In initialize mode, build the complete init content
    if (mode === 'initialize') {
      const parts: string[] = [];

      // 1. Include Initialize.md first (the main init instructions)
      const dapi = (window as any).deskflowAPI;
      if (dapi) {
        const initMdResult = await dapi.readAgentFileContent?.('Initialize.md', projectPath);
        if (initMdResult?.success && initMdResult.data) {
          parts.push(initMdResult.data);
        }
      }

      // 2. Include agents.md if selected
      if (includeAgentsMd && agentsMdContent) {
        parts.push(agentsMdContent);
      }

      // 3. Include selected agent files (with actual content)
      if (selectedAgentFiles.length > 0 && dapi) {
        for (const file of selectedAgentFiles) {
          const fileResult = await dapi.readAgentFileContent?.(file, projectPath);
          if (fileResult?.success && fileResult.data) {
            parts.push(`\n## File: ${file}\n\`\`\`\n${fileResult.data}\n\`\`\`\n`);
          }
        }
      }

      // 4. Include problem/request context
      if (selectedProblems.length > 0) {
        const ctx = selectedProblems.map(id => `- ${problems.find(p => p.id === id)?.title || id}`).join('\n');
        parts.push(`\n## Context: Problems\n${ctx}\n`);
      }
      if (selectedRequests.length > 0) {
        const ctx = selectedRequests.map(id => `- ${requests.find(r => r.id === id)?.title || id}`).join('\n');
        parts.push(`\n## Context: Requests\n${ctx}\n`);
      }

      config.initContent = parts.join('\n\n---\n\n');
    }

    onCreate(config);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto border border-zinc-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{mode === 'initialize' ? 'Initialize Agent Workspace' : 'Create New Session'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Session Name */}
        <div className="mb-4">
          <label className="block text-xs text-zinc-400 mb-1">Session Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
            placeholder="e.g. Fix login bug"
          />
        </div>

        {/* AI Agent */}
        <div className="mb-4">
          <label className="block text-xs text-zinc-400 mb-1">AI Agent</label>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value as 'claude' | 'opencode')}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
          >
            <option value="claude">Claude Code</option>
            <option value="opencode">OpenCode</option>
          </select>
        </div>

        {/* Terminal */}
        <div className="mb-4">
          <label className="block text-xs text-zinc-400 mb-2">Terminal</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-850">
              <input
                type="radio"
                name="terminalMode"
                checked={terminalMode === 'create'}
                onChange={() => setTerminalMode('create')}
                className="accent-green-500"
              />
              <div>
                <span className="text-sm text-white">Create new terminal</span>
                <p className="text-[10px] text-zinc-500">Launches a new terminal with the selected agent</p>
              </div>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-850">
              <input
                type="radio"
                name="terminalMode"
                checked={terminalMode === 'select'}
                onChange={() => setTerminalMode('select')}
                className="accent-green-500"
              />
              <div>
                <span className="text-sm text-white">Use existing terminal</span>
                <p className="text-[10px] text-zinc-500">Attach session to a running terminal</p>
              </div>
            </label>
          </div>
          {terminalMode === 'select' && (
            <select
              value={selectedTerminal}
              onChange={(e) => setSelectedTerminal(e.target.value)}
              className="w-full mt-2 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
            >
              <option value="">Select a terminal...</option>
              {Object.entries(terminalTabs).map(([id, tab]) => (
                <option key={id} value={id}>
                  {tab.name} ({tab.agent})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Initialization */}
        <div className="mb-4 border-t border-zinc-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-2">
            {mode === 'initialize' ? 'Agent Context & Init Files' : 'Initialization'}
          </h3>

          {mode === 'initialize' ? (
            <>
              {/* agents.md */}
              <div className="mb-3">
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={includeAgentsMd}
                    onChange={(e) => setIncludeAgentsMd(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-zinc-300">Include <code className="text-amber-400">agents.md</code></span>
                </label>
                {loadingAgentsMd ? (
                  <div className="text-xs text-zinc-500">Loading agents.md...</div>
                ) : agentsMdContent ? (
                  <div className="max-h-24 overflow-y-auto bg-zinc-900 rounded p-2 border border-zinc-700">
                    <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap">{agentsMdContent.substring(0, 500)}{agentsMdContent.length > 500 ? '\n...(truncated)' : ''}</pre>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">No agents.md found in project</div>
                )}
              </div>

              {/* Agent directory files */}
              <div className="mb-3">
                <label className="block text-xs text-zinc-500 mb-1">Additional Agent Files</label>
                <div className="max-h-28 overflow-y-auto space-y-1 bg-zinc-900/50 rounded p-1">
                  {agentFiles.length === 0 ? (
                    <div className="text-[10px] text-zinc-600 px-1 py-2 text-center">No files in agent/ directory</div>
                  ) : agentFiles.map((f) => (
                    <label key={f.path} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAgentFiles.includes(f.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAgentFiles([...selectedAgentFiles, f.name]);
                          } else {
                            setSelectedAgentFiles(selectedAgentFiles.filter(x => x !== f.name));
                          }
                        }}
                        className="accent-amber-500"
                      />
                      <span className="text-xs text-zinc-300">{f.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Base system prompt (preview) */}
              {baseSystemPrompt && (
                <div className="mb-3">
                  <label className="block text-xs text-zinc-500 mb-1">Base System Prompt (from prefs)</label>
                  <div className="max-h-20 overflow-y-auto bg-zinc-900 rounded p-2 border border-zinc-700">
                    <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap">{baseSystemPrompt.substring(0, 300)}{baseSystemPrompt.length > 300 ? '\n...' : ''}</pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={includeDefaultInit}
                  onChange={(e) => setIncludeDefaultInit(e.target.checked)}
                  className="accent-cyan-500"
                />
                <span className="text-sm text-zinc-300">Include default INITIALIZE.md</span>
              </label>

              <div className="mb-3">
                <label className="block text-xs text-zinc-500 mb-1">Custom Init File</label>
                <select
                  value={customInitFile}
                  onChange={(e) => setCustomInitFile(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="">None</option>
                  {initFiles.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Additional System Prompt</label>
                <textarea
                  value={customSystemPrompt}
                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm h-20 resize-none"
                  placeholder="Extra instructions for this session..."
                />
              </div>
            </>
          )}
        </div>

        {/* Problems */}
        <div className="mb-4 border-t border-zinc-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-2">Related Problems</h3>
          <div className="max-h-28 overflow-y-auto space-y-1">
            {problems.filter((p) => p.status !== 'Fixed').length === 0 ? (
              <p className="text-xs text-zinc-500">No open problems</p>
            ) : (
              problems.filter((p) => p.status !== 'Fixed').map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProblems.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProblems([...selectedProblems, p.id]);
                      } else {
                        setSelectedProblems(selectedProblems.filter((x) => x !== p.id));
                      }
                    }}
                    className="accent-cyan-500"
                  />
                  <span className="text-sm text-zinc-300 truncate">{p.id}: {p.title}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Requests */}
        <div className="mb-4 border-t border-zinc-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-2">Related Requests</h3>
          <div className="max-h-28 overflow-y-auto space-y-1">
            {requests.filter((r) => r.status !== 'implemented').length === 0 ? (
              <p className="text-xs text-zinc-500">No pending requests</p>
            ) : (
              requests.filter((r) => r.status !== 'implemented').map((r) => (
                <label key={r.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRequests.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRequests([...selectedRequests, r.id]);
                      } else {
                        setSelectedRequests(selectedRequests.filter((x) => x !== r.id));
                      }
                    }}
                    className="accent-cyan-500"
                  />
                  <span className="text-sm text-zinc-300 truncate">{r.id}: {r.title}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className={`flex-1 px-4 py-2 text-white rounded text-sm font-medium ${
              mode === 'initialize'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
                : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500'
            }`}
          >
            {mode === 'initialize' ? 'Initialize Agent' : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
