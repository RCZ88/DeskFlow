import React, { useState } from 'react';

export function ConceptMapDemo() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-1 text-xs">
      {[
        { label: 'Neural Network', children: ['Layers', 'Activations'] },
        { label: 'Layers', children: ['Input', 'Hidden', 'Output'], parent: true },
        { label: 'Activations', children: ['ReLU', 'Sigmoid', 'Softmax'], parent: true },
      ].map((node, i) => (
        <div key={i} className={`${node.parent ? 'ml-4' : ''}`}>
          <button onClick={() => toggle(i)} className="flex items-center gap-1 text-zinc-300 hover:text-zinc-100 transition">
            <span className="text-[10px] text-zinc-600">{expanded.has(i) ? '▼' : '▶'}</span>
            {node.label}
          </button>
          {expanded.has(i) && node.children && (
            <div className="ml-4 mt-0.5 space-y-0.5">
              {node.children.map((child, j) => (
                <div key={j} className="text-zinc-400 text-[11px]">• {child}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
