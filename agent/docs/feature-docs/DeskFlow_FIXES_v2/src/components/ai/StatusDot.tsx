interface StatusDotProps {
  color: 'emerald' | 'amber' | 'red' | 'zinc' | 'pink';
  label: string;
  breathe?: boolean;
}

const dotColor: Record<string, string> = {
  emerald: 'bg-emerald-400', amber: 'bg-amber-400', red: 'bg-red-400',
  zinc: 'bg-zinc-500', pink: 'bg-pink-400',
};

export function StatusDot({ color, label, breathe }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={label}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotColor[color]} ${
          breathe ? 'animate-breathe' : ''
        }`}
      />
      <span className="text-[11px] text-zinc-400">{label}</span>
    </span>
  );
}
