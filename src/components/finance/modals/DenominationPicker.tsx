import { useState } from 'react';
import type { CashDenomination } from '../finance-types';

interface DenominationPickerProps {
  denoms: CashDenomination[];
  picks: Record<number, number>;
  onPicksChange: (picks: Record<number, number>) => void;
  accent: string;
  currencySymbol: string;
  label: string;
}

export function DenominationPicker({ denoms, picks, onPicksChange, accent, currencySymbol, label }: DenominationPickerProps) {
  const update = (value: number, count: number) => {
    onPicksChange({ ...picks, [value]: Math.max(0, count) });
  };

  const total = denoms.reduce((s, d) => s + d.value * (picks[d.value] ?? 0), 0);

  return (
    <div className={`rounded-xl border p-3`} style={{ borderColor: `${accent}20`, backgroundColor: `${accent}08` }}>
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">{label}</div>
      <div className="space-y-0.5">
        {denoms.map(d => (
          <div key={d.value} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
            <span className="text-xs text-zinc-300 w-14 tabular-nums">{d.label}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => update(d.value, (picks[d.value] ?? 0) - 1)}
                className="h-11 w-11 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/50 active:scale-95 text-sm transition-all">-</button>
              <span className="text-xs tabular-nums text-zinc-200 w-10 text-center">{(picks[d.value] ?? 0)}</span>
              <button onClick={() => update(d.value, (picks[d.value] ?? 0) + 1)}
                className="h-11 w-11 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/50 active:scale-95 text-sm transition-all">+</button>
            </div>
            <span className="text-sm tabular-nums text-zinc-400 w-24 text-right">{currencySymbol}{(d.value * (picks[d.value] ?? 0)).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-700/50">
        <span className="text-xs font-medium text-zinc-300">Total selected</span>
        <span className="text-sm font-bold text-white tabular-nums">{currencySymbol}{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
