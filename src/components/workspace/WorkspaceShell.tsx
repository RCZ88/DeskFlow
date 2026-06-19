import { SubTabBar, SubTabDef } from './SubTabBar';
import { usePersistentSubTab } from '../../hooks/usePersistentSubTab';

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
  return (
    <div className="flex flex-col h-full">
      <SubTabBar tabs={tabs} active={active} onChange={handleChange} accent={accent} />
      <div className="flex-1 overflow-y-auto">{render(active)}</div>
    </div>
  );
}
