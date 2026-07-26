import React from 'react';

export function ChartDemo() {
  const bars = [
    { label: 'Epoch 1', height: 80, color: 'bg-clay-500' },
    { label: 'Epoch 2', height: 60, color: 'bg-clay-400' },
    { label: 'Epoch 3', height: 45, color: 'bg-amber-500' },
    { label: 'Epoch 4', height: 30, color: 'bg-amber-400' },
    { label: 'Epoch 5', height: 20, color: 'bg-sage-400' },
  ];
  return (
    <div className="flex items-end gap-2 h-28 px-2">
      {bars.map((b, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className={`w-full ${b.color} rounded-t-sm transition-all`} style={{ height: `${b.height}%` }} />
          <span className="text-[9px] text-zinc-600">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
