import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, ChevronRight } from 'lucide-react';

interface Gap {
  start: string;
  end: string;
  durationSeconds: number;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
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

const periods = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All' },
] as const;

export default function GapPanel({ onClose }: { onClose: () => void }) {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [period, setPeriod] = useState<string>('week');
  const [loading, setLoading] = useState(true);

  const fetchGaps = useCallback(async () => {
    setLoading(true);
    try {
      const result = await (window as any).deskflowAPI?.detectUsageGaps({ period, minGapMinutes: 5 });
      setGaps(result || []);
    } catch (err) {
      console.error('[GapPanel] fetch error:', err);
      setGaps([]);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchGaps();
  }, [fetchGaps]);

  function handleFill(gap: Gap) {
    window.dispatchEvent(new CustomEvent('fill-time-gap', {
      detail: { start: gap.start, end: gap.end },
    }));
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
        className="bg-zinc-900/95 border border-zinc-700/50 rounded-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-indigo-500/40 via-emerald-500/40 to-indigo-500/40" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 ring-1 ring-indigo-500/20">
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Usage Gaps</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Time periods with no tracked activity</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Period selector */}
          <div className="flex gap-1 mb-4 p-1 rounded-lg bg-zinc-800/60">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  period === p.key
                    ? 'bg-zinc-700 text-zinc-200 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Gap list */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-zinc-600 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : gaps.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-zinc-600">No gaps found</p>
                <p className="text-xs text-zinc-700 mt-1">All time is accounted for this period</p>
              </div>
            ) : (
              gaps.map((gap, i) => {
                const startMs = new Date(gap.start).getTime();
                const endMs = new Date(gap.end).getTime();
                const isSameDay = new Date(gap.start).toDateString() === new Date(gap.end).toDateString();
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/20 hover:border-zinc-600/40 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-zinc-300 font-medium">{formatDate(startMs)}</span>
                        <span className="text-[10px] text-zinc-600">{formatElapsed(gap.durationSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                        <span>{formatTime(startMs)}</span>
                        <ChevronRight className="w-3 h-3 text-zinc-600" />
                        <span>{formatTime(endMs)}</span>
                        {!isSameDay && <span className="text-zinc-700">(+1d)</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleFill(gap)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0"
                    >
                      Fill
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <p className="text-[10px] text-zinc-700 text-center mt-4">
            Gaps are periods with no detected app or device activity. Click Fill to add external activities.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
