import React from 'react';

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function AnimatedGradientText({
  children,
  className = '',
  speed = 1,
  colorFrom = '#6366f1',
  colorTo = '#a78bfa',
}: AnimatedGradientTextProps) {
  return (
    <span
      className={`lyceum-animate-gradient inline bg-clip-text text-transparent ${className}`}
      style={{
        ['--bg-size' as string]: `${speed * 300}%`,
        ['--color-from' as string]: colorFrom,
        ['--color-to' as string]: colorTo,
        backgroundImage:
          'linear-gradient(90deg, var(--color-from), var(--color-to), var(--color-from))',
        backgroundSize: 'var(--bg-size) 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {children}
    </span>
  );
}
