import { type Variants, type Transition } from 'framer-motion';

export const easeOutQuint: number[] = [0.22, 1, 0.36, 1];
export const easeInOut: number[] = [0.65, 0, 0.35, 1];

export const DUR = { MICRO: 0.15, BASE: 0.3, ENTRANCE: 0.25, COUNTER: 1.2, CHART: 0.9 };

export const pageContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.ENTRANCE, ease: easeOutQuint } },
};

export const scaleItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

export const tabPanel: Variants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.BASE } },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.94, y: 12, transition: { duration: DUR.MICRO } },
};

export const fab: Variants = {
  hidden: { scale: 0, rotate: -45 },
  show: { scale: 1, rotate: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.3 } },
};

export const shake: Variants = {
  shake: { x: [0, -8, 8, -6, 6, -3, 0], transition: { duration: 0.4 } },
};
