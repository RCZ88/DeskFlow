import React from 'react';

export function TutorDemo() {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-clay-500/20 flex items-center justify-center shrink-0">
          <span className="text-[10px]">👤</span>
        </div>
        <div className="px-3 py-2 rounded-lg bg-zinc-800/60 text-xs text-zinc-300 rounded-tl-none">
          What is backpropagation?
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-[10px]">🤖</span>
        </div>
        <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-zinc-300 rounded-tl-none">
          Backpropagation computes gradients by propagating errors backward through the network using the chain rule...
        </div>
      </div>
    </div>
  );
}
