import { LucideIcon } from 'lucide-react';

export interface SubTabDef {
  key: string;
  label: string;
  icon: LucideIcon;
  accent?: string;
}

const SUBTAB_ACTIVE: Record<string, string> = {
  green: 'bg-green-950/40 text-green-300',
  orange: 'bg-orange-950/40 text-orange-300',
  purple: 'bg-purple-950/40 text-purple-300',
  indigo: 'bg-indigo-950/40 text-indigo-300',
  amber: 'bg-amber-950/40 text-amber-300',
  blue: 'bg-blue-950/40 text-blue-300',
  pink: 'bg-pink-950/40 text-pink-300',
};

const ACCENT_DOT: Record<string, string> = {
  green: 'bg-green-400',
  orange: 'bg-orange-400',
  purple: 'bg-purple-400',
  indigo: 'bg-indigo-400',
  amber: 'bg-amber-400',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400',
};

export function SubTabBar({ tabs, active, onChange, accent }: {
  tabs: SubTabDef[];
  active: string;
  onChange: (k: string) => void;
  accent?: string;
}) {
  const dotColor = accent ? ACCENT_DOT[accent] : 'bg-zinc-400';

  return (
    <div role="tablist" className="flex items-center gap-1 py-2 pr-4">
      {tabs.map((t) => {
        const on = t.key === active;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={[
              'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium',
              'transition-all duration-150 active:scale-95',
              on
                ? (accent ? SUBTAB_ACTIVE[accent] : 'bg-zinc-800 text-zinc-200')
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40',
            ].join(' ')}
          >
            {on && (
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
            )}
            <Icon size={13} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}
