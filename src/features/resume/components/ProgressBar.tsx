import { Progress } from '../../../components/ui/progress';

interface ProgressBarProps {
  currentPhase: number;
  totalPhases: number;
  phaseStatus: Record<number, string>;
  overallPercent: number;
}

export function ProgressBar({ currentPhase, totalPhases, overallPercent }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-zinc-400">
          Phase {currentPhase} of {totalPhases}
        </span>
        <span className="text-xs font-semibold text-[var(--page-accent)] tabular-nums shrink-0">{overallPercent}%</span>
      </div>
      <Progress value={overallPercent} className="h-2" />
    </div>
  );
}
