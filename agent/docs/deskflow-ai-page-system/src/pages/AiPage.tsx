import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProviderDiagnostics } from '../components/ProviderDiagnostics';
import { useNavigate } from 'react-router-dom';
import { Settings, BookOpen, Sparkles, Bot, Calendar, Brain, Target, Newspaper } from 'lucide-react';
import { FocusBoard } from '../components/ai/focus/FocusBoard';
import { PlanBoard } from '../components/ai/plan/PlanBoard';
import { ReflectFeed } from '../components/ai/reflect/ReflectFeed';
import { SummaryGrid } from '../components/ai/summary/SummaryGrid';
import { parseChecklist } from '../services/planningParser';
import { ChatPanel, type ChatMessage } from '../components/ai/chat/ChatPanel';
import { AIFeaturesModal } from '../components/AIFeaturesModal';
import { AiProviderSelectModal, getProviderBadge } from '../components/AiProviderSelectModal';
import { ConnectorsPanel } from '../components/ai/connectors/ConnectorsPanel';
import { ConnectorSetupModal } from '../components/ConnectorSetupModal';
import { GlassCard, SectionHead, StatusDot, IconButton, MOTION } from '../components/ai';
import { DailyDigestBoard } from '../components/ai/digest/DailyDigestBoard';
import type { DataState, Goal, GoalDay, Mode, LongTermGoal } from '../components/ai/types';
import { useAiChat } from '../hooks/useAiChat';
import type { CardAction } from '../components/ai/chat/parsed';

const AI_CHAT_ENABLED = true;

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

function getDayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const modeConfig: Record<Mode, { label: string; accent: string; desc: string }> = {
  morning:       { label: 'Morning Planning', accent: 'amber',  desc: 'Set your intentions' },
  'in-progress': { label: 'In Progress',       accent: 'emerald',desc: 'Working through goals' },
  review:        { label: 'Evening Review',    accent: 'pink',   desc: 'Reflect on your day' },
};

const ACCENT_PILL: Record<string, string> = {
  pink:    'bg-pink-500/10 text-pink-300 ring-pink-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  amber:   'bg-amber-500/10 text-amber-300 ring-amber-500/20',
  cyan:    'bg-cyan-500/10 text-cyan-300 ring-cyan-500/20',
  violet:  'bg-violet-500/10 text-violet-300 ring-violet-500/20',
};
const ACCENT_DOT: Record<string, string> = {
  pink: 'bg-pink-400', emerald: 'bg-emerald-400', amber: 'bg-amber-400',
  cyan: 'bg-cyan-400', violet: 'bg-violet-400',
};

const STAGGER_VARIANTS = {
  container: { hidden: {}, visible: { transition: { staggerChildren: MOTION.stagger * 1.5 } } },
  block: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: MOTION.slow, ease: MOTION.ease } },
  },
};

function pill(accent: string, label: string) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ACCENT_PILL[accent] || ACCENT_PILL.emerald}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_DOT[accent] || ACCENT_DOT.emerald}`} />
      {label}
    </span>
  );
}

function MobileCollapsible({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: MOTION.normal, ease: MOTION.ease }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function AiPage() {
  const today = getToday();
  const dayLabel = getDayLabel();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [review, setReview] = useState<string | null>(null);
  const [goalsState, setGoalsState] = useState<DataState>('loading');
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [suggestions, setSuggestions] = useState<Goal[]>([]);
  const [planGoals, setPlanGoals] = useState<Goal[]>([]);
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
  const [planningNotes, setPlanningNotes] = useState('');
  const [showFeatures, setShowFeatures] = useState(false);
  const navigate = useNavigate();
  const openSettings = useCallback(() => {
    try { localStorage.setItem('settings-activeTab', 'ai'); } catch {}
    navigate('/settings');
  }, [navigate]);

  const [digestTopics, setDigestTopics] = useState<any[]>([]);
  const [digestState, setDigestState] = useState<DataState>('loading');
  const [digestReason, setDigestReason] = useState<string | null>(null);
  const digestPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [aiProviders, setAiProviders] = useState<Array<{ id: string; label: string; models: string[]; enabled: boolean }>>([]);
  const [aiRouting, setAiRouting] = useState<Record<string, { providerId: string; model: string } | null>>({});
  const [configuringFeature, setConfiguringFeature] = useState<'default' | 'researchDigest' | 'goalAssistant' | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [showConnectorSetup, setShowConnectorSetup] = useState(false);
  const [collapsedMobile, setCollapsedMobile] = useState<Set<string>>(new Set());

  const chat = useAiChat();
  const [actionResults, setActionResults] = useState<Record<string, 'running' | 'done' | 'error'>>({});
  const [connectorSyncing, setConnectorSyncing] = useState<Record<string, true>>({});
  const [reflectDays, setReflectDays] = useState<GoalDay[]>([]);

  const toggleMobile = useCallback((section: string) => {
    setCollapsedMobile(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const unfinishedCount = goals.filter(g => g.status !== 'done' && g.status !== 'missed').length;
  const mode = determineMode(goals);
  const mc = modeConfig[mode];

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
    } catch {}
  }, [today]);

  const loadLongTermGoals = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.getLongtermGoals();
      if (r.success && r.goals) {
        setLongTermGoals(r.goals.map((g: any) => ({ id: g.id, title: g.title, description: g.description, category: g.category, status: g.status === 'completed' ? 'done' : g.status, priority: g.priority || 3 })));
      }
    } catch {}
  }, []);

  const loadReflect = useCallback(async () => {
    try {
      const start = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const r = await window.deskflowAPI!.getGoalsBatch(start, today);
      if (r?.success && Array.isArray(r.days)) {
        setReflectDays(r.days.map((d: any) => ({ date: d.date, goals: d.goals || [], reviewSummary: d.reviewSummary || undefined })));
      }
    } catch {}
  }, [today]);

  useEffect(() => {
    loadGoals();
    loadPlanGoals();
    loadLongTermGoals();
    loadReflect();
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
          } catch {}
        }, 3000);
      } else {
        await loadDigest();
      }
    };
    initDigest();
    const cleanup = window.deskflowAPI!.onDigestGenerationComplete((data: any) => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
      if (data.success && data.topics) { setDigestTopics(data.topics); setDigestState('ready'); }
    });
    return () => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
      cleanup();
    };
  }, [loadGoals, loadDigest]);

  useEffect(() => {
    (async () => {
      try {
        const state = await window.deskflowAPI!.getAiProviders();
        if (state?.providers) {
          setAiProviders(state.providers.map((p: any) => ({ id: p.id, label: p.label, models: p.models || [], enabled: p.enabled })));
          setAiRouting(state.routing || {});
        }
      } catch {}
    })();
  }, []);

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
      }
    } catch {}
    setSuggesting(false);
  }, [today]);

  const handleRoutingSave = useCallback(async (feature: 'default' | 'researchDigest' | 'goalAssistant', entry: { providerId: string; model: string } | null) => {
    try {
      const state = await window.deskflowAPI!.getAiProviders();
      const providers = state?.providers || [];
      const routing = { ...(state?.routing || {}) };
      routing[feature] = entry;
      await window.deskflowAPI!.saveAiProviders({ providers, routing });
      setAiRouting(routing);
    } catch {}
  }, []);

  const handlePlanningSaved = useCallback(() => { loadPlanGoals(); }, [loadPlanGoals]);

  const handleToggleGoal = useCallback(async (goal: Goal) => {
    setSavingGoal(true);
    try {
      await window.deskflowAPI!.saveGoal(today, { ...goal, status: goal.status === 'done' ? 'active' : 'done', completedAt: goal.status === 'done' ? undefined : new Date().toISOString() });
      await loadGoals();
    } catch {}
    setSavingGoal(false);
  }, [today, loadGoals]);

  const handleSaveReview = useCallback(async (msg: string) => {
    setSavingGoal(true);
    try { const r = await window.deskflowAPI!.saveGoalReview(today, msg); if (r.success) setReview(msg); } catch {}
    setSavingGoal(false);
  }, [today]);

  const handleAcceptSuggestion = useCallback(async (goal: Goal) => {
    setSavingGoal(true);
    try {
      await window.deskflowAPI!.saveGoal(today, { id: crypto.randomUUID(), title: goal.title, category: goal.category, target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() });
      setSuggestions(prev => prev.filter(x => x.title !== goal.title));
      await loadGoals();
    } catch {}
    setSavingGoal(false);
  }, [today, loadGoals]);

  const handleDismissSuggestion = useCallback((goal: Goal) => { setSuggestions(prev => prev.filter(x => x.title !== goal.title)); }, []);

  const onCardAction = useCallback(async (action: CardAction) => {
    const api = window.deskflowAPI!;
    switch (action.kind) {
      case 'accept-goal': {
        try {
          await api.saveGoal(today, { id: crypto.randomUUID(), title: action.goal.title, category: (action.goal.category as any) || 'work', target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() });
          await loadGoals();
        } catch {}
        break;
      }
      case 'dismiss-goal':
        break;
      case 'apply-plan': {
        try {
          const goals = action.changes.filter(c => c.action !== 'complete').map(c => ({ title: c.goal.title, category: c.goal.category, priority: c.goal.priority }));
          if (goals.length) await api.saveGoalsBatch(goals as any);
          await loadLongTermGoals();
        } catch {}
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
        } catch {
          setActionResults(prev => ({ ...prev, [label]: 'error' }));
        }
        break;
      }
      case 'submit-form': {
        const summary = Object.entries(action.values).map(([k, v]) => k + ': ' + String(v)).join(', ');
        chat.send(summary);
        break;
      }
      case 'sync-connector': {
        setConnectorSyncing(prev => ({ ...prev, [action.name]: true }));
        try {
          const connectors: any = (api as any).connectors;
          if (connectors?.sync) await connectors.sync(action.id || action.name);
        } catch {}
        setConnectorSyncing(prev => { const n = { ...prev }; delete n[action.name]; return n; });
        break;
      }
      case 'open-url': {
        try { window.open(action.url, '_blank'); } catch {}
        break;
      }
      case 'send-text': {
        chat.send(action.text);
        break;
      }
      case 'retry':
        break;
    }
  }, [today, loadGoals, loadLongTermGoals, loadDigest, chat]);

  const handleSaveNotes = useCallback(async (content: string) => {
    try {
      await window.deskflowAPI!.writePlanningMd({ content });
      setPlanningNotes(content);
    } catch {}
  }, []);

  const handleAnalyzeDump = useCallback(async (text: string): Promise<Partial<LongTermGoal>[]> => {
    try {
      const r: any = await window.deskflowAPI!.parseGoalDump(text);
      const goals = r?.success ? r.goals : Array.isArray(r) ? r : r?.goals;
      if (Array.isArray(goals)) {
        return goals.map((g: any) => ({ title: g.title, description: g.description, category: g.category, priority: g.priority }));
      }
      return [];
    } catch { return []; }
  }, []);

  const handleSaveGoals = useCallback(async (goals: Partial<LongTermGoal>[]) => {
    try {
      await window.deskflowAPI!.saveGoalsBatch(goals as any);
      await loadLongTermGoals();
    } catch {}
  }, [loadLongTermGoals]);

  const digestBadge = getProviderBadge(aiProviders, aiRouting.researchDigest);
  const goalsBadge = getProviderBadge(aiProviders, aiRouting.goalAssistant);
  const defaultBadge = getProviderBadge(aiProviders, aiRouting.default);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-pink-500/20 selection:text-zinc-100 relative">
      <style>{`
        @keyframes aurora {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .ai-aurora {
          background: radial-gradient(125% 125% at 50% 0%, transparent 40%, rgba(236, 72, 153, 0.10) 100%);
          background-size: 200% 200%;
          animation: aurora 18s ease-in-out infinite;
        }
      `}</style>
      <div className="ai-aurora pointer-events-none fixed inset-0 opacity-30" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-8">

        {/* ── Header ── */}
        <header className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 h-16 flex items-center gap-3 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-pink-500/10 ring-1 ring-pink-500/20 grid place-items-center">
              <Bot className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-zinc-100 leading-none">AI Assistant</h1>
              <p className="text-[11px] text-zinc-500 mt-1">{dayLabel}</p>
            </div>
          </div>
          <span className={`ml-2 rounded-full px-2.5 py-1 text-[11px] font-medium ${ACCENT_PILL[mc.accent] || ACCENT_PILL.emerald}`}>
            {mc.label}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <IconButton icon={Settings} label="AI settings" onClick={openSettings} />
            <IconButton icon={BookOpen} label="Features" onClick={() => setShowFeatures(true)} />
          </div>
        </header>

        <motion.div variants={STAGGER_VARIANTS.container} initial="hidden" animate="visible" className="space-y-8">

          {/* ── AI Chat Hero ── */}
          {AI_CHAT_ENABLED && (
            <motion.section variants={STAGGER_VARIANTS.block} data-section="ai.chat">
              <ChatPanel
                messages={chat.messages.map((m): ChatMessage => ({
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
              />
            </motion.section>
          )}

          {/* ── Context rail ── */}
          <motion.section variants={STAGGER_VARIANTS.block} data-section="ai.context">
            <div className="grid xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <SectionHead
                  accent="pink"
                  icon={<Sparkles className="h-4 w-4 text-pink-400" />}
                  title="Today at a glance"
                  desc="Your key metrics right now"
                  collapsible
                  collapsed={collapsedMobile.has('summary')}
                  onToggle={() => toggleMobile('summary')}
                />
                <MobileCollapsible collapsed={collapsedMobile.has('summary')}>
                  <SummaryGrid
                    state={goalsDataState}
                    stats={summaryStats}
                    periodLabel="this week"
                    errorMessage={goalsError || undefined}
                    onRetry={loadGoals}
                  />
                </MobileCollapsible>
              </div>
              <div>
                <ConnectorsPanel
                  state={goalsDataState}
                  connectors={[]}
                  errorMessage={goalsError || undefined}
                  onRetry={loadGoals}
                  onAdd={() => setShowConnectorSetup(true)}
                />
              </div>
            </div>
          </motion.section>

          {/* ── Daily Digest (HERO) ── */}
          <motion.section variants={STAGGER_VARIANTS.block} data-section="ai.digest">
            <DailyDigestBoard
              state={digestDataState}
              topics={digestTopics.map(t => ({ topic: t.topic || t.title || '', summary: t.summary || '', sources: t.sources }))}
              generating={digestState === 'loading'}
              provider={digestBadge?.label}
              readyToGenerate={digestTopics.length === 0}
              onRefresh={() => loadDigest(true, true)}
              onGenerate={() => loadDigest(true, true)}
              onConfigure={() => setConfiguringFeature('researchDigest')}
            />
          </motion.section>

          {/* ── Focus & Plan ── */}
          <motion.section variants={STAGGER_VARIANTS.block} data-section="ai.focus-plan">
            <div className="grid xl:grid-cols-2 gap-6">
              {/* Focus */}
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
              />

              {/* Plan */}
              <PlanBoard
                state={goalsDataState}
                goals={longTermGoals}
                notes={planningNotes}
                savingNotes={savingGoal}
                onSaveNotes={handleSaveNotes}
                onAnalyzeDump={handleAnalyzeDump}
                onSaveGoals={handleSaveGoals}
                onToggleGoal={(g) => console.log('toggle long-term goal', g)}
                errorMessage={goalsError || undefined}
                onRetry={loadGoals}
              />
            </div>
          </motion.section>

          {/* ── Reflect ── */}
          <motion.section variants={STAGGER_VARIANTS.block} data-section="ai.reflect">
            <ReflectFeed
              state={goalsDataState}
              days={reflectDays.length ? reflectDays : [{ date: today, goals, reviewSummary: review || undefined }]}
              errorMessage={goalsError || undefined}
              onRetry={loadGoals}
            />
          </motion.section>

          {/* ── Diagnostics ── */}
          <AnimatePresence>
            {showDiag && (
              <motion.section variants={STAGGER_VARIANTS.block} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <GlassCard>
                  <ProviderDiagnostics />
                </GlassCard>
              </motion.section>
            )}
          </AnimatePresence>

          {/* ── Footer ── */}
          <motion.footer variants={STAGGER_VARIANTS.block} className="flex items-center justify-center gap-3 border-t border-zinc-900 pt-6 text-xs text-zinc-500">
            <StatusDot color="pink" label="AI-powered daily planning" breathe />
            <span className="text-zinc-700">·</span>
            <span>{mc.desc}</span>
          </motion.footer>

        </motion.div>
      </div>

      <AIFeaturesModal open={showFeatures} onClose={() => setShowFeatures(false)} />
      <ConnectorSetupModal open={showConnectorSetup} onClose={() => setShowConnectorSetup(false)} onCreated={() => setShowConnectorSetup(false)} />

      <AiProviderSelectModal open={configuringFeature === 'researchDigest'} onClose={() => setConfiguringFeature(null)} featureKey="researchDigest" featureLabel="Research Digest" accentColor="from-cyan-500 to-blue-500" providers={aiProviders} currentRouting={aiRouting.researchDigest} onSave={(e) => handleRoutingSave('researchDigest', e)} />
      <AiProviderSelectModal open={configuringFeature === 'goalAssistant'} onClose={() => setConfiguringFeature(null)} featureKey="goalAssistant" featureLabel="Daily Plan" accentColor="from-emerald-500 to-teal-500" providers={aiProviders} currentRouting={aiRouting.goalAssistant} onSave={(e) => handleRoutingSave('goalAssistant', e)} />
      <AiProviderSelectModal open={configuringFeature === 'default'} onClose={() => setConfiguringFeature(null)} featureKey="default" featureLabel="AI Chat" accentColor="from-violet-500 to-purple-500" providers={aiProviders} currentRouting={aiRouting.default} onSave={(e) => handleRoutingSave('default', e)} />
    </div>
  );
}
