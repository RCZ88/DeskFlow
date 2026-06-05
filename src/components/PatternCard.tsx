import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ChevronDown, ThumbsUp, ThumbsDown, Minus, Lightbulb } from 'lucide-react';

interface PatternItem {
  name: string;
  description: string;
  impact: 'positive' | 'neutral' | 'negative';
  frequency: string;
  recommendation?: string;
}

interface ParsedPatternResponse {
  score: number;
  assessment: string;
  patterns: PatternItem[];
}

interface PatternCardProps {
  data: ParsedPatternResponse | null;
  loading: boolean;
  error?: string;
  onAnalyze: () => void;
  onRefresh?: () => void;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score < 40 ? 'bg-red-400' :
    score < 70 ? 'bg-amber-400' :
    'bg-emerald-400';
  const textColor =
    score < 40 ? 'text-red-400' :
    score < 70 ? 'text-amber-400' :
    'text-emerald-400';

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

const impactConfig = {
  positive: { icon: ThumbsUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  neutral: { icon: Minus, color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20' },
  negative: { icon: ThumbsDown, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
};

function PatternRow({ pattern, index }: { pattern: PatternItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = impactConfig[pattern.impact];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl overflow-hidden border border-zinc-800/60 bg-zinc-900/40"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/30 transition-colors duration-150"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-100">{pattern.name}</span>
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
              {pattern.impact === 'positive' ? 'Positive' : pattern.impact === 'negative' ? 'Negative' : 'Neutral'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{pattern.description}</p>
          <span className="text-[10px] text-zinc-500 mt-1 inline-block">{pattern.frequency}</span>
        </div>
        {pattern.recommendation && (
          <ChevronDown className={`w-4 h-4 text-zinc-500 mt-1 shrink-0 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      <AnimatePresence>
        {expanded && pattern.recommendation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-300 leading-relaxed">{pattern.recommendation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PatternCard({ data, loading, error, onAnalyze, onRefresh }: PatternCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl p-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="h-2 w-36 bg-zinc-800/60 rounded mt-1.5 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
        </div>
        <p className="text-xs text-zinc-500 text-center">Analyzing 30 days of activity data...</p>
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
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400" />
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Activity Pattern Analyst</h3>
            <p className="text-[10px] text-zinc-500">Hidden patterns in your last 30 days</p>
          </div>
        </div>
        <button
          onClick={onRefresh || onAnalyze}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/20 transition-colors duration-150"
        >
          <TrendingUp className="w-3 h-3" />
          {data ? 'Re-analyze' : 'Analyze Patterns'}
        </button>
      </div>

      {data ? (
        <div className="space-y-3">
          <ScoreBar score={data.score} />
          <p className="text-sm text-zinc-300 leading-relaxed mb-4">{data.assessment}</p>
          <div className="space-y-2">
            {data.patterns.map((p, i) => (
              <PatternRow key={i} pattern={p} index={i} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <TrendingUp className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-sm text-zinc-400 font-medium">Discover your productivity patterns</p>
          <p className="text-xs text-zinc-600 mt-2 max-w-md">Click "Analyze Patterns" to uncover hidden rhythms, distraction loops, and optimal work times.</p>
        </div>
      )}
    </div>
  );
}
