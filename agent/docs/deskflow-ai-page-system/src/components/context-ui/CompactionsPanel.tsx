/**
 * Compactions Panel — View Message Compaction History
 * 
 * Displays monthly compaction records with:
 * - Date range and compression ratio
 * - Key decisions extracted
 * - Patterns and anti-patterns
 * - Download and view summary buttons
 * 
 * Location: src/components/context-ui/CompactionsPanel.tsx
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Eye, Lightbulb, AlertTriangle } from 'lucide-react';

import type { CompactionsPanelProps, CompactionRecord } from '@/types/context';

// ──────────────────────────────────────────────────────────────
// Compaction Row Component
// ──────────────────────────────────────────────────────────────

interface CompactionRowProps {
  compaction: CompactionRecord;
  onExpand: (id: string) => void;
  onDownload: (id: string) => void;
  expanded?: boolean;
}

const CompactionRow: React.FC<CompactionRowProps> = ({
  compaction,
  onExpand,
  onDownload,
  expanded = false,
}) => {
  const periodStart = new Date(compaction.periodStart).toLocaleDateString();
  const periodEnd = new Date(compaction.periodEnd).toLocaleDateString();

  return (
    <div className="border-t border-gray-700">
      {/* Row */}
      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-700/50 transition-colors">
        {/* Expand button */}
        <button
          onClick={() => onExpand(compaction.id)}
          className="p-1 hover:bg-gray-600 rounded transition-colors"
        >
          {expanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </button>

        {/* Date range */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            {periodStart} — {periodEnd}
          </p>
          <p className="text-xs text-gray-500">
            {compaction.inputMessageCount} messages → {compaction.outputSummaryTokens} tokens
          </p>
        </div>

        {/* Compression ratio badge */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-semibold text-indigo-400">
              {compaction.compressionRatio.toFixed(1)}x
            </p>
            <p className="text-xs text-gray-500">compression</p>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={() => onDownload(compaction.id)}
              className="p-1 hover:bg-gray-600 rounded transition-colors"
              title="Download summary"
            >
              <Download size={14} className="text-gray-400" />
            </button>
            <button
              className="p-1 hover:bg-gray-600 rounded transition-colors"
              title="View full summary"
            >
              <Eye size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-12 py-3 bg-gray-700/30 border-t border-gray-700 space-y-3">
          {/* Key Decisions */}
          {compaction.keyDecisions && compaction.keyDecisions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={14} className="text-amber-400" />
                <p className="text-xs font-semibold text-gray-300">Key Decisions</p>
              </div>
              <ul className="space-y-1">
                {compaction.keyDecisions.map((decision, idx) => (
                  <li key={idx} className="text-xs text-gray-300 pl-4 relative">
                    <span className="absolute left-0 text-gray-600">•</span>
                    {decision}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Patterns */}
          {compaction.patterns && compaction.patterns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-2">Patterns & Best Practices</p>
              <ul className="space-y-1">
                {compaction.patterns.map((pattern, idx) => (
                  <li key={idx} className="text-xs text-gray-300 pl-4 relative">
                    <span className="absolute left-0 text-gray-600">✓</span>
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Anti-Patterns */}
          {compaction.antiPatterns && compaction.antiPatterns.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-400" />
                <p className="text-xs font-semibold text-gray-300">Anti-Patterns to Avoid</p>
              </div>
              <ul className="space-y-1">
                {compaction.antiPatterns.map((antiPattern, idx) => (
                  <li key={idx} className="text-xs text-gray-300 pl-4 relative">
                    <span className="absolute left-0 text-red-600">✗</span>
                    {antiPattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t border-gray-600 text-xs">
            <p className="text-gray-500">
              Created: {new Date(compaction.createdAt).toLocaleString()}
            </p>
            <p className="text-gray-500 text-xs mt-1 font-mono">
              Summary file: {compaction.summaryFile}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Compactions Panel Component
// ──────────────────────────────────────────────────────────────

export const CompactionsPanel: React.FC<CompactionsPanelProps> = ({
  compactions,
  onExpandSummary,
  onDownload,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (compactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <Lightbulb size={24} className="mx-auto mb-2 text-gray-600" />
          <p className="text-gray-400 text-sm">No compactions yet</p>
          <p className="text-gray-600 text-xs mt-1">Messages will be compressed monthly</p>
        </div>
      </div>
    );
  }

  const totalMessages = compactions.reduce((sum, c) => sum + c.inputMessageCount, 0);
  const totalSavings = compactions.reduce((sum, c) => sum + c.inputTokens - c.outputSummaryTokens, 0);
  const avgRatio =
    compactions.reduce((sum, c) => sum + c.compressionRatio, 0) / compactions.length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="px-3 py-2 bg-gray-700/30 rounded border border-gray-700">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-gray-400">Total Messages</p>
            <p className="font-semibold text-emerald-400">{totalMessages.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Tokens Saved</p>
            <p className="font-semibold text-indigo-400">{totalSavings.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Avg Compression</p>
            <p className="font-semibold text-amber-400">{avgRatio.toFixed(1)}x</p>
          </div>
        </div>
      </div>

      {/* Compactions */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        {compactions.map(compaction => (
          <CompactionRow
            key={compaction.id}
            compaction={compaction}
            onExpand={id => setExpandedId(expandedId === id ? null : id)}
            onDownload={onDownload}
            expanded={expandedId === compaction.id}
          />
        ))}
      </div>
    </div>
  );
};

export default CompactionsPanel;
