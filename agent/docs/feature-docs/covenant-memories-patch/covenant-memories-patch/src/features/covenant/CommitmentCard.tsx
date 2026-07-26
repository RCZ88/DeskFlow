import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, BookText, Radar } from 'lucide-react';
import { WarmCard } from '../warmth/WarmCard';
import { StreakFlame } from './StreakFlame';
import { TotalPracticeStat } from './TotalPracticeStat';
import { JournalDrawer } from './JournalDrawer';
import type { Commitment, StreakStats } from './types';
import { WARM_COLORS } from './covenantColors';
import { daysBetween, todayStr } from './storage';

interface CommitmentCardProps {
  commitment: Commitment;
  stats: StreakStats;
  isDoneToday: boolean;
  onToggleToday: () => void;
  recentDates: { date: string; done: boolean; due: boolean }[];
}

const tapScale = { scale: 0.94 };
const chevronTransition = { duration: 0.15 };
const drawerMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};
const drawerWrapStyle = { overflow: 'hidden' };

// The daily history strip deliberately never renders a red X for a missed
// day -- a due-but-missed day is just a hollow ring, same neutral tone as a
// not-due day, matching the grace-reset requirement all the way down to the
// smallest visual detail.
function HistoryStrip({ recentDates, colorHex }: { recentDates: CommitmentCardProps['recentDates']; colorHex: string }) {
  return (
    <div className="flex items-center gap-1 mt-3">
      {recentDates.map((d) => {
        const dotStyle = {
          background: d.done ? colorHex : 'transparent',
          border: d.done ? 'none' : d.due ? `1.5px solid ${colorHex}40` : '1.5px solid var(--border-subtle)',
        };
        return <div key={d.date} title={d.date} className="w-2.5 h-2.5 rounded-full transition-colors" style={dotStyle} />;
      })}
    </div>
  );
}

export function CommitmentCard({ commitment, stats, isDoneToday, onToggleToday, recentDates }: CommitmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const c = WARM_COLORS[commitment.color];
  const chevronAnimate = { rotate: expanded ? 180 : 0 };

  return (
    <WarmCard className="relative">
      <div className="flex items-start gap-4">
        <StreakFlame streak={stats.current} color={commitment.color} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{commitment.name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {commitment.detection.enabled && (
                <span title="Auto-detected from activity" className="text-[var(--text-muted)]"><Radar className="w-3.5 h-3.5" /></span>
              )}
              <motion.button
                whileTap={tapScale}
                onClick={onToggleToday}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  isDoneToday
                    ? `${c.bg} ${c.text} ${c.border}`
                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800'
                }`}
              >
                <Check className="w-3 h-3" />
                {isDoneToday ? 'Done today' : 'Mark done'}
              </motion.button>
            </div>
          </div>
          {commitment.description && (
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{commitment.description}</p>
          )}
          <HistoryStrip recentDates={recentDates} colorHex={c.hex} />
          <TotalPracticeStat stats={stats} />
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-3 flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <BookText className="w-3 h-3" />
            Today's journal
            <motion.span animate={chevronAnimate} transition={chevronTransition}>
              <ChevronDown className="w-3 h-3" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={drawerMotion.initial}
                animate={drawerMotion.animate}
                exit={drawerMotion.exit}
                transition={drawerMotion.transition}
                style={drawerWrapStyle}
              >
                <div className="pt-2">
                  <JournalDrawer commitmentId={commitment.id} date={todayStr()} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </WarmCard>
  );
}

export function buildRecentDates(commitment: Commitment, completions: { commitmentId: string; date: string }[], days = 14) {
  const done = new Set(completions.filter(c2 => c2.commitmentId === commitment.id).map(c2 => c2.date));
  const out: { date: string; done: boolean; due: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = todayStr(-i);
    const weekday = new Date(date + 'T00:00:00').getDay();
    const due = commitment.cadence === 'daily' || commitment.weeklyTargetDays.includes(weekday);
    out.push({ date, done: done.has(date), due });
  }
  return out;
}

void daysBetween;
