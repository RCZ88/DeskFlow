import React from 'react';
import { Loader2 } from 'lucide-react';

interface BlockSpinnerProps {
  message?: string;
  size?: 'sm' | 'md';
}

export function BlockSpinner({ message, size = 'md' }: BlockSpinnerProps) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <Loader2 className={`${iconSize} text-amber-400 animate-spin`} />
      {message && <p className="text-xs text-zinc-500">{message}</p>}
    </div>
  );
}
