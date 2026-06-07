interface GlassCardProps {
  variant?: 'default' | 'elevated' | 'interactive';
  accent?: boolean;
  accentColor?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles = {
  default:     'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60',
  elevated:    'bg-zinc-900/92 backdrop-blur-2xl border border-zinc-700/50',
  interactive: 'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700/60 cursor-pointer',
};

export function GlassCard({ variant = 'default', accent, accentColor, className = '', children, onClick }: GlassCardProps) {
  const accentStyle = accent
    ? { borderLeft: `2px solid ${accentColor || 'var(--page-accent)'}40` }
    : {};

  return (
    <div
      onClick={onClick}
      style={accentStyle}
      className={`rounded-xl p-5 transition-colors duration-150 ${variantStyles[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
