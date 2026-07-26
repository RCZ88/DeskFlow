// Reuses the existing GlassCard primitive (see src/components/GlassCard.tsx)
// instead of re-implementing a card system — per DESIGN.md's "reuse installed
// components" rule. Adds only the warm-corner accent + optional ambient glow.
import type { ReactNode } from 'react';
import { GlassCard } from '../../components/GlassCard';

interface WarmCardProps {
  variant?: 'default' | 'elevated' | 'interactive';
  ambient?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function WarmCard({ variant = 'default', ambient = false, className = '', children, onClick }: WarmCardProps) {
  return (
    <GlassCard
      variant={variant}
      onClick={onClick}
      className={`border-[color-mix(in_srgb,var(--warmth-accent)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--warmth-accent)_36%,transparent)] transition-colors duration-200 ${className}`}
    >
      {ambient && <div className="warmth-aurora rounded-xl" />}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">{children}</div>
    </GlassCard>
  );
}
