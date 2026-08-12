import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Target, Eye, EyeOff, Focus as FocusIcon, Timer, Clock } from 'lucide-react';
import { AnimatedCircularProgressBar } from '../../components/ui/animated-circular-progress-bar';
import { Particles } from '../../components/ui/particles';
import { NumberTicker } from '../../components/ui/number-ticker';
import { ShinyButton } from '../../components/ui/shiny-button';
import { GlassCard } from '../../components/GlassCard';
import { Badge } from '../../components/ui/badge';
import type { FocusPublicState } from '../../hooks/useFocusSession';
import type { FocusGroup } from '../../hooks/useFocusGroups';
import { DragDurationBar } from './DragDurationBar';
import { fmtClock } from './focusHelpers';

const PRESETS = [
  { label: '5m', sec: 5 * 60 },
  { label: '10m', sec: 10 * 60 },
  { label: '15m', sec: 15 * 60 },
  { label: '25m', sec: 25 * 60 },
  { label: '50m', sec: 50 * 60 },
  { label: '90m', sec: 90 * 60 },
];

type FocusMode = 'timer' | 'stopwatch';

interface FocusTimerProps {
  state: FocusPublicState | null | undefined;
  mins: number;
  onMinsChange: (mins: number) => void;
  strict: 'distracting' | 'non_allowed';
  onStrictChange: (s: 'distracting' | 'non_allowed') => void;
  onStart: () => void;
  onStop: () => void;
  justCompleted: boolean;
  mode?: FocusMode;
  onModeChange?: (mode: FocusMode) => void;
  stopwatchElapsed?: number;
  groups?: FocusGroup[];
  selectedGroupId?: number | null;
  activeGroup?: FocusGroup | null;
  onStartWithGroup?: (groupId: number, durationSec: number, strictness: 'distracting' | 'non_allowed') => void;
  onDurationDrag?: (sec: number) => void;
}

const tapScale = { scale: 0.95 };
const crossfade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

export function FocusTimer({ state, mins, onMinsChange, strict, onStrictChange, onStart, onStop, justCompleted, mode = 'timer', onModeChange, stopwatchElapsed = 0, groups = [], selectedGroupId = null, activeGroup = null, onStartWithGroup, onDurationDrag }: FocusTimerProps) {
  const active = !!state?.active;
  const plannedSec = mins * 60;

  // Client-side countdown for smooth timer display between server pushes
  const [localRemaining, setLocalRemaining] = useState(state?.remainingSec ?? 0);
  const lastServerUpdateRef = useRef<number>(Date.now());

  // Sync from server state when it arrives
  useEffect(() => {
    if (state?.active && typeof state.remainingSec === 'number') {
      setLocalRemaining(state.remainingSec);
      lastServerUpdateRef.current = Date.now();
    } else if (!state?.active) {
      setLocalRemaining(plannedSec);
    }
  }, [state?.active, state?.remainingSec, state?.endsAt, plannedSec]);

  // Tick down every second when active (timer mode only)
  useEffect(() => {
    if (!active || mode === 'stopwatch') return;
    const interval = setInterval(() => {
      setLocalRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [active, mode]);

  const remainingSec = active ? localRemaining : plannedSec;
  const progressPct = active ? Math.max(0, Math.min(100, (remainingSec / plannedSec) * 100)) : 0;

  const statusLabel = active ? 'Active' : justCompleted ? 'Completed' : 'Idle';
  const statusVariant = active ? 'default' : justCompleted ? 'default' : 'secondary';

  const ringPrimary = active ? '#ec4899' : justCompleted ? '#34d399' : 'rgba(236,72,153,0.35)';

  const clockFormatter = useMemo(() => (v: number) => fmtClock(v), []);

  const [stopwatchSec, setStopwatchSec] = useState(0);
  
  useEffect(() => {
    if (active && mode === 'stopwatch') {
      const interval = setInterval(() => {
        setStopwatchSec(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (!active) {
      setStopwatchSec(0);
    }
  }, [active, mode]);

  return (
    <GlassCard accent="pink" className="relative overflow-hidden h-full">
      {active && <Particles className="opacity-60" quantity={22} color="#ec4899" />}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <FocusIcon className="w-4 h-4 text-pink-400" />
            Session control
          </h3>
          <Badge variant={statusVariant as 'default' | 'secondary'}>{statusLabel}</Badge>
        </div>

        <AnimatedCircularProgressBar
          value={active ? (mode === 'stopwatch' ? Math.min(100, (stopwatchSec / 3600) * 100) : progressPct) : 100}
          size={180}
          strokeWidth={12}
          gaugePrimaryColor={ringPrimary}
          gaugeSecondaryColor="rgba(255,255,255,0.06)"
          linear={active}
          linearDurationMs={1000}
        >
          <div className="flex flex-col items-center">
            <NumberTicker
              value={mode === 'stopwatch' ? stopwatchSec : remainingSec}
              duration={active ? 600 : 200}
              formatter={clockFormatter}
              className="text-6xl font-bold tabular-nums font-mono text-white"
            />
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider mt-2">
              {active ? (mode === 'stopwatch' ? 'elapsed' : 'remaining') : `${mins} min session`}
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
                {state!.strictness === 'non_allowed' ? 'Strict mode -- only allowed & productive apps' : 'Blocking distracting apps and sites'}
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
              <div className="w-full">
                {activeGroup && (
                  <div className="mb-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-pink-300 truncate">{activeGroup.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {activeGroup.allowed_apps.length + activeGroup.allowed_domains.length + activeGroup.allowed_categories.length > 0
                            ? `${activeGroup.allowed_apps.length} apps · ${activeGroup.allowed_domains.length} sites · ${activeGroup.allowed_categories.length} categories`
                            : 'All productive categories'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <motion.button
                  whileTap={tapScale}
                  onClick={() => onModeChange?.('timer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    mode === 'timer'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  Timer
                </motion.button>
                <motion.button
                  whileTap={tapScale}
                  onClick={() => onModeChange?.('stopwatch')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    mode === 'stopwatch'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Challenge
                </motion.button>
              </div>

              {mode === 'timer' && (
                <>
                  {onDurationDrag && (
                    <DragDurationBar valueSec={mins * 60} onChange={onDurationDrag} />
                  )}
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
                </>
              )}

              <button
                onClick={() => onStrictChange(strict === 'non_allowed' ? 'distracting' : 'non_allowed')}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800/40 mb-3 text-left"
              >
                <span className="flex items-center gap-2 text-[12px] text-zinc-300">
                  {strict === 'non_allowed' ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
                  Strict mode
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${strict === 'non_allowed' ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
                  {strict === 'non_allowed' ? 'Only allowed & productive' : 'Blocks distracting apps only'}
                </span>
              </button>
              {strict === 'non_allowed' && (
                <p className="text-[10px] text-amber-400/60 leading-relaxed text-center mb-3 px-2">
                  Hard whitelist: your allowed apps, sites and categories, plus productive apps — everything else triggers a focus reminder overlay.
                  Requires tracking set to "Track as Normal" in Settings for full enforcement.
                </p>
              )}

              <ShinyButton
                accent="16,185,129"
                borderClass="border-emerald-500/40"
                onClick={() => {
                  if (mode !== 'stopwatch' && selectedGroupId != null && onStartWithGroup) onStartWithGroup(selectedGroupId, mins * 60, strict);
                  else onStart();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm"
              >
                <Play className="w-4 h-4" />
                {mode === 'stopwatch'
                  ? 'Start challenge'
                  : selectedGroupId != null
                    ? `Start ${activeGroup?.name ?? groups.find(g => g.id === selectedGroupId)?.name ?? 'group'} focus`
                    : `Start ${mins}-min focus`}
              </ShinyButton>
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
