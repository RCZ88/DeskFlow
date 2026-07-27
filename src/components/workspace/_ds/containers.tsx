// ============================================================================
// Workspace Design System — Containers & Layout
// WorkspaceCard, WorkspaceSection, WorkspaceToolbar
// Every workspace tab MUST use these — no hand-rolled glass cards.
// ============================================================================
import React from 'react';
import { motion } from 'framer-motion';
import { DUR, EASE_OUT } from './motion';

// ---- WorkspaceCard ----------------------------------------------------------
// Unified glass card for ALL workspace content. Variants control visual weight.
// Accent is optional — adds a subtle left rail + tint when provided.
export type CardVariant = 'default' | 'interactive' | 'elevated' | 'inset';

const CARD_BASE = 'rounded-xl transition-all duration-150 relative overflow-hidden';
const CARD_VARIANTS: Record<CardVariant, string> = {
  default:    'bg-[rgba(24,24,27,0.60)] backdrop-blur-xl border border-[rgba(63,63,70,0.35)] p-5',
  interactive:'bg-[rgba(24,24,27,0.60)] backdrop-blur-xl border border-[rgba(63,63,70,0.35)] p-5 cursor-pointer hover:border-[rgba(63,63,70,0.55)] hover:bg-[rgba(24,24,27,0.70)]',
  elevated:   'bg-[rgba(24,24,27,0.80)] backdrop-blur-2xl border border-[rgba(63,63,70,0.45)] p-5 shadow-lg shadow-black/20',
  inset:      'bg-[rgba(9,9,11,0.60)] border border-[rgba(63,63,70,0.25)] p-4',
};

const ACCENT_RAIL: Record<string, string> = {
  orange: 'bg-orange-500/50', green: 'bg-green-500/50', purple: 'bg-purple-500/50',
  indigo: 'bg-indigo-500/50', rose: 'bg-rose-500/50', amber: 'bg-amber-500/50',
  cyan: 'bg-cyan-500/50', pink: 'bg-pink-500/50', emerald: 'bg-emerald-500/50',
};

export function WorkspaceCard({
  variant = 'default', accent, className = '', children, onClick,
}: {
  variant?: CardVariant; accent?: string; className?: string;
  children: React.ReactNode; onClick?: () => void;
}) {
  const railColor = accent ? ACCENT_RAIL[accent] : undefined;
  return (
    <div
      onClick={onClick}
      className={`${CARD_BASE} ${CARD_VARIANTS[variant]} ${onClick && variant !== 'interactive' ? 'cursor-pointer hover:border-[rgba(63,63,70,0.55)]' : ''} ${className}`}
    >
      {railColor && (
        <div className={`absolute top-0 left-0 bottom-0 w-[2px] ${railColor} rounded-full`} />
      )}
      {/* Top-edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      {children}
    </div>
  );
}

// ---- WorkspaceSection -------------------------------------------------------
// Section with title + optional icon + optional action button.
// Provides consistent spacing and hierarchy across all tabs.
export function WorkspaceSection({
  title, icon: Icon, accent, action, children, className = '',
}: {
  title: string; icon?: React.ComponentType<{ className?: string }>;
  accent?: string; action?: React.ReactNode; children: React.ReactNode;
  className?: string;
}) {
  const accentColors: Record<string, string> = {
    orange: 'text-orange-400 bg-orange-500/15', green: 'text-green-400 bg-green-500/15',
    purple: 'text-purple-400 bg-purple-500/15', indigo: 'text-indigo-400 bg-indigo-500/15',
    rose: 'text-rose-400 bg-rose-500/15', amber: 'text-amber-400 bg-amber-500/15',
    cyan: 'text-cyan-400 bg-cyan-500/15', pink: 'text-pink-400 bg-pink-500/15',
  };
  const iconColor = accent ? accentColors[accent] : 'text-zinc-400 bg-zinc-800';

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`grid w-7 h-7 place-items-center rounded-lg ${iconColor}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <h3 className="text-[13px] font-semibold text-zinc-200 tracking-tight">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ---- WorkspaceToolbar -------------------------------------------------------
// Action bar for "Add / Refresh / Filter" patterns.
// Consistent height, spacing, and button styles.
export function WorkspaceToolbar({
  children, className = '',
}: {
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {children}
    </div>
  );
}

// ---- WorkspaceGroupHeader ---------------------------------------------------
// The top-level group header bar shown above each WorkspaceShell.
// Provides consistent visual weight and accent connectivity.
export function WorkspaceGroupHeader({
  title, icon: Icon, accent, children, className = '',
}: {
  title: string; icon?: React.ComponentType<{ className?: string }>;
  accent?: string; children?: React.ReactNode; className?: string;
}) {
  const accentText: Record<string, string> = {
    orange: 'text-orange-400', green: 'text-green-400', purple: 'text-purple-400',
    indigo: 'text-indigo-400', rose: 'text-rose-400', amber: 'text-amber-400',
  };
  const textColor = accent ? accentText[accent] : 'text-zinc-400';

  return (
    <div className={`flex items-center justify-between px-3 py-2 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-3.5 h-3.5 ${textColor}`} />}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{title}</span>
      </div>
      {children}
    </div>
  );
}
