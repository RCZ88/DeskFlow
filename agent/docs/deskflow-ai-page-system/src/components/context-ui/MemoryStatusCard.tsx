/**
 * Memory Status Card — Visual Token Usage Display
 * 
 * Shows donut charts and progress bars for:
 * - Project context token usage
 * - Session context token usage
 * - RAG index statistics
 * 
 * Location: src/components/context-ui/MemoryStatusCard.tsx
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { GlassCard } from '../GlassCard';

import type { MemoryStatusCardProps } from '@/types/context';

// ──────────────────────────────────────────────────────────────
// Memory Status Card Component
// ──────────────────────────────────────────────────────────────

export const MemoryStatusCard: React.FC<MemoryStatusCardProps> = ({
  projectContextUsage,
  sessionContextUsage,
  ragIndexStats,
}) => {
  const projectPercent = (projectContextUsage.tokens / projectContextUsage.max) * 100;
  const sessionPercent = (sessionContextUsage.tokens / sessionContextUsage.max) * 100;

  // Determine color based on usage
  const getUsageColor = (percent: number): string => {
    if (percent > 90) return 'text-red-500 bg-red-900/20';
    if (percent > 70) return 'text-amber-500 bg-amber-900/20';
    return 'text-emerald-500 bg-emerald-900/20';
  };

  const getProgressColor = (percent: number): string => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <GlassCard className="p-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Memory Status</h3>
        <TrendingUp size={12} className="text-zinc-600" />
      </div>

      {/* Project Context Usage */}
      <div className="space-y-1">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] text-zinc-500">Project Context</span>
          <div className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${getUsageColor(projectPercent)}`}>
            {projectContextUsage.tokens} / {projectContextUsage.max}
          </div>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            className={`${getProgressColor(projectPercent)} h-1.5 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(projectPercent, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-600">{projectPercent.toFixed(0)}% utilized</p>
      </div>

      {/* Session Context Usage */}
      <div className="space-y-1">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] text-zinc-500">Session Context</span>
          <div className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${getUsageColor(sessionPercent)}`}>
            {sessionContextUsage.tokens} / {sessionContextUsage.max}
          </div>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            className={`${getProgressColor(sessionPercent)} h-1.5 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(sessionPercent, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-600">{sessionPercent.toFixed(0)}% utilized</p>
      </div>

      {/* RAG Index Stats */}
      <div className="pt-2 border-t border-zinc-700/50 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-zinc-600 mb-0.5">Total Messages</p>
          <p className="text-sm font-semibold text-violet-400">{ragIndexStats.totalMessages}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-600 mb-0.5">Last Updated</p>
          <p className="text-[10px] text-zinc-400 font-mono">
            {ragIndexStats.lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

export default MemoryStatusCard;
