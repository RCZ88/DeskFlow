import { useReducedMotion } from 'framer-motion';

export const lift = {
  rest: { y: 0, rotateZ: 0 },
  hover: { y: -8, rotateZ: -0.4 },
};

export const springy = { type: 'spring' as const, stiffness: 320, damping: 26 };

export const tap = { scale: 0.985 };

export const fadeSlide = (dir: 'left' | 'right' = 'left') => ({
  initial: { opacity: 0, x: dir === 'left' ? 24 : -24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: dir === 'left' ? -24 : 24 },
});

export const reveal = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

export const glowPulse = {
  initial: { boxShadow: '0 0 0px rgba(245,192,78,0)' },
  animate: {
    boxShadow: ['0 0 0px rgba(245,192,78,0)', '0 0 16px rgba(245,192,78,0.5)', '0 0 0px rgba(245,192,78,0)'],
    transition: { duration: 1.2, ease: 'easeOut' },
  },
};

export function useLearnMotion() {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return {
      lift: { rest: { y: 0, rotateZ: 0 }, hover: { y: 0, rotateZ: 0 } },
      springy: { type: 'spring' as const, stiffness: 0, damping: 1 },
      tap: { scale: 1 },
      fadeSlide: (dir: 'left' | 'right' = 'left') => ({
        initial: { opacity: 1, x: 0 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 1, x: 0 },
      }),
      reveal: { initial: { height: 'auto', opacity: 1 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 'auto', opacity: 1 } },
      glowPulse: { initial: {}, animate: {} },
    };
  }
  return { lift, springy, tap, fadeSlide, reveal, glowPulse };
}
