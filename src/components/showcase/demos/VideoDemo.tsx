import React from 'react';

export function VideoDemo() {
  return (
    <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 h-32 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-clay-500/20 border border-clay-500/30 flex items-center justify-center">
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-clay-400 ml-1" />
        </div>
        <p className="text-[10px] text-zinc-500">Video lecture</p>
      </div>
    </div>
  );
}
