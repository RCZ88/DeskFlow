import { motion } from 'framer-motion';
import { Moon, Bed, Sunrise, Clock, ChevronRight } from 'lucide-react';
import { DurationPicker } from './DurationPicker';

interface TimeState {
  hours: number;
  minutes: number;
}

export default function SleepDetectionModal({
  data,
  customBedtime,
  customWaketime,
  fellAsleepAt,
  wakeUpAt,
  onBedtimeChange,
  onWaketimeChange,
  onFellAsleepAtChange,
  onWakeUpAtChange,
  onConfirm,
  onDismiss,
}: {
  data: { gapMinutes: number; suggestedBedtime: string; suggestedWakeTime: string };
  customBedtime: TimeState;
  customWaketime: TimeState;
  fellAsleepAt: TimeState;
  wakeUpAt: TimeState;
  onBedtimeChange: (v: TimeState) => void;
  onWaketimeChange: (v: TimeState) => void;
  onFellAsleepAtChange: (v: TimeState) => void;
  onWakeUpAtChange: (v: TimeState) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const durBed = customBedtime.hours * 60 + customBedtime.minutes;
  let durWake = customWaketime.hours * 60 + customWaketime.minutes;
  if (durWake <= durBed) durWake += 24 * 60;
  const totalInactive = durWake - durBed;

  const asleep = fellAsleepAt.hours * 60 + fellAsleepAt.minutes;
  let awake = wakeUpAt.hours * 60 + wakeUpAt.minutes;
  if (awake < asleep) awake += 24 * 60;
  const actualSleep = Math.max(0, awake - asleep);

  const asleepFromOff = (() => {
    let a = fellAsleepAt.hours * 60 + fellAsleepAt.minutes;
    let b = customBedtime.hours * 60 + customBedtime.minutes;
    if (a < b) a += 24 * 60;
    return a - b;
  })();

  const wakeToOn = (() => {
    let w = wakeUpAt.hours * 60 + wakeUpAt.minutes;
    let o = customWaketime.hours * 60 + customWaketime.minutes;
    if (o < w) o += 24 * 60;
    return o - w;
  })();

  function makeDayAwareDates() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bedMin = customBedtime.hours * 60 + customBedtime.minutes;
    const fallMin = fellAsleepAt.hours * 60 + fellAsleepAt.minutes;
    const wakeMin = wakeUpAt.hours * 60 + wakeUpAt.minutes;
    const onMin = customWaketime.hours * 60 + customWaketime.minutes;

    let fallDay = fallMin < bedMin ? 1 : 0;
    let fallAdj = fallMin + fallDay * 1440;
    let wakeDay = wakeMin < fallAdj ? fallDay + 1 : fallDay;
    let wakeAdj = wakeMin + wakeDay * 1440;
    let onDay = onMin < wakeAdj ? wakeDay + 1 : wakeDay;

    return { bedMin, fallMin, wakeMin, onMin, fallDay, wakeDay, onDay };
  }

  function fmtWithDay(h: number, m: number, dayOffset: number) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} · ${time}`;
  }

  function fmtDur(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
        className="bg-zinc-900/95 border border-zinc-700/50 rounded-xl w-full max-w-lg max-h-[min(680px,90vh)] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Decorative bar */}
        <div className="h-1 bg-gradient-to-r from-indigo-500/40 via-violet-500/40 to-indigo-500/40" />

        <div className="p-5">
          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 ring-1 ring-indigo-500/20">
                <Moon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Were you sleeping?</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Inactive for <span className="text-indigo-300 font-medium">{fmtDur(data.gapMinutes)}</span>
                </p>
              </div>
            </div>
            <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* ── Timeline visualization ── */}
          <div className="mb-5">
            <div className="flex h-8 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/30">
              <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-500 bg-zinc-800/50">Pre-sleep</div>
              <div className="flex-[3] flex items-center justify-center text-xs text-indigo-300 bg-indigo-900/40 font-medium">Sleep</div>
              <div className="flex-[0.8] flex items-center justify-center text-[10px] text-zinc-500 bg-zinc-800/50">Wake</div>
            </div>
            {(() => {
              const { fallDay, wakeDay, onDay } = makeDayAwareDates();
              return (
                <div className="flex justify-between mt-1.5 text-[10px] text-zinc-600 font-mono tabular-nums">
                  <span>{fmtWithDay(customBedtime.hours, customBedtime.minutes, 0)}</span>
                  <span>{fmtWithDay(fellAsleepAt.hours, fellAsleepAt.minutes, fallDay)}</span>
                  <span>{fmtWithDay(wakeUpAt.hours, wakeUpAt.minutes, wakeDay)}</span>
                  <span>{fmtWithDay(customWaketime.hours, customWaketime.minutes, onDay)}</span>
                </div>
              );
            })()}
          </div>

          {/* ── Summary stats ── */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] mb-1">
                <Clock className="w-3 h-3" />
                <span>Total inactive</span>
              </div>
              <span className="text-sm font-semibold text-zinc-100">{fmtDur(totalInactive)}</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="flex items-center gap-1.5 text-indigo-400/70 text-[10px] mb-1">
                <Bed className="w-3 h-3" />
                <span>Actual sleep</span>
              </div>
              <span className="text-sm font-semibold text-indigo-300">{fmtDur(actualSleep)}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <div className="flex items-center gap-1.5 text-amber-500/60 text-[10px] mb-1">
                <span className="text-[11px]">🌙</span>
                <span>Pre-sleep</span>
              </div>
              <span className="text-sm font-semibold text-amber-300">+{fmtDur(asleepFromOff)}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <div className="flex items-center gap-1.5 text-emerald-500/60 text-[10px] mb-1">
                <Sunrise className="w-3 h-3" />
                <span>Wake→App</span>
              </div>
              <span className="text-sm font-semibold text-emerald-300">+{fmtDur(wakeToOn)}</span>
            </div>
          </div>

          {/* ── Duration pickers ── */}
          <div className="bg-zinc-800/30 rounded-xl p-4 mb-5 border border-zinc-700/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-zinc-500 text-center mb-2">Device Off</label>
                <DurationPicker
                  hours={customBedtime.hours}
                  minutes={customBedtime.minutes}
                  onHoursChange={h => onBedtimeChange({ ...customBedtime, hours: h })}
                  onMinutesChange={m => onBedtimeChange({ ...customBedtime, minutes: m })}
                  maxHours={23}
                  hourLabel="Hr"
                  minuteLabel="Min"
                  wrap
                />
              </div>
              <div>
                <label className="block text-[11px] text-amber-500/70 text-center mb-2">Fell asleep</label>
                <DurationPicker
                  hours={fellAsleepAt.hours}
                  minutes={fellAsleepAt.minutes}
                  onHoursChange={h => onFellAsleepAtChange({ ...fellAsleepAt, hours: h })}
                  onMinutesChange={m => onFellAsleepAtChange({ ...fellAsleepAt, minutes: m })}
                  maxHours={23}
                  hourLabel="Hr"
                  minuteLabel="Min"
                  wrap
                />
              </div>
              <div>
                <label className="block text-[11px] text-amber-500/70 text-center mb-2">Woke up</label>
                <DurationPicker
                  hours={wakeUpAt.hours}
                  minutes={wakeUpAt.minutes}
                  onHoursChange={h => onWakeUpAtChange({ ...wakeUpAt, hours: h })}
                  onMinutesChange={m => onWakeUpAtChange({ ...wakeUpAt, minutes: m })}
                  maxHours={23}
                  hourLabel="Hr"
                  minuteLabel="Min"
                  wrap
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 text-center mb-2">Device On</label>
                <DurationPicker
                  hours={customWaketime.hours}
                  minutes={customWaketime.minutes}
                  onHoursChange={h => onWaketimeChange({ ...customWaketime, hours: h })}
                  onMinutesChange={m => onWaketimeChange({ ...customWaketime, minutes: m })}
                  maxHours={23}
                  hourLabel="Hr"
                  minuteLabel="Min"
                  wrap
                />
              </div>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/30 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-600/20"
            >
              Confirm Sleep
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
