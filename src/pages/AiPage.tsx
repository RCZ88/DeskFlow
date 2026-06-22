import { useState, useEffect, useCallback } from 'react';
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

  const loadDigest = useCallback(async (showLoader = true) => {
    if (showLoader) setDigestLoading(true);
    setDigestError(null);
    try {
      const r = await window.deskflowAPI!.getTopicDigest();
      if (r.success) { setDigestTopics(r.topics || []); }
      else { setDigestError(r.error || 'Failed to load digests'); }
    } catch (err: any) { setDigestError(err.message); }
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

  useEffect(() => { loadGoals(); loadDigest(); loadContext(); loadPlanGoals(); }, [loadGoals, loadDigest, loadContext]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-10 w-10 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <Target className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">AI Assistant</h1>
              <p className="text-xs text-zinc-500 mt-0.5">{dayLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.setItem('settings-activeTab', 'ai');
                navigate('/settings');
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-800/60 text-zinc-300 ring-1 ring-zinc-700/40 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors"
            >
              <Settings className="w-3 h-3" />
              Settings
            </button>
            <button
              onClick={() => setShowFeatures(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-800/60 text-zinc-300 ring-1 ring-zinc-700/40 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              Features
            </button>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              mc.accent === 'pink' ? 'bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20' :
              mc.accent === 'amber' ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20' :
              'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                mc.accent === 'pink' ? 'bg-pink-400' :
                mc.accent === 'amber' ? 'bg-amber-400' :
                'bg-emerald-400'
              }`} />
              {mc.label}
            </span>
          </div>
        </header>

        {AI_CHAT_ENABLED && (
          <div data-section="ai.chat" className="mb-12 bg-zinc-950/50 border border-zinc-800/40 rounded-2xl flex flex-col h-[520px] min-h-[520px] shadow-sm shadow-zinc-950/50 overflow-hidden">
            <AiChat />
          </div>
        )}

        <div data-section="ai.summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
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
            <ContextSummaryCard
              unfinishedCount={unfinishedCount}
              completedThisWeek={completedThisWeek}
            />
          </div>
        </div>

        <section data-section="ai.focus" className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-pink-500" />
            <div>
              <h2 className="text-sm font-semibold text-white">Focus</h2>
              <p className="text-xs text-zinc-500 mt-0.5">What needs your attention today</p>
            </div>
            <div className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
              {unfinishedCount > 0 ? `${unfinishedCount} active` : 'All clear'}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5">
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
              />
            </div>
          </div>
        </section>

        <section data-section="ai.plan" className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-emerald-500" />
            <div>
              <h2 className="text-sm font-semibold text-white">Plan</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Your milestones and objectives</p>
            </div>
            <div className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {planGoals.length > 0 ? `${planGoals.length} items` : 'Up to date'}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div data-tutorial="ai.my-plan">
              <MyPlanCard onPlanningSaved={handlePlanningSaved} />
            </div>
            <LongTermPlanCard />
          </div>
        </section>

        <section data-section="ai.reflect" className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <div>
              <h2 className="text-sm font-semibold text-white">Reflect</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Patterns and discoveries</p>
            </div>
            <div className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {digestTopics.length > 0 ? `${digestTopics.length} topics` : 'No insights yet'}
            </div>
          </div>
          <div className="space-y-5">
            <TopicDigestCard
              topics={digestTopics}
              loading={digestLoading}
              error={digestError || undefined}
              onRefresh={() => loadDigest(true)}
            />
            <div data-tutorial="ai.review">
              <GoalHistoryCard />
            </div>
          </div>
        </section>

        <footer className="pt-6 border-t border-zinc-800/30">
          <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
              AI-powered daily planning
            </span>
            <span className="text-zinc-700">·</span>
            <span>{mc.desc}</span>
          </div>
        </footer>
      </div>

      <AIFeaturesModal open={showFeatures} onClose={() => setShowFeatures(false)} />
    </div>
  );
}
