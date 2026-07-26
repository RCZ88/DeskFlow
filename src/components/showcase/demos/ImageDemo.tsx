import React from 'react';

export function ImageDemo() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 h-32 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-1">🖼️</div>
          <p className="text-[10px] text-zinc-600">Image with caption</p>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500 italic text-center">Figure 1: Transformer architecture overview</p>
    </div>
  );
}
