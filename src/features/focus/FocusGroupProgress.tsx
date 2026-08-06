import { useMemo } from 'react';
import { Target, Flame } from 'lucide-react';
import { AnimatedCircularProgressBar } from '../../components/ui/animated-circular-progress-bar';
import { NumberTicker } from '../../components/ui/number-ticker';
import { DotPattern } from '../../components/ui/dot-pattern';
import { GlassCard } from '../../components/GlassCard';
import { Badge } from '../../components/ui/badge';
import type { FocusGroup } from '../../hooks/useFocusGroups';
import type { FocusHistoryRow } from './focusHelpers';
import { computeGroupDailyProgress, computeGroupStreak, fmtDuration, groupAccent } from './focusHelpers';

interface FocusGroupProgressProps {
  groups: FocusGroup[];
  selectedId: number | null;
  history: FocusHistoryRow[];
  usageMap: Map<number, number[]>;
}

function GroupProgressCard({
  group,
  attributedSessionIds,
  selected,
  history,
}: {
  group: FocusGroup;
  attributedSessionIds: number[];
  selected: boolean;
  history: FocusHistoryRow[];
}) {
  const progress = useMemo(
    () => computeGroupDailyProgress(group, history, attributedSessionIds),
    [group, history, attributedSessionIds],
  );
  const streak = useMemo(
    () => computeGroupStreak(history, attributedSessionIds),
    [history, attributedSessionIds],
  );
  const accent = groupAccent(group.name);

  if (!group.daily_goal_sec || group.daily_goal_sec <= 0) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl p-5 bg-zinc-900/95 border ${
          selected ? 'border-white/15 shadow-lg' : 'border-zinc-800/60'
        }`}
        style={selected ? { boxShadow: `0 0 24px ${accent}30` } : undefined}
      >
        <DotPattern className="text-white" opacity={0.04} gap={18} />
        <div
          className="absolute top-0 left-5 right-5 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
        <div className="relative flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-zinc-200 truncate">{group.name}</span>
          {group.goal_category && <Badge variant="secondary" className="text-[9px]">{group.goal_category}</Badge>}
        </div>
        <div className="relative rounded-lg border border-emerald-500/25 bg-emerald-500/5 flex items-center gap-2 px-3 py-2.5">
          <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-emerald-300">Set a daily goal to track progress.</span>
        </div>
      </div>
    );
  }

  const noSessionsToday = progress.currentSec === 0;
  const title = group.goal_category && noSessionsToday
    ? 'No sessions matched this category today.'
    : undefined;

  return (
    <div
      title={title}
      className={`relative overflow-hidden rounded-xl p-5 bg-zinc-900/95 border ${
        selected
          ? 'border-white/15 shadow-lg sm:col-span-2'
          : 'border-zinc-800/60'
      }`}
      style={selected ? { boxShadow: `0 0 24px ${accent}30` } : undefined}
    >
      <DotPattern className="text-white" opacity={0.04} gap={18} />
      <div
        className="absolute top-0 left-5 right-5 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-zinc-200 truncate">{group.name}</span>
        {group.goal_category && (
          <Badge variant="secondary" className="text-[9px]">{group.goal_category}</Badge>
        )}
      </div>

      <div className={`relative flex items-center gap-4 ${selected ? 'justify-center' : ''}`}>
        <AnimatedCircularProgressBar
          value={progress.pct}
          size={120}
          strokeWidth={8}
          gaugePrimaryColor="#ec4899"
          gaugeSecondaryColor="rgba(255,255,255,0.06)"
          linear
          linearDurationMs={800}
        >
          <div className="flex flex-col items-center">
            <NumberTicker value={progress.pct} suffix="%" className="text-2xl font-mono text-pink-300" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1">today</span>
          </div>
        </AnimatedCircularProgressBar>

        <div className="space-y-2 min-w-0">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Daily goal</p>
            <p className="text-sm font-bold tabular-nums font-mono text-white truncate">
              {fmtDuration(progress.goalSec)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Completed</p>
            <p className="text-sm font-bold tabular-nums font-mono text-pink-300">
              {fmtDuration(progress.currentSec)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] font-mono tabular-nums text-zinc-400">
              {streak} {streak === 1 ? 'day' : 'days'} streak
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FocusGroupProgress({ groups, selectedId, history, usageMap }: FocusGroupProgressProps) {
  if (groups.length === 0) {
    return (
      <GlassCard className="bg-zinc-900/95 border-zinc-800/60">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-pink-400" />
            Group progress
          </h3>
        </div>
        <p className="text-[12px] text-zinc-500 text-center py-4">No groups created.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="bg-zinc-900/95 border-zinc-800/60">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Target className="w-4 h-4 text-pink-400" />
          Group progress
        </h3>
        <span className="text-[10px] text-zinc-500">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map(g => (
          <GroupProgressCard
            key={g.id}
            group={g}
            history={history}
            attributedSessionIds={usageMap.get(g.id) ?? []}
            selected={g.id === selectedId}
          />
        ))}
      </div>
    </GlassCard>
  );
}
