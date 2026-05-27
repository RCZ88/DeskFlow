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
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-300 uppercase">Memory Status</h3>
        <TrendingUp size={14} className="text-gray-500" />
      </div>

      {/* Project Context Usage */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-gray-400">Project Context</span>
          <div className={`px-2 py-0.5 rounded text-xs font-mono ${getUsageColor(projectPercent)}`}>
            {projectContextUsage.tokens} / {projectContextUsage.max}
          </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className={`${getProgressColor(projectPercent)} h-2.5 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(projectPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">{projectPercent.toFixed(0)}% utilized</p>
      </div>

      {/* Session Context Usage */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-gray-400">Session Context</span>
          <div className={`px-2 py-0.5 rounded text-xs font-mono ${getUsageColor(sessionPercent)}`}>
            {sessionContextUsage.tokens} / {sessionContextUsage.max}
          </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className={`${getProgressColor(sessionPercent)} h-2.5 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(sessionPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">{sessionPercent.toFixed(0)}% utilized</p>
      </div>

      {/* RAG Index Stats */}
      <div className="pt-3 border-t border-gray-700 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Total Messages</p>
          <p className="text-lg font-semibold text-indigo-400">{ragIndexStats.totalMessages}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Last Updated</p>
          <p className="text-xs text-gray-300 font-mono">
            {ragIndexStats.lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemoryStatusCard;
