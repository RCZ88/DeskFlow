import { motion } from 'framer-motion';
import { Moon, Clock, Sun, Brain, Activity } from 'lucide-react';

interface SleepSuggestion {
  icon: string;
  title: string;
  detail: string;
}

interface ParsedSleepResponse {
  score: number;
  correlation: string;
  optimalBedtime?: string;
  insomnia: string;
  suggestions: SleepSuggestion[];
}

interface SleepCardProps {
  data: ParsedSleepResponse | null;
  loading: boolean;
  error?: string;
  onAnalyze: () => void;
  onRefresh?: () => void;
}

const iconMap: Record<string, any> = { moon: Moon, sun: Sun, clock: Clock, brain: Brain, activity: Activity };

function ScoreBar({ score }: { score: number }) {
  const color =
    score < 40 ? 'bg-red-400' :
    score < 70 ? 'bg-amber-400' :
    'bg-indigo-400';
  const textColor =
    score < 40 ? 'text-red-400' :
    score < 70 ? 'text-amber-400' :
    'text-indigo-400';

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums ${textColor}`}>{score}/100</span>
    </div>
  );
}

export function SleepCard({ data, loading, error, onAnalyze, onRefresh }: SleepCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-indigo-400/15 flex items-center justify-center">
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
            <div className="h-2 w-40 bg-zinc-800/60 rounded mt-1.5 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
        </div>
        <p className="text-xs text-zinc-500 text-center">Correlating sleep and productivity data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60">
        <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-400" />
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-400/15 flex items-center justify-center">
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Sleep & Energy Optimizer</h3>
            <p className="text-[10px] text-zinc-500">How your sleep affects next-day productivity</p>
          </div>
        </div>
        <button
          onClick={onRefresh || onAnalyze}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-400/10 text-indigo-400 border border-indigo-400/30 hover:bg-indigo-400/20 transition-colors duration-150"
        >
          <Moon className="w-3 h-3" />
          {data ? 'Re-analyze' : 'Analyze Sleep'}
        </button>
      </div>

      {data ? (
        <div className="space-y-4">
          <ScoreBar score={data.score} />
          <p className="text-sm text-zinc-300 leading-relaxed">{data.correlation}</p>

          {data.optimalBedtime && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-400/5 border border-indigo-400/15">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-medium">Optimal Bedtime</span>
                <p className="text-sm text-zinc-200 font-medium">{data.optimalBedtime}</p>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/40">
            <p className="text-xs text-zinc-400 leading-relaxed">{data.insomnia}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.suggestions.map((s, i) => {
              const Icon = iconMap[s.icon] || Activity;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-400/10 flex items-center justify-center mb-2">
                    <Icon className="w-3 h-3 text-indigo-400" />
                  </div>
                  <p className="text-xs font-medium text-zinc-200 mb-1">{s.title}</p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{s.detail}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Moon className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-sm text-zinc-400 font-medium">Optimize your sleep schedule</p>
          <p className="text-xs text-zinc-600 mt-2 max-w-md">Analyze how your sleep patterns affect next-day productivity.</p>
        </div>
      )}
    </div>
  );
}
