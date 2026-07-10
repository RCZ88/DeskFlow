import { motion } from 'framer-motion';
import { type ComponentProps } from 'react';
import { MOTION, type ACCENT } from './tokens';

type AccentKey = keyof typeof ACCENT;

interface GlassCardProps extends ComponentProps<typeof motion.div> {
  accent?: AccentKey;
}

const accentBar: Record<string, string> = {
  pink: 'bg-pink-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
  violet: 'bg-violet-500', red: 'bg-red-500',
};

export function GlassCard({ accent, className = '', children, ...rest }: GlassCardProps) {
  return (
    <motion.div
      className={`relative rounded-xl p-5 bg-zinc-900/40 ring-1 ring-zinc-800/60 ${className}`}
      whileHover={rest.onClick ? { y: -2 } : undefined}
      transition={{ duration: MOTION.fast, ease: MOTION.ease }}
      {...rest}
    >
      {accent && (
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl ${accentBar[accent]}`} />
      )}
      {children}
    </motion.div>
  );
}
