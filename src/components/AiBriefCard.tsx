import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, X, ChevronDown, Sun, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';

interface BriefMetric {
  key: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
}

interface ParsedDailyBrief {
  signal: string;
  observation: string;
  suggestion: string;
  trend: 'improving' | 'stable' | 'declining';
  metrics: BriefMetric[];
}

interface BriefCardProps {
  content: ParsedDailyBrief | { summary: string; type?: string; modelUsed?: string } | null;
  loading: boolean;
  error?: string;
  onRegenerate: () => void;
  onDismiss: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

const trendColors: Record<string, string> = {
  improving: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  stable: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  declining: 'text-red-400 bg-red-400/10 border-red-400/20',
};

const trendArrows: Record<string, any> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendArrowColors: Record<string, string> = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  flat: 'text-zinc-500',
};

export function BriefCard({ content, loading, error, onRegenerate, onDismiss, collapsed, onToggle }: BriefCardProps) {
  const isParsed = content && 'signal' in content;

  if (collapsed) {
    return (
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onToggle}
        className="fixed top-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm cursor-pointer"
        style={{
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          borderColor: 'rgba(236, 72, 153, 0.3)',
        }}
      >
        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
        <span className="text-xs text-pink-300 font-medium">View Brief</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard className="relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #06b6d4)' }}
        />
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-400/15 flex items-center justify-center">
              <Sun className="w-3.5 h-3.5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Daily Brief</h3>
              <p className="text-[10px] text-zinc-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors duration-150 disabled:opacity-40"
              title="Regenerate"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
              title="Collapse"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="py-4">
            <LoadingState variant="spinner" />
            <p className="text-xs text-zinc-500 text-center mt-2">Generating your daily brief...</p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20">
            <p className="text-xs text-red-400">{error}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Configure your API key in Settings to enable AI features.</p>
          </div>
        )}

        {content && !loading && (
          <div className="space-y-3">
            {'summary' in content && typeof content.summary === 'string' ? (
              <>
                <p className="text-sm text-zinc-300 leading-relaxed">{content.summary}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Sparkles className="w-3 h-3 text-pink-400/60" />
                  <span className="text-[10px] text-zinc-600">Generated by {content.modelUsed || 'Unknown'}</span>
                </div>
              </>
            ) : isParsed ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${trendColors[(content as ParsedDailyBrief).trend]}`}>
                    {(content as ParsedDailyBrief).signal}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {(content as ParsedDailyBrief).trend}
                  </span>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">{(content as ParsedDailyBrief).observation}</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{(content as ParsedDailyBrief).suggestion}</p>

                {(content as ParsedDailyBrief).metrics.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(content as ParsedDailyBrief).metrics.map((m, i) => {
                      const ArrowIcon = trendArrows[m.trend];
                      return (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                          <ArrowIcon className={`w-3 h-3 ${trendArrowColors[m.trend]}`} />
                          <span className="text-xs text-zinc-400">{m.key}:</span>
                          <span className="text-xs font-medium text-zinc-200">{m.value}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Sparkles className="w-3 h-3 text-pink-400/60" />
                  <span className="text-[10px] text-zinc-600">Generated by {'modelUsed' in content ? content.modelUsed : 'AI'}</span>
                </div>
              </>
            ) : null}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
