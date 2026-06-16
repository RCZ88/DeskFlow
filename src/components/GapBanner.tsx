import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Sparkles, Bell, CheckSquare } from 'lucide-react';

interface GapBannerProps {
  unfilledMinutes: number;
  gapCount: number;
  onClose: () => void;
  onFillGaps: () => void;
  onDismissForever: () => void;
  showForeverOption?: boolean;
}

export const GapBanner: React.FC<GapBannerProps> = ({ 
  unfilledMinutes, 
  gapCount, 
  onClose, 
  onFillGaps,
  onDismissForever,
  showForeverOption = true
}) => {
  if (unfilledMinutes <= 0) return null;

  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}
        className="bg-amber-500/10 border-b border-amber-500/20 overflow-hidden shrink-0"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center ring-1 ring-amber-500/30 shrink-0">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-amber-200">
                  {unfilledMinutes >= 60 
                    ? `${(unfilledMinutes / 60).toFixed(1)}h` 
                    : `${unfilledMinutes}m`} unfilled time today
                </span>
                <span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                <span className="text-[11px] text-amber-500/90 font-medium">
                  {gapCount} gap{gapCount !== 1 ? 's' : ''} detected — filling them improves your insights
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onFillGaps}
              className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-sm font-semibold transition-all border border-amber-600/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              <Sparkles className="w-4 h-4" />
              Fill Gaps
            </button>

            {showDismissConfirm ? (
              <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-zinc-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                  />
                  <span>Don't show again</span>
                </label>
                <button
                  onClick={() => {
                    onDismissForever();
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors rounded-md"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowDismissConfirm(false)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDismissConfirm(true)}
                className="p-2 text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
                title="Dismiss — option to disable permanently"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};