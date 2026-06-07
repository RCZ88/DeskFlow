const accentStripe: Record<string, string> = {
  pink:  'bg-pink-500/60',
  amber: 'bg-amber-500/60',
};

const accentBorder: Record<string, string> = {
  pink:  'border-t-pink-500/20',
  amber: 'border-t-amber-500/20',
};

interface GlassCardProps {
  variant?: 'default' | 'elevated' | 'interactive';
  accent?: 'pink' | 'amber' | 'none';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles = {
  default:     'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60',
  elevated:    'bg-zinc-900/92 backdrop-blur-2xl border border-zinc-700/50',
  interactive: 'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700/60 cursor-pointer',
};

export function GlassCard({ variant = 'default', accent, className = '', children, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl p-4 transition-colors duration-150 overflow-hidden ${variantStyles[variant]} ${accent && accent !== 'none' ? accentBorder[accent] : ''} ${className}`}
    >
      {accent && accent !== 'none' && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentStripe[accent]}`} />
      )}
      {children}
    </div>
  );
}
