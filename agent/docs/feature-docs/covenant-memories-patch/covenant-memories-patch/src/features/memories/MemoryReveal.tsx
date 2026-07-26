import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Tag } from 'lucide-react';
import type { LoadedMemory } from './useMemories';
import { PersonChip } from './PersonChip';

interface MemoryRevealProps {
  memory: LoadedMemory;
  onClose: () => void;
  onDelete: () => void;
  onUpdatePeople: (people: string[]) => void;
  onUpdateCaption: (caption: string) => void;
}

const overlayMotion = { initial: { opacity: 0 }, animate: { opacity: 1 } };
const layoutTransition = { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const };
const panelMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: 0.15 },
};

// Signature moment #3: the memories-collage reveal. Uses framer-motion's
// shared-element layout (matching layoutId with MemoryCard) so the tapped
// tile visibly grows into the full lightbox instead of a plain modal
// fade -- the moment feels like stepping *into* the memory.
export function MemoryReveal({ memory, onClose, onDelete, onUpdatePeople, onUpdateCaption }: MemoryRevealProps) {
  const [caption, setCaption] = useState(memory.meta.caption || '');
  const [personInput, setPersonInput] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        initial={overlayMotion.initial}
        animate={overlayMotion.animate}
        exit={overlayMotion.initial}
        onClick={onClose}
      >
        <motion.div
          layoutId={`memory-${memory.meta.id}`}
          onClick={e => e.stopPropagation()}
          transition={layoutTransition}
          className="relative w-full max-w-3xl max-h-[85vh] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700/50 flex flex-col"
        >
          <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
            {memory.meta.kind === 'video' ? (
              <video src={memory.url} controls autoPlay className="max-h-[60vh] w-full" />
            ) : (
              <img src={memory.url} alt={memory.meta.caption || ''} className="max-h-[60vh] w-full object-contain" />
            )}
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <motion.div
            initial={panelMotion.initial}
            animate={panelMotion.animate}
            transition={panelMotion.transition}
            className="p-4 space-y-2 warmth-serif"
          >
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              onBlur={() => onUpdateCaption(caption)}
              placeholder="Add a caption for this memory"
              className="w-full bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-zinc-600 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-[#6fb38f]" />
              {memory.meta.people.map(p => (
                <PersonChip key={p} name={p} onRemove={() => onUpdatePeople(memory.meta.people.filter(x => x !== p))} />
              ))}
              <input
                value={personInput}
                onChange={e => setPersonInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && personInput.trim()) {
                    onUpdatePeople([...memory.meta.people, personInput.trim()]);
                    setPersonInput('');
                  }
                }}
                placeholder="Add person..."
                className="bg-transparent text-[11px] text-zinc-400 placeholder:text-zinc-600 focus:outline-none w-24"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-zinc-500">{memory.meta.date}</span>
              <button onClick={onDelete} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-rose-400 transition-colors">
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
