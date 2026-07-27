# CONTEXT_BUNDLE.md — Dashboard Revamp

> **Purpose:** This file provides ALL the source code the target AI needs to design a complete dashboard overhaul. Read this FIRST before designing anything.

---

## 1. Dashboard Layout (DashboardPage.tsx — render section)

The dashboard is a single-column layout with 9 rows. Each row is a component or a grid of components.

### src/pages/DashboardPage.tsx (lines 2387-2530):
```tsx
return (
  <PageShell page="dashboard" variant="dashboard" className="text-white bg-[#0a0a0a]">
    <DotPattern className="fixed inset-0 text-white pointer-events-none" opacity={0.04} gap={20} />
    <div className="relative z-10">
      <div className="mx-auto px-5" style={{ maxWidth: '1400px' }}>

        {/* Row 1: Status Band */}
        <StatusBand
          displayTimeMs={displayTime.ms}
          isCurrentlyProductive={isCurrentlyProductive}
          isDistracting={isDistracting}
          currentAppName={currentApp?.app || currentApp?.title || ''}
          totalFocusedMs={(dashboardData?.overview?.productiveSeconds || 0) * 1000}
        />

        {/* Row 2: Pinned Activities */}
        <PinnedActivities
          pinnedActivities={pinnedActivities}
          setPinnedActivities={setPinnedActivities}
          activities={activities}
          selectedExternalActivity={selectedExternalActivity}
          setSelectedExternalActivity={setSelectedExternalActivity}
          handleSelectExternalActivity={handleSelectExternalActivity}
          externalSessionRunning={externalSessionRunning}
          formatDuration={formatDuration}
          externalElapsedMs={externalElapsedMs}
          handleStartExternalSession={handleStartExternalSession}
          handleStopExternalSession={handleStopExternalSession}
          collapsible
        />

        {/* Row 3: Schedule Hero */}
        <BlurFade delay={0.1} duration={0.4}>
          <div className="mb-4">
            <ScheduleCard />
          </div>
        </BlurFade>

        {/* Row 4: Insight Strip */}
        <BlurFade delay={0.12} duration={0.4}>
          <InsightStrip insights={insights} />
        </BlurFade>

        {/* Row 5: Triple Column — Goals + Deadlines + Focus */}
        <BlurFade delay={0.14} duration={0.4}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <GoalsCard goals={goals} />
            <DeadlinesCard deadlines={deadlines} />
            <QuickFocusCard
              state={deepFocus.state}
              onStart={deepFocus.start}
              onEnd={deepFocus.end}
            />
          </div>
        </BlurFade>

        {/* Row 6: Tier Breakdown Strip */}
        <TierBreakdownStrip
          productiveHours={dashboardData?.overview?.productiveSeconds ? Math.round(dashboardData.overview.productiveSeconds / 3600 * 10) / 10 : 0}
          neutralHours={dashboardData?.overview?.neutralSeconds ? Math.round(dashboardData.overview.neutralSeconds / 3600 * 10) / 10 : 0}
          distractingHours={dashboardData?.overview?.distractingSeconds ? Math.round(dashboardData.overview.distractingSeconds / 3600 * 10) / 10 : 0}
          totalHours={dashboardData?.overview?.totalSeconds ? Math.round(dashboardData.overview.totalSeconds / 3600 * 10) / 10 : 0}
        />

        {/* Row 7: Productivity Chart */}
        <BlurFade delay={0.2} duration={0.4}>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 mb-4">
            <div className="border-t border-emerald-400/30 -mx-5 -mt-5 mb-4" />
            <SectionHeader title="Productivity" icon={<BarChart3 size={14} />} />
            <div className="h-52 mt-2">
              {chartBarsResult.chartBars.length === 0 ? (
                <EmptyState icon={<BarChart3 className="w-8 h-8 opacity-30" />} title="No data yet" description="Start tracking to see productivity" />
              ) : (
                <Bar data={{
                  labels: chartBarsResult.chartBars.map(b => b.label),
                  datasets: [
                    { label: 'Productive', data: chartBarsResult.chartBars.map(b => Math.round(b.productiveSeconds / 3600 * 100) / 100), backgroundColor: '#34d399', borderRadius: 4, borderSkipped: false },
                    { label: 'Other', data: chartBarsResult.chartBars.map(b => Math.round(b.nonProductiveSeconds / 3600 * 100) / 100), backgroundColor: '#fbbf24', borderRadius: 4, borderSkipped: false },
                    { label: 'External', data: chartBarsResult.chartBars.map(b => Math.round(b.externalSeconds / 3600 * 100) / 100), backgroundColor: '#818cf8', borderRadius: 4, borderSkipped: false },
                  ],
                }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181b', titleColor: '#f4f4f5', bodyColor: '#a1a1aa', borderColor: '#27272a', borderWidth: 1, cornerRadius: 8, padding: 10 } },
                  scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#52525b', font: { size: 11 } } }, y: { stacked: true, grid: { color: 'rgba(63,63,70,0.20)' }, ticks: { color: '#52525b', font: { size: 11 } } } },
                }} />
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setExpandedModal('heatmap')}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium text-zinc-400 border border-[#3f3f46] hover:border-pink-500/50 hover:text-pink-400 transition-all duration-200">
                View Heatmap
              </button>
              <button onClick={() => setExpandedModal('solar')}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium text-zinc-400 border border-[#3f3f46] hover:border-indigo-500/50 hover:text-indigo-400 transition-all duration-200">
                View Solar System
              </button>
            </div>
          </div>
        </BlurFade>

        {/* Row 8: Sleep */}
        <SleepBarMini sleepData={sleepData} avgSleep={avgSleep} sleepDebt={sleepDebt} />

        {/* Row 9: Activity Feed */}
        <BlurFade delay={0.35} duration={0.4}>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 mb-4">
            <div className="border-t border-zinc-500/30 -mx-5 -mt-5 mb-4" />
            <SectionHeader title="Recent Sessions" icon={<Clock size={14} />} />
            {/* ... session list items ... */}
          </div>
        </BlurFade>

      </div>
    </div>
  </PageShell>
);
```

---

## 2. StatusBand (Timer Component)

### src/pages/dashboard/StatusBand.tsx (full file — 104 lines):
```tsx
import { motion } from 'framer-motion';
import { MagicCard } from '../../components/ui/magic-card';
import { NumberTicker } from '../../components/ui/number-ticker';
import { BlurFade } from '../../components/ui/blur-fade';
import { Zap, Calendar } from 'lucide-react';

function formatTime(ms: number): string {
  if (!ms || !isFinite(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
}

export function StatusBand({
  displayTimeMs,
  isCurrentlyProductive,
  isDistracting,
  currentAppName,
  totalFocusedMs,
}: StatusBandProps) {
  const isActive = isCurrentlyProductive || isDistracting;
  const totalMinutes = Math.floor(totalFocusedMs / 1000 / 60);

  return (
    <BlurFade delay={0} duration={0.5}>
      <MagicCard
        className="rounded-xl mb-4"
        gradientSize={180}
        gradientColor="#27272a"
        gradientOpacity={0.6}
      >
        <div className="relative p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* LEFT: Timer + Current App */}
          <div className="flex items-center gap-3">
            <motion.div
              className={`w-2 h-2 rounded-full shrink-0 ${
                isCurrentlyProductive ? 'bg-emerald-400' :
                isDistracting ? 'bg-rose-400' :
                'bg-zinc-500'
              }`}
              animate={isActive ? { scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-mono font-semibold tracking-tight ${
                  isDistracting ? 'text-rose-400' :
                  isCurrentlyProductive ? 'text-emerald-400' :
                  'text-zinc-300'
                }`}
              >
                {formatTime(displayTimeMs)}
              </span>
              {currentAppName && (
                <span className="text-[11px] text-zinc-500 hidden sm:inline truncate max-w-[120px]">
                  {currentAppName}
                </span>
              )}
            </div>
          </div>

          {/* CENTER: Time Focused Today */}
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-amber-400" />
            <span className="text-[13px] text-zinc-400">
              <span className="font-mono font-semibold text-zinc-200">
                <NumberTicker value={totalMinutes} suffix="m" delay={300} duration={1200} />
              </span>
              {' '}focused today
            </span>
          </div>

          {/* RIGHT: Current Date */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono tabular-nums">
            <Calendar size={10} className="text-zinc-600" />
            {formatDate()}
          </div>
        </div>
      </MagicCard>
    </BlurFade>
  );
}
```

**PROBLEMS:**
- Timer is only 24px font — too small, not prominent
- When neither productive nor distracting, timer shows `text-zinc-300` (gray) — no color for neutral
- Timer is inside a compact bar, not the hero element
- No ambient glow or visual weight

---

## 3. GoalsCard (Display-only, no add/toggle)

### src/components/dashboard/GoalsCard.tsx (full file — 80 lines):
```tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Check } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { EmptyState } from '../EmptyState';

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  priority?: string;
}

interface GoalsCardProps {
  goals?: Goal[];
  onToggle?: (id: string) => void;
}

export function GoalsCard({ goals = [], onToggle }: GoalsCardProps) {
  return (
    <div className="relative rounded-xl overflow-hidden
      bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
      border border-[rgba(63,63,70,0.50)] p-5
      hover:border-[rgba(82,82,91,0.80)] transition-all duration-250 h-full">
      <div className="absolute top-0 left-4 right-4 h-px
        bg-gradient-to-r from-transparent via-pink-500/40 to-transparent opacity-60 pointer-events-none" />
      <SectionHeader title="Today's Goals" icon={<Target size={14} />} />
      <div className="space-y-1.5 mt-2">
        {goals.slice(0, 5).map((goal, i) => (
          <motion.div key={goal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24 + i * 0.04 }}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-800/30 hover:bg-zinc-900/50 hover:border-zinc-700/40 transition-all duration-200 cursor-pointer group"
            onClick={() => onToggle?.(goal.id)}>
            <motion.div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-200 ${goal.completed ? 'bg-pink-500 border-pink-500' : 'border-zinc-600 group-hover:border-pink-400/50'}`} whileTap={{ scale: 0.9 }}>
              {goal.completed && <Check size={12} className="text-white" strokeWidth={3} />}
            </motion.div>
            <span className={`text-[13px] flex-1 truncate transition-colors ${goal.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
              {goal.title}
            </span>
            {goal.priority === 'high' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">HIGH</span>
            )}
          </motion.div>
        ))}
      </div>
      {goals.length === 0 && (
        <EmptyState icon={<Target size={20} className="text-zinc-600" />} title="All caught up" description="No pending goals for today" />
      )}
    </div>
  );
}
```

**PROBLEMS:**
- `onToggle` prop is defined but NOT passed from DashboardPage (line 2434: `<GoalsCard goals={goals} />` — no onToggle)
- No "Add Goal" button
- No link to manage goals elsewhere
- Display-only, completely non-functional

---

## 4. DeadlinesCard (Display-only, no actions)

### src/components/dashboard/DeadlinesCard.tsx (lines 1-80):
```tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { EmptyState } from '../EmptyState';

interface Deadline {
  id: string;
  title: string;
  due_date: string;
  status?: string;
  course?: string;
  priority?: string;
}

interface DeadlinesCardProps {
  deadlines?: Deadline[];
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function DeadlinesCard({ deadlines = [] }: DeadlinesCardProps) {
  const sorted = [...deadlines]
    .filter(d => d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 4);

  return (
    <div className="relative rounded-xl overflow-hidden
      bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
      border border-[rgba(63,63,70,0.50)] p-5
      hover:border-[rgba(82,82,91,0.80)] transition-all duration-250 h-full">
      <div className="absolute top-0 left-4 right-4 h-px
        bg-gradient-to-r from-transparent via-rose-500/40 to-transparent opacity-60 pointer-events-none" />
      <SectionHeader title="Deadlines" icon={<AlertCircle size={14} />} />
      <div className="space-y-2 mt-2">
        {sorted.map((deadline, i) => {
          const daysLeft = getDaysUntil(deadline.due_date);
          const urgency = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'soon' : 'normal';
          const urgencyStyles = {
            urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            soon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            normal: 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30',
          };
          return (
            <motion.div key={deadline.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.24 + i * 0.04 }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
              <div className="min-w-0">
                <div className="text-[13px] text-zinc-300 truncate">{deadline.title}</div>
                {deadline.course && <div className="text-[11px] text-zinc-600 mt-0.5">{deadline.course}</div>}
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border shrink-0 ml-2 ${urgencyStyles[urgency]}`}>
                <Clock size={11} />
                {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? '1d' : `${daysLeft}d`}
              </div>
            </motion.div>
          );
        })}
      </div>
      {sorted.length === 0 && (
        <EmptyState icon={<CheckCircle2 size={20} className="text-zinc-600" />} title="No upcoming deadlines" description="All clear for now" />
      )}
    </div>
  );
}
```

**PROBLEMS:**
- No "Add Deadline" button
- No link to manage deadlines
- Pure display, no user actions

---

## 5. SleepBarMini (Display-only, no data management)

### src/components/dashboard/SleepBarMini.tsx (full file — 85 lines):
```tsx
import { motion } from 'framer-motion';
import { Moon, BedDouble, Sunrise } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { BlurFade } from '../ui/blur-fade';

interface SleepDay { label: string; hours: number; }

interface SleepBarMiniProps {
  sleepData?: SleepDay[];
  avgSleep?: number;
  sleepDebt?: number;
  avgBedtime?: string;
  avgWakeTime?: string;
}

export function SleepBarMini({ sleepData = [], avgSleep = 0, sleepDebt = 0, avgBedtime, avgWakeTime }: SleepBarMiniProps) {
  const isEmpty = sleepData.length === 0;
  return (
    <BlurFade delay={0.3} duration={0.4}>
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 mb-4">
        <div className="border-t border-indigo-400/30 -mx-5 -mt-5 mb-4" />
        <SectionHeader title="Sleep" icon={<Moon size={14} />} />
        {isEmpty ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-[13px] text-zinc-400">No sleep data yet</p>
            <p className="text-[11px] text-zinc-600 mt-1">Track your first sleep session to see trends</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-20 mt-3">
              {sleepData.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(day.hours / 10) * 100}%` }}
                    transition={{ delay: 0.48 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-full rounded-t-sm min-h-[4px] ${day.hours >= 7 ? 'bg-indigo-400' : 'bg-indigo-400/40'}`} />
                  <span className="text-[10px] text-zinc-600 font-medium">{day.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Avg: <span className="text-zinc-300 font-mono">{avgSleep.toFixed(1)}h</span></span>
              {sleepDebt > 0 && <span className="text-amber-400 font-medium">-{sleepDebt.toFixed(1)}h debt</span>}
            </div>
            {(avgBedtime || avgWakeTime) && (
              <div className="mt-2 pt-2 border-t border-[#27272a] flex items-center gap-4 text-[11px]">
                {avgBedtime && <span className="flex items-center gap-1 text-zinc-500"><BedDouble size={10} className="text-zinc-600" /><span className="text-zinc-300 font-mono">{avgBedtime}</span></span>}
                {avgWakeTime && <span className="flex items-center gap-1 text-zinc-500"><Sunrise size={10} className="text-zinc-600" /><span className="text-zinc-300 font-mono">{avgWakeTime}</span></span>}
              </div>
            )}
          </>
        )}
      </div>
    </BlurFade>
  );
}
```

**PROBLEMS:**
- Sleep data comes from external sessions — no way to add from dashboard
- If data is empty, shows empty state but no actionable CTA
- Sleep tracking is on External page — redundancy

---

## 6. ScheduleCard (Display-only, no add/edit)

### src/pages/dashboard/ScheduleCard.tsx (lines 1-80):
```tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, ChevronRight, ExternalLink } from 'lucide-react';
import { BorderBeam } from '../../components/ui/border-beam';
import { AnimatedGradientText } from '../../components/ui/animated-gradient-text';

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

export function ScheduleCard({ className = '' }: ScheduleCardProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    entries.filter(e => e.day_of_week === today)
      .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time)),
    [entries, today]
  );

  // ... renders current block + upcoming blocks ...
  // Empty state says: "Add classes in Settings → Schedule"
  // Link at bottom: "View full schedule in AI Assistant" → navigates to /ai
}
```

**PROBLEMS:**
- No add/edit/delete from dashboard
- Empty state says "Add classes in Settings" — not intuitive
- Links to `/ai` for full schedule — but AI System page shouldn't own this

---

## 7. QuickFocusCard (Interactive — the one good card)

### src/components/focus/QuickFocusCard.tsx (lines 1-80):
```tsx
import { useState, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Badge } from '../../components/ui/badge';
import { AnimatedCircularProgressBar } from '../../components/ui/animated-circular-progress-bar';
import { Particles } from '../../components/ui/particles';
import { NumberTicker } from '../../components/ui/number-ticker';
import { BorderBeam } from '../../components/ui/border-beam';
import { AuroraText } from '../../components/ui/aurora-text';
import { motion, AnimatePresence } from 'framer-motion';
import { Focus, Play, Square, Clock, Timer } from 'lucide-react';
import { fmtClock } from '../../features/focus/focusHelpers';

type FocusMode = 'timer' | 'stopwatch';
const PRESETS = [{ label: '25m', sec: 25 * 60 }, { label: '50m', sec: 50 * 60 }, { label: '90m', sec: 90 * 60 }];

interface QuickFocusCardProps {
  state: { active: boolean; endsAt: number | null; remainingSec: number; strictness: 'distracting' | 'non_allowed'; paused: boolean; };
  onStart: (durationSec: number, strictness: 'distracting' | 'non_allowed') => void;
  onEnd: () => void;
}

export function QuickFocusCard({ state, onStart, onEnd }: QuickFocusCardProps) {
  // Timer/stopwatch modes, preset selection, circular progress
  // When active: Particles + BorderBeam effects
  // This card IS interactive and works well
}
```

**NOTE:** This is the ONE card that actually works. Keep its functionality but improve its visual design.

---

## 8. TierBreakdownStrip (Display-only)

### src/pages/dashboard/TierBreakdownStrip.tsx (full file — 90 lines):
```tsx
import { motion } from 'framer-motion';
import { CheckCircle2, MinusCircle, XCircle, Clock } from 'lucide-react';
import { BlurFade } from '../../components/ui/blur-fade';
import { NumberTicker } from '../../components/ui/number-ticker';

interface TierBreakdownStripProps {
  productiveHours: number;
  neutralHours: number;
  distractingHours: number;
  totalHours: number;
}

export function TierBreakdownStrip({ productiveHours, neutralHours, distractingHours, totalHours }: TierBreakdownStripProps) {
  const stats = [
    { label: 'Productive', value: productiveHours, color: '#34d399', textColor: 'text-emerald-400', borderColor: 'border-t-emerald-400/30', icon: <CheckCircle2 size={14} /> },
    { label: 'Neutral', value: neutralHours, color: '#fbbf24', textColor: 'text-amber-400', borderColor: 'border-t-amber-400/30', icon: <MinusCircle size={14} /> },
    { label: 'Distracting', value: distractingHours, color: '#f87171', textColor: 'text-red-400', borderColor: 'border-t-red-400/30', icon: <XCircle size={14} /> },
    { label: 'Total', value: totalHours, color: '#ec4899', textColor: 'text-pink-400', borderColor: 'border-t-pink-400/30', icon: <Clock size={14} /> },
  ];

  return (
    <BlurFade delay={0.15} duration={0.4}>
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl mb-4 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`relative p-4 ${i < stats.length - 1 ? 'border-r border-[#27272a]' : ''} ${stat.borderColor} border-t-[1px]`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span style={{ color: stat.color }}>{stat.icon}</span>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-mono font-bold ${stat.textColor}`}>
                  <NumberTicker value={Math.round(stat.value * 10) / 10} decimals={1} delay={400 + i * 100} duration={1200} />
                </span>
                <span className="text-[12px] text-zinc-500">h</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </BlurFade>
  );
}
```

---

## 9. InsightStrip (Display-only)

### src/pages/dashboard/InsightStrip.tsx (full file — 90 lines):
```tsx
import { motion } from 'framer-motion';
import { Sparkles, Target, TrendingUp, Moon, Brain, Zap, Globe } from 'lucide-react';
import { BlurFade } from '../../components/ui/blur-fade';

interface InsightAtom {
  id: string;
  kind: string;
  domain: string;
  value?: number;
  unit?: string;
  copy: { headline: string; subtext: string };
}

const DOMAIN_ACCENT: Record<string, string> = {
  focus: '#f472b6', finance: '#34d399', learn: '#22d3ee',
  sleep: '#818cf8', productivity: '#fbbf24', external: '#38bdf8', app: '#a78bfa',
};

export function InsightStrip({ insights = [] }: InsightStripProps) {
  if (insights.length === 0) return null;
  return (
    <BlurFade delay={0.12} duration={0.4}>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-pink-400" />
          <span className="text-[13px] font-semibold text-zinc-300">AI Insights</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {insights.map((insight, i) => {
            const accent = DOMAIN_ACCENT[insight.domain] || '#a1a1aa';
            return (
              <motion.div key={insight.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.16 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex-shrink-0 w-[280px] bg-[#18181b] border border-[#27272a] rounded-xl p-4 hover:border-[#3f3f46] hover:-translate-y-0.5 transition-all duration-150 overflow-hidden">
                {/* ... renders headline + subtext + domain label ... */}
              </motion.div>
            );
          })}
        </div>
      </div>
    </BlurFade>
  );
}
```

---

## 10. Design System (Current State)

### Colors:
```
Background:     #0a0a0a (page), #18181b (cards), #09090b (deepest)
Card border:    #27272a (default), #3f3f46 (hover)
Primary:        #ec4899 (pink)
Productive:     #34d399 (emerald)
Neutral:        #fbbf24 (amber)
Distracting:    #f87171 (red)
Info:           #22d3ee (cyan)
Sleep:          #818cf8 (indigo)
Focus:          #a78bfa (violet)
```

### Typography:
```
Timer:          24px font-mono font-semibold (too small)
Section title:  13px font-semibold
Card title:     13px/600
Body:           13px/400
Meta:           11px/500
```

### Card Pattern (identical everywhere):
```
bg-[#18181b] border border-[#27272a] rounded-xl p-5
```

### Motion:
```
BlurFade entrance: delay stagger, 0.4s duration
NumberTicker: spring animation, 1200ms
Hover: translateY(-2px), border color shift
```

---

## 11. Available IPC Endpoints

```typescript
// Schedule
window.deskflowAPI.getSchedule() → { entries: ScheduleEntry[] }

// Goals
window.deskflowAPI.getGoals(dateStr) → { goals: Goal[] }

// Deadlines
window.deskflowAPI.getDeadlines() → { deadlines: Deadline[] }

// Dashboard overview
window.deskflowAPI.getDashboardAggregates() → { overview: { productiveSeconds, neutralSeconds, distractingSeconds, totalSeconds } }

// Insights
window.deskflowAPI.getInsightStrip({ period }) → { insights: InsightAtom[] }

// External activities
window.deskflowAPI.getExternalActivities() → ExternalActivity[]

// Sleep data (computed from external sessions with activity='Sleep')
// No dedicated IPC — computed client-side from external sessions
```

---

## 12. What's Missing (Backend Gaps)

| Feature | IPC Exists? | Handler Exists? | Status |
|---------|-------------|-----------------|--------|
| Add Goal from Dashboard | ❌ No IPC for creating goals | ❌ No handler | ⚠️ BACKEND NEEDED |
| Add Schedule from Dashboard | ❌ No IPC for creating schedule entries | ❌ No handler | ⚠️ BACKEND NEEDED |
| Add Deadline from Dashboard | ❌ No IPC for creating deadlines | ❌ No handler | ⚠️ BACKEND NEEDED |
| Toggle Goal from Dashboard | ⚠️ onToggle prop exists but not wired | ❌ Not connected | ⚠️ WIRING NEEDED |
| Calendar View | ❌ No calendar IPC | ❌ No handler | ⚠️ BACKEND NEEDED |

---

*End of Context Bundle*
