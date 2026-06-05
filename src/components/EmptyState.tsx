interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      {icon && <div className="text-[var(--text-muted)] mb-3">{icon}</div>}
      <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
      {description && <p className="text-xs text-[var(--text-muted)] mt-1 text-center max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors duration-150"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
