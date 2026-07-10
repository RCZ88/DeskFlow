import { motion, useReducedMotion } from 'framer-motion';
import { DeepFocusPanel } from '../../components/focus/DeepFocusPanel';
import { FocusRankingsCard } from '../../components/focus/FocusRankingsCard';
import { DrillDownCard } from '../../components/dashboard/DrillDownCard';

interface ProductivityFocusZoneProps {
  focusState: {
    active: boolean;
    endsAt: number | null;
    remainingSec: number;
    strictness: 'distracting' | 'non_allowed';
    paused: boolean;
  };
  focusHistory: Array<{
    id: string;
    started_at: Date;
    planned_sec: number;
    duration_seconds: number;
    outcome: 'completed' | 'failed' | 'aborted';
    broke_on_name?: string;
  }>;
  focusRankings: {
    todayBest: number;
    todayTotal: number;
    weekBest: number;
    weekTotal: number;
    allTimeBest: number;
  };
  heatmapPreview?: React.ReactNode;
  ecosystemPreview?: React.ReactNode;
  onOpenHeatmap: () => void;
  onOpenOrbit: () => void;
  onStartFocus: (durationSec: number, strictness: 'distracting' | 'non_allowed') => void;
  onEndFocus: () => void;
}

export function ProductivityFocusZone({
  focusState,
  focusHistory,
  focusRankings,
  heatmapPreview,
  ecosystemPreview,
  onOpenHeatmap,
  onOpenOrbit,
  onStartFocus,
  onEndFocus,
}: ProductivityFocusZoneProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 className="text-[15px] font-semibold text-zinc-100 mb-4">Productivity &amp; Focus</h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT — action */}
        <div className="lg:col-span-7 space-y-5">
          <DeepFocusPanel
            state={focusState}
            history={focusHistory}
            onStart={onStartFocus}
            onEnd={onEndFocus}
          />

          <div className="grid grid-cols-2 gap-4">
            <DrillDownCard
              kind="heatmap"
              title="Productivity"
              subtitle="Weekly heatmap of your focus"
              preview={heatmapPreview}
              onView={onOpenHeatmap}
            />
            <DrillDownCard
              kind="ecosystem"
              title="App Ecosystem"
              subtitle="Your top tools in orbit"
              preview={ecosystemPreview}
              onView={onOpenOrbit}
            />
          </div>
        </div>

        {/* RIGHT — context */}
        <div className="lg:col-span-5 space-y-4">
          <FocusRankingsCard rankings={focusRankings} />
        </div>
      </div>
    </motion.div>
  );
}
