type Accent = 'pink' | 'amber' | 'emerald' | 'none';

const accentConfig: Record<string, { rail: string; border: string; bg: string; edge: string }> = {
  pink:  { rail: 'bg-pink-500/60',     border: 'border-l-pink-500/20 hover:border-l-pink-500/30',   bg: 'bg-pink-500/[0.02]',  edge: 'border-pink-500/30' },
  amber: { rail: 'bg-amber-500/60',    border: 'border-l-amber-500/20 hover:border-l-amber-500/30', bg: 'bg-amber-500/[0.02]', edge: 'border-amber-500/30' },
  emerald: { rail: 'bg-emerald-500/60',border: 'border-l-emerald-500/20 hover:border-l-emerald-500/30', bg: 'bg-emerald-500/[0.02]', edge: 'border-emerald-500/30' },
};

interface GlassCardProps {
  variant?: 'default' | 'compact' | 'subtle' | 'notebook' | 'bordered' | 'elevated' | 'interactive';
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  default:   'bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50',
  compact:   'bg-zinc-900/50 backdrop-blur-md border border-zinc-800/40 p-3',
  subtle:    'bg-zinc-900/30 border border-zinc-800/30',
  notebook:  'bg-zinc-950/70 backdrop-blur-lg border-l-2',
  bordered:  'bg-transparent border-[1.5px]',
  elevated:  'bg-zinc-800/70 backdrop-blur-2xl border border-zinc-600/40',
  interactive: 'bg-zinc-900/60 backdrop-blur-xl border cursor-pointer hover:-translate-y-0.5 transition-all duration-200',
};

export function GlassCard({ variant = 'default', accent = 'none', className = '', children, onClick }: GlassCardProps) {
  const ac = accent !== 'none' ? accentConfig[accent] : null;

  const borderStyle = ac && (variant === 'notebook' || variant === 'bordered' || variant === 'interactive' || variant === 'elevated')
    ? ac.edge
    : '';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl p-4 transition-colors duration-200 overflow-hidden ${variantStyles[variant]} ${ac ? `${ac.border}` : ''} ${borderStyle} ${className}`}
    >
      {ac && variant !== 'notebook' && variant !== 'bordered' && (
        <>
          <div className={`absolute top-0 left-0 bottom-0 w-0.5 ${ac.rail}`} />
          <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${ac.bg}`} />
        </>
      )}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}
