import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Plus, X, Monitor, Play, Trash2, Clock, FolderOpen, Zap, Settings, Settings2, PanelLeftClose, PanelLeft, GripVertical, Info, PieChart, AlertCircle, FileText, Send, Folder, Link, Terminal as TerminalIcon, Bug, Sparkles, Search, Eye, MoreHorizontal, RefreshCw, CheckCircle2, Database, Palette, ListChecks, BookOpen, DollarSign, Loader2, Edit, AlertTriangle, Lock } from 'lucide-react';
import type { PaneNode } from '../components/TerminalWindow';
import { TerminalLayout, insertIntoLayout, getLeafIds, getGroupTrees, updateGroupTree } from '../components/TerminalWindow';
import { MapEditor, swapLeavesInTree } from '../components/MapEditor';
import { TerminalMiniMap } from '../components/TerminalMiniMap';
import { InstructionPanel } from '../components/InstructionPanel';
import { NewSessionDialog, type SessionConfig } from '../components/NewSessionDialog';
import ImportSessionsDialog from '../components/ImportSessionsDialog';
import { splitPane, removePane } from '../components/TerminalWindow';
import { ContextMaintenanceTab } from '../components/ContextMaintenanceTab';
import DesignWorkspacePage from './DesignWorkspacePage';
import IssuesWorkspace from '../components/IssuesWorkspace';
import InitializeProgressModal from '../components/InitializeProgressModal';
import ContextSidebar from '../components/ContextSidebar';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { DEFAULT_SYSTEM_PROMPT } from '../lib/defaults';
import GeneralistDialog from '../components/GeneralistDialog';
import SkillDynamicForm from '../components/SkillDynamicForm';
import DSLGenerationModal from '../components/DSLGenerationModal';
import { RoutingDisambiguationDialog } from '../components/RoutingDisambiguationDialog';
import { RoutingToast } from '../components/RoutingToast';
import { SessionEditDialog } from '../components/SessionEditDialog';
import { PageShell } from '../components/PageShell';
import { GlassCard } from '../components/GlassCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import '@xterm/xterm/css/xterm.css';

function generateTerminalId(): string {
  return `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface TerminalGroup { terminals: string[]; direction?: 'horizontal' | 'vertical'; }

function collectLeafIds(node: PaneNode): string[] {
  if (node.type === 'leaf') return node.terminalId ? [node.terminalId] : [];
  if (node.children) return [...collectLeafIds(node.children[0]), ...collectLeafIds(node.children[1])];
  return [];
}

function extractGroups(layout: PaneNode | null): TerminalGroup[] {
  if (!layout) return [];
  if (layout.type === 'leaf') return [{ terminals: layout.terminalId ? [layout.terminalId] : [], direction: undefined }];
  if (layout.children) return layout.children.map(c => ({ terminals: collectLeafIds(c), direction: layout.direction }));
  return [];
}

function togglePaneDirection(node: PaneNode, path: number[]): PaneNode {
  if (path.length === 0) {
    return { ...node, direction: node.direction === 'horizontal' ? 'vertical' : 'horizontal' };
  }
  const [index, ...rest] = path;
  if (!node.children || !node.children[index]) return node;
  const newChildren = [...node.children];
  newChildren[index] = togglePaneDirection(newChildren[index], rest);
  return { ...node, children: newChildren };
}

function findLeafInTree(node: PaneNode, terminalId: string): PaneNode | null {
  if (node.type === 'leaf') return node.terminalId === terminalId ? node : null;
  if (node.children) {
    for (const child of node.children) {
      const found = findLeafInTree(child, terminalId);
      if (found) return found;
    }
  }
  return null;
}

function removeLeafFromTree(node: PaneNode, terminalId: string): PaneNode | null {
  if (node.type === 'leaf') return node.terminalId === terminalId ? null : node;
  if (!node.children) return node;
  const newChildren = node.children.map(c => removeLeafFromTree(c, terminalId)).filter((c): c is PaneNode => c !== null);
  if (newChildren.length === 0) return null;
  if (newChildren.length === 1) return newChildren[0];
  return { ...node, children: newChildren };
}

function addLeafToGroup(tree: PaneNode, targetId: string, leaf: PaneNode, direction: 'horizontal' | 'vertical'): PaneNode {
  if (tree.type === 'leaf' && tree.terminalId === targetId) {
    return { type: 'split', direction, children: [tree, leaf] };
  }
  if (tree.children) {
    return { ...tree, children: tree.children.map(c => addLeafToGroup(c, targetId, leaf, direction)) };
  }
  return tree;
}

// ── Session Categorization Config ──

const SESSION_CATEGORIES: Record<string, { label: string; icon: any; bg: string; text: string; border: string; color: string }> = {
  'bug-fix': { label: 'Bug Fix', icon: Bug, bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30', color: 'red' },
  'feature': { label: 'Feature', icon: Sparkles, bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', color: 'blue' },
  'refactor': { label: 'Refactor', icon: RefreshCw, bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', color: 'purple' },
  'research': { label: 'Research', icon: Search, bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30', color: 'teal' },
  'review': { label: 'Review', icon: Eye, bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', color: 'amber' },
  'other': { label: 'Other', icon: MoreHorizontal, bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30', color: 'zinc' },
};

const SESSION_STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  active: { dot: 'bg-green-500 animate-pulse', label: 'Active' },
  paused: { dot: 'bg-yellow-500', label: 'Paused' },
  completed: { dot: 'bg-gray-500', label: 'Completed' },
  archived: { dot: 'bg-zinc-600', label: 'Archived' },
};

function CategoryBadge({ category }: { category?: string }) {
  const cat = SESSION_CATEGORIES[category || 'other'] || SESSION_CATEGORIES.other;
  const Icon = cat.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium leading-none ${cat.bg} ${cat.text} ${cat.border} border`}>
      <Icon className="w-2.5 h-2.5" />
      {cat.label}
    </span>
  );
}

function StatusDot({ status, size }: { status?: string; size?: 'sm' | 'md' }) {
  const style = SESSION_STATUS_STYLES[status || 'active'] || SESSION_STATUS_STYLES.active;
  const dims = size === 'md' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5';
  return <span className={`${dims} rounded-full flex-shrink-0 ${style.dot}`} title={style.label} />;
}

interface Preset {
  id: string;
  name: string;
  command: string;
  category?: string;
  isBuiltIn?: boolean;
}

interface Session {
  id: string;
  agent: string;
  topic: string;
  resume_id?: string;
  created_at: string;
  total_cost?: number;
  total_tokens?: number;
  terminal_id?: string;
  // Categorization fields
  category?: string;
  status?: string;
  product_area?: string;
  description?: string;
  auto_tags?: string;
  category_confirmed?: number;
  auto_named?: number;
}

const loggedErrors = new Set<string>();

function logOnce(key: string, message: string, ...args: any[]) {
  if (!loggedErrors.has(key)) {
    loggedErrors.add(key);
    console.warn(message, ...args);
  }
}

export default function TerminalPage({ projectId: propProjectId, projectPath: propProjectPath, onCloseWorkspace }: { projectId?: string; projectPath?: string; onCloseWorkspace?: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('terminal-sidebarWidth');
    return saved ? parseInt(saved) : 400;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'sessions' | 'map' | 'analytics' | 'issues' | 'skills' | 'configs' | 'history' | 'context-maintenance' | 'design' | 'context'>(() => {
    const saved = localStorage.getItem('terminal-activeTab');
    return (saved as any) || 'presets';
  });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPreset, setNewPreset] = useState({ name: '', command: '', category: '' });
  const [showEditPreset, setShowEditPreset] = useState(false);
  const [editPreset, setEditPreset] = useState<Preset | null>(null);
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [showGeneralistDialog, setShowGeneralistDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showImportSessionsDialog, setShowImportSessionsDialog] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  useEffect(() => {
    window.deskflowAPI?.getPreferences?.().then(prefs => { if (prefs) setPreferences(prefs); });
  }, []);
  const [modelReinjectThreshold, setModelReinjectThreshold] = useState(() => {
    const saved = localStorage.getItem('model-reinject-threshold');
    return saved ? Number(saved) : 10;
  });
  const [modelDefaultTier, setModelDefaultTier] = useState<'top' | 'mid' | 'low'>(() => {
    return (localStorage.getItem('default-model-tier') as any) || 'mid';
  });
  const [modelDebugMode, setModelDebugMode] = useState(() => {
    return localStorage.getItem('model-debug-mode') === 'true';
  });
  const [openCodeSessionName, setOpenCodeSessionName] = useState('');
  const [newSessionAgent, setNewSessionAgent] = useState('claude');
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionMode, setNewSessionMode] = useState<'create' | 'initialize'>('create');
  const [newSessionTerminalMode, setNewSessionTerminalMode] = useState<'create' | 'select'>('create');
  const [newSessionSelectedTerminal, setNewSessionSelectedTerminal] = useState('');
  const [sendTargetSession, setSendTargetSession] = useState<string>('');
  const [autoAssignConfig, setAutoAssignConfig] = useState<any>(null);
  // ── Cross-session sync config ─────────────────────────────────
  const [crossSessionSyncEnabled, setCrossSessionSyncEnabled] = useState(() => {
    return localStorage.getItem('cross-session-sync-enabled') !== 'false';
  });
  const [fileLockTTL, setFileLockTTL] = useState(() => {
    const saved = localStorage.getItem('file-lock-ttl');
    return saved ? Number(saved) : 300;
  });
  const [contextBroadcastEnabled, setContextBroadcastEnabled] = useState(() => {
    return localStorage.getItem('context-broadcast-enabled') !== 'false';
  });
  const [conflictWarningMode, setConflictWarningMode] = useState(() => {
    return localStorage.getItem('conflict-warning-mode') || 'both';
  });
  const [syncCommandEnabled, setSyncCommandEnabled] = useState(() => {
    return localStorage.getItem('sync-command-enabled') !== 'false';
  });
  const [thoughtProcessEnabled, setThoughtProcessEnabled] = useState(() => {
    return localStorage.getItem('thought-process-enabled') !== 'false';
  });
  const [routingResult, setRoutingResult] = useState<any>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<any[]>([]);
  const [showRoutingToast, setShowRoutingToast] = useState(false);
  const [routingToastSession, setRoutingToastSession] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [showMessagesViewer, setShowMessagesViewer] = useState<string | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [quotedReferences, setQuotedReferences] = useState<Array<{ role: string; content: string; createdAt?: string; id?: number }>>([]);
  const [sessionProblems, setSessionProblems] = useState<any[]>([]);
  const [sessionRequests, setSessionRequests] = useState<any[]>([]);
  const [messagesSearchQuery, setMessagesSearchQuery] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string; path: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(propProjectId || '');
  const [hoveredPane, setHoveredPane] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<{ totalTokens: number; totalCost: number; byTool: Record<string, any> | null } | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsProblems, setAnalyticsProblems] = useState<any[]>([]);
  const [analyticsRequests, setAnalyticsRequests] = useState<any[]>([]);
  const [analyticsPromptHistory, setAnalyticsPromptHistory] = useState<any[]>([]);
  const [analyticsDailyStats, setAnalyticsDailyStats] = useState<any[]>([]);

  
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
  const [showInstructionPanel, setShowInstructionPanel] = useState(false);
  const [instructionText, setInstructionText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [terminalErrorType, setTerminalErrorType] = useState<'error' | 'warning' | 'info'>('error');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('');
  const [showCloseWorkspaceDialog, setShowCloseWorkspaceDialog] = useState(false);
  const [fileConflicts, setFileConflicts] = useState<Array<{
    filePath: string; requestingTerminal: string; lockingTerminal: string;
    sessionId: string | null; timestamp: number;
  }>>([]);
  const [terminalFileLocks, setTerminalFileLocks] = useState<Record<string, string[]>>({});
  const [touchedFiles, setTouchedFiles] = useState<Array<{
    id: string; terminal_id: string; session_id: string;
    file_path: string; action: string; project_path: string; timestamp: string;
  }>>([]);

  // Confirm dialog (replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });

  // Context menu for session items
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; session: Session } | null>(null);

  // Session drag state for drag-to-terminal
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);

  const showError = useCallback((msg: string, type: 'error' | 'warning' | 'info' = 'error') => {
    setTerminalError(msg);
    setTerminalErrorType(type);
    setTimeout(() => setTerminalError(null), 8000);
  }, []);

  interface AgentInitErrorInfo {
    terminalId: string;
    reason: string;
    detail: string;
    installHint: string;
  }
  const [agentInitErrors, setAgentInitErrors] = useState<Record<string, AgentInitErrorInfo>>({});

  // Terminal tab bar state
  type TerminalTabInfo = { name: string; agent: string; modelTier?: string };
  const [terminalTabs, setTerminalTabs] = useState<Record<string, TerminalTabInfo>>({});
  const terminalTabsRef = useRef(terminalTabs);
  const draggedTabRef = useRef<string | null>(null);
  // to hold onCloseWorkspace for IPC cleanup
  const onCloseWorkspaceRef = useRef(onCloseWorkspace);
  const instructionTextareaRef = useRef<HTMLTextAreaElement>(null);
  onCloseWorkspaceRef.current = onCloseWorkspace;

  // Problems and Requests for binding/instruction panel
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [allRequests, setAllRequests] = useState<Request[]>([]);
  const [showBindDropdown, setShowBindDropdown] = useState(false);

  // Session categorization state
  const [sessionCategoryFilter, setSessionCategoryFilter] = useState<string>('all');
  const [mentionDropdown, setMentionDropdown] = useState<{
    visible: boolean; query: string; results: Array<{ id: string; name: string; agent: string; sessionTopic: string }>; cursor: number;
  }>({ visible: false, query: '', results: [], cursor: 0 });
  
  // Initialize agent state
  const [initStatus, setInitStatus] = useState<'idle' | 'checking' | 'ready' | 'init-ok' | 'error'>('idle');
  const [showInitModal, setShowInitModal] = useState(false);

  const handleInitSetup = useCallback(async () => {
    if (initStatus === 'init-ok') {
      if (!window.confirm('This project is already initialized. Re-initialize workspace files?')) return;
    }
    setShowInitModal(true);
  }, [initStatus]);

  // File change pulse notification
  const [fileChangedPulse, setFileChangedPulse] = useState(false);
  const [terminalLayout, setTerminalLayout] = useState<PaneNode | null>(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [mapListRatio, setMapListRatio] = useState(0.6);
  const mapResizeRef = useRef<{ startY: number; startRatio: number } | null>(null);
  const userCreatedTerminalRef = useRef(false);

  const effectiveProjectId = propProjectId || selectedProject;

  // Load saved layout from DB — only restore if empty state (no terminals to auto-spawn)
  useEffect(() => {
    if (!window.deskflowAPI) { setLayoutLoading(false); return; }
    (async () => {
      try {
        const layouts = await window.deskflowAPI.getTerminalLayouts(effectiveProjectId || undefined);
        const active = layouts?.find((l: any) => l.is_active);
        if (!userCreatedTerminalRef.current && active?.layout_data) {
          const parsed = JSON.parse(active.layout_data);
          const leafIds = getLeafIds(parsed);
          // Only restore if no terminals would auto-spawn (empty layout)
          if (leafIds.length === 0) {
            setTerminalLayout(parsed);
          } else {
            setTerminalLayout(null);
          }
        } else {
          setTerminalLayout(null);
        }
      } catch { if (!userCreatedTerminalRef.current) setTerminalLayout(null); }
      setLayoutLoading(false);
    })();
  }, [effectiveProjectId, propProjectId]);

  // ── Cross-session conflict listener + notification ─────────────
  useEffect(() => {
    if (!window.deskflowAPI?.onFileConflict) return;
    const unsub = window.deskflowAPI.onFileConflict((data) => {
      setFileConflicts(prev => [...prev.slice(-9), { ...data, timestamp: Date.now() }]);
      setTerminalError(`Conflict: ${data.requestingTerminal} wants to edit ${data.filePath} (locked by ${data.lockingTerminal})`);
      setTerminalErrorType('warning');

      if (crossSessionSyncEnabled && data.requestingTerminal === activeTerminalId && window.deskflowAPI?.terminalWrite) {
        const msg = `[System: Conflict — ${data.filePath} is locked by ${data.lockingTerminal}. Wait for lock to expire (~60s) or coordinate with that session.]`;
        window.deskflowAPI.terminalWrite(activeTerminalId, msg + '\r\n');
      }
    });
    return unsub;
  }, [activeTerminalId, crossSessionSyncEnabled]);

  // ── Context sync listener — refresh + notify other terminals ──
  useEffect(() => {
    if (!window.deskflowAPI?.onContextChanged) return;
    const unsub = window.deskflowAPI.onContextChanged((data) => {
      if (data.source && data.source !== activeTerminalId && (data.type === 'problems' || data.type === 'requests')) {
        if (data.action === 'broadcast') {
          loadAllProblems?.();
          loadAllRequests?.();

          if (crossSessionSyncEnabled && window.deskflowAPI?.terminalWrite) {
            const typeLabel = data.type === 'problems' ? 'problem' : 'request';
            const actionLabel = data.action === 'created' ? 'created' : data.action === 'updated' ? 'updated' : 'modified';
            const title = data.entity?.title ? ` "${data.entity.title}"` : '';
            const msg = `[System: ${data.source} ${actionLabel} ${typeLabel}${title}. Run /sync for full context.]`;
            window.deskflowAPI.terminalWrite(activeTerminalId, msg + '\r\n');
          }
        }
      }
    });
    return unsub;
  }, [activeTerminalId, crossSessionSyncEnabled]);

  // ── Periodic file lock refresh ─────────────────────────────────
  useEffect(() => {
    if (!window.deskflowAPI?.getFileLocks) return;
    const refresh = () => {
      window.deskflowAPI!.getFileLocks!().then((locks) => {
        const byTerminal: Record<string, string[]> = {};
        for (const l of locks) {
          if (!byTerminal[l.terminalId]) byTerminal[l.terminalId] = [];
          byTerminal[l.terminalId].push(l.filePath);
        }
        setTerminalFileLocks(byTerminal);
      }).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Periodic touched files refresh ──────────────────────────────
  useEffect(() => {
    if (!window.deskflowAPI?.getTouchedFiles || !crossSessionSyncEnabled) { setTouchedFiles([]); return; }
    const refresh = () => {
      window.deskflowAPI!.getTouchedFiles!({ limit: 10 }).then((result) => {
        setTouchedFiles(result?.data || []);
      }).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [crossSessionSyncEnabled]);

  const saveLayout = useCallback((layout: PaneNode | null) => {
    if (!window.deskflowAPI) return;
    try {
      window.deskflowAPI.saveTerminalLayout({
        name: 'Default Layout',
        layoutData: layout ? JSON.stringify(layout) : '',
        isActive: true,
        projectId: effectiveProjectId || undefined,
      });
    } catch {}
  }, [effectiveProjectId]);

  const initializeTerminal = useCallback(async (terminalId: string, agent: string, resumeId?: string, initContent?: string, systemPrompt?: string) => {
    if (initializingTerminals.current.has(terminalId)) {
      console.log('[TerminalPage] Already initializing terminal:', terminalId);
      return;
    }
    initializingTerminals.current.add(terminalId);
    try {
      // ═══ VERIFY AGENT AVAILABILITY ═══
      if (window.deskflowAPI?.verifyAgent) {
        const verifyResult = await window.deskflowAPI.verifyAgent(agent);
        if (!verifyResult?.found) {
          console.warn('[TerminalPage] Agent not found on PATH:', agent);
          showError(verifyResult?.installHint || `Agent '${agent}' not found. Install it and restart.`, 'warning');
          return;
        }
      }

      // ═══ WAIT FOR TERMINAL READY ═══
      try {
        await new Promise<void>((resolve) => {
          let done = false;
          const remover = window.deskflowAPI?.onTerminalReady?.((id: string) => {
            if (id === terminalId && !done) {
              done = true;
              remover?.();
              resolve();
            }
          });
          setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 8000);
        });
      } catch {}

      // small pause to let shell render
      await new Promise(r => setTimeout(r, 200));

      // ═══ LAUNCH AGENT ═══
      const launchCommand = resumeId ? `${agent} --resume ${resumeId}\r\n` : `${agent}\r\n`;
      const r2 = await window.deskflowAPI?.terminalWrite?.(terminalId, launchCommand);
      console.log('[TerminalPage] Wrote launch command:', JSON.stringify(launchCommand), 'result:', r2);

      // ═══ WAIT FOR AGENT TO BE READY ═══
      await new Promise<void>((resolve) => {
        let done = false;
        const remover = window.deskflowAPI?.onAgentReady?.((data: { terminalId: string }) => {
          if (data.terminalId === terminalId && !done) {
            done = true;
            remover?.();
            resolve();
          }
        });
        setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 15000);
      });

      // ═══ ARM HANDSHAKE ═══
      if (window.deskflowAPI?.armHandshake) {
        const hs = await window.deskflowAPI.armHandshake(terminalId);
        if (hs?.success && hs.token) {
          await window.deskflowAPI.terminalWrite(terminalId, hs.token + '\r');
          // Wait for handshake token to appear in agent output
          await new Promise<void>((resolve) => {
            let done = false;
            const remover = window.deskflowAPI?.onAgentIdle?.((data: { terminalId: string }) => {
              if (data.terminalId === terminalId && !done) {
                done = true;
                remover?.();
                resolve();
              }
            });
            setTimeout(() => { if (!done) { done = true; remover?.(); resolve(); } }, 10000);
          });
        }
      }

      // ═══ WRITE SYSTEM PROMPT + INIT CONTENT AS SINGLE SEND ═══
      const parts: string[] = [];
      if (systemPrompt) {
        parts.push(systemPrompt);
      } else {
        const prefs = await window.deskflowAPI?.getPreferences?.();
        const prompts = prefs?.systemPrompts || {};
        const prompt = prompts[agent] || prompts['claude'] || '';
        if (prompt) parts.push(prompt);
      }
      if (initContent) {
        parts.push(initContent);
      }
      if (thoughtProcessEnabled) {
        parts.push(`## Thought Process\n\nBefore providing your final answer, you MUST show your thought process in a <thought_process> block. This should include:\n- How you interpret the request and what you need to do\n- Which files or code areas you're considering\n- Tradeoffs you're weighing between different approaches\n- Why you chose the approach you did\n- Any potential pitfalls or edge cases to watch for\n\nKeep the thought process concise and focused — 3-10 sentences is usually sufficient.`);
      }
      if (parts.length > 0 && window.deskflowAPI?.agentSend) {
        const combined = parts.join('\n\n');
        await window.deskflowAPI.agentSend(terminalId, combined, agent);
      }
    } catch (e) {
      console.error('[TerminalPage] initializeTerminal failed:', e);
    } finally {
      initializingTerminals.current.delete(terminalId);
    }
  }, [thoughtProcessEnabled, showError]);

  // Load all problems for binding dropdown
  const loadAllProblems = useCallback(async () => {
    if (!window.deskflowAPI || !selectedProject) return;
    try {
      const result = await window.deskflowAPI.getProblems(selectedProject);
      if (result?.success) setAllProblems(result.data || []);
    } catch (e) {
      console.error('[TerminalPage] Failed to load problems:', e);
    }
  }, [selectedProject]);

  // Load all requests for instruction panel
  const loadAllRequests = useCallback(async () => {
    if (!window.deskflowAPI || !selectedProject) return;
    try {
      const result = await window.deskflowAPI.getRequests?.(selectedProject);
      if (result?.success) setAllRequests(result.data || []);
    } catch (e) {
      console.error('[TerminalPage] Failed to load requests:', e);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      loadAllProblems();
      loadAllRequests();
    }
  }, [selectedProject, loadAllProblems, loadAllRequests]);

  // Listen for agent file changes (pulse notification)
  useEffect(() => {
    if (!window.deskflowAPI?.onAgentFileChanged) return;
    const cleanup = window.deskflowAPI.onAgentFileChanged(() => {
      setFileChangedPulse(true);
      setTimeout(() => setFileChangedPulse(false), 3000);
    });
    return () => cleanup?.();
  }, []);

  // Listen for agent init errors (launch failure recovery)
  useEffect(() => {
    if (!window.deskflowAPI?.onAgentInitError) return;
    const cleanup = window.deskflowAPI.onAgentInitError((data) => {
      setAgentInitErrors(prev => ({ ...prev, [data.terminalId]: data }));
    });
    return () => cleanup?.();
  }, []);

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

  const loadSessions = useCallback(async () => {
    if (!window.deskflowAPI) return;
    try {
      const data = await window.deskflowAPI.getTerminalSessions(selectedProject || undefined, 20);
      setSessions(data || []);
    } catch (e) {
      logOnce('terminal-sessions', '[TerminalPage] Failed to load sessions:', e);
    }
  }, [selectedProject]);

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

  const systemPromptLayers = useMemo(() => {
    const layers: Array<{ label: string; content: string; color: string }> = [];
    layers.push({ label: 'Default', content: DEFAULT_SYSTEM_PROMPT || '', color: 'text-cyan-400' });
    const generalAdditions = preferences?.systemPrompts?.generalAdditions || '';
    if (generalAdditions.trim()) {
      layers.push({ label: 'General', content: generalAdditions, color: 'text-blue-400' });
    }
    const projectPrompt = preferences?.systemPrompts?.[selectedProject || ''] || '';
    if (projectPrompt.trim()) {
      layers.push({ label: 'Project', content: projectPrompt, color: 'text-purple-400' });
    }
    return layers;
  }, [preferences, selectedProject]);

  // Send instruction from InstructionPanel (with problem/request/skill data)
  const handleInstructionPanelSend = useCallback(async (config: {
    problems: string[];
    requests: string[];
    skill?: string;
    instruction: string;
    prompt: string;
    systemPromptIncluded?: boolean;
  }) => {
    if (!window.deskflowAPI || !config.prompt.trim() || isSending) return;
    setIsSending(true);
    setShowInstructionPanel(false);
    try {
      // ── 1. Resolve target terminal ──────────────────────────
      let resolvedTargetId = activeTerminalId || '';
      if (!resolvedTargetId && sendTargetSession) {
        const targetSession = sessions.find(s => s.id === sendTargetSession);
        if (targetSession?.terminal_id) {
          resolvedTargetId = targetSession.terminal_id;
        }
      }
      if (!resolvedTargetId) {
        showError('No terminal available for this session.', 'error');
        return;
      }

      // /sync command — compile cross-session context summary
      if (config.prompt.trim().toLowerCase() === '/sync') {
        const syncResult = await window.deskflowAPI.compileSyncSummary(resolvedTargetId);
        if (syncResult?.success && syncResult.summary) {
          await window.deskflowAPI.terminalWrite(resolvedTargetId, syncResult.summary + '\r\n');
          showError('Cross-session context synced', 'info');
        } else {
          showError(syncResult?.error || 'Sync failed', 'error');
        }
        return;
      }

      const proj = projects.find(p => p.id === selectedProject);
      const cwd = proj?.path || undefined;

      // ── 2. Build meaningful topic ───────────────────────────
      const instructionText = config.instruction?.trim();
      let topic: string;
      if (instructionText && instructionText.length > 0) {
        topic = instructionText.replace(/\n/g, ' ').trim();
        if (topic.length > 60) topic = topic.substring(0, 57) + '...';
      } else {
        const parts: string[] = [];
        if (config.problems.length > 0) parts.push(`${config.problems.length}p`);
        if (config.requests.length > 0) parts.push(`${config.requests.length}r`);
        if (config.skill) parts.push(config.skill);
        topic = parts.length > 0 ? `Instruction: ${parts.join(' ')}` : 'Quick instruction';
      }

      // ── 3. Generate session ID ──────────────────────────────
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // ── 4. Save session BEFORE terminal write ───────────────
      const existingSession = sessions.find(s => s.terminal_id === resolvedTargetId || s.id === resolvedTargetId);
      const sessionPayload: any = {
        id: existingSession?.id || sessionId,
        projectId: selectedProject,
        agent: existingSession?.agent || 'claude',
        terminalId: resolvedTargetId,
        topic,
        workingDirectory: cwd || '',
        description: instructionText || undefined,
      };
      try {
        const saveResult = await window.deskflowAPI?.saveTerminalSession?.(sessionPayload);
        if (!saveResult?.success) {
          console.error('[InstructionSend] Session save failed:', saveResult);
        }
      } catch (err) {
        console.error('[InstructionSend] Session save exception:', err);
      }

      // ── 5. Write prompt to terminal ─────────────────────────
      try {
        const writeResult = await window.deskflowAPI?.terminalWrite?.(resolvedTargetId, config.prompt + '\r\n');
        if (writeResult && !writeResult.success) {
          showError(`Terminal not responding: ${writeResult.error || 'Unknown error'}`, 'error');
          return;
        }
      } catch (err) {
        console.error('[InstructionSend] terminalWrite failed:', err);
        return;
      }

      // ── 6. Update terminal binding ──────────────────────────
      try {
        await window.deskflowAPI?.updateTerminalBinding?.({
          terminalId: resolvedTargetId,
          updates: {
            active_problem_id: config.problems[0] || null,
            session_context: JSON.stringify({
              problems: config.problems,
              requests: config.requests,
              skill: config.skill,
              systemPromptIncluded: config.systemPromptIncluded,
            }),
          },
        });
      } catch (err) {
        console.error('[InstructionSend] Binding update failed:', err);
      }

      // ── 7. Feedback ─────────────────────────────────────────
      loadTerminalBindings();
      loadSessions();
      const toastMsg = `Sent to terminal (${config.problems.length} problems, ${config.requests.length} requests)`;
      showError(toastMsg, 'info');
    } catch (e) {
      console.error('[TerminalPage] Failed to send instruction:', e);
      showError(`Failed to send: ${(e as any).message}`, 'error');
    } finally {
      setIsSending(false);
    }
  }, [activeTerminalId, sendTargetSession, sessions, showError, isSending, selectedProject, projects, loadSessions, loadTerminalBindings]);

  // Send instruction to terminal
  const handleSendToTerminal = useCallback(async (terminalId: string, message: string, agentType?: string) => {
    const result = await window.deskflowAPI.agentSend(terminalId, message, agentType);
    if (result && !result.success) {
      showError(`Terminal not responding: ${result.error || 'Unknown error'}`, 'error');
      return false;
    }
    setInstructionText('');
    setMentionDropdown(prev => ({ ...prev, visible: false }));
    setShowInstructionInput(false);
    if (terminalId !== activeTerminalId) {
      showError(`Sent to ${Object.entries(terminalTabs).find(([id]) => id === terminalId)?.[1]?.name || 'terminal'}`, 'info');
    }
    if (autoAssignConfig?.enabled) {
      const session = sessions.find((s: any) => s.terminal_id === terminalId);
      if (session) {
        window.deskflowAPI?.updateSessionSummary?.({ sessionId: session.id }).catch(() => {});
      }
    }
    return true;
  }, [activeTerminalId, instructionText, terminalTabs, showError, autoAssignConfig, sessions]);

  const handleRetryAgentInit = useCallback(async (terminalId: string, agentType: string) => {
    setAgentInitErrors(prev => { const n = { ...prev }; delete n[terminalId]; return n; });
    if (window.deskflowAPI?.retryAgentLaunch) {
      await window.deskflowAPI.retryAgentLaunch(terminalId, agentType);
    }
    const launchCommand = `${agentType}\r\n`;
    await window.deskflowAPI?.terminalWrite?.(terminalId, launchCommand);
    await initializeTerminal(terminalId, agentType);
  }, [initializeTerminal]);

  const handleCreateNewSession = useCallback(async (name?: string, summary?: string, prompt?: string) => {
    try {
      // Use selected project, or fallback to first available project
      const activeProjectId = selectedProject || projects[0]?.id || '';
      const proj = projects.find(p => p.id === activeProjectId);
      const newTerminalId = generateTerminalId();
      const cwd = proj?.path || '';
      
      if (!cwd) {
        showError('No project path available. Please select a project with a valid path.', 'warning');
        return null;
      }
      
      // ═══ CREATE UI ═══
      setTerminalTabs(prev => ({ ...prev, [newTerminalId]: { name: name || 'New Session', agent: newSessionAgent, modelTier: 'mid' } }));
      setActiveTerminalId(newTerminalId);
      const updatedLayout = insertIntoLayout(terminalLayout, newTerminalId);
      setTerminalLayout(updatedLayout);
      saveLayout(updatedLayout);
      
      // ═══ SPAWN PTY ═══
      if (!window.deskflowAPI?.spawnTerminal) {
        showError('Terminal API not available', 'error');
        return null;
      }
      const spawnResult = await window.deskflowAPI.spawnTerminal(newTerminalId, cwd, newSessionAgent);
      if (!spawnResult?.success) {
        showError(`Failed to spawn terminal: ${spawnResult?.error}`, 'error');
        return null;
      }
      window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId: newTerminalId } }));
      
      // ═══ INITIALIZE AGENT ═══
      await registerTerminal(newTerminalId);
      await initializeTerminal(newTerminalId, newSessionAgent, undefined);

      // ═══ WRITE USER PROMPT ═══
      if (prompt && prompt.trim()) {
        const writeResult = await window.deskflowAPI?.agentSend?.(newTerminalId, prompt, newSessionAgent);
        if (!writeResult?.success) {
          console.error('[handleCreateNewSession] Failed to write prompt:', writeResult?.error);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      
      // ═══ SAVE SESSION ═══
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const savePayload: any = {
        id: sessionId,
        projectId: selectedProject,
        agent: newSessionAgent,
        terminalId: newTerminalId,
        topic: name || 'New Session',
        workingDirectory: cwd,
        description: summary || '',
        autoNamed: 1,
      };
      const saveResult = await window.deskflowAPI?.saveTerminalSession?.(savePayload);
      if (!saveResult?.success) {
        console.error('[handleCreateNewSession] Failed to save session:', saveResult?.error);
        showError(`Session save failed: ${saveResult?.error}`, 'warning');
      }
      
      loadSessions();
      return newTerminalId;
    } catch (err) {
      console.error('[handleCreateNewSession] Unexpected error:', err);
      showError(`Session creation failed: ${(err as any).message}`, 'error');
      return null;
    }
  }, [projects, selectedProject, terminalLayout, loadSessions, registerTerminal, initializeTerminal, saveLayout, showError]);

  const sendInstruction = useCallback(async () => {
    if (!window.deskflowAPI || !instructionText.trim() || isSending) return;
    setIsSending(true);
    try {
      // Auto-assign routing (ONLY if no @term mention and feature is enabled)
      if (autoAssignConfig?.enabled && !instructionText.includes('@')) {
        setIsRouting(true);
        setPendingPrompt(instructionText);
        try {
          const result = await window.deskflowAPI?.routePrompt?.({ prompt: instructionText });
          if (result && result.action === 'route' && result.confidence != null) {
            if (result.confidence >= 0.7) {
              // High confidence — auto-send
              await handleSendToTerminal(result.terminalId!, instructionText);
              return;
            } else if (result.confidence >= 0.4) {
              // Medium — show toast with 3s cancel window
              setRoutingToastSession(result.sessionName || 'Session');
              setShowRoutingToast(true);
              setRoutingResult(result);
              // Don't return yet — toast will auto-confirm or cancel
              // Fall through to prevent double-send from existing flow
              return;
            } else {
              // Low — show disambiguation
              setDisambiguationCandidates([{
                sessionId: result.sessionId!,
                sessionName: result.sessionName || 'Session',
                summary: result.reason || '',
                confidence: result.confidence,
              }]);
              setShowDisambiguation(true);
              setRoutingResult(result);
              return;
            }
          } else if (result?.action === 'create_new') {
            await handleCreateNewSession(result.suggestedName || 'New Session', result.suggestedSummary || '', instructionText);
            return;
          }
          // action === 'manual' or unknown — fall through to existing flow
        } catch (err) {
          console.error('[AutoAssign] Routing failed, falling back:', err);
          // Fall through to existing flow
        } finally {
          setIsRouting(false);
        }
      }

      // Check for @mention first
      let resolvedTargetId = activeTerminalId;
      let resolvedMessage = instructionText;
      if (instructionText.includes('@')) {
        const tabs = Object.entries(terminalTabs).map(([id, t]) => ({ id, name: t.name }));
        const mentionResult = await window.deskflowAPI.resolveAtMention({ input: instructionText, terminalTabs: tabs });
        if (mentionResult.resolved && mentionResult.terminalId) {
          resolvedTargetId = mentionResult.terminalId;
          resolvedMessage = mentionResult.message;
        }
      }
      // Fallback: from sendTargetSession, or activeTerminalId
      if (!resolvedTargetId && sendTargetSession) {
        const targetSession = sessions.find(s => s.id === sendTargetSession);
        if (targetSession?.terminal_id) {
          resolvedTargetId = targetSession.terminal_id;
        }
      }
      if (!resolvedTargetId) {
        showError('No terminal available for this session. Open a session first.', 'error');
        return;
      }
      // Prepend quoted references as context
      if (quotedReferences.length > 0) {
        const refBlock = quotedReferences
          .map(r => `[Referenced ${r.role} message${r.createdAt ? ` (${new Date(r.createdAt).toLocaleTimeString()})` : ''}]: ${r.content}`)
          .join('\n---\n');
        resolvedMessage = `Context from session messages:\n${refBlock}\n\n---\n${resolvedMessage}`;
      }
      const result = await window.deskflowAPI.terminalWrite(resolvedTargetId, resolvedMessage + '\r\n');
      if (result && !result.success) {
        showError(`Terminal not responding: ${result.error || 'Unknown error'}`, 'error');
        return;
      }
      setInstructionText('');
      setQuotedReferences([]);
      setMentionDropdown(prev => ({ ...prev, visible: false }));
      setShowInstructionInput(false);
      if (resolvedTargetId !== activeTerminalId) {
        showError(`Sent to ${Object.entries(terminalTabs).find(([id]) => id === resolvedTargetId)?.[1]?.name || 'terminal'}`, 'info');
      }
    } catch (e) {
      console.error('[TerminalPage] Failed to send instruction:', e);
      showError(`Failed to send: ${(e as any).message}`, 'error');
    } finally {
      setIsSending(false);
    }
  }, [activeTerminalId, instructionText, isSending, showError, sendTargetSession, sessions, terminalTabs, autoAssignConfig, handleSendToTerminal, handleCreateNewSession, quotedReferences]);

  // Routing confirm/cancel/disambiguation handlers
  const handleRoutingConfirm = useCallback(async () => {
    setShowRoutingToast(false);
    if (routingResult?.terminalId && pendingPrompt) {
      await handleSendToTerminal(routingResult.terminalId, pendingPrompt);
    }
    setPendingPrompt(null);
    setRoutingResult(null);
  }, [routingResult, pendingPrompt, handleSendToTerminal]);

  const handleRoutingCancel = useCallback(() => {
    setShowRoutingToast(false);
    setPendingPrompt(null);
    setRoutingResult(null);
  }, []);

  const handleDisambiguationSelect = useCallback(async (sessionId: string) => {
    setShowDisambiguation(false);
    const session = sessions.find((s: any) => s.id === sessionId);
    if (session?.terminal_id && pendingPrompt) {
      await handleSendToTerminal(session.terminal_id, pendingPrompt);
    }
    setPendingPrompt(null);
  }, [sessions, pendingPrompt, handleSendToTerminal]);

  const handleDisambiguationCreateNew = useCallback(async (name: string) => {
    setShowDisambiguation(false);
    if (pendingPrompt) {
      await handleCreateNewSession(name, pendingPrompt.substring(0, 120), pendingPrompt);
    }
    setPendingPrompt(null);
  }, [pendingPrompt, handleCreateNewSession]);

  const loadPresets = useCallback(async () => {
    if (!window.deskflowAPI) return;
    try {
      const data = await window.deskflowAPI.getTerminalPresets(selectedProject || undefined);
      const builtIn: Preset[] = [
        { id: 'builtin-remind', name: 'Remind', command: '', category: 'system', isBuiltIn: true },
      ];
      setPresets([...builtIn, ...(data || [])]);
    } catch (e) {
      logOnce('terminal-presets', '[TerminalPage] Failed to load presets:', e);
    }
  }, [selectedProject]);

  const fetchAnalyticsData = useCallback(async () => {
    if (!window.deskflowAPI) return;
    setAnalyticsLoading(true);
    try {
      const periodMap: Record<string, string> = { '7d': 'week', '30d': 'month', 'all': 'all' };
      const p = periodMap[analyticsPeriod] || 'month';
      const [aiResult, problemsResult, requestsResult, historyResult, dailyResult] = await Promise.all([
        window.deskflowAPI.getAIUsageSummary(p === 'all' ? 'month' : p),
        window.deskflowAPI.getProblems(selectedProject, propProjectPath).catch(() => null),
        window.deskflowAPI.getRequests(selectedProject).catch(() => null),
        window.deskflowAPI.getPromptHistory({ projectId: selectedProject, limit: 500 }).catch(() => null),
        window.deskflowAPI.getDailyAggregates().catch(() => null),
      ]);
      if (aiResult) setAiSummary(aiResult);
      if (problemsResult) setAnalyticsProblems(Array.isArray(problemsResult) ? problemsResult : problemsResult?.data || []);
      if (requestsResult) setAnalyticsRequests(Array.isArray(requestsResult) ? requestsResult : requestsResult?.data || []);
      if (historyResult) setAnalyticsPromptHistory(Array.isArray(historyResult) ? historyResult : historyResult?.data || []);
      if (dailyResult) setAnalyticsDailyStats(Array.isArray(dailyResult) ? dailyResult : dailyResult?.data || []);
    } catch (err) {
      console.error('[TerminalPage] Analytics fetch error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsPeriod, selectedProject, propProjectPath]);

  const loadProjects = useCallback(async () => {
    if (!window.deskflowAPI) return;
    try {
      const data = await window.deskflowAPI.getProjects();
      setProjects(data || []);
      if (data && data.length > 0 && !localStorage.getItem('terminal-project')) {
        setSelectedProject(data[0].id);
      }
    } catch (e) {
      logOnce('terminal-projects', '[TerminalPage] Failed to load projects:', e);
    }
  }, []);

  // Save session checkpoint - opens dialog for naming
  const handleSaveCheckpoint = useCallback(() => {
    if (!activeTerminalId || !window.deskflowAPI) return;
    const session = sessions.find(s => s.terminal_id === activeTerminalId || s.id === activeTerminalId);
    setSaveDialogName(session?.topic || `Checkpoint ${new Date().toLocaleString()}`);
    setShowSaveDialog(true);
  }, [activeTerminalId, sessions]);

  const handleSaveCheckpointSubmit = useCallback(async () => {
    if (!activeTerminalId || !window.deskflowAPI || !saveDialogName.trim()) return;
    setShowSaveDialog(false);
    try {
      const proj = projects.find(p => p.id === selectedProject);
      const session = sessions.find(s => s.terminal_id === activeTerminalId || s.id === activeTerminalId);
      const result = await window.deskflowAPI.saveTerminalSession?.({
        id: session?.id || `checkpoint-${Date.now()}`,
        projectId: selectedProject,
        agent: session?.agent || 'claude',
        resumeId: session?.resume_id || activeTerminalId,
        terminalId: activeTerminalId,
        topic: saveDialogName.trim(),
        workingDirectory: proj?.path || '',
        totalTokens: session?.total_tokens || 0,
        totalCost: session?.total_cost || 0,
      });
      if (result?.success) {
        loadSessions();
        showError(`Checkpoint saved: "${saveDialogName.trim()}"`, 'info');
      } else {
        showError('Failed to save checkpoint', 'error');
      }
    } catch (e) {
      console.error('[TerminalPage] Failed to save session checkpoint:', e);
      showError('Failed to save session', 'error');
    }
  }, [activeTerminalId, selectedProject, projects, sessions, saveDialogName, showError, loadSessions]);

   // Resize sidebar
   const startResize = useCallback((e: React.MouseEvent) => {
     e.preventDefault();
     setIsResizing(true);
     const startX = e.clientX;
     const startWidth = sidebarWidth;
     
     const handleMouseMove = (e: MouseEvent) => {
       const delta = startX - e.clientX;
       const newWidth = Math.max(200, startWidth + delta);
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

  useEffect(() => {
    loadProjects();
    // Load project from localStorage if no propProjectId
    if (!propProjectId) {
      const stored = localStorage.getItem('terminal-project');
      if (stored) {
        setSelectedProject(stored);
      }
    }
  }, [loadProjects]);

  useEffect(() => {
    if (activeTab === 'presets') {
      loadPresets();
    } else if (activeTab === 'sessions') {
      loadSessions();
    } else if (activeTab === 'analytics' && window.deskflowAPI) {
      fetchAnalyticsData();
      loadSessions();
    }
  }, [activeTab, selectedProject, loadPresets, loadSessions, analyticsPeriod, fetchAnalyticsData]);

  // Load auto-assign config on mount
  useEffect(() => {
    window.deskflowAPI?.getAutoAssignConfig?.().then(setAutoAssignConfig);
  }, []);

  // Load routing costs when Configs tab is active
  const loadRoutingCosts = useCallback(async () => {
    try { const costs = await window.deskflowAPI?.getRoutingCosts?.(); setRoutingCosts(costs); } catch {}
  }, []);
  const [routingCosts, setRoutingCosts] = useState<any>(null);
  useEffect(() => {
    if (activeTab === 'configs') {
      loadRoutingCosts();
      window.deskflowAPI?.getAutoAssignConfig?.().then(setAutoAssignConfig);
    }
  }, [activeTab, loadRoutingCosts]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('terminal-activeTab', activeTab);
  }, [activeTab]);

  // Persist sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('terminal-sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Persist selected project to localStorage
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('terminal-project', selectedProject);
    }
  }, [selectedProject]);

  // Auto-select send target session when active terminal changes
  useEffect(() => {
    if (activeTerminalId) {
      const sessionForTerminal = sessions.find(s => s.terminal_id === activeTerminalId);
      if (sessionForTerminal) {
        setSendTargetSession(sessionForTerminal.id);
      }
    }
  }, [activeTerminalId, sessions]);



  // Load workspace state on mount (for propProjectPath mode)
  useEffect(() => {
    if (!propProjectId || !window.deskflowAPI?.loadWorkspace) return;
    window.deskflowAPI.loadWorkspace({ scope: 'project', projectId: propProjectId }).then((result: any) => {
      if (result?.success && result.data) {
        if (result.data.sidebarWidth) setSidebarWidth(result.data.sidebarWidth);
        if (result.data.activeTab) setActiveTab(result.data.activeTab);
      }
    }).catch(() => {});
  }, [propProjectId]);

  // Track terminals currently being initialized (prevent duplicate init calls)
  const initializingTerminals = useRef(new Set<string>());
  const sessionTerminalsRef = useRef(new Set<string>());

  // Save workspace state on relevant changes (debounced)
  const saveWorkspaceDebounce = useRef<NodeJS.Timeout | null>(null);

  const handleSaveWorkspace = useCallback(async () => {
    if (!propProjectId || !window.deskflowAPI?.saveWorkspace) return;
    try {
      await window.deskflowAPI.saveWorkspace({
        projectId: propProjectId,
        scope: 'project',
        sidebarWidth,
        activeTab,
        terminalTabs: Object.keys(terminalTabs),
      });
      showError('Workspace saved', 'info');
    } catch {}
  }, [propProjectId, sidebarWidth, activeTab, terminalTabs]);

  const handleLoadWorkspace = useCallback(async () => {
    if (!propProjectId || !window.deskflowAPI?.loadWorkspace) return;
    try {
      const result = await window.deskflowAPI.loadWorkspace({ scope: 'project', projectId: propProjectId });
      if (result?.success && result.data) {
        if (result.data.sidebarWidth) setSidebarWidth(result.data.sidebarWidth);
        if (result.data.activeTab) setActiveTab(result.data.activeTab);
      }
    } catch {}
  }, [propProjectId]);

  const handleImportOpencodeSessions = useCallback(async (opencodeSessions: any[]) => {
    const proj = projects.find(p => p.id === selectedProject);
    const cwd = proj?.path || '';
    let imported = 0;
    let skipped = 0;
    for (const s of opencodeSessions) {
      const exists = sessions.some(t => t.resume_id === s.id);
      if (exists) { skipped++; continue; }
      await window.deskflowAPI?.saveTerminalSession?.({
        projectId: selectedProject,
        agent: s.agent || 'opencode',
        resumeId: s.id,
        topic: s.topic || 'Imported from opencode',
        workingDirectory: cwd || s.workingDirectory || '',
      });
      imported++;
    }
    loadSessions();
    setShowImportSessionsDialog(false);
    showError(`Imported ${imported} session${imported !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} already exist)` : ''}`, 'info');
  }, [selectedProject, projects, sessions]);

  const fetchOpencodeSessionTitle = useCallback(async () => {
    try {
      const result = await window.deskflowAPI?.executeCommand?.('opencode session list');
      if (result?.error || !result?.stdout?.trim()) return;
      const lines = result.stdout.trim().split('\n').filter((l: string) => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const idMatch = line.match(/^([a-zA-Z0-9_\-]{8,})\s+/);
        if (!idMatch) continue;
        const rest = line.slice(idMatch[0].length).trim();
        const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*$/);
        const title = dateMatch ? rest.slice(0, dateMatch.index).trim() : rest;
        if (title) { setOpenCodeSessionName(title); return; }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (showNewSessionDialog) fetchOpencodeSessionTitle();
  }, [showNewSessionDialog, fetchOpencodeSessionTitle]);

  useEffect(() => {
    if (!propProjectId || !window.deskflowAPI?.saveWorkspace) return;
    if (saveWorkspaceDebounce.current) clearTimeout(saveWorkspaceDebounce.current);
    saveWorkspaceDebounce.current = setTimeout(handleSaveWorkspace, 2000);
    return () => {
      if (saveWorkspaceDebounce.current) clearTimeout(saveWorkspaceDebounce.current);
    };
  }, [propProjectId, sidebarWidth, activeTab, terminalTabs, handleSaveWorkspace]);

  const spawnTerminal = useCallback(async (terminalId: string, cwd?: string) => {
    console.log('[TerminalPage] spawnTerminal called:', terminalId, cwd);
    if (!window.deskflowAPI) {
      showError('Terminal API not available - cannot create terminal', 'error');
      return false;
    }
    try {
      const result = await window.deskflowAPI.spawnTerminal(terminalId, cwd || '');
      if (!result.success) {
        showError(`Failed to spawn shell: ${result.error || 'Unknown error'}`, 'error');
        return false;
      }
      return true;
    } catch (e) {
      console.error('[TerminalPage] spawnTerminal error:', e);
      showError(`Terminal creation failed: ${(e as any).message}`, 'error');
      return false;
    }
  }, [showError]);

  // Handle create-terminal events: spawn the PTY and notify the system
  // Placed after spawnTerminal to avoid TDZ reference error
  useEffect(() => {
    const handleCreateTerminal = async (e: CustomEvent) => {
      const d = e.detail as { terminalId: string; cwd?: string; agent?: string; sessionName?: string };
      userCreatedTerminalRef.current = true;
      await spawnTerminal(d.terminalId, d.cwd || propProjectPath);
      window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId: d.terminalId } }));
      window.dispatchEvent(new CustomEvent('terminal-created', { detail: { terminalId: d.terminalId, agent: d.agent } }));
    };
    window.addEventListener('create-terminal', handleCreateTerminal as EventListener);
    return () => window.removeEventListener('create-terminal', handleCreateTerminal as EventListener);
  }, [spawnTerminal, propProjectPath]);

  const handleLayoutChange = useCallback((layout: PaneNode) => {
    setTerminalLayout(layout);
    saveLayout(layout);
  }, [saveLayout]);

  const handleMiniMapTerminalMove = useCallback((fromId: string, toId: string) => {
    if (!terminalLayout) return;
    const newLayout = swapLeavesInTree(terminalLayout, fromId, toId);
    setTerminalLayout(newLayout);
    saveLayout(newLayout);
  }, [terminalLayout, saveLayout]);

  const handleMiniMapSplit = useCallback((terminalId: string, direction: 'horizontal' | 'vertical') => {
    if (!terminalLayout) return;
    const newTerminalId = `term-${Date.now()}`;
    const newLayout = splitPane(terminalLayout, terminalId, newTerminalId, direction);
    setTerminalLayout(newLayout);
    saveLayout(newLayout);
    window.dispatchEvent(new CustomEvent('create-terminal', {
      detail: { terminalId: newTerminalId, cwd: propProjectPath }
    }));
  }, [terminalLayout, saveLayout, propProjectPath]);

  const handleTabSelect = useCallback((terminalId: string) => {
    setActiveTerminalId(terminalId);
    if (terminalLayout) {
      const groups = extractGroups(terminalLayout);
      const groupIdx = groups.findIndex(g => g.terminals.includes(terminalId));
      if (groupIdx >= 0) {
        setActiveGroupIndex(groupIdx);
      }
      if (terminalLayout.type === 'leaf') {
        if (terminalLayout.terminalId !== terminalId) {
          const updated = { ...terminalLayout, terminalId };
          setTerminalLayout(updated);
          saveLayout(updated);
        }
      }
    }
  }, [terminalLayout, saveLayout]);

  const handleMiniMapTerminalSelect = useCallback((terminalId: string) => {
    setActiveTerminalId(terminalId);
    if (terminalTabs[terminalId]) {
      handleTabSelect(terminalId);
    }
  }, [handleTabSelect, terminalTabs]);

  const handleMiniMapToggleDirection = useCallback((_groupIndex: number, path: number[]) => {
    if (!terminalLayout) return;
    const newLayout = togglePaneDirection(terminalLayout, path);
    setTerminalLayout(newLayout);
    saveLayout(newLayout);
  }, [terminalLayout, saveLayout]);

  const handleTerminalMoveToGroup = useCallback((terminalId: string, targetGroupIndex: number) => {
    if (!terminalLayout) return;
    const groups = extractGroups(terminalLayout);
    if (targetGroupIndex < 0 || targetGroupIndex >= groups.length) return;
    const sourceGroup = groups.find(g => g.terminals.includes(terminalId));
    if (!sourceGroup) return;
    if (groups.indexOf(sourceGroup) === targetGroupIndex) return;
    const targetGroupFirstId = groups[targetGroupIndex].terminals[0];
    if (!targetGroupFirstId) return;
    const newLeaf: PaneNode = { type: 'leaf', terminalId };
    // Remove source terminal from tree first
    const newLayout = removeLeafFromTree(terminalLayout, terminalId);
    if (!newLayout) return;
    // Find the target group's anchor terminal in the new tree
    // (group indices may have shifted after removal, so search by terminal ID)
    const anchorTarget = findLeafInTree(newLayout, targetGroupFirstId);
    if (!anchorTarget) return;
    const finalLayout = addLeafToGroup(newLayout, anchorTarget.terminalId!, newLeaf, 'vertical');
    setTerminalLayout(finalLayout);
    saveLayout(finalLayout);
  }, [terminalLayout, saveLayout]);

  const loadSavedConfigs = useCallback(async () => {
    if (!window.deskflowAPI) return;
    try {
      const presetData = await window.deskflowAPI.getTerminalPresets(selectedProject || undefined);
      return presetData || [];
    } catch {
      return [];
    }
  }, [selectedProject]);

  const handleActiveTerminalChange = useCallback((terminalId: string) => {
    setActiveTerminalId(terminalId);
  }, []);

  const closeTerminal = useCallback(async (terminalId: string) => {
    if (!window.deskflowAPI) return;
    try {
      const tab = terminalTabs[terminalId];
      const sessionInTerminal = sessions.find(s => s.terminal_id === terminalId);
      if (sessionInTerminal) {
        await window.deskflowAPI.saveTerminalSession?.({
          id: sessionInTerminal.id,
          projectId: selectedProject || undefined,
          agent: sessionInTerminal.agent,
          topic: sessionInTerminal.topic,
          workingDirectory: projects.find(p => p.id === selectedProject)?.path,
        });
      }
      loadSessions();

      await window.deskflowAPI.killTerminal(terminalId);
      window.deskflowAPI.terminalAPI?.destroy(terminalId);

      const remainingTabs = Object.keys(terminalTabs).filter(id => id !== terminalId);

      setTerminalTabs(prev => {
        const next = { ...prev };
        delete next[terminalId];
        return next;
      });

      // Update active terminal
      if (activeTerminalId === terminalId) {
        setActiveTerminalId(remainingTabs.length > 0 ? remainingTabs[0] : null);
      }

      // Update layout to remove the closed terminal
      if (terminalLayout && terminalLayout.type === 'leaf' && terminalLayout.terminalId === terminalId) {
        if (remainingTabs.length > 0) {
          const updated = { ...terminalLayout, terminalId: remainingTabs[0] };
          setTerminalLayout(updated);
          saveLayout(updated);
        } else {
          setTerminalLayout(null);
          saveLayout(null);
        }
      } else if (terminalLayout && terminalLayout.type === 'split') {
        const updated = removePane(terminalLayout, terminalId);
        setTerminalLayout(updated);
        saveLayout(updated);
      }

      // Ensure activeGroupIndex is in bounds
      const groupsAfterClose = getGroupTrees(terminalLayout?.type === 'split' ? removePane(terminalLayout!, terminalId) : terminalLayout);
      if (activeGroupIndex >= groupsAfterClose.length) {
        setActiveGroupIndex(Math.max(0, groupsAfterClose.length - 1));
      }

      window.dispatchEvent(new CustomEvent('terminal-cleanup', { detail: { terminalId } }));
    } catch (e) {
      console.error('[TerminalPage] Failed to close terminal:', e);
    }
  }, [activeTerminalId, terminalTabs, selectedProject, projects, loadSessions, terminalLayout, saveLayout, sessions]);

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

  const handleSavePresetEdit = useCallback(async () => {
    if (!window.deskflowAPI || !editPreset || !editPreset.name || (!editPreset.isBuiltIn && !editPreset.command)) return;
    try {
      await window.deskflowAPI.saveTerminalPreset(editPreset);
      setShowEditPreset(false);
      setEditPreset(null);
      loadPresets();
    } catch (e) {
      console.warn('[TerminalPage] Failed to save preset:', e);
    }
  }, [editPreset, loadPresets]);

  const handleExecutePreset = useCallback(async (preset: Preset) => {
    if (!window.deskflowAPI || !activeTerminalId) return;
    try {
      if (preset.isBuiltIn) {
        if (preset.id === 'builtin-remind') {
          const projectDir = propProjectPath || (projects.find(p => p.id === selectedProject)?.path);
          if (projectDir) {
            const rulesResult = await window.deskflowAPI.readProjectFile?.('agent/RULES_COMPACT.md', projectDir);
            const stateResult = await window.deskflowAPI.readProjectFile?.('agent/state.md', projectDir);
            const rulesContent = rulesResult?.success ? rulesResult.data : '';
            const stateContent = stateResult?.success ? stateResult.data : '';
            let remindContent = '## [SYSTEM] Remind — Current Session Context\n';
            if (rulesContent) remindContent += rulesContent + '\n';
            if (stateContent) {
              const truncated = stateContent.length > 1500 ? stateContent.slice(0, 1500) + '...' : stateContent;
              remindContent += '## Current State (from state.md)\n' + truncated + '\n';
            }
            await window.deskflowAPI.terminalWrite(activeTerminalId, remindContent + '\r\n');
          }
        }
        return;
      }
      const result = await window.deskflowAPI.executeTerminalPreset(preset.id);
      if (result?.command) {
        await window.deskflowAPI.terminalWrite(activeTerminalId, result.command + '\r\n');
      }
    } catch (e) {
      console.warn('[TerminalPage] Failed to execute preset:', e);
    }
  }, [activeTerminalId, propProjectPath, projects, selectedProject]);

  const handleResumeSession = useCallback(async (session: Session, targetTerminalId?: string) => {
    if (!window.deskflowAPI) return;
    try {
      const resumeId = session.resume_id || (await window.deskflowAPI.getTerminalSessionResumeId(session.id));
      const proj = projects.find(p => p.id === selectedProject);
      const cwd = proj?.path || '';
      let resolvedTerminalId = targetTerminalId;

      // Load saved session config for init content
      let savedInitContent: string | undefined;
      let savedSystemPrompt: string | undefined;
      try {
        const configResult = await window.deskflowAPI.loadSessionConfig?.(session.id, cwd);
        if (configResult?.success && configResult.data) {
          const cfg = configResult.data;
          if (cfg.initContent) savedInitContent = cfg.initContent;
          if (cfg.customSystemPrompt) savedSystemPrompt = cfg.customSystemPrompt;
        }
      } catch {}

      if (!resolvedTerminalId) {
        resolvedTerminalId = `term-${Date.now()}-resume`;
        setTerminalTabs(prev => ({ ...prev, [resolvedTerminalId!]: { name: proj?.name || 'Resumed', agent: session.agent || 'claude', modelTier: session.modelTier || 'mid' } }));
        setActiveTerminalId(resolvedTerminalId);
        const updatedLayout = insertIntoLayout(terminalLayout, resolvedTerminalId);
        setTerminalLayout(updatedLayout);
        saveLayout(updatedLayout);
        const spawned = await spawnTerminal(resolvedTerminalId, cwd);
        if (!spawned) {
          showError('Failed to create terminal', 'error');
          return;
        }
        window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId: resolvedTerminalId } }));
        await registerTerminal(resolvedTerminalId);
        await initializeTerminal(resolvedTerminalId, session.agent || 'claude', resumeId || undefined, undefined, savedSystemPrompt);
      } else {
        setActiveTerminalId(resolvedTerminalId);
      }

      // Update session with terminal binding
      if (resolvedTerminalId && session.terminal_id !== resolvedTerminalId) {
        await window.deskflowAPI.saveTerminalSession?.({
          id: session.id,
          projectId: selectedProject,
          agent: session.agent,
          resumeId: resumeId || undefined,
          terminalId: resolvedTerminalId,
          topic: session.topic,
          workingDirectory: proj?.path || '',
        });
      }

      loadSessions();
      showError(`Opened session "${session.topic}" in terminal`, 'info');
    } catch (e) {
      console.warn('[TerminalPage] Failed to resume session:', e);
      showError('Failed to resume session', 'error');
    }
  }, [selectedProject, projects, terminalTabs, sessions, showError, loadSessions, spawnTerminal, initializeTerminal]);

  const handleOpenSessionInTerminal = useCallback((session: Session, terminalId: string) => {
    const existingSession = sessions.find(s => s.terminal_id === terminalId);
    const doReplace = async () => {
      await closeTerminal(terminalId);
      handleResumeSession(session);
    };
    if (existingSession) {
      setConfirmDialog({
        isOpen: true,
        message: `Terminal already has session "${existingSession.topic}". Replace it with "${session.topic}"?`,
        onConfirm: doReplace,
      });
    } else {
      doReplace();
    }
  }, [sessions, handleResumeSession, closeTerminal]);

  // Delete session from database
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!window.deskflowAPI) return;
    try {
      await window.deskflowAPI.deleteTerminalSession(sessionId);
      loadSessions();
    } catch (e) {
      console.warn('[TerminalPage] Failed to delete session:', e);
    }
  }, [loadSessions]);

  const handleSaveSession = useCallback(async (data: { sessionId: string; topic?: string; category?: string; productArea?: string; description?: string; status?: string; tags?: string[] }): Promise<boolean> => {
    if (!window.deskflowAPI) return false;
    try {
      const result = await window.deskflowAPI.updateSessionCategory(data);
      if (result?.success) { loadSessions(); return true; }
      return false;
    } catch (e) {
      console.warn('[TerminalPage] Failed to update session:', e);
      return false;
    }
  }, [loadSessions]);

  useEffect(() => {
    const handleCreateTerminalForProblem = async (e: CustomEvent<{ terminalId: string; prompt: string; projectPath?: string }>) => {
      const { terminalId, prompt, projectPath } = e.detail;
      const proj = projects.find(p => p.id === selectedProject);
      const agent = localStorage.getItem('terminal-defaultAgent') || 'claude';
      setTerminalTabs(prev => {
        if (prev[terminalId]) return prev;
        return { ...prev, [terminalId]: { name: proj?.name || 'Terminal', agent } };
      });
      setActiveTerminalId(terminalId);
      const updatedLayout = insertIntoLayout(terminalLayout, terminalId);
      setTerminalLayout(updatedLayout);
      saveLayout(updatedLayout);
      window.dispatchEvent(new CustomEvent('create-terminal', {
        detail: { terminalId, cwd: projectPath, agent },
      }));
      if (prompt) {
        setTimeout(async () => {
          await window.deskflowAPI?.terminalWrite?.(terminalId, prompt + '\r\n');
        }, 3000);
      }
      // Auto-create session when problem is assigned to terminal
      const sessionName = `Problem: ${prompt?.substring(0, 60) || 'Assigned'}`;
      await window.deskflowAPI?.saveTerminalSession?.({
        id: `session-${Date.now()}`,
        projectId: selectedProject,
        agent,
        terminalId,
        topic: sessionName,
        workingDirectory: projectPath || proj?.path || '',
      });
      loadSessions();
    };

    const handleFocusTerminal = (e: CustomEvent<{ terminalId: string }>) => {
      handleTabSelect(e.detail.terminalId);
    };

    const handleTerminalCreated = async (e: CustomEvent<{ terminalId: string; agent?: string }>) => {
      const { terminalId } = e.detail;
      const proj = projects.find(p => p.id === selectedProject);
      setTerminalTabs(prev => {
        if (prev[terminalId]) return prev;
        return { ...prev, [terminalId]: { name: proj?.name || 'Terminal', agent: 'shell' } };
      });
      await registerTerminal(terminalId);
    };

    const handleClosePane = (e: CustomEvent<{ terminalId: string }>) => {
      closeTerminal(e.detail.terminalId);
    };

    const handleOpenNewSessionForTerminal = (e: CustomEvent<{ terminalId: string }>) => {
      const { terminalId } = e.detail;
      setNewSessionTerminalMode('select');
      setNewSessionSelectedTerminal(terminalId);
      setNewSessionAgent('claude');
      setNewSessionName('');
      setShowNewSessionDialog(true);
    };

    const handleTriggerProvision = () => {
      if (initStatus === 'init-ok') {
        if (!window.confirm('This project is already initialized. Re-initialize workspace files?')) return;
      }
      setShowInitModal(true);
    };

    const handleOpenNewAgent = () => {
      if (!selectedProject) { showError('Please select a project first', 'warning'); return; }
      setNewSessionMode('initialize');
      setNewSessionAgent(localStorage.getItem('terminal-defaultAgent') || 'claude');
      setShowNewSessionDialog(true);
    };

    window.addEventListener('create-terminal-for-problem', handleCreateTerminalForProblem as EventListener);
    window.addEventListener('focus-terminal', handleFocusTerminal as EventListener);
    window.addEventListener('terminal-created', handleTerminalCreated as EventListener);
    window.addEventListener('close-pane', handleClosePane as EventListener);
    window.addEventListener('open-new-session-for-terminal', handleOpenNewSessionForTerminal as EventListener);
    window.addEventListener('trigger-provision', handleTriggerProvision);
    window.addEventListener('open-new-agent', handleOpenNewAgent);
    const handleSwitchSidebarTab = (e: CustomEvent) => {
      const tab = e.detail;
      if (tab === 'context') setActiveTab('context');
    };
    window.addEventListener('switch-sidebar-tab', handleSwitchSidebarTab as EventListener);
    const handleCloseWorkspaceDialog = () => {
      const hasTerminals = Object.keys(terminalTabsRef.current).length > 0;
      if (!hasTerminals) {
        onCloseWorkspaceRef.current?.();
        return;
      }
      setShowCloseWorkspaceDialog(true);
    };
    window.addEventListener('open-close-workspace-dialog', handleCloseWorkspaceDialog);
    return () => {
      window.removeEventListener('create-terminal-for-problem', handleCreateTerminalForProblem as EventListener);
      window.removeEventListener('focus-terminal', handleFocusTerminal as EventListener);
      window.removeEventListener('terminal-created', handleTerminalCreated as EventListener);
      window.removeEventListener('close-pane', handleClosePane as EventListener);
      window.removeEventListener('open-new-session-for-terminal', handleOpenNewSessionForTerminal as EventListener);
      window.removeEventListener('trigger-provision', handleTriggerProvision);
      window.removeEventListener('switch-sidebar-tab', handleSwitchSidebarTab as EventListener);
      window.removeEventListener('open-new-agent', handleOpenNewAgent);
      window.removeEventListener('open-close-workspace-dialog', handleCloseWorkspaceDialog);
    };
  }, [projects, selectedProject, propProjectId, propProjectPath, registerTerminal, spawnTerminal, loadSessions, initializeTerminal, handleTabSelect, closeTerminal, showError, setInitStatus, setNewSessionMode, setNewSessionAgent, setShowNewSessionDialog]);

  return (
    <PageShell page="terminal" className="flex-1 flex bg-black text-white !p-0 !space-y-0 relative">
      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-950 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold tracking-wider text-white">Terminal</span>
            {(() => {
              const currentProject = projects.find(p => p.id === selectedProject);
              return selectedProject && currentProject ? (
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-zinc-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-300">{currentProject.name}</span>
                  {propProjectPath && (
                    <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">{propProjectPath}</span>
                  )}
                </div>
              ) : null;
            })()}
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
                    if (!selectedProject) { alert('Please select a project first'); return; }
                    const proj = projects.find(p => p.id === selectedProject);
                    if (proj) {
                      const agent = localStorage.getItem('terminal-defaultAgent') || 'claude';
                      const termId = `term-${Date.now()}`;
                      setTerminalTabs(prev => ({ ...prev, [termId]: { name: proj.name, agent, modelTier: 'mid' } }));
                      setActiveTerminalId(termId);
                      const updatedLayout = insertIntoLayout(terminalLayout, termId);
                      setTerminalLayout(updatedLayout);
                      saveLayout(updatedLayout);
                      window.dispatchEvent(new CustomEvent('create-terminal', {
                        detail: { terminalId: termId, cwd: proj.path, agent },
                      }));
                    }
                  }}
                  className="px-2 py-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs rounded flex items-center gap-1 transition-colors duration-150 active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  Open Terminal
                </button>
              </div>
            )}

          {/* Terminal Status Indicator */}
            {activeTerminalId && terminalBindings[activeTerminalId] && (
              <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-zinc-800/50 rounded text-xs relative border border-zinc-700/30">
                <TerminalIcon className="w-3 h-3 text-green-400" />
                <span className="text-zinc-400">
                  {terminalBindings[activeTerminalId].agentType || 'claude'}
                </span>
                {terminalBindings[activeTerminalId].activeProblemId && (
                  <span className="px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">
                    #{terminalBindings[activeTerminalId].activeProblemId}
                  </span>
                )}
                <span className="text-green-400 animate-pulse">●</span>
                <div className="relative">
                  <button
                    onClick={() => setShowBindDropdown(!showBindDropdown)}
                    className="px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400 hover:text-zinc-200 transition-colors duration-150"
                    title="Bind problem"
                  >
                    <Link className="w-3 h-3" />
                  </button>
                  {showBindDropdown && (
                    <div className="absolute top-full right-0 mt-1 w-52 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div className="p-1.5 text-[10px] text-zinc-500 border-b border-zinc-700">Bind problem to terminal</div>
                      {allProblems.length === 0 ? (
                        <div className="p-2 text-xs text-zinc-500">No problems</div>
                      ) : allProblems.map(p => (
                        <button
                          key={p.id}
                          onClick={async () => {
                            await window.deskflowAPI?.saveTerminalBinding?.({
                              terminalId: activeTerminalId,
                              problemId: p.id,
                              status: 'active'
                            });
                            await window.deskflowAPI?.updateTerminalBinding?.({
                              terminalId: activeTerminalId,
                              updates: { active_problem_id: p.id }
                            });
                            setShowBindDropdown(false);
                            loadTerminalBindings();
                          }}
                          className={`w-full text-left px-2 py-1.5 text-xs hover:bg-zinc-700 flex items-center gap-2 ${
                            terminalBindings[activeTerminalId]?.activeProblemId === p.id
                              ? 'text-purple-300 bg-purple-600/20' : 'text-zinc-300'
                          }`}
                        >
                          <span className="text-zinc-500">#{p.id}</span>
                          <span className="truncate">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Instruction Input */}
            {activeTerminalId && (
              <>
                <div className="relative">
                  <button
                    onClick={() => {
                      if (showInstructionPanel) {
                        setShowInstructionPanel(false);
                      } else {
                        setShowInstructionInput(false);
                        setShowInstructionPanel(true);
                      }
                    }}
                    className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs rounded flex items-center gap-1 transition-colors duration-150"
                    title="Open instruction panel with problem/request/skill selectors"
                  >
                    <Send className="w-3 h-3" />
                    Compose
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (showInstructionInput) {
                      setShowInstructionInput(false);
                    } else {
                      setShowInstructionPanel(false);
                      setShowInstructionInput(true);
                    }
                  }}
                  className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded flex items-center gap-1 transition-colors duration-150"
                  title="Quick send (text only)"
                >
                  Quick
                </button>
                <button
                  onClick={handleSaveCheckpoint}
                  className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded flex items-center gap-1 transition-colors duration-150"
                  title="Save session checkpoint"
                >
                  💾 Save
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Instruction Panel (full mode) */}
        {showInstructionPanel && activeTerminalId && (
          <InstructionPanel
            problems={allProblems}
            requests={allRequests}
            onSend={handleInstructionPanelSend}
            onClose={() => setShowInstructionPanel(false)}
            isSending={isSending}
            projectPath={propProjectPath || projects.find(p => p.id === selectedProject)?.path}
            systemPromptLayers={systemPromptLayers}
          />
        )}

        {/* Quick Instruction Input Bar */}
        {showInstructionInput && activeTerminalId && (
          <div className="px-4 py-2 bg-gradient-to-r from-zinc-800/90 to-zinc-900/80 border-b border-zinc-700/60 backdrop-blur-sm">
            {/* Quoted References Chips */}
            {quotedReferences.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 px-0.5">
                {quotedReferences.map((ref, i) => (
                  <div
                    key={ref.id ?? i}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-900/30 border border-cyan-700/30 rounded text-[10px] text-cyan-300 max-w-[240px]"
                  >
                    <span className="font-semibold uppercase text-[9px] text-cyan-500 flex-shrink-0">{ref.role}</span>
                    <span className="truncate text-zinc-300">{ref.content.slice(0, 40)}</span>
                    <button
                      onClick={() => setQuotedReferences(prev => prev.filter(r => r.id !== ref.id))}
                      className="ml-0.5 text-zinc-500 hover:text-zinc-200 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              {/* Session selector dropdown */}
              <select
                value={sendTargetSession}
                onChange={(e) => setSendTargetSession(e.target.value)}
                className="px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 min-w-[120px]"
                title="Select session to route commands to"
              >
                <option value="">Active Terminal</option>
                {sessions.filter(s => s.terminal_id && terminalTabs[s.terminal_id]).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.topic || 'Unnamed'} ({terminalTabs[s.terminal_id!]?.name || '?'})
                  </option>
                ))}
              </select>
              <div className="flex-1 relative">
                <textarea
                  ref={instructionTextareaRef}
                  value={instructionText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInstructionText(val);
                    // Detect @mention — populate dropdown
                    if (val.includes('@')) {
                      const atIdx = val.lastIndexOf('@');
                      const afterAt = val.slice(atIdx + 1);
                      const tabs = Object.entries(terminalTabs).map(([id, t]) => ({
                        id,
                        name: t.name,
                        agent: t.agent,
                        sessionTopic: sessions.find(s => s.terminal_id === id)?.topic || '',
                      }));
                      const query = afterAt.split(/\s/)[0].toLowerCase();
                      const results = query
                        ? tabs.filter(t => t.name.toLowerCase().includes(query) || t.id.toLowerCase().includes(query))
                        : tabs;
                      setMentionDropdown({ visible: results.length > 0, query, results: results.slice(0, 8), cursor: 0 });
                    } else {
                      setMentionDropdown(prev => ({ ...prev, visible: false }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (mentionDropdown.visible) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setMentionDropdown(prev => ({ ...prev, cursor: Math.min(prev.cursor + 1, prev.results.length - 1) }));
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setMentionDropdown(prev => ({ ...prev, cursor: Math.max(prev.cursor - 1, 0) }));
                        return;
                      }
                      if (e.key === 'Enter' && mentionDropdown.results[mentionDropdown.cursor]) {
                        e.preventDefault();
                        const selected = mentionDropdown.results[mentionDropdown.cursor];
                        const beforeAt = instructionText.slice(0, instructionText.lastIndexOf('@'));
                        setInstructionText(`@${selected.name} >> ${instructionText.slice(instructionText.lastIndexOf('@')).replace(/@\S+\s*/, '')}`);
                        setMentionDropdown(prev => ({ ...prev, visible: false }));
                        return;
                      }
                      if (e.key === 'Escape') {
                        setMentionDropdown(prev => ({ ...prev, visible: false }));
                        return;
                      }
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendInstruction();
                    }
                  }}
                  rows={1}
                  autoFocus
                  placeholder="Type @term to route, or type instruction... (Enter to send, Shift+Enter for newline)"
                  className="w-full px-3 py-1.5 bg-zinc-900/80 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 pr-16 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors duration-150 resize-none overflow-hidden"
                />
                {/* @mention dropdown */}
                {mentionDropdown.visible && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg  z-50 max-h-[200px] overflow-y-auto">
                    {mentionDropdown.results.map((r, i) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          const beforeAt = instructionText.slice(0, instructionText.lastIndexOf('@'));
                          setInstructionText(`@${r.name} >> `);
                          setMentionDropdown(prev => ({ ...prev, visible: false }));
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-xs transition-colors ${
                          i === mentionDropdown.cursor ? 'bg-zinc-700 border-l-2 border-blue-500' : 'hover:bg-zinc-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="font-medium text-zinc-200">{r.name}</span>
                        <span className="text-zinc-500">{r.agent}</span>
                        {r.sessionTopic && (
                          <span className="text-zinc-600 truncate ml-auto max-w-[120px]">{r.sessionTopic}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">
                  {instructionText.length}/500
                </span>
              </div>
               <button
                 onClick={sendInstruction}
                 disabled={!instructionText.trim() || isSending || instructionText.length > 500}
                 className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white text-xs rounded flex items-center gap-1 min-w-[60px] justify-center transition-colors duration-150 active:scale-95"
               >
                 {isSending ? (
                   <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                 ) : (
                   <Send className="w-3 h-3" />
                 )}
                 {isSending ? '' : 'Send'}
               </button>
                <button
                  onClick={handleSaveCheckpoint}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded flex items-center gap-1 transition-colors duration-150"
                  title="Save checkpoint"
                >
                  💾 Save
                </button>
               <button
                 onClick={() => { setShowInstructionInput(false); setInstructionText(''); }}
                 className="px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors duration-150"
               >
                 ✕
               </button>
            </div>
          </div>
        )}
        
        {/* Terminal Tab Bar */}
        <div className="flex items-center bg-zinc-900 border-b border-zinc-800 overflow-x-auto min-h-[36px]">
          {(() => {
            const GROUP_COLORS = ['#6ee7b7', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#34d399', '#fb923c', '#e879f9'];
            const groups = extractGroups(terminalLayout);
            const tabToGroupMap: Record<string, number> = {};
            groups.forEach((g, i) => g.terminals.forEach(tid => { tabToGroupMap[tid] = i; }));
            return Object.entries(terminalTabs).map(([id, tab]) => {
              const sessionInTab = sessions.find(s => s.terminal_id === id);
              const groupIdx = tabToGroupMap[id];
              const groupColor = groupIdx !== undefined ? GROUP_COLORS[groupIdx % GROUP_COLORS.length] : undefined;
              const isActive = activeTerminalId === id;
              const isDragTarget = draggedTabRef.current !== null && draggedTabRef.current !== id;
              return (
                <div
                  key={id}
                  draggable
                  onClick={() => handleTabSelect(id)}
                  onDragStart={(e) => {
                    draggedTabRef.current = id;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const srcId = draggedTabRef.current;
                    if (!srcId || srcId === id || !terminalLayout) return;
                    const srcGroupIdx = tabToGroupMap[srcId];
                    const dstGroupIdx = groupIdx;
                    if (srcGroupIdx === undefined || dstGroupIdx === undefined) return;
                    if (srcGroupIdx === dstGroupIdx) {
                      const swapped = swapLeavesInTree(terminalLayout, srcId, id);
                      setTerminalLayout(swapped);
                      saveLayout(swapped);
                    } else {
                      handleTerminalMoveToGroup(srcId, dstGroupIdx);
                    }
                    draggedTabRef.current = null;
                  }}
                  onDragEnd={() => { draggedTabRef.current = null; }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-zinc-800 select-none transition-colors duration-150 ${
                    isActive
                      ? 'bg-zinc-800 text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  } ${isDragTarget ? 'opacity-60' : ''}`}
                  style={groupColor ? {
                    boxShadow: `inset 0 ${isActive ? 2 : 1}px 0 0 ${groupColor}`
                  } : isActive ? {
                    boxShadow: 'inset 0 2px 0 0 rgb(34,197,94), 0 -2px 6px rgba(34,197,94,0.15)'
                  } : undefined}
                >
                  <Monitor className="w-3 h-3 text-green-500" />
                  {sessionInTab && <StatusDot status={sessionInTab.status} />}
                  <span>{tab.name}</span>
                  {tab.modelTier && (
                    <span className={`text-[9px] px-1 rounded font-medium ${
                      tab.modelTier === 'top' ? 'bg-green-500/20 text-green-400' :
                      tab.modelTier === 'low' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {tab.modelTier}
                    </span>
                  )}
                  {sessionInTab && <CategoryBadge category={sessionInTab.category} />}
                  {terminalFileLocks[id]?.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded" title={`Locked files: ${terminalFileLocks[id].join(', ')}`}>
                      <Lock className="w-2.5 h-2.5" />
                      {terminalFileLocks[id].length}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600 max-w-[80px] truncate">{sessionInTab ? (sessionInTab.topic || tab.agent) : ''}</span>
                  {sessionInTab && (
                    <span className="text-[8px] text-cyan-500 bg-cyan-500/10 px-1 rounded">S</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTerminal(id); }}
                    className="ml-1 p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            });
          })()}
          <button
            onClick={async () => {
              const cwd = selectedProject ? (projects.find(p => p.id === selectedProject)?.path || '') : '';
              const newId = `term-${Date.now()}`;
              const count = Object.keys(terminalTabs).length;
              const defaultAgent = localStorage.getItem('terminal-defaultAgent') || 'claude';
              setTerminalTabs(prev => ({ ...prev, [newId]: { name: `Terminal ${count + 1}`, agent: defaultAgent, modelTier: 'mid' } }));
              setActiveTerminalId(newId);
              const updatedLayout = insertIntoLayout(terminalLayout, newId);
              setTerminalLayout(updatedLayout);
              setActiveGroupIndex(getGroupTrees(updatedLayout).length - 1);
              saveLayout(updatedLayout);
              window.dispatchEvent(new CustomEvent('create-terminal', { detail: { cwd, terminalId: newId } }));
            }}
            className="px-2 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs transition-colors duration-150"
            title="New Terminal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 relative">
          {terminalError && (
            <div className={`px-4 py-2 text-xs border-b ${
              terminalErrorType === 'error' ? 'bg-red-900/40 border-red-700 text-red-200' :
              terminalErrorType === 'warning' ? 'bg-yellow-900/40 border-yellow-700 text-yellow-200' :
              'bg-green-900/40 border-green-700 text-green-200'
            }`}>
              {terminalError}
            </div>
          )}
          {Object.entries(agentInitErrors).map(([tid, err]) => (
            <div key={tid} className="px-4 py-3 text-xs border-b bg-red-900/30 border-red-700/50 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-red-300 font-medium mb-1">Agent initialization failed</div>
                <div className="text-red-200/70 mb-1">{err.detail}</div>
                <div className="text-red-200/50">{err.installHint}</div>
              </div>
              <button
                onClick={() => handleRetryAgentInit(tid, err.reason === 'not-recognized' ? 'opencode' : 'claude')}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded flex-shrink-0 transition-colors"
              >
                Retry
              </button>
            </div>
          ))}
          {layoutLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-[#0d0d0d]">
              <LoadingState variant="spinner" />
            </div>
          ) : (
            <>
              {(() => {
                const groups = getGroupTrees(terminalLayout);
                if (groups.length > 1) {
                  return (
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#0d0d0d] border-b border-zinc-800/50">
                      {groups.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveGroupIndex(i)}
                          className={`px-2.5 py-0.5 text-[11px] rounded transition-colors ${
                            activeGroupIndex === i
                              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-600/40'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                          }`}
                        >
                          Group {i + 1}
                        </button>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
              {(() => {
                const activeGroupTree = terminalLayout ? getGroupTrees(terminalLayout)[activeGroupIndex] ?? terminalLayout : null;
                const handleGroupLayoutChange = (newGroupTree: PaneNode) => {
                  setTerminalLayout(prev => {
                    if (!prev) return newGroupTree;
                    const updated = updateGroupTree(prev, activeGroupIndex, newGroupTree);
                    saveLayout(updated);
                    return updated;
                  });
                };
                return (
                  <div
                    className="w-full h-full relative"
                    onDragOver={(e) => {
                      if (draggedTabRef.current || draggedSessionId) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const srcId = draggedTabRef.current;
                      if (srcId && terminalLayout) {
                        const targetEl = (e.target as HTMLElement).closest('[data-terminal-id]') as HTMLElement | null;
                        if (targetEl) {
                          const targetId = targetEl.getAttribute('data-terminal-id');
                          if (targetId && targetId !== srcId) {
                            const groups = extractGroups(terminalLayout);
                            const targetGroupIdx = groups.findIndex(g => g.terminals.includes(targetId));
                            const srcGroupIdx = groups.findIndex(g => g.terminals.includes(srcId));
                            if (srcGroupIdx !== -1 && targetGroupIdx !== -1 && srcGroupIdx !== targetGroupIdx) {
                              handleTerminalMoveToGroup(srcId, targetGroupIdx);
                            }
                          }
                        }
                        draggedTabRef.current = null;
                        return;
                      }
                      const sessionData = e.dataTransfer.getData('text/plain');
                      if (sessionData) {
                        try {
                          const parsed = JSON.parse(sessionData);
                          const targetEl = (e.target as HTMLElement).closest('[data-terminal-id]') as HTMLElement | null;
                          if (targetEl) {
                            const targetId = targetEl.getAttribute('data-terminal-id');
                            if (targetId && sessions) {
                              const session = sessions.find(s => s.id === parsed.id);
                              if (session) {
                                handleOpenSessionInTerminal(session, targetId);
                              }
                            }
                          }
                        } catch {}
                        setDraggedSessionId(null);
                      }
                    }}
                  >
                    <TerminalLayout
                      layout={activeGroupTree}
                      activeTerminalId={activeTerminalId}
                      spawnTerminal={spawnTerminal}
                      onLayoutChange={handleGroupLayoutChange}
                      onActiveTerminalChange={handleActiveTerminalChange}
                      onCloseTerminal={closeTerminal}
                      projectPath={propProjectPath}
                    />
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div 
          className="bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-black/95 backdrop-blur-sm border-l border-zinc-800/50 flex flex-col relative  shadow-black/30"
          style={{ width: sidebarWidth }}
        >
          {/* Resize Handle — glass accent */}
          <div 
            className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize transition-colors duration-150 ${
              isResizing
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                : 'hover:bg-cyan-500/40 bg-transparent'
            }`}
            onMouseDown={startResize}
          />
          
          {/* Sidebar Header with Collapse Button */}
          <div className="relative flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/50">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.04] to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 relative">
              <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.5)]" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Terminal</span>
            </div>
            <div className="flex items-center gap-0.5 relative">
              <button
                onClick={() => setShowFeaturesDialog(true)}
                className="p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-500 hover:text-cyan-300 transition-colors duration-150 active:scale-95"
                title="Workspace Features"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowGeneralistDialog(true)}
                className="p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-500 hover:text-violet-300 transition-colors duration-150 active:scale-95"
                title="Skill Configuration"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-500 hover:text-zinc-200 transition-colors duration-150 active:scale-95"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {/* Tab Headers */}
          <div className="flex border-b border-zinc-800 flex-wrap">
            {([
              { key: 'presets', icon: Zap, label: 'Presets', color: 'green' },
              { key: 'sessions', icon: Clock, label: 'Sessions', color: 'green' },
              { key: 'map', icon: Monitor, label: 'Map', color: 'green' },
              { key: 'analytics', icon: PieChart, label: 'Analytics', color: 'green' },
              { key: 'issues', icon: ListChecks, label: 'Issues', color: 'emerald' },
              { key: 'files', icon: Folder, label: 'Files', color: 'yellow' },
              { key: 'skills', icon: Sparkles, label: 'Skills', color: 'indigo' },
              { key: 'design', icon: Palette, label: 'Design', color: 'pink' },
              { key: 'configs', icon: Settings, label: 'Configs', color: 'orange' },
              { key: 'history', icon: RefreshCw, label: 'History', color: 'rose' },
              { key: 'context', icon: Settings2, label: 'Context', color: 'amber' },
              { key: 'context-maintenance', icon: Database, label: 'Maintenance', color: 'violet' },
            ] as const).map((tab) => {
              const colorMap: Record<string, string> = {
                green: 'text-green-400 border-green-500 border-b-2 border-[var(--tab-accent)]',
                emerald: 'text-emerald-400 border-emerald-500 border-b-2 border-[var(--tab-accent)]',
                yellow: 'text-yellow-400 border-yellow-500 border-b-2 border-[var(--tab-accent)]',
                indigo: 'text-indigo-400 border-indigo-500 border-b-2 border-[var(--tab-accent)]',
                pink: 'text-pink-400 border-pink-500 border-b-2 border-[var(--tab-accent)]',
                orange: 'text-orange-400 border-orange-500 border-b-2 border-[var(--tab-accent)]',
                rose: 'text-rose-400 border-rose-500 border-b-2 border-[var(--tab-accent)]',
                violet: 'text-violet-400 border-violet-500 border-b-2 border-[var(--tab-accent)]',
                amber: 'text-amber-400 border-amber-500 border-b-2 border-[var(--tab-accent)]',
              };
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    if (tab.key === 'files') setFileChangedPulse(false);
                    setActiveTab(tab.key);
                  }}
                  className={`flex items-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors duration-150 relative ${
                    isActive
                      ? `${colorMap[tab.color]} border-b-2`
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <tab.icon className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.key === 'files' && fileChangedPulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2">
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
                        <span className="text-xs font-medium text-zinc-200">
                          {preset.isBuiltIn && <span className="text-[10px] text-blue-400 mr-1">[SYSTEM]</span>}
                          {preset.name}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => handleExecutePreset(preset)}
                            className="p-1 hover:bg-zinc-700 rounded"
                            title="Run"
                          >
                            <Play className="w-3 h-3 text-green-400" />
                          </button>
                          {preset.isBuiltIn ? (
                            <button
                              onClick={() => {
                                setEditPreset(preset);
                                setShowEditPreset(true);
                              }}
                              className="p-1 hover:bg-zinc-700 rounded"
                              title="View Details"
                            >
                              <Info className="w-3 h-3 text-blue-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditPreset(preset);
                                setShowEditPreset(true);
                              }}
                              className="p-1 hover:bg-zinc-700 rounded"
                              title="Edit"
                            >
                              <Edit className="w-3 h-3 text-yellow-400" />
                            </button>
                          )}
                          {!preset.isBuiltIn && (
                            <button
                              onClick={() => handleRemovePreset(preset.id)}
                              className="p-1 hover:bg-zinc-700 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 font-mono truncate">{preset.command || 'Re-inject context snapshot into active terminal'}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {showEditPreset && editPreset && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]" onClick={() => { setShowEditPreset(false); setEditPreset(null); }}>
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-semibold text-white mb-4">
                    {editPreset.isBuiltIn ? 'Preset Details' : 'Edit Preset'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Name</label>
                      <input
                        value={editPreset.name}
                        onChange={(e) => setEditPreset(prev => prev ? { ...prev, name: e.target.value } : null)}
                        disabled={editPreset.isBuiltIn}
                        className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 disabled:opacity-50"
                      />
                    </div>
                    {!editPreset.isBuiltIn && (
                      <div>
                        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Command</label>
                        <input
                          value={editPreset.command || ''}
                          onChange={(e) => setEditPreset(prev => prev ? { ...prev, command: e.target.value } : null)}
                          className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Category</label>
                      <input
                        value={editPreset.category || ''}
                        onChange={(e) => setEditPreset(prev => prev ? { ...prev, category: e.target.value } : null)}
                        disabled={editPreset.isBuiltIn}
                        className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 disabled:opacity-50"
                      />
                    </div>
                    {editPreset.isBuiltIn && (
                      <div>
                        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Description</label>
                        <div className="mt-1 p-2 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs text-zinc-400">
                          Reads <code className="text-cyan-400">agent/RULES_COMPACT.md</code> and <code className="text-cyan-400">agent/state.md</code>, then injects them into the active terminal as a context reminder.
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      onClick={() => { setShowEditPreset(false); setEditPreset(null); }}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Close
                    </button>
                    {!editPreset.isBuiltIn && (
                      <button
                        onClick={handleSavePresetEdit}
                        className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

             {activeTab === 'sessions' && (
               <div>
                 {selectedSessionDetail ? (
                   /* ── Session Detail View ── */
                   <div>
                      <button
                        onClick={() => { setSelectedSessionDetail(null); setSessionMessages([]); }}
                        className="mb-3 px-2.5 py-1.5 bg-zinc-900/60 backdrop-blur-sm hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium rounded-lg border border-zinc-800/50 hover:border-zinc-700/50 transition-colors duration-150 active:scale-95 flex items-center gap-1.5"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back to sessions
                      </button>
                     {(() => {
                       const session = sessions.find(s => s.id === selectedSessionDetail);
                       if (!session) return <p className="text-xs text-zinc-500">Session not found.</p>;
                       const terminalInfo = session.terminal_id && terminalTabs[session.terminal_id]
                         ? { name: terminalTabs[session.terminal_id].name, agent: terminalTabs[session.terminal_id].agent, isRunning: true }
                         : null;
                       return (
                          <div>
                             {/* Session Header */}
                             <GlassCard className="p-4 mb-3 relative overflow-hidden">
                               <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-transparent pointer-events-none" />
                               <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 rounded-full" />
                              <div className="flex items-center justify-between mb-3 relative">
                                <div className="flex items-center gap-2.5">
                                  <StatusDot status={session.status} size="md" />
                                  <span className="text-sm font-bold text-white">{session.topic || 'Unnamed Session'}</span>
                                </div>
                                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/15 px-2 py-1 rounded-md border border-emerald-500/20">{session.agent}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] relative">
                                <div className="flex items-center gap-1.5"><span className="text-zinc-600">Status:</span> <span className="text-zinc-300">{session.status || 'Unknown'}</span></div>
                                <div className="flex items-center gap-1.5"><span className="text-zinc-600">Category:</span> <span className="text-zinc-300">{session.category || 'Uncategorized'}</span></div>
                                <div className="flex items-center gap-1.5"><span className="text-zinc-600">Date:</span> <span className="text-zinc-300">{formatDate(session.created_at)}</span></div>
                                <div className="flex items-center gap-1.5"><span className="text-zinc-600">Terminal:</span> <span className="text-zinc-300">{terminalInfo ? `${terminalInfo.name} (active)` : 'Closed'}</span></div>
                                <div className="flex items-center gap-1.5"><span className="text-zinc-600">Cost:</span> <span className="text-emerald-400 font-medium">${session.total_cost?.toFixed(2) || '0.00'}</span></div>
                                <div className="flex items-center gap-1.5"><span className="text-zinc-600">Tokens:</span> <span className="text-zinc-300 font-mono">{session.total_tokens?.toLocaleString() || 0}</span></div>
                                {session.resume_id && <div className="col-span-2 flex items-center gap-1.5"><span className="text-zinc-600">Resume ID:</span> <span className="text-zinc-300 font-mono text-[9px]">{session.resume_id}</span></div>}
                                {session.description && <div className="col-span-2 flex items-start gap-1.5"><span className="text-zinc-600 shrink-0">Desc:</span> <span className="text-zinc-300">{session.description}</span></div>}
                                {session.product_area && <div className="col-span-2 flex items-center gap-1.5"><span className="text-zinc-600">Area:</span> <span className="text-cyan-600/80">{session.product_area}</span></div>}
                              </div>
                              <div className="flex gap-2 mt-4 relative">
                                {terminalInfo ? (
                                  <button onClick={() => { setActiveTerminalId(session.terminal_id!); window.dispatchEvent(new CustomEvent('focus-terminal', { detail: { terminalId: session.terminal_id } })); }} className="px-3 py-1.5 bg-green-600/80 hover:bg-green-500 text-green-50 text-xs font-medium rounded-lg transition-colors duration-150 hover:shadow-[0_0_8px_rgba(34,197,94,0.3)] active:scale-95">Focus Terminal</button>
                                ) : (
                                  <button onClick={() => handleResumeSession(session)} className="px-3 py-1.5 bg-green-600/80 hover:bg-green-500 text-green-50 text-xs font-medium rounded-lg transition-colors duration-150 hover:shadow-[0_0_8px_rgba(34,197,94,0.3)] active:scale-95">Open in Terminal</button>
                                )}
                              </div>
                            </GlassCard>
                              {/* Session Messages */}
                             <GlassCard className="p-4">
                               <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/[0.03] to-transparent pointer-events-none" />
                               <div className="flex items-center justify-between mb-3 relative">
                                 <div className="flex items-center gap-2">
                                   <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                   <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Messages</span>
                                 </div>
                                 <button
                                   onClick={async () => {
                                     try {
                                       const result = await window.deskflowAPI?.getSessionMessages?.(session.id, session.agent);
                                       if (result?.success) setSessionMessages(result.data || []);
                                     } catch {}
                                   }}
                                   className="px-2 py-0.5 bg-zinc-700/50 hover:bg-zinc-600 text-zinc-300 text-[10px] font-medium rounded-md border border-zinc-700/50 transition-colors duration-150 active:scale-95"
                                 >
                                   Refresh
                                 </button>
                               </div>
                               {sessionMessages.length === 0 ? (
                                 <p className="text-[10px] text-zinc-600 text-center py-6 relative">No messages loaded yet — click <span className="text-cyan-500">Refresh</span> to load.</p>
                               ) : (
                                 <div className="space-y-1.5 max-h-48 overflow-y-auto relative pr-1">
                                    {sessionMessages.map((msg: any, i: number) => {
                                      const isQuoted = quotedReferences.some(r => r.id === msg.id);
                                      return (
                                      <div key={i} className={`group flex items-start gap-2 px-2.5 py-2 rounded-lg text-[10px] transition-colors duration-150 ${
                                        msg.role === 'assistant'
                                          ? 'bg-cyan-900/15 border border-cyan-800/20'
                                          : msg.role === 'user'
                                            ? 'bg-blue-900/15 border border-blue-800/20'
                                            : 'bg-zinc-900/40 border border-zinc-800/30'
                                      }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                                          msg.role === 'assistant' ? 'bg-cyan-400' : msg.role === 'user' ? 'bg-blue-400' : 'bg-amber-400'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[9px] font-semibold uppercase ${
                                              msg.role === 'assistant' ? 'text-cyan-400' : msg.role === 'user' ? 'text-blue-400' : 'text-amber-400'
                                            }`}>{msg.role}</span>
                                            {msg.created_at && <span className="text-[9px] text-zinc-600">{new Date(msg.created_at).toLocaleTimeString()}</span>}
                                            <button
                                              onClick={() => {
                                                if (isQuoted) {
                                                  setQuotedReferences(prev => prev.filter(r => r.id !== msg.id));
                                                } else {
                                                  setQuotedReferences(prev => [...prev, { role: msg.role, content: msg.content, createdAt: msg.created_at, id: msg.id }]);
                                                }
                                              }}
                                              className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors duration-150 opacity-0 group-hover:opacity-100 ${
                                                isQuoted
                                                  ? 'bg-cyan-600/30 text-cyan-300'
                                                  : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-200'
                                              }`}
                                              title={isQuoted ? 'Remove reference' : 'Quote this message'}
                                            >
                                              {isQuoted ? '✓' : 'Quote'}
                                            </button>
                                          </div>
                                          <span className="text-zinc-300 leading-relaxed">{msg.content?.slice(0, 200)}{msg.content?.length > 200 ? '...' : ''}</span>
                                        </div>
                                      </div>
                                      );
                                    })}
                                 </div>
                                )}
                              </GlassCard>
                            </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* ── Session List ── */
                    <div>
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            setNewSessionTerminalMode('create');
                            setNewSessionSelectedTerminal('');
                            setNewSessionAgent('claude');
                            setNewSessionName('');
                            setShowNewSessionDialog(true);
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors duration-150 hover:shadow-[0_0_12px_rgba(34,197,94,0.25)] active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Session
                        </button>
                        <button
                          onClick={() => setShowImportSessionsDialog(true)}
                          className="px-2.5 py-1.5 bg-zinc-900/60 backdrop-blur-sm hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium rounded-lg border border-zinc-800/50 hover:border-zinc-700/50 transition-colors duration-150 active:scale-95 flex items-center gap-1.5"
                          title="Import sessions from opencode CLI"
                        >
                          <TerminalIcon className="w-3 h-3" />
                          Import
                        </button>
                        <div className="ml-auto flex gap-1">
                          <button
                            onClick={handleSaveWorkspace}
                            className="px-2.5 py-1.5 bg-zinc-900/60 backdrop-blur-sm hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium rounded-lg border border-zinc-800/50 hover:border-zinc-700/50 transition-colors duration-150 active:scale-95 flex items-center gap-1.5"
                            title="Save workspace layout (sidebar, tab, terminals)"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleLoadWorkspace}
                            className="px-2.5 py-1.5 bg-zinc-900/60 backdrop-blur-sm hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium rounded-lg border border-zinc-800/50 hover:border-zinc-700/50 transition-colors duration-150 active:scale-95 flex items-center gap-1.5"
                            title="Load workspace layout"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                     {/* Category filter pills */}
                      {sessions.length > 0 && (
                        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
                          {[{ key: 'all', label: 'All', color: 'zinc' }, ...Object.entries(SESSION_CATEGORIES).map(([k, v]) => ({ key: k, label: v.label, color: v.color || 'zinc' }))].map(f => {
                            const cat = SESSION_CATEGORIES[f.key];
                            const isActive = sessionCategoryFilter === f.key;
                            const dotColor: Record<string, string> = {
                              zinc: 'bg-zinc-400', green: 'bg-green-400', blue: 'bg-blue-400',
                              purple: 'bg-purple-400', amber: 'bg-amber-400', cyan: 'bg-cyan-400',
                              red: 'bg-red-400', emerald: 'bg-emerald-400', pink: 'bg-pink-400',
                              teal: 'bg-teal-400',
                            };
                            return (
                              <button
                                key={f.key}
                                onClick={() => setSessionCategoryFilter(f.key)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors duration-150 active:scale-95 ${
                                  isActive
                                    ? cat ? `${cat.bg} ${cat.text} border ${cat.border} shadow-sm` : 'bg-zinc-700/80 text-white border border-zinc-600/50'
                                    : 'bg-zinc-900/40 backdrop-blur-sm text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800/60 hover:text-zinc-300 hover:border-zinc-700/50'
                                }`}
                              >
                                {!isActive && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor[f.color] || 'bg-zinc-500'} shrink-0`} />
                                )}
                                {f.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                     {sessions.length === 0 ? (
                        <EmptyState title="No sessions yet" description="Create one using the button above." />
                      ) : (
                       <div className="space-y-2">
                         {sessions
                           .filter(s => sessionCategoryFilter === 'all' || s.category === sessionCategoryFilter)
                           .map((session) => {
                           const terminalInfo = session.terminal_id && terminalTabs[session.terminal_id]
                             ? { name: terminalTabs[session.terminal_id].name, agent: terminalTabs[session.terminal_id].agent, isRunning: true }
                             : null;
                           const tags = (() => { try { return JSON.parse(session.auto_tags || '[]'); } catch { return []; } })();
                            return (
                                 <GlassCard key={session.id}
                                   className="group p-3 hover:bg-zinc-700/50 transition-colors"
                                   onContextMenu={(e) => {
                                     e.preventDefault();
                                     setContextMenu({ x: e.clientX, y: e.clientY, session });
                                   }}
                                   draggable
                                   onDragStart={(e) => {
                                     setDraggedSessionId(session.id);
                                     e.dataTransfer.setData('text/plain', JSON.stringify({ id: session.id, agent: session.agent, topic: session.topic, resume_id: session.resume_id }));
                                     e.dataTransfer.effectAllowed = 'move';
                                   }}
                                   onDragEnd={() => setDraggedSessionId(null)}
                                >
                                <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-colors duration-150 ${
                                  terminalInfo ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : 'bg-zinc-600'
                                } group-hover:opacity-80`} />
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                      <StatusDot status={session.status} />
                                      <CategoryBadge category={session.category} />
                                      <span className="text-[10px] font-medium text-green-400 bg-green-500/15 px-1.5 py-0.5 rounded-md">{session.agent}</span>
                                      <span className="text-xs font-medium text-zinc-200 truncate">{session.topic || 'Unnamed Session'}</span>
                                      {!!session.auto_named && (
                                        <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1 py-0.5 rounded-md">auto</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] text-zinc-500">{formatDate(session.created_at)}</span>
                                      {terminalInfo ? (
                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                          {terminalInfo.name}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-zinc-500 bg-zinc-700/30 px-1.5 py-0.5 rounded-md">Closed</span>
                                      )}
                                      {session.product_area && (
                                        <span className="text-[10px] text-cyan-600/80">{session.product_area}</span>
                                      )}
                                    </div>
                                    {session.description && (
                                      <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 leading-relaxed">{session.description}</div>
                                    )}
                                    {tags.length > 0 && (
                                      <div className="flex gap-1 mt-1.5 flex-wrap">
                                        {tags.slice(0, 5).map((t: string, i: number) => (
                                          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-zinc-800/60 text-zinc-500 border border-zinc-700/30 rounded-md">{t}</span>
                                        ))}
                                      </div>
                                    )}
                                    {session.total_cost !== undefined && (
                                      <div className="text-[10px] text-zinc-600 mt-1">${session.total_cost.toFixed(2)} total</div>
                                    )}
                                    {session.resume_id && (
                                      <div className="text-[10px] text-cyan-600/60 font-mono mt-0.5">Resume: {session.resume_id.slice(0, 12)}…</div>
                                    )}
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-colors duration-150 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => setSessionToEdit(session)}
                                      title="View and edit session details"
                                      className="px-1.5 py-1 bg-zinc-700/50 hover:bg-zinc-600 text-zinc-300 text-[10px] font-medium rounded-md transition-colors duration-150 active:scale-95"
                                    >
                                      Details
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (terminalInfo) {
                                          setActiveTerminalId(session.terminal_id!);
                                          window.dispatchEvent(new CustomEvent('focus-terminal', { detail: { terminalId: session.terminal_id } }));
                                        } else {
                                          handleResumeSession(session);
                                        }
                                      }}
                                      title={terminalInfo ? 'Focus terminal' : 'Open in terminal'}
                                      className="px-1.5 py-1 bg-green-600/60 hover:bg-green-500/80 text-green-200 text-[10px] font-medium rounded-md transition-colors duration-150 active:scale-95"
                                    >
                                      {terminalInfo ? 'Focus' : 'Open'}
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const result = await window.deskflowAPI?.getSessionMessages?.(session.id, session.agent);
                                          if (result?.success) {
                                            setSessionMessages(result.data || []);
                                            setShowMessagesViewer(session.id);
                                          }
                                        } catch {}
                                      }}
                                      title="View session messages"
                                      className="px-1.5 py-1 bg-zinc-700/50 hover:bg-zinc-600 text-zinc-300 text-[10px] font-medium rounded-md transition-colors duration-150 active:scale-95"
                                    >
                                      Messages
                                    </button>
                                    <button
                                      onClick={() => setConfirmDialog({
                                        isOpen: true,
                                        message: `Delete session "${session.topic}" permanently?`,
                                        onConfirm: () => handleDeleteSession(session.id),
                                      })}
                                      title="Delete session"
                                      className="px-1.5 py-1 bg-rose-600/50 hover:bg-rose-500/80 text-rose-200 text-[10px] font-medium rounded-md transition-colors duration-150 active:scale-95"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </GlassCard>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            {activeTab === 'map' && (
              <div className="flex flex-col h-full">
                <p className="text-xs text-zinc-500 mb-2 flex-shrink-0">Drag panes to rearrange or split • Click to focus</p>
                <div className="min-h-0 overflow-hidden" style={{ flex: mapListRatio }}>
                  {terminalLayout ? (
                    <TerminalMiniMap
                      layouts={getGroupTrees(terminalLayout)}
                      activeTerminalId={activeTerminalId}
                      activeGroupIndex={activeGroupIndex}
                      onGroupSelect={setActiveGroupIndex}
                      onTerminalSelect={handleMiniMapTerminalSelect}
                      onTerminalMove={handleMiniMapTerminalMove}
                      onSplit={handleMiniMapSplit}
                      onToggleDirection={handleMiniMapToggleDirection}
                    />
                  ) : (
                    <p className="text-xs text-zinc-600 mb-4">No terminals open</p>
                  )}
                </div>

                <div
                  className="flex-shrink-0 h-1 bg-zinc-800 hover:bg-cyan-600 transition-colors cursor-row-resize relative"
                  onMouseDown={(e) => {
                    mapResizeRef.current = { startY: e.clientY, startRatio: mapListRatio };
                    const handleMouseMove = (me: MouseEvent) => {
                      if (!mapResizeRef.current) return;
                      const parent = (me.target as HTMLElement).parentElement;
                      if (!parent) return;
                      const totalHeight = parent.clientHeight;
                      if (totalHeight === 0) return;
                      const delta = me.clientY - mapResizeRef.current.startY;
                      const newRatio = Math.max(0.2, Math.min(0.8, mapResizeRef.current.startRatio + delta / totalHeight));
                      setMapListRatio(newRatio);
                    };
                    const handleMouseUp = () => {
                      mapResizeRef.current = null;
                      window.removeEventListener('mousemove', handleMouseMove);
                      window.removeEventListener('mouseup', handleMouseUp);
                    };
                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-0.5 bg-zinc-600 rounded-full" />
                </div>

                <div className="min-h-0 overflow-hidden border-t border-zinc-800 pt-2" style={{ flex: 1 - mapListRatio }}>
                  <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Running Terminals ({Object.keys(terminalTabs).length})
                  </div>
                  {Object.keys(terminalTabs).length === 0 ? (
                    <p className="text-xs text-zinc-600 px-2 mb-3">No running terminals</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {(() => {
                        const groups = extractGroups(terminalLayout);
                        return groups.length > 0 ? groups.map((group, gi) => (
                          <div key={gi} className="bg-zinc-800/20 border border-zinc-700/30 rounded-lg overflow-hidden">
                            <div className="px-2 py-1 bg-zinc-800/40 border-b border-zinc-700/20 flex items-center justify-between">
                              <span className="text-[10px] font-medium text-zinc-500">Group {gi + 1}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-zinc-600">{group.direction === 'vertical' ? '↕ Stack' : group.direction === 'horizontal' ? '↔ Side-by-side' : '—'}</span>
                                <span className="text-[9px] text-zinc-600">{group.terminals.length} terminal{group.terminals.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <div className="p-1.5 space-y-1">
                              {group.terminals.map(tid => {
                                const tab = terminalTabs[tid];
                                if (!tab) return null;
                                const sessionInTerminal = sessions.find(s => s.terminal_id === tid);
                                return (
                                  <div key={tid} className={`p-2 rounded border transition-colors duration-150 ${
                                    activeTerminalId === tid
                                      ? 'bg-zinc-700/80 border-zinc-600/50 shadow-[0_0_10px_rgba(0,0,0,0.2)]'
                                      : 'bg-zinc-800/50 border-zinc-700/30 hover:bg-zinc-700/50'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-zinc-200 truncate">{tab.name}</div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-zinc-500">{tab.agent}</span>
                                          {terminalFileLocks[tid]?.length > 0 && (
                                            <span className="flex items-center gap-0.5 text-[9px] text-amber-400">
                                              <Lock className="w-2.5 h-2.5" />
                                              {terminalFileLocks[tid].length}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {activeTerminalId === tid && (
                                        <span className="text-[10px] text-green-400">active</span>
                                      )}
                                    </div>
                                    {sessionInTerminal ? (
                                      <div className="mt-1.5 ml-4 pl-2 border-l-2 border-cyan-500/30">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="text-[10px] text-cyan-400">Session:</span>
                                          <CategoryBadge category={sessionInTerminal.category} />
                                          <StatusDot status={sessionInTerminal.status} />
                                          <span className="text-[10px] text-zinc-300 truncate">{sessionInTerminal.topic || 'Unnamed'}</span>
                                        </div>
                                        <div className="text-[9px] text-zinc-600 mt-0.5">{sessionInTerminal.agent} • {formatDate(sessionInTerminal.created_at)}</div>
                                      </div>
                                    ) : (
                                      <div className="mt-1.5 ml-4 pl-2 border-l-2 border-zinc-700/30">
                                        <div className="text-[9px] text-zinc-500">No session — ready to assign</div>
                                      </div>
                                    )}
                                    <div className="flex gap-1 mt-1.5">
                                      <button
                                        onClick={() => { setActiveTerminalId(tid); window.dispatchEvent(new CustomEvent('focus-terminal', { detail: { terminalId: tid } })); }}
                                        className="flex-1 px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[9px] rounded"
                                      >
                                        Focus
                                      </button>
                                      {!sessionInTerminal && (
                                        <button
                                          onClick={() => {
                                            const event = new CustomEvent('open-new-session-for-terminal', { detail: { terminalId: tid } });
                                            window.dispatchEvent(event);
                                          }}
                                          className="flex-1 px-1.5 py-0.5 bg-cyan-700 hover:bg-cyan-600 text-cyan-200 text-[9px] rounded"
                                        >
                                          New Session
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )) : (
                          <p className="text-[10px] text-zinc-500">No layout groups defined.</p>
                        );
                      })()}
                    </div>
                  )}

                </div>
              </div>
            )}

             {activeTab === 'analytics' && (
                <div className="space-y-4">
                  <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-0.5 border border-zinc-700/50 w-fit">
                    {(['7d', '30d', 'all'] as const).map(p => (
                      <button key={p} onClick={() => setAnalyticsPeriod(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-150 ${
                          analyticsPeriod === p ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-500 hover:text-zinc-300'
                        }`}>
                        {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
                      </button>
                    ))}
                  </div>
                  <AnalyticsDashboard
                    aiUsage={aiSummary}
                    sessions={sessions}
                    problems={analyticsProblems}
                    requests={analyticsRequests}
                    promptHistory={analyticsPromptHistory}
                    dailyStats={analyticsDailyStats}
                    loading={analyticsLoading}
                    period={analyticsPeriod}
                    variant="full"
                  />
                </div>
              )}

            {activeTab === 'issues' && (
              <IssuesWorkspace projectId={selectedProject} projectPath={propProjectPath} activeTerminalId={activeTerminalId} sessions={sessions} />
            )}

              {activeTab === 'files' && (
                <FilesTab projectId={selectedProject} projectPath={propProjectPath} projects={projects} onSelectProject={setSelectedProject} />
               )}

               {activeTab === 'context-maintenance' && (
                <ContextMaintenanceTab
                  projectId={selectedProject || ''}
                  projectPath={propProjectPath || ''}
                  sessionId={selectedSessionDetail || undefined}
                />
               )}

             {activeTab === 'skills' && (
               <SkillsTab
                 projectPath={propProjectPath || projects.find(p => p.id === selectedProject)?.path || ''}
                 terminalTabs={terminalTabs}
                 activeTerminalId={activeTerminalId}
               />
             )}

             {activeTab === 'design' && (
                <DesignWorkspacePage
                  projectPath={propProjectPath || projects.find(p => p.id === selectedProject)?.path || ''}
                  activeTerminalId={activeTerminalId}
                />
              )}

             {activeTab === 'context' && (
               <ContextSidebar
                 projectId={selectedProject || propProjectId || undefined}
                 projectPath={propProjectPath}
               />
             )}

             {activeTab === 'configs' && (
              <div className="space-y-2">
                <div className="px-2 py-3 bg-orange-500/5 border border-orange-500/20 rounded">
                  <div className="text-xs text-orange-400 font-medium mb-3">Model Configuration</div>

                  {/* Re-injection threshold */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-zinc-300">Rules Re-injection</span>
                      <span className="font-mono text-emerald-400 text-[11px]">{modelReinjectThreshold}</span>
                    </div>
                    <p className="text-[9px] text-zinc-600 mb-2">Auto-inject RULES_COMPACT.md every N messages</p>
                    <input
                      type="range"
                      min={3}
                      max={30}
                      value={modelReinjectThreshold}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setModelReinjectThreshold(v);
                        localStorage.setItem('model-reinject-threshold', String(v));
                        window.deskflowAPI?.setReinjectThreshold?.({ threshold: v });
                      }}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
                      <span>3</span>
                      <span>30</span>
                    </div>
                  </div>

                  {/* Default model tier */}
                  <div className="mb-3">
                    <span className="text-[10px] font-semibold text-zinc-300 block mb-1">Default Model Tier</span>
                    <p className="text-[9px] text-zinc-600 mb-2">Context budget for new sessions</p>
                    <div className="flex gap-1">
                      {(['top', 'mid', 'low'] as const).map((tier) => (
                        <button
                          key={tier}
                          onClick={() => {
                            setModelDefaultTier(tier);
                            localStorage.setItem('default-model-tier', tier);
                          }}
                          className={`flex-1 py-1.5 rounded text-[10px] font-semibold border transition-colors duration-150 ${
                            modelDefaultTier === tier
                              ? tier === 'top'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : tier === 'mid'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                              : 'bg-zinc-700/50 text-zinc-500 border-zinc-600/40'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Debug mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-300">Debug Mode</span>
                      <p className="text-[9px] text-zinc-600">Verbose [SYSTEM] logging</p>
                    </div>
                    <button
                      onClick={() => {
                        const v = !modelDebugMode;
                        setModelDebugMode(v);
                        localStorage.setItem('model-debug-mode', String(v));
                        window.deskflowAPI?.setModelDebug?.({ enabled: v });
                      }}
                      className={`w-10 h-5 rounded-full transition-colors duration-150 relative ${modelDebugMode ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-colors duration-150 ${modelDebugMode ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* ── Auto-Assign Configuration ── */}
                  <div className="pt-3 border-t border-orange-500/10 space-y-3">
                    <h4 className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Auto-Assign Routing
                    </h4>

                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-zinc-300">Auto-assign prompts to sessions</span>
                        <p className="text-[10px] text-zinc-600">AI routes your prompts to the best-matching session</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newConfig = { ...autoAssignConfig, enabled: !autoAssignConfig?.enabled };
                          await window.deskflowAPI?.saveAutoAssignConfig?.(newConfig);
                          setAutoAssignConfig(newConfig);
                        }}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          autoAssignConfig?.enabled ? 'bg-cyan-500/30 border border-cyan-500/40' : 'bg-zinc-700 border border-zinc-600'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
                          autoAssignConfig?.enabled ? 'translate-x-4 bg-cyan-400' : 'translate-x-0.5 bg-zinc-400'
                        }`} />
                      </button>
                    </div>

                    {/* Routing Model */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Routing model</span>
                      <select
                        value={autoAssignConfig?.routingModel || 'anthropic/claude-3.5-haiku'}
                        onChange={async (e) => {
                          const newConfig = { ...autoAssignConfig, routingModel: e.target.value };
                          await window.deskflowAPI?.saveAutoAssignConfig?.(newConfig);
                          setAutoAssignConfig(newConfig);
                        }}
                        className="text-[10px] bg-zinc-800 border border-zinc-700/50 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-orange-500/40"
                      >
                        <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku ($0.80/M)</option>
                        <option value="anthropic/claude-3-haiku">Claude 3 Haiku ($0.25/M)</option>
                        <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash ($0.10/M)</option>
                        <option value="openai/gpt-4o-mini">GPT-4o Mini ($0.15/M)</option>
                      </select>
                    </div>

                    {/* Summary Frequency */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Summary frequency</span>
                      <select
                        value={autoAssignConfig?.summaryFrequency || 10}
                        onChange={async (e) => {
                          const newConfig = { ...autoAssignConfig, summaryFrequency: parseInt(e.target.value) };
                          await window.deskflowAPI?.saveAutoAssignConfig?.(newConfig);
                          setAutoAssignConfig(newConfig);
                        }}
                        className="text-[10px] bg-zinc-800 border border-zinc-700/50 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-orange-500/40"
                      >
                        <option value="5">Every 5 messages</option>
                        <option value="10">Every 10 messages</option>
                        <option value="20">Every 20 messages</option>
                        <option value="0">Manual only</option>
                      </select>
                    </div>

                    {/* Auto-Rename Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-zinc-300">Auto-rename sessions</span>
                        <p className="text-[10px] text-zinc-600">AI generates descriptive session names</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newConfig = { ...autoAssignConfig, autoRename: !autoAssignConfig?.autoRename };
                          await window.deskflowAPI?.saveAutoAssignConfig?.(newConfig);
                          setAutoAssignConfig(newConfig);
                        }}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          autoAssignConfig?.autoRename ? 'bg-cyan-500/30 border border-cyan-500/40' : 'bg-zinc-700 border border-zinc-600'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
                          autoAssignConfig?.autoRename ? 'translate-x-4 bg-cyan-400' : 'translate-x-0.5 bg-zinc-400'
                        }`} />
                      </button>
                    </div>

                    {/* Rename Threshold */}
                    {autoAssignConfig?.autoRename && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Rename after N messages</span>
                        <select
                          value={autoAssignConfig?.renameThreshold || 5}
                          onChange={async (e) => {
                            const newConfig = { ...autoAssignConfig, renameThreshold: parseInt(e.target.value) };
                            await window.deskflowAPI?.saveAutoAssignConfig?.(newConfig);
                            setAutoAssignConfig(newConfig);
                          }}
                          className="text-[10px] bg-zinc-800 border border-zinc-700/50 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-orange-500/40"
                        >
                          <option value="3">3 messages</option>
                          <option value="5">5 messages</option>
                          <option value="10">10 messages</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* ── Infrastructure Cost Card ── */}
                  <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/70">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        Routing Infrastructure Cost
                      </h4>
                      <button
                        onClick={async () => {
                          if (confirm('Reset all routing cost counters?')) {
                            await window.deskflowAPI?.resetRoutingCosts?.();
                            loadRoutingCosts();
                          }
                        }}
                        className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                    {routingCosts ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-800/50 rounded p-2">
                          <span className="text-[10px] text-zinc-500">Today</span>
                          <p className="text-sm font-mono text-emerald-400">${(routingCosts.today?.total || 0).toFixed(4)}</p>
                          <span className="text-[9px] text-zinc-600">{routingCosts.today?.calls || 0} calls</span>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                          <span className="text-[10px] text-zinc-500">This Week</span>
                          <p className="text-sm font-mono text-emerald-400">${(routingCosts.week?.total || 0).toFixed(4)}</p>
                          <span className="text-[9px] text-zinc-600">{routingCosts.week?.calls || 0} calls</span>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                          <span className="text-[10px] text-zinc-500">This Month</span>
                          <p className="text-sm font-mono text-emerald-400">${(routingCosts.month?.total || 0).toFixed(4)}</p>
                          <span className="text-[9px] text-zinc-600">{routingCosts.month?.calls || 0} calls</span>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                          <span className="text-[10px] text-zinc-500">All Time</span>
                          <p className="text-sm font-mono text-zinc-300">${(routingCosts.total?.total || 0).toFixed(4)}</p>
                          <span className="text-[9px] text-zinc-600">{routingCosts.total?.calls || 0} calls</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-[10px] text-zinc-600">Loading costs...</p>
                      </div>
                    )}
                    {routingCosts?.byType && routingCosts.byType.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-800/50 space-y-1">
                        {routingCosts.byType.map((bt: any) => (
                          <div key={bt.call_type} className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 capitalize">{bt.call_type}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-zinc-400">${(bt.total || 0).toFixed(4)}</span>
                        <span className="text-[9px] text-zinc-600">×{bt.calls}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>

                  {/* ── Cross-Session Sync ── */}
                  <div className="px-2 py-3 bg-amber-500/5 border border-amber-500/20 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-[11px] font-medium text-amber-300">Cross-Session Sync</h4>
                        <p className="text-[9px] text-zinc-500">File lock detection, context broadcast</p>
                      </div>
                      <button
                        onClick={() => {
                          const v = !crossSessionSyncEnabled;
                          setCrossSessionSyncEnabled(v);
                          localStorage.setItem('cross-session-sync-enabled', String(v));
                          window.deskflowAPI?.setCrossSessionSyncConfig?.({ enabled: v });
                        }}
                        className={`w-8 h-4 rounded-full transition-colors relative ${
                          crossSessionSyncEnabled ? 'bg-amber-500' : 'bg-zinc-700'
                        }`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                          crossSessionSyncEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* File Lock TTL */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-zinc-400">Lock TTL</span>
                          <span className="text-[10px] text-amber-400 font-mono">{fileLockTTL}s</span>
                        </div>
                        <p className="text-[8px] text-zinc-600 mb-1">How long a file lock lasts before auto-release</p>
                        <input
                          type="range"
                          min={30}
                          max={600}
                          step={30}
                          value={fileLockTTL}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setFileLockTTL(v);
                            localStorage.setItem('file-lock-ttl', String(v));
                            window.deskflowAPI?.setCrossSessionSyncConfig?.({ lockTTL: v });
                          }}
                          className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full"
                        />
                        <div className="flex justify-between text-[8px] text-zinc-600">
                          <span>30s</span>
                          <span>10m</span>
                        </div>
                      </div>

                      {/* Context Broadcast Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400">Context Broadcast</span>
                          <p className="text-[8px] text-zinc-600">Notify other terminals of problem/request changes</p>
                        </div>
                        <button
                          onClick={() => {
                            const v = !contextBroadcastEnabled;
                            setContextBroadcastEnabled(v);
                            localStorage.setItem('context-broadcast-enabled', String(v));
                            window.deskflowAPI?.setCrossSessionSyncConfig?.({ contextBroadcast: v });
                          }}
                          className={`w-8 h-4 rounded-full transition-colors relative ${
                            contextBroadcastEnabled ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                            contextBroadcastEnabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Conflict Warning Mode */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400">Conflict Warnings</span>
                          <p className="text-[8px] text-zinc-600">Show toast + terminal warning, or toast only</p>
                        </div>
                        <select
                          value={conflictWarningMode}
                          onChange={(e) => {
                            setConflictWarningMode(e.target.value);
                            localStorage.setItem('conflict-warning-mode', e.target.value);
                            window.deskflowAPI?.setCrossSessionSyncConfig?.({ conflictWarningMode: e.target.value });
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 px-2 py-1"
                        >
                          <option value="both">Toast + Terminal</option>
                          <option value="toast">Toast Only</option>
                          <option value="none">Off</option>
                        </select>
                      </div>

                      {/* /sync Command Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400">/sync Command</span>
                          <p className="text-[8px] text-zinc-600">Enable the /sync slash command</p>
                        </div>
                        <button
                          onClick={() => {
                            const v = !syncCommandEnabled;
                            setSyncCommandEnabled(v);
                            localStorage.setItem('sync-command-enabled', String(v));
                            window.deskflowAPI?.setCrossSessionSyncConfig?.({ syncCommand: v });
                          }}
                          className={`w-8 h-4 rounded-full transition-colors relative ${
                            syncCommandEnabled ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                            syncCommandEnabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* ── Thought Process Toggle ── */}
                      <div className="pt-2 border-t border-amber-500/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-400">Thought Process</span>
                            <p className="text-[8px] text-zinc-600">AI shows reasoning before answering</p>
                          </div>
                          <button
                            onClick={() => {
                              const v = !thoughtProcessEnabled;
                              setThoughtProcessEnabled(v);
                              localStorage.setItem('thought-process-enabled', String(v));
                            }}
                            className={`w-8 h-4 rounded-full transition-colors relative ${
                              thoughtProcessEnabled ? 'bg-amber-500' : 'bg-zinc-700'
                            }`}
                          >
                            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                              thoughtProcessEnabled ? 'translate-x-4' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Live Context Viewer ── */}
                  <div className="mt-3 px-2 py-3 bg-amber-500/5 border border-amber-500/20 rounded">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${crossSessionSyncEnabled ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
                      <h4 className="text-[11px] font-medium text-amber-300">Live Context</h4>
                      <span className="text-[8px] text-zinc-600 ml-auto">
                        {Object.keys(terminalFileLocks).length} terminal{Object.keys(terminalFileLocks).length !== 1 ? 's' : ''} active
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* ── Active Locks ── */}
                      <div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 mb-1">
                          <Lock className="w-3 h-3" />
                          <span>File Locks</span>
                        </div>
                        {Object.keys(terminalFileLocks).length === 0 ? (
                          <p className="text-[9px] text-zinc-600 pl-4">No active locks</p>
                        ) : (
                          <div className="space-y-1 pl-3">
                            {Object.entries(terminalFileLocks).map(([termId, files]) => (
                              <div key={termId} className="flex items-start gap-1.5">
                                <span className="text-[9px] text-amber-400/70 font-mono shrink-0 mt-0.5">{termId.replace('term-', '').slice(0, 8)}</span>
                                <div className="flex flex-wrap gap-1">
                                  {files.map((fp, i) => (
                                    <span key={i} className="text-[9px] bg-amber-500/10 text-amber-400/80 px-1 rounded truncate max-w-[160px]" title={fp}>
                                      {fp.split('\\').pop()?.split('/').pop()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ── Recent Activity ── */}
                      <div className="pt-2 border-t border-amber-500/10">
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 mb-1">
                          <FileText className="w-3 h-3" />
                          <span>Recent Edits</span>
                        </div>
                        {touchedFiles.length === 0 ? (
                          <p className="text-[9px] text-zinc-600 pl-4">No recent file activity</p>
                        ) : (
                          <div className="space-y-0.5 pl-3 max-h-[120px] overflow-y-auto">
                            {touchedFiles.map((f, i) => (
                              <div key={f.id || i} className="flex items-center gap-1 text-[9px]">
                                <span className={`shrink-0 w-1 h-1 rounded-full ${
                                  f.action === 'create' ? 'bg-green-500' :
                                  f.action === 'delete' ? 'bg-red-500' : 'bg-blue-400'
                                }`} />
                                <span className={`text-[8px] uppercase font-medium ${
                                  f.action === 'create' ? 'text-green-500' :
                                  f.action === 'delete' ? 'text-red-400' : 'text-blue-400'
                                }`}>{f.action}</span>
                                <span className="text-zinc-400 truncate max-w-[140px]" title={f.file_path}>
                                  {f.file_path.split('\\').pop()?.split('/').pop()}
                                </span>
                                <span className="text-zinc-600 ml-auto shrink-0">
                                  {f.timestamp ? (() => {
                                    const d = new Date(f.timestamp);
                                    const now = Date.now();
                                    const diff = Math.floor((now - d.getTime()) / 1000);
                                    if (diff < 60) return `${diff}s`;
                                    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
                                    return `${Math.floor(diff / 3600)}h`;
                                  })() : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ── Conflict History ── */}
                      <div className="pt-2 border-t border-amber-500/10">
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 mb-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Recent Conflicts</span>
                        </div>
                        {fileConflicts.length === 0 ? (
                          <p className="text-[9px] text-zinc-600 pl-4">No recent conflicts</p>
                        ) : (
                          <div className="space-y-0.5 pl-3 max-h-[100px] overflow-y-auto">
                            {fileConflicts.slice(-5).reverse().map((c, i) => (
                              <div key={i} className="flex items-center gap-1 text-[9px] text-yellow-400/80">
                                <span className="shrink-0 w-1 h-1 rounded-full bg-yellow-500" />
                                <span className="text-zinc-400 truncate max-w-[100px]" title={c.filePath}>
                                  {c.filePath.split('\\').pop()?.split('/').pop()}
                                </span>
                                <span className="text-zinc-500 text-[8px]">
                                  {c.lockingTerminal.substring(0, 6)} → {c.requestingTerminal.substring(0, 6)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

             {activeTab === 'history' && (
              <div className="space-y-2">
                <div className="px-2 py-3 bg-rose-500/5 border border-rose-500/20 rounded">
                  <div className="text-xs text-rose-400 font-medium mb-2">History</div>
                  <p className="text-xs text-zinc-500">No history records yet. Activity will appear here.</p>
                </div>
              </div>
            )}

            <NewSessionDialog
              open={showNewSessionDialog}
              mode={newSessionMode}
              defaultName={openCodeSessionName || undefined}
              onClose={() => { setShowNewSessionDialog(false); setNewSessionSelectedTerminal(''); }}
              onCreate={async (config: SessionConfig) => {
                const proj = projects.find(p => p.id === selectedProject);
                const cwd = proj?.path || '';
                const agent = config.agentType;
                const sessionName = config.name.trim() || `Session ${sessions.length + 1}`;
                localStorage.setItem('terminal-defaultAgent', agent);
                setShowNewSessionDialog(false);

                // Resolve init content from config (skip when resuming existing session)
                let initContent = config.initContent || '';
                if (!config.resumeId && !config.initContent) {
                  if (config.includeDefaultInit) {
                    const dflt = await window.deskflowAPI?.readProjectFile?.('INITIALIZE.md', cwd);
                    if (dflt?.success && dflt.data) initContent = dflt.data;
                  }
                  if (config.initializeFile) {
                    const cust = await window.deskflowAPI?.readInitFile?.(config.initializeFile, cwd);
                    if (cust?.success && cust.data) {
                      initContent = initContent ? `${initContent}\n\n${cust.data}` : cust.data;
                    }
                  }
                  // Append problem/request context to init content
                  if (config.problemIds?.length) {
                    const ctx = config.problemIds.map(id => `- ${allProblems.find(p => p.id === id)?.title || id}`).join('\n');
                    initContent += `\n## Context: Problems\n${ctx}\n`;
                  }
                  if (config.requestIds?.length) {
                    const ctx = config.requestIds.map(id => `- ${allRequests.find(r => r.id === id)?.title || id}`).join('\n');
                    initContent += `\n## Context: Requests\n${ctx}\n`;
                  }
                }
                const systemPrompt = config.customSystemPrompt || undefined;

                let targetTerminalId = '';
                 if (config.terminalMode === 'select' && config.selectedTerminal) {
                   // Re-launch agent on existing terminal
                   targetTerminalId = config.selectedTerminal;
                   setActiveTerminalId(targetTerminalId);
                   
                   // Launch the agent on the existing terminal
                   const NL = '\r\n';
                   const launchCommand = `${agent}${NL}`;
                   await window.deskflowAPI?.terminalWrite?.(targetTerminalId, launchCommand);
                   await new Promise(r => setTimeout(r, 500));
                   
                   if (systemPrompt) {
                     await window.deskflowAPI?.terminalWrite?.(targetTerminalId, systemPrompt + '\r\n');
                     await new Promise(r => setTimeout(r, 500));
                   }
                   
                   // Write init content (from INITIALIZE.md, problems, requests)
                   // NOTE: Do NOT write user prompts here - use InstructionPanel instead
                   if (initContent) {
                     await new Promise(r => setTimeout(r, 800));
                     await window.deskflowAPI?.terminalWrite?.(targetTerminalId, initContent + '\r\n');
                   }
                 } else {
                  targetTerminalId = generateTerminalId();
                  const count = Object.keys(terminalTabs).length;
                  setTerminalTabs(prev => ({ ...prev, [targetTerminalId]: { name: proj?.name || sessionName, agent, modelTier: config.modelTier || config.contextConfig?.model_tier || 'mid' } }));
                  setActiveTerminalId(targetTerminalId);
                  const updatedLayout = insertIntoLayout(terminalLayout, targetTerminalId);
                  setTerminalLayout(updatedLayout);
                  saveLayout(updatedLayout);
                  sessionTerminalsRef.current.add(targetTerminalId);
                  
                  // ═══ SPAWN PTY AND WAIT FOR COMPLETION ═══
                  // Spawn BEFORE initializing, don't just dispatch event
                  if (!window.deskflowAPI?.spawnTerminal) {
                    console.error('[NewSessionDialog] Terminal API not available');
                    return;
                  }
                  const spawnRes = await window.deskflowAPI.spawnTerminal(targetTerminalId, cwd, agent);
                  if (!spawnRes?.success) {
                    console.error('[NewSessionDialog] Failed to spawn terminal:', spawnRes?.error);
                    return;
                  }
                  window.dispatchEvent(new CustomEvent('terminal:mark-spawned', { detail: { terminalId: targetTerminalId } }));
                  
                  // ═══ REGISTER AND INITIALIZE ═══
                  await registerTerminal(targetTerminalId);
                  await initializeTerminal(targetTerminalId, agent, undefined, undefined, systemPrompt);
                  
                  // ═══ WRITE INITIALIZATION CONTENT ═══
                  if (initContent) {
                    await new Promise(r => setTimeout(r, 800));
                    const writeRes = await window.deskflowAPI?.terminalWrite?.(targetTerminalId, initContent + '\r\n');
                    if (!writeRes?.success) {
                      console.error('[NewSessionDialog] Failed to write init content:', writeRes?.error);
                    }
                  }
                }

                const sessionResult = await window.deskflowAPI?.saveTerminalSession?.({
                  id: config.id,
                  projectId: selectedProject,
                  agent,
                  terminalId: targetTerminalId,
                  topic: sessionName,
                  workingDirectory: proj?.path || '',
                  description: initContent || '',
                  autoNamed: 1,
                });
                if (sessionResult?.success) {
                  await window.deskflowAPI?.saveSessionConfig?.(config.id, config, proj?.path);
                  loadSessions();
                  showError(`Session "${sessionName}" started in terminal`, 'info');
                  setNewSessionSelectedTerminal('');
                }
              }}
              problems={allProblems}
              requests={allRequests}
              projectPath={propProjectPath || ''}
              terminalTabs={terminalTabs}
              defaultAgent={localStorage.getItem('terminal-defaultAgent') || 'claude'}
            />

            {showImportSessionsDialog && (
              <ImportSessionsDialog
                onClose={() => setShowImportSessionsDialog(false)}
                onImport={handleImportOpencodeSessions}
                projectId={propProjectId}
              />
            )}

            {/* Features Dialog */}
            {showFeaturesDialog && (
              <FeaturesDialog onClose={() => setShowFeaturesDialog(false)} />
            )}

            {/* Generalist Dialog */}
            {showGeneralistDialog && (
              <GeneralistDialog onClose={() => setShowGeneralistDialog(false)} />
            )}

            {/* Routing toast */}
            {showRoutingToast && (
              <RoutingToast
                sessionName={routingToastSession}
                onCancel={handleRoutingCancel}
                onConfirm={handleRoutingConfirm}
              />
            )}
            {/* File conflict toasts */}
            {fileConflicts.map((conflict, idx) => (
              <div key={idx} className="fixed bottom-20 right-4 z-50 max-w-sm bg-yellow-900/90 border border-yellow-600 rounded-lg p-3 shadow-lg animate-in slide-in-from-bottom-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-yellow-200">File Conflict</p>
                    <p className="text-[11px] text-yellow-300/80 mt-0.5 truncate">{conflict.filePath}</p>
                    <p className="text-[10px] text-yellow-400/60 mt-0.5">
                      {conflict.lockingTerminal} is editing → {conflict.requestingTerminal} wants access
                    </p>
                  </div>
                  <button
                    onClick={() => setFileConflicts(prev => prev.filter((_, i) => i !== idx))}
                    className="text-yellow-400/60 hover:text-yellow-300 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {/* Disambiguation dialog */}
            {showDisambiguation && (
              <RoutingDisambiguationDialog
                candidates={disambiguationCandidates}
                onSelectSession={handleDisambiguationSelect}
                onCreateNew={handleDisambiguationCreateNew}
                onCancel={() => { setShowDisambiguation(false); setPendingPrompt(null); }}
              />
            )}
            {/* Routing spinner */}
            {isRouting && (
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-[10px]">Routing...</span>
              </div>
            )}
            {/* Initialize Progress Modal */}
            <InitializeProgressModal
              isOpen={showInitModal}
              onClose={() => {
                setShowInitModal(false);
                if (initStatus !== 'init-ok') setInitStatus('init-ok');
              }}
              onComplete={() => setInitStatus('init-ok')}
              projectId={selectedProject || propProjectId || undefined}
              isReinit={initStatus === 'init-ok'}
            />

            {showMessagesViewer && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[var(--z-overlay)]">
                <div className="bg-zinc-900/95 backdrop-blur-xl rounded-xl w-full max-w-2xl border border-zinc-700/50  shadow-black/40 flex flex-col" style={{ maxHeight: '80vh' }}>
                  <div className="relative flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.03] to-transparent pointer-events-none rounded-t-xl" />
                    <div className="flex items-center gap-2.5 relative">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.5)]" />
                      <h2 className="text-base font-bold text-white">Session Messages</h2>
                    </div>
                    <button onClick={() => setShowMessagesViewer(null)} className="relative p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors duration-150 active:scale-90">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/40">
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input
                        type="text"
                        value={messagesSearchQuery}
                        onChange={(e) => setMessagesSearchQuery(e.target.value)}
                        placeholder="Search messages..."
                        className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800/50 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-colors duration-150"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {sessionMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <svg className="w-8 h-8 text-zinc-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        <p className="text-xs text-zinc-500">No messages recorded for this session.</p>
                      </div>
                    ) : (() => {
                      const filtered = messagesSearchQuery
                        ? sessionMessages.filter(m => m.content && m.content.toLowerCase().includes(messagesSearchQuery.toLowerCase()))
                        : sessionMessages;
                      if (filtered.length === 0) {
                        return <p className="text-xs text-zinc-500 text-center py-4">No messages match your search.</p>;
                      }
                      return filtered.slice(0, 500).map((msg, i) => {
                        const roleColor = msg.role === 'user' ? 'cyan' : msg.role === 'system' ? 'amber' : 'emerald';
                        const colorMap = { cyan: { bg: 'bg-cyan-900/15', border: 'border-cyan-800/20', dot: 'bg-cyan-400', text: 'text-cyan-300', tag: 'bg-cyan-500/20' }, amber: { bg: 'bg-amber-900/15', border: 'border-amber-800/20', dot: 'bg-amber-400', text: 'text-amber-300', tag: 'bg-amber-500/20' }, emerald: { bg: 'bg-emerald-900/15', border: 'border-emerald-800/20', dot: 'bg-emerald-400', text: 'text-emerald-300', tag: 'bg-emerald-500/20' } };
                        const c = colorMap[roleColor];
                        return (
                          <div key={i} className={`group flex items-start gap-3 p-3 rounded-xl ${c.bg} border ${c.border} transition-colors duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${msg.role === 'user' ? 'ml-8' : msg.role === 'system' ? '' : 'mr-8'}`}>
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${c.text}`}>{msg.role}</span>
                                {msg.created_at && <span className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleTimeString()}</span>}
                              </div>
                              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono break-words max-h-40 overflow-y-auto leading-relaxed">{msg.content.replace(/[\x1b\x9b][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\x07)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')}</pre>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {!messagesSearchQuery && sessionMessages.length > 500 && (
                      <p className="text-xs text-zinc-500 text-center py-2 border-t border-zinc-800/30 mt-2">... and {sessionMessages.length - 500} more messages</p>
                    )}
                    {messagesSearchQuery && (
                      <p className="text-xs text-zinc-600 text-center py-1">{sessionMessages.filter(m => m.content && m.content.toLowerCase().includes(messagesSearchQuery.toLowerCase())).length} of {sessionMessages.length} messages</p>
                    )}
                  </div>
                  <div className="px-6 py-3 border-t border-zinc-800/50 flex justify-between items-center bg-zinc-900/40 rounded-b-2xl">
                    <span className="text-xs text-zinc-600">{sessionMessages.length} message{sessionMessages.length !== 1 ? 's' : ''} total</span>
                    <button onClick={() => setShowMessagesViewer(null)} className="px-4 py-1.5 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700/50 transition-colors duration-150 active:scale-95">Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session Edit Dialog */}
      <SessionEditDialog
        session={sessionToEdit}
        onClose={() => setSessionToEdit(null)}
        onSave={handleSaveSession}
      />

      {/* Save Checkpoint Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]" onClick={() => setShowSaveDialog(false)}>
          <GlassCard className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Save Checkpoint</h2>
              <button onClick={() => setShowSaveDialog(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={saveDialogName}
                  onChange={(e) => setSaveDialogName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCheckpointSubmit()}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
                  placeholder="e.g. Fix login bug"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCheckpointSubmit}
                disabled={!saveDialogName.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white rounded text-sm font-medium"
              >
                Save
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Close Workspace Dialog */}
      {showCloseWorkspaceDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setShowCloseWorkspaceDialog(false)}>
          <GlassCard className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-2">Close Workspace</h2>
            <p className="text-sm text-zinc-400 mb-6">Save a checkpoint before closing, or discard changes?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowCloseWorkspaceDialog(false);
                  handleSaveCheckpoint();
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded text-sm font-medium"
              >
                Save & Close
              </button>
              <button
                onClick={() => {
                  setShowCloseWorkspaceDialog(false);
                  onCloseWorkspace?.();
                }}
                className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm"
              >
                Discard & Close
              </button>
              <button
                onClick={() => setShowCloseWorkspaceDialog(false)}
                className="w-full px-4 py-2 text-zinc-500 hover:text-zinc-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
          <GlassCard className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-3">Confirm</h2>
            <p className="text-sm text-zinc-300 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-zinc-800 rounded-xl p-5 w-full max-w-sm border border-zinc-700 " onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-3">Confirm</h2>
            <p className="text-sm text-zinc-300 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl py-1 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-2.5 py-1.5 text-[10px] text-zinc-500 border-b border-zinc-800/50">Open in Terminal</div>
            {Object.entries(terminalTabs).length === 0 ? (
              <div className="px-2.5 py-2 text-[10px] text-zinc-600">No running terminals</div>
            ) : (
              Object.entries(terminalTabs).map(([tid, tab]) => {
                const hasSession = sessions.some(s => s.terminal_id === tid);
                return (
                  <button
                    key={tid}
                    onClick={() => {
                      handleOpenSessionInTerminal(contextMenu.session, tid);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs text-left text-zinc-300 hover:bg-zinc-800/80 transition-colors flex items-center gap-2"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasSession ? 'bg-amber-400' : 'bg-green-400'}`} />
                    <span className="flex-1 truncate">{tab.name}</span>
                    {hasSession && <span className="text-[9px] text-amber-400">occupied</span>}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Collapsed sidebar strip */}
      {!sidebarOpen && (
        <div className="flex flex-col items-center gap-1.5 px-1.5 py-3 bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-black/95 border-l border-zinc-800/50">
          <button
            onClick={() => setShowFeaturesDialog(true)}
            className="p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-500 hover:text-cyan-300 transition-colors duration-150 active:scale-95"
            title="Workspace Features"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowGeneralistDialog(true)}
            className="p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-500 hover:text-violet-300 transition-colors duration-150 active:scale-95"
            title="Skill Configuration"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <div className="w-4 h-px bg-zinc-800/60 my-0.5" />
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-500 hover:text-cyan-300 transition-colors duration-150 active:scale-95"
            title="Open Sidebar"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </PageShell>
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

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ProblemsTab: React.FC<{ projectId?: string; projectPath?: string; projects?: { id: string; name: string; path: string }[]; onSelectProject?: (id: string) => void }> = ({ projectId, projectPath: propProjectPath, projects, onSelectProject }) => {
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

// ─────────────────────────────────────────────
// SKILLS TAB COMPONENT
// ─────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  filePath: string;
}

const SkillsTab: React.FC<{ projectPath?: string; terminalTabs?: Record<string, TerminalTabInfo>; activeTerminalId?: string | null; }> = ({ projectPath, terminalTabs = {}, activeTerminalId }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningSkill, setRunningSkill] = useState<Skill | null>(null);
  const [skillPrompt, setSkillPrompt] = useState('');
  const [skillFormValues, setSkillFormValues] = useState<Record<string, any>>({});
  const [targetTerminal, setTargetTerminal] = useState('');
  const [dslSkill, setDslSkill] = useState<Skill | null>(null);

  useEffect(() => {
    if (runningSkill?.inputs && runningSkill.inputs.length > 0) {
      const init: Record<string, any> = {};
      for (const input of runningSkill.inputs) {
        if (input.default !== undefined) {
          init[input.name] = input.default;
        } else {
          switch (input.type) {
            case 'boolean': init[input.name] = false; break;
            case 'number': init[input.name] = input.min || 0; break;
            case 'list':
            case 'multienum': init[input.name] = []; break;
            case 'enum': init[input.name] = input.choices?.[0] || ''; break;
            default: init[input.name] = '';
          }
        }
      }
      setSkillFormValues(init);
    } else {
      setSkillFormValues({});
    }
  }, [runningSkill]);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newDescription, setNewDescription] = useState('');
  const [newContent, setNewContent] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.deskflowAPI?.getSkills?.(projectPath);
      if (result?.success) setSkills(result.data || []);
    } catch (e) {
      console.error('[SkillsTab] Failed to load skills:', e);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadSkills();
    const interval = setInterval(loadSkills, 10000);
    return () => clearInterval(interval);
  }, [loadSkills]);

  const categories = ['all', ...new Set(skills.map(s => s.category || 'general'))];

  const filteredSkills = skills.filter(s => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.content.toLowerCase().includes(q);
    }
    return true;
  });

  const showNotify = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const result = await window.deskflowAPI?.createSkill?.({
        name: newName.trim(),
        category: newCategory,
        description: newDescription.trim(),
        content: newContent,
        projectPath,
      });
      if (result?.success) {
        showNotify('Skill created successfully', 'success');
        setShowNewForm(false);
        setNewName(''); setNewCategory('general'); setNewDescription(''); setNewContent('');
        loadSkills();
      } else {
        showNotify(result?.error || 'Failed to create skill', 'error');
      }
    } catch (e) {
      showNotify('Failed to create skill', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!editingSkill || !editName.trim()) return;
    try {
      const result = await window.deskflowAPI?.updateSkill?.({
        id: editingSkill.id,
        name: editName.trim(),
        category: editCategory,
        description: editDescription.trim(),
        content: editContent,
        projectPath,
      });
      if (result?.success) {
        showNotify('Skill updated successfully', 'success');
        setEditingSkill(null);
        loadSkills();
      } else {
        showNotify(result?.error || 'Failed to update skill', 'error');
      }
    } catch (e) {
      showNotify('Failed to update skill', 'error');
    }
  };

  const handleDelete = async (skill: Skill) => {
    // Use IPC to delete (by writing empty file or removing) — rely on main process
    try {
      const result = await window.deskflowAPI?.updateSkill?.({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        description: skill.description,
        content: '',
        projectPath,
      });
      if (result?.success) {
        showNotify('Skill deleted', 'success');
        loadSkills();
      }
    } catch (e) {
      showNotify('Failed to delete skill', 'error');
    }
  };

  const handleUse = async () => {
    if (!runningSkill) return;
    const terminalId = targetTerminal || activeTerminalId || Object.keys(terminalTabs)[0];
    if (!terminalId) {
      showNotify('No terminal available. Create a session first.', 'error');
      return;
    }
    try {
      const hasInputs = runningSkill.inputs && runningSkill.inputs.length > 0;
      const configLines = hasInputs
        ? Object.entries(skillFormValues)
            .filter(([_, v]) => v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0))
            .map(([key, val]) => `- ${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('\n')
        : '';
      const configSection = configLines ? `\n\n## Skill Configuration\n\n${configLines}` : '';
      const userSection = skillPrompt.trim() ? `\n\n${skillPrompt}` : '';
      const fullPrompt = `[Skill: ${runningSkill.name}]\n${runningSkill.content}${configSection}${userSection}`;
      await window.deskflowAPI?.terminalWrite?.(terminalId, fullPrompt + '\r\n');
      showNotify(`Sent "${runningSkill.name}" to terminal`, 'success');
      setRunningSkill(null);
      setSkillPrompt('');
    } catch (e) {
      showNotify('Failed to send to terminal', 'error');
    }
  };

  const openEditor = (skill: Skill) => {
    setEditingSkill(skill);
    setEditName(skill.name);
    setEditCategory(skill.category);
    setEditDescription(skill.description);
    setEditContent(skill.content);
  };

  return (
    <div>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-2 rounded text-xs shadow-lg transition-opacity ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-400">{skills.length} skill{skills.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded flex items-center gap-1 transition-colors duration-150 active:scale-95"
        >
          <Plus className="w-3 h-3" />
          Create Skill
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search skills..."
        className="w-full mb-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
      />

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors duration-150 ${
                categoryFilter === cat
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'bg-transparent text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && <p className="text-xs text-zinc-500">Loading skills...</p>}

      {/* Empty State */}
      {!loading && filteredSkills.length === 0 && (
        <div className="px-2 py-6 bg-indigo-500/5 border border-indigo-500/20 rounded text-center">
          <Sparkles className="w-6 h-6 text-indigo-400/50 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 mb-3">
            {skills.length === 0 ? 'No skills found. Create one to get started.' : 'No skills match your search.'}
          </p>
          {skills.length === 0 && (
            <button
              onClick={() => setShowNewForm(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded"
            >
              Create First Skill
            </button>
          )}
        </div>
      )}

      {/* Skill List */}
      {filteredSkills.length > 0 && (
        <div className="space-y-2">
          {filteredSkills.map(skill => (
            <div key={skill.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded overflow-hidden">
              <div className="px-2 py-2 flex items-start justify-between cursor-pointer hover:bg-zinc-800/80" onClick={() => setExpandedId(expandedId === skill.id ? null : skill.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-zinc-200">{skill.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">{skill.category || 'general'}</span>
                  </div>
                  {skill.description && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{skill.description}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); setRunningSkill(skill); setTargetTerminal(''); setSkillPrompt(''); }}
                    className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-cyan-100 text-[10px] rounded"
                    title="Use skill"
                  >
                    Use
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDslSkill(skill); }}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-amber-100 text-[10px] rounded"
                    title="Generate DSL frontmatter via terminal agent"
                  >
                    DSL
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openEditor(skill); }}
                    className="px-2 py-0.5 bg-zinc-600 hover:bg-zinc-500 text-zinc-200 text-[10px] rounded"
                    title="Edit skill"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {expandedId === skill.id && (
                <div className="px-2 pb-2 border-t border-zinc-700/30">
                  <pre className="mt-2 p-2 bg-zinc-900 rounded text-[10px] text-zinc-400 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
                    {skill.content}
                  </pre>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] text-zinc-600">Path: {skill.filePath}</span>
                    <button
                      onClick={() => handleDelete(skill)}
                      className="ml-auto px-2 py-0.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 text-[10px] rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Run Skill Modal ── */}
      {runningSkill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]" onClick={() => setRunningSkill(null)}>
          <div className="bg-zinc-800 rounded-xl w-full max-w-lg border border-zinc-700  mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Use Skill: {runningSkill.name}</h3>
              <button onClick={() => setRunningSkill(null)} className="text-zinc-400 hover:text-zinc-200">✕</button>
            </div>
            <div className="px-4 py-3 overflow-y-auto max-h-[55vh]">
              {runningSkill.inputs && runningSkill.inputs.length > 0 ? (
                <SkillDynamicForm
                  inputs={runningSkill.inputs}
                  values={skillFormValues}
                  onChange={setSkillFormValues}
                />
              ) : (
                <div className="mb-3 p-2 bg-zinc-900 rounded max-h-28 overflow-y-auto">
                  <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap font-mono">{runningSkill.content.slice(0, 500)}{runningSkill.content.length > 500 ? '...' : ''}</pre>
                </div>
              )}
              <select
                value={targetTerminal}
                onChange={e => setTargetTerminal(e.target.value)}
                className="w-full mt-3 mb-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                <option value="">Active terminal ({activeTerminalId ? terminalTabs[activeTerminalId]?.name || 'unnamed' : 'none'})</option>
                {Object.entries(terminalTabs).map(([id, tab]) => (
                  <option key={id} value={id}>{tab.name} ({tab.agent})</option>
                ))}
              </select>
              <textarea
                value={skillPrompt}
                onChange={e => setSkillPrompt(e.target.value)}
                placeholder={runningSkill.inputs && runningSkill.inputs.length > 0 ? "Additional instructions or context..." : "Enter your prompt or instructions for this skill..."}
                className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 min-h-[60px] resize-y"
              />
            </div>
            <div className="px-4 py-3 border-t border-zinc-700 flex gap-2 justify-end">
              <button onClick={() => setRunningSkill(null)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded">Cancel</button>
              <button onClick={handleUse} disabled={!(runningSkill.inputs && runningSkill.inputs.length > 0) && !skillPrompt.trim()} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded disabled:opacity-50">Send to Terminal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DSL Generation Modal ── */}
      {dslSkill && (
        <DSLGenerationModal
          skill={{
            id: dslSkill.id,
            name: dslSkill.name,
            description: dslSkill.description,
            content: dslSkill.content,
            filePath: dslSkill.filePath,
          }}
          terminals={Object.entries(terminalTabs).map(([id, tab]) => ({
            id,
            label: tab.name,
            agent: tab.agent,
            topic: tab.topic,
          }))}
          activeTerminalId={activeTerminalId}
          onClose={() => setDslSkill(null)}
          onSend={async (terminalId, prompt) => {
            await window.deskflowAPI?.terminalWrite?.(terminalId, prompt + '\r\n');
            showNotify(`DSL prompt sent to terminal for "${dslSkill?.name}"`, 'success');
          }}
        />
      )}

      {/* ── Edit Skill Modal ── */}
      {editingSkill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]" onClick={() => setEditingSkill(null)}>
          <div className="bg-zinc-800 rounded-xl w-full max-w-lg border border-zinc-700  mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-bold text-white">Edit Skill: {editingSkill.name}</h3>
              <button onClick={() => setEditingSkill(null)} className="text-zinc-400 hover:text-zinc-200">✕</button>
            </div>
            <div className="px-4 py-3 overflow-y-auto flex-1 space-y-2">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Skill name" className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
              <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="Category" className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
              <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description" className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Skill content (markdown)" className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 font-mono min-h-[200px] resize-y" />
            </div>
            <div className="px-4 py-3 border-t border-zinc-700 flex gap-2 justify-end flex-shrink-0">
              <button onClick={() => setEditingSkill(null)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded">Cancel</button>
              <button onClick={handleUpdate} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Skill Modal ── */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]" onClick={() => setShowNewForm(false)}>
          <div className="bg-zinc-800 rounded-xl w-full max-w-lg border border-zinc-700  mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-bold text-white">Create Skill</h3>
              <button onClick={() => setShowNewForm(false)} className="text-zinc-400 hover:text-zinc-200">✕</button>
            </div>
            <div className="px-4 py-3 overflow-y-auto flex-1 space-y-2">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Skill name *" className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
              <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category (e.g., coding, testing, review)" className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
              <input type="text" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Short description" className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200" />
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Skill content (markdown) — include instructions, examples, and rules..." className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 font-mono min-h-[200px] resize-y" />
            </div>
            <div className="px-4 py-3 border-t border-zinc-700 flex gap-2 justify-end flex-shrink-0">
              <button onClick={() => setShowNewForm(false)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded">Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim()} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded disabled:opacity-50">Create Skill</button>
            </div>
          </div>
        </div>
      )}
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

// ─────────────────────────────────────────────
// FILES TAB COMPONENT
// ─────────────────────────────────────────────

interface AgentFile {
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
}

const FilesTab: React.FC<{ projectId?: string; projectPath?: string; projects?: { id: string; name: string; path: string }[]; onSelectProject?: (id: string) => void }> = ({ projectId, projectPath: propProjectPath, projects, onSelectProject }) => {
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [initStatus, setInitStatus] = useState<'idle' | 'checking' | 'ready' | 'init-ok' | 'error'>('idle');
  const [fileChangedNotify, setFileChangedNotify] = useState<string | null>(null);

  // Listen for live file change notifications
  useEffect(() => {
    if (!window.deskflowAPI?.onAgentFileChanged) return;
    const cleanup = window.deskflowAPI.onAgentFileChanged((data: { file: string; mtime: string }) => {
      setFileChangedNotify(`${data.file} updated`);
      setTimeout(() => setFileChangedNotify(null), 4000);
      loadFiles();
    });
    return () => cleanup?.();
  }, []);

  const project = projects?.find(p => p.id === projectId);
  const projectPath = propProjectPath || project?.path || '';

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

  const statusIcons: Record<string, React.ReactNode> = {
    'idle': <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />,
    'checking': <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />,
    'ready': <CheckCircle2 className="w-3 h-3 text-green-400" />,
    'init-ok': <CheckCircle2 className="w-3 h-3 text-green-400" />,
    'error': <AlertCircle className="w-3 h-3 text-red-400" />,
  };
  const statusLabels: Record<string, string> = {
    'idle': 'Not initialized',
    'checking': 'Checking...',
    'ready': 'Ready',
    'init-ok': 'Initialized',
    'error': 'Error'
  };

  const getFileCategory = (file: AgentFile): string => {
    if (file.isDirectory) return '';
    const sep = file.path.includes('\\') ? '\\' : '/';
    const parts = file.path.split(sep);
    if (parts.length === 1) return 'Root';
    return parts[0];
  };

  const groupedFiles = files.filter(f => !f.isDirectory).reduce<Record<string, AgentFile[]>>((acc, file) => {
    const cat = getFileCategory(file);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(file);
    return acc;
  }, {});

  const categoryOrder = ['Root', 'skills', 'docs', 'templates'];
  const sortedCategories = Object.keys(groupedFiles).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    'Root': <Folder className="w-3 h-3 text-zinc-500" />,
    'skills': <Zap className="w-3 h-3 text-amber-500" />,
    'docs': <FileText className="w-3 h-3 text-cyan-500" />,
    'templates': <FileText className="w-3 h-3 text-violet-500" />,
  };

  const closePreview = () => {
    setSelectedFile(null);
    setFileContent('');
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Status & Project header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {statusIcons[initStatus]}
          <span className={`text-[10px] font-medium ${
            initStatus === 'error' ? 'text-red-400' :
            initStatus === 'checking' ? 'text-yellow-400' :
            initStatus === 'ready' || initStatus === 'init-ok' ? 'text-green-400' :
            'text-zinc-500'
          }`}>
            {statusLabels[initStatus]}
          </span>
        </div>
        {projectPath && (
          <span className="text-[10px] text-zinc-600">{files.filter(f => !f.isDirectory).length} files</span>
        )}
      </div>

      {/* Project path display */}
      {projectPath ? (
        <GlassCard className="p-2 mb-2">
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-zinc-300 truncate" title={projectPath}>
                {project?.name || 'Project'}
              </div>
              <div className="text-[10px] text-zinc-500 truncate" title={projectPath}>
                {projectPath}
              </div>
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-3 mb-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">No project selected</span>
          </div>
          <div className="text-[10px] text-zinc-500">Select a project:</div>
          <select
            value=""
            onChange={(e) => { if (e.target.value) onSelectProject?.(e.target.value); }}
            className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">-- Choose project --</option>
            {projects?.filter(p => p.id).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </GlassCard>
      )}

      {/* File Change Notification */}
      {fileChangedNotify && (
        <div className="mb-2 px-2.5 py-1.5 bg-green-600/15 border border-green-500/25 rounded-lg text-[10px] text-green-300 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          {fileChangedNotify}
        </div>
      )}

      {/* Files List */}
      {loading ? (
        <LoadingState variant="spinner" />
      ) : error ? (
        <div className="flex items-center gap-1.5 text-[10px] text-rose-400 py-4 justify-center">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      ) : !projectPath ? (
        <div className="text-[11px] text-zinc-500 py-4 text-center">
          Select a project to view agent files
        </div>
      ) : files.length === 0 ? (
        <EmptyState icon={FileText} title="No agent files" description='Use the Setup button in the header to initialize.' />
      ) : (
        <div className="flex-1 overflow-y-auto pb-2">
          {sortedCategories.map(cat => (
            <div key={cat} className="mb-2">
              <div className="flex items-center gap-1.5 px-1 py-1 mb-1">
                {categoryIcons[cat] || <FileText className="w-3 h-3 text-zinc-500" />}
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  {cat === 'Root' ? 'Infrastructure' : cat}
                </span>
                <span className="text-[10px] text-zinc-700 ml-auto">{groupedFiles[cat].length}</span>
              </div>
              {groupedFiles[cat].map(file => (
                <div
                  key={file.path}
                  onClick={() => handleFileClick(file)}
                  className={`p-2 rounded mb-0.5 cursor-pointer flex items-center gap-2 transition-colors duration-150 ${
                    selectedFile === file.name 
                      ? 'bg-zinc-700/70 border border-zinc-600/50' 
                      : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${
                    file.name.endsWith('.md') ? 'text-cyan-500' :
                    file.name.endsWith('.json') ? 'text-amber-500' :
                    'text-zinc-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-zinc-200 truncate">{file.name}</div>
                    <div className="text-[10px] text-zinc-600 truncate">{file.path}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* File Content Preview — overlay */}
      {selectedFile && fileContent && (
        <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[45%] flex flex-col bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-700/50 rounded-t-lg shadow-2xl">
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-800/60 border-b border-zinc-700/30 rounded-t-lg flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${
                selectedFile.endsWith('.md') ? 'text-cyan-500' : 'text-zinc-500'
              }`} />
              <span className="text-[11px] text-zinc-300 truncate">{selectedFile}</span>
              <span className="text-[10px] text-zinc-600">{(fileContent.length / 1024).toFixed(1)} KB</span>
            </div>
            <button onClick={closePreview} className="p-0.5 hover:bg-zinc-700/50 rounded transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5">
            {selectedFile.endsWith('.md') ? (
              <div className="space-y-1.5 text-xs">
                {fileContent.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h2 key={i} className="text-sm font-bold text-white pb-0.5">{line.slice(2)}</h2>;
                  if (line.startsWith('## ')) return <h3 key={i} className="text-xs font-semibold text-amber-300 pt-1">{line.slice(3)}</h3>;
                  if (line.startsWith('### ')) return <h4 key={i} className="text-[11px] font-semibold text-cyan-300 pt-0.5">{line.slice(4)}</h4>;
                  if (line.startsWith('- ')) return <div key={i} className="text-zinc-400 pl-3">• {line.slice(2)}</div>;
                  if (line.startsWith('> ')) return <div key={i} className="text-zinc-500 italic border-l-2 border-zinc-600 pl-2 py-0.5">{line.slice(2)}</div>;
                  if (line.startsWith('| ')) return <div key={i} className="text-zinc-400 font-mono text-[10px]">{line}</div>;
                  if (line.trim() === '---') return <hr key={i} className="border-zinc-700/50 my-1" />;
                  if (line.startsWith('```')) return null;
                  const codeMatch = line.match(/`([^`]+)`/);
                  if (codeMatch) {
                    const parts = line.split(/`([^`]+)`/);
                    return <p key={i} className="text-zinc-400">{parts.map((part, j) => j % 2 === 1 ? <code key={j} className="bg-zinc-800/80 px-1 rounded text-cyan-400 text-[10px]">{part}</code> : part)}</p>;
                  }
                  if (line.trim()) return <p key={i} className="text-zinc-400">{line}</p>;
                  return <div key={i} className="h-0.5" />;
                })}
              </div>
            ) : (
              <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                {fileContent}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// TERMINALS TAB
// ─────────────────────────────────────────────

const TerminalsTab: React.FC<{
  terminalTabs: Record<string, TerminalTabInfo>;
  terminalBindings: Record<string, any>;
  activeTerminalId: string | null;
  sessions: Session[];
  onFocusTerminal: (id: string) => void;
  onResumeSession: (session: Session, terminalId?: string) => void;
}> = ({ terminalTabs, terminalBindings, activeTerminalId, sessions, onFocusTerminal, onResumeSession }) => {
  const runningTerminals = Object.entries(terminalTabs);

  return (
    <div className="flex flex-col h-full">
      {/* Running Terminals */}
      <div className="mb-4">
        <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Running Terminals ({runningTerminals.length})
        </div>
        {runningTerminals.length === 0 ? (
          <p className="text-xs text-zinc-600 px-2">No running terminals</p>
        ) : (
          <div className="space-y-2">
            {runningTerminals.map(([id, tab]) => {
              const sessionInTerminal = sessions.find(s => s.terminal_id === id);
              return (
                <div
                  key={id}
                  className={`p-2 rounded border transition-colors duration-150 ${
                    activeTerminalId === id
                      ? 'bg-zinc-700/80 border-zinc-600/50 shadow-[0_0_10px_rgba(0,0,0,0.2)]'
                      : 'bg-zinc-800/50 border-zinc-700/30 hover:bg-zinc-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-200 truncate">{tab.name}</div>
                      <div className="text-[10px] text-zinc-500">{tab.agent}</div>
                    </div>
                    {activeTerminalId === id && (
                      <span className="text-[10px] text-green-400">active</span>
                    )}
                  </div>
                  {/* Session info for this terminal */}
                  {sessionInTerminal ? (
                    <div className="mt-1.5 ml-4 pl-2 border-l-2 border-cyan-500/30">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-cyan-400">Session:</span>
                        <CategoryBadge category={sessionInTerminal.category} />
                        <StatusDot status={sessionInTerminal.status} />
                        <span className="text-[10px] text-zinc-300 truncate">{sessionInTerminal.topic || 'Unnamed'}</span>
                      </div>
                      <div className="text-[9px] text-zinc-600 mt-0.5">{sessionInTerminal.agent} • {formatDate(sessionInTerminal.created_at)}</div>
                      {sessionInTerminal.product_area && (
                        <div className="text-[9px] text-cyan-600/70">{sessionInTerminal.product_area}</div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 ml-4 pl-2 border-l-2 border-zinc-700/30">
                      <div className="text-[9px] text-zinc-500">No session — ready to assign</div>
                    </div>
                  )}
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={() => onFocusTerminal(id)}
                      className="flex-1 px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[9px] rounded"
                    >
                      Focus
                    </button>
                    {!sessionInTerminal && (
                      <button
                        onClick={() => {
                          // Pre-fill new session dialog for this terminal
                          const event = new CustomEvent('open-new-session-for-terminal', { detail: { terminalId: id } });
                          window.dispatchEvent(event);
                        }}
                        className="flex-1 px-1.5 py-0.5 bg-cyan-700 hover:bg-cyan-600 text-cyan-200 text-[9px] rounded"
                      >
                        New Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sessions (with and without terminals) */}
      <div>
        <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-500" />
          Sessions ({sessions.length})
        </div>
        {sessions.length === 0 ? (
          <EmptyState title="No sessions" />
        ) : (
          <div className="space-y-1">
            {sessions.slice(0, 20).map((session) => {
              const isRunning = session.terminal_id && terminalTabs[session.terminal_id];
              return (
                <div key={session.id} className={`px-2 py-2 rounded group transition-colors duration-150 ${
                  isRunning ? 'bg-zinc-800/30 border-l-2 border-green-700/30' : 'bg-zinc-800/10 border-l-2 border-zinc-700/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <StatusDot status={session.status} />
                        <CategoryBadge category={session.category} />
                        <span className={`text-[10px] font-medium px-1 rounded ${
                          isRunning ? 'text-green-400 bg-green-500/20' : 'text-zinc-500 bg-zinc-700/30'
                        }`}>{session.agent}</span>
                        <span className="text-xs text-zinc-300 truncate">{session.topic || 'No topic'}</span>
                      </div>
                      <div className="text-[10px] text-zinc-600 flex items-center gap-1 mt-0.5">
                        {isRunning ? (
                          <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {terminalTabs[session.terminal_id!]?.name || 'Terminal'}</>
                        ) : (
                          <><span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Closed • {formatDate(session.created_at)}</>
                        )}
                        {session.product_area && (
                          <span className="text-[9px] text-cyan-600/70 ml-1">{session.product_area}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      {isRunning ? (
                        <button
                          onClick={() => onFocusTerminal(session.terminal_id!)}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-blue-200 text-[10px] rounded"
                        >
                          Focus
                        </button>
                      ) : (
                        <button
                          onClick={() => onResumeSession(session)}
                          className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-cyan-200 text-[10px] rounded"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// REQUEST DETAIL MODAL
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// NEW REQUEST DIALOG
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// FEATURES DIALOG
// ─────────────────────────────────────────────

const FEATURES = [
  {
    category: 'Terminal',
    color: 'green',
    items: [
      { name: 'Split Panes', desc: 'Split terminal into horizontal/vertical panes with drag resize' },
      { name: 'Multi-Terminal', desc: 'Run multiple terminals simultaneously with tabbed interface' },
      { name: 'Layout Persistence', desc: 'Terminal layouts auto-save and restore across sessions' },
      { name: 'Minimap', desc: 'Visual minimap for navigating split terminal panes' },
    ],
  },
  {
    category: 'Presets',
    color: 'green',
    items: [
      { name: 'Quick Commands', desc: 'Save and run frequently used terminal commands as presets' },
      { name: 'Categorized', desc: 'Organize presets by category (test, build, deploy, etc.)' },
    ],
  },
  {
    category: 'Sessions',
    color: 'green',
    items: [
      { name: 'Session Tracking', desc: 'Track each AI agent session with metadata and categorization' },
      { name: 'Category System', desc: 'Categorize sessions as bug-fix, feature, refactor, research, review' },
      { name: 'Status Tracking', desc: 'Monitor session status (active, paused, completed, error)' },
      { name: 'Message History', desc: 'View full message history for any session with search' },
    ],
  },
  {
    category: 'Analytics',
    color: 'emerald',
    items: [
      { name: 'AI Usage Stats', desc: 'Token usage, cost tracking, and session statistics per agent' },
      { name: 'Charts & Trends', desc: 'Visual charts for cost, tokens, sessions by agent and status' },
      { name: 'Problem/Request Progress', desc: 'Progress bars for problem resolution and request completion' },
    ],
  },
  {
    category: 'Issues',
    color: 'emerald',
    items: [
      { name: 'Problems Tab', desc: 'Track and manage problems with status, priority, and category' },
      { name: 'Requests Tab', desc: 'Manage feature requests and changes with linking to problems' },
      { name: 'Status Management', desc: 'Update problem/request status with visual feedback' },
      { name: 'Problem Linking', desc: 'Link problems to terminals and requests for traceability' },
    ],
  },
  {
    category: 'Files',
    color: 'yellow',
    items: [
      { name: 'Agent File Browser', desc: 'Browse and edit agent directory files inline' },
      { name: 'Live File Watching', desc: 'Auto-detect file changes and show real-time notifications' },
      { name: 'Init File Support', desc: 'Create and select custom INITIALIZE.md files per project' },
    ],
  },
  {
    category: 'Skills',
    color: 'indigo',
    items: [
      { name: 'Skill Management', desc: 'Create, edit, and manage AI agent skills with full CRUD' },
      { name: 'Inline Editing', desc: 'Edit skill markdown directly in the sidebar with save support' },
      { name: 'Category Filtering', desc: 'Filter skills by type (design, research, debugging, etc.)' },
    ],
  },
  {
    category: 'Design',
    color: 'pink',
    items: [
      { name: 'Design Skills', desc: 'Configure design intelligence levels (variance, motion, density)' },
      { name: 'Taste Configuration', desc: 'Fine-tune design output preferences' },
    ],
  },
  {
    category: 'Context',
    color: 'amber',
    items: [
      { name: 'Context Systems', desc: 'Toggle context sources (LLM Wiki, Obsidian Skills, Graphify, PARÁ, QMD, Automations, Design Skills)' },
      { name: 'Context Map', desc: 'Visual map showing active context systems and token budget' },
      { name: 'Context Assembly', desc: 'Build and preview assembled context before starting a session' },
      { name: 'Maintenance', desc: 'Manage context optimization, summarization, and deep memory' },
    ],
  },
  {
    category: 'History',
    color: 'rose',
    items: [
      { name: 'Command History', desc: 'View and search command execution history' },
      { name: 'Session Log', desc: 'Complete log of past sessions with timestamps' },
    ],
  },
];

const categoryColors: Record<string, string> = {
  green: 'border-green-500/30 text-green-400',
  emerald: 'border-emerald-500/30 text-emerald-400',
  yellow: 'border-yellow-500/30 text-yellow-400',
  indigo: 'border-indigo-500/30 text-indigo-400',
  pink: 'border-pink-500/30 text-pink-400',
  amber: 'border-amber-500/30 text-amber-400',
  rose: 'border-rose-500/30 text-rose-400',
};

function FeaturesDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[var(--z-overlay)]" onClick={onClose}>
      <GlassCard className="w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Workspace Features</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">✕</button>
        </div>

        <p className="text-xs text-zinc-400 mb-6">
          Overview of all features available in the Terminal Workspace sidebar.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {FEATURES.map((group) => (
            <div key={group.category} className={`bg-zinc-900/50 rounded-lg p-3 border-l-2 ${categoryColors[group.color]}`}>
              <h3 className="text-sm font-semibold text-white mb-3">{group.category}</h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.name} className="text-xs">
                    <div className="text-zinc-200 font-medium">{item.name}</div>
                    <div className="text-zinc-500 mt-0.5">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
