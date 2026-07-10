import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ValidationIssue } from '../../shared/learn/types';

export function ValidationReport({ errors, warnings, onJumpToNode }: {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  onJumpToNode?: (nodeId: string) => void;
}) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Document valid — no errors or warnings
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-red-500/10 bg-red-500/5">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-red-500/10">
            {errors.map((err, i) => (
              <ErrorItem key={i} err={err} onJumpToNode={onJumpToNode} />
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/10 bg-amber-500/5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-amber-500/10">
            {warnings.map((w, i) => (
              <ErrorItem key={i} err={w} onJumpToNode={onJumpToNode} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorItem({ err, onJumpToNode }: { err: ValidationIssue; onJumpToNode?: (nodeId: string) => void }) {
  const hasLocation = err.nodeId != null || err.blockId != null;
  return (
    <div className="px-4 py-2.5 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-zinc-400 shrink-0">{err.message}</span>
        {hasLocation && (
          <button
            onClick={() => { if (err.nodeId && onJumpToNode) onJumpToNode(err.nodeId); }}
            className="flex items-center gap-1 shrink-0 text-xs text-indigo-400 hover:text-indigo-300 transition mt-0.5"
          >
            <ArrowRight className="w-3 h-3" />
            {err.nodeId}{err.blockId ? ` / ${err.blockId}` : ''}
          </button>
        )}
      </div>
    </div>
  );
}
