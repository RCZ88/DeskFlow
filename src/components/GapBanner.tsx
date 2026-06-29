import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Bell, X } from 'lucide-react';

interface GapBannerProps {
  unfilledMinutes: number;
  gapCount: number;
  onOpenDrawer: () => void;
  onDismissForever: () => void;
}

export const GapBanner = ({ unfilledMinutes, gapCount, onOpenDrawer, onDismissForever }: GapBannerProps) => {
  if (unfilledMinutes <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}
        className="bg-amber-500/10 border-b border-amber-500/20 overflow-hidden shrink-0"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-amber-200 truncate">
              {unfilledMinutes >= 60
                ? `${(unfilledMinutes / 60).toFixed(1)}h`
                : `${unfilledMinutes}m`} unfilled
            </span>
            <span className="text-xs text-amber-500/80 hidden sm:inline">
              {gapCount} gap{gapCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenDrawer}
              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-semibold border border-amber-600/30 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fill
            </button>
            <button
              onClick={onDismissForever}
              className="p-1.5 rounded-lg text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              title="Dismiss forever"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};