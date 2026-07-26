import { GlassCard } from './GlassCard';

interface SystemCardProps {
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
  className?: string;
}

export function SystemCard({ title, description, enabled, onToggle, className = '' }: SystemCardProps) {
  return (
    <GlassCard className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">{title}</p>
          {description && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{description}</p>}
        </div>
        <button
          onClick={onToggle}
          className={`w-8 h-4 rounded-full transition-colors duration-150 relative ${
            enabled ? 'bg-[var(--accent-primary)]' : 'bg-zinc-700'
          }`}
        >
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-150 ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
    </GlassCard>
  );
}
