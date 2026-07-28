# CONTEXT_BUNDLE.md — Dashboard UI Revamp (COMPLETE)

## Raw Request (Verbatim)
"Okay, we now got to focus on planning those, you know, deadlines and goals and stuff. So what I like to do since you haven't been doing those stuff, and I know it's quite complicated and in fact that we have the AI has been patriotic, its features of automatically adding those. Feel like it is a necessity for us to, you know, just have another AI to be the ones that decide on the features and how the UI will be to, what are the UI's and the necessary for those stuff. I think that's pretty much it. I don't know maybe, how can we improve this system and how we can separate those. I feel like that's a really good thing to discuss too and it's very important for me to be able to discuss those and have it complete. But yeah, I guess how can we make so that we can have those pages for specifically for the schedule? How can we separate the AI system, right? It's not that I want to separate it, it's just that I want the AI to be on some modules. It's supposed to be forwarded entirely, right? The current system is that it is a place where the features are specifically on those specific features and only on the AI system page, but the AI system page has the access to the other page but there's some sort of gap and there's some sort of weird, unfinished logic. There's a logic gap here in which in the designing of the UI and stuff like that, so we need to configure we need to figure those out properly. So it might take a while but I'm willing to spend the time and the event to be discussing and proving the front end of the dashboard whether we should even consider putting those schedules. I mean like the calendars are the most important, right? So yeah, just basically focus on two things which is the UI on the front end and how, yeah, it's just the dashboard for now. Let's just ignore everything. Just how we can add it so that the UI on the dashboard is properly, you can add stuff properly and so that, yeah, I mean, the UI is just improved. Yeah, I want the full improvement of the UI by using all front end skills, properly all front end skills. Generate the problem now, include the front end skills, actual skills, because the edit doesn't have access to the skills, right? So those stuff, okay, now, do that now."

## Core Vision
1. **Dashboard UI improvement** — proper add/edit/delete for goals, deadlines, schedules
2. **AI integration** — AI generates goals from long-term goals, shows parent connection
3. **All frontend skills included** — the other AI doesn't have access to skills, so include them in the prompt
4. **Real MCP components** — use GlareHover, MagicCard, BorderBeam, NumberTicker, etc.
5. **Schedule page** — possibly a dedicated page for schedule management
6. **Logic gap fix** — the AI system page has access to other pages but there's unfinished logic

---

## ACTUAL SOURCE CODE

### File: src/components/dashboard/GoalsCard.tsx (421 lines)
```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Check, Plus, X, Edit3, Trash2, 
  Calendar, Clock, ChevronDown, ChevronUp,
  RefreshCw, Zap, Link as LinkIcon, Sparkles, ArrowRight
} from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectItem } from '../ui/select';
import { confetti } from '../ui/confetti';
import { GlareHover } from '../ui/glare-hover';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { NumberTicker } from '../ui/number-ticker';
import { BorderBeam } from '../ui/border-beam';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  target: {
    type: 'time' | 'completion';
    targetSeconds?: number;
    matchCategory?: string;
    done?: boolean;
  };
  period: string;
  status: string;
  date: string;
  source: string;
  links: Array<{ label: string; url: string }>;
  progressSeconds?: number;
  completedAt?: string;
}

interface GoalsCardProps {
  goals?: Goal[];
  longTermGoals?: Array<{ id: string; title: string; category: string }>;
  onToggle?: (id: string) => void;
  onAdd?: (title: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (goal: Goal) => void;
  onStartFocus?: (goalId: string) => void;
  suggestions?: Goal[];
  onAcceptSuggestion?: (suggestion: Goal) => void;
  onDismissSuggestion?: (id: string) => void;
}

const CATEGORIES = [
  { value: 'work', label: 'Work', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { value: 'personal', label: 'Personal', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { value: 'health', label: 'Health', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'learning', label: 'Learning', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { value: 'finance', label: 'Finance', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'relationships', label: 'Relationships', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function GoalsCard({ 
  goals = [], 
  longTermGoals = [],
  onToggle, 
  onAdd, 
  onDelete, 
  onUpdate, 
  onStartFocus,
  suggestions = [],
  onAcceptSuggestion,
  onDismissSuggestion
}: GoalsCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('work');
  const [editPeriod, setEditPeriod] = useState('daily');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAdd = () => {
    if (newGoalTitle.trim()) {
      const newGoal: Goal = {
        id: Date.now().toString(),
        title: newGoalTitle.trim(),
        category: 'work',
        target: { type: 'completion' },
        period: 'daily',
        status: 'active',
        date: new Date().toISOString().split('T')[0],
        source: 'manual',
        links: [],
      };
      onAdd?.(newGoalTitle.trim());
      setNewGoalTitle('');
      setIsAdding(false);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditCategory(goal.category);
    setEditPeriod(goal.period);
  };

  const handleSaveEdit = () => {
    if (editingGoal && editTitle.trim()) {
      const updatedGoal = {
        ...editingGoal,
        title: editTitle.trim(),
        category: editCategory,
        period: editPeriod,
      };
      onUpdate?.(updatedGoal);
      setEditingGoal(null);
    }
  };

  const handleToggle = (id: string, isCompleted: boolean) => {
    if (!isCompleted) {
      confetti({ particleCount: 50, spread: 80, startVelocity: 35, colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'] });
    }
    onToggle?.(id);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const activeGoals = goals.filter(g => g.status !== 'done');
  const completedGoals = goals.filter(g => g.status === 'done');
  const completionRate = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0;

  return (
    <div className="relative rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5 min-h-[400px]">
      {/* Top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent" />
      
      <div className="flex items-center justify-between mb-4">
        <SectionHeader title="Today's Goals" icon={<Target size={14} />} />
        <div className="flex items-center gap-2">
          {suggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
            >
              <Sparkles size={12} />
              {suggestions.length} suggestions
            </button>
          )}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="w-6 h-6 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            {isAdding ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Add new goal form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <Input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Enter new goal..."
                autoFocus
                className="flex-1 bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-violet-500/50"
              />
              <Button size="sm" onClick={handleAdd} className="bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30">
                Add
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
              <div className="text-[11px] text-violet-400 font-medium mb-2">AI Suggested Goals</div>
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <GlareHover 
                    key={suggestion.id}
                    width="100%" 
                    height="auto"
                    background="rgba(24, 24, 27, 0.5)"
                    color="#8b5cf6"
                    opacity={0.3}
                    angle={-45}
                    duration={600}
                  >
                    <div className="flex items-center justify-between p-2 rounded-md w-full">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-violet-400" />
                        <span className="text-[13px] text-zinc-300">{suggestion.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onAcceptSuggestion?.(suggestion)}
                          className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => onDismissSuggestion?.(suggestion.id)}
                          className="w-6 h-6 rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 flex items-center justify-center transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </GlareHover>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active goals */}
      <div className="flex-1 space-y-2">
        <AnimatePresence>
          {activeGoals.map((goal, i) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="group"
            >
              {editingGoal?.id === goal.id ? (
                /* Edit mode */
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-violet-500/50"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Select value={editCategory} onValueChange={setEditCategory} className="w-[120px]">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </Select>
                    <Select value={editPeriod} onValueChange={setEditPeriod} className="w-[100px]">
                      {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveEdit} className="bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30">
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGoal(null)} className="text-zinc-400 hover:text-white">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display mode with GlareHover */
                <GlareHover
                  width="100%"
                  height="auto"
                  background={goal.status === 'done' ? 'rgba(24, 24, 27, 0.2)' : 'rgba(24, 24, 27, 0.3)'}
                  color="#8b5cf6"
                  opacity={0.2}
                  angle={-45}
                  duration={500}
                  className={`rounded-lg border transition-all duration-200 ${
                    goal.status === 'done' 
                      ? 'border-zinc-800/30 opacity-60' 
                      : 'border-zinc-800/30 hover:border-zinc-700/40'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 p-3 w-full cursor-pointer"
                    onClick={() => handleToggle(goal.id, goal.status === 'done')}
                  >
                    <motion.div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-200 ${
                        goal.status === 'done' 
                          ? 'bg-violet-500 border-violet-500' 
                          : 'border-zinc-600 group-hover:border-violet-400/50'
                      }`}
                      whileTap={{ scale: 0.9 }}
                    >
                      {goal.status === 'done' && <Check size={12} className="text-white" strokeWidth={3} />}
                    </motion.div>
                    
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] truncate transition-colors ${
                        goal.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-300'
                      }`}>
                        {goal.title}
                      </div>
                      {/* Parent long-term goal link */}
                      {goal.parentId && (() => {
                        const parent = longTermGoals.find(ltg => ltg.id === goal.parentId);
                        return parent ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <ArrowRight size={8} className="text-zinc-600" />
                            <span className="text-[10px] text-zinc-600 truncate">
                              Serves: {parent.title}
                            </span>
                          </div>
                        ) : null;
                      })()}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${CATEGORIES.find(c => c.value === goal.category)?.color || 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30'}`}>
                          {goal.category}
                        </Badge>
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                          <RefreshCw size={8} />
                          {goal.period}
                        </span>
                        {goal.progressSeconds && goal.target.targetSeconds && (
                          <span className="text-[10px] text-zinc-600">
                            {formatTime(goal.progressSeconds)} / {formatTime(goal.target.targetSeconds)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onStartFocus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartFocus(goal.id);
                          }}
                          className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                          title="Start focus session"
                        >
                          <Zap size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(goal);
                        }}
                        className="w-6 h-6 rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(goal.id);
                        }}
                        className="w-6 h-6 rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </GlareHover>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {goals.length === 0 && !isAdding && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <Target size={24} className="text-zinc-700 mb-3" />
            <button onClick={() => setIsAdding(true)} className="text-[13px] font-medium text-zinc-400 hover:text-violet-400 transition-colors">
              Add your first goal
            </button>
            <p className="text-[11px] text-zinc-600 mt-1">or let AI suggest some</p>
          </div>
        )}
      </div>

      {/* Completed goals summary */}
      {completedGoals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>{completedGoals.length} completed today</span>
            <span className="text-emerald-400">
              <NumberTicker value={completionRate} suffix="%" delay={200} duration={800} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: src/components/dashboard/DeadlinesCard.tsx (380 lines)
```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, Clock, CheckCircle2, Plus, X, 
  Edit3, Trash2, Calendar, Flag, Tag
} from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectItem } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { format } from 'date-fns';
import { GlareHover } from '../ui/glare-hover';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { NumberTicker } from '../ui/number-ticker';

interface Deadline {
  id: string;
  title: string;
  due_date: string;
  status?: string;
  course?: string;
  priority?: string;
  description?: string;
  category?: string;
  recurrence?: string;
}

interface DeadlinesCardProps {
  deadlines?: Deadline[];
  onAdd?: (title: string, date: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (deadline: Deadline) => void;
  onComplete?: (id: string) => void;
}

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'low', label: 'Low', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
];

const CATEGORIES = [
  { value: 'academic', label: 'Academic' },
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
];

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function DeadlinesCard({ deadlines = [], onAdd, onDelete, onUpdate, onComplete }: DeadlinesCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newPriority, setNewPriority] = useState('medium');
  const [newCategory, setNewCategory] = useState('');

  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editPriority, setEditPriority] = useState('medium');

  const sorted = [...deadlines]
    .filter(d => d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  const handleAdd = () => {
    if (newTitle.trim() && newDate) {
      onAdd?.(newTitle.trim(), newDate.toISOString());
      setNewTitle('');
      setNewDate(undefined);
      setNewPriority('medium');
      setNewCategory('');
      setIsAdding(false);
    }
  };

  const handleEdit = (deadline: Deadline) => {
    setEditingDeadline(deadline);
    setEditTitle(deadline.title);
    setEditDate(new Date(deadline.due_date));
    setEditPriority(deadline.priority || 'medium');
  };

  const handleSaveEdit = () => {
    if (editingDeadline && editTitle.trim() && editDate) {
      const updatedDeadline = {
        ...editingDeadline,
        title: editTitle.trim(),
        due_date: editDate.toISOString(),
        priority: editPriority,
      };
      onUpdate?.(updatedDeadline);
      setEditingDeadline(null);
    }
  };

  const getUrgency = (daysLeft: number) => {
    if (daysLeft <= 0) return 'urgent';
    if (daysLeft <= 2) return 'critical';
    if (daysLeft <= 5) return 'soon';
    return 'normal';
  };

  const urgencyStyles = {
    urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    critical: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    soon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    normal: 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30',
  };

  const priorityStyles = {
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  const urgentCount = sorted.filter(d => getDaysUntil(d.due_date) <= 2).length;

  return (
    <div className="relative rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5 min-h-[400px]">
      {/* Top edge highlight - rose accent for urgency */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rose-500/30 via-rose-500/10 to-transparent" />
      
      <div className="flex items-center justify-between mb-4">
        <SectionHeader title="Deadlines" icon={<AlertCircle size={14} />} />
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-6 h-6 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {/* Add new deadline form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 space-y-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Deadline title..."
                className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-rose-500/50"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-8 px-3 text-xs flex-1 justify-start rounded-md bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-left">
                      {newDate ? format(newDate, 'PPP') : "Pick due date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                    <CalendarComponent
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Select value={newPriority} onValueChange={setNewPriority} className="w-[100px]">
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={newCategory} onValueChange={setNewCategory} className="w-[120px]">
                    <SelectItem value="" disabled>Category</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </Select>
                <Button size="sm" onClick={handleAdd} className="bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30">
                  Add
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deadlines list */}
      <div className="flex-1 space-y-2">
        <AnimatePresence>
          {sorted.map((deadline, i) => {
            const daysLeft = getDaysUntil(deadline.due_date);
            const urgency = getUrgency(daysLeft);

            if (editingDeadline?.id === deadline.id) {
              return (
                <motion.div
                  key={deadline.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 space-y-2"
                >
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-rose-500/50"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="h-8 px-3 text-xs flex-1 justify-start rounded-md bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-left">
                          {editDate ? format(editDate, 'PPP') : "Pick due date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                        <CalendarComponent
                          mode="single"
                          selected={editDate}
                          onSelect={setEditDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Select value={editPriority} onValueChange={setEditPriority} className="w-[100px]">
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveEdit} className="bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30">
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDeadline(null)} className="text-zinc-400 hover:text-white">
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={deadline.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="group"
              >
                <GlareHover
                  width="100%"
                  height="auto"
                  background="rgba(24, 24, 27, 0.3)"
                  color={urgency === 'urgent' ? '#f87171' : urgency === 'critical' ? '#fb923c' : '#fbbf24'}
                  opacity={0.2}
                  angle={-45}
                  duration={500}
                  className="rounded-lg border border-zinc-800/30 hover:border-zinc-700/40 transition-all duration-200"
                >
                  <div className="relative p-3 w-full">
                    {/* Urgency indicator bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ 
                      backgroundColor: urgency === 'urgent' ? '#f87171' : 
                                      urgency === 'critical' ? '#fb923c' :
                                      urgency === 'soon' ? '#fbbf24' : '#6b7280' 
                    }} />
                    
                    <div className="flex items-center justify-between pl-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-zinc-300 truncate">{deadline.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${priorityStyles[deadline.priority as keyof typeof priorityStyles] || priorityStyles.medium}`}>
                            {deadline.priority || 'medium'}
                          </Badge>
                          {deadline.category && (
                            <Badge className="text-[10px] px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 border-zinc-700/30">
                              {deadline.category}
                            </Badge>
                          )}
                          {deadline.course && (
                            <span className="text-[10px] text-zinc-600">
                              {deadline.course}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border shrink-0 ${urgencyStyles[urgency]}`}>
                          <Clock size={11} />
                          {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? '1d' : `${daysLeft}d`}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onComplete?.(deadline.id);
                            }}
                            className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                            title="Complete"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(deadline);
                            }}
                            className="w-6 h-6 rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white flex items-center justify-center transition-colors"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(deadline.id);
                            }}
                            className="w-6 h-6 rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlareHover>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sorted.length === 0 && !isAdding && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <CheckCircle2 size={24} className="text-zinc-700 mb-3" />
            <span className="text-[13px] font-medium text-zinc-500">No upcoming deadlines</span>
            <p className="text-[11px] text-zinc-600 mt-1">Add one to stay on track</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {sorted.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>{sorted.length} upcoming deadlines</span>
            {urgentCount > 0 && (
              <span className="text-rose-400 flex items-center gap-1">
                <Flag size={10} />
                <NumberTicker value={urgentCount} suffix=" urgent" delay={200} duration={800} />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: src/pages/dashboard/ScheduleCard.tsx (447 lines)
```tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, MapPin, ChevronRight, ExternalLink, 
  Plus, X, Edit3, Trash2, Check
} from 'lucide-react';
import { BorderBeam } from '../../components/ui/border-beam';
import { AnimatedGradientText } from '../../components/ui/animated-gradient-text';
import { GlareHover } from '../../components/ui/glare-hover';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select, SelectItem } from '../../components/ui/select';

interface ScheduleEntry {
  id: string;
  title: string;
  location?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  category?: string;
  color?: string;
}

interface ScheduleCardProps {
  className?: string;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getMinutesUntil(timeStr: string): number {
  const now = new Date();
  const target = parseTime(timeStr);
  const current = now.getHours() * 60 + now.getMinutes();
  return target - current;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#22d3ee', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];

export function ScheduleCard({ className = '' }: ScheduleCardProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDay, setFormDay] = useState(new Date().getDay().toString());
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formCategory, setFormCategory] = useState('class');
  const [formColor, setFormColor] = useState('#22d3ee');

  useEffect(() => {
    const load = async () => {
      try {
        const result = await (window as any).deskflowAPI?.getSchedule?.();
        if (result?.entries) setEntries(result.entries);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  const today = new Date().getDay();

  const todayEntries = useMemo(() =>
    entries
      .filter(e => e.day_of_week === today)
      .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time)),
    [entries, today]
  );

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const currentEntry = todayEntries.find(e => {
    const start = parseTime(e.start_time);
    const end = parseTime(e.end_time);
    return nowMinutes >= start && nowMinutes < end;
  });

  const upcomingEntries = todayEntries.filter(e => parseTime(e.start_time) > nowMinutes);

  const dayName = DAYS[today];

  const resetForm = () => {
    setFormTitle('');
    setFormLocation('');
    setFormDay(today.toString());
    setFormStart('09:00');
    setFormEnd('10:00');
    setFormCategory('class');
    setFormColor('#22d3ee');
  };

  const handleAdd = async () => {
    if (!formTitle.trim()) return;
    const entry = {
      title: formTitle.trim(),
      location: formLocation.trim() || undefined,
      day_of_week: parseInt(formDay),
      start_time: formStart,
      end_time: formEnd,
      category: formCategory,
      color: formColor,
    };
    try {
      const result = await (window as any).deskflowAPI?.addScheduleEntry?.(entry);
      if (result?.success && result?.id) {
        setEntries(prev => [...prev, { ...entry, id: result.id }]);
      }
    } catch { /* empty */ }
    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (entry: ScheduleEntry) => {
    setEditingId(entry.id);
    setFormTitle(entry.title);
    setFormLocation(entry.location || '');
    setFormDay(entry.day_of_week.toString());
    setFormStart(entry.start_time);
    setFormEnd(entry.end_time);
    setFormCategory(entry.category || 'class');
    setFormColor(entry.color || '#22d3ee');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !formTitle.trim()) return;
    const patch = {
      title: formTitle.trim(),
      location: formLocation.trim() || undefined,
      day_of_week: parseInt(formDay),
      start_time: formStart,
      end_time: formEnd,
      category: formCategory,
      color: formColor,
    };
    try {
      await (window as any).deskflowAPI?.updateScheduleEntry?.(editingId, patch);
      setEntries(prev => prev.map(e => e.id === editingId ? { ...e, ...patch } : e));
    } catch { /* empty */ }
    resetForm();
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await (window as any).deskflowAPI?.deleteScheduleEntry?.(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch { /* empty */ }
  };

  const startForm = () => {
    resetForm();
    setIsAdding(true);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className={`relative rounded-xl border border-zinc-800/50 bg-zinc-900/60 backdrop-blur-xl p-5 overflow-hidden ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
          <div className="h-3 bg-zinc-800/50 rounded w-1/2" />
          <div className="space-y-2 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-zinc-800/30 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderForm = () => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mb-3 overflow-hidden"
    >
      <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 space-y-2">
        <Input
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          placeholder="Entry title (e.g. Math Class)"
          className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-pink-500/50"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Input
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
            placeholder="Location (optional)"
            className="flex-1 bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-pink-500/50"
          />
          <Select value={formDay} onValueChange={setFormDay} className="w-[100px]">
            {DAYS.map((d, i) => (
              <SelectItem key={i} value={i.toString()}>
                {DAY_SHORT[i]}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1">
            <Input
              type="time"
              value={formStart}
              onChange={(e) => setFormStart(e.target.value)}
              className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-pink-500/50"
            />
            <span className="text-zinc-600 text-xs">to</span>
            <Input
              type="time"
              value={formEnd}
              onChange={(e) => setFormEnd(e.target.value)}
              className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-pink-500/50"
            />
          </div>
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setFormColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${formColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={formCategory} onValueChange={setFormCategory} className="w-[100px]">
            <SelectItem value="class">Class</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
            <SelectItem value="study">Study</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
          </Select>
          <div className="flex-1" />
          <Button size="sm" onClick={editingId ? handleSaveEdit : handleAdd} className="bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30">
            {editingId ? 'Save' : 'Add'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { resetForm(); setIsAdding(false); setEditingId(null); }} className="text-zinc-400 hover:text-white">
            Cancel
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-xl border border-zinc-800/50 bg-zinc-900/60 backdrop-blur-xl p-5 overflow-hidden ${className}`}
    >
      {/* Gradient glow */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ background: 'linear-gradient(135deg, #ec4899, transparent 60%)' }} />
      {/* Top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-pink-500/30 via-pink-500/10 to-transparent" />
      {currentEntry && <BorderBeam size={200} duration={12} colorFrom="#ec4899" colorTo="#f472b6" />}

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
            <Calendar className="w-4.5 h-4.5 text-pink-400" />
          </div>
          <div>
            <AnimatedGradientText className="text-[15px] font-semibold" gradientFrom="#ec4899" gradientTo="#f472b6">
              {dayName}&apos;s Schedule
            </AnimatedGradientText>
            <p className="text-[11px] text-zinc-500">
              {todayEntries.length === 0
                ? 'No classes today'
                : `${todayEntries.length} block${todayEntries.length > 1 ? 's' : ''} scheduled`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={startForm}
            className="w-6 h-6 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            {isAdding ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Add/Edit form */}
      <AnimatePresence>
        {(isAdding || editingId) && renderForm()}
      </AnimatePresence>

      {todayEntries.length === 0 && !isAdding ? (
        /* Empty state */
        <div className="relative flex flex-col items-center text-center py-6">
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-400">Nothing scheduled for today</p>
          <button onClick={startForm} className="text-[11px] text-pink-400 hover:text-pink-300 mt-1 transition-colors">
            Add your first entry
          </button>
        </div>
      ) : (
        <div className="relative space-y-2">
          {/* Current block */}
          <AnimatePresence>
            {currentEntry && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="relative p-3 rounded-lg border border-pink-500/30 bg-pink-500/[0.08] overflow-hidden group"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: currentEntry.color || '#ec4899' }} />
                <div className="flex items-center justify-between pl-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                      <span className="text-sm font-semibold text-zinc-100">{currentEntry.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {formatTime(currentEntry.start_time)} – {formatTime(currentEntry.end_time)}
                      </span>
                      {currentEntry.location && (
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{currentEntry.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-pink-400 font-medium uppercase tracking-wider">Now</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(currentEntry)} className="w-5 h-5 rounded bg-zinc-800/50 text-zinc-400 hover:text-white flex items-center justify-center">
                        <Edit3 size={10} />
                      </button>
                      <button onClick={() => handleDelete(currentEntry.id)} className="w-5 h-5 rounded bg-zinc-800/50 text-zinc-400 hover:text-red-400 flex items-center justify-center">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upcoming blocks */}
          {upcomingEntries.slice(0, 4).map((entry, i) => {
            const minsUntil = getMinutesUntil(entry.start_time);
            return (
              <GlareHover
                key={entry.id}
                width="100%"
                height="auto"
                background="rgba(24, 24, 27, 0.2)"
                color={entry.color || '#6b7280'}
                opacity={0.15}
                angle={-45}
                duration={500}
                className="rounded-lg border border-zinc-800/50 hover:border-zinc-700/40 transition-colors"
              >
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                  className="relative p-3 w-full group"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: entry.color || '#6b7280' }} />
                  <div className="flex items-center justify-between pl-3">
                    <div>
                      <span className="text-sm font-medium text-zinc-200">{entry.title}</span>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                        </span>
                        {entry.location && (
                          <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{entry.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {minsUntil > 0 && minsUntil < 120 && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          in {minsUntil}m
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(entry)} className="w-5 h-5 rounded bg-zinc-800/50 text-zinc-400 hover:text-white flex items-center justify-center">
                          <Edit3 size={10} />
                        </button>
                        <button onClick={() => handleDelete(entry.id)} className="w-5 h-5 rounded bg-zinc-800/50 text-zinc-400 hover:text-red-400 flex items-center justify-center">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </GlareHover>
            );
          })}

          {upcomingEntries.length > 4 && (
            <div className="text-center text-[11px] text-zinc-600 pt-1">
              +{upcomingEntries.length - 4} more
            </div>
          )}

          {/* Link to AI page for full schedule management */}
          <button
            onClick={() => navigate('/ai')}
            className="flex items-center justify-center gap-1.5 w-full pt-2 mt-1 text-[11px] text-zinc-500 hover:text-pink-400 transition-colors duration-150"
          >
            <ExternalLink size={10} />
            View full schedule in AI Assistant
          </button>
        </div>
      )}
    </motion.div>
  );
}
```

### File: src/pages/dashboard/StatusBand.tsx (251 lines)
```tsx
import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'motion/react';
import { BlurFade } from '../../components/ui/blur-fade';
import { NumberTicker } from '../../components/ui/number-ticker';
import { AnimatedShinyText } from '../../components/ui/animated-shiny-text';
import { BorderBeam } from '../../components/ui/border-beam';
import { Zap, Calendar, Play, Pause, Globe, Monitor, Sparkles } from 'lucide-react';

function formatTime(ms: number): string {
  if (!ms || !isFinite(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(): string {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[now.getDay()]} ${monthNames[now.getMonth()]} ${now.getDate()}`;
}

interface StatusBandProps {
  displayTimeMs: number;
  isCurrentlyProductive: boolean;
  isDistracting: boolean;
  currentAppName: string;
  totalFocusedMs: number;
  browserName?: string;
  isInBrowser?: boolean;
  onStartFocus?: () => void;
  isPaused?: boolean;
}

const STATE_COLORS = {
  productive: { 
    text: '#34d399', 
    dot: '#34d399', 
    glow: 'rgba(52, 211, 153, 0.15)',
    gradientFrom: '#34d399',
    gradientTo: '#10b981',
    borderFrom: 'rgba(52, 211, 153, 0.2)',
    borderTo: 'rgba(16, 185, 129, 0.05)',
  },
  neutral: { 
    text: '#22d3ee', 
    dot: '#22d3ee', 
    glow: 'rgba(34, 211, 238, 0.15)',
    gradientFrom: '#22d3ee',
    gradientTo: '#06b6d4',
    borderFrom: 'rgba(34, 211, 238, 0.2)',
    borderTo: 'rgba(6, 182, 212, 0.05)',
  },
  distracting: { 
    text: '#f87171', 
    dot: '#f87171', 
    glow: 'rgba(248, 113, 113, 0.15)',
    gradientFrom: '#f87171',
    gradientTo: '#ef4444',
    borderFrom: 'rgba(248, 113, 113, 0.2)',
    borderTo: 'rgba(239, 68, 68, 0.05)',
  },
};

export function StatusBand({
  displayTimeMs,
  isCurrentlyProductive,
  isDistracting,
  currentAppName,
  totalFocusedMs,
  browserName,
  isInBrowser,
  onStartFocus,
  isPaused,
}: StatusBandProps) {
  const totalMinutes = Math.floor(totalFocusedMs / 1000 / 60);
  const stateKey = isDistracting ? 'distracting' : isCurrentlyProductive ? 'productive' : 'neutral';
  const colors = STATE_COLORS[stateKey];

  // Mouse spotlight effect using motion values (from Magic UI's MagicCard)
  const gradientSize = 250;
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  // Smooth spring for the orb effect
  const orbX = useSpring(mouseX, { stiffness: 250, damping: 30, mass: 0.6 });
  const orbY = useSpring(mouseY, { stiffness: 250, damping: 30, mass: 0.6 });
  const orbVisible = useSpring(0, { stiffness: 300, damping: 35 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  const handlePointerEnter = useCallback(() => {
    orbVisible.set(0.8);
  }, [orbVisible]);

  const handlePointerLeave = useCallback(() => {
    orbVisible.set(0);
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [mouseX, mouseY, orbVisible]);

  return (
    <BlurFade delay={0} duration={0.4}>
      <motion.div
        className="relative w-full rounded-xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/60 p-5 min-h-[120px] overflow-hidden cursor-pointer"
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          background: useMotionTemplate`
            linear-gradient(#18181b 0 0) padding-box,
            radial-gradient(${gradientSize}px circle at ${orbX}px ${orbY}px,
              ${colors.gradientFrom},
              ${colors.gradientTo},
              #27272a 100%
            ) border-box
          `,
        }}
      >
        {/* Mouse-following glow orb */}
        <motion.div
          className="pointer-events-none absolute z-30"
          style={{
            width: 300,
            height: 300,
            x: orbX,
            y: orbY,
            translateX: '-50%',
            translateY: '-50%',
            borderRadius: 9999,
            filter: 'blur(60px)',
            opacity: orbVisible,
            background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})`,
            mixBlendMode: 'screen',
            willChange: 'transform, opacity',
          }}
        />

        {/* Background ambient glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <motion.div
            className="absolute"
            style={{
              width: '600px',
              height: '300px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }}
            animate={{ opacity: [0.6, 0.85, 0.6], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Border beam for active states */}
        {(isCurrentlyProductive || isDistracting) && (
          <BorderBeam 
            size={200} 
            duration={12} 
            colorFrom={colors.gradientFrom} 
            colorTo={colors.gradientTo} 
          />
        )}

        {/* Content Layer */}
        <div className="relative z-40 flex items-center justify-between gap-4 h-full">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {/* Animated dot */}
              <motion.div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colors.dot }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Timer display with animated gradient text */}
              <div className="font-mono font-bold tabular-nums tracking-tight leading-none" style={{ fontSize: '48px' }}>
                <AnimatedShinyText 
                  className="inline-block"
                  style={{ color: colors.text, textShadow: `0 0 24px ${colors.glow}` }}
                >
                  {formatTime(displayTimeMs)}
                </AnimatedShinyText>
              </div>
            </div>
            
            {/* Current app/website display */}
            {currentAppName && (
              <div className="flex items-center gap-2 ml-[22px]">
                {isInBrowser ? (
                  <Globe size={12} className="text-zinc-500 shrink-0" />
                ) : (
                  <Monitor size={12} className="text-zinc-500 shrink-0" />
                )}
                <span className="text-[13px] text-zinc-400 font-medium truncate max-w-[200px]">
                  {currentAppName}
                </span>
                {isInBrowser && browserName && (
                  <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800/50 border border-zinc-700/30">
                    {browserName}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Focus time with number ticker */}
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <span className="text-[13px] text-zinc-400">
                <span className="font-mono font-semibold text-zinc-100">
                  <NumberTicker value={totalMinutes} suffix="m" delay={300} duration={1200} />
                </span>
                {' '}focused
              </span>
            </div>
            
            {/* Date display */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono tabular-nums">
              <Calendar size={10} className="text-zinc-600" />
              {formatDate()}
            </div>

            {/* Focus session CTA */}
            {onStartFocus && !isPaused && (
              <motion.button
                onClick={onStartFocus}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-[11px] font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play size={10} />
                Start Focus
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </BlurFade>
  );
}
```

---

## IPC Endpoints (All Exist and Work)

### Goals
- `getGoals(date)` → `{ goals: Goal[] }`
- `saveGoal(date, goal)` → saves/updates
- `deleteGoal(goalId)` → deletes
- `getLongtermGoals()` → `{ goals: LongTermGoal[] }`
- `suggestGoals(date, ctx)` → AI suggests daily goals

### Deadlines
- `getDeadlines({ days })` → `{ deadlines }`
- `addDeadline(dl)` → `{ success, id }`
- `updateDeadline(id, patch)` → `{ success }`
- `deleteDeadline(id)` → `{ success }`

### Schedule
- `getSchedule()` → `{ entries }`
- `addScheduleEntry(entry)` → `{ success, id }`
- `updateScheduleEntry(id, patch)` → `{ success }`
- `deleteScheduleEntry(id)` → `{ success }`

## Design Tokens
- Background: `#09090b` (zinc-950)
- Surface: `#18181b` (zinc-900)
- Glass: `bg-zinc-900/80 backdrop-blur-xl`
- Rounded: max `rounded-xl` (12px)
- Padding: `p-5` (20px)
