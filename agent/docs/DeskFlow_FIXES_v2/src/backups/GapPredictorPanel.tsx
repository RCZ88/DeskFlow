import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Sparkles, ChevronRight, Check, Edit3, RefreshCw, Brain, AlertTriangle, Sliders } from 'lucide-react';

interface Prediction {
  app: string;
  category: string;
  confidence: number;
  avgSeconds: number;
}

interface SlotPrediction {
  slotStart: string;
  slotEnd: string;
  predictions: Prediction[];
  durationSeconds: number;
}

interface GapPrediction {
  start: string;
  end: string;
  durationSeconds: number;
  slots: SlotPrediction[];
  predicted: boolean;
}

interface FillEntry {
  slotStart: string;
  slotEnd: string;
  app: string;
  category: string;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function fmtDate(ms: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(ms);
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function fmtElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function confidenceColor(c: number): string {
  if (c >= 70) return 'bg-emerald-500';
  if (c >= 40) return 'bg-amber-500';
  return 'bg-zinc-500';
}

function confidenceText(c: number): string {
  if (c >= 70) return 'High';
  if (c >= 40) return 'Medium';
  return 'Low';
}

const MODE_OPTIONS = [
  { key: 'combined' as const, label: 'Combined', desc: 'Merge device + external patterns' },
  { key: 'separate' as const, label: 'Separate', desc: 'Device patterns only' },
];

interface GapPredictorPanelProps {
  onClose: () => void;
}

export default function GapPredictorPanel({ onClose }: GapPredictorPanelProps) {
  const [gaps, setGaps] = useState<GapPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [mode, setMode] = useState<'combined' | 'separate'>('combined');
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [editApp, setEditApp] = useState('');
  const [editCat, setEditCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gapFetchPeriod, setGapFetchPeriod] = useState('today');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const api = (window as any).deskflowAPI;
      if (!api) return;
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const result = await api.predictDayGaps(dateStr, mode);
      setGaps(result?.slots || []);
    } catch (err) {
      console.error('[GapPredictorPanel] fetch error:', err);
      setGaps([]);
    }
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const predict = async () => {
    setPredicting(true);
    await fetchData();
    setPredicting(false);
  };

  const toggleAccept = (slotId: number) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
    setRejected(prev => {
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
  };

  const toggleReject = (slotId: number) => {
    setRejected(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
    setAccepted(prev => {
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
  };

  const startEdit = (slotId: number, app: string, cat: string) => {
    setEditing(slotId);
    setEditApp(app);
    setEditCat(cat);
  };

  const saveEdit = (slotId: number) => {
    if (!editing) return;
    setAccepted(prev => {
      const next = new Set(prev);
      next.add(slotId);
      return next;
    });
    setEditing(null);
    setEditApp('');
    setEditCat('');
  };

  const acceptAll = () => {
    const allIds: number[] = [];
    gaps.forEach(g => g.slots.forEach((s, si) => {
      if (s.predictions.length > 0) {
        const slotId = parseInt(g.start + si, 36) % 1000000;
        allIds.push(slotId);
      }
    }));
    setAccepted(new Set(allIds));
    setRejected(new Set());
  };

  const getSlotId = (gapStart: string, slotIdx: number): number => {
    return parseInt(gapStart.slice(-6) + slotIdx, 36) % 1000000;
  };

  const getAcceptedFills = (): FillEntry[] => {
    const fills: FillEntry[] = [];
    gaps.forEach(g => g.slots.forEach((s, si) => {
      const slotId = getSlotId(g.start, si);
      if (accepted.has(slotId) && s.predictions.length > 0) {
        const topPred = s.predictions[0];
        const isEditing = editing === slotId;
        fills.push({
          slotStart: s.slotStart,
          slotEnd: s.slotEnd,
          app: isEditing ? editApp : topPred.app,
          category: isEditing ? editCat : topPred.category,
        });
      }
    }));
    return fills;
  };

  const handleSave = async () => {
    const fills = getAcceptedFills();
    if (fills.length === 0) return;
    setSaving(true);
    try {
      const api = (window as any).deskflowAPI;
      const result = await api.confirmGapFill(fills);
      if (result?.success) {
        setSaved(true);
        setTimeout(() => { onClose(); }, 1500);
      }
    } catch (err) {
      console.error('[GapPredictorPanel] save error:', err);
    }
    setSaving(false);
  };

  const totalAccepted = getAcceptedFills().length;
  const totalSlots = gaps.reduce((sum, g) => sum + g.slots.length, 0);
  const hasAnyPrediction = gaps.some(g => g.slots.some(s => s.predictions.length > 0));

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
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-zinc-900/95 border border-zinc-700/50 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient top bar */}
        <div className="h-1 bg-gradient-to-r from-indigo-500/40 via-emerald-500/40 to-indigo-500/40 shrink-0" />

        {/* Header */}
        <div className="p-5 pb-3 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0 ring-1 ring-indigo-500/20">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Smart Gap Fill</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  AI predicts what apps you likely used during untracked periods
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode toggle + Action row */}
          <div className="flex items-center justify-between mt-4 gap-3">
            <div className="flex items-center gap-2 p-1 rounded-lg bg-zinc-800/60">
              {MODE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setMode(opt.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    mode === opt.key
                      ? 'bg-zinc-700 text-zinc-200 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  {opt.label}
                </button>
              ))}
              <div className="w-px h-4 bg-zinc-700 mx-1" />
              <button
                onClick={predict}
                disabled={loading}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition disabled:opacity-40 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <button
              onClick={acceptAll}
              disabled={!hasAnyPrediction}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-600/30 transition disabled:opacity-40"
            >
              Accept All
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading || predicting ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">
                {predicting ? 'Analyzing historical patterns...' : 'Loading gaps...'}
              </span>
              <span className="text-[11px] text-zinc-600">
                Checking {mode === 'combined' ? 'device + external' : 'device'} data
              </span>
            </div>
          ) : gaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-zinc-400 font-medium">No gaps found</p>
              <p className="text-xs text-zinc-600 text-center max-w-sm">
                All time periods today are accounted for with tracked activity.
              </p>
            </div>
          ) : saved ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/20">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-zinc-300 font-medium">Gaps filled successfully!</p>
              <p className="text-xs text-zinc-500">{totalAccepted} slot{totalAccepted !== 1 ? 's' : ''} saved to tracking data.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/20">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span className="font-medium">{gaps.length} gap{gaps.length !== 1 ? 's' : ''}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500">{totalSlots} time slots</span>
                  {totalAccepted > 0 && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span className="text-emerald-400 font-medium">{totalAccepted} accepted</span>
                    </>
                  )}
                </div>
                {!hasAnyPrediction && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 ml-auto">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    No patterns found for these hours
                  </div>
                )}
              </div>

              {/* Gap cards */}
              {gaps.map((gap, gi) => (
                <div key={gi} className="rounded-xl border border-zinc-700/30 bg-zinc-800/20 overflow-hidden">
                  {/* Gap header */}
                  <div className="flex items-center justify-between p-3 bg-zinc-800/40 border-b border-zinc-700/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-medium">{fmtDate(new Date(gap.start).getTime())}</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                      <span className="text-xs text-zinc-300 font-mono">{fmtTime(new Date(gap.start).getTime())}</span>
                      <span className="text-xs text-zinc-600">→</span>
                      <span className="text-xs text-zinc-300 font-mono">{fmtTime(new Date(gap.end).getTime())}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                      {fmtElapsed(gap.durationSeconds)}
                    </span>
                  </div>

                  {/* Slots */}
                  <div className="divide-y divide-zinc-700/10">
                    {gap.slots.map((slot, si) => {
                      const slotId = getSlotId(gap.start, si);
                      const isAccepted = accepted.has(slotId);
                      const isRejected = rejected.has(slotId);
                      const isEditing = editing === slotId;
                      const topPred = slot.predictions[0];
                      const showActions = slot.predictions.length > 0 && !isRejected;

                      return (
                        <div
                          key={si}
                          className={`flex items-start gap-3 p-3 transition-colors ${
                            isAccepted ? 'bg-emerald-500/5' :
                            isRejected ? 'bg-zinc-800/20 opacity-50' :
                            'hover:bg-zinc-800/30'
                          }`}
                        >
                          {/* Time */}
                          <div className="w-16 shrink-0 text-[11px] text-zinc-500 font-mono pt-0.5">
                            {fmtTime(new Date(slot.slotStart).getTime())}
                          </div>

                          {/* Prediction or empty */}
                          <div className="flex-1 min-w-0">
                            {slot.predictions.length === 0 ? (
                              <div className="flex items-center gap-2 text-xs text-zinc-600">
                                <Clock className="w-3 h-3" />
                                No historical pattern for this time
                              </div>
                            ) : isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  value={editApp}
                                  onChange={e => setEditApp(e.target.value)}
                                  className="flex-1 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                  placeholder="App name"
                                />
                                <input
                                  value={editCat}
                                  onChange={e => setEditCat(e.target.value)}
                                  className="w-24 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                  placeholder="Category"
                                />
                                <button
                                  onClick={() => saveEdit(slotId)}
                                  className="p-1.5 rounded-md bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                {/* Confidence bar */}
                                <div className="w-12 h-1.5 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                                  <div
                                    className={`h-full rounded-full transition-all ${confidenceColor(topPred.confidence)}`}
                                    style={{ width: `${Math.max(8, topPred.confidence)}%` }}
                                  />
                                </div>
                                {/* App + category */}
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-xs font-medium truncate ${
                                    isAccepted ? 'text-emerald-300' : 'text-zinc-200'
                                  }`}>
                                    {topPred.app}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/30">
                                    {topPred.category}
                                  </span>
                                  {topPred.avgSeconds > 0 && (
                                    <span className="text-[10px] text-zinc-600">~{fmtElapsed(topPred.avgSeconds)} avg</span>
                                  )}
                                </div>
                                {/* Confidence label */}
                                <span className={`text-[10px] font-medium shrink-0 ${
                                  topPred.confidence >= 70 ? 'text-emerald-500' :
                                  topPred.confidence >= 40 ? 'text-amber-500' : 'text-zinc-500'
                                }`}>
                                  {confidenceText(topPred.confidence)}
                                </span>
                              </div>
                            )}

                            {/* Other predictions */}
                            {!isEditing && slot.predictions.length > 1 && (
                              <div className="flex items-center gap-2 mt-1.5 ml-[60px]">
                                <span className="text-[10px] text-zinc-600">alt:</span>
                                {slot.predictions.slice(1).map((p, pi) => (
                                  <span key={pi} className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800/50">
                                    {p.app} ({p.confidence}%)
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          {showActions && !isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => toggleAccept(slotId)}
                                className={`p-1.5 rounded-md transition ${
                                  isAccepted
                                    ? 'bg-emerald-600/20 text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50'
                                }`}
                                title="Accept prediction"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => startEdit(slotId, topPred.app, topPred.category)}
                                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition"
                                title="Edit prediction"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleReject(slotId)}
                                className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                                title="Reject"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Empty state if no predictions */}
              {gaps.length > 0 && !hasAnyPrediction && (
                <div className="text-center py-6">
                  <p className="text-xs text-zinc-600">
                    No historical data available for these time periods.
                    <br />Continue tracking to build patterns for smart predictions.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !predicting && gaps.length > 0 && !saved && (
          <div className="shrink-0 px-5 py-4 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-[11px] text-zinc-600">
              {totalAccepted > 0
                ? `${totalAccepted} slot${totalAccepted !== 1 ? 's' : ''} will be saved to your tracking data`
                : 'Accept predictions above to fill gaps'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={totalAccepted === 0 || saving}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Fill {totalAccepted > 0 ? `(${totalAccepted})` : 'Gaps'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
