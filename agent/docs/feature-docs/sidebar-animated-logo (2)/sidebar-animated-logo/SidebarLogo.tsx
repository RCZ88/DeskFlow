import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

const PRESS_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 };

type SidebarLogoProps = { href?: string };

/**
 * Wordmark-only logo: real HTML text, no icon, no PNG.
 * Dark brushed-titanium metallic gradient, heavy + widened letterforms, with a
 * bright shine that travels left -> right across the letters. No glow — just a
 * subtle depth shadow. All styling lives in .sidebar-logo* CSS (see index.css).
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
      <span className="sidebar-logo__text">RHEO</span>
    </motion.a>
  );
}

export default SidebarLogo;
