import React from 'react';

export function CalloutDemo() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg border-l-2 border-amber-500/50 bg-amber-500/5">
        <span className="text-sm">⚠️</span>
        <div>
          <p className="text-xs text-amber-300 font-medium">Warning</p>
          <p className="text-[11px] text-zinc-400">Attention replaces recurrence entirely — this is a common misconception.</p>
        </div>
      </div>
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg border-l-2 border-emerald-500/50 bg-emerald-500/5">
        <span className="text-sm">💡</span>
        <div>
          <p className="text-xs text-emerald-300 font-medium">Tip</p>
          <p className="text-[11px] text-zinc-400">Start with simple architectures before moving to transformers.</p>
        </div>
      </div>
    </div>
  );
}
