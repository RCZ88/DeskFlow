interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className = '' }: ProgressProps) {
  return (
    <div className={`h-1 rounded-full bg-zinc-800 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-pink-500 transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transformOrigin: 'left', transform: `scaleX(${Math.min(value, 100) / 100})` }}
      />
    </div>
  );
}
