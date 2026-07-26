import React from 'react';

export function TableDemo() {
  const rows = [
    { concept: 'Attention', formula: 'Q·Kᵀ/√d', example: 'Self-attention' },
    { concept: 'Softmax', formula: 'eˣᵢ / Σeˣⱼ', example: 'Score normalization' },
    { concept: 'LayerNorm', formula: '(x - μ) / √(σ² + ε)', example: 'Stabilize training' },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-700/50">
            <th className="text-left py-2 px-2 text-zinc-400 font-medium">Concept</th>
            <th className="text-left py-2 px-2 text-zinc-400 font-medium">Formula</th>
            <th className="text-left py-2 px-2 text-zinc-400 font-medium">Example</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              <td className="py-2 px-2 text-zinc-200">{r.concept}</td>
              <td className="py-2 px-2 text-amber-300 font-mono">{r.formula}</td>
              <td className="py-2 px-2 text-zinc-400">{r.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
