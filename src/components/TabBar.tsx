interface TabBarProps {
  tabs: Array<{ key: string; label: string; icon?: React.ReactNode }>;
  activeKey: string;
  onTabChange: (key: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeKey, onTabChange, className = '' }: TabBarProps) {
  return (
    <div className={`bg-zinc-900/50 p-1 rounded-xl inline-flex gap-0.5 ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
            tab.key === activeKey
              ? 'bg-[var(--page-accent)]/15 text-[var(--page-accent)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-zinc-800/50'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
