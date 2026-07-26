import React from 'react';

export function MathDemo() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="text-lg text-zinc-100 font-serif italic">
        ℒ = -∑ yᵢ log(ŷᵢ) + (1-yᵢ)log(1-ŷᵢ)
      </div>
    </div>
  );
}
