// ============================================================================
// Workspace Design System — Status & Category Badges
// One source of truth for ALL status pills and category badges in the workspace.
// Problems, Requests, Sessions, Bugs, Issues — all use these.
// ============================================================================
import React from 'react';

// ---- Status Badges ----------------------------------------------------------
// Used by: Problems, Requests, Sessions, Bugs, Issues, Prompts
export type ProblemStatus = 'NEW' | 'Not Started' | 'In Progress' | 'AI Attempted Fix' | 'User Testing' | 'Fixed' | 'Irrelevant';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'archived' | 'action_required' | 'in_progress' | 'ready' | 'error';
export type RequestStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

const PROBLEM_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  'NEW':              { label: 'New',           cls: 'text-red-300 bg-red-500/15 ring-1 ring-red-500/30',        dot: '#f87171' },
  'Not Started':      { label: 'Not Started',   cls: 'text-zinc-400 bg-zinc-500/15 ring-1 ring-zinc-500/30',     dot: '#a1a1aa' },
  'In Progress':      { label: 'In Progress',   cls: 'text-cyan-300 bg-cyan-500/15 ring-1 ring-cyan-400/40',     dot: '#22d3ee' },
  'AI Attempted Fix': { label: 'AI Attempted',  cls: 'text-amber-300 bg-amber-500/15 ring-1 ring-amber-500/30',  dot: '#f59e0b' },
  'User Testing':     { label: 'User Testing',  cls: 'text-violet-300 bg-violet-500/15 ring-1 ring-violet-500/30', dot: '#a78bfa' },
  'Fixed':            { label: 'Fixed',         cls: 'text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/30', dot: '#34d399' },
  'Irrelevant':       { label: 'Irrelevant',    cls: 'text-zinc-500 bg-zinc-600/10 ring-1 ring-zinc-600/30',     dot: '#71717a' },
};

const SESSION_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  active:          { label: 'Active',          cls: 'text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/30', dot: '#34d399' },
  in_progress:     { label: 'Working',         cls: 'text-cyan-300 bg-cyan-500/15 ring-1 ring-cyan-400/40',     dot: '#22d3ee' },
  paused:          { label: 'Paused',          cls: 'text-yellow-300 bg-yellow-500/15 ring-1 ring-yellow-500/30', dot: '#eab308' },
  completed:       { label: 'Completed',       cls: 'text-zinc-400 bg-zinc-500/15 ring-1 ring-zinc-500/30',     dot: '#a1a1aa' },
  archived:        { label: 'Archived',        cls: 'text-zinc-500 bg-zinc-600/10 ring-1 ring-zinc-600/30',     dot: '#71717a' },
  action_required: { label: 'Action Required', cls: 'text-orange-300 bg-orange-500/15 ring-1 ring-orange-500/30', dot: '#fb923c' },
  ready:           { label: 'Ready',           cls: 'text-cyan-300 bg-cyan-500/15 ring-1 ring-cyan-400/40',     dot: '#22d3ee' },
  error:           { label: 'Error',           cls: 'text-red-300 bg-red-500/15 ring-1 ring-red-500/30',        dot: '#f87171' },
};

const REQUEST_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  Pending:    { label: 'Pending',    cls: 'text-zinc-400 bg-zinc-500/15 ring-1 ring-zinc-500/30',     dot: '#a1a1aa' },
  'In Progress': { label: 'In Progress', cls: 'text-cyan-300 bg-cyan-500/15 ring-1 ring-cyan-400/40', dot: '#22d3ee' },
  Completed:  { label: 'Completed',  cls: 'text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/30', dot: '#34d399' },
  Cancelled:  { label: 'Cancelled',  cls: 'text-zinc-500 bg-zinc-600/10 ring-1 ring-zinc-600/30',     dot: '#71717a' },
};

const BUG_SEVERITY: Record<string, { label: string; cls: string; dot: string }> = {
  critical: { label: 'Critical', cls: 'text-red-300 bg-red-500/15 ring-1 ring-red-500/30',     dot: '#f87171' },
  high:     { label: 'High',     cls: 'text-orange-300 bg-orange-500/15 ring-1 ring-orange-500/30', dot: '#fb923c' },
  medium:   { label: 'Medium',   cls: 'text-amber-300 bg-amber-500/15 ring-1 ring-amber-500/30',  dot: '#f59e0b' },
  low:      { label: 'Low',      cls: 'text-zinc-400 bg-zinc-500/15 ring-1 ring-zinc-500/30',     dot: '#a1a1aa' },
};

const STATUS_MAPS: Record<string, Record<string, { label: string; cls: string; dot: string }>> = {
  problem: PROBLEM_STATUS,
  session: SESSION_STATUS,
  request: REQUEST_STATUS,
  bug: BUG_SEVERITY,
};

// ---- WorkspaceStatusBadge ---------------------------------------------------
export function WorkspaceStatusBadge({
  status, kind = 'problem', compact = false, className = '',
}: {
  status: string; kind?: 'problem' | 'session' | 'request' | 'bug';
  compact?: boolean; className?: string;
}) {
  const map = STATUS_MAPS[kind] ?? PROBLEM_STATUS;
  const m = map[status] ?? map[Object.keys(map)[0]];
  if (!m) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${m.cls} ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5'} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

// ---- CategoryBadge ----------------------------------------------------------
// Used by: Sessions (bug-fix, feature, refactor, research, review, other)
const CATEGORY_META: Record<string, { label: string; cls: string }> = {
  'bug-fix':  { label: 'Bug Fix',    cls: 'text-red-300 bg-red-500/15 ring-1 ring-red-500/30' },
  feature:    { label: 'Feature',    cls: 'text-blue-300 bg-blue-500/15 ring-1 ring-blue-500/30' },
  refactor:   { label: 'Refactor',   cls: 'text-purple-300 bg-purple-500/15 ring-1 ring-purple-500/30' },
  research:   { label: 'Research',   cls: 'text-teal-300 bg-teal-500/15 ring-1 ring-teal-500/30' },
  review:     { label: 'Review',     cls: 'text-amber-300 bg-amber-500/15 ring-1 ring-amber-500/30' },
  other:      { label: 'Other',      cls: 'text-zinc-400 bg-zinc-500/15 ring-1 ring-zinc-500/30' },
};

export function WorkspaceCategoryBadge({
  category, compact = false, className = '',
}: {
  category: string; compact?: boolean; className?: string;
}) {
  const m = CATEGORY_META[category] ?? CATEGORY_META.other;
  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${m.cls} ${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'} ${className}`}>
      {m.label}
    </span>
  );
}

// ---- PriorityBadge ----------------------------------------------------------
// Used by: Problems
const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'text-red-300 bg-red-500/15 ring-1 ring-red-500/30' },
  high:     { label: 'High',     cls: 'text-orange-300 bg-orange-500/15 ring-1 ring-orange-500/30' },
  medium:   { label: 'Medium',   cls: 'text-amber-300 bg-amber-500/15 ring-1 ring-amber-500/30' },
  low:      { label: 'Low',      cls: 'text-zinc-400 bg-zinc-500/15 ring-1 ring-zinc-500/30' },
};

export function WorkspacePriorityBadge({
  priority, compact = false, className = '',
}: {
  priority: string; compact?: boolean; className?: string;
}) {
  const m = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${m.cls} ${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'} ${className}`}>
      {m.label}
    </span>
  );
}
