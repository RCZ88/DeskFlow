import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Eye, List } from 'lucide-react';
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
