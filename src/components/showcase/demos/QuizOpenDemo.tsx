import React, { useState } from 'react';

export function QuizOpenDemo() {
  const [val, setVal] = useState('');
  const [showRubric, setShowRubric] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-200">Explain why layer normalization is applied before multi-head attention.</p>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs resize-none focus:outline-none focus:border-amber-500/40"
        rows={3}
        placeholder="Type your answer..."
      />
      <div className="flex gap-2">
        <button className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-medium border border-amber-500/20">Submit</button>
        <button onClick={() => setShowRubric(!showRubric)} className="px-3 py-1.5 rounded-lg text-zinc-500 text-xs hover:text-zinc-300 transition">Rubric</button>
      </div>
      {showRubric && (
        <div className="px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[10px] text-zinc-400">
          <p className="font-medium text-zinc-300 mb-1">Rubric:</p>
          <p>Must mention: (1) training stability, (2) gradient flow, (3) contrast with original post-norm design.</p>
        </div>
      )}
    </div>
  );
}
