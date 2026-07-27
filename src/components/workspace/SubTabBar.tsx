// ============================================================================
// Sub Tab Bar
// Horizontal pill strip for workspace sub-navigation.
// Uses group accent color for active state.
// ============================================================================
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export interface SubTabDef {
  key: string;
  label: string;
  icon: LucideIcon;
  accent?: string;
}

const ACCENT_ACTIVE_BG: Record<string, string> = {
  orange:  'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25',
  green:   'bg-green-500/15 text-green-300 ring-1 ring-green-500/25',
  purple:  'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25',
  indigo:  'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/25',
  rose:    'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/25',
  amber:   'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25',
  cyan:    'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
  blue:    'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25',
  pink:    'bg-pink-500/15 text-pink-300 ring-1 ring-pink-500/25',
  violet:  'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25',
  teal:    'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25',
  yellow:  'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/25',
};

const ACCENT_DOT: Record<string, string> = {
  orange:  'bg-orange-400',
  green:   'bg-green-400',
  purple:  'bg-purple-400',
  indigo:  'bg-indigo-400',
  rose:    'bg-rose-400',
  amber:   'bg-amber-400',
  cyan:    'bg-cyan-400',
  emerald: 'bg-emerald-400',
  blue:    'bg-blue-400',
  pink:    'bg-pink-400',
  violet:  'bg-violet-400',
  teal:    'bg-teal-400',
  yellow:  'bg-yellow-400',
};

export function SubTabBar({ tabs, active, onChange, accent }: {
  tabs: SubTabDef[];
  active: string;
  onChange: (k: string) => void;
  accent?: string;
}) {
  const dotColor = accent ? ACCENT_DOT[accent] : 'bg-zinc-400';
  const activeBg = accent ? ACCENT_ACTIVE_BG[accent] : 'bg-zinc-800 text-zinc-200 ring-1 ring-zinc-700/50';

  return (
    <div role="tablist" className="flex items-center gap-1 px-3 py-2 shrink-0 border-b border-zinc-800/40">
      {tabs.map((t) => {
        const on = t.key === active;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={`relative inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-all duration-150 active:scale-95 ${
              on
                ? activeBg
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
            }`}
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
