# Context Bundle — Gold/Goals Tab in Life Page

> This file contains ALL source code the target AI needs. No codebase access required.

---

## 1. LifePage.tsx — Target file for Gold tab insertion

```tsx
// src/features/warmth/LifePage.tsx (full source)
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartHandshake, Images, Target, Calendar, ListChecks, Flame } from 'lucide-react';
import CovenantPage from '../covenant/CovenantPage';
import MemoriesPage from '../memories/MemoriesPage';

const TABS = [
  { key: 'covenant', label: 'Covenant', icon: HeartHandshake, accent: '#e8866b' },
  { key: 'memories', label: 'Memories', icon: Images, accent: '#6fb38f' },
] as const;

type TabKey = typeof TABS[number]['key'];

const crossfade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

const pillTransition = { type: 'spring' as const, stiffness: 400, damping: 32 };

export default function LifePage() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'memories' || tab === 'covenant') return tab as TabKey;
    } catch { /* ignore */ }
    return 'covenant';
  });

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    } catch { /* ignore */ }
  }, [activeTab]);

  const activeConfig = TABS.find(t => t.key === activeTab) || TABS[0];
  const iconWrapStyle = { background: `${activeConfig.accent}22` };
  const iconStyle = { color: activeConfig.accent };

  return (
    <div className="flex flex-col h-full" data-page={activeTab}>
      <div className="sticky top-0 z-30 -mx-5 px-5 bg-zinc-900/20 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center gap-1 py-2">
          <div className="h-9 w-9 rounded-xl grid place-items-center mr-2" style={iconWrapStyle}>
            <activeConfig.icon className="w-5 h-5" style={iconStyle} />
          </div>
          
          <div className="flex gap-1 bg-zinc-800/50 p-0.5 rounded-lg">
            {TABS.map(tab => {
              const pillStyle = { background: `${tab.accent}22`, border: `1px solid ${tab.accent}40` };
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-3 py-1.5 text-xs rounded-md transition-colors min-h-[36px] flex items-center gap-1.5 ${
                    activeTab === tab.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="life-tab-pill"
                      className="absolute inset-0 rounded-md"
                      style={pillStyle}
                      transition={pillTransition}
                    />
                  )}
                  <tab.icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10 font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'covenant' && (
            <motion.div
              key="covenant"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="max-w-3xl mx-auto"
            >
              <CovenantPage embedded />
            </motion.div>
          )}
          {activeTab === 'memories' && (
            <motion.div
              key="memories"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="max-w-4xl mx-auto"
            >
              <MemoriesPage embedded />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

**To add Gold tab:** Insert `{ key: 'gold', label: 'Gold', icon: Target, accent: '#fbbf24' }` into `TABS` array. Add a new conditional render block inside `<AnimatePresence>` for `activeTab === 'gold'`. Import a new `GoldPage` component from `../gold/GoldPage`.

---

## 2. WarmCard.tsx — Reusable card wrapper

```tsx
// src/features/warmth/WarmCard.tsx (full source, 18 lines)
import type { ReactNode } from 'react';

interface WarmCardProps {
  children: ReactNode;
  className?: string;
  ambient?: boolean;
}

export function WarmCard({ children, className = '', ambient }: WarmCardProps) {
  return (
    <div
      className={`relative rounded-xl border border-zinc-800/50 p-4 ${ambient ? 'bg-zinc-900/20' : 'bg-zinc-900/60'} ${className}`}
    >
      {ambient && <div className="warmth-aurora" />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

---

## 3. warmth-tokens.css — Design tokens

```css
/* src/features/warmth/warmth-tokens.css (full source, 109 lines) */
@layer utilities {
  .warmth-serif {
    font-family: "Source Serif 4", Georgia, "Times New Roman", Times, serif;
  }
  .warmth-aurora {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(60% 55% at 70% 0%, rgba(107,179,143,0.15) 0%, transparent 70%),
                radial-gradient(40% 40% at 10% 80%, rgba(232,134,107,0.08) 0%, transparent 60%);
  }
  .warmth-shimmer {
    position: relative;
    overflow: hidden;
  }
  .warmth-shimmer::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, rgba(247, 243, 238, 0.10) 50%, transparent 70%);
    transform: translateX(-100%);
    animation: warmth-shimmer-sweep 2.8s ease-in-out infinite;
  }
  @keyframes warmth-shimmer-sweep {
    100% { transform: translateX(100%); }
  }
}

:root {
  --warmth-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --warmth-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --warmth-dur-fast: 120ms;
  --warmth-dur-base: 220ms;
  --warmth-dur-slow: 420ms;
}

.memory-reel {
  display: flex;
  gap: 14px;
  padding: 20px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  outline: none;
  background:
    repeating-linear-gradient(90deg, #0a0908 0 8px, transparent 8px 34px) top / 100% 12px no-repeat,
    repeating-linear-gradient(90deg, #0a0908 0 8px, transparent 8px 34px) bottom / 100% 12px no-repeat,
    #141210;
  scrollbar-width: thin;
  scrollbar-color: #3f3f46 transparent;
}
.memory-reel::-webkit-scrollbar { height: 6px; }
.memory-reel::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 9999px; }

.reel-frame {
  position: relative;
  flex: 0 0 auto;
  scroll-snap-align: center;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  transform: scale(0.92);
  filter: saturate(0.82) brightness(0.8);
  transition: transform var(--warmth-dur-base) var(--warmth-ease-out),
              filter var(--warmth-dur-base) var(--warmth-ease-out),
              box-shadow var(--warmth-dur-base) var(--warmth-ease-out);
}
.reel-frame img {
  display: block;
  height: 168px;
  width: auto;
  max-width: 260px;
  object-fit: cover;
  border-radius: 8px;
}
.reel-frame.reel-active {
  transform: scale(1);
  filter: none;
  box-shadow: 0 0 44px -10px rgba(111, 179, 143, 0.5);
}
.reel-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.reel-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 8px 8px 6px;
  font-size: 11px;
  color: #fff;
  text-align: left;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent);
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .reel-frame { transition: none; }
  .warmth-shimmer::after { animation: none !important; }
}
```

---

## 4. types.ts — Goal type definitions

```ts
// src/components/dashboard/types.ts (lines 1-97)
export type GoalCategory = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'relationships';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type GoalStatus = 'active' | 'done' | 'archived' | 'failed';
export type GoalSource = 'manual' | 'ai';
export type TargetType = 'time' | 'completion';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type DeadlineStatus = 'pending' | 'completed' | 'overdue';
export type DeadlineCategory = 'academic' | 'work' | 'personal' | 'health';

export type ScheduleCategory = 'class' | 'lab' | 'study' | 'exam' | 'meeting' | 'other';

export interface GoalLink {
  label: string;
  url: string;
}

export interface GoalTarget {
  type: TargetType;
  targetSeconds?: number;
  matchCategory?: string;
  done?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  target: GoalTarget;
  period: GoalPeriod;
  status: GoalStatus;
  date: string; // YYYY-MM-DD
  source: GoalSource;
  links: GoalLink[];
  progressSeconds?: number;
  completedAt?: string;
  parentId?: string;
  streak?: number;
  createdAt: string;
  isHabit?: boolean;
  cadence?: 'daily' | 'weekly';
  weeklyTargetDays?: number[];
  detection?: {
    enabled: boolean;
    mode: 'positive' | 'avoidance';
    keywords: string[];
    minMinutes: number;
  };
  linkedScheduleId?: string;
  journalText?: string;
  slippedCount?: number;
}

export interface LongTermGoal {
  id: string;
  title: string;
  category: GoalCategory;
  description?: string;
  deadline?: string;
  progress?: number;
}
```

---

## 5. GoalCard.tsx — Goal card component

```tsx
// src/components/goals/GoalCard.tsx (full source, 280 lines)
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check, Edit3, Trash2, RefreshCw, Flame, Clock, Target,
  Monitor, AlertCircle, Zap, ArrowRight
} from 'lucide-react';
import { confetti } from '../ui/confetti';
import type { Goal as GoalType } from '../dashboard/types';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  work: { label: 'Work', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  personal: { label: 'Personal', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  health: { label: 'Health', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  learning: { label: 'Learning', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  finance: { label: 'Finance', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  relationships: { label: 'Relationships', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

interface GoalCardProps {
  goal: GoalType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (goal: GoalType) => void;
  longTermGoals?: { id: string; title: string }[];
}

export function GoalCard({ goal, onToggle, onDelete, onEdit, longTermGoals = [] }: GoalCardProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleToggle = () => {
    if (goal.status !== 'done') {
      confetti({ particleCount: 60, spread: 90, startVelocity: 40, colors: ['#8b5cf6', '#a78bfa', '#34d399', '#fbbf24'] });
    }
    onToggle(goal.id);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      onDelete(goal.id);
      setDeleteConfirm(false);
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(prev => prev ? false : prev), 3000);
    }
  };

  const catMeta = CATEGORY_STYLES[goal.category] || CATEGORY_STYLES.work;
  const isTime = goal.target.type === 'time';
  const progress = isTime && goal.target.targetSeconds
    ? Math.min(100, ((goal.progressSeconds || 0) / goal.target.targetSeconds) * 100)
    : goal.target.done ? 100 : 0;

  const parentGoal = goal.parentId ? longTermGoals.find(l => l.id === goal.parentId) : null;

  return (
    <div className="group relative p-4 rounded-xl bg-[rgba(24,24,27,0.55)] backdrop-blur-xl border border-[rgba(63,63,70,0.40)] hover:border-zinc-700/50 transition-all duration-200">
      <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-violet-500/20 via-violet-500/5 to-transparent" />

      <div className="flex items-start gap-3">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleToggle}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200 ${
            goal.status === 'done'
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-zinc-600 hover:border-violet-400/50'
          }`}
          aria-label={goal.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
        >
          {goal.status === 'done' && <Check size={12} className="text-white" strokeWidth={3} />}
        </motion.button>

        <div className="flex-1 min-w-0">
          <div className={`text-[13px] truncate transition-colors ${
            goal.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'
          }`}>{goal.title}</div>

          {goal.description && (
            <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-1">{goal.description}</p>
          )}

          {parentGoal && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowRight size={8} className="text-zinc-600" />
              <span className="text-[10px] text-zinc-500 truncate">Serves: {parentGoal.title}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${catMeta.color}`}>
              {catMeta.label}
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <RefreshCw size={8} />{goal.period}
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Target size={8} />{goal.target.type}
            </span>

            {isTime && goal.target.targetSeconds && (
              <span className="text-[10px] text-zinc-600">
                {formatTime(goal.progressSeconds || 0)} / {formatTime(goal.target.targetSeconds)}
              </span>
            )}

            {goal.detection?.enabled && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                goal.detection.mode === 'avoidance'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                <Monitor size={8} className="inline mr-0.5" />
                auto
              </span>
            )}

            {goal.streak && goal.streak > 1 && (
              <span className="text-[10px] text-amber-500/80 flex items-center gap-0.5">
                <Flame size={8} />{goal.streak}
              </span>
            )}
          </div>

          {isTime && goal.target.targetSeconds && (
            <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          )}

          {goal.detection?.enabled && goal.detection.keywords.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
              <span className="text-[9px] text-zinc-600">Detect:</span>
              {goal.detection.keywords.map((kw, i) => (
                <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-zinc-800/50 text-zinc-500">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {goal.status === 'done' && goal.completedAt && (
            <div className="mt-1 text-[10px] text-emerald-600/80 flex items-center gap-1">
              <Check size={8} /> Completed {new Date(goal.completedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(goal)}
            className="w-7 h-7 rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white flex items-center justify-center transition-colors"
            title="Edit goal"
          >
            <Edit3 size={12} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              deleteConfirm
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-red-500/20 hover:text-red-400'
            }`}
            title={deleteConfirm ? 'Click again to confirm' : 'Delete goal'}
          >
            <Trash2 size={12} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 bg-zinc-800/30 rounded-xl" />
      ))}
    </div>
  );
}

export function GoalEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className="w-14 h-14 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
        <Target size={24} className="text-zinc-600" />
      </div>
      <p className="text-[14px] font-medium text-zinc-400">No goals for this day</p>
      <p className="text-[12px] text-zinc-600 mt-1 max-w-[220px]">
        Add a goal or check another day on the calendar
      </p>
      <button
        onClick={onAdd}
        className="mt-3 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors text-[12px] font-medium"
      >
        Add Goal
      </button>
    </div>
  );
}

export function GoalErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className="w-14 h-14 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
        <AlertCircle size={24} className="text-zinc-600" />
      </div>
      <p className="text-[14px] font-medium text-zinc-400">Could not load goals</p>
      <p className="text-[12px] text-zinc-600 mt-1 max-w-[220px]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 hover:bg-zinc-700/50 hover:text-white transition-colors text-[12px] font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
}
```

---

## 6. CalendarStrip.tsx — Date picker

```tsx
// src/components/goals/CalendarStrip.tsx (full source, 90 lines)
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

function getDaysAround(center: Date, range: number): { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] {
  const days: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = -range; i <= range; i++) {
    const d = new Date(center);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    days.push({
      dateStr,
      dayName: names[d.getDay()],
      dayNum: d.getDate(),
      isToday: isToday(dateStr),
    });
  }
  return days;
}

interface CalendarStripProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  goalDates?: Set<string>;
}

const DAY_RANGE = 14;

export function CalendarStrip({ selectedDate, onDateChange, goalDates }: CalendarStripProps) {
  const centerDate = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);
  const days = useMemo(() => getDaysAround(centerDate, DAY_RANGE), [centerDate]);

  const shiftWeek = (delta: number) => {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + delta * 7);
    onDateChange(formatDate(d));
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => shiftWeek(-1)}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors shrink-0"
        aria-label="Previous week"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex-1 flex gap-1 overflow-x-auto">
        {days.map(({ dateStr, dayName, dayNum, isToday: today }) => {
          const selected = dateStr === selectedDate;
          const hasGoals = goalDates?.has(dateStr);
          return (
            <motion.button
              key={dateStr}
              onClick={() => onDateChange(dateStr)}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-0.5 py-2 px-2.5 rounded-xl min-w-[48px] transition-all duration-200 relative ${
                selected
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                  : today
                    ? 'bg-zinc-800/40 text-zinc-300 border border-zinc-700/30'
                    : 'bg-zinc-900/40 text-zinc-500 border border-transparent hover:bg-zinc-800/30 hover:text-zinc-300'
              }`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider">{dayName}</span>
              <span className={`text-[15px] font-semibold tabular-nums ${selected ? 'text-white' : ''}`}>{dayNum}</span>
              {hasGoals && (
                <div className={`w-1 h-1 rounded-full mt-0.5 ${selected ? 'bg-violet-400' : 'bg-emerald-400/60'}`} />
              )}
              {today && !selected && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400" />
              )}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={() => shiftWeek(1)}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors shrink-0"
        aria-label="Next week"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
```

---

## 7. GoalsPage.tsx — Full CRUD reference (primary source for Gold tab)

```tsx
// src/pages/GoalsPage.tsx (full source, ~680 lines)
// This is the COMPLETE existing goals page. The Gold tab should adapt this logic
// into a component that fits inside LifePage's tab system (no PageShell, no navigate).
//
// KEY PATTERNS TO REUSE:
// - CalendarStrip for date selection
// - GoalCard for individual goals
// - CriteriaBuilder for add/edit forms
// - GoalCardSkeleton, GoalEmptyState, GoalErrorState for loading states
// - state management: goals[], selectedDate, loading, error, isAdding, editingId
// - CRUD: handleAdd, handleToggle, handleDelete, handleUpdate
// - Long-term goals sidebar
// - Review section
// - Reminders section
// - confetti on completion

// Full source already shown above in the raw reads. Key state variables:
const [selectedDate, setSelectedDate] = useState(todayStr());
const [goals, setGoals] = useState<Goal[]>([]);
const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isAdding, setIsAdding] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const [editForm, setEditForm] = useState<Partial<Goal>>({});
const [newCriteria, setNewCriteria] = useState<CriteriaForm>(defaultCriteria);
const [showCompleted, setShowCompleted] = useState(false);

// API calls use window.deskflowAPI:
const api = window.deskflowAPI;
const result = await api.getGoals(date);        // returns { goals: Goal[] }
const result = await api.getLongtermGoals();     // returns { goals: LongTermGoal[] }
await api.saveGoal(date, goal);                  // upsert
await api.deleteGoal(goalId);                    // delete
await api.saveGoalReview(date, reviewSummary);   // save review
const result = await api.getGoalReview(date);    // returns { review: { review_summary } }
await api.saveGoalSuggestion(data);              // AI suggestion
const result = await api.getGoalContext();        // context for AI
```

---

## 8. CriteriaBuilder.tsx — Goal creation/edit form

```tsx
// src/components/goals/CriteriaBuilder.tsx (full source, 250 lines)
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, CheckCircle2, Monitor, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectItem } from '../ui/select';
import type { GoalCategory, GoalTarget, GoalPeriod } from '../dashboard/types';

export interface CriteriaForm {
  title: string;
  description: string;
  category: GoalCategory;
  period: GoalPeriod;
  targetType: GoalTarget['type'];
  targetHours: number;
  targetMinutes: number;
  matchCategory: string;
  detectionEnabled: boolean;
  detectionMode: 'positive' | 'avoidance';
  detectionKeywords: string;
  detectionMinMinutes: number;
  parentId: string;
  links: { label: string; url: string }[];
}

interface CriteriaBuilderProps {
  value: CriteriaForm;
  onChange: (form: CriteriaForm) => void;
  onSave: () => void;
  onCancel: () => void;
  longTermGoals: { id: string; title: string }[];
  isEditing?: boolean;
}

const CATEGORIES: { value: GoalCategory; label: string; color: string }[] = [
  { value: 'work', label: 'Work', color: 'text-pink-400' },
  { value: 'personal', label: 'Personal', color: 'text-violet-400' },
  { value: 'health', label: 'Health', color: 'text-emerald-400' },
  { value: 'learning', label: 'Learning', color: 'text-cyan-400' },
  { value: 'finance', label: 'Finance', color: 'text-amber-400' },
  { value: 'relationships', label: 'Relationships', color: 'text-rose-400' },
];

const APP_CATEGORIES = [
  { value: 'IDE', label: 'IDE / Code Editor' },
  { value: 'AI Tools', label: 'AI Tools' },
  { value: 'Browser', label: 'Browser' },
  { value: 'Productivity', label: 'Productivity' },
  { value: 'Communication', label: 'Communication' },
  { value: 'Design', label: 'Design' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Education', label: 'Education' },
];

export function CriteriaBuilder({ value, onChange, onSave, onCancel, longTermGoals, isEditing }: CriteriaBuilderProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const update = (patch: Partial<CriteriaForm>) => onChange({ ...value, ...patch });
  const targetSeconds = value.targetType === 'time'
    ? (value.targetHours * 3600) + (value.targetMinutes * 60)
    : undefined;

  return (
    <div className="space-y-3">
      <Input
        value={value.title}
        onChange={e => update({ title: e.target.value })}
        onKeyDown={e => e.key === 'Enter' && value.title.trim() && onSave()}
        placeholder="What do you want to achieve?"
        autoFocus
        className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-violet-500/50 text-[13px] h-9"
      />
      <Input
        value={value.description}
        onChange={e => update({ description: e.target.value })}
        placeholder="Add details (optional)"
        className="bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-violet-500/50 text-[13px] h-9"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={value.category} onValueChange={v => update({ category: v as GoalCategory })} className="w-[110px]">
          {CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </Select>
        <Select value={value.period} onValueChange={v => update({ period: v as GoalPeriod })} className="w-[100px]">
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </Select>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={value.targetType} onValueChange={v => update({ targetType: v as GoalTarget['type'] })} className="w-[140px]">
          <SelectItem value="completion">Complete it</SelectItem>
          <SelectItem value="time">Spend time</SelectItem>
        </Select>
        {value.targetType === 'time' && (
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5">
            <Clock size={13} className="text-zinc-500" />
            <Input type="number" min={0} max={23} value={value.targetHours}
              onChange={e => update({ targetHours: parseInt(e.target.value) || 0 })}
              className="w-14 bg-zinc-900/80 border-zinc-700/50 text-[13px] h-8 text-center" />
            <span className="text-[11px] text-zinc-500">h</span>
            <Input type="number" min={0} max={59} value={value.targetMinutes}
              onChange={e => update({ targetMinutes: parseInt(e.target.value) || 0 })}
              className="w-14 bg-zinc-900/80 border-zinc-700/50 text-[13px] h-8 text-center" />
            <span className="text-[11px] text-zinc-500">m</span>
            {targetSeconds && (
              <span className="text-[10px] text-zinc-600 ml-1">
                = {Math.floor(targetSeconds / 3600)}h {Math.floor((targetSeconds % 3600) / 60)}m
              </span>
            )}
          </motion.div>
        )}
      </div>
      {value.targetType === 'time' && (
        <div>
          <label className="text-[11px] text-zinc-500 mb-1 block">Track time spent in category:</label>
          <Select value={value.matchCategory || ''} onValueChange={v => update({ matchCategory: v })} className="w-full">
            <SelectItem value="">Any app (total tracked time)</SelectItem>
            {APP_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </Select>
          <p className="text-[10px] text-zinc-600 mt-1">Auto-track progress from foreground app usage.</p>
        </div>
      )}
      {longTermGoals.length > 0 && (
        <Select value={value.parentId} onValueChange={v => update({ parentId: v })} className="w-full">
          <SelectItem value="">Link to long-term goal (optional)</SelectItem>
          {longTermGoals.map(ltg => (
            <SelectItem key={ltg.id} value={ltg.id}>{ltg.title}</SelectItem>
          ))}
        </Select>
      )}
      <button onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
        {showAdvanced ? '−' : '+'} Advanced: Detection & Criteria
      </button>
      <AnimatePresence>
        {showAdvanced && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/40">
            <div className="flex items-center gap-2">
              <Monitor size={13} className="text-zinc-500" />
              <label className="flex items-center gap-2 text-[12px] text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={value.detectionEnabled}
                  onChange={e => update({ detectionEnabled: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-violet-500" />
                Auto-detect completion from app usage
              </label>
            </div>
            {value.detectionEnabled && (
              <>
                <div className="flex gap-2">
                  {(['positive', 'avoidance'] as const).map(m => (
                    <button key={m} onClick={() => update({ detectionMode: m })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        value.detectionMode === m
                          ? m === 'positive' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-zinc-900/60 text-zinc-500 border-zinc-700/50'
                      }`}>
                      {m === 'positive' ? 'Positive (accumulate)' : 'Avoidance (flag)'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 mb-1 block">
                    <Search size={11} className="inline mr-1" />
                    App/window title keywords (comma-separated):
                  </label>
                  <Input value={value.detectionKeywords}
                    onChange={e => update({ detectionKeywords: e.target.value })}
                    placeholder="e.g. VS Code, Duolingo, Figma"
                    className="bg-zinc-900/80 border-zinc-700/50 text-[13px] h-8" />
                </div>
                {value.detectionMode === 'positive' && (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    Mark complete after
                    <Input type="number" min={1} value={value.detectionMinMinutes}
                      onChange={e => update({ detectionMinMinutes: parseInt(e.target.value) || 1 })}
                      className="w-14 bg-zinc-900/80 border-zinc-700/50 text-[13px] h-7 text-center" />
                    minutes detected
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={onSave} disabled={!value.title.trim()}
          className="px-4 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-medium transition-colors">
          <CheckCircle2 size={12} className="inline mr-1" />
          {isEditing ? 'Save Changes' : 'Add Goal'}
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-[12px] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
```

---

## 9. useFocusGoals.ts — Focus session goal tracking

```ts
// src/hooks/useFocusGoals.ts (full source, 154 lines)
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Goal } from '../services/GoalStore'

interface FocusState {
  isActive: boolean
  isBroken: boolean
  allowedCategories: string[]
  sessionId?: string
}

interface FocusGoalProgress {
  goalId: string
  accumulatedSeconds: number
  lastTickAt: number
}

const TICK_MS = 1000
const POLL_MS = 2000

export function useFocusGoals(goals: Goal[]) {
  const [focusState, setFocusState] = useState<FocusState | null>(null)
  const [activeGoalIds, setActiveGoalIds] = useState<string[]>([])
  const progressRef = useRef<Record<string, FocusGoalProgress>>({})
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const goalsRef = useRef(goals)
  goalsRef.current = goals

  const timeBasedGoals = goals.filter(g => g.target?.type === 'time' && g.target?.matchCategory)

  const persistProgress = useCallback(async () => {
    const api = (window as any).deskflowAPI
    if (!api?.['save-goal']) return
    for (const [id, prog] of Object.entries(progressRef.current)) {
      if (prog.accumulatedSeconds < 1) continue
      const goal = goalsRef.current.find(g => g.id === id)
      if (!goal) continue
      const newProgress = (goal.progressSeconds || 0) + Math.floor(prog.accumulatedSeconds)
      const targetSec = goal.target?.targetSeconds || 3600
      try {
        await api['save-goal'](goal.date, {
          ...goal,
          progressSeconds: Math.min(newProgress, targetSec),
          status: newProgress >= targetSec ? 'completed' : goal.status,
        })
      } catch (e) {
        console.error('Failed to persist goal progress:', e)
      }
    }
    progressRef.current = {}
  }, [])

  useEffect(() => {
    const api = (window as any).deskflowAPI
    if (!api?.focus?.getState) return
    let wasActive = false
    const checkState = async () => {
      try {
        const state = await api.focus.getState()
        if (!state) {
          if (wasActive && Object.keys(progressRef.current).length > 0) await persistProgress()
          wasActive = false
          setFocusState(null)
          return
        }
        const newState: FocusState = {
          isActive: state.outcome === 'active',
          isBroken: state.outcome === 'failed' || !!state.broke_on_type,
          allowedCategories: state.allowed_json
            ? (() => { try { return JSON.parse(state.allowed_json).categories || [] } catch { return [] } })()
            : [],
          sessionId: String(state.id),
        }
        if (wasActive && !newState.isActive) await persistProgress()
        wasActive = newState.isActive
        setFocusState(newState)
      } catch { /* silently fail */ }
    }
    checkState()
    pollRef.current = setInterval(checkState, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [persistProgress])

  useEffect(() => {
    if (!focusState?.isActive || focusState.isBroken) { setActiveGoalIds([]); return }
    const allowed = focusState.allowedCategories.map((c: string) => c.toLowerCase())
    const matched = timeBasedGoals
      .filter(g => allowed.includes((g.target?.matchCategory || '').toLowerCase()))
      .map(g => g.id)
    setActiveGoalIds(matched)
    for (const id of matched) {
      if (!progressRef.current[id]) {
        progressRef.current[id] = { goalId: id, accumulatedSeconds: 0, lastTickAt: Date.now() }
      }
    }
  }, [focusState, timeBasedGoals])

  useEffect(() => {
    if (activeGoalIds.length === 0 || focusState?.isBroken) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      return
    }
    tickRef.current = setInterval(() => {
      const now = Date.now()
      for (const id of activeGoalIds) {
        const prog = progressRef.current[id]
        if (prog) { prog.accumulatedSeconds += TICK_MS / 1000; prog.lastTickAt = now }
      }
    }, TICK_MS)
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null } }
  }, [activeGoalIds, focusState?.isBroken])

  useEffect(() => {
    return () => { if (Object.keys(progressRef.current).length > 0) persistProgress() }
  }, [persistProgress])

  const getAccumulatedSeconds = useCallback((goalId: string): number => {
    return Math.floor(progressRef.current[goalId]?.accumulatedSeconds || 0)
  }, [])

  return { focusState, activeGoalIds, getAccumulatedSeconds, persistProgress }
}
```

---

## 10. goals table DDL (main.ts lines 2744-2780)

```sql
-- Goals table (AI goal tracking)
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'work',
  target_type TEXT NOT NULL DEFAULT 'time',
  target_seconds INTEGER,
  match_category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  period TEXT NOT NULL DEFAULT 'daily',
  source TEXT NOT NULL DEFAULT 'manual',
  links TEXT DEFAULT '[]',
  progress_seconds INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_goals_date ON goals(date);

-- ALTER TABLE additions:
ALTER TABLE goals ADD COLUMN priority INTEGER DEFAULT 0;
ALTER TABLE goals ADD COLUMN parent_id TEXT;
ALTER TABLE goals ADD COLUMN is_habit INTEGER DEFAULT 0;
ALTER TABLE goals ADD COLUMN cadence TEXT; -- 'daily' | 'weekly'
ALTER TABLE goals ADD COLUMN weekly_target_days TEXT; -- JSON array of 0-6
ALTER TABLE goals ADD COLUMN detection TEXT; -- JSON detection config
ALTER TABLE goals ADD COLUMN linked_schedule_id TEXT;
ALTER TABLE goals ADD COLUMN notes TEXT;
ALTER TABLE goals ADD COLUMN reminder_time TEXT;
ALTER TABLE goals ADD COLUMN reminder_message TEXT;
ALTER TABLE goals ADD COLUMN streak INTEGER DEFAULT 0;
ALTER TABLE goals ADD COLUMN last_completed_date TEXT;

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  due_date TEXT,
  goal_id TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 11. Goals IPC Handlers (main.ts lines 16121-16563)

```ts
// get-goals — returns goals for a date
ipcMain.handle('get-goals', async (_event, date: string) => {
  const rows = db!.prepare('SELECT * FROM goals WHERE date = ? ORDER BY created_at ASC').all(date) as any[];
  return {
    goals: rows.map(r => ({
      id: r.id, title: r.title, description: r.description, category: r.category,
      target: { type: r.target_type, targetSeconds: r.target_seconds, matchCategory: r.match_category },
      period: r.period, status: r.status, date: r.date, source: r.source,
      links: JSON.parse(r.links || '[]'), progressSeconds: r.progress_seconds,
      createdAt: r.created_at, completedAt: r.completed_at, streak: r.streak || 0,
      isHabit: !!r.is_habit, parentId: r.parent_id,
      detection: r.detection ? JSON.parse(r.detection) : undefined,
    })),
  };
});

// get-goals-batch — returns goals for a date range (calendar view)
ipcMain.handle('get-goals-batch', async (_event, startDate: string, endDate: string) => {
  const rows = db!.prepare('SELECT * FROM goals WHERE date BETWEEN ? AND ? ORDER BY date ASC, created_at ASC')
    .all(startDate, endDate) as any[];
  const days: Record<string, any[]> = {};
  for (const r of rows) {
    if (!days[r.date]) days[r.date] = [];
    days[r.date].push({
      id: r.id, title: r.title, category: r.category,
      target: { type: r.target_type, targetSeconds: r.target_seconds, matchCategory: r.match_category },
      status: r.status, progressSeconds: r.progress_seconds, date: r.date,
    });
  }
  return { days };
});

// save-goal — upsert a goal
ipcMain.handle('save-goal', async (_event, date: string, goal: any) => {
  db!.prepare(`
    INSERT OR REPLACE INTO goals (id, date, title, description, category, target_type, target_seconds,
      match_category, status, period, source, links, progress_seconds, completed_at, priority, parent_id,
      is_habit, cadence, weekly_target_days, detection, linked_schedule_id, notes, reminder_time,
      reminder_message, streak, last_completed_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    goal.id, date, goal.title, goal.description || null,
    goal.category || 'work', goal.target?.type || 'time', goal.target?.targetSeconds || null,
    goal.target?.matchCategory || null, goal.status || 'pending', goal.period || 'daily',
    goal.source || 'manual', JSON.stringify(goal.links || []), goal.progressSeconds || 0,
    goal.completedAt || null, goal.priority || 0, goal.parentId || null,
    goal.isHabit ? 1 : 0, goal.cadence || null, JSON.stringify(goal.weeklyTargetDays || []),
    goal.detection ? JSON.stringify(goal.detection) : null, goal.linkedScheduleId || null,
    goal.notes || null, goal.reminderTime || null, goal.reminderMessage || null,
    goal.streak || 0, goal.lastCompletedDate || null,
  );
  return { success: true };
});

// delete-goal
ipcMain.handle('delete-goal', async (_event, goalId: string) => {
  db!.prepare('DELETE FROM goals WHERE id = ?').run(goalId);
  return { success: true };
});

// get-longterm-goals
ipcMain.handle('get-longterm-goals', async () => {
  const rows = db!.prepare('SELECT * FROM goals WHERE period = ? ORDER BY priority ASC, created_at ASC')
    .all('longterm') as any[];
  return { goals: rows.map(r => ({ ...r, createdAt: r.created_at })) };
});

// save-goal-review / get-goal-review
ipcMain.handle('save-goal-review', async (_event, date: string, summary: string) => {
  db!.prepare('INSERT OR REPLACE INTO goal_reviews (date, summary, created_at) VALUES (?, ?, datetime("now"))')
    .run(date, summary);
  return { success: true };
});
ipcMain.handle('get-goal-review', async (_event, date: string) => {
  const row = db!.prepare('SELECT * FROM goal_reviews WHERE date = ?').get(date) as any;
  return { review: row };
});

// save-goal-suggestion
ipcMain.handle('save-goal-suggestion', async (_event, data: any) => {
  const id = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db!.prepare('INSERT INTO goals (id, date, title, category, status, source, period, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))')
    .run(id, data.date, data.title, data.category || 'work', 'suggested', 'ai', data.period || 'daily');
  return { success: true, goalId: id };
});

// Reminders
ipcMain.handle('create-reminder', async (_event, data: any) => {
  const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db!.prepare('INSERT INTO reminders (id, text, due_date, goal_id, done) VALUES (?, ?, ?, ?, 0)')
    .run(id, data.text, data.dueDate || null, data.goalId || null);
  return { success: true, reminder: { id, text: data.text, dueDate: data.dueDate, goalId: data.goalId, done: false } };
});
ipcMain.handle('get-reminders', async () => {
  const rows = db!.prepare('SELECT * FROM reminders ORDER BY created_at ASC').all() as any[];
  return { reminders: rows.map(r => ({ ...r, done: !!r.done })) };
});
ipcMain.handle('update-reminder', async (_event, id: string, patch: any) => {
  if (patch.done !== undefined) db!.prepare('UPDATE reminders SET done = ? WHERE id = ?').run(patch.done ? 1 : 0, id);
  if (patch.text !== undefined) db!.prepare('UPDATE reminders SET text = ? WHERE id = ?').run(patch.text, id);
  return { success: true };
});
ipcMain.handle('delete-reminder', async (_event, id: string) => {
  db!.prepare('DELETE FROM reminders WHERE id = ?').run(id);
  return { success: true };
});
```

---

## 12. Preload goal/reminder bindings (preload.ts lines 889-930)

```ts
// src/preload.ts (lines 889-930)
getGoals: (date: string) => ipcRenderer.invoke('get-goals', date),
getGoalsBatch: (startDate: string, endDate: string) => ipcRenderer.invoke('get-goals-batch', startDate, endDate),
getLongtermGoals: () => ipcRenderer.invoke('get-longterm-goals'),
saveGoal: (date: string, goal: any) => ipcRenderer.invoke('save-goal', date, goal),
deleteGoal: (goalId: string) => ipcRenderer.invoke('delete-goal', goalId),
saveGoalReview: (date: string, summary: string) => ipcRenderer.invoke('save-goal-review', date, summary),
getGoalReview: (date: string) => ipcRenderer.invoke('get-goal-review', date),
saveGoalSuggestion: (data: any) => ipcRenderer.invoke('save-goal-suggestion', data),
getGoalContext: () => ipcRenderer.invoke('get-goal-context'),
saveGoalsBatch: (goals: any[]) => ipcRenderer.invoke('save-goals-batch', goals),
getDailyGoalProgress: (date: string, goals: any[]) => ipcRenderer.invoke('get-daily-goal-progress', date, goals),

// Reminders
createReminder: (data: any) => ipcRenderer.invoke('create-reminder', data),
getReminders: () => ipcRenderer.invoke('get-reminders'),
updateReminder: (id: string, patch: any) => ipcRenderer.invoke('update-reminder', id, patch),
deleteReminder: (id: string) => ipcRenderer.invoke('delete-reminder', id),
```

---

## 13. confetti utility (imported by GoalCard)

```ts
// src/components/ui/confetti.ts
// Simple confetti burst — particleCount, spread, startVelocity, colors
// Used by GoalCard on toggle
```

---

## 14. Design System Summary

**Warmth Design Tokens:**
- `--warmth-ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
- `--warmth-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`
- `--warmth-dur-fast: 120ms`, `--warmth-dur-base: 220ms`, `--warmth-dur-slow: 420ms`
- `.warmth-serif` — Source Serif 4 font
- `.warmth-aurora` — radial gradient overlay (green + warm tones)
- `.warmth-shimmer` — shimmer sweep animation

**Goal Card Styles:**
- Container: `bg-[rgba(24,24,27,0.55)] backdrop-blur-xl border border-[rgba(63,63,70,0.40)]`
- Top gradient: `bg-gradient-to-r from-violet-500/20 via-violet-500/5 to-transparent`
- Category colors: work=pink, personal=violet, health=emerald, learning=cyan, finance=amber, relationships=rose
- Toggle done: `bg-emerald-500 border-emerald-500`
- Progress bar: `bg-gradient-to-r from-violet-500 to-violet-400`

**CalendarStrip Styles:**
- Selected: `bg-violet-500/15 text-violet-300 border border-violet-500/25`
- Today: `bg-zinc-800/40 text-zinc-300 border border-zinc-700/30`
- Default: `bg-zinc-900/40 text-zinc-500 border border-transparent`

**LifePage Tab Pill:**
- Inactive: `text-zinc-500 hover:text-zinc-300`
- Active pill: `{ background: '${accent}22', border: '1px solid ${accent}40' }`
- Spring transition: `{ type: 'spring', stiffness: 400, damping: 32 }`

---

## 15. IPC Method Summary (for target AI reference)

| Method | Args | Returns |
|--------|------|---------|
| `api.getGoals(date)` | `string` (YYYY-MM-DD) | `{ goals: Goal[] }` |
| `api.getGoalsBatch(start, end)` | `string, string` | `{ days: Record<string, Goal[]> }` |
| `api.getLongtermGoals()` | none | `{ goals: LongTermGoal[] }` |
| `api.saveGoal(date, goal)` | `string, Goal` | `{ success: boolean }` |
| `api.deleteGoal(goalId)` | `string` | `{ success: boolean }` |
| `api.saveGoalReview(date, summary)` | `string, string` | `{ success: boolean }` |
| `api.getGoalReview(date)` | `string` | `{ review: { summary } }` |
| `api.saveGoalSuggestion(data)` | `{ date, title, category }` | `{ success, goalId }` |
| `api.createReminder(data)` | `{ text, dueDate?, goalId? }` | `{ success, reminder }` |
| `api.getReminders()` | none | `{ reminders: Reminder[] }` |
| `api.updateReminder(id, patch)` | `string, object` | `{ success }` |
| `api.deleteReminder(id)` | `string` | `{ success }` |
