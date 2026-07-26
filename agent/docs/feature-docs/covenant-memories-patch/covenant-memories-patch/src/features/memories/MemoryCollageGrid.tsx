import { motion } from 'framer-motion';
import type { LoadedMemory } from './useMemories';
import { MemoryCard } from './MemoryCard';

interface MemoryCollageGridProps {
  items: LoadedMemory[];
  onOpen: (memory: LoadedMemory) => void;
}

const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const tileVariants = { hidden: { opacity: 0, y: 10, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1 } };

// Signature moment support #3 (paired with MemoryReveal): a staggered
// entrance into an organic, non-uniform grid -- every 7th tile runs larger,
// breaking the monotony a strict SaaS grid would have.
export function MemoryCollageGrid({ items, onOpen }: MemoryCollageGridProps) {
  return (
    <motion.div
      className="grid grid-cols-3 sm:grid-cols-4 gap-2 auto-rows-[minmax(0,1fr)]"
      initial="hidden"
      animate="show"
      variants={gridVariants}
    >
      {items.map((m, i) => (
        <motion.div
          key={m.meta.id}
          variants={tileVariants}
          className={i % 7 === 0 ? 'col-span-2 row-span-2' : ''}
        >
          <MemoryCard memory={m} onOpen={() => onOpen(m)} span={i % 7 === 0 ? 'lg' : 'sm'} />
        </motion.div>
      ))}
    </motion.div>
  );
}
