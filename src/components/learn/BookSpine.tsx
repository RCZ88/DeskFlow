import React from 'react';
import { motion } from 'framer-motion';
import type { LessonSummary } from '../../shared/learn/types';
import { MasteryRing } from './MasteryRing';

const CLOTHS: Array<{ cloth: string; deep: string; gilt: string; ink: string }> = [
  { cloth: '#c2553a', deep: '#a8432c', gilt: '#f3d9a4', ink: '#fbeee6' },
  { cloth: '#3f7d63', deep: '#2f6650', gilt: '#f3d9a4', ink: '#eaf5ef' },
  { cloth: '#b8842f', deep: '#9c6e20', gilt: '#fff4d6', ink: '#fdf3df' },
  { cloth: '#3c7d92', deep: '#2d6175', gilt: '#f3d9a4', ink: '#e6f3f8' },
  { cloth: '#6b4a8a', deep: '#553a70', gilt: '#f3d9a4', ink: '#efe8f6' },
];

function clothFor(part: number) {
  return CLOTHS[((part % CLOTHS.length) + CLOTHS.length) % CLOTHS.length];
}

interface Props {
  lesson: LessonSummary;
  index?: number;
  onOpen: (id: string) => void;
  onInfo?: (id: string) => void;
  masteryLevel?: string;
}

export function BookSpine({ lesson, index = 0, onOpen, onInfo, masteryLevel }: Props) {
  const c = clothFor(lesson.part);

  return (
    <motion.article
      role="button"
      tabIndex={0}
      aria-label={`Open lesson: ${lesson.title}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.02 * index, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(lesson.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(lesson.id);
        }
      }}
      className="group relative cursor-pointer select-none"
      style={{ width: 48 }}
    >
      {/* Spine body */}
      <div
        className="relative flex flex-col items-center justify-between rounded-md overflow-hidden"
        style={{
          height: 220,
          background: `linear-gradient(180deg, ${c.cloth} 0%, ${c.deep} 100%)`,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), inset -4px 0 8px -6px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Spine stitching line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />

        {/* Top: part number rotated */}
        <div className="flex-1 flex items-start justify-center pt-3">
          <span
            className="font-mono text-[8px] uppercase tracking-[0.15em] opacity-80"
            style={{ color: c.gilt, writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {String(lesson.part).padStart(2, '0')}
          </span>
        </div>

        {/* Center: title rotated */}
        <div className="flex-1 flex items-center justify-center px-1">
          <span
            className="font-serif text-[10px] font-semibold leading-tight text-center line-clamp-4"
            style={{ color: c.ink, writingMode: 'vertical-rl', textOrientation: 'mixed', maxHeight: 140 }}
          >
            {lesson.title}
          </span>
        </div>

        {/* Bottom: mastery ring */}
        <div className="flex items-center justify-center pb-3">
          <MasteryRing
            level={(masteryLevel || 'L0') as any}
            size={20}
            strokeWidth={2}
            animated={false}
          />
        </div>

        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Page edges peeking from bottom */}
      <div
        className="mx-[3px] h-1.5 rounded-b-sm"
        style={{
          background: `repeating-linear-gradient(90deg, #efe7d6 0px, #efe7d6 2px, #d9cfba 2px, #d9cfba 4px)`,
        }}
      />
    </motion.article>
  );
}
