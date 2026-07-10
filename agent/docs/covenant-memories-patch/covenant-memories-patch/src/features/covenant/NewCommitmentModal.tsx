import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Commitment, CommitmentCadence, WarmColorKey } from './types';
import { WARM_COLORS, WARM_COLOR_KEYS } from './covenantColors';

interface NewCommitmentModalProps {
  onClose: () => void;
  onCreate: (input: Omit<Commitment, 'id' | 'createdAt' | 'archivedAt'>) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const overlayMotion = { initial: { opacity: 0 }, animate: { opacity: 1 } };
const cardMotion = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

export function NewCommitmentModal({ onClose, onCreate }: NewCommitmentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cadence, setCadence] = useState<CommitmentCadence>('daily');
  const [weeklyTargetDays, setWeeklyTargetDays] = useState<number[]>([1, 3, 5]);
  const [color, setColor] = useState<WarmColorKey>('clay');
  const [detectEnabled, setDetectEnabled] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [minMinutes, setMinMinutes] = useState(10);

  const canSave = name.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: 'Flame',
      color,
      cadence,
      weeklyTargetDays,
      detection: {
        enabled: detectEnabled,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        minMinutes,
      },
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        initial={overlayMotion.initial}
        animate={overlayMotion.animate}
        exit={overlayMotion.initial}
        onClick={onClose}
      >
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={cardMotion.initial}
          animate={cardMotion.animate}
          exit={cardMotion.initial}
          transition={cardMotion.transition}
          className="w-full max-w-md rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 p-5 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">New commitment</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>

          <label className="block text-[11px] text-[var(--text-muted)] mb-1">What are you committing to?</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning stillness, Read scripture, Call a friend"
            className="w-full mb-3 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[13px] text-[var(--text-primary)] placeholder:text-zinc-600 focus:outline-none focus:border-[#e8866b]/50"
          />

          <label className="block text-[11px] text-[var(--text-muted)] mb-1">A short note to yourself (optional)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Why this matters to you"
            className="w-full mb-3 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-[13px] text-[var(--text-primary)] placeholder:text-zinc-600 focus:outline-none focus:border-[#e8866b]/50"
          />

          <label className="block text-[11px] text-[var(--text-muted)] mb-1.5">Color</label>
          <div className="flex gap-2 mb-3">
            {WARM_COLOR_KEYS.map(k => {
              const swatchStyle = { background: WARM_COLORS[k].hex };
              return (
                <button
                  key={k}
                  onClick={() => setColor(k)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${color === k ? 'scale-110 border-white/70' : 'border-transparent'}`}
                  style={swatchStyle}
                />
              );
            })}
          </div>

          <label className="block text-[11px] text-[var(--text-muted)] mb-1.5">Cadence</label>
          <div className="flex gap-2 mb-3">
            {(['daily', 'weekly'] as CommitmentCadence[]).map(c => (
              <button
                key={c}
                onClick={() => setCadence(c)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  cadence === c ? 'bg-[#e8866b]/15 text-[#e8866b] border-[#e8866b]/30' : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'
                }`}
              >
                {c === 'daily' ? 'Every day' : 'Specific days'}
              </button>
            ))}
          </div>

          {cadence === 'weekly' && (
            <div className="flex gap-1.5 mb-3">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setWeeklyTargetDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                  className={`w-8 h-8 rounded-full text-[11px] font-medium transition-colors ${
                    weeklyTargetDays.includes(i) ? 'bg-[#e8866b]/20 text-[#e8866b]' : 'bg-zinc-800/50 text-zinc-500'
                  }`}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-zinc-800/40 p-3 mb-4">
            <label className="flex items-center gap-2 text-[12px] text-zinc-300 mb-2 cursor-pointer select-none">
              <input type="checkbox" checked={detectEnabled} onChange={e => setDetectEnabled(e.target.checked)} className="rounded border-zinc-600 bg-zinc-800 text-[#e8866b]" />
              Auto-detect from activity (optional)
            </label>
            {detectEnabled && (
              <div className="space-y-2">
                <input
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="App or site keywords, comma-separated (e.g. Duolingo, bible.com)"
                  className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-700/50 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                />
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  Count as done after
                  <input
                    type="number"
                    min={1}
                    value={minMinutes}
                    onChange={e => setMinMinutes(Number(e.target.value) || 1)}
                    className="w-14 px-1.5 py-1 rounded bg-zinc-900/60 border border-zinc-700/50 text-center"
                  />
                  minutes
                </div>
              </div>
            )}
          </div>

          <button
            disabled={!canSave}
            onClick={submit}
            className="w-full py-2.5 rounded-lg bg-[#e8866b] text-white text-[13px] font-semibold hover:bg-[#d96846] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Begin this practice
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
