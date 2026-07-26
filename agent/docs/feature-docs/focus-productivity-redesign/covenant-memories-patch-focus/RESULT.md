# RESULT.md -- Deep Focus as a Productivity Subpage

Focus is no longer a standalone route. It is now the "Deep Focus" section embedded
directly inside `ProductivityPage.tsx`, which itself lives inside the Productivity
tab of `ActivityPage.tsx`. There is no more `/focus` route, no more Focus sidebar
item, and `FocusPage.tsx` has been deleted -- its logic was absorbed and rebuilt
across five new components.

## 1. Component architecture

```
src/
  components/ui/
    animated-circular-progress-bar.tsx   (new -- Magic UI style ring, framer-motion driven)
    particles.tsx                        (new -- ambient canvas particles, reduced-motion safe)
  features/focus/
    focusHelpers.ts        (pure functions: formatting, today stats, streak, weekly trend, best hour)
    focusConfetti.ts       (canvas-confetti wrapper + "seen" tracking so celebration fires once)
    FocusTimer.tsx         (Session Control Panel: ring + countdown + presets + strict toggle + start/end)
    FocusStats.tsx         (Today's Focus Stats row)
    FocusHistory.tsx       (Session History cards + empty state)
    FocusInsights.tsx      (weekly trend chart + best hour + avg length, bonus section)
    FocusSection.tsx       (composes all of the above; the only thing ProductivityPage imports)
  pages/
    ProductivityPage.tsx   (edited -- one import + one <FocusSection /> line)
    FocusPage.tsx          (DELETED)
  App.tsx                  (edited -- removed the /focus route, sidebar item, and import)
```

Component hierarchy:

```
ActivityPage
  -> ProductivityPage (Productivity tab)
       -> ... existing score hero / charts / insights ...
       -> FocusSection                     <-- new, this is the whole feature
            -> FocusTimer                  (1/3 width column on desktop)
            -> FocusStats                  (2/3 column, top)
            -> FocusHistory                (2/3 column, middle)
            -> FocusInsights                (2/3 column, bottom, conditional)
```

`FocusSection` is the single integration point. It owns `useFocusSession()` itself,
so `ProductivityPage` does not need to fetch or pass down any focus-related props --
consistent with how the rest of DeskFlow's embedded tab pages are composed.

## 2. Full component code

### `features/focus/focusHelpers.ts`

```ts
// Pure helpers for the Deep Focus section. Kept framework-free and testable --
// every component below calls into these instead of recomputing inline.

export interface FocusHistoryRow {
  id: number;
  started_at: string;
  ended_at?: string | null;
  planned_sec: number;
  actual_sec?: number | null;
  outcome: 'active' | 'completed' | 'failed' | 'aborted';
  strictness: 'distracting' | 'non_allowed';
  broke_on_type?: string | null;
  broke_on_name?: string | null;
  return_count?: number;
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${rem}s`;
  return `${rem}s`;
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

export function todaysSessions(history: FocusHistoryRow[]): FocusHistoryRow[] {
  const today = new Date().toDateString();
  return history.filter(h => dayKey(h.started_at) === today);
}

export interface TodayStats {
  focusSec: number;
  sessionCount: number;
  completedCount: number;
  completionRate: number; // 0-100
}

export function computeTodayStats(history: FocusHistoryRow[]): TodayStats {
  const today = todaysSessions(history);
  const completed = today.filter(h => h.outcome === 'completed');
  const focusSec = completed.reduce((sum, h) => sum + (h.actual_sec || 0), 0);
  const completionRate = today.length > 0 ? Math.round((completed.length / today.length) * 100) : 0;
  return { focusSec, sessionCount: today.length, completedCount: completed.length, completionRate };
}

/** Consecutive days (including today, if it has a completed session) with at least one completed session. */
export function computeStreak(history: FocusHistoryRow[]): number {
  const completedDays = new Set(
    history.filter(h => h.outcome === 'completed').map(h => dayKey(h.started_at)),
  );
  if (completedDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  // If today has no completed session yet, don't break the streak -- start counting from yesterday.
  if (!completedDays.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let guard = 0; guard < 3650; guard++) {
    if (completedDays.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export interface DayTrendPoint {
  label: string;
  date: string;
  focusSec: number;
}

/** Last 7 days (oldest -> newest) of completed focus time, for the weekly trend chart. */
export function computeWeeklyTrend(history: FocusHistoryRow[]): DayTrendPoint[] {
  const days: DayTrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const focusSec = history
      .filter(h => h.outcome === 'completed' && dayKey(h.started_at) === key)
      .reduce((sum, h) => sum + (h.actual_sec || 0), 0);
    days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), date: key, focusSec });
  }
  return days;
}

export function computeBestHour(history: FocusHistoryRow[]): { hour: number; label: string } | null {
  const completed = history.filter(h => h.outcome === 'completed');
  if (completed.length === 0) return null;
  const byHour = new Map<number, number>();
  for (const h of completed) {
    const hour = new Date(h.started_at).getHours();
    byHour.set(hour, (byHour.get(hour) || 0) + (h.actual_sec || 0));
  }
  let bestHour = 0;
  let bestSec = -1;
  for (const [hour, sec] of byHour) {
    if (sec > bestSec) { bestSec = sec; bestHour = hour; }
  }
  const suffix = bestHour >= 12 ? 'PM' : 'AM';
  const hour12 = bestHour === 0 ? 12 : bestHour > 12 ? bestHour - 12 : bestHour;
  return { hour: bestHour, label: `${hour12}:00 ${suffix}` };
}

export function computeAvgSessionLength(history: FocusHistoryRow[]): number {
  const completed = history.filter(h => h.outcome === 'completed' && h.actual_sec);
  if (completed.length === 0) return 0;
  return completed.reduce((sum, h) => sum + (h.actual_sec || 0), 0) / completed.length;
}

```

### `features/focus/focusConfetti.ts`

```ts
import confetti from 'canvas-confetti';

// Reuses the canvas-confetti dependency already installed for this codebase
// (see src/App.tsx) with a pink/emerald palette matching Focus's accent,
// instead of Covenant's warm palette (src/features/warmth/celebrate.ts).
const FOCUS_PALETTE = ['#ec4899', '#34d399', '#f472b6', '#a7f3d0'];

export function celebrateFocusCompletion(originEl?: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  let origin = { x: 0.5, y: 0.4 };
  if (originEl) {
    const rect = originEl.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 32,
    gravity: 1,
    scalar: 0.9,
    ticks: 220,
    colors: FOCUS_PALETTE,
    origin,
  });
}

const SEEN_KEY = 'deskflow.focus.seenCompletions.v1';

function loadSeen(): number[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
}

export function hasSeenCompletion(sessionId: number): boolean {
  return loadSeen().includes(sessionId);
}

export function markCompletionSeen(sessionId: number): void {
  const seen = loadSeen();
  if (!seen.includes(sessionId)) {
    seen.push(sessionId);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-200)));
  }
}

```

### `components/ui/animated-circular-progress-bar.tsx`

```tsx
import { useEffect, useRef } from "react"
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedCircularProgressBarProps {
  /** 0-100 */
  value: number
  size?: number
  strokeWidth?: number
  gaugePrimaryColor: string
  gaugeSecondaryColor?: string
  /** When true, animates continuously/linearly (used for a running countdown) instead of springing */
  linear?: boolean
  /** Duration in ms for the linear animation to reach `value` from its current position */
  linearDurationMs?: number
  className?: string
  children?: React.ReactNode
}

const CIRCUMFERENCE_R = 45

// A from-scratch, lightweight recreation of Magic UI's animated-circular-progress-bar
// (SVG ring + CSS var driven fill), adapted to use framer-motion so it plays nicely
// with this codebase's existing motion conventions and respects reduced-motion.
export function AnimatedCircularProgressBar({
  value,
  size = 160,
  strokeWidth = 10,
  gaugePrimaryColor,
  gaugeSecondaryColor = "rgba(255,255,255,0.08)",
  linear = false,
  linearDurationMs = 1000,
  className,
  children,
}: AnimatedCircularProgressBarProps) {
  const reduce = useReducedMotion()
  const circumference = 2 * Math.PI * CIRCUMFERENCE_R
  const clamped = Math.max(0, Math.min(100, value))

  const motionValue = useMotionValue(clamped)
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 })
  const dashoffset = useTransform(spring, (v) => circumference - (v / 100) * circumference)
  const prevRef = useRef(clamped)

  useEffect(() => {
    if (reduce) {
      motionValue.jump(clamped)
      prevRef.current = clamped
      return
    }
    motionValue.set(clamped)
    prevRef.current = clamped
  }, [clamped, reduce, motionValue])

  const trackStyle = { stroke: gaugeSecondaryColor }
  const wrapStyle = { width: size, height: size }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={wrapStyle}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={CIRCUMFERENCE_R} fill="none" strokeWidth={strokeWidth} style={trackStyle} />
        <motion.circle
          cx="50"
          cy="50"
          r={CIRCUMFERENCE_R}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={gaugePrimaryColor}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={reduce ? { strokeDashoffset: circumference - (clamped / 100) * circumference } : { strokeDashoffset: dashoffset }}
          transition={linear ? { duration: linearDurationMs / 1000, ease: "linear" } : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

```

### `components/ui/particles.tsx`

```tsx
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ParticlesProps {
  className?: string
  quantity?: number
  color?: string
  /** 0-1, kept intentionally low by callers for an ambient, non-distracting effect */
  opacity?: number
}

// A minimal, dependency-free recreation of Magic UI's `particles` background --
// slow-drifting dots on a canvas. Pauses automatically on prefers-reduced-motion
// and when the tab/window is hidden, per the Motion skill's performance rules.
export function Particles({ className, quantity = 30, color = "#ec4899", opacity = 0.25 }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const parent = canvas.parentElement
      const w = parent?.clientWidth || canvas.clientWidth || 300
      const h = parent?.clientHeight || canvas.clientHeight || 150
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }
    resize()

    const particles = Array.from({ length: quantity }).map(() => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      a: Math.random() * opacity,
    }))

    const draw = () => {
      if (!running) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = p.a
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    const onVisibility = () => {
      running = document.visibilityState === "visible"
      if (running) raf = requestAnimationFrame(draw)
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("resize", resize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("resize", resize)
    }
  }, [quantity, color, opacity])

  return <canvas ref={canvasRef} className={cn("pointer-events-none absolute inset-0 size-full", className)} />
}

```

### `features/focus/FocusTimer.tsx`

```tsx
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Target, Eye, EyeOff, Focus as FocusIcon } from 'lucide-react';
import { AnimatedCircularProgressBar } from '../../components/ui/animated-circular-progress-bar';
import { Particles } from '../../components/ui/particles';
import { NumberTicker } from '../../components/ui/number-ticker';
import { GlassCard } from '../../components/GlassCard';
import { Badge } from '../../components/ui/badge';
import type { FocusPublicState } from '../../hooks/useFocusSession';
import { fmtClock } from './focusHelpers';

const PRESETS = [
  { label: '5m', sec: 5 * 60 },
  { label: '10m', sec: 10 * 60 },
  { label: '15m', sec: 15 * 60 },
  { label: '25m', sec: 25 * 60 },
  { label: '50m', sec: 50 * 60 },
  { label: '90m', sec: 90 * 60 },
];

interface FocusTimerProps {
  state: FocusPublicState | null | undefined;
  mins: number;
  onMinsChange: (mins: number) => void;
  strict: 'distracting' | 'non_allowed';
  onStrictChange: (s: 'distracting' | 'non_allowed') => void;
  onStart: () => void;
  onStop: () => void;
  justCompleted: boolean;
}

const tapScale = { scale: 0.95 };
const crossfade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

// Session Control Panel: the circular-progress timer, presets, strict-mode
// toggle, and start/end action. This is the left column (1/3 width) of the
// Deep Focus section on desktop.
export function FocusTimer({ state, mins, onMinsChange, strict, onStrictChange, onStart, onStop, justCompleted }: FocusTimerProps) {
  const active = !!state?.active;
  const plannedSec = mins * 60;
  const remainingSec = active ? state!.remainingSec : plannedSec;
  const progressPct = active ? Math.max(0, Math.min(100, (remainingSec / plannedSec) * 100)) : 0;

  const statusLabel = active ? 'Active' : justCompleted ? 'Completed' : 'Idle';
  const statusVariant = active ? 'default' : justCompleted ? 'default' : 'secondary';

  const ringPrimary = active ? '#ec4899' : justCompleted ? '#34d399' : 'rgba(236,72,153,0.35)';

  const clockFormatter = useMemo(() => (v: number) => fmtClock(v), []);

  return (
    <GlassCard accent="pink" className="relative overflow-hidden h-full">
      {active && <Particles className="opacity-60" quantity={22} color="#ec4899" opacity={0.18} />}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <FocusIcon className="w-4 h-4 text-pink-400" />
            Session control
          </h3>
          <Badge variant={statusVariant as 'default' | 'secondary'}>{statusLabel}</Badge>
        </div>

        <AnimatedCircularProgressBar
          value={active ? progressPct : 100}
          size={168}
          strokeWidth={10}
          gaugePrimaryColor={ringPrimary}
          gaugeSecondaryColor="rgba(255,255,255,0.06)"
          linear={active}
          linearDurationMs={1000}
        >
          <div className="flex flex-col items-center">
            <NumberTicker
              value={remainingSec}
              duration={active ? 600 : 200}
              formatter={clockFormatter}
              className="text-5xl font-bold tabular-nums font-mono text-white"
            />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
              {active ? 'remaining' : `${mins} min session`}
            </span>
          </div>
        </AnimatedCircularProgressBar>

        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key="active-controls"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="w-full"
            >
              <p className="text-center text-[11px] text-zinc-500 mb-3">
                {state!.strictness === 'non_allowed' ? 'Strict mode -- only productive apps allowed' : 'Blocking distracting apps and sites'}
              </p>
              <motion.button
                whileTap={tapScale}
                onClick={onStop}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors text-sm font-semibold"
              >
                <Square className="w-4 h-4" />
                End session
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="idle-controls"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="w-full"
            >
              <div className="grid grid-cols-6 gap-2 mb-3">
                {PRESETS.map(p => (
                  <motion.button
                    key={p.sec}
                    whileTap={tapScale}
                    onClick={() => onMinsChange(p.sec / 60)}
                    className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                      mins === p.sec / 60
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                        : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800'
                    }`}
                  >
                    <Target className="w-3 h-3 opacity-70" />
                    {p.label}
                  </motion.button>
                ))}
              </div>

              <button
                onClick={() => onStrictChange(strict === 'non_allowed' ? 'distracting' : 'non_allowed')}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/40 mb-3 text-left"
              >
                <span className="flex items-center gap-2 text-[12px] text-zinc-300">
                  {strict === 'non_allowed' ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
                  Strict mode
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${strict === 'non_allowed' ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
                  {strict === 'non_allowed' ? 'Only productive allowed' : 'Block distracting only'}
                </span>
              </button>

              <motion.button
                whileTap={tapScale}
                onClick={onStart}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start {mins}-min focus
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-zinc-600 leading-relaxed text-center">
          Soft-block overlay -- not enforcement. Your choice is always logged.
        </p>
      </div>
    </GlassCard>
  );
}

```

### `features/focus/FocusStats.tsx`

```tsx
import { Clock, CheckCircle2, TrendingUp, Flame } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { NumberTicker } from '../../components/ui/number-ticker';
import type { TodayStats } from './focusHelpers';

interface FocusStatsProps {
  stats: TodayStats;
  streak: number;
}

function completionColor(rate: number): string {
  if (rate >= 75) return 'text-emerald-400';
  if (rate >= 40) return 'text-amber-400';
  return 'text-zinc-400';
}

const minutesFormatter = (v: number) => {
  const m = Math.floor(v / 60);
  const s = Math.round(v % 60);
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

// Today's Focus Stats: a compact 4-up stat row, matching ProductivityPage's
// own stat-card sizing/typography (text-2xl font-bold tabular-nums values,
// text-[10px] uppercase tracking-wider labels).
export function FocusStats({ stats, streak }: FocusStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <GlassCard className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Focus today</span>
        </div>
        <NumberTicker value={stats.focusSec} formatter={minutesFormatter} className="text-2xl font-bold tabular-nums font-mono text-white" />
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Sessions</span>
        </div>
        <NumberTicker value={stats.completedCount} className="text-2xl font-bold tabular-nums font-mono text-white" />
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Completion</span>
        </div>
        <NumberTicker value={stats.completionRate} suffix="%" className={`text-2xl font-bold tabular-nums font-mono ${completionColor(stats.completionRate)}`} />
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500">
          <Flame className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Streak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NumberTicker value={streak} className="text-2xl font-bold tabular-nums font-mono text-pink-400" />
          <span className="text-xs text-zinc-500">{streak === 1 ? 'day' : 'days'}</span>
        </div>
      </GlassCard>
    </div>
  );
}

```

### `features/focus/FocusHistory.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Eye, List, Play } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/EmptyState';
import type { FocusHistoryRow } from './focusHelpers';
import { fmtDuration } from './focusHelpers';
import { celebrateFocusCompletion, hasSeenCompletion, markCompletionSeen } from './focusConfetti';

interface FocusHistoryProps {
  history: FocusHistoryRow[];
  onStartFirstSession: () => void;
}

const OUTCOME_META: Record<string, { icon: typeof CheckCircle2; color: string; badge: 'default' | 'destructive' | 'secondary' }> = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400', badge: 'default' },
  failed: { icon: XCircle, color: 'text-rose-400', badge: 'destructive' },
  aborted: { icon: AlertTriangle, color: 'text-amber-400', badge: 'secondary' },
  active: { icon: Clock, color: 'text-pink-400', badge: 'secondary' },
};

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

function SessionCard({ row }: { row: FocusHistoryRow }) {
  const meta = OUTCOME_META[row.outcome] || OUTCOME_META.active;
  const Icon = meta.icon;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (row.outcome === 'completed' && !hasSeenCompletion(row.id)) {
      celebrateFocusCompletion(cardRef.current);
      markCompletionSeen(row.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.outcome]);

  return (
    <motion.div ref={cardRef} variants={itemVariants}>
      <GlassCard variant="interactive" className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg bg-zinc-800/60 flex items-center justify-center shrink-0 ${meta.color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-zinc-200 tabular-nums">
              {row.actual_sec ? fmtDuration(row.actual_sec) : fmtDuration(row.planned_sec)}
            </span>
            <span className="text-[11px] text-zinc-500">of {fmtDuration(row.planned_sec)} planned</span>
            <Badge variant={meta.badge}>{row.outcome}</Badge>
            {row.strictness === 'non_allowed' && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <Eye className="w-3 h-3" /> Strict
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {new Date(row.started_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            {row.outcome === 'failed' && row.broke_on_name && (
              <span className="text-rose-400"> -- broke on {row.broke_on_name}</span>
            )}
            {row.return_count ? <span> -- returned {row.return_count}x</span> : null}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Session History: card-based (never a table), with a first-view confetti
// moment on completed sessions and an honest "what broke it" note on failures.
export function FocusHistory({ history, onStartFirstSession }: FocusHistoryProps) {
  const emptyAction = { label: 'Start your first session', onClick: onStartFirstSession };
  if (history.length === 0) {
    return (
      <GlassCard>
        <h3 className="text-sm font-semibold text-zinc-300 mb-1 flex items-center gap-2">
          <List className="w-4 h-4 text-zinc-400" />
          Session history
        </h3>
        <EmptyState
          iconComponent={Clock}
          title="No focus sessions yet"
          description="Your first deep-work session is one click away."
          action={emptyAction}
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
        <List className="w-4 h-4 text-zinc-400" />
        Session history
      </h3>
      <motion.div className="space-y-2 max-h-[420px] overflow-y-auto ws-scroll pr-1" initial="hidden" animate="show" variants={listVariants}>
        {history.map(row => <SessionCard key={row.id} row={row} />)}
      </motion.div>
    </GlassCard>
  );
}

export { Play as StartIcon };

```

### `features/focus/FocusInsights.tsx`

```tsx
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Sparkles, Clock } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { SectionHeader } from '../../components/SectionHeader';
import type { FocusHistoryRow } from './focusHelpers';
import { computeWeeklyTrend, computeBestHour, computeAvgSessionLength, fmtDuration } from './focusHelpers';

interface FocusInsightsProps {
  history: FocusHistoryRow[];
}

// Bonus section: only renders once there is at least one completed session
// to say something meaningful about -- otherwise it would just be an empty
// chart, which the anti-slop rules explicitly call out as a missing state.
export function FocusInsights({ history }: FocusInsightsProps) {
  const hasCompleted = history.some(h => h.outcome === 'completed');
  const trend = useMemo(() => computeWeeklyTrend(history), [history]);
  const bestHour = useMemo(() => computeBestHour(history), [history]);
  const avgLength = useMemo(() => computeAvgSessionLength(history), [history]);

  if (!hasCompleted) return null;

  const chartData = {
    labels: trend.map(d => d.label),
    datasets: [
      {
        label: 'Focus minutes',
        data: trend.map(d => Math.round(d.focusSec / 60)),
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236,72,153,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1, titleColor: '#e4e4e7', bodyColor: '#a1a1aa', padding: 10, cornerRadius: 8 } },
    scales: {
      x: { display: true, grid: { display: false }, ticks: { color: '#71717a', font: { size: 10 } } },
      y: { display: false },
    },
  };

  return (
    <GlassCard>
      <SectionHeader title="Focus insights" icon={<TrendingUp className="w-4 h-4" />} />
      <div className="h-28 mb-4">
        <Line data={chartData} options={chartOptions} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-zinc-800/40 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Best focus time</p>
            <p className="text-sm font-semibold text-zinc-200">{bestHour ? bestHour.label : 'Not enough data'}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-zinc-800/40 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-pink-400 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Avg session length</p>
            <p className="text-sm font-semibold text-zinc-200">{fmtDuration(avgLength)}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

```

### `features/focus/FocusSection.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Focus as FocusIcon } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { LoadingState } from '../../components/LoadingState';
import { useFocusSession } from '../../hooks/useFocusSession';
import { FocusTimer } from './FocusTimer';
import { FocusStats } from './FocusStats';
import { FocusHistory } from './FocusHistory';
import { FocusInsights } from './FocusInsights';
import { computeTodayStats, computeStreak, type FocusHistoryRow } from './focusHelpers';

// The Deep Focus section, embedded inside ProductivityPage (Activity ->
// Productivity tab) instead of living at a standalone /focus route. Owns its
// own state via useFocusSession -- ProductivityPage does not need to pass it
// any props.
export function FocusSection() {
  const { state, history, start, stop } = useFocusSession();
  const [mins, setMins] = useState(25);
  const [strict, setStrict] = useState<'distracting' | 'non_allowed'>('distracting');
  const [justCompleted, setJustCompleted] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);

  useEffect(() => {
    const hasApi = !!(window as any).deskflowAPI?.focus;
    setApiMissing(!hasApi);
  }, []);

  useEffect(() => {
    if (!state) return;
    if (!state.active && history[0]?.outcome === 'completed') {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state, history]);

  const rows = history as unknown as FocusHistoryRow[];
  const todayStats = computeTodayStats(rows);
  const streak = computeStreak(rows);

  const handleStart = () => start(mins * 60, strict);
  const handleStop = () => stop();

  if (apiMissing) {
    return (
      <div>
        <SectionHeader title="Deep Focus" icon={<FocusIcon className="w-4 h-4" />} />
        <LoadingState variant="skeleton" className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Deep Focus" icon={<FocusIcon className="w-4 h-4" />} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <FocusTimer
            state={state}
            mins={mins}
            onMinsChange={setMins}
            strict={strict}
            onStrictChange={setStrict}
            onStart={handleStart}
            onStop={handleStop}
            justCompleted={justCompleted}
          />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <FocusStats stats={todayStats} streak={streak} />
          <FocusHistory history={rows} onStartFirstSession={handleStart} />
          <FocusInsights history={rows} />
        </div>
      </div>
    </div>
  );
}

```


## 3. Integration code

### `ProductivityPage.tsx`

Two changes only. Add the import next to the other component imports:

```tsx
import { Badge } from '../components/ui/badge';
import { FocusSection } from '../features/focus/FocusSection';
```

Then render it as a full-width section, below the existing Insights card and above
the "How is productivity calculated?" details block (i.e. below the score hero,
charts, and Insights card the file already renders):

```tsx
      {/* Deep Focus -- embedded section, not a standalone page */}
      <FocusSection />

      {/* Calculation Explanation */}
      <details className="rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60">
```

No props are passed. `FocusSection` calls `useFocusSession()` itself and is fully
self-sufficient -- `ProductivityPage` does not need `logs`, `browserLogs`, or any
of its existing props to reach it.

### `App.tsx`

Three removals, no additions:

1. Remove the import:
```tsx
import FocusPage from './pages/FocusPage';   // REMOVED
```
2. Remove the sidebar entry from the `sidebarItems` array:
```tsx
{ icon: Brain, label: 'Focus', path: '/focus' },   // REMOVED
```
(`Brain` is now unused in `App.tsx` and was removed from the lucide-react import
line too -- left in place it would just be dead code.)

3. Remove the route:
```tsx
<Route path="/focus" element={<FocusPage />} />   // REMOVED
```

### Deleted file

`src/pages/FocusPage.tsx` is deleted outright. Every piece of its logic (presets,
strict toggle, start/stop, today's stats, history table) has been rebuilt across
`FocusTimer.tsx`, `FocusStats.tsx`, and `FocusHistory.tsx` -- nothing from the old
page is silently dropped, it is only visually and structurally upgraded.

## 4. CSS / Tailwind classes (exact, by element)

| Element | Classes |
|---|---|
| Session control card | `GlassCard accent="pink"` (renders `bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50` + a pink left rail) |
| Section header | `text-sm font-semibold text-zinc-300 flex items-center gap-2` |
| Status badge | DeskFlow `Badge` (`default` variant = `bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20`) |
| Countdown digits | `text-5xl font-bold tabular-nums font-mono text-white` (JetBrains Mono via the codebase's global `.font-mono` rule) |
| Countdown caption | `text-[10px] text-zinc-500 uppercase tracking-wider mt-1` |
| Preset grid | `grid grid-cols-6 gap-2 mb-3` |
| Preset chip (active) | `bg-pink-500/20 text-pink-300 border border-pink-500/30` |
| Preset chip (inactive) | `bg-zinc-800/60 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800` |
| Strict toggle row | `flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/40 mb-3` |
| Strict badge (on) | `bg-amber-500/15 text-amber-300` |
| Start button | `bg-emerald-500 text-white hover:bg-emerald-400` |
| End button | `bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25` |
| Stat cards (4-up) | `grid grid-cols-2 sm:grid-cols-4 gap-3`, each a `GlassCard className="p-4"` |
| Stat label | `text-[10px] uppercase tracking-wider` on `text-zinc-500` |
| Stat value | `text-2xl font-bold tabular-nums font-mono text-white` (completion rate recolors via `completionColor()`: emerald >=75%, amber >=40%, zinc otherwise) |
| History card | `GlassCard variant="interactive"` (adds hover lift + pointer cursor) |
| History outcome dot | `w-9 h-9 rounded-lg bg-zinc-800/60` tinted by outcome color |
| History empty state | existing `EmptyState` component, `iconComponent={Clock}` |
| Insights card | `GlassCard` + `SectionHeader`, chart height `h-28`, stat tiles `p-3 rounded-lg bg-zinc-800/40` |
| Layout grid | `grid grid-cols-1 lg:grid-cols-3 gap-5` -- timer `lg:col-span-1`, stats/history/insights `lg:col-span-2` |

All radii are `rounded-xl`/`rounded-lg` (never `rounded-2xl`+), all card padding is
`p-4`/`p-5`, all colors come from DeskFlow's existing pink/emerald/amber/rose scale
-- no purple/indigo anywhere.

## 5. Animation specs

| Moment | Implementation |
|---|---|
| Ring fill | `AnimatedCircularProgressBar` -- SVG `stroke-dashoffset` driven by a `useSpring` (idle/settle) or CSS-transition-linear mode (`linear` prop) while a session is running, so the ring depletes in real time over the session duration. Only `stroke-dashoffset` (not layout) is animated. |
| Countdown digits | `NumberTicker` (existing DeskFlow component) with a `formatter` that renders `MM:SS`; `duration={600}` while active for a smooth glide between seconds, `duration={200}` when idle. Automatically renders instantly (no spring) when `prefers-reduced-motion` is set, per the component's own `useReducedMotion` check. |
| Preset selection | `whileTap={ { scale: 0.95 } }` on `motion.button` (note the spaced braces -- required for valid JSX). |
| Idle <-> Active crossfade | `AnimatePresence mode="wait"` wrapping two `motion.div` keyed `"idle-controls"` / `"active-controls"`, each `initial={ { opacity: 0, y: 6 } }` / `animate={ { opacity: 1, y: 0 } }` / `exit={ { opacity: 0, y: -6 } }`, `duration: 0.25`, `ease: [0.16, 1, 0.3, 1]`. |
| Session-complete celebration | `celebrateFocusCompletion()` in `focusConfetti.ts` -- a pink/emerald `canvas-confetti` burst, fired once per session id (tracked via a small localStorage "seen" list in the same file) the first time a completed session card mounts. Skips entirely under `prefers-reduced-motion`. |
| Ambient active-session texture | `Particles` component (new, `src/components/ui/particles.tsx`) -- a low-opacity (`opacity=0.18`), slow-drifting canvas dot field rendered only while a session is active, paused on tab hidden and under reduced motion. This is the *one* ambient layer on the card, per the anti-slop "at most one ambient accent" rule. |
| History list entrance | `staggerChildren: 0.04` via framer-motion `variants`, each card `hidden: { opacity: 0, y: 8 } -> show: { opacity: 1, y: 0 }`. |
| Stat number changes | Native to `NumberTicker` (spring-based count from old value to new). |

Motion level: this section runs at the same **L2 (Responsive)** level as the rest
of ProductivityPage -- consistent, not louder than its surroundings -- with the
confetti burst as the one deliberate, rare L3 moment (a genuine completion, not a
routine interaction).

## 6. State management

```
useFocusSession()  (existing hook, untouched)
  |-- state: FocusPublicState | null      (active, endsAt, remainingSec, strictness, paused)
  |-- history: FocusHistoryRow[]          (from focus:history IPC)
  |-- start(durationSec, strictness)
  |-- stop()
        |
        v
FocusSection (owns local UI state only)
  |-- mins, setMins                (selected preset, default 25)
  |-- strict, setStrict             ('distracting' | 'non_allowed')
  |-- justCompleted, setJustCompleted   (derived: true for 4s after state.active flips
  |                                      false and the newest history row is 'completed')
  |-- apiMissing                    (true if window.deskflowAPI.focus is absent --
  |                                   e.g. a non-Electron preview -- renders a
  |                                   skeleton instead of crashing)
  |
  |-- computeTodayStats(history)  -> FocusStats
  |-- computeStreak(history)      -> FocusStats
  |-- history                     -> FocusHistory
  |-- history                     -> FocusInsights (self-guards: returns null with <1 completed session)
  \-- state, mins, strict         -> FocusTimer (start/stop passed down as callbacks)
```

All derived numbers (today's totals, streak, weekly trend, best hour, average
length) are pure functions in `focusHelpers.ts` that take the same `history` array
-- nothing is recomputed by the backend, and nothing is duplicated in local state.

## 7. Empty / loading / error states

| State | Where | UI |
|---|---|---|
| **No `deskflowAPI.focus` bridge** (e.g. web preview) | `FocusSection` | Section header renders normally, body swaps to the existing `LoadingState variant="skeleton"` instead of throwing on `undefined` calls. |
| **No sessions ever** | `FocusHistory` | `EmptyState` with a clock icon, "No focus sessions yet" / "Your first deep-work session is one click away", and a **Start your first session** button wired directly to `handleStart` (fires with whatever preset is currently selected in `FocusTimer`). |
| **No completed sessions yet** (bonus section) | `FocusInsights` | Renders **nothing** (returns `null`) rather than an empty chart -- avoids the "empty chart" anti-pattern; it reappears automatically the moment one session completes. |
| **Active session** | `FocusTimer` | Ring animates in `linear` mode toward 0%, countdown ticks down, `Badge` reads "Active", ambient `Particles` layer turns on, End button is rose/danger styled. |
| **Session just completed** | `FocusTimer` + `FocusHistory` | Ring briefly turns emerald (`justCompleted` flag, auto-clears after 4s) and the `Badge` reads "Completed"; the corresponding history card fires the one-time confetti burst. |
| **Session failed / aborted** | `FocusHistory` | Rose (`failed`) or amber (`aborted`) icon + `Badge`, with an explicit `-- broke on {broke_on_name}` note for failures and a `-- returned Nx` note when `return_count > 0`, so the user always knows *why* a session ended early -- never a bare red X. |

## Anti-slop checklist (self-audit)

- [x] No purple/indigo -- pink/emerald/amber/rose only, matching the existing DeskFlow scale.
- [x] No table for history -- card list via `GlassCard variant="interactive"`.
- [x] No plain-text timer -- `AnimatedCircularProgressBar` + `NumberTicker`.
- [x] Empty / loading / active / completed / failed / aborted / no-bridge states all handled explicitly.
- [x] Icons are all `lucide-react`, no emoji, no inline SVG (the ring itself is a real `<svg>` component, not a decorative icon).
- [x] Every surface is a glass layer (`bg-zinc-900/60` + `backdrop-blur-xl`), nothing opaque.
- [x] Max radius `rounded-xl`, card padding `p-4`/`p-5`.
- [x] Fonts: Geist/Inter body, JetBrains Mono for the countdown and all `tabular-nums` values (inherited from the codebase's global `.font-mono` rule).
- [x] `prefers-reduced-motion` respected in `NumberTicker` (existing), `AnimatedCircularProgressBar` (new, jumps instead of springs), `Particles` (new, doesn't render its loop), and `celebrateFocusCompletion` (skips entirely).
- [x] Dark mode only -- no light-mode class variants introduced anywhere.
