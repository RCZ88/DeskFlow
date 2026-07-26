import React from 'react';

export function NotesDemo() {
  return (
    <div className="space-y-2">
      <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs text-zinc-300">This is <span className="bg-amber-500/20 text-amber-300 px-1 rounded">highlighted text</span> with a note attached.</p>
      </div>
      <div className="flex gap-2">
        <button className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-[10px] font-medium border border-amber-500/20">Highlight</button>
        <button className="px-2.5 py-1 rounded-lg bg-zinc-800/40 text-zinc-400 text-[10px] font-medium border border-zinc-700/30">Add Note</button>
      </div>
    </div>
  );
}
