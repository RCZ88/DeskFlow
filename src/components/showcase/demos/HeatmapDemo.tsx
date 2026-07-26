import React from 'react';

export function HeatmapDemo() {
  const cells = Array.from({ length: 91 }, () => Math.floor(Math.random() * 4));
  const colors = ['bg-zinc-800/40', 'bg-emerald-900/60', 'bg-emerald-700/60', 'bg-emerald-500/80'];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-[3px]">
        {cells.map((level, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${colors[level]}`} />
        ))}
      </div>
      <div className="flex items-center gap-1 text-[9px] text-zinc-600">
        <span>Less</span>
        {colors.map((c, i) => <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />)}
        <span>More</span>
      </div>
    </div>
  );
}
