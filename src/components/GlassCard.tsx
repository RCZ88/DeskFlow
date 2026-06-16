type Accent = 'pink' | 'amber' | 'emerald' | 'none';

const accentConfig: Record<string, { stripe: string; border: string; bg: string; edge: string }> = {
  pink:  { stripe: 'bg-pink-500/60',     border: 'border-t-pink-500/20 hover:border-pink-500/30',   bg: 'bg-pink-500/[0.02]',  edge: 'border-pink-500/30' },
  amber: { stripe: 'bg-amber-500/60',    border: 'border-t-amber-500/20 hover:border-amber-500/30', bg: 'bg-amber-500/[0.02]', edge: 'border-amber-500/30' },
  emerald: { stripe: 'bg-emerald-500/60',border: 'border-t-emerald-500/20 hover:border-emerald-500/30', bg: 'bg-emerald-500/[0.02]', edge: 'border-emerald-500/30' },
};

interface GlassCardProps {
  variant?: 'default' | 'compact' | 'subtle' | 'notebook' | 'bordered' | 'elevated' | 'interactive';
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  default:   'bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 shadow-lg',
  compact:   'bg-zinc-900/50 backdrop-blur-md border border-zinc-800/40 shadow-sm p-3',
  subtle:    'bg-zinc-900/30 border border-zinc-800/30 shadow-sm',
  notebook:  'bg-zinc-950/70 backdrop-blur-lg border-l-2 shadow-inner',
  bordered:  'bg-transparent border-[1.5px]',
  elevated:  'bg-zinc-800/70 backdrop-blur-2xl border border-zinc-600/40 shadow-2xl',
  interactive: 'bg-zinc-900/60 backdrop-blur-xl border shadow-lg cursor-pointer hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200',
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
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${ac.stripe}`} />
          <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${ac.bg}`} />
        </>
      )}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}
