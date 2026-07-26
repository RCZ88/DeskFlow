import { GlassSurface } from './GlassSurface';

export const CATEGORY_SPECTRUM = [
  '#10b981', '#34d399', '#6ee7b7', '#2dd4bf', '#14b8a6',
  '#5eead4', '#a7f3d0', '#0ea5a3', '#f59e0b', '#fb7185',
];

export function ChartDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="posBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="negBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="areaNet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface GlassTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string;
  formatter?: (val: number) => string;
}

export function GlassTooltip({ active, payload, label, formatter }: GlassTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <GlassSurface tier={2} className="!rounded-xl px-2.5 py-2 text-xs space-y-0.5 min-w-[100px]">
      {label && <p className="font-medium text-zinc-300">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name || p.dataKey}
          </span>
          <span className="font-semibold text-white tabular-nums">
            {formatter ? formatter(p.value ?? 0) : p.value}
          </span>
        </p>
      ))}
    </GlassSurface>
  );
}

export const CHART_AXIS = {
  ticks: { color: '#71717a', font: { size: 10, family: 'Inter, sans-serif' } },
  grid: { color: 'rgba(39,39,42,0.4)' },
  border: { display: false },
};
