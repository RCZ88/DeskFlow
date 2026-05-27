import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, X } from 'lucide-react';

interface SuggestedActivity {
  id: number;
  name: string;
  color: string;
}

interface ExternalActivity {
  id: number;
  name: string;
  type: string;
  color: string;
  icon: string;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

export default function AfkPromptModal({
  suggestedActivity,
  allActivities,
  duration,
  startedAt,
  onConfirm,
  onDismiss,
}: {
  suggestedActivity: SuggestedActivity | null;
  allActivities: ExternalActivity[];
  duration: string | null;
  startedAt: string | null;
  onConfirm: (activityId: string) => void;
  onDismiss: () => void;
}) {
  const visibleActivities = allActivities.filter(a => a.name !== 'AFK' && a.name !== 'Sleep');
  const suggestId = suggestedActivity?.id?.toString();

  const [liveElapsed, setLiveElapsed] = useState<string>(() => {
    if (!startedAt) return duration || '0s';
    const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return formatElapsed(s);
  });

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setLiveElapsed(formatElapsed(s));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
        className="bg-zinc-900/95 border border-zinc-700/50 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
          {/* Gradient header accent */}
          <div className="h-1 bg-gradient-to-r from-indigo-500/40 via-emerald-500/40 to-indigo-500/40" />

          <div className="p-6">
            {/* Title row */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">Back from a break?</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Away for <span className="text-amber-300 font-mono font-medium tabular-nums">{liveElapsed}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Suggested activity */}
            {suggestedActivity && (
              <div className="mb-5">
                <p className="text-[11px] uppercase tracking-widest text-zinc-600 mb-2 font-medium">Suggested</p>
                <button
                  onClick={() => onConfirm(suggestId!)}
                  className="group relative w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border border-indigo-500/25 hover:border-indigo-500/50 transition-all text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div
                    className="w-3 h-3 rounded-full shrink-0 ring-2 ring-black/20"
                    style={{ backgroundColor: suggestedActivity.color || '#6366f1' }}
                  />
                  <div className="flex-1 min-w-0 relative">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-indigo-200 truncate">{suggestedActivity.name}</span>
                      <ArrowRight className="w-3 h-3 text-indigo-400/60 group-hover:text-indigo-300 transition shrink-0" />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Based on your typical schedule at this time</p>
                  </div>
                </button>
              </div>
            )}

            {/* Other activities */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-zinc-600 mb-2 font-medium">Or choose an activity</p>
              <div className="space-y-0.5 max-h-44 overflow-y-auto -mx-1 px-1">
                {visibleActivities.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-3 text-center">No activities yet — add some on the External page</p>
                ) : (
                  visibleActivities.map(act => (
                    <button
                      key={act.id}
                      onClick={() => onConfirm(act.id.toString())}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 transition text-left group"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-black/10 group-hover:ring-black/20 transition"
                        style={{ backgroundColor: act.color || '#6b7280' }}
                      />
                      <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition">{act.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              className="w-full mt-5 px-4 py-2.5 rounded-xl text-sm text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition border border-transparent hover:border-zinc-700/30"
            >
              Nothing special — just AFK
            </button>
          </div>
        </motion.div>
      </motion.div>
  );
}
