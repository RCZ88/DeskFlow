import { type ACCENT } from './tokens';

type AccentKey = keyof typeof ACCENT;

interface SectionHeadProps {
  accent: AccentKey;
  title: string;
  desc: string;
  right?: React.ReactNode;
}

const accentBar: Record<string, string> = {
  pink: 'bg-pink-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
  violet: 'bg-violet-500', red: 'bg-red-500',
};

export function SectionHead({ accent, title, desc, right }: SectionHeadProps) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className={`h-8 w-1 rounded-full ${accentBar[accent]}`} />
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
      </div>
      {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
