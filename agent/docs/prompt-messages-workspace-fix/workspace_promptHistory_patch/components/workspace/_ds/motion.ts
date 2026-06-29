// ============================================================================
// Workspace Design System — Motion
// One source of truth for animation across every workspace surface.
// Tuned to the app's existing tokens: ease (0.16,1,0.3,1), 150/250/400ms.
// Respects prefers-reduced-motion globally (handled in index.css).
// ============================================================================
import { type Variants, type Transition } from 'framer-motion';

// Signature easing — calm, confident deceleration.
export const EASE_OUT: number[] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: number[] = [0.65, 0, 0.35, 1];

// Durations (seconds) mapped to --fast / --normal / --slow.
export const DUR = { fast: 0.15, normal: 0.25, slow: 0.4 } as const;

// Springs — two tiers for layered, physical motion.
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 };
export const SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 420, damping: 28, mass: 0.6 };

// Parent list: stagger children for a graceful cascade.
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

// Each row rises into place.
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

// Expand / collapse for detail panels (height auto via AnimatePresence).
export const expandPanel: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: { opacity: 1, height: 'auto', transition: { height: { duration: DUR.normal, ease: EASE_OUT }, opacity: { duration: DUR.fast, delay: 0.05 } } },
  exit: { opacity: 0, height: 0, transition: { height: { duration: DUR.fast, ease: EASE_OUT }, opacity: { duration: DUR.fast } } },
};

// Chips / pills pop in.
export const popItem: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: SPRING_SNAPPY },
};

// Tab/content cross-fade.
export const tabPanel: Variants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE_OUT } },
};
