import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface GlassSurfaceProps {
  tier?: 1 | 2 | 3;
  accent?: boolean;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void
  onPointerEnter?: () => void
  style?: React.CSSProperties;
}

export function GlassSurface({
  tier = 1, accent, interactive, className = '', children, onClick, onPointerDown, onPointerEnter, style,
}: GlassSurfaceProps) {
  const base = tier === 1
    ? 'backdrop-blur-2xl bg-zinc-900/55 border border-white/10'
    : tier === 2
      ? 'bg-zinc-800/60 border border-white/5'
      : 'bg-zinc-950/40 backdrop-blur-2xl border-b border-white/10';

  const accentStyles = accent
    ? 'border-emerald-500/30'
    : '';

  const interactiveStyles = interactive
    ? 'cursor-pointer transition-[background,box-shadow] duration-150 hover:bg-zinc-800/70'
    : '';

  const Tag = interactive ? motion.button : motion.div;

  return (
    <Tag
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      className={`relative rounded-xl ${base} ${accentStyles} ${interactiveStyles} ${className}`}
      style={style}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.10),transparent_42%)]" />
      {children}
    </Tag>
  );
}
