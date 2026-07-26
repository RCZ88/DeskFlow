import React, { useState } from 'react';

export function LayerRevealDemo() {
  const [revealed, setRevealed] = useState(1);
  const steps = ['Forward pass — compute prediction', 'Loss calculation — measure error', 'Backward pass — compute gradients', 'Weight update — adjust parameters'];

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border transition-all ${
          i < revealed ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-800/50 opacity-40'
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
            i < revealed ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-600'
          }`}>{i + 1}</span>
          <span className="text-xs text-zinc-300">{step}</span>
        </div>
      ))}
      {revealed < steps.length && (
        <button onClick={() => setRevealed(r => r + 1)} className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-medium border border-amber-500/20">
          Reveal Step {revealed + 1}
        </button>
      )}
    </div>
  );
}
