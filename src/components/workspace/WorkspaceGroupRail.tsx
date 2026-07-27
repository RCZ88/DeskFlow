// ============================================================================
// Workspace Group Rail
// Vertical icon rail for the 6 workspace groups.
// Replaces the old chunky text buttons with clean icon-only navigation.
// ============================================================================
import React from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Monitor, PieChart, Sparkles, Bot, Settings2,
  Shield, HelpCircle
} from 'lucide-react';
import { Tooltip } from '../ui/tooltip';

type GroupKey = 'setup' | 'work' | 'insights' | 'studio' | 'conductor' | 'context';

interface GroupDef {
  key: GroupKey;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent: string;
  accentHex: string;
}

const GROUPS: GroupDef[] = [
  { key: 'setup',     icon: Settings,   label: 'Setup',     accent: 'orange',  accentHex: '#f97316' },
  { key: 'work',      icon: Monitor,    label: 'Work',      accent: 'green',   accentHex: '#22c55e' },
  { key: 'insights',  icon: PieChart,   label: 'Insights',  accent: 'purple',  accentHex: '#a855f7' },
  { key: 'studio',    icon: Sparkles,   label: 'Studio',    accent: 'indigo',  accentHex: '#818cf8' },
  { key: 'conductor', icon: Bot,        label: 'Conductor', accent: 'rose',    accentHex: '#fb7185' },
  { key: 'context',   icon: Settings2,  label: 'Context',   accent: 'amber',   accentHex: '#fbbf24' },
];

const ACCENT_ACTIVE: Record<string, string> = {
  orange:  'text-orange-400',
  green:   'text-green-400',
  purple:  'text-purple-400',
  indigo:  'text-indigo-400',
  rose:    'text-rose-400',
  amber:   'text-amber-400',
};

const ACCENT_BORDER: Record<string, string> = {
  orange:  'bg-orange-500',
  green:   'bg-green-500',
  purple:  'bg-purple-500',
  indigo:  'bg-indigo-500',
  rose:    'bg-rose-500',
  amber:   'bg-amber-500',
};

const ACCENT_BG: Record<string, string> = {
  orange:  'bg-orange-500/10',
  green:   'bg-green-500/10',
  purple:  'bg-purple-500/10',
  indigo:  'bg-indigo-500/10',
  rose:    'bg-rose-500/10',
  amber:   'bg-amber-500/10',
};

interface WorkspaceGroupRailProps {
  activeGroup: GroupKey;
  onGroupChange: (group: GroupKey) => void;
  fileChangedPulse?: boolean;
}

export function WorkspaceGroupRail({
  activeGroup, onGroupChange, fileChangedPulse,
}: WorkspaceGroupRailProps) {
  return (
    <nav className="flex flex-col items-center w-11 shrink-0 bg-zinc-950 border-r border-zinc-800/40 py-2 gap-0.5">
      {GROUPS.map((g) => {
        const isActive = activeGroup === g.key;
        const Icon = g.icon;
        return (
          <Tooltip key={g.key} content={g.label} side="right">
            <button
              onClick={() => onGroupChange(g.key)}
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
                isActive
                  ? `${ACCENT_BG[g.accent]} ${ACCENT_ACTIVE[g.accent]}`
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="rail-indicator"
                  className={`absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full ${ACCENT_BORDER[g.accent]}`}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Icon className="w-4 h-4" />

              {g.key === 'work' && fileChangedPulse && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              )}
            </button>
          </Tooltip>
        );
      })}

      {/* Bottom section */}
      <div className="flex-1" />
      <div className="w-5 h-px bg-zinc-800 my-1" />
      <Tooltip content="Help" side="right">
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 transition-colors duration-150">
          <HelpCircle className="w-4 h-4" />
        </button>
      </Tooltip>
    </nav>
  );
}
