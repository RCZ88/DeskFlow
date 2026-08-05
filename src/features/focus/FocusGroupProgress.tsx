import { useMemo } from 'react';
import { Target, Clock, Zap } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Badge } from '../../components/ui/badge';
import type { FocusGroup } from '../../hooks/useFocusGroups';
import { fmtDuration } from './focusHelpers';

interface FocusGroupProgressProps {
  groups: FocusGroup[];
  selectedId: number | null;
}

function GroupProgressCard({ group }: { group: FocusGroup }) {
  const goalSec = group.daily_goal_sec;

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 hover:border-zinc-700/60 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          <span className="text-[13px] font-semibold text-zinc-200">{group.name}</span>
        </div>
        {group.goal_category && (
          <Badge variant="secondary" className="text-[10px]">{group.goal_category}</Badge>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-3.5 h-3.5 text-zinc-500" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Default duration</p>
          <p className="text-sm font-bold tabular-nums font-mono text-white">
            {group.default_duration != null ? fmtDuration(group.default_duration) : 'Not set'}
          </p>
        </div>
      </div>

      {goalSec && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Daily goal
            </span>
            <span className="text-[11px] font-mono tabular-nums text-pink-300">
              {fmtDuration(goalSec)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600">
            Progress tracking will appear here once group sessions are attributed to groups in the history.
          </p>
        </div>
      )}

      {!goalSec && (
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          No daily goal set — set one in the group editor
        </p>
      )}
    </div>
  );
}

export function FocusGroupProgress({ groups, selectedId }: FocusGroupProgressProps) {
  const selected = useMemo(() => groups.find(g => g.id === selectedId) ?? null, [groups, selectedId]);

  if (groups.length === 0) return null;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Target className="w-4 h-4 text-pink-400" />
          Focus groups
        </h3>
        <span className="text-[10px] text-zinc-500">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
      </div>

      {selected && (
        <div className="mb-3 p-3 rounded-lg bg-pink-500/5 border border-pink-500/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-pink-300">Active: {selected.name}</span>
          </div>
          <p className="text-[10px] text-zinc-500">
            {selected.allowed_categories.length > 0
              ? `${selected.allowed_categories.length} categories tracked`
              : 'All productive categories'}
            {selected.daily_goal_sec
              ? ` · Goal: ${fmtDuration(selected.daily_goal_sec)}/day`
              : ''}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {groups.map(g => (
          <GroupProgressCard key={g.id} group={g} />
        ))}
      </div>
    </GlassCard>
  );
}
