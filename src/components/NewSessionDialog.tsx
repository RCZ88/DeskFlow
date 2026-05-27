import { useState, useEffect, Fragment } from 'react';
import { ChevronRight, BookOpen, Zap, Network, FolderTree, FileText, Bot, ChevronDown, Palette } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT } from '../lib/defaults';
import { assembleContext } from '../services/ContextService';
import { WORKSPACE_CONFIG_PREF_KEY } from './ContextSidebar';
import type { WorkspaceConfig } from './ContextSidebar';

const SUPPORTED_AGENTS = [
  { id: 'claude', name: 'Claude Code' },
  { id: 'opencode', name: 'OpenCode' },
  { id: 'aider', name: 'Aider' },
  { id: 'codex', name: 'Codex CLI' },
  { id: 'gemini', name: 'Gemini CLI' },
];

export interface SessionConfig {
  id: string;
  name: string;
  agentType: string;
  terminalMode: 'create' | 'select';
  selectedTerminal: string;
  resumeId?: string;
  initializeFile?: string;
  customSystemPrompt?: string;
  includeDefaultInit: boolean;
  initContent?: string;
  modelTier?: 'top' | 'mid' | 'low';
  contextConfig?: {
    total_token_budget: number;
    model_tier: 'top' | 'mid' | 'low';
    systems: {
      llm_wiki: { enabled: boolean; max_tokens: number };
      obsidian_skills: { enabled: boolean; max_tokens: number };
      graphify: { enabled: boolean; include_summary: boolean; max_tokens: number };
      para: { enabled: boolean; max_tokens: number };
      qmd: { enabled: boolean; max_tokens: number };
      automations: { enabled: boolean; max_tokens: number };
      design_skills: {
        enabled: boolean;
        max_tokens: number;
        skills: string[];
        levels: {
          design_variance: number;
          motion_intensity: number;
          visual_density: number;
        };
        include_references: boolean;
      };
    };
    summarization: { enabled: boolean; message_threshold: number };
    deep_memory: { enabled: boolean; pattern_detection: boolean };
  };
}

interface SystemInfo {
  id: string;
  name: string;
  icon: any;
  accentColor: string;
  itemCount: number;
  itemLabel: string;
  lastBuilt: string | null;
  maxTokens: number;
  enabled: boolean;
  onToggle: () => void;
}

interface NewSessionDialogProps {
  open: boolean;
  mode?: 'create' | 'new-agent' | 'setup';
  onClose: () => void;
  onCreate: (config: SessionConfig) => void;
  projectPath: string;
  projectPrompt?: string;
  terminalTabs: Record<string, { name: string; agent: string }>;
  defaultAgent: string;
  initialTerminalMode?: 'create' | 'select';
  initialSelectedTerminal?: string;
  defaultName?: string;
}

function SystemToggleCard({ system }: { system: SystemInfo }) {
  const toggleColors = {
    llm_wiki: { on: 'bg-blue-500/40', off: 'bg-zinc-700' },
    obsidian_skills: { on: 'bg-purple-500/40', off: 'bg-zinc-700' },
    graphify: { on: 'bg-cyan-500/40', off: 'bg-zinc-700' },
    para: { on: 'bg-teal-500/40', off: 'bg-zinc-700' },
    qmd: { on: 'bg-amber-500/40', off: 'bg-zinc-700' },
    automations: { on: 'bg-rose-500/40', off: 'bg-zinc-700' },
    design_skills: { on: 'bg-pink-500/40', off: 'bg-zinc-700' },
  };
  const dotColors = {
    llm_wiki: { on: 'left-3.5 bg-blue-400', off: 'left-0.5 bg-zinc-500' },
    obsidian_skills: { on: 'left-3.5 bg-purple-400', off: 'left-0.5 bg-zinc-500' },
    graphify: { on: 'left-3.5 bg-cyan-400', off: 'left-0.5 bg-zinc-500' },
    para: { on: 'left-3.5 bg-teal-400', off: 'left-0.5 bg-zinc-500' },
    qmd: { on: 'left-3.5 bg-amber-400', off: 'left-0.5 bg-zinc-500' },
    automations: { on: 'left-3.5 bg-rose-400', off: 'left-0.5 bg-zinc-500' },
    design_skills: { on: 'left-3.5 bg-pink-400', off: 'left-0.5 bg-zinc-500' },
  };
  const c = toggleColors[system.id as keyof typeof toggleColors];
  const d = dotColors[system.id as keyof typeof dotColors];
  return (
    <div className={`border rounded-lg p-3 transition-colors ${system.enabled ? 'bg-zinc-800/40 border-zinc-600/50' : 'bg-zinc-900/30 border-zinc-700/30 opacity-70'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <system.icon className={`w-3.5 h-3.5 ${system.accentColor}`} />
          <span className="text-[11px] text-zinc-300 font-medium">{system.name}</span>
        </div>
        <button onClick={system.onToggle} className={`w-8 h-4 rounded-full transition-colors relative ${system.enabled ? c.on : c.off}`}>
          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${system.enabled ? d.on : d.off}`} />
        </button>
      </div>
      <div className="text-[9px] text-zinc-500">
        {system.itemCount > 0 ? `${system.itemCount} ${system.itemLabel}` : system.itemLabel} · ~{system.maxTokens} tokens
        {system.lastBuilt ? ` · Built ${formatRelTime(system.lastBuilt)}` : ''}
      </div>
    </div>
  );
}

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ContextMapVisualization({ systems, totalBudget }: { systems: SystemInfo[]; totalBudget: number }) {
  const nodes: Record<string, { x: number; y: number }> = {
    llm_wiki: { x: 60, y: 30 },
    obsidian_skills: { x: 220, y: 30 },
    graphify: { x: 60, y: 100 },
    para: { x: 220, y: 100 },
    qmd: { x: 30, y: 170 },
    automations: { x: 140, y: 170 },
    design_skills: { x: 250, y: 170 },
  };
  const edges = [
    { from: 'llm_wiki', to: 'obsidian_skills' },
    { from: 'graphify', to: 'para' },
    { from: 'llm_wiki', to: 'graphify' },
    { from: 'qmd', to: 'llm_wiki' },
    { from: 'automations', to: 'graphify' },
    { from: 'automations', to: 'para' },
    { from: 'design_skills', to: 'obsidian_skills' },
    { from: 'design_skills', to: 'para' },
  ];
  const accentHex: Record<string, string> = {
    llm_wiki: '#3b82f6',
    obsidian_skills: '#a855f7',
    graphify: '#22d3ee',
    para: '#14b8a6',
    qmd: '#f59e0b',
    automations: '#f43f5e',
    design_skills: '#ec4899',
  };
  const enabledIds = systems.filter(s => s.enabled).map(s => s.id);
  const usedTokens = systems.filter(s => s.enabled).reduce((sum, s) => sum + s.maxTokens, 0);
  const pct = Math.min((usedTokens / totalBudget) * 100, 100);
  return (
    <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Context Map</span>
        <span className="text-[9px] text-zinc-600">{enabledIds.length}/{systems.length} active · ~{usedTokens}/{totalBudget} tokens</span>
      </div>
      <svg width="280" height="240" className="w-full">
        {edges.map((edge, i) => {
          const f = nodes[edge.from];
          const t = nodes[edge.to];
          const active = enabledIds.includes(edge.from) && enabledIds.includes(edge.to);
          return (
            <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y}
              stroke={active ? 'rgba(34,211,238,0.25)' : 'rgba(63,63,70,0.25)'}
              strokeWidth={active ? 1.5 : 0.5}
              strokeDasharray={active ? 'none' : '4,4'} />
          );
        })}
        {systems.map(s => {
          const pos = nodes[s.id];
          const enabled = enabledIds.includes(s.id);
          return (
            <g key={s.id}>
              <circle cx={pos.x} cy={pos.y} r={enabled ? 22 : 18}
                fill={enabled ? accentHex[s.id] + '20' : 'transparent'}
                stroke={enabled ? accentHex[s.id] : '#52525b'}
                strokeWidth={enabled ? 1.5 : 0.5} />
              <text x={pos.x} y={pos.y + 28} textAnchor="middle" className="text-[7px] fill-zinc-500">
                {s.name.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500/60 to-emerald-500/40 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function NewSessionDialog({
  open,
  mode = 'create',
  onClose,
  onCreate,
  projectPath,
  projectPrompt = '',
  terminalTabs,
  defaultAgent,
  initialTerminalMode,
  initialSelectedTerminal,
  defaultName = 'New Agent',
}: NewSessionDialogProps) {
  const [name, setName] = useState(defaultName);
  useEffect(() => { setName(defaultName); }, [defaultName]);
  const [agentType, setAgentType] = useState('opencode');
  const [terminalMode, setTerminalMode] = useState<'create' | 'select'>('create');
  const [selectedTerminal, setSelectedTerminal] = useState('');
  const [includeDefaultInit, setIncludeDefaultInit] = useState(true);
  const [customInitFile, setCustomInitFile] = useState('');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [generalAdditions, setGeneralAdditions] = useState('');
  const [initFiles, setInitFiles] = useState<string[]>([]);
  const [agentFiles, setAgentFiles] = useState<{ name: string; path: string }[]>([]);
  const [selectedAgentFiles, setSelectedAgentFiles] = useState<string[]>([]);
  const [agentsMdContent, setAgentsMdContent] = useState('');
  const [loadingAgentsMd, setLoadingAgentsMd] = useState(false);
  const [includeAgentsMd, setIncludeAgentsMd] = useState(true);
  const [infraStatus, setInfraStatus] = useState({ graphifyAvailable: false, qmdAvailable: false, skillsCount: 0 });
  const [includeGraphify, setIncludeGraphify] = useState(true);
  const [includeQMD, setIncludeQMD] = useState(true);
  const [includeSkills, setIncludeSkills] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [totalBudget, setTotalBudget] = useState(7000);
  const [ctxLLMWiki, setCtxLLMWiki] = useState(true);
  const [ctxSkills, setCtxSkills] = useState(true);
  const [ctxGraphify, setCtxGraphify] = useState(true);
  const [ctxPara, setCtxPara] = useState(false);
  const [ctxQMD, setCtxQMD] = useState(true);
  const [ctxAutomations, setCtxAutomations] = useState(false);
  const [ctxSummarization, setCtxSummarization] = useState(true);
  const [ctxDeepMemory, setCtxDeepMemory] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ctxShowMap, setCtxShowMap] = useState(true);
  const [resumeSessionId, setResumeSessionId] = useState('');
  const [resumeSession, setResumeSession] = useState<any>(null);
  const [resumeError, setResumeError] = useState('');
  const [ctxDesignSkills, setCtxDesignSkills] = useState(true);
  const [modelTier, setModelTier] = useState<'top' | 'mid' | 'low'>('mid');

  useEffect(() => {
    if (open) {
      setAgentType(defaultAgent);
      setTerminalMode(initialTerminalMode || 'create');
      setSelectedTerminal(initialSelectedTerminal || '');
      setName('');
      setIncludeDefaultInit(true);
      setCustomInitFile('');
      setCustomSystemPrompt('');
      setGeneralAdditions('');
      setSelectedAgentFiles([]);
      setIncludeAgentsMd(true);
      setIncludeGraphify(true);
      setIncludeQMD(true);
      setIncludeSkills(true);
      setShowPreview(false);
      setTotalBudget(7000);
      setCtxLLMWiki(true);
      setCtxSkills(true);
      setCtxGraphify(true);
      setCtxPara(false);
      setCtxQMD(true);
      setCtxAutomations(false);
      setCtxSummarization(true);
      setCtxDeepMemory(true);
      setCtxShowMap(true);
      setCtxDesignSkills(true);
      setResumeSessionId('');
      setResumeSession(null);
      setResumeError('');
      loadInitFiles();
      const dapi = (window as any).deskflowAPI;
      if (dapi?.getPreferences) {
        dapi.getPreferences().then((prefs: any) => {
          if (prefs?.systemPrompts) {
            setGeneralAdditions(prefs.systemPrompts[defaultAgent] || prefs.systemPrompts.claude || '');
          }
          if (prefs?.total_token_budget) setTotalBudget(prefs.total_token_budget);
          if (prefs?.[WORKSPACE_CONFIG_PREF_KEY]) {
            try {
              const wsConfig: WorkspaceConfig = JSON.parse(prefs[WORKSPACE_CONFIG_PREF_KEY]);
              if (wsConfig.systems) {
                if (wsConfig.systems.llm_wiki != null) setCtxLLMWiki(wsConfig.systems.llm_wiki.enabled);
                if (wsConfig.systems.obsidian_skills != null) setCtxSkills(wsConfig.systems.obsidian_skills.enabled);
                if (wsConfig.systems.graphify != null) setCtxGraphify(wsConfig.systems.graphify.enabled);
                if (wsConfig.systems.para != null) setCtxPara(wsConfig.systems.para.enabled);
                if (wsConfig.systems.qmd_templates != null) setCtxQMD(wsConfig.systems.qmd_templates.enabled);
                if (wsConfig.systems.automations != null) setCtxAutomations(wsConfig.systems.automations.enabled);
                if (wsConfig.systems.design_skills != null) {
                  setCtxDesignSkills(wsConfig.systems.design_skills.enabled);
                }
              }
              if (wsConfig.behaviors) {
                if (wsConfig.behaviors.summarization != null) setCtxSummarization(wsConfig.behaviors.summarization);
                if (wsConfig.behaviors.deep_memory != null) setCtxDeepMemory(wsConfig.behaviors.deep_memory);
              }
            } catch (e) {
              console.warn('[NewSessionDialog] Could not load workspace settings:', e);
            }
          }
        });
      }
      if (mode !== 'create' && projectPath) {
        loadAgentsContext();
        checkInfra();
      }
    }
  }, [open, defaultAgent, mode, projectPath, initialTerminalMode, initialSelectedTerminal]);

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

      const agentsResult = await dapi.readAgentFileContent?.('agents.md', projectPath);
      if (agentsResult?.success && agentsResult.data) {
        setAgentsMdContent(agentsResult.data);
      }

      const filesResult = await dapi.listAgentDirFiles?.(projectPath);
      if (filesResult?.success) {
        setAgentFiles(filesResult.data || []);
      }
    } catch {}
    setLoadingAgentsMd(false);
  };

  const checkInfra = async () => {
    if (!projectPath) return;
    try {
      const dapi = (window as any).deskflowAPI;
      if (!dapi) return;

      const graphifyResult = await dapi.readProjectFile?.('graphify-out/GRAPH_REPORT.md', projectPath);
      const graphifyExists = !!(graphifyResult?.success && graphifyResult.data);

      const qmdResult = await dapi.listAgentDirFiles?.(projectPath);
      const qmdExists = qmdResult?.success && (qmdResult.data || []).length > 0;

      const skillsResult = await dapi.getSkills?.(projectPath);
      const skillsCount = skillsResult?.success ? (skillsResult.data?.length || 0) : 0;

      setInfraStatus({ graphifyAvailable: graphifyExists, qmdAvailable: qmdExists, skillsCount });
    } catch {}
  };

  const buildPreview = async () => {
    const previewContextConfig = {
      total_token_budget: totalBudget,
      model_tier: modelTier,
      systems: {
        llm_wiki: { enabled: ctxLLMWiki, files: [], max_tokens: 2000 },
        obsidian_skills: { enabled: ctxSkills, skills: [], max_tokens: 500 },
        graphify: { enabled: ctxGraphify, include_graph: false, include_summary: true, max_tokens: 500 },
        para: { enabled: ctxPara, areas: [], max_tokens: 300 },
        qmd: { enabled: ctxQMD, templates: [], max_tokens: 200 },
        automations: { enabled: ctxAutomations, max_tokens: 100 },
        design_skills: {
          enabled: ctxDesignSkills,
          max_tokens: 800,
          skills: ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill'],
          levels: { design_variance: 5, motion_intensity: 5, visual_density: 7 },
          include_references: true,
        },
      },
      summarization: { enabled: ctxSummarization, message_threshold: 10, max_recent_messages: 5, summary_style: 'brief' as const },
      deep_memory: { enabled: ctxDeepMemory, pattern_detection: true, max_patterns: 20, retention_days: 90 },
    };
    const content = await assembleContext(projectPath, previewContextConfig);
    setPreviewContent(content);
    setShowPreview(true);
  };

  const handleCreate = async () => {
    try {
      const sessionId = `session-${Date.now()}`;
      const sessionName = name.trim() || (mode === 'setup' ? `Setup ${agentType}` : mode === 'new-agent' ? `${agentType} agent` : `${agentType} session`);
      const config: SessionConfig = {
        id: sessionId,
        name: sessionName,
        agentType,
        terminalMode,
        selectedTerminal,
        resumeId: resumeSession?.resume_id || resumeSessionId || undefined,
        initializeFile: customInitFile || undefined,
        customSystemPrompt: customSystemPrompt || undefined,
        includeDefaultInit: mode === 'create' ? includeDefaultInit : false,
      };

      if (mode !== 'create') {
        config.contextConfig = {
          total_token_budget: totalBudget,
          model_tier: modelTier,
          systems: {
            llm_wiki: { enabled: ctxLLMWiki, max_tokens: 2000 },
            obsidian_skills: { enabled: ctxSkills, max_tokens: 500 },
            graphify: { enabled: ctxGraphify, include_summary: true, max_tokens: 500 },
            para: { enabled: ctxPara, max_tokens: 300 },
            qmd: { enabled: ctxQMD, max_tokens: 200 },
            automations: { enabled: ctxAutomations, max_tokens: 100 },
            design_skills: {
              enabled: ctxDesignSkills,
              max_tokens: 800,
              skills: ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill'],
              levels: { design_variance: 5, motion_intensity: 5, visual_density: 7 },
              include_references: true,
            },
          },
          summarization: { enabled: ctxSummarization, message_threshold: 10 },
          deep_memory: { enabled: ctxDeepMemory, pattern_detection: true },
        };
      }

      onCreate(config);
      onClose();
    } catch (err) {
      console.error('[NewSessionDialog] handleCreate error:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto border border-zinc-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{mode === 'new-agent' ? 'New Agent' : mode === 'setup' ? 'Setup Agent Workspace' : 'Create New Session'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

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

        <div className="mb-4">
          <label className="block text-xs text-zinc-400 mb-1">AI Agent</label>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
          >
            {SUPPORTED_AGENTS.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-zinc-400 mb-1">Model Tier</label>
          <select
            value={modelTier}
            onChange={(e) => setModelTier(e.target.value as 'top' | 'mid' | 'low')}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
          >
            <option value="top">Top (Opus 4, Gemini 2.5 Pro, Sonnet 4.5)</option>
            <option value="mid">Mid (Sonnet 4, GPT-4o, Gemini 2.0 Flash)</option>
            <option value="low">Low (mini, flash, haiku, small open-weights)</option>
          </select>
        </div>

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

        <div className="mb-4 border-t border-zinc-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-2">
            {mode === 'new-agent' ? 'Quick Setup' : mode === 'setup' ? 'Agent Context & Tools' : 'Setup'}
          </h3>

          {/* Resume Session ID — only in create mode */}
          {mode === 'create' && (
            <div className="mb-3 p-2 bg-zinc-900/30 rounded border border-zinc-700/30">
              <label className="text-[10px] text-zinc-500">Resume Session ID (optional)</label>
              <input
                type="text"
                value={resumeSessionId}
                onChange={(e) => { setResumeSessionId(e.target.value); setResumeError(''); }}
                placeholder="Paste session ID to resume..."
                className="w-full mt-1 bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 placeholder:text-zinc-700 focus:border-cyan-500/50 focus:outline-none"
              />
              {resumeSessionId && (
                <button
                  onClick={async () => {
                    const dapi = (window as any).deskflowAPI;
                    if (!dapi) return;
                    try {
                      const session = await dapi.getTerminalSessionById(resumeSessionId);
                      if (session) {
                        setAgentType(session.agent || 'claude');
                        setResumeSession(session);
                        setResumeError('');
                      } else {
                        setResumeError('Session not found');
                      }
                    } catch {
                      setResumeError('Failed to look up session');
                    }
                  }}
                  className="mt-1 text-[9px] text-cyan-400 hover:text-cyan-300"
                >
                  Lookup session
                </button>
              )}
              {resumeSession && (
                <div className="mt-1 text-[9px] text-green-400">Session found: {resumeSession.topic || resumeSession.id}</div>
              )}
              {resumeError && (
                <div className="mt-1 text-[9px] text-red-400">{resumeError}</div>
              )}
            </div>
          )}

          {/* Advanced Configuration toggle */}
          <div className="mb-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              <span>Advanced Configuration</span>
            </button>
          </div>

          {/* Full context configuration — shown in setup mode or when advanced is toggled */}
          {(mode === 'setup' || showAdvanced) ? (
            <div>
              {/* Build systems array for the context UI */}
              {(() => {
                const systems: SystemInfo[] = [
                  { id: 'llm_wiki', name: 'LLM Wiki', icon: BookOpen, accentColor: 'text-blue-400', itemCount: agentFiles.filter(f => !f.path.includes('skills') && !f.path.includes('templates')).length, itemLabel: 'files', lastBuilt: null, maxTokens: 2000, enabled: ctxLLMWiki, onToggle: () => setCtxLLMWiki(!ctxLLMWiki) },
                  { id: 'obsidian_skills', name: 'Obsidian Skills', icon: Zap, accentColor: 'text-purple-400', itemCount: infraStatus.skillsCount, itemLabel: 'skills', lastBuilt: null, maxTokens: 500, enabled: ctxSkills, onToggle: () => setCtxSkills(!ctxSkills) },
                  { id: 'graphify', name: 'Graphify', icon: Network, accentColor: 'text-cyan-400', itemCount: infraStatus.graphifyAvailable ? 1 : 0, itemLabel: infraStatus.graphifyAvailable ? 'nodes' : 'not configured', lastBuilt: null, maxTokens: 500, enabled: ctxGraphify, onToggle: () => setCtxGraphify(!ctxGraphify) },
                  { id: 'para', name: 'PARA', icon: FolderTree, accentColor: 'text-teal-400', itemCount: 0, itemLabel: 'areas', lastBuilt: null, maxTokens: 300, enabled: ctxPara, onToggle: () => setCtxPara(!ctxPara) },
                  { id: 'qmd', name: 'QMD Templates', icon: FileText, accentColor: 'text-amber-400', itemCount: infraStatus.qmdAvailable ? 1 : 0, itemLabel: infraStatus.qmdAvailable ? 'templates' : 'none', lastBuilt: null, maxTokens: 200, enabled: ctxQMD, onToggle: () => setCtxQMD(!ctxQMD) },
                  { id: 'automations', name: 'Automations', icon: Bot, accentColor: 'text-rose-400', itemCount: 0, itemLabel: 'automations', lastBuilt: null, maxTokens: 100, enabled: ctxAutomations, onToggle: () => setCtxAutomations(!ctxAutomations) },
                  { id: 'design_skills', name: 'Design Skills', icon: Palette, accentColor: 'text-pink-400', itemCount: infraStatus.skillsCount, itemLabel: 'design skills', lastBuilt: null, maxTokens: 800, enabled: ctxDesignSkills, onToggle: () => setCtxDesignSkills(!ctxDesignSkills) },
                ];
                return (
                  <Fragment>
                    {/* Context Systems toggle cards */}
                    <div className="mb-3 p-3 bg-zinc-900/50 rounded border border-zinc-700/50">
                      <h4 className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Context Systems</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {systems.map(s => <SystemToggleCard key={s.id} system={s} />)}
                      </div>
                    </div>

                    {/* Design Skills — configure tastes in Context Sidebar */}
                    {ctxDesignSkills && (
                      <div className="mb-3 p-3 bg-zinc-900/50 rounded border border-pink-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full" />
                          <h4 className="text-[10px] font-semibold text-pink-400 uppercase tracking-wider">Design Intelligence</h4>
                        </div>
                        <p className="text-[10px] text-zinc-500">Configure design tastes (variance, motion, density) in Context Sidebar</p>
                      </div>
                    )}

                    {/* Context Map Visualization */}
                    {ctxShowMap && (
                      <div className="mb-3">
                        <button onClick={() => setCtxShowMap(false)} className="text-[9px] text-zinc-600 hover:text-zinc-400 mb-1">hide map</button>
                        <ContextMapVisualization systems={systems} totalBudget={totalBudget} />
                      </div>
                    )}

                    {/* Behavior toggles */}
                    <div className="mb-3 p-2 bg-zinc-900/30 rounded border border-zinc-700/30">
                      <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Behavior</h4>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={ctxSummarization} onChange={(e) => setCtxSummarization(e.target.checked)} className="accent-cyan-500" />
                          <span className="text-[10px] text-zinc-400">Auto-summarize</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={ctxDeepMemory} onChange={(e) => setCtxDeepMemory(e.target.checked)} className="accent-cyan-500" />
                          <span className="text-[10px] text-zinc-400">Deep memory</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={includeAgentsMd} onChange={(e) => setIncludeAgentsMd(e.target.checked)} className="accent-amber-500" />
                          <span className="text-[10px] text-zinc-400">agents.md</span>
                        </label>
                      </div>
                    </div>

                    {/* Existing agent files */}
                    <div className="mb-3">
                      <label className="block text-[10px] text-zinc-500 mb-1">Additional Agent Files</label>
                      <div className="max-h-24 overflow-y-auto space-y-1 bg-zinc-900/50 rounded p-1">
                        {agentFiles.length === 0 ? (
                          <div className="text-[10px] text-zinc-600 px-1 py-2 text-center">No files in agent/</div>
                        ) : agentFiles.map((f) => (
                          <label key={f.path} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedAgentFiles.includes(f.name)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedAgentFiles([...selectedAgentFiles, f.name]);
                                else setSelectedAgentFiles(selectedAgentFiles.filter(x => x !== f.name));
                              }}
                              className="accent-amber-500"
                            />
                            <span className="text-[10px] text-zinc-300">{f.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button onClick={buildPreview} className="w-full text-[10px] text-zinc-400 hover:text-zinc-200 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors">
                      Preview Init Content
                    </button>
                    {showPreview && (
                      <div className="mt-2 max-h-32 overflow-y-auto bg-zinc-900 rounded p-2 border border-zinc-700">
                        <pre className="text-[9px] text-zinc-400 font-mono whitespace-pre-wrap">{previewContent.substring(0, 1500)}{previewContent.length > 1500 ? '\n...' : ''}</pre>
                      </div>
                    )}
                  </Fragment>
                );
              })()}
            </div>
          ) : null}

          {/* Create mode — default init options */}
          {mode === 'create' && (
            <div>
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
            </div>
          )}

          {/* System Prompt — Always visible, expanded */}
          <div className="border-t border-zinc-700 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">System Prompt</h3>
              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Live preview</span>
            </div>
            <p className="text-xs text-zinc-500 mb-3">The prompt sent to the AI merges: <span className="text-cyan-400">default</span> + <span className="text-blue-400">general</span> + <span className="text-purple-400">project</span> + <span className="text-amber-400">session</span> additions.</p>
            <div className="bg-zinc-900/90 rounded-lg border border-zinc-700/50 overflow-hidden">
              {/* Prompt header with layer indicators */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/60 border-b border-zinc-700/40">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Default (always included)</span>
                {generalAdditions && (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1" />
                    <span className="text-[9px] text-zinc-500">+ General</span>
                  </>
                )}
                {projectPrompt && (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 ml-1" />
                    <span className="text-[9px] text-zinc-500">+ Project</span>
                  </>
                )}
                {customSystemPrompt && (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1" />
                    <span className="text-[9px] text-zinc-500">+ Session</span>
                  </>
                )}
              </div>
              {/* Prompt content - styled, scrollable */}
              <div className="p-3 max-h-48 overflow-y-auto">
                {(() => {
                  const parts: { label: string; color: string; content: string }[] = [];
                  parts.push({ label: 'Default', color: 'text-cyan-400', content: DEFAULT_SYSTEM_PROMPT });
                  if (generalAdditions) parts.push({ label: 'General', color: 'text-blue-400', content: generalAdditions });
                  if (projectPrompt) parts.push({ label: 'Project', color: 'text-purple-400', content: projectPrompt });
                  if (customSystemPrompt) parts.push({ label: 'Session', color: 'text-amber-400', content: customSystemPrompt });

                  return parts.map((part, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      {parts.length > 1 && (
                        <div className={`text-[9px] uppercase tracking-wider font-semibold ${part.color} mb-1`}>
                          {part.label} Additions
                        </div>
                      )}
                      <div className="text-[11px] text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                        {part.content.substring(0, 2000)}
                        {part.content.length > 2000 && (
                          <span className="text-zinc-600">... [{part.content.length - 2000} more chars]</span>
                        )}
                      </div>
                      {i < parts.length - 1 && (
                        <div className="text-center text-zinc-700 my-2">{'· · ·'}</div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-zinc-500 mb-1">Session Additions (appended to merged prompt)</label>
              <textarea
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm h-16 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                placeholder="Extra instructions for this specific session..."
              />
            </div>
          </div>
        </div>



        <div className="flex gap-2 pt-4 border-t border-zinc-700">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className={`flex-1 px-4 py-2 text-white rounded text-sm font-medium ${
              mode === 'setup'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
                : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500'
            }`}
          >
            {mode === 'setup' ? 'Setup Agent' : mode === 'new-agent' ? 'Start Agent' : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  );
}