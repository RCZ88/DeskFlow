import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, RefreshCw } from 'lucide-react';
import { TopicDigestCard } from '../components/TopicDigestCard';
import { DailyPlanCard } from '../components/DailyPlanCard';
import { GoalHistoryCard } from '../components/GoalHistoryCard';
import { ContextSummaryCard } from '../components/ContextSummaryCard';
import { MyPlanCard } from '../components/MyPlanCard';
import { parseChecklist } from '../services/planningParser';

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

export function AiPage() {
  const today = getToday();

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [review, setReview] = useState<string | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  // Suggestions state
  const [suggestions, setSuggestions] = useState<Array<{ title: string; category: GoalCategory }>>([]);
  const [planGoals, setPlanGoals] = useState<Array<{ title: string; targetSeconds?: number }>>([]);

  // Digest state
  const [digestTopics, setDigestTopics] = useState<any[]>([]);
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestError, setDigestError] = useState<string | null>(null);

  // Context state
  const [unfinishedCount, setUnfinishedCount] = useState(0);
  const [completedThisWeek, setCompletedThisWeek] = useState(0);

  const mode = determineMode(goals);

  // Load goals
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

  // Load digest
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

  // Load context
  const loadContext = useCallback(async () => {
    try {
      const sevenDays: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        sevenDays.push(d.toISOString().slice(0, 10));
      }
      let completed = 0;
      let unfinished = 0;
      for (const date of sevenDays) {
        const day: GoalDay = await window.deskflowAPI!.getGoals(date);
        if (day.goals) {
          completed += day.goals.filter(g => g.status === 'completed').length;
          if (date === today) {
            unfinished = day.goals.filter(g => g.status !== 'completed' && g.status !== 'dismissed').length;
          }
        }
      }
      setCompletedThisWeek(completed);
      setUnfinishedCount(unfinished);
    } catch {}
  }, [today]);

  useEffect(() => { loadGoals(); loadDigest(); loadContext(); loadPlanGoals(); }, [loadGoals, loadDigest, loadContext]);

  async function loadPlanGoals() {
    try {
      const r = await window.deskflowAPI!.readPlanningMd();
      if (r.content) {
        const items = parseChecklist(r.content).filter(i => !i.checked);
        setPlanGoals(items.map(i => ({ title: i.title, targetSeconds: i.targetSeconds })));
      }
    } catch {}
  }

  // Suggest goals (with planning context)
  async function handleSuggest() {
    setSuggesting(true);
    try {
      const [plan, contextStats] = await Promise.all([
        window.deskflowAPI!.readPlanningMd(),
        window.deskflowAPI!.getGoalContext(),
      ]);
      const ctx: Record<string, any> = {};
      if (plan.content) ctx.planningContent = plan.content;
      if (contextStats?.success) ctx.stats = { last7dByCategory: contextStats.last7dByCategory };
      const r = await window.deskflowAPI!.suggestGoals(today, ctx);
      if (r.success && r.suggestions?.length > 0) {
        setSuggestions(r.suggestions);
      }
    } catch {}
    setSuggesting(false);
  }

  function handlePlanningSaved() {
    loadContext();
    loadPlanGoals();
  }

  // Accept suggestion
  async function handleAccept(suggestion: { title: string; category: GoalCategory }) {
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
  }

  // Dismiss suggestion
  function handleDismiss(suggestion: { title: string; category: GoalCategory }) {
    setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
  }

  // Toggle goal completion
  async function handleToggle(goal: Goal) {
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
  }

  // Feedback
  async function handleFeedback(message: string) {
    setSavingGoal(true);
    try {
      const r = await window.deskflowAPI!.saveGoalReview(today, message);
      if (r.success) setReview(message);
    } catch {}
    setSavingGoal(false);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 leading-tight">AI Assistant</h1>
            <p className="text-sm text-zinc-400">Plan with purpose</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {mode === 'review' ? 'Evening Review' : mode === 'morning' ? 'Morning Planning' : 'Active'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
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
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <TopicDigestCard
              topics={digestTopics}
              loading={digestLoading}
              error={digestError || undefined}
              onRefresh={() => loadDigest(true)}
            />
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 space-y-5">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <MyPlanCard onPlanningSaved={handlePlanningSaved} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <GoalHistoryCard />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <ContextSummaryCard
              unfinishedCount={unfinishedCount}
              completedThisWeek={completedThisWeek}
              onRefresh={loadContext}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
