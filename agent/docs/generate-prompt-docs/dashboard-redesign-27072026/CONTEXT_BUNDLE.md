# CONTEXT_BUNDLE.md — Dashboard Redesign

> This bundle contains the actual source code for every file the dashboard redesign touches.
> The target AI MUST use this as its codebase reference. Do NOT invent code shapes — use these exact files.

---

## 1. Current Dashboard Layout (DashboardPage.tsx — render section)

**File:** `src/pages/DashboardPage.tsx` (2716 lines total)

### Lines 1-44: Imports
```tsx
import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { PageShell } from '../components/PageShell';
import { useNavigate } from 'react-router-dom';
import { HeroBand } from './dashboard/HeroBand';
import { SummaryStrip } from './dashboard/SummaryStrip';
import { PinnedActivities } from './dashboard/PinnedActivities';
import { QuickFocusCard } from '../components/focus/QuickFocusCard';
import { GoalRing } from '../components/insights/GoalRing';
import { ScheduleCard } from './dashboard/ScheduleCard';
import { StatusBand } from './dashboard/StatusBand';
import { InsightStrip } from './dashboard/InsightStrip';
import { GoalsCard } from '../components/dashboard/GoalsCard';
import { DeadlinesCard } from '../components/dashboard/DeadlinesCard';
import { TierBreakdownStrip } from './dashboard/TierBreakdownStrip';
import { SleepBarMini } from '../components/dashboard/SleepBarMini';
import { MasteryRingMini } from '../components/dashboard/MasteryRingMini';
import { FollowThroughCard } from '../components/finance/FollowThroughCard';
import { SectionHeader } from '../components/SectionHeader';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { DayDetailPopup } from '../components/DayDetailPopup';
import OrbitSystem from '../components/OrbitSystem';
import { useHomeSummary } from '../hooks/useHomeSummary';
import { useDeepFocus } from '../hooks/useDeepFocus';
import { Bar, Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Dumbbell, Activity, Moon,
  Utensils, Coffee, Bus, Book, Timer, Zap,
  Sun, Zap as ZapIcon, Focus, Clock, X,
  Edit3, Check, Plus, Minus, TrendingUp,
  Target, ZapCircle, RefreshCw, Clock3,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BarChart3
} from 'lucide-react';
import { maxOf, maxBy } from '../utils/safeMath';
import { getDateRange } from '../lib/dateRange';
import type { Period } from '../lib/dateRange';
import { awaitApi } from '../lib/awaitApi';
import { DotPattern } from '../components/ui/dot-pattern';
```

### Lines 2390-2469: Current Row Layout (THE SECTION TO REDESIGN)
```tsx
      <div className="relative z-10">
        <div className="mx-auto px-5" style={{ maxWidth: '1400px' }}>

          {/* Row 1: Status Band */}
          <StatusBand
            displayTimeMs={displayTime.ms}
            isCurrentlyProductive={isCurrentlyProductive}
            isDistracting={isDistracting}
            currentAppName={currentApp?.app || currentApp?.title || ''}
            productivityScore={productivityScore}
            streak={streak}
            bestDay={bestDay}
            sleepDebt={sleepDebt}
          />

          {/* Row 2: Schedule Hero */}
          <div className="mb-4">
            <ScheduleCard />
          </div>

          {/* Row 3: Insight Strip */}
          <InsightStrip insights={insights} />

          {/* Row 4: Triple Column — Goals + Deadlines + Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <GoalsCard goals={goals} />
            <DeadlinesCard deadlines={deadlines} />
            <QuickFocusCard
              state={deepFocus.state}
              onStart={deepFocus.start}
              onEnd={deepFocus.end}
            />
          </div>

          {/* Row 5: Tier Breakdown Strip */}
          <TierBreakdownStrip
            productiveHours={dashboardData?.overview?.productiveSeconds ? Math.round(dashboardData.overview.productiveSeconds / 3600 * 10) / 10 : 0}
            neutralHours={dashboardData?.overview?.neutralSeconds ? Math.round(dashboardData.overview.neutralSeconds / 3600 * 10) / 10 : 0}
            distractingHours={dashboardData?.overview?.distractingSeconds ? Math.round(dashboardData.overview.distractingSeconds / 3600 * 10) / 10 : 0}
            totalHours={dashboardData?.overview?.totalSeconds ? Math.round(dashboardData.overview.totalSeconds / 3600 * 10) / 10 : 0}
            score={productivityScore}
            trendValue={streak > 0 ? `+${streak}d` : '0d'}
            trendPositive={streak > 0}
          />

          {/* Row 6: Follow Through (conditional) */}
          {ftData && ftData.totalExpense > 0 && (
            <div className="mb-4">
              <FollowThroughCard
                currency={dashboardCurrency}
                totalThisMonth={ftData.totalExpense}
                momChangePct={null}
                receivable={ftData.totalExpense}
                breakdown={ftData.breakdown}
                trend={[]}
                ftPersons={ftPersons}
              />
            </div>
          )}

          {/* Row 7: Pinned Activities */}
          <div className="mb-4">
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
          </div>

          {/* Row 8: Dual Column — Productivity Chart + Health Stack */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Productivity Chart */}
            <motion.div
              className="relative rounded-xl overflow-hidden
                bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
                border border-[rgba(63,63,70,0.50)] p-5
                hover:border-[rgba(82,82,91,0.80)] transition-all duration-250"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              <div className="absolute top-0 left-4 right-4 h-px
                bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-60 pointer-events-none" />
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
                    plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(24,24,27,0.95)', titleColor: '#f4f4f5', bodyColor: '#a1a1aa', borderColor: 'rgba(63,63,70,0.50)', borderWidth: 1, cornerRadius: 8, padding: 10 } },
                    scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#52525b', font: { size: 11 } } }, y: { stacked: true, grid: { color: 'rgba(63,63,70,0.20)' }, ticks: { color: '#52525b', font: { size: 11 } } } },
                  }} />
                )}
              </div>
            </motion.div>

            {/* Health Stack */}
            <div className="flex flex-col gap-4">
              <SleepBarMini sleepData={sleepData} avgSleep={avgSleep} sleepDebt={sleepDebt} />
              <MasteryRingMini mastered={masteryMastered} total={masteryTotal} />
            </div>
          </div>

          {/* Row 9: App Ecosystem */}
          <motion.div
            className="relative rounded-xl overflow-hidden
              bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
              border border-[rgba(63,63,70,0.50)] p-5 mb-4
              hover:border-[rgba(82,82,91,0.80)] transition-all duration-250"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.56, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div className="absolute top-0 left-4 right-4 h-px
              bg-gradient-to-r from-transparent via-sky-500/40 to-transparent opacity-60 pointer-events-none" />
            <SectionHeader title="App Ecosystem" icon={<Sun size={14} />} />
            <div className="relative h-44 flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full border border-zinc-700/15" />
              <div className="absolute w-48 h-48 rounded-full border border-zinc-700/10" />
              <div className="absolute w-64 h-64 rounded-full border border-zinc-700/5" />
              <div className="absolute w-12 h-12 rounded-full border border-zinc-700/30 flex items-center justify-center bg-zinc-900/80">
                <Sun className="w-6 h-6 text-zinc-500" />
              </div>
              {solar.slice(0, 5).map((app, i) => {
                const size = Math.max(60, 24 + (app.usage_ms / maxUsage) * 40);
                const angle = (i * 360) / Math.min(solar.length, 5);
                const radius = 70 + (i % 2) * 35;
                const rad = (angle * Math.PI) / 180;
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;
                return (
                  <motion.div key={app.name} initial={{ scale: 0, x: 0, y: 0 }} animate={{ scale: 1, x, y }}
                    transition={{ delay: 0.56 + i * 0.08 }} className="absolute"
                    style={{ width: Math.max(size, 50), height: Math.max(size, 50) }}
                    title={`${app.name}: ${Math.round(app.usage_ms / 1000 / 3600 * 10) / 10}h`}>
                    <div className="w-full h-full rounded-full border border-zinc-700/60 hover:border-zinc-500/80 transition-all duration-200 flex flex-col items-center justify-center bg-zinc-900/80 cursor-pointer hover:shadow-[0_0_16px_rgba(56,189,248,0.12)]">
                      <div className="text-[10px] font-semibold text-zinc-300 px-1 text-center truncate max-w-[60px]">{app.name}</div>
                      <div className="text-[9px] text-zinc-500">{Math.round(app.usage_ms / 1000 / 3600 * 10) / 10}h</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <button onClick={() => setExpandedModal('solar')}
              className="w-full py-2 rounded-lg text-[12px] font-medium bg-zinc-900/40 text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800/50 hover:text-zinc-300 hover:border-zinc-700/50 transition-all duration-200">
              View Solar System
            </button>
          </motion.div>

          {/* Row 10: Activity Feed */}
          <motion.div
            className="relative rounded-xl overflow-hidden
              bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
              border border-[rgba(63,63,70,0.50)] p-5 mb-4
              hover:border-[rgba(82,82,91,0.80)] transition-all duration-250"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.64, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div className="absolute top-0 left-4 right-4 h-px
              bg-gradient-to-r from-transparent via-zinc-500/40 to-transparent opacity-60 pointer-events-none" />
            <SectionHeader title="Recent Sessions" icon={<Clock size={14} />} />
            <div className="space-y-0.5 mt-3">
              {activityFeedWithElapsed.length === 0 ? (
                <EmptyState icon={<Clock size={20} className="text-zinc-600" />} title="No sessions yet" description="Start an activity to see it here" />
              ) : (
                [...activityFeedWithElapsed].reverse().slice(0, 10).map((item) => {
                  const isActive = item.isActive;
                  const durationStr = isActive ? getElapsedDuration(item) : item.elapsedStr;
                  return (
                    <div key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/20 border border-transparent hover:bg-zinc-900/40 hover:border-zinc-800/30 transition-all duration-200 group cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${item.tier === 'productive' ? 'bg-emerald-400' : item.tier === 'distracting' ? 'bg-rose-400' : 'bg-amber-400'} ${isActive ? 'animate-pulse' : ''}`} />
                        <div className="min-w-0">
                          <div className="text-[13px] text-zinc-300 group-hover:text-white transition-colors truncate">{item.name}</div>
                          <div className="text-[11px] text-zinc-600 truncate">{item.category} &bull; {item.timestamp.toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-[13px] font-mono text-zinc-400">{isActive && durationStr ? durationStr : item.elapsedStr}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.tier === 'productive' ? 'bg-emerald-500/10 text-emerald-400' : item.tier === 'distracting' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {item.tier}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
```

### Lines 550-600: Data Fetching (productivityScore, streak, bestDay computation)
```tsx
        const data = await api.getDashboardAggregates({
          period: fetchPeriod,
          dateOffset,
          weekOffset,
        });
        if (cancelled) return;
        if (thisReq !== fetchReqId.current) return;
        setDashboardData(data);

        // Compute productivity score, streak, best day
        if (data?.overview) {
          const total = data.overview.totalSeconds || 1;
          const prod = data.overview.productiveSeconds || 0;
          setProductivityScore(Math.round((prod / total) * 100));
        }
        if (data?.weeklyHeatmap) {
          // Streak: consecutive days with productive time > 30min
          let s = 0;
          const today = new Date();
          for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayData = data.weeklyHeatmap.find((w: any) => w.date === dateStr);
            if (dayData && dayData.productiveHours > 0.5) s++;
            else break;
          }
          setStreak(s);

          // Best day of week
          const dayTotals: Record<string, number> = {};
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          data.weeklyHeatmap.forEach((w: any) => {
            const d = new Date(w.date);
            const dayName = dayNames[d.getDay()];
            dayTotals[dayName] = (dayTotals[dayName] || 0) + (w.productiveHours || 0);
          });
          const best = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
          if (best) setBestDay(best[0]);
        }
```

---

## 2. StatusBand Component (Full Source)

**File:** `src/pages/dashboard/StatusBand.tsx` (138 lines)

```tsx
import { motion } from 'framer-motion';
import { AuroraText } from '../../components/ui/aurora-text';
import { NumberTicker } from '../../components/ui/number-ticker';
import { Flame, Trophy, Moon, Zap } from 'lucide-react';

function formatTime(ms: number): string {
  if (!ms || !isFinite(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface StatusBadgeProps {
  icon: React.ReactNode;
  label: string;
  color: 'pink' | 'amber' | 'rose' | 'zinc';
}

function StatusBadge({ icon, label, color }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    zinc: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30',
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${colorMap[color]}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

interface StatusBandProps {
  displayTimeMs: number;
  isCurrentlyProductive: boolean;
  isDistracting: boolean;
  currentAppName: string;
  productivityScore: number;
  streak: number;
  bestDay: string;
  sleepDebt: number;
}

export function StatusBand({
  displayTimeMs,
  isCurrentlyProductive,
  isDistracting,
  currentAppName,
  productivityScore,
  streak,
  bestDay,
  sleepDebt,
}: StatusBandProps) {
  const isActive = isCurrentlyProductive || isDistracting;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl overflow-hidden mb-4
        bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
        border border-[rgba(63,63,70,0.50)]
        hover:border-[rgba(82,82,91,0.80)]
        transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
    >
      {/* Subtle pink glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-20
        bg-pink-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* Top edge highlight */}
      <div className="absolute top-0 left-4 right-4 h-px
        bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />

      <div className="relative p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* LEFT: Mini Timer */}
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            isCurrentlyProductive ? 'bg-emerald-400' :
            isDistracting ? 'bg-rose-400' :
            'bg-zinc-500'
          } ${isActive ? 'animate-pulse' : ''}`} />
          <div className="flex items-baseline gap-2">
            <AuroraText
              colors={
                isDistracting
                  ? ['#ef4444', '#f87171', '#dc2626', '#ef4444']
                  : isCurrentlyProductive
                    ? ['#10b981', '#34d399', '#059669', '#10b981']
                    : ['#3b82f6', '#60a5fa', '#2563eb', '#3b82f6']
              }
              speed={0.5}
            >
              <span className="text-xl font-mono font-semibold tracking-tight">
                {formatTime(displayTimeMs)}
              </span>
            </AuroraText>
            {currentAppName && (
              <span className="text-[11px] text-zinc-500 hidden sm:inline truncate max-w-[120px]">
                {currentAppName}
              </span>
            )}
          </div>
        </div>

        {/* CENTER: Productivity Score */}
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1.5">
            <NumberTicker
              value={Math.round(productivityScore)}
              className="text-3xl font-mono font-bold text-[#f4f4f5]"
            />
            <span className="text-sm text-zinc-500">/100</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-0.5">
            {productivityScore >= 80 ? 'On fire' :
             productivityScore >= 60 ? 'Good pace' :
             productivityScore >= 40 ? 'Keep going' : 'Focus up'}
          </span>
        </div>

        {/* RIGHT: Summary Badges */}
        <div className="flex items-center gap-2">
          <StatusBadge icon={<Flame size={11} />} label={`${streak}d streak`} color="pink" />
          <StatusBadge icon={<Trophy size={11} />} label={bestDay} color="amber" />
          <StatusBadge
            icon={<Moon size={11} />}
            label={`${sleepDebt}h debt`}
            color={sleepDebt > 2 ? 'rose' : 'zinc'}
          />
        </div>
      </div>
    </motion.div>
  );
}
```

---

## 3. TierBreakdownStrip Component (Full Source)

**File:** `src/pages/dashboard/TierBreakdownStrip.tsx` (99 lines)

```tsx
import { motion } from 'framer-motion';
import { CheckCircle2, MinusCircle, XCircle, Clock, TrendingUp, Activity } from 'lucide-react';
import { NumberTicker } from '../../components/ui/number-ticker';

interface TierStat {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  showBar?: boolean;
  isTicker?: boolean;
  isTrend?: boolean;
}

interface TierBreakdownStripProps {
  productiveHours: number;
  neutralHours: number;
  distractingHours: number;
  totalHours: number;
  score: number;
  trendValue: string;
  trendPositive: boolean;
}

export function TierBreakdownStrip({
  productiveHours,
  neutralHours,
  distractingHours,
  totalHours,
  score,
  trendValue,
  trendPositive,
}: TierBreakdownStripProps) {
  const stats: TierStat[] = [
    { label: 'Productive', value: productiveHours, color: '#34d399', icon: <CheckCircle2 size={14} />, showBar: true },
    { label: 'Neutral', value: neutralHours, color: '#fbbf24', icon: <MinusCircle size={14} />, showBar: true },
    { label: 'Distracting', value: distractingHours, color: '#f87171', icon: <XCircle size={14} />, showBar: true },
    { label: 'Total', value: totalHours, color: '#a1a1aa', icon: <Clock size={14} />, showBar: false },
    { label: 'Score', value: Math.round(score), color: '#ec4899', icon: <TrendingUp size={14} />, isTicker: true },
    { label: 'Trend', value: 0, color: trendPositive ? '#34d399' : '#f87171', icon: <Activity size={14} />, isTrend: true },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-xl p-3
            bg-[rgba(24,24,27,0.60)] backdrop-blur-xl
            border border-zinc-800/40
            hover:border-[rgba(255,255,255,0.08)]
            hover:-translate-y-0.5 transition-all duration-250">
          <div className="absolute top-0 left-3 right-3 h-px opacity-40 pointer-events-none"
            style={{ background: `linear-gradient(to right, transparent, ${stat.color}, transparent)` }} />
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              {stat.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            {stat.isTicker ? (
              <NumberTicker value={stat.value} className="text-xl font-mono font-bold text-white" />
            ) : stat.isTrend ? (
              <span className="text-xl font-mono font-bold" style={{ color: stat.color }}>
                {trendValue}
              </span>
            ) : (
              <span className="text-xl font-mono font-bold text-white">
                {stat.value.toFixed(1)}
              </span>
            )}
            {!stat.isTicker && !stat.isTrend && (
              <span className="text-[11px] text-zinc-600">h</span>
            )}
          </div>
          {stat.showBar && (
            <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: stat.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(stat.value / Math.max(totalHours, 1)) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
```

---

## 4. SleepBarMini Component (Full Source)

**File:** `src/components/dashboard/SleepBarMini.tsx` (54 lines)

```tsx
import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';

interface SleepDay {
  label: string;
  hours: number;
}

interface SleepBarMiniProps {
  sleepData?: SleepDay[];
  avgSleep?: number;
  sleepDebt?: number;
}

export function SleepBarMini({ sleepData = [], avgSleep = 0, sleepDebt = 0 }: SleepBarMiniProps) {
  return (
    <div className="relative rounded-xl overflow-hidden
      bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
      border border-[rgba(63,63,70,0.50)] p-5
      hover:border-[rgba(82,82,91,0.80)] transition-all duration-250 h-full">

      <div className="absolute top-0 left-4 right-4 h-px
        bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-60 pointer-events-none" />

      <SectionHeader title="Sleep" icon={<Moon size={14} />} />

      <div className="flex items-end gap-1.5 h-20 mt-3">
        {sleepData.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(day.hours / 10) * 100}%` }}
              transition={{ delay: 0.48 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full rounded-t-sm min-h-[4px] ${
                day.hours >= 7 ? 'bg-indigo-400/70' : 'bg-indigo-400/30'
              }`}
            />
            <span className="text-[10px] text-zinc-600 font-medium">{day.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">
          Avg: <span className="text-zinc-300 font-mono">{avgSleep.toFixed(1)}h</span>
        </span>
        {sleepDebt > 0 && (
          <span className="text-rose-400 font-medium">-{sleepDebt.toFixed(1)}h debt</span>
        )}
      </div>
    </div>
  );
}
```

---

## 5. PinnedActivities Component (Full Source)

**File:** `src/pages/dashboard/PinnedActivities.tsx` (336 lines)

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Check, Edit3, Plus, Minus, Play, X,
  BookOpen, Dumbbell, Activity, Moon, Utensils, Coffee, Bus, Book, Timer, Sun
} from 'lucide-react';
import { BorderBeam } from '../../components/ui/border-beam';

interface ExternalActivity {
  id: number;
  name: string;
  type: 'stopwatch' | 'sleep' | 'checkin';
  color: string;
  icon: string;
  is_productive: boolean;
}

const ACTIVITY_ICONS: Record<string, any> = {
  BookOpen, Dumbbell, Activity, Moon, Utensils, Coffee, Bus, Book, Sun, Timer
};

interface PinnedActivitiesProps {
  pinnedActivities: ExternalActivity[];
  setPinnedActivities: React.Dispatch<React.SetStateAction<ExternalActivity[]>>;
  activities: ExternalActivity[];
  selectedExternalActivity: ExternalActivity | null;
  setSelectedExternalActivity: React.Dispatch<React.SetStateAction<ExternalActivity | null>>;
  handleSelectExternalActivity: (activity: ExternalActivity) => void;
  externalSessionRunning: boolean;
  formatDuration: (ms: number) => string;
  externalElapsedMs: number;
  handleStartExternalSession: () => void;
  handleStopExternalSession: () => void;
  collapsible?: boolean;
}

export function PinnedActivities({
  pinnedActivities,
  setPinnedActivities,
  activities,
  selectedExternalActivity,
  setSelectedExternalActivity,
  handleSelectExternalActivity,
  externalSessionRunning,
  formatDuration,
  externalElapsedMs,
  handleStartExternalSession,
  handleStopExternalSession,
  collapsible = false,
}: PinnedActivitiesProps) {
  const [pinnedActivitiesExpanded, setPinnedActivitiesExpanded] = useState(true);
  const [pinnedActivitiesEditMode, setPinnedActivitiesEditMode] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [addPinnedPicker, setAddPinnedPicker] = useState<ExternalActivity[]>([]);
  const [selectedAddActivities, setSelectedAddActivities] = useState<Set<number>>(new Set());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl p-5 border backdrop-blur-sm mb-12 bg-zinc-950/80 border-zinc-500/20"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => collapsible ? setPinnedActivitiesExpanded(!pinnedActivitiesExpanded) : null}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {collapsible && <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${pinnedActivitiesExpanded ? 'rotate-90' : ''}`} />}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Pinned Activities</h2>
              <p className="text-xs text-zinc-600 mt-1">Quick manual tracking</p>
            </div>
          </button>
          <button
            onClick={() => setPinnedActivitiesEditMode(!pinnedActivitiesEditMode)}
            className={`p-2 rounded-lg border transition-colors duration-150 ${
              pinnedActivitiesEditMode
                ? 'bg-emerald-500/20 border-emerald-500/50'
                : 'bg-zinc-500/10 border-zinc-500/20 hover:border-zinc-500/30'
            }`}
          >
            {pinnedActivitiesEditMode ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Edit3 className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>

        {pinnedActivitiesExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {pinnedActivities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.icon] || Timer;
            const isSelected = selectedExternalActivity?.id === activity.id;
            
            return (
              <motion.div key={activity.id} className="relative">
                {isSelected && (
                  <BorderBeam
                    size={50}
                    duration={6}
                    colorFrom="#10b981"
                    colorTo="#34d399"
                    borderWidth={1.5}
                  />
                )}
                <motion.button
                  onClick={() => {
                    if (pinnedActivitiesEditMode) {
                      setPinnedActivities(prev => prev.filter(a => a.id !== activity.id));
                    } else if (isSelected) {
                      setSelectedExternalActivity(null);
                    } else {
                      handleSelectExternalActivity(activity);
                    }
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full rounded-xl border transition-all duration-200 text-center overflow-hidden ${
                    isSelected
                      ? 'border-emerald-500/50'
                      : 'bg-zinc-500/10 border-zinc-500/20 hover:border-zinc-500/40 hover:bg-zinc-500/15'
                  }`}
                  style={{
                    padding: isSelected ? '12px 12px 8px' : '16px 12px',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,95,70,0.10))'
                      : undefined,
                    boxShadow: isSelected
                      ? '0 0 24px rgba(16,185,129,0.12), inset 0 1px 0 rgba(16,185,129,0.20)'
                      : undefined,
                  }}
                >
                  {isSelected && externalSessionRunning && (
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-medium text-emerald-400/80 uppercase tracking-wider">Tracking</span>
                    </div>
                  )}
                  <Icon
                    className={`w-6 h-6 mx-auto mb-1.5 transition-colors duration-200 ${
                      isSelected
                        ? 'text-emerald-400'
                        : activity.is_productive ? 'text-emerald-500' : 'text-indigo-500'
                    }`}
                  />
                  <div className="text-xs font-semibold transition-colors duration-200 text-white">
                    {activity.name}
                  </div>
                  {isSelected && externalSessionRunning && (
                    <div className="text-lg font-mono font-bold text-emerald-400 mt-1.5 tabular-nums">
                      {formatDuration(externalElapsedMs)}
                    </div>
                  )}
                  {isSelected && !externalSessionRunning && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartExternalSession();
                      }}
                      className="mt-2 mb-0.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 transition-all duration-150 cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      Start
                    </button>
                  )}
                </motion.button>
                {isSelected && externalSessionRunning && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStopExternalSession();
                    }}
                    className="absolute -bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 px-3 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-semibold uppercase tracking-wider shadow-lg shadow-red-500/20 hover:bg-red-500 transition-colors duration-150 whitespace-nowrap"
                  >
                    Stop
                  </motion.button>
                )}
                {pinnedActivitiesEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinnedActivities(prev => prev.filter(a => a.id !== activity.id));
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3 text-white" />
                  </button>
                )}
              </motion.div>
            );
          })}
          
          {pinnedActivitiesEditMode && pinnedActivities.length < 6 && (
            <motion.button
              onClick={() => {
                const available = activities.filter(a => !pinnedActivities.find(p => p.id === a.id));
                if (available.length === 0) return;
                if (available.length === 1) {
                  setPinnedActivities(prev => [...prev, available[0]]);
                } else {
                  setAddPinnedPicker(available);
                  setSelectedAddActivities(new Set());
                  setShowAddActivityModal(true);
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full p-4 rounded-lg border border-dashed transition-colors duration-150 text-center"
              style={{
                backgroundColor: 'rgba(107, 114, 128, 0.05)',
                borderColor: 'rgba(107, 114, 128, 0.3)'
              }}
            >
              <Plus className="w-6 h-6 mx-auto mb-2 text-zinc-500" />
              <div className="text-xs font-semibold text-zinc-500">Add</div>
            </motion.button>
          )}
          
        </div>
      )}
      </div>
      {/* Add Activity Modal — omitted for brevity, full source in file */}
    </motion.div>
  );
}
```

---

## 6. Design Tokens (from src/index.css)

```css
@import "tailwindcss";
@import "./styles/finance-glass.css";

@theme {
  --ws-surface: #1a1a2e;
  --ws-border: #2a2a3e;
  --ws-accent: #e94560;
  --color-clay-400: #d4a574;
  --color-clay-500: #c4956a;
  --color-sage-400: #87a878;
  --color-sage-500: #7a9b6a;
  --color-amber-400: #f59e0b;
  --color-sky-400: #38bdf8;
  --font-serif: 'Source Serif 4', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Glass Card Pattern (MUST use)
```tsx
<div className="relative rounded-xl overflow-hidden
  bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
  border border-[rgba(63,63,70,0.50)]
  hover:border-[rgba(82,82,91,0.80)]
  transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]">
  <div className="absolute top-0 left-4 right-4 h-px
    bg-gradient-to-r from-transparent via-[accent]/40 to-transparent opacity-60 pointer-events-none" />
  <div className="p-5">...</div>
</div>
```

---

## 7. Backend Verification Table

| Feature | IPC Channel | Handler Exists? | Returns Real Data? | Status |
|---------|-------------|-----------------|-------------------|--------|
| Dashboard aggregates | `getDashboardAggregates` | ✅ main.ts | ✅ Real | ✅ Real |
| Schedule | `getSchedule` | ✅ main.ts | ✅ Real | ✅ Real |
| AI Insights | `getInsightStrip` | ✅ main.ts | ⚠️ Some count values nonsensical | ⚠️ Needs fix |
| Goals | `getGoals` | ✅ main.ts | ✅ Real | ✅ Real |
| Deadlines | `getDeadlines` | ✅ main.ts | ✅ Real | ✅ Real |
| Deep Focus | `useDeepFocus` hook | ✅ hook file | ✅ Real | ✅ Real |
| Sleep data | `getExternalSessions` | ✅ main.ts | ⚠️ May return empty | ⚠️ Needs verification |
| External activities | `getExternalActivities` | ✅ main.ts | ✅ Real | ✅ Real |
| Timer state | Parent props (App.tsx) | ✅ App state | ✅ Real | ✅ Real |
| Follow Through | `financeGetOnBehalfOfSummary` | ✅ main.ts | ✅ Real | ✅ Real (but low dashboard relevance) |
| Heatmap | `buildWeeklyHeatmap` | ✅ main.ts | ✅ Real | ✅ Real |
| Productivity score | Computed from overview | ✅ DashboardPage | ✅ Real | ✅ Real |

---

## 8. MCP Component Source Code (Embedded — Target AI Has No MCP Access)

The following components were pulled from live MCP servers. Use these exact implementations.

### Already Installed in DeskFlow (import from these paths)
```tsx
import { BorderBeam } from '../../components/ui/border-beam';
import { AuroraText } from '../../components/ui/aurora-text';
import { NumberTicker } from '../../components/ui/number-ticker';
import { AnimatedGradientText } from '../../components/ui/animated-gradient-text';
import { Particles } from '../../components/ui/particles';
import { DotPattern } from '../../components/ui/dot-pattern';
```

### shadcn/ui — Card
```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card" className={cn("flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm", className)} {...props} />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-header" className={cn("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", className)} {...props} />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("leading-none font-semibold", className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center px-6 [.border-t]:pt-6", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
```

### shadcn/ui — Badge
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

### shadcn/ui — Skeleton
```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-accent", className)} {...props} />
}

export { Skeleton }
```

### shadcn/ui — Progress
```tsx
"use client"
import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)} {...props}>
      <ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
```

### shadcn/ui — ScrollArea
```tsx
"use client"
import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative", className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="size-full rounded-[inherit]">{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex touch-none p-px transition-colors select-none h-full w-2.5 border-l border-l-transparent">
        <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

export { ScrollArea }
```

### shadcn/ui — Tooltip
```tsx
"use client"
import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root {...props} />
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger {...props} />
}

function TooltipContent({ className, sideOffset = 0, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content sideOffset={sideOffset} className={cn("z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className)} {...props}>
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

### Magic UI — BorderBeam
```tsx
"use client"
import { motion, MotionStyle, Transition } from "motion/react"
import { cn } from "@/lib/utils"

interface BorderBeamProps {
  size?: number; duration?: number; delay?: number; colorFrom?: string; colorTo?: string;
  transition?: Transition; className?: string; style?: React.CSSProperties;
  reverse?: boolean; initialOffset?: number; borderWidth?: number;
}

export const BorderBeam = ({ className, size = 50, delay = 0, duration = 6, colorFrom = "#ffaa40", colorTo = "#9c40ff", transition, style, reverse = false, initialOffset = 0, borderWidth = 1 }: BorderBeamProps) => {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]" style={{ "--border-beam-width": `${borderWidth}px` } as React.CSSProperties}>
      <motion.div className={cn("absolute aspect-square bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent", className)}
        style={{ width: size, offsetPath: `rect(0 auto auto 0 round ${size}px)`, "--color-from": colorFrom, "--color-to": colorTo, ...style } as MotionStyle}
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{ offsetDistance: reverse ? [`${100 - initialOffset}%`, `${-initialOffset}%`] : [`${initialOffset}%`, `${100 + initialOffset}%`] }}
        transition={{ repeat: Infinity, ease: "linear", duration, delay: -delay, ...transition }}
      />
    </div>
  )
}
```

### Magic UI — NumberTicker
```tsx
"use client"
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { useInView, useMotionValue, useSpring } from "motion/react"
import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number; startValue?: number; direction?: "up" | "down"; delay?: number; decimalPlaces?: number;
}

export function NumberTicker({ value, startValue = 0, direction = "up", delay = 0, className, decimalPlaces = 0, ...props }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    if (isInView) { timer = setTimeout(() => { motionValue.set(direction === "down" ? startValue : value) }, delay * 1000) }
    return () => { if (timer !== null) clearTimeout(timer) }
  }, [motionValue, isInView, delay, value, direction, startValue])

  useEffect(() => springValue.on("change", (latest) => {
    if (ref.current) { ref.current.textContent = Intl.NumberFormat("en-US", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(Number(latest.toFixed(decimalPlaces))) }
  }), [springValue, decimalPlaces])

  return <span ref={ref} className={cn("inline-block tracking-wider text-black tabular-nums dark:text-white", className)} {...props}>{startValue}</span>
}
```

### Magic UI — AuroraText
```tsx
"use client"
import React, { memo } from "react"

interface AuroraTextProps { children: React.ReactNode; className?: string; colors?: string[]; speed?: number; }

export const AuroraText = memo(({ children, className = "", colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"], speed = 1 }: AuroraTextProps) => {
  const gradientStyle = {
    backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    animationDuration: `${10 / speed}s`,
  }
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="sr-only">{children}</span>
      <span className="animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent" style={gradientStyle} aria-hidden="true">{children}</span>
    </span>
  )
})
AuroraText.displayName = "AuroraText"
```

### Magic UI — AnimatedGradientText
```tsx
import { type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export interface AnimatedGradientTextProps extends ComponentPropsWithoutRef<"div"> { speed?: number; colorFrom?: string; colorTo?: string; }

export function AnimatedGradientText({ children, className, speed = 1, colorFrom = "#ffaa40", colorTo = "#9c40ff", ...props }: AnimatedGradientTextProps) {
  return (
    <span style={{ "--bg-size": `${speed * 300}%`, "--color-from": colorFrom, "--color-to": colorTo } as React.CSSProperties}
      className={cn("animate-gradient inline bg-linear-to-r from-(--color-from) via-(--color-to) to-(--color-from) bg-size-[var(--bg-size)_100%] bg-clip-text text-transparent", className)} {...props}>
      {children}
    </span>
  )
}
```
