import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, BookOpen, Newspaper } from 'lucide-react';
import { AiPageDeck } from '../components/ai/deck/AiPageDeck';
import { FocusBoard } from '../components/ai/focus/FocusBoard';
import { PlanBoard } from '../components/ai/plan/PlanBoard';
import { ReflectFeed } from '../components/ai/reflect/ReflectFeed';
import { SummaryGrid } from '../components/ai/summary/SummaryGrid';
import { parseChecklist } from '../services/planningParser';
import { DailyDigestBoard } from '../components/ai/digest/DailyDigestBoard';
import { ConnectorsPanel } from '../components/ai/connectors/ConnectorsPanel';
import { AIFeaturesModal } from '../components/AIFeaturesModal';
import { AiProviderSelectModal, getProviderBadge } from '../components/AiProviderSelectModal';
import { ConnectorSetupModal } from '../components/ConnectorSetupModal';
import type { DataState, Goal, GoalDay, Mode, LongTermGoal } from '../components/ai/types';
import { useAiChat } from '../hooks/useAiChat';
import type { CardAction } from '../components/ai/chat/parsed';

// ADDED — Toast system for transient feedback
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
let toastCounter = 0;

function getToday() { return new Date().toISOString().slice(0, 10); }

function determineMode(goals: Goal[]): Mode {
  if (goals.length === 0) return 'morning';
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 20) return 'review';
  const allDone = goals.every(g => g.status === 'done' || g.status === 'missed');
  if (allDone && goals.length > 0) return 'review';
  return 'in-progress';
}

const modeLabelMap: Record<Mode, string> = {
  morning: 'Morning Planning',
  'in-progress': 'In Progress',
  review: 'Evening Review',
};

type AiTab = "deck" | "digest"

export function AiPage() {
  const today = getToday();
  const [tab, setTab] = useState<AiTab>("deck");

  const [goals, setGoals] = useState<Goal[]>([]);
  const [review, setReview] = useState<string | null>(null);
  const [goalsState, setGoalsState] = useState<DataState>('loading');
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Goal[]>([]);
  const [planGoals, setPlanGoals] = useState<Goal[]>([]);
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
  const [planningNotes, setPlanningNotes] = useState('');
  const [showFeatures, setShowFeatures] = useState(false);
  const navigate = useNavigate();
  const openSettings = useCallback(() => {
    try { localStorage.setItem('settings-activeTab', 'ai'); } catch (e) { console.error('[AiPage] save activeTab:', e); }
    navigate('/settings');
  }, [navigate]);

  const [digestTopics, setDigestTopics] = useState<any[]>([]);
  const [digestState, setDigestState] = useState<DataState>('loading');
  const [digestReason, setDigestReason] = useState<string | null>(null);
  const digestPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [aiProviders, setAiProviders] = useState<Array<{ id: string; label: string; models: string[]; enabled: boolean }>>([]);
  const [aiRouting, setAiRouting] = useState<Record<string, { providerId: string; model: string } | null>>({});
  const [configuringFeature, setConfiguringFeature] = useState<'default' | 'researchDigest' | 'goalAssistant' | null>(null);
  const [showConnectorSetup, setShowConnectorSetup] = useState(false);

  const chat = useAiChat();
  const [actionResults, setActionResults] = useState<Record<string, 'running' | 'done' | 'error'>>({});
  const [connectorSyncing, setConnectorSyncing] = useState<Record<string, true>>({});
  const [reflectDays, setReflectDays] = useState<GoalDay[]>([]);
  // ADDED — toast system
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Focus board per-action errors
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<number, string>>({});
  const [acceptErrors, setAcceptErrors] = useState<Record<string, string>>({});

  // Chat context warnings
  const [contextWarnings, setContextWarnings] = useState<string[]>([]);
  const dismissError = useCallback((index: number) => {
    setContextWarnings(prev => prev.filter((_, i) => i !== index));
  }, []);

  const [dayWindow, setDayWindow] = useState(5);
  const handleLoadOlder = useCallback(() => setDayWindow(prev => prev + 5), []);

  const unfinishedCount = goals.filter(g => g.status !== 'done' && g.status !== 'missed').length;
  const mode = determineMode(goals);

  const goalsDataState = (() => {
    if (goalsState === 'loading') return 'loading';
    if (goalsError) return 'error';
    if (goals.length === 0) return 'empty';
    return 'ready';
  })();

  const digestDataState = (() => {
    if (digestState === 'loading') return 'loading';
    if (digestTopics.length === 0) return 'empty';
    return 'ready';
  })();

  const focusMetrics = {
    doneToday: goals.filter(g => g.status === 'done').length,
    inProgress: goals.filter(g => g.status === 'active').length,
    focusSeconds: 0,
  };

  const summaryStats = {
    goalsCompleted: goals.filter(g => g.status === 'done').length,
    focusSeconds: 0,
    streakDays: 0,
    activeGoals: goals.filter(g => g.status === 'active').length,
  };

  const glanceMetrics = [
    { label: 'Done today', value: String(summaryStats.goalsCompleted) },
    { label: 'Active', value: String(summaryStats.activeGoals) },
    { label: 'Unfinished', value: String(unfinishedCount) },
    { label: 'Focus', value: '—' },
  ];

  const loadGoals = useCallback(async () => {
    setGoalsState('loading');
    setGoalsError(null);
    try {
      const day: GoalDay = await window.deskflowAPI!.getGoals(today);
      setGoals(day.goals || []);
      setReview(day.reviewSummary || null);
      setGoalsState(day.goals?.length ? 'ready' : 'empty');
    } catch (err: any) {
      setGoalsError(err.message || 'Failed to load goals');
      setGoalsState('error');
    }
  }, [today]);

  const loadDigest = useCallback(async (showLoader = true, force = false) => {
    if (showLoader) setDigestState('loading');
    try {
      const r = await window.deskflowAPI!.getTopicDigest(force ? { force: true } : undefined);
      if (r.success) { setDigestTopics(r.topics || []); setDigestReason(r.reason || null); setDigestState(r.topics?.length ? 'ready' : 'empty'); }
      else { setDigestState('error'); setDigestReason(null); }
    } catch (err: any) {
      console.error('[AiPage] loadDigest:', err);
      setDigestState('error');
    }
  }, []);

  const loadPlanGoals = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.readPlanningMd();
      if (r.content) {
        const items = parseChecklist(r.content).filter(i => !i.checked);
        setPlanGoals(items.map(i => ({ id: crypto.randomUUID(), title: i.title, targetSeconds: i.targetSeconds, category: 'work' as const, status: 'active' as const, period: 'daily', date: today, source: 'planning', links: [], createdAt: new Date().toISOString(), target: { type: 'completion' as const } })));
        setPlanningNotes(r.content);
      }
    } catch (e) { console.error('[AiPage] loadPlanGoals:', e); }
  }, [today]);

  const loadLongTermGoals = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.getLongtermGoals();
      if (r.success && r.goals) {
        setLongTermGoals(r.goals.map((g: any) => ({ id: g.id, title: g.title, description: g.description, category: g.category, status: g.status === 'completed' ? 'done' : g.status, priority: g.priority || 3 })));
      }
    } catch (e) { console.error('[AiPage] loadLongTermGoals:', e); }
  }, []);

  const loadReflect = useCallback(async () => {
    try {
      const start = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const r = await window.deskflowAPI!.getGoalsBatch(start, today);
      if (r?.success && Array.isArray(r.days)) {
        setReflectDays(r.days.map((d: any) => ({ date: d.date, goals: d.goals || [], reviewSummary: d.reviewSummary || undefined })));
      }
    } catch (e) { console.error('[AiPage] loadReflect:', e); }
  }, [today]);

  const [bootState, setBootState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [bootError, setBootError] = useState<string | null>(null);

  const loadBoot = useCallback(async () => {
    setBootState('loading');
    setBootError(null);
    try {
      await Promise.all([
        loadGoals(),
        loadPlanGoals(),
        loadLongTermGoals(),
        loadReflect(),
      ]);
      setBootState('ready');
    } catch (e: any) {
      console.error('[AiPage] boot failed:', e);
      setBootError(e.message || 'Failed to initialize');
      setBootState('error');
    }
  }, [loadGoals, loadPlanGoals, loadLongTermGoals, loadReflect]);

  useEffect(() => {
    loadBoot();
    const initDigest = async () => {
      const generating = await window.deskflowAPI!.isDigestGenerating();
      if (generating) {
        setDigestState('loading');
        digestPollRef.current = setInterval(async () => {
          try {
            const r = await window.deskflowAPI!.getTopicDigest();
            if (r.success && r.topics?.length > 0) {
              setDigestTopics(r.topics);
              setDigestState('ready');
              if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
            }
          } catch (e) { console.error('[AiPage] digest poll:', e); }
        }, 3000);
      } else {
        await loadDigest();
      }
    };
    initDigest();
    const cleanup = window.deskflowAPI?.onDigestGenerationComplete?.((data: any) => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
      if (data.success && data.topics) { setDigestTopics(data.topics); setDigestState('ready'); }
    });

    return () => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
      cleanup();
    };
  }, [loadBoot, loadDigest]);

  useEffect(() => {
    (async () => {
      try {
        const state = await window.deskflowAPI!.getAiProviders();
        if (state?.providers) {
          setAiProviders(state.providers.map((p: any) => ({ id: p.id, label: p.label, models: p.models || [], enabled: p.enabled })));
          setAiRouting(state.routing || {});
        }
      } catch (e) { console.error('[AiPage] getAiProviders:', e); }
    })();
  }, []);

  const [suggesting, setSuggesting] = useState(false);
  const handleSuggest = useCallback(async () => {
    setSuggesting(true);
    try {
      const [plan, contextStats, longterm] = await Promise.all([
        window.deskflowAPI!.readPlanningMd(),
        window.deskflowAPI!.getGoalContext(),
        window.deskflowAPI!.getLongtermGoals(),
      ]);
      const ctx: Record<string, any> = {};
      if (plan.content) ctx.planningContent = plan.content;
      if (contextStats?.success) ctx.stats = { last7dByCategory: contextStats.last7dByCategory };
      if (longterm?.success && longterm.goals?.length > 0) {
        ctx.longtermGoals = longterm.goals.filter((g: any) => g.status !== 'completed').map((g: any) => ({ title: g.title, category: g.category }));
      }
      const r = await window.deskflowAPI!.suggestGoals(today, ctx);
      if (r.success && r.suggestions?.length > 0) {
        setSuggestions(r.suggestions.map((s: any) => ({ id: crypto.randomUUID(), title: s.title, category: s.category, status: 'active' as const, period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString(), target: { type: 'completion' as const } })));
        showToast(`${r.suggestions.length} goal suggestion${r.suggestions.length > 1 ? 's' : ''} ready`, 'success');
      } else if (r.success) {
        showToast('No suggestions available — try adding more context', 'info');
      } else {
        showToast(r.error || 'Failed to get suggestions', 'error');
      }
    } catch (e: any) {
      console.error('[AiPage] handleSuggest:', e);
      showToast(e.message || 'Failed to get suggestions', 'error');
    }
    setSuggesting(false);
  }, [today, showToast]);

  const handleRoutingSave = useCallback(async (feature: 'default' | 'researchDigest' | 'goalAssistant', entry: { providerId: string; model: string } | null) => {
    try {
      const state = await window.deskflowAPI!.getAiProviders();
      const providers = state?.providers || [];
      const routing = { ...(state?.routing || {}) };
      routing[feature] = entry;
      await window.deskflowAPI!.saveAiProviders({ providers, routing });
      setAiRouting(routing);
    } catch (e) { console.error('[AiPage] handleRoutingSave:', e); }
  }, []);

  const handleToggleGoal = useCallback(async (goal: Goal) => {
    const snapshot = [...goals];
    const newStatus = goal.status === 'done' ? 'active' : 'done';
    try {
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : undefined } : g));
      await window.deskflowAPI!.saveGoal(today, { ...goal, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : undefined });
      setToggleErrors(prev => { const n = { ...prev }; delete n[goal.id]; return n; });
    } catch (e: any) {
      setGoals(snapshot);
      setToggleErrors(prev => ({ ...prev, [goal.id]: e.message || 'Update failed' }));
      showToast(e.message || 'Failed to update goal', 'error');
    }
  }, [today, goals, showToast]);

  const handleSaveReview = useCallback(async (msg: string) => {
    try {
      const r = await window.deskflowAPI!.saveGoalReview(today, msg);
      if (r.success) { setReview(msg); setReviewError(null); }
      else { setReviewError(r.error || 'Save failed'); }
    } catch (e: any) {
      console.error('[AiPage] handleSaveReview:', e);
      setReviewError(e.message || 'Save failed');
    }
  }, [today]);

  const handleAcceptSuggestion = useCallback(async (goal: Goal) => {
    const suggestionSnapshot = [...suggestions];
    const goalsSnapshot = [...goals];
    const newGoal: Goal = { id: crypto.randomUUID(), title: goal.title, category: goal.category, target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() };
    try {
      await window.deskflowAPI!.saveGoal(today, { id: newGoal.id, title: newGoal.title, category: newGoal.category, target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() });
      setSuggestions(prev => prev.filter(x => x.title !== goal.title));
      setGoals(prev => [...prev, newGoal]);
      setAcceptErrors(prev => { const n = { ...prev }; delete n[goal.title]; return n; });
      showToast('Goal saved', 'success');
    } catch (e: any) {
      setSuggestions(suggestionSnapshot);
      setGoals(goalsSnapshot);
      setAcceptErrors(prev => ({ ...prev, [goal.title]: e.message || 'Failed to save' }));
      showToast(e.message || 'Failed to save goal', 'error');
    }
  }, [today, suggestions, goals, showToast]);

  const handleDismissSuggestion = useCallback((goal: Goal) => { setSuggestions(prev => prev.filter(x => x.title !== goal.title)); }, []);

  const onCardAction = useCallback(async (action: CardAction) => {
    const api = window.deskflowAPI!;
    switch (action.kind) {
      case 'accept-goal': {
        try {
          await api.saveGoal(today, { id: crypto.randomUUID(), title: action.goal.title, category: (action.goal.category as any) || 'work', target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() });
          await loadGoals();
        } catch (e) { console.error('[AiPage] onCardAction accept-goal:', e); }
        break;
      }
      case 'dismiss-goal':
        break;
      case 'apply-plan': {
        try {
          const goals = action.changes.filter(c => c.action !== 'complete').map(c => ({ title: c.goal.title, category: c.goal.category, priority: c.goal.priority }));
          if (goals.length) await api.saveGoalsBatch(goals as any);
          await loadLongTermGoals();
        } catch (e) { console.error('[AiPage] onCardAction apply-plan:', e); }
        break;
      }
      case 'run-ipc': {
        const label = action.label || action.ipc;
        setActionResults(prev => ({ ...prev, [label]: 'running' }));
        try {
          const fn = (api as any)[action.ipc];
          if (typeof fn === 'function') await fn(action.payload);
          setActionResults(prev => ({ ...prev, [label]: 'done' }));
          loadGoals();
          loadDigest(false);
        } catch (e) {
          console.error('[AiPage] onCardAction run-ipc:', e);
          setActionResults(prev => ({ ...prev, [label]: 'error' }));
        }
        break;
      }
      case 'submit-form': {
        const summary = Object.entries(action.values).map(([k, v]) => k + ': ' + String(v)).join(', ');
        if (chat) chat.send(summary);
        break;
      }
      case 'sync-connector': {
        setConnectorSyncing(prev => ({ ...prev, [action.name]: true }));
        try {
          const connectors: any = (api as any).connectors;
          if (connectors?.sync) await connectors.sync(action.id || action.name);
        } catch (e) { console.error('[AiPage] onCardAction sync-connector:', e); }
        setConnectorSyncing(prev => { const n = { ...prev }; delete n[action.name]; return n; });
        break;
      }
      case 'open-url': {
        try { window.open(action.url, '_blank'); } catch (e) { console.error('[AiPage] onCardAction open-url:', e); }
        break;
      }
      case 'send-text': {
        if (chat) chat.send(action.text);
        break;
      }
      case 'retry': {
        const last = chat.messages.filter(m => m.role === 'user').at(-1);
        if (last) chat.send(last.content);
        break;
      }
    }
  }, [today, loadGoals, loadLongTermGoals, loadDigest, chat]);

  const [savingNotes, setSavingNotes] = useState(false);
  const handleSaveNotes = useCallback(async (content: string) => {
    setSavingNotes(true);
    try {
      await window.deskflowAPI!.writePlanningMd({ content });
      setPlanningNotes(content);
      showToast('Notes saved', 'success');
    } catch (e: any) {
      console.error('[AiPage] handleSaveNotes:', e);
      showToast(e.message || 'Failed to save notes', 'error');
    }
    setSavingNotes(false);
  }, [showToast]);

  const handleAnalyzeDump = useCallback(async (text: string) => {
    try {
      const r = await window.deskflowAPI!.parseGoalDump(text);
      if (r.success && r.goals) {
        return r.goals.map((g: any) => ({ title: g.title, category: g.category || 'work', priority: g.priority || 3, description: g.description }));
      }
    } catch (e) { console.error('[AiPage] handleAnalyzeDump:', e); }
    return [];
  }, []);

  const handleSaveGoals = useCallback(async (goals: Partial<LongTermGoal>[]) => {
    try {
      const enriched = goals.map((g) => ({
        ...g,
        id: g.id || crypto.randomUUID(),
        date: g.date || today,
        status: g.status || 'active',
        period: g.period || 'longterm',
        source: g.source || 'planning',
        links: g.links || [],
        createdAt: new Date().toISOString(),
      }));
      await window.deskflowAPI!.saveGoalsBatch(enriched as any);
      await loadLongTermGoals();
    } catch (e) { console.error('[AiPage] handleSaveGoals:', e); }
  }, [loadLongTermGoals, today]);

  const handleToggleLongTermGoal = useCallback(async (goal: LongTermGoal) => {
    try {
      const newStatus = goal.status === 'done' ? 'active' : 'done';
      await window.deskflowAPI!.saveGoal(today, { id: goal.id, title: goal.title, category: goal.category, priority: goal.priority, status: newStatus, period: 'longterm', date: today, source: 'planning', links: [], createdAt: new Date().toISOString(), completedAt: newStatus === 'done' ? new Date().toISOString() : undefined, target: { type: 'completion' } });
      await loadLongTermGoals();
    } catch (e) { console.error('[AiPage] handleToggleLongTermGoal:', e); }
  }, [today, loadLongTermGoals]);

  const digestBadge = getProviderBadge(aiProviders, aiRouting.researchDigest);
  const defaultBadge = getProviderBadge(aiProviders, aiRouting.default);

  return (
    <>
      {bootState === 'loading' ? (
        <div className="dk-root">
          <div className="dk-wrap flex items-center justify-center min-h-[70vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500">Loading DeskFlow AI…</p>
            </div>
          </div>
        </div>
      ) : bootState === 'error' ? (
        <div className="dk-root">
          <div className="dk-wrap flex items-center justify-center min-h-[70vh]">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="rounded-full bg-red-500/10 p-3">
                <span className="text-xl text-red-400">!</span>
              </div>
              <p className="text-sm text-red-400">{bootError || 'Failed to initialize'}</p>
              <button
                onClick={loadBoot}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="dk-root">
        <div className="dk-wrap">
          <div className="dk-topbar">
            <div className="dk-brand">
              <div className="dk-logo">D</div>
              <h1>DeskFlow AI <span className="dk-sub">// command deck</span></h1>
            </div>
            <div className="dk-barR">
              <span className="dk-chip dk-mode"><span className="dk-dot" />{modeLabelMap[mode]}</span>
              <button className="dk-chip dk-prov hover:bg-zinc-800/40 transition-colors" onClick={() => setConfiguringFeature('default')}><span className="dk-dot" />{defaultBadge?.label ?? "Claude Sonnet"}</button>
              <span className="dk-chip dk-live"><span className="dk-dot" />{chat.hasProvider ? "Connected" : "Offline"}</span>
            </div>
          </div>

          <div className="dk-subnav">
            <button className={`dk-subtab${tab === "deck" ? " dk-on" : ""}`} onClick={() => setTab("deck")}>
              {"\u25C8"} Command Deck
            </button>
            <button className={`dk-subtab${tab === "digest" ? " dk-on" : ""}`} onClick={() => setTab("digest")}>
              {"\uD83D\uDCF0"} Digest
              {digestTopics.length > 0 ? <span className="dk-subtab-dot" /> : null}
            </button>
          </div>

          {tab === "deck" ? (
            <AiPageDeck
              messages={chat.messages.map((m): import('../components/ai/chat/ChatPanel').ChatMessage => ({
                id: m.id,
                role: m.role,
                content: m.content,
                parsed: m.parsed,
                timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
              }))}
              streaming={chat.streaming}
              thinking={chat.thinking}
              provider={defaultBadge?.label}
              online={chat.hasProvider}
              input={chat.input}
              onInputChange={chat.setInput}
              onSend={(text) => chat.send(text)}
              onStop={chat.stop}
              onReset={chat.reset}
              onCardAction={onCardAction}
              actionResults={actionResults}
              connectorSyncing={connectorSyncing}
              contextWarnings={contextWarnings}
              dismissError={dismissError}
              modeLabel={modeLabelMap[mode]}
              glanceMetrics={glanceMetrics}
              digestSlot={
                <DailyDigestBoard
                  state={digestDataState}
                  topics={digestTopics.slice(0, 2).map(t => ({ topic: t.topic || t.title || '', summary: t.summary || '', sources: t.sources, date: t.date, confidence: t.confidence, source: t.source, stats: t.stats, tags: t.tags, mentions: t.mentions, headline: t.headline }))}
                  generating={digestState === 'loading'}
                  provider={digestBadge?.label}
                  readyToGenerate={digestTopics.length === 0}
                  errorMessage={digestReason || undefined}
                  onRefresh={() => loadDigest(true, true)}
                  onConfigure={() => setConfiguringFeature('researchDigest')}
                  onGenerate={() => loadDigest(true, true)}
                  onDismissError={() => { setDigestState('ready'); setDigestReason(null); }}
                />
              }
              connectorsSlot={
                <ConnectorsPanel
                  state={goalsDataState}
                  connectors={[]}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                  onAdd={() => setShowConnectorSetup(true)}
                  onToast={showToast}
                  onRefresh={loadGoals}
                />
              }
              focusSlot={
                <FocusBoard
                  state={goalsDataState}
                  mode={mode}
                  goals={goals}
                  planGoals={planGoals}
                  suggestions={suggestions}
                  metrics={focusMetrics}
                  reviewSummary={review || undefined}
                  onToggleGoal={handleToggleGoal}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onDismissSuggestion={handleDismissSuggestion}
                  onSuggestGoals={handleSuggest}
                  onSaveReview={handleSaveReview}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                  onConfigure={() => setConfiguringFeature('goalAssistant')}
                  reviewError={reviewError}
                  toggleErrors={toggleErrors}
                  acceptErrors={acceptErrors}
                  onRetryReview={() => { setReviewError(null); handleSaveReview(review || ''); }}
                  onDismissReviewError={() => setReviewError(null)}
                />
              }
              planSlot={
                <PlanBoard
                  state={goalsDataState}
                  goals={longTermGoals}
                  notes={planningNotes}
                  savingNotes={savingNotes}
                  onSaveNotes={handleSaveNotes}
                  onAnalyzeDump={handleAnalyzeDump}
                  onSaveGoals={handleSaveGoals}
                  onToggleGoal={handleToggleLongTermGoal}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                />
              }
              reflectSlot={
                <ReflectFeed
                  state={goalsDataState}
                  days={reflectDays.length ? reflectDays : [{ date: today, goals, reviewSummary: review || undefined }]}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                  dayWindow={dayWindow}
                  onLoadOlder={handleLoadOlder}
                />
              }
            />
          ) : (
            <div className="dk-digestpage">
              <DailyDigestBoard
                state={digestDataState}
                topics={digestTopics.map(t => ({ topic: t.topic || t.title || '', summary: t.summary || '', sources: t.sources, date: t.date, confidence: t.confidence, source: t.source, stats: t.stats, tags: t.tags, mentions: t.mentions, headline: t.headline }))}
                generating={digestState === 'loading'}
                provider={digestBadge?.label}
                readyToGenerate={digestTopics.length === 0}
                errorMessage={digestReason || undefined}
                onRefresh={() => loadDigest(true, true)}
                onConfigure={() => setConfiguringFeature('researchDigest')}
                onGenerate={() => loadDigest(true, true)}
                onDismissError={() => { setDigestState('ready'); setDigestReason(null); }}
              />
            </div>
          )}
        </div>
      </div>
      )}

      <AIFeaturesModal open={showFeatures} onClose={() => setShowFeatures(false)} />
      <ConnectorSetupModal open={showConnectorSetup} onClose={() => setShowConnectorSetup(false)} onCreated={() => setShowConnectorSetup(false)} />

      <AiProviderSelectModal open={configuringFeature === 'researchDigest'} onClose={() => setConfiguringFeature(null)} featureKey="researchDigest" featureLabel="Research Digest" accentColor="from-cyan-500 to-blue-500" providers={aiProviders} currentRouting={aiRouting.researchDigest} onSave={(e) => handleRoutingSave('researchDigest', e)} />
      <AiProviderSelectModal open={configuringFeature === 'goalAssistant'} onClose={() => setConfiguringFeature(null)} featureKey="goalAssistant" featureLabel="Daily Plan" accentColor="from-emerald-500 to-teal-500" providers={aiProviders} currentRouting={aiRouting.goalAssistant} onSave={(e) => handleRoutingSave('goalAssistant', e)} />
      <AiProviderSelectModal open={configuringFeature === 'default'} onClose={() => setConfiguringFeature(null)} featureKey="default" featureLabel="AI Chat" accentColor="from-violet-500 to-purple-500" providers={aiProviders} currentRouting={aiRouting.default} onSave={(e) => handleRoutingSave('default', e)} />

      {/* ADDED — Toast container for transient feedback */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg backdrop-blur-sm transition-all ${
              t.type === 'success' ? 'border-l-[3px] border-emerald-500 bg-emerald-500/10 text-emerald-200' :
              t.type === 'error' ? 'border-l-[3px] border-red-500 bg-red-500/10 text-red-200' :
              'border-l-[3px] border-indigo-500 bg-indigo-500/10 text-indigo-200'
            }`}
            style={{ animation: 'slideIn 0.2s ease-out' }}
          >
            <span className="text-base">{t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
