import { Layers, Plus, Pencil, Trash2, AppWindow, Globe, Tag } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { MagicCard } from '../../components/ui/magic-card';
import { Badge } from '../../components/ui/badge';
import type { FocusGroup } from '../../hooks/useFocusGroups';
import { groupAccent } from './focusHelpers';

interface FocusGroupsPanelProps {
  groups: FocusGroup[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCreate: () => void;
  onEdit: (g: FocusGroup) => void;
  onDelete: (g: FocusGroup) => void;
}

function GroupCard({
  group,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  group: FocusGroup;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const appCount = group.allowed_apps.length;
  const siteCount = group.allowed_domains.length;
  const categoryCount = group.allowed_categories.length;
  const accent = groupAccent(group.name);

  return (
    <div
      className="rounded-xl transition-shadow"
      style={active ? { boxShadow: `0 0 24px ${accent}30, 0 10px 30px -12px rgba(0,0,0,0.6)` } : undefined}
    >
      <MagicCard
        gradientFrom={accent}
        gradientTo="#a855f7"
        gradientOpacity={0.5}
        className={`rounded-xl ${active ? 'border border-white/15' : 'border border-transparent hover:border-white/10'}`}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect();
            }
          }}
          title={group.name}
          className="cursor-pointer p-4"
        >
          {active && (
            <div
              className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full animate-pulse"
              style={{ background: accent }}
            />
          )}

          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${accent}26`, color: accent }}
            >
              <Layers className="w-3 h-3" />
            </div>
            <span className="text-[13px] font-semibold text-zinc-200 truncate flex-1">{group.name}</span>
            {active && (
              <Badge variant="secondary" className="text-[9px]" style={{ color: accent }}>active</Badge>
            )}
          </div>

        <p className="text-[10px] text-zinc-500 leading-relaxed mb-2.5 line-clamp-2">
          {group.description || 'No description'}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2.5">
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <AppWindow className="w-3 h-3" style={{ color: accent }} />
            {appCount} {appCount === 1 ? 'app' : 'apps'}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Globe className="w-3 h-3" style={{ color: accent }} />
            {siteCount} {siteCount === 1 ? 'site' : 'sites'}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Tag className="w-3 h-3" style={{ color: accent }} />
            {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <AppWindow className="w-3 h-3" style={{ color: accent }} />
            Strictness picked at session start
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-pink-300 transition-colors"
              aria-label={`Edit ${group.name}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-colors"
              aria-label={`Delete ${group.name}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        </div>
      </MagicCard>
    </div>
  );
}

export function FocusGroupsPanel({ groups, selectedId, onSelect, onCreate, onEdit, onDelete }: FocusGroupsPanelProps) {
  return (
    <GlassCard className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-pink-400" />
          Focus groups
        </h3>
        <span className="text-[10px] text-zinc-500">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
      </div>

      {groups.length === 0 ? (
        <button
          type="button"
          onClick={onCreate}
          className="border-dashed border-zinc-700/70 rounded-xl py-8 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors w-full"
        >
          <Layers className="w-5 h-5" />
          <span className="text-[12px] font-medium">Create your first focus group</span>
          <span className="text-[10px]">A named set of apps, sites and categories</span>
        </button>
      ) : (
        <>
          <div className="space-y-2 max-h-[380px] overflow-y-auto ws-scroll pr-1 flex-1">
            {groups.map(g => (
              <GroupCard
                key={g.id}
                group={g}
                active={g.id === selectedId}
                onSelect={() => onSelect(g.id === selectedId ? null : g.id)}
                onEdit={() => onEdit(g)}
                onDelete={() => onDelete(g)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-pink-400 hover:text-pink-300 text-[12px] font-semibold py-2 rounded-lg border border-zinc-800/60 hover:border-pink-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New group
          </button>
        </>
      )}
    </GlassCard>
  );
}
