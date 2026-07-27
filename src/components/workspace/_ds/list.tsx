// ============================================================================
// Workspace Design System — List Items
// WorkspaceListItem: unified row for sessions, problems, requests, files, presets.
// Every list in the workspace MUST use this for consistency.
// ============================================================================
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { riseItem } from './motion';

// ---- WorkspaceListItem ------------------------------------------------------
// A single row in any workspace list. Provides consistent padding, hover,
// active state, optional left accent rail, and right action area.
export function WorkspaceListItem({
  onClick, active, accent, children, actions, className = '',
}: {
  onClick?: () => void; active?: boolean; accent?: string;
  children: React.ReactNode; actions?: React.ReactNode; className?: string;
}) {
  const accentRail: Record<string, string> = {
    orange: 'bg-orange-500', green: 'bg-green-500', purple: 'bg-purple-500',
    indigo: 'bg-indigo-500', rose: 'bg-rose-500', amber: 'bg-amber-500',
    cyan: 'bg-cyan-500', pink: 'bg-pink-500', emerald: 'bg-emerald-500',
  };
  const railColor = accent ? accentRail[accent] : undefined;

  return (
    <motion.div
      variants={riseItem}
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
        onClick ? 'cursor-pointer' : ''
      } ${
        active
          ? 'bg-zinc-800/60 ring-1 ring-zinc-700/50'
          : 'hover:bg-zinc-800/40'
      } ${className}`}
    >
      {railColor && (
        <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${railColor} opacity-60`} />
      )}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {actions}
        </div>
      )}
      {onClick && (
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
      )}
    </motion.div>
  );
}

// ---- WorkspaceListItemContent ------------------------------------------------
// Layout helper: icon + text column + metadata.
export function WorkspaceListItemContent({
  icon, title, subtitle, meta, children,
}: {
  icon?: React.ReactNode; title: string; subtitle?: string;
  meta?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <>
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center shrink-0 text-zinc-400">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-zinc-200 truncate">{title}</span>
          {children}
        </div>
        {subtitle && (
          <p className="text-[11px] text-zinc-500 truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {meta && (
        <div className="flex items-center gap-2 shrink-0">{meta}</div>
      )}
    </>
  );
}
