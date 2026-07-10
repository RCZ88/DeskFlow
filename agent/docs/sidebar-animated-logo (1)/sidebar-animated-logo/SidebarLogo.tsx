import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

const PRESS_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 };

type SidebarLogoProps = { href?: string };

/**
 * Live wordmark: real HTML text + inline SVG icon (no PNG, no boxed background).
 *
 * NOTE: the <path> below is a placeholder approximation of the swirl glyph traced
 * from the current PNG. Before shipping, re-export the real vector from your design
 * tool (Figma/Illustrator) if you have it, or run rheo-logo.png through an AI
 * vectorizer (Vectorizer.AI, Adobe Express PNG-to-SVG) to get a pixel-accurate path,
 * then swap the `d` attribute below. Everything else (animation, layout, sizing)
 * stays the same.
 */
export function SidebarLogo({ href = '#/' }: SidebarLogoProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.a
      href={href}
      aria-label="RHEO — Home"
      className="sidebar-logo"
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={PRESS_SPRING}
    >
      <svg className="sidebar-logo__icon" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 3 C22 3 27 8 27 15 C27 20.5 22.8 24.8 17.3 24.8 C13.3 24.8 10.1 22 10.1 18.2 C10.1 15 12.5 12.6 15.5 12.6 C17.8 12.6 19.6 14.3 19.6 16.4"
          stroke="url(#rheoIconGradient)"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="rheoIconGradient" x1="3" y1="3" x2="27" y2="27">
            <stop offset="0" stopColor="#ec4899" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <span className="sidebar-logo__text">RHEO</span>
    </motion.a>
  );
}

export default SidebarLogo;
