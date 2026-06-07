import { motion } from 'framer-motion';
import { BarChart3, RefreshCw, X, CheckCircle, AlertTriangle, Target } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';

interface WeeklyReviewContent {
  wentWell: string;
  watchFor: string;
  focusSuggestion: string;
  weekStart?: string;
  weekEnd?: string;
}

interface WeeklyReviewCardProps {
  content: WeeklyReviewContent | null;
  loading: boolean;
  error?: string;
  onRegenerate: () => void;
  onDismiss: () => void;
}

export function WeeklyReviewCard({ content, loading, error, onRegenerate, onDismiss }: WeeklyReviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <GlassCard className="relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, #10b981, #f59e0b, #8b5cf6)' }}
        />
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}>
              <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Weekly Review</h3>
              {content?.weekStart && content?.weekEnd && (
                <p className="text-[10px] text-zinc-500">{content.weekStart} — {content.weekEnd}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
              title="Regenerate"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="py-4">
            <LoadingState variant="spinner" />
            <p className="text-xs text-zinc-500 text-center mt-2">Analyzing your week...</p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {content && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Went Well</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{content.wentWell}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid #f59e0b' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Watch For</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{content.watchFor}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', borderLeft: '3px solid #8b5cf6' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">Focus</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{content.focusSuggestion}</p>
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
