interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, icon, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-[var(--page-accent)]/15 flex items-center justify-center text-[var(--page-accent)]">
            {icon}
          </div>
        )}
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}
