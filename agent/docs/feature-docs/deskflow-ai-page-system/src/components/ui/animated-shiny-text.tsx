import React, { CSSProperties } from 'react';

interface AnimatedShinyTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export function AnimatedShinyText({
  children,
  className = '',
  shimmerWidth = 120,
}: AnimatedShinyTextProps) {
  return (
    <span
      style={{ ['--shiny-width' as string]: `${shimmerWidth}px` } as CSSProperties}
      className={
        'lyceum-animate-shiny-text mx-auto max-w-md bg-clip-text bg-no-repeat ' +
        '[background-position:0_0] [background-size:var(--shiny-width)_100%] ' +
        'text-zinc-400/70 ' +
        'bg-gradient-to-r from-transparent via-white/80 via-50% to-transparent ' +
        className
      }
    >
      {children}
    </span>
  );
}
