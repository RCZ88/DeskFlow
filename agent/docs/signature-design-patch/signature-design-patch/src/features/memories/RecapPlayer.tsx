import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LoadedMemory } from './useMemories';

// FEATURE (positive impact): "Recap Player".
// Turns the passive archive into a re-livable story: press play and memories
// auto-advance as a cinematic recap with a gentle Ken Burns pan/zoom and
// crossfades -- the single most-loved pattern in memory apps (Apple Photos
// "Memories", 1 Second Everyday recaps). Only transform/opacity animate; a
// settled, no-pan fallback is used under prefers-reduced-motion.

interface RecapPlayerProps {
  items: LoadedMemory[];
  onClose: () => void;
}

const SLIDE_MS = 4200;

// A few Ken Burns end-states; transform-only so it stays on the compositor.
const KEN_BURNS = [
  { scale: 1.12, x: '-3%', y: '-2%' },
  { scale: 1.14, x: '3%', y: '2%' },
  { scale: 1.1, x: '2%', y: '-3%' },
  { scale: 1.15, x: '-2%', y: '3%' },
];

export function RecapPlayer({ items, onClose }: RecapPlayerProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);

  const count = items.length;
  const go = useCallback((dir: number) => setIndex(i => (i + dir + count) % count), [count]);

  useEffect(() => {
    if (!playing || count === 0) return;
    timerRef.current = window.setTimeout(() => setIndex(i => (i + 1) % count), SLIDE_MS);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [index, playing, count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (count === 0) return null;
  const current = items[index];
  const kb = KEN_BURNS[index % KEN_BURNS.length];

  const imgInitial = reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02, x: '0%', y: '0%' };
  const imgAnimate = reduce
    ? { opacity: 1 }
    : { opacity: 1, scale: kb.scale, x: kb.x, y: kb.y };
  const imgExit = { opacity: 0 };
  const imgTransition = reduce
    ? { duration: 0.3 }
    : { opacity: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }, scale: { duration: SLIDE_MS / 1000, ease: 'linear' as const }, x: { duration: SLIDE_MS / 1000, ease: 'linear' as const }, y: { duration: SLIDE_MS / 1000, ease: 'linear' as const } };

  const captionInitial = { opacity: 0, y: 12 };
  const captionAnimate = { opacity: 1, y: 0 };
  const captionTransition = { duration: 0.5, delay: 0.3 };

  const overlayInitial = { opacity: 0 };
  const overlayAnimate = { opacity: 1 };

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[var(--z-modal)] bg-black flex items-center justify-center"
        initial={overlayInitial}
        animate={overlayAnimate}
        exit={overlayInitial}
      >
        {/* Progress segments */}
        <div className="absolute top-3 inset-x-3 z-20 flex gap-1">
          {items.map((m, i) => (
            <div key={m.meta.id} className="h-0.5 flex-1 rounded-full overflow-hidden bg-white/20">
              <div
                className="h-full bg-white/80"
                style={i < index ? fillDone : i === index ? fillActive : fillNone}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div key={current.meta.id} className="absolute inset-0 flex items-center justify-center" initial={imgInitial} animate={imgAnimate} exit={imgExit} transition={imgTransition}>
              {current.meta.kind === 'video' ? (
                <video src={current.url} autoPlay muted className="max-h-full max-w-full object-contain" />
              ) : (
                <img src={current.url} alt={current.meta.caption || ''} className="max-h-full max-w-full object-contain" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        <motion.div
          key={`cap-${current.meta.id}`}
          className="absolute bottom-16 inset-x-0 z-20 text-center px-6"
          initial={captionInitial}
          animate={captionAnimate}
          transition={captionTransition}
        >
          {current.meta.caption && <p className="warmth-serif text-xl text-white drop-shadow mb-1">{current.meta.caption}</p>}
          <p className="text-[12px] text-white/60">{fmtDate(current.meta.date)}{current.meta.people.length > 0 ? ` · ${current.meta.people.join(', ')}` : ''}</p>
        </motion.div>

        {/* Controls */}
        <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-4">
          <button onClick={() => go(-1)} className="text-white/70 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setPlaying(p => !p)} className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={() => go(1)} className="text-white/70 hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

const fillDone = { width: '100%' };
const fillActive = { width: '100%', transition: 'none' };
const fillNone = { width: '0%' };
