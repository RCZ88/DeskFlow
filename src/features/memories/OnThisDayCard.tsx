import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { LoadedMemory } from './useMemories';

interface OnThisDayCardProps {
  items: LoadedMemory[];
  onOpen: (memory: LoadedMemory) => void;
}

const cardMotion = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

export function OnThisDayCard({ items, onOpen }: OnThisDayCardProps) {
  if (items.length === 0) return null;
  return (
    <motion.div
      initial={cardMotion.initial}
      animate={cardMotion.animate}
      className="relative overflow-hidden rounded-xl border border-[#6fb38f]/25 bg-[#6fb38f]/[0.06] p-3"
    >
      <div className="warmth-aurora" />
      <div className="relative z-10 flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wider text-[#6fb38f]">
        <Clock className="w-3.5 h-3.5" /> On this day
      </div>
      <div className="relative z-10 flex gap-2 overflow-x-auto ws-scroll pb-1">
        {items.map(m => (
          <button
            key={m.meta.id}
            onClick={() => onOpen(m)}
            className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-zinc-700/40"
          >
            <img src={m.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
