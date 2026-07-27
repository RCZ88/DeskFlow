import { type Variants } from 'framer-motion';

export const viewVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export const viewTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slidePanelVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};
