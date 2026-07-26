import React, { useState } from 'react';

export function QuizMCQDemo() {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const options = ['O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'];
  const correct = 2;

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-200">What is the time complexity of self-attention?</p>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => { if (!submitted) setSelected(i); }}
            className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition ${
              submitted && i === correct ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' :
              submitted && i === selected ? 'border-red-500/50 bg-red-500/10 text-red-300' :
              selected === i ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' :
              'border-zinc-700/30 text-zinc-400 hover:border-zinc-600/50'
            }`}
          >
            <span className="font-mono mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
          </button>
        ))}
      </div>
      {!submitted && selected !== null && (
        <button onClick={() => setSubmitted(true)} className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-medium border border-amber-500/20">Check</button>
      )}
      {submitted && (
        <p className="text-xs text-emerald-400">✓ Correct! Self-attention compares every token with every other token.</p>
      )}
    </div>
  );
}
