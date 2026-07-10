import { motion } from 'framer-motion';
import { Layers, Clock } from 'lucide-react';
import type { LessonSummary } from '../../shared/learn/types';
import { Badge } from '../ui/badge';
import { BlurFade } from '../ui/blur-fade';
import { cn } from '../../lib/utils';
import { lift, springy, tap } from './motion';

// Cloth colours keyed by part number, drawn straight from the project @theme
// palette (clay / sage / amber / sky). A lesson always gets the same spine.
const CLOTHS: Array<{ cloth: string; deep: string; gilt: string; ink: string }> = [
  { cloth: '#c2553a', deep: '#a8432c', gilt: '#f3d9a4', ink: '#fbeee6' }, // clay
  { cloth: '#3f7d63', deep: '#2f6650', gilt: '#f3d9a4', ink: '#eaf5ef' }, // sage
  { cloth: '#b8842f', deep: '#9c6e20', gilt: '#fff4d6', ink: '#fdf3df' }, // amber
  { cloth: '#3c7d92', deep: '#2d6175', gilt: '#f3d9a4', ink: '#e6f3f8' }, // sky
  { cloth: '#6b4a8a', deep: '#553a70', gilt: '#f3d9a4', ink: '#efe8f6' }, // plum
];

function clothFor(part: number) {
  return CLOTHS[((part % CLOTHS.length) + CLOTHS.length) % CLOTHS.length];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface BookCardProps {
  lesson: LessonSummary;
  index?: number;
  onOpen: (id: string) => void;
}

export function BookCard({ lesson, index = 0, onOpen }: BookCardProps) {
  const c = clothFor(lesson.part);
  const partLabel = `Part ${String(lesson.part).padStart(2, '0')}`;
  const coverStyle = {
    background: `linear-gradient(150deg, ${c.cloth} 0%, ${c.deep} 100%)`,
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), inset -14px 0 22px -18px rgba(0,0,0,0.55)`,
  };
  const giltStyle = { color: c.gilt };
  const titleStyle = { color: c.ink };

  return (
    <BlurFade delay={0.04 * index} inView>
      <motion.article
        role="button"
        tabIndex={0}
        aria-label={`Open lesson: ${lesson.title}`}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap={tap}
        variants={lift}
        transition={springy}
        onClick={() => onOpen(lesson.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(lesson.id);
          }
        }}
        className="lyceum-book group relative cursor-pointer select-none outline-none"
      >
        {/* hardcover */}
        <div
          className="lyceum-book-cover lyceum-book-cloth relative flex h-[248px] flex-col justify-between rounded-r-md rounded-l-sm p-5 focus-within:ring-2"
          style={coverStyle}
        >
          {/* sewn spine */}
          <span className="pointer-events-none absolute inset-y-0 left-0 w-[10px] rounded-l-sm bg-black/25" />
          <span className="pointer-events-none absolute inset-y-2 left-[10px] w-px bg-white/15" />

          <header className="relative flex items-center justify-between">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.22em]"
              style={giltStyle}
            >
              {partLabel}
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80"
              style={giltStyle}
            >
              v{lesson.version}
            </span>
          </header>

          <h3
            className="relative line-clamp-4 font-serif text-[20px] font-semibold leading-snug"
            style={titleStyle}
          >
            {lesson.title}
          </h3>

          <footer className="relative flex items-center gap-3 text-[11px]" style={giltStyle}>
            <span className="inline-flex items-center gap-1 opacity-90">
              <Layers className="h-3 w-3" />
              {lesson.nodeCount} {lesson.nodeCount === 1 ? 'concept' : 'concepts'}
            </span>
            {lesson.created_at ? (
              <span className="inline-flex items-center gap-1 opacity-75">
                <Clock className="h-3 w-3" />
                {formatDate(lesson.created_at)}
              </span>
            ) : null}
          </footer>

          {/* gilt status foil */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Badge
              variant={lesson.status === 'valid' ? 'default' : 'secondary'}
              className={cn('font-mono text-[9px] uppercase tracking-wider')}
            >
              {lesson.status}
            </Badge>
          </div>
        </div>

        {/* page block + shelf shadow */}
        <div className="lyceum-book-pages mx-[3px] h-2 rounded-b-sm" />
        <div className="lyceum-book-shadow mx-auto mt-1 h-3 w-[82%] rounded-[50%]" />
      </motion.article>
    </BlurFade>
  );
}
