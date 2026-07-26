import React from 'react';

export function LayerMasteryDemo() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
        <span className="text-lg">🔒</span>
        <div>
          <p className="text-xs text-zinc-300 font-medium">Advanced Attention Patterns</p>
          <p className="text-[10px] text-zinc-500">Requires L4 Mastery</p>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
        <div className="h-full rounded-full bg-amber-500" style={{ width: '65%' }} />
      </div>
      <p className="text-[10px] text-zinc-600 text-right">65% to L4</p>
    </div>
  );
}
