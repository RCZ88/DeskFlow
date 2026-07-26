import React from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
  transition?: Transition;
  style?: React.CSSProperties;
}

export function BorderBeam({
  className = '',
  size = 60,
  duration = 6,
  delay = 0,
  colorFrom = '#6366f1',
  colorTo = '#a78bfa',
  reverse = false,
  initialOffset = 0,
  borderWidth = 1.5,
  transition,
  style,
}: BorderBeamProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{ borderWidth: `${borderWidth}px` }}
    >
      {reduced ? (
        <div
          className="absolute inset-0 rounded-[inherit] opacity-40"
          style={{
            background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: `${borderWidth}px`,
          }}
        />
      ) : (
        <motion.div
          className={`absolute aspect-square ${className}`}
          style={{
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            ...style,
          }}
          initial={{ offsetDistance: `${initialOffset}%` }}
          animate={{
            offsetDistance: reverse
              ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
              : [`${initialOffset}%`, `${100 + initialOffset}%`],
          }}
          transition={{
            repeat: Infinity,
            ease: 'linear',
            duration,
            delay: -delay,
            ...transition,
          }}
        />
      )}
    </div>
  );
}
