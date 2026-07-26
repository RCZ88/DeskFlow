import React, { useState } from 'react';

export function QuizNumericDemo() {
  const [val, setVal] = useState('');
  const [checked, setChecked] = useState(false);
  const correct = 8;

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-200">How many attention heads does a standard transformer use?</p>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-24 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-sm focus:outline-none focus:border-amber-500/40"
          placeholder="?"
        />
        <button onClick={() => setChecked(true)} className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-medium border border-amber-500/20">Check</button>
      </div>
      {checked && (
        <p className={`text-xs ${Number(val) === correct ? 'text-emerald-400' : 'text-red-400'}`}>
          {Number(val) === correct ? '✓ Correct! Standard transformers use 8 attention heads.' : `✗ The answer is ${correct}.`}
        </p>
      )}
    </div>
  );
}
