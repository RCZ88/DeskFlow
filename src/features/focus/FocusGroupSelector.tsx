import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers, Plus, Pencil, Trash2, Target, Clock } from 'lucide-react';
import type { FocusGroup } from '../../hooks/useFocusGroups';
import { fmtDuration } from './focusHelpers';

const tapScale = { scale: 0.95 };

interface FocusGroupSelectorProps {
  groups: FocusGroup[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCreate: () => void;
  onEdit: (group: FocusGroup) => void;
  onDelete: (group: FocusGroup) => void;
}

export function FocusGroupSelector({ groups, selectedId, onSelect, onCreate, onEdit, onDelete }: FocusGroupSelectorProps) {
  const selected = useMemo(() => groups.find(g => g.id === selectedId) ?? null, [groups, selectedId]);

  if (groups.length === 0) {
    return (
      <div className="mb-4">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-zinc-700/70 text-zinc-400 hover:text-pink-300 hover:border-pink-500/40 hover:bg-pink-500/5 transition-colors text-[12px] font-semibold"
        >
          <Plus className="w-4 h-4" />
          Create a focus group
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Focus groups
        </span>
        <button
          onClick={onCreate}
          className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {groups.map(g => {
          const active = g.id === selectedId;
          const goalSec = g.daily_goal_sec;
          return (
            <motion.button
              key={g.id}
              whileTap={tapScale}
              onClick={() => onSelect(active ? null : g.id)}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                active
                  ? 'bg-pink-500/15 text-pink-200 border-pink-500/30 shadow-lg shadow-pink-500/10'
                  : 'bg-zinc-900/60 text-zinc-300 border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700/50'
              }`}
              title={g.description ?? undefined}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-pink-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="text-[12px] font-semibold truncate">{g.name}</span>
                  {goalSec && (
                    <span className="text-[9px] text-zinc-500 flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5" />
                      {fmtDuration(goalSec)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 truncate">
                  {g.allowed_apps.length > 0 ? `${g.allowed_apps.length} apps · ` : ''}
                  {g.allowed_domains.length > 0 ? `${g.allowed_domains.length} sites · ` : ''}
                  {g.allowed_categories.length > 0 ? `${g.allowed_categories.length} categories` : 'All productive'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); onEdit(g); }}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-pink-300 hover:bg-zinc-800 transition-colors"
                  title="Edit group"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(g); }}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-rose-300 hover:bg-zinc-800 transition-colors"
                  title="Delete group"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-3 px-4 py-3 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {selected.description || 'No description set.'}
            {selected.default_duration != null && (
              <span className="text-pink-400/70 ml-2">Default: {Math.round(selected.default_duration / 60)}m</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
