import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, BookOpen, Zap, Network, FolderTree, FileText, Bot,
  ChevronDown, Palette, Sparkles, SlidersHorizontal, Layers, Paintbrush,
  Wand2, Eye, CheckCircle2
} from 'lucide-react';
import DesignSkillsPanel, { DesignSkillConfig } from './DesignSkillsPanel';

// ─── Types ─────────────────────────────────────────────────────

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
  contextConfig?: {
    total_token_budget: number;
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
  icon: React.ElementType;
  accentColor: string;
  itemCount: number;
  itemLabel: string;
  lastBuilt: Date | null;
  maxTokens: number;
  enabled: boolean;
  onToggle: () => void;
}

interface Props {
  mode: 'create' | 'initialize';
  onCreate: (config: SessionConfig) => void;
  onCancel: () => void;
  projectPath?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function formatRelTime(date: Date | null): string {
  if (!date) return 'never';
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── System Toggle Card (unchanged from original) ───────────────

function SystemToggleCard({ system }: { system: SystemInfo }) {
  const toggleColors: Record<string, { on: string; off: string }> = {
    llm_wiki: { on: 'bg-blue-500/40', off: 'bg-zinc-700' },
    obsidian_skills: { on: 'bg-purple-500/40', off: 'bg-zinc-700' },
    graphify: { on: 'bg-cyan-500/40', off: 'bg-zinc-700' },
    para: { on: 'bg-teal-500/40', off: 'bg-zinc-700' },
    qmd: { on: 'bg-amber-500/40', off: 'bg-zinc-700' },
    automations: { on: 'bg-rose-500/40', off: 'bg-zinc-700' },
  };
  const dotColors: Record<string, { on: string; off: string }> = {
    llm_wiki: { on: 'left-3.5 bg-blue-400', off: 'left-0.5 bg-zinc-500' },
    obsidian_skills: { on: 'left-3.5 bg-purple-400', off: 'left-0.5 bg-zinc-500' },
    graphify: { on: 'left-3.5 bg-cyan-400', off: 'left-0.5 bg-zinc-500' },
    para: { on: 'left-3.5 bg-teal-400', off: 'left-0.5 bg-zinc-500' },
    qmd: { on: 'left-3.5 bg-amber-400', off: 'left-0.5 bg-zinc-500' },
    automations: { on: 'left-3.5 bg-rose-400', off: 'left-0.5 bg-zinc-500' },
  };

  const c = toggleColors[system.id] || toggleColors.llm_wiki;
  const d = dotColors[system.id] || dotColors.llm_wiki;

  return (
    <div
      className={`border rounded-lg p-3 transition-all duration-200 ${
        system.enabled
          ? 'bg-zinc-800/40 border-zinc-600/50'
          : 'bg-zinc-900/30 border-zinc-700/30 opacity-70'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <system.icon className={`w-3.5 h-3.5 ${system.accentColor}`} />
          <span className="text-[11px] text-zinc-300 font-medium">{system.name}</span>
        </div>
        <button
          onClick={system.onToggle}
          className={`w-8 h-4 rounded-full transition-colors relative ${
            system.enabled ? c.on : c.off
          }`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200 ${
              system.enabled ? d.on : d.off
            }`}
          />
        </button>
      </div>
      <div className="text-[9px] text-zinc-500">
        {system.itemCount > 0 ? `${system.itemCount} ${system.itemLabel}` : system.itemLabel} · ~{system.maxTokens} tokens
        {system.lastBuilt ? ` · Built ${formatRelTime(system.lastBuilt)}` : ''}
      </div>
    </div>
  );
}

// ─── Context Map Visualization (6 core systems only) ─────────

function CoreContextMap({ systems }: { systems: SystemInfo[] }) {
  const nodes: Record<string, { x: number; y: number }> = {
    llm_wiki: { x: 60, y: 40 },
    obsidian_skills: { x: 220, y: 40 },
    graphify: { x: 60, y: 130 },
    para: { x: 220, y: 130 },
    qmd: { x: 60, y: 220 },
    automations: { x: 220, y: 220 },
  };

  const accentHex: Record<string, string> = {
    llm_wiki: '#3b82f6',
    obsidian_skills: '#a855f7',
    graphify: '#22d3ee',
    para: '#14b8a6',
    qmd: '#f59e0b',
    automations: '#f43f5e',
  };

  const enabledIds = systems.filter((s) => s.enabled).map((s) => s.id);

  return (
    <svg viewBox="0 0 280 280" className="w-full h-auto opacity-60">
      {enabledIds.map((id, i) =>
        enabledIds.slice(i + 1).map((otherId) => {
          const a = nodes[id];
          const b = nodes[otherId];
          if (!a || !b) return null;
          return (
            <line
              key={`${id}-${otherId}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={accentHex[id]}
              strokeWidth="1"
              strokeOpacity="0.3"
            />
          );
        })
      )}
      {systems.map((sys) => {
        const pos = nodes[sys.id];
        if (!pos) return null;
        const isEnabled = sys.enabled;
        return (
          <g key={sys.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isEnabled ? 8 : 5}
              fill={isEnabled ? accentHex[sys.id] : '#3f3f46'}
              opacity={isEnabled ? 0.8 : 0.3}
            />
            {isEnabled && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={12}
                fill="none"
                stroke={accentHex[sys.id]}
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="2 2"
              />
            )}
            <text
              x={pos.x}
              y={pos.y + 22}
              textAnchor="middle"
              fill={isEnabled ? '#d4d4d8' : '#52525b'}
              fontSize="8"
              fontFamily="system-ui"
            >
              {sys.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Dialog ───────────────────────────────────────────────

export default function NewSessionDialog({ mode, onCreate, onCancel, projectPath }: Props) {
  // Basic session state
  const [sessionName, setSessionName] = useState(mode === 'initialize' ? 'Initialize Agent' : 'New Session');
  const [agentType, setAgentType] = useState('opencode');
  const [terminalMode, setTerminalMode] = useState<'create' | 'select'>('create');
  const [selectedTerminal, setSelectedTerminal] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [includeDefaultInit, setIncludeDefaultInit] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Core context system toggles (6 systems — NO design_skills here)
  const [ctxLLMWiki, setCtxLLMWiki] = useState(true);
  const [ctxSkills, setCtxSkills] = useState(true);
  const [ctxGraphify, setCtxGraphify] = useState(true);
  const [ctxPara, setCtxPara] = useState(false);
  const [ctxQMD, setCtxQMD] = useState(true);
  const [ctxAutomations, setCtxAutomations] = useState(false);
  const [ctxSummarization, setCtxSummarization] = useState(true);
  const [ctxDeepMemory, setCtxDeepMemory] = useState(true);

  // ─── Design Skills State (separate from core systems) ───
  const [designSkillsConfig, setDesignSkillsConfig] = useState<DesignSkillConfig>({
    enabled: true,
    skills: {
      frontendDesign: true,
      impeccable: true,
      uiUxProMax: true,
      tasteSkill: true,
      designTaste: true,
    },
    levels: {
      designVariance: 5,
      motionIntensity: 5,
      visualDensity: 7,
    },
    includeReferences: true,
    activeReference: null,
  });

  const [designSkillsInitialized, setDesignSkillsInitialized] = useState(false);
  const [isInitializingDesign, setIsInitializingDesign] = useState(false);

  const [totalBudget, setTotalBudget] = useState(7000);
  const [skillCount, setSkillCount] = useState(0);
  const [designRefCount, setDesignRefCount] = useState(0);

  // Check if design skills are initialized
  useEffect(() => {
    async function checkInit() {
      try {
        // Check if design skill files exist
        const result = await (window as any).deskflowAPI?.listDirectory?.(projectPath || '', 'agent/skills');
        const skills = result?.data || [];
        const hasDesignSkills = ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill', 'design-taste']
          .every(s => skills.includes(s));
        setDesignSkillsInitialized(hasDesignSkills);

        // Count all skills
        setSkillCount(skills.length);

        // Count design references
        const refResult = await (window as any).deskflowAPI?.listDirectory?.(projectPath || '', 'agent/design-references');
        if (refResult?.success) setDesignRefCount(refResult.data?.length || 0);
      } catch {
        setDesignSkillsInitialized(false);
      }
    }
    checkInit();
  }, [projectPath]);

  // Initialize design skills
  const handleInitializeDesignSkills = useCallback(async () => {
    setIsInitializingDesign(true);
    try {
      // Call tracker-mind-setup with design skills flag
      await (window as any).deskflowAPI?.trackerMindSetup?.(projectPath || '', {
        includeDesignSkills: true,
      });
      setDesignSkillsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize design skills:', err);
    } finally {
      setIsInitializingDesign(false);
    }
  }, [projectPath]);

  // Core systems array (6 only — design is SEPARATE)
  const coreSystems: SystemInfo[] = [
    {
      id: 'llm_wiki',
      name: 'LLM Wiki',
      icon: BookOpen,
      accentColor: 'text-blue-400',
      itemCount: 5,
      itemLabel: 'files',
      lastBuilt: null,
      maxTokens: 2000,
      enabled: ctxLLMWiki,
      onToggle: () => setCtxLLMWiki(!ctxLLMWiki),
    },
    {
      id: 'obsidian_skills',
      name: 'Obsidian Skills',
      icon: Zap,
      accentColor: 'text-purple-400',
      itemCount: skillCount,
      itemLabel: 'skills',
      lastBuilt: null,
      maxTokens: 500,
      enabled: ctxSkills,
      onToggle: () => setCtxSkills(!ctxSkills),
    },
    {
      id: 'graphify',
      name: 'Graphify',
      icon: Network,
      accentColor: 'text-cyan-400',
      itemCount: 1,
      itemLabel: 'graph',
      lastBuilt: null,
      maxTokens: 500,
      enabled: ctxGraphify,
      onToggle: () => setCtxGraphify(!ctxGraphify),
    },
    {
      id: 'para',
      name: 'PARA',
      icon: FolderTree,
      accentColor: 'text-teal-400',
      itemCount: 4,
      itemLabel: 'areas',
      lastBuilt: null,
      maxTokens: 300,
      enabled: ctxPara,
      onToggle: () => setCtxPara(!ctxPara),
    },
    {
      id: 'qmd',
      name: 'QMD',
      icon: FileText,
      accentColor: 'text-amber-400',
      itemCount: 2,
      itemLabel: 'templates',
      lastBuilt: null,
      maxTokens: 200,
      enabled: ctxQMD,
      onToggle: () => setCtxQMD(!ctxQMD),
    },
    {
      id: 'automations',
      name: 'Automations',
      icon: Bot,
      accentColor: 'text-rose-400',
      itemCount: 0,
      itemLabel: 'scripts',
      lastBuilt: null,
      maxTokens: 100,
      enabled: ctxAutomations,
      onToggle: () => setCtxAutomations(!ctxAutomations),
    },
  ];

  const handleCreate = useCallback(() => {
    // Build skills array from DesignSkillConfig
    const activeDesignSkills: string[] = [];
    if (designSkillsConfig.skills.frontendDesign) activeDesignSkills.push('frontend-design');
    if (designSkillsConfig.skills.impeccable) activeDesignSkills.push('impeccable');
    if (designSkillsConfig.skills.uiUxProMax) activeDesignSkills.push('ui-ux-pro-max');
    if (designSkillsConfig.skills.tasteSkill) activeDesignSkills.push('taste-skill');
    if (designSkillsConfig.skills.designTaste) activeDesignSkills.push('design-taste');

    const config: SessionConfig = {
      id: `session-${Date.now()}`,
      name: sessionName,
      agentType,
      terminalMode,
      selectedTerminal,
      resumeId: resumeId || undefined,
      customSystemPrompt: customSystemPrompt || undefined,
      includeDefaultInit,
      contextConfig: {
        total_token_budget: totalBudget,
        systems: {
          llm_wiki: { enabled: ctxLLMWiki, max_tokens: 2000 },
          obsidian_skills: { enabled: ctxSkills, max_tokens: 500 },
          graphify: { enabled: ctxGraphify, include_summary: true, max_tokens: 500 },
          para: { enabled: ctxPara, max_tokens: 300 },
          qmd: { enabled: ctxQMD, max_tokens: 200 },
          automations: { enabled: ctxAutomations, max_tokens: 100 },
          // Design skills — SEPARATE from core systems
          design_skills: {
            enabled: designSkillsConfig.enabled && designSkillsInitialized,
            max_tokens: 800,
            skills: activeDesignSkills,
            levels: {
              design_variance: designSkillsConfig.levels.designVariance,
              motion_intensity: designSkillsConfig.levels.motionIntensity,
              visual_density: designSkillsConfig.levels.visualDensity,
            },
            include_references: designSkillsConfig.includeReferences,
          },
        },
        summarization: { enabled: ctxSummarization, message_threshold: 10 },
        deep_memory: { enabled: ctxDeepMemory, pattern_detection: true },
      },
    };
    onCreate(config);
  }, [
    sessionName, agentType, terminalMode, selectedTerminal, resumeId,
    customSystemPrompt, includeDefaultInit, totalBudget,
    ctxLLMWiki, ctxSkills, ctxGraphify, ctxPara, ctxQMD, ctxAutomations,
    ctxSummarization, ctxDeepMemory,
    designSkillsConfig, designSkillsInitialized,
    onCreate,
  ]);

  // Token preview
  const computeTokenPreview = useCallback(() => {
    let used = 0;
    if (ctxLLMWiki) used += 2000;
    if (ctxSkills) used += 500;
    if (ctxGraphify) used += 500;
    if (ctxPara) used += 300;
    if (ctxQMD) used += 200;
    if (ctxAutomations) used += 100;
    if (designSkillsConfig.enabled && designSkillsInitialized) used += 800;
    if (ctxSummarization) used += 200;
    if (ctxDeepMemory) used += 150;
    return { used, remaining: totalBudget - used };
  }, [ctxLLMWiki, ctxSkills, ctxGraphify, ctxPara, ctxQMD, ctxAutomations,
      designSkillsConfig.enabled, designSkillsInitialized,
      ctxSummarization, ctxDeepMemory, totalBudget]);

  const tokenPreview = computeTokenPreview();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {mode === 'initialize' ? 'Setup Agent Workspace' : 'Create New Session'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure context systems and design intelligence for the AI agent
            </p>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
            <span className="sr-only">Close</span>✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Basic config */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Session Name</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Agent</label>
                <select
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50"
                >
                  <option value="opencode">OpenCode</option>
                  <option value="claude">Claude Code</option>
                  <option value="codex">Codex</option>
                  <option value="aider">Aider</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Token Budget</label>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              SECTION 1: CORE CONTEXT SYSTEMS (6 systems)
              ═══════════════════════════════════════════════════════ */}
          <div className="border-t border-zinc-800/50 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-500 via-purple-500 to-cyan-500 rounded-full" />
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Core Context Systems</h3>
              </div>
              <span className="text-[10px] text-zinc-600">
                Core: {tokenPreview.used - (designSkillsConfig.enabled && designSkillsInitialized ? 800 : 0)}/{totalBudget} tokens
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {coreSystems.map((sys) => (
                <SystemToggleCard key={sys.id} system={sys} />
              ))}
            </div>
            {/* Core context map */}
            <div className="mt-3 bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
              <CoreContextMap systems={coreSystems} />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              SECTION 2: DESIGN INTELLIGENCE (separate section)
              ═══════════════════════════════════════════════════════ */}
          <div className="border-t border-pink-500/20 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full" />
                <h3 className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Design Intelligence</h3>
                {designSkillsInitialized && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <span className="text-[10px] text-zinc-600">
                {designSkillsConfig.enabled && designSkillsInitialized ? '~800 tokens' : '0 tokens'}
              </span>
            </div>

            <DesignSkillsPanel
              config={designSkillsConfig}
              onChange={setDesignSkillsConfig}
              designRefCount={designRefCount}
              isInitialized={designSkillsInitialized}
              onInitialize={handleInitializeDesignSkills}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════
              TOKEN BUDGET BAR (combined)
              ═══════════════════════════════════════════════════════ */}
          <div className="border-t border-zinc-800/50 pt-4 space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Total Token Usage</span>
              <span className={tokenPreview.remaining < 0 ? 'text-red-400' : 'text-zinc-400'}>
                {tokenPreview.remaining >= 0 ? `${tokenPreview.remaining} remaining` : `${Math.abs(tokenPreview.remaining)} over budget`}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              {/* Core systems segment */}
              <div
                className="h-full bg-blue-500/60 transition-all duration-300"
                style={{
                  width: `${Math.min(100,
                    ((tokenPreview.used - (designSkillsConfig.enabled && designSkillsInitialized ? 800 : 0)) / totalBudget) * 100
                  )}%`,
                }}
              />
              {/* Design skills segment */}
              {designSkillsConfig.enabled && designSkillsInitialized && (
                <div
                  className="h-full bg-pink-500/60 transition-all duration-300"
                  style={{ width: `${Math.min(100, (800 / totalBudget) * 100)}%` }}
                />
              )}
            </div>
            <div className="flex gap-3 text-[9px] text-zinc-600">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500/60" />
                Core Systems
              </span>
              {designSkillsConfig.enabled && designSkillsInitialized && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-pink-500/60" />
                  Design Intelligence
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isInitializingDesign}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializingDesign ? (
                <span className="flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5 animate-spin" />
                  Initializing...
                </span>
              ) : mode === 'initialize' ? (
                'Setup Agent'
              ) : (
                'Create Session'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
