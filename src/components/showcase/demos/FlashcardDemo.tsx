import React, { useState } from 'react';

export function FlashcardDemo() {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="space-y-3">
      <div
        className="relative w-full h-36 cursor-pointer perspective-[600px]"
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className="w-full h-full relative transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div className="absolute inset-0 rounded-xl border border-zinc-700/50 bg-[#1c1917] flex items-center justify-center p-4" style={{ backfaceVisibility: 'hidden' }}>
            <p className="text-sm text-zinc-200 text-center">What does softmax do in attention?</p>
            <p className="absolute bottom-2 text-[9px] text-zinc-600">Click to flip</p>
          </div>
          <div className="absolute inset-0 rounded-xl border border-zinc-700/50 bg-[#1c1917] flex items-center justify-center p-4" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <p className="text-sm text-zinc-200 text-center">Converts attention scores into probabilities that sum to 1, weighting how much each token attends to others.</p>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-1.5">
        {['Again', 'Hard', 'Good', 'Easy'].map((label, i) => (
          <button key={label} className={`px-2.5 py-1 rounded-lg border text-[10px] font-medium ${['border-red-500/30 text-red-400', 'border-zinc-600/30 text-zinc-400', 'border-amber-500/30 text-amber-400', 'border-emerald-500/30 text-emerald-400'][i]}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
