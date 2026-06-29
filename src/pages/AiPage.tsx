import { useState, useEffect, useCallback, useRef } from 'react';
import { ProviderDiagnostics } from '../components/ProviderDiagnostics';
import { useNavigate } from 'react-router-dom';
import { Target, BookOpen, Settings } from 'lucide-react';
import { TopicDigestCard } from '../components/TopicDigestCard';
import { DailyPlanCard } from '../components/DailyPlanCard';
import { GoalHistoryCard } from '../components/GoalHistoryCard';
import { ContextSummaryCard } from '../components/ContextSummaryCard';
import { MyPlanCard } from '../components/MyPlanCard';
import { LongTermPlanCard } from '../components/LongTermPlanCard';
import { TodayOverviewCard } from '../components/TodayOverviewCard';
import { AiUsageCard } from '../components/AiUsageCard';
import { ProjectStatusCard } from '../components/ProjectStatusCard';
import { useAiPageData } from '../hooks/useAiPageData';
import { parseChecklist } from '../services/planningParser';
import { AiChat } from '../components/AiChat';
import { AIFeaturesModal } from '../components/AIFeaturesModal';
import { AiProviderSelectModal, getProviderBadge } from '../components/AiProviderSelectModal';
import { ConnectorsPanel } from '../components/ConnectorsPanel';
import { ConnectorSetupModal } from '../components/ConnectorSetupModal';
const AI_CHAT_ENABLED = true;

type GoalCategory = 'work' | 'personal' | 'health' | 'learning';
type Mode = 'morning' | 'in-progress' | 'review';

interface GoalTarget {
  type: 'time' | 'completion';
  targetSeconds?: number;
  matchCategory?: string;
  done?: boolean;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  target: GoalTarget;
  period: string;
  status: string;
  date: string;
  source: string;
  links: { label: string; url: string }[];
  progressSeconds?: number;
  createdAt: string;
  completedAt?: string;
}

interface GoalDay {
  date: string;
  goals: Goal[];
  reviewSummary?: string;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function determineMode(goals: Goal[]): Mode {
  if (goals.length === 0) return 'morning';
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 20) return 'review';
  const allDone = goals.every(g => g.status === 'completed' || g.status === 'dismissed');
  if (allDone && goals.length > 0) return 'review';
  return 'in-progress';
}

function getDayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const modeConfig: Record<Mode, { label: string; accent: string; desc: string }> = {
  morning:      { label: 'Morning Planning', accent: 'amber',  desc: 'Set your intentions' },
  'in-progress':{ label: 'In Progress',       accent: 'emerald',desc: 'Working through goals' },
  review:       { label: 'Evening Review',    accent: 'pink',   desc: 'Reflect on your day' },
};

export function AiPage() {
  const today = getToday();
  const dayLabel = getDayLabel();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [review, setReview] = useState<string | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ title: string; category: GoalCategory }>>([]);
  const [planGoals, setPlanGoals] = useState<Array<{ title: string; targetSeconds?: number }>>([]);
  const [showFeatures, setShowFeatures] = useState(false);
  const navigate = useNavigate();

  const [digestTopics, setDigestTopics] = useState<any[]>([]);
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [digestReason, setDigestReason] = useState<string | null>(null);
  const digestPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [aiProviders, setAiProviders] = useState<Array<{ id: string; label: string; models: string[]; enabled: boolean }>>([]);
  const [aiRouting, setAiRouting] = useState<Record<string, { providerId: string; model: string } | null>>({});
  const [configuringFeature, setConfiguringFeature] = useState<'default' | 'researchDigest' | 'goalAssistant' | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [showConnectorSetup, setShowConnectorSetup] = useState(false);

  const [unfinishedCount, setUnfinishedCount] = useState(0);
  const [completedThisWeek, setCompletedThisWeek] = useState(0);

  const { data: aggData, loading: aggLoading } = useAiPageData('dashboardAggregates', () =>
    window.deskflowAPI!.getDashboardAggregates({ period: 'today' })
  );

  const { data: aiData, loading: aiLoading } = useAiPageData('aiUsage', () =>
    window.deskflowAPI!.getAIUsageSummary('day')
  );

  const { data: projects, loading: projectsLoading } = useAiPageData('projects', () =>
    window.deskflowAPI!.getProjects()
  );

  const todayTotalSeconds = aggData?.overview?.totalSeconds ?? 0;
  const todaySessionCount = aggData?.appStats?.reduce((s: number, a: any) => s + (a.sessions || 0), 0) ?? 0;
  const topApp = aggData?.appStats?.[0]?.app ?? undefined;

  const aiTokens = aiData?.totalTokens ?? 0;
  const aiCost = aiData?.totalCost ?? 0;
  const aiToolEntries = aiData?.byTool ? Object.keys(aiData.byTool) : [];
  const aiToolCount = aiToolEntries.length;
  const topTool = aiToolEntries[0];

  const activeProjects = Array.isArray(projects) ? projects.filter((p: any) => !p.deleted_at) : [];
  const projectCount = activeProjects.length;
  const recentProject = activeProjects[0];
  const recentProjectName = recentProject?.name;
  const recentProjectLanguage = recentProject?.primary_language;

  const mode = determineMode(goals);
  const mc = modeConfig[mode];

  // ── Consistent design tokens (Frontend Design / Impeccable skills) ──
  const BTN = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 transition-colors";
  const ACCENT_BAR: Record<string, string> = { pink: "bg-pink-500", emerald: "bg-emerald-500", amber: "bg-amber-500" };
  const ACCENT_PILL: Record<string, string> = {
    pink: "bg-pink-500/10 text-pink-300 ring-pink-500/20",
    emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  };
  const ACCENT_DOT: Record<string, string> = { pink: "bg-pink-400", emerald: "bg-emerald-400", amber: "bg-amber-400" };

  const pill = (accent: string, label: string) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ACCENT_PILL[accent] || ACCENT_PILL.emerald}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_DOT[accent] || ACCENT_DOT.emerald}`} />
      {label}
    </span>
  );

  const sectionHead = (accent: string, title: string, desc: string, right?: any) => (
    <div className="mb-5 flex items-center gap-3">
      <div className={`h-8 w-1 rounded-full ${ACCENT_BAR[accent] || ACCENT_BAR.emerald}`} />
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
      </div>
      {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
    </div>
  );

  const loadGoals = useCallback(async () => {
    setGoalsLoading(true);
    setGoalsError(null);
    try {
      const day: GoalDay = await window.deskflowAPI!.getGoals(today);
      setGoals(day.goals || []);
      setReview(day.reviewSummary || null);
    } catch (err: any) {
      setGoalsError(err.message || 'Failed to load goals');
    }
    setGoalsLoading(false);
  }, [today]);

  const loadDigest = useCallback(async (showLoader = true, force = false) => {
    console.log('[DIGEST-RENDERER] loadDigest called, force=', force, 'showLoader=', showLoader);
    if (showLoader) setDigestLoading(true);
    setDigestError(null);
    try {
      console.log('[DIGEST-RENDERER] Calling getTopicDigest IPC...');
      const r = await window.deskflowAPI!.getTopicDigest(force ? { force: true } : undefined);
      console.log('[DIGEST-RENDERER] IPC returned:', JSON.stringify({ success: r.success, error: r.error, reason: r.reason, topicCount: r.topics?.length, topics: r.topics?.slice(0, 2) }));
      if (r.success) { setDigestTopics(r.topics || []); setDigestReason(r.reason || null); }
      else { setDigestError(r.error || 'Failed to load digests'); setDigestReason(null); }
    } catch (err: any) {
      console.error('[DIGEST-RENDERER] IPC error:', err.message);
      setDigestError(err.message);
    }
    finally { if (showLoader) setDigestLoading(false); }
  }, []);

  const loadContext = useCallback(async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      const result = await window.deskflowAPI!.getGoalsBatch(startStr, endStr);
      if (!result.success) return;
      let completed = 0;
      let unfinished = 0;
      for (const day of result.days) {
        if (day.goals) {
          completed += day.goals.filter((g: any) => g.status === 'completed').length;
          if (day.date === today) {
            unfinished = day.goals.filter((g: any) => g.status !== 'completed' && g.status !== 'dismissed').length;
          }
        }
      }
      setCompletedThisWeek(completed);
      setUnfinishedCount(unfinished);
    } catch {}
  }, [today]);

  useEffect(() => {
    loadGoals();
    loadContext();
    loadPlanGoals();
    const initDigest = async () => {
      const generating = await window.deskflowAPI!.isDigestGenerating();
      if (generating) {
        setDigestLoading(true);
        setDigestTopics([]);
        digestPollRef.current = setInterval(async () => {
          try {
            const r = await window.deskflowAPI!.getTopicDigest();
            if (r.success && r.topics && r.topics.length > 0) {
              setDigestTopics(r.topics);
              setDigestLoading(false);
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
      if (data.success && data.topics) {
        setDigestTopics(data.topics);
        setDigestLoading(false);
      }
    });
    return () => {
      if (digestPollRef.current) { clearInterval(digestPollRef.current); digestPollRef.current = null; }
      cleanup();
    };
  }, [loadGoals, loadDigest, loadContext]);

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

  const loadPlanGoals = useCallback(async () => {
    try {
      const r = await window.deskflowAPI!.readPlanningMd();
      if (r.content) {
        const items = parseChecklist(r.content).filter(i => !i.checked);
        setPlanGoals(items.map(i => ({ title: i.title, targetSeconds: i.targetSeconds })));
      }
    } catch {}
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
        ctx.longtermGoals = longterm.goals
          .filter((g: any) => g.status !== 'completed')
          .map((g: any) => ({ title: g.title, category: g.category }));
      }
      const r = await window.deskflowAPI!.suggestGoals(today, ctx);
      if (r.success && r.suggestions?.length > 0) {
        setSuggestions(r.suggestions);
      }
    } catch {}
    setSuggesting(false);
  }, [today]);

  const handlePlanningSaved = useCallback(() => {
    loadContext();
    loadPlanGoals();
  }, [loadContext, loadPlanGoals]);

  const handleAccept = useCallback(async (suggestion: { title: string; category: GoalCategory }) => {
    setSavingGoal(true);
    try {
      const goal: Goal = {
        id: crypto.randomUUID(),
        title: suggestion.title,
        category: suggestion.category,
        target: { type: 'completion' },
        status: 'pending',
        period: 'daily',
        date: today,
        source: 'ai',
        links: [],
        createdAt: new Date().toISOString(),
      };
      await window.deskflowAPI!.saveGoal(today, goal);
      setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
      await loadGoals();
    } catch {}
    setSavingGoal(false);
  }, [today, loadGoals]);

  const handleDismiss = useCallback((suggestion: { title: string; category: GoalCategory }) => {
    setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
  }, []);

  const handleToggle = useCallback(async (goal: Goal) => {
    setSavingGoal(true);
    try {
      const updated = {
        ...goal,
        status: goal.status === 'completed' ? 'pending' : 'completed',
        completedAt: goal.status === 'completed' ? null : new Date().toISOString(),
      };
      await window.deskflowAPI!.saveGoal(today, updated);
      await loadGoals();
    } catch {}
    setSavingGoal(false);
  }, [today, loadGoals]);

  const handleFeedback = useCallback(async (message: string) => {
    setSavingGoal(true);
    try {
      const r = await window.deskflowAPI!.saveGoalReview(today, message);
      if (r.success) setReview(message);
    } catch {}
    setSavingGoal(false);
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

  const digestBadge = getProviderBadge(aiProviders, aiRouting.researchDigest);
  const goalsBadge = getProviderBadge(aiProviders, aiRouting.goalAssistant);
  const defaultBadge = getProviderBadge(aiProviders, aiRouting.default);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-10">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
              <Target className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-50">AI Assistant</h1>
              <p className="mt-0.5 text-xs text-zinc-500">{dayLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { localStorage.setItem("settings-activeTab", "ai"); navigate("/settings"); }}
              className={BTN}
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>
            <button onClick={() => setShowFeatures(true)} className={BTN}>
              <BookOpen className="h-3.5 w-3.5" />
              Features
            </button>
            {pill(mc.accent, mc.label)}
          </div>
        </header>

        {/* AI Chat */}
        {AI_CHAT_ENABLED && (
          <div
            data-section="ai.chat"
            className="flex h-[520px] min-h-[520px] flex-col overflow-hidden rounded-xl bg-zinc-900/40 ring-1 ring-zinc-800"
          >
            <AiChat onConfigure={() => setConfiguringFeature("default")} providerBadge={defaultBadge} />
          </div>
        )}

        {/* Summary */}
        <section data-section="ai.summary">
          {sectionHead("pink", "Today at a glance", "Your key metrics right now")}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <TodayOverviewCard
            totalSeconds={todayTotalSeconds}
            sessionCount={todaySessionCount}
            topApp={topApp}
            loading={aggLoading}
          />
          <AiUsageCard
            totalTokens={aiTokens}
            totalCost={aiCost}
            toolCount={aiToolCount}
            topTool={topTool}
            loading={aiLoading}
          />
          <ProjectStatusCard
            projectCount={projectCount}
            recentProjectName={recentProjectName}
            recentProjectLanguage={recentProjectLanguage}
            loading={projectsLoading}
          />
          <div data-tutorial="ai.context">
              <ContextSummaryCard unfinishedCount={unfinishedCount} completedThisWeek={completedThisWeek} />
            </div>
          </div>
        </section>

        {/* Connectors */}
        <ConnectorsPanel onSetup={() => setShowConnectorSetup(true)} />

        {/* Focus */}
        <section data-section="ai.focus">
          {sectionHead("pink", "Focus", "What needs your attention today", pill("pink", unfinishedCount > 0 ? `${unfinishedCount} active` : "All clear"))}
          <div data-tutorial="ai.daily-plan">
            <DailyPlanCard
                goals={goals}
                mode={mode}
                suggestions={suggestions}
                planGoals={planGoals}
                review={review}
                loading={goalsLoading}
                suggesting={suggesting}
                saving={savingGoal}
                error={goalsError}
                onToggle={handleToggle}
                onSuggest={handleSuggest}
                onAccept={handleAccept}
                onDismiss={handleDismiss}
                onFeedback={handleFeedback}
                onConfigure={() => setConfiguringFeature('goalAssistant')}
                providerBadge={goalsBadge}
              />
          </div>
        </section>

        {/* Plan */}
        <section data-section="ai.plan">
          {sectionHead("emerald", "Plan", "Your milestones and objectives", pill("emerald", planGoals.length > 0 ? `${planGoals.length} items` : "Up to date"))}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div data-tutorial="ai.my-plan">
              <MyPlanCard onPlanningSaved={handlePlanningSaved} />
            </div>
            <LongTermPlanCard />
          </div>
        </section>

        {showDiag && (
          <section>
            <ProviderDiagnostics />
          </section>
        )}

        {/* Reflect */}
        <section data-section="ai.reflect">
          {sectionHead(
            "amber",
            "Reflect",
            "Patterns and discoveries",
            <>
              {pill("amber", digestTopics.length > 0 ? `${digestTopics.length} topics` : "No insights yet")}
              <button
                onClick={() => setShowDiag(!showDiag)}
                className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400 ring-1 ring-zinc-800 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                title="Provider diagnostics"
              >
                Diag
              </button>
            </>
          )}
          <div className="space-y-4">
            <TopicDigestCard
              topics={digestTopics}
              loading={digestLoading}
              error={digestError || undefined}
              reason={digestReason || undefined}
              onRefresh={() => loadDigest(true, true)}
              onConfigure={() => setConfiguringFeature('researchDigest')}
              providerBadge={digestBadge}
            />
            <div data-tutorial="ai.review">
              <GoalHistoryCard />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex items-center justify-center gap-3 border-t border-zinc-900 pt-6 text-xs text-zinc-500">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-500/60" />
            AI-powered daily planning
          </span>
          <span className="text-zinc-700">·</span>
          <span>{mc.desc}</span>
        </footer>
      </div>

      <AIFeaturesModal open={showFeatures} onClose={() => setShowFeatures(false)} />

      <ConnectorSetupModal
        open={showConnectorSetup}
        onClose={() => setShowConnectorSetup(false)}
        onCreated={() => setShowConnectorSetup(false)}
      />

      <AiProviderSelectModal
        open={configuringFeature === 'researchDigest'}
        onClose={() => setConfiguringFeature(null)}
        featureKey="researchDigest"
        featureLabel="Research Digest"
        accentColor="from-cyan-500 to-blue-500"
        providers={aiProviders}
        currentRouting={aiRouting.researchDigest}
        onSave={(entry) => handleRoutingSave('researchDigest', entry)}
      />

      <AiProviderSelectModal
        open={configuringFeature === 'goalAssistant'}
        onClose={() => setConfiguringFeature(null)}
        featureKey="goalAssistant"
        featureLabel="Daily Plan"
        accentColor="from-emerald-500 to-teal-500"
        providers={aiProviders}
        currentRouting={aiRouting.goalAssistant}
        onSave={(entry) => handleRoutingSave('goalAssistant', entry)}
      />

      <AiProviderSelectModal
        open={configuringFeature === 'default'}
        onClose={() => setConfiguringFeature(null)}
        featureKey="default"
        featureLabel="AI Chat"
        accentColor="from-violet-500 to-purple-500"
        providers={aiProviders}
        currentRouting={aiRouting.default}
        onSave={(entry) => handleRoutingSave('default', entry)}
      />
    </div>
  );
}
