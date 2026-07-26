import React from 'react';

export function ProposalDemo() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-medium border border-amber-500/20">AI Proposal</span>
      </div>
      <div className="text-xs space-y-1">
        <p className="text-zinc-500 line-through">Self-attention is <span className="text-red-400">fast</span>.</p>
        <p className="text-zinc-300">Self-attention has <span className="text-emerald-400">O(n²) complexity</span>.</p>
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-medium border border-emerald-500/20">Accept</button>
        <button className="px-3 py-1 rounded-lg bg-red-500/15 text-red-300 text-[10px] font-medium border border-red-500/20">Reject</button>
      </div>
    </div>
  );
}
