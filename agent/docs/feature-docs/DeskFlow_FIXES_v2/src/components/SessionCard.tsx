import { GlassCard } from './GlassCard';

interface SessionCardProps {
  title: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  agent?: string;
  topic?: string;
  timestamp?: string;
  onClick?: () => void;
  className?: string;
}

const statusDotColors: Record<string, string> = {
  active: 'bg-emerald-400',
  paused: 'bg-amber-400',
  completed: 'bg-zinc-500',
  archived: 'bg-zinc-700',
};

export function SessionCard({ title, status, agent, topic, timestamp, onClick, className = '' }: SessionCardProps) {
  return (
    <GlassCard
      variant="interactive"
      accent
      onClick={onClick}
      className={className}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusDotColors[status] || 'bg-zinc-500'}`} />
        <span className="text-xs font-medium text-[var(--text-primary)] truncate">{title}</span>
        {agent && <span className="text-[10px] text-[var(--text-muted)] ml-auto">{agent}</span>}
      </div>
      {topic && <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">{topic}</p>}
      {timestamp && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{timestamp}</p>}
    </GlassCard>
  );
}
