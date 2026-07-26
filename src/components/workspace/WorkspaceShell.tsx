import { SubTabBar, SubTabDef } from './SubTabBar';
import { usePersistentSubTab } from '../../hooks/usePersistentSubTab';
import { useRef, useEffect, useCallback, useState } from 'react';

const ACCENT_TRUNK: Record<string, string> = {
  green: 'bg-green-500/30',
  emerald: 'bg-emerald-500/30',
  teal: 'bg-teal-500/30',
  cyan: 'bg-cyan-500/30',
  blue: 'bg-blue-500/30',
  indigo: 'bg-indigo-500/30',
  violet: 'bg-violet-500/30',
  purple: 'bg-purple-500/30',
  pink: 'bg-pink-500/30',
  rose: 'bg-rose-500/30',
  amber: 'bg-amber-500/30',
  yellow: 'bg-yellow-500/30',
  orange: 'bg-orange-500/30',
};

export function WorkspaceShell({ tabs, storageKey, render, onTabChange, accent }: {
  tabs: SubTabDef[];
  storageKey: string;
  render: (active: string) => React.ReactNode;
  onTabChange?: (key: string) => void;
  accent?: string;
}) {
  const [active, setActive] = usePersistentSubTab(storageKey, tabs[0].key);
  const handleChange = (key: string) => { setActive(key); onTabChange?.(key); };
  const trunkColor = accent ? ACCENT_TRUNK[accent] : 'bg-zinc-700';
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollHeight, setScrollHeight] = useState(0);

  const measure = useCallback(() => {
    if (rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      setScrollHeight(rect.height);
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    const obs = new ResizeObserver(measure);
    if (rootRef.current) obs.observe(rootRef.current);
    return () => { window.removeEventListener('resize', measure); obs.disconnect(); };
  }, [measure]);

  return (
    <div ref={rootRef} className="flex-1 min-h-0 min-w-0 flex flex-col relative">
      <SubTabBar tabs={tabs} active={active} onChange={handleChange} accent={accent} />
      <div
        className="flex-1 min-h-0 relative overflow-y-auto"
        style={{ height: scrollHeight ? `calc(${scrollHeight}px - 36px)` : '100%' }}
      >
        <div className="flex min-h-full min-w-0">
          <div className={`w-0.5 shrink-0 self-stretch ${trunkColor}`} />
          <div className="flex-1 min-w-0 px-3 py-3">
            {render(active)}
          </div>
        </div>
      </div>
    </div>
  );
}
