import { SubTabBar, SubTabDef } from './SubTabBar';
import { usePersistentSubTab } from '../../hooks/usePersistentSubTab';

const ACCENT_TRUNK: Record<string, string> = {
  green: 'bg-green-500/30',
  orange: 'bg-orange-500/30',
  purple: 'bg-purple-500/30',
  indigo: 'bg-indigo-500/30',
  amber: 'bg-amber-500/30',
  blue: 'bg-blue-500/30',
  pink: 'bg-pink-500/30',
};

export function WorkspaceShell({ tabs, storageKey, render, onTabChange, accent }: {
  tabs: SubTabDef[];
  storageKey: string;
  render: (active: string) => React.ReactNode;
  onTabChange?: (key: string) => void;
  accent?: string;
}) {
  const [active, setActive] = usePersistentSubTab(storageKey, tabs[0].key);
  const handleChange = (key: string) => {
    setActive(key);
    onTabChange?.(key);
  };
  const trunkColor = accent ? ACCENT_TRUNK[accent] : 'bg-zinc-700';
  return (
    <div className="flex flex-1">
      <div className="relative w-[18px] flex items-center justify-center shrink-0">
        <div className={`w-0.5 h-full ${trunkColor}`} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <SubTabBar tabs={tabs} active={active} onChange={handleChange} accent={accent} />
        <div className="flex-1 overflow-y-auto">{render(active)}</div>
      </div>
    </div>
  );
}
