import React, { useState } from 'react';

export function WidgetDemo() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <button onClick={() => setCount(c => c - 1)} className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition text-sm">−</button>
      <span className="text-2xl font-mono text-zinc-100 w-12 text-center">{count}</span>
      <button onClick={() => setCount(c => c + 1)} className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition text-sm">+</button>
      <button onClick={() => setCount(0)} className="px-2 py-1 rounded-lg text-[10px] text-zinc-600 hover:text-zinc-400 transition">Reset</button>
    </div>
  );
}
