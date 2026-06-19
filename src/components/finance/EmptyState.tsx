import { type ReactNode } from 'react';
import { GlassSurface } from './_fx/GlassSurface';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <GlassSurface className="p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
        <p className="text-xs text-zinc-500 max-w-[220px]">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
          >
            {action.label}
          </button>
        )}
      </div>
    </GlassSurface>
  );
}
