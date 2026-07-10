import { type LucideIcon } from 'lucide-react';
import { MOTION } from './tokens';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function IconButton({ icon: Icon, label, onClick, disabled, className = '' }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`relative grid place-items-center rounded-lg
        w-8 h-8 min-w-[44px] min-h-[44px] p-0
        text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60
        disabled:text-zinc-600 disabled:cursor-not-allowed
        focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none
        transition-colors ${className}`}
    >
      <Icon className="h-4 w-4 pointer-events-none" />
    </button>
  );
}
