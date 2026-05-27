/**
 * Active Contexts List — Manage Enabled Project Contexts
 * 
 * Displays collapsible list of active contexts with:
 * - Enable/disable toggles
 * - Token counts
 * - Last updated timestamps
 * - Edit buttons
 * 
 * Location: src/components/context-ui/ActiveContextsList.tsx
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ToggleLeft, Pencil, RefreshCw } from 'lucide-react';

import type { ActiveContextsListProps, ContextMetadata } from '@/types/context';

// ──────────────────────────────────────────────────────────────
// Context Row Component
// ──────────────────────────────────────────────────────────────

interface ContextRowProps {
  context: ContextMetadata;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

const ContextRow: React.FC<ContextRowProps> = ({
  context,
  onToggle,
  onEdit,
  onRefresh,
  loading = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'llm-wiki':
        return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
      case 'graphify':
        return 'bg-teal-900/30 text-teal-300 border-teal-700/50';
      case 'skill':
        return 'bg-purple-900/30 text-purple-300 border-purple-700/50';
      case 'qmd':
        return 'bg-amber-900/30 text-amber-300 border-amber-700/50';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  return (
    <div className="border-t border-gray-700">
      {/* Row */}
      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-700/50 transition-colors">
        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-gray-600 rounded transition-colors"
        >
          {expanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </button>

        {/* Enable/Disable toggle */}
        <button
          onClick={() => onToggle(!context.enabled)}
          disabled={loading}
          className="p-1 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
        >
          <ToggleLeft
            size={14}
            className={`transition-colors ${
              context.enabled ? 'text-emerald-400' : 'text-gray-500'
            }`}
          />
        </button>

        {/* Context name and type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{context.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded border ${getTypeColor(context.type)}`}>
              {context.type}
            </span>
          </div>
          <p className="text-xs text-gray-500">{context.category}</p>
        </div>

        {/* Token count */}
        <div className="text-right">
          <p className="text-xs font-mono text-gray-400">{context.tokens} tokens</p>
          <p className="text-xs text-gray-600">
            {new Date(context.lastUpdated).toLocaleDateString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
            title="Refresh context"
          >
            <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onEdit}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
            title="Edit context"
          >
            <Pencil size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-12 py-2 bg-gray-700/30 border-t border-gray-700 text-xs space-y-1.5">
          {context.description && (
            <div>
              <p className="text-gray-400">Description:</p>
              <p className="text-gray-300 text-xs">{context.description}</p>
            </div>
          )}

          <div>
            <p className="text-gray-400">Source:</p>
            <p className="text-gray-300 font-mono text-xs break-all">{context.source}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <p className="text-gray-400">Created</p>
              <p className="text-gray-300">
                {new Date(context.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Last Updated</p>
              <p className="text-gray-300">
                {new Date(context.lastUpdated).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Active Contexts List Component
// ──────────────────────────────────────────────────────────────

export const ActiveContextsList: React.FC<ActiveContextsListProps> = ({
  contexts,
  onToggle,
  onEdit,
  onRefresh,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (contextId: string, enabled: boolean) => {
    setLoadingId(contextId);
    try {
      await onToggle(contextId, enabled);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRefresh = async (contextId: string) => {
    setLoadingId(contextId);
    try {
      await onRefresh(contextId);
    } finally {
      setLoadingId(null);
    }
  };

  if (contexts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <p className="text-gray-400 text-sm">No contexts available</p>
          <p className="text-gray-600 text-xs mt-1">Create project contexts to get started</p>
        </div>
      </div>
    );
  }

  const enabledCount = contexts.filter(c => c.enabled).length;
  const totalTokens = contexts.reduce((sum, c) => sum + c.tokens, 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="px-3 py-2 bg-gray-700/30 rounded border border-gray-700 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-gray-400">Enabled</p>
            <p className="font-semibold text-emerald-400">{enabledCount}</p>
          </div>
          <div>
            <p className="text-gray-400">Total</p>
            <p className="font-semibold text-gray-300">{contexts.length}</p>
          </div>
          <div>
            <p className="text-gray-400">Total Tokens</p>
            <p className="font-semibold text-indigo-400">{totalTokens}</p>
          </div>
        </div>
      </div>

      {/* Contexts */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        {contexts.map(context => (
          <ContextRow
            key={context.id}
            context={context}
            onToggle={enabled => handleToggle(context.id, enabled)}
            onEdit={() => onEdit(context.id)}
            onRefresh={() => handleRefresh(context.id)}
            loading={loadingId === context.id}
          />
        ))}
      </div>
    </div>
  );
};

export default ActiveContextsList;
