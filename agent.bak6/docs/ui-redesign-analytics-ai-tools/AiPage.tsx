import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, RefreshCw, Brain, Zap, Cloud, Sun, Moon } from 'lucide-react';
import { TopicDigestCard } from '../components/TopicDigestCard';
import { DailyPlanCard } from '../components/DailyPlanCard';
import { GoalHistoryCard } from '../components/GoalHistoryCard';
import { ContextSummaryCard } from '../components/ContextSummaryCard';
import { MyPlanCard } from '../components/MyPlanCard';
import { LongTermPlanCard } from '../components/LongTermPlanCard';
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

function getDayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const modeConfig: Record<Mode, { label: string; icon: any; color: string; desc: string }> = {
  morning: { label: 'Morning Planning', icon: Sun, color: 'from-amber-400/20 to-orange-500/20 border-amber-500/30 text-amber-400', desc: 'Set your intentions' },
  'in-progress': { label: 'Active', icon: Zap, color: 'from-emerald-400/20 to-teal-500/20 border-emerald-500/30 text-emerald-400', desc: 'In the flow' },
  review: { label: 'Evening Review', icon: Moon, color: 'from-violet-400/20 to-fuchsia-500/20 border-violet-500/30 text-violet-400', desc: 'Reflect on your day' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.035 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
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

  const [digestTopics, setDigestTopics] = useState<any[]>([]);
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestError, setDigestError] = useState<string | null>(null);

  const [unfinishedCount, setUnfinishedCount] = useState(0);
  const [completedThisWeek, setCompletedThisWeek] = useState(0);

  const mode = determineMode(goals);
  const ModeIcon = modeConfig[mode].icon;

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

  async function handleSuggest() {
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
  }

  function handlePlanningSaved() {
    loadContext();
    loadPlanGoals();
  }

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

  function handleDismiss(suggestion: { title: string; category: GoalCategory }) {
    setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
  }

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
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/20 ring-1 ring-white/10">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">
              <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">AI Assistant</span>
            </h1>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span>{dayLabel}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>Plan with purpose</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-full bg-gradient-to-r ${modeConfig[mode].color}`}>
            <ModeIcon className="w-3 h-3" />
            {modeConfig[mode].label}
          </span>
        </div>
      </motion.header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        <div className="lg:col-span-2 space-y-5">
          <motion.div variants={itemVariants}>
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
          <motion.div variants={itemVariants}>
            <TopicDigestCard
              topics={digestTopics}
              loading={digestLoading}
              error={digestError || undefined}
              onRefresh={() => loadDigest(true)}
            />
          </motion.div>
        </div>

        <div className="lg:col-span-1 space-y-5">
          <motion.div variants={itemVariants}>
            <MyPlanCard onPlanningSaved={handlePlanningSaved} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <LongTermPlanCard />
          </motion.div>
          <motion.div variants={itemVariants}>
            <GoalHistoryCard />
          </motion.div>
          <motion.div variants={itemVariants}>
            <ContextSummaryCard
              unfinishedCount={unfinishedCount}
              completedThisWeek={completedThisWeek}
            />
          </motion.div>
        </div>
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex items-center justify-center gap-2 text-[10px] text-zinc-700 pt-2"
      >
        <Brain className="w-3 h-3" />
        <span>AI-powered daily planning</span>
        <span className="w-1 h-1 rounded-full bg-zinc-800" />
        <span>Your goals, amplified</span>
      </motion.footer>
    </div>
  );
}
