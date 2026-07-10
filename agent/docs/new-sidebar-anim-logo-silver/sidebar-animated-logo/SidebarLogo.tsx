// src/components/SidebarLogo.tsx
//
// DeskFlow “Living Logo”
// -----------------------------------------------------------------------------
// A drop-in replacement for the static <img src="./rheo-logo.png" /> in the
// sidebar header. Keeps the existing PNG (no need to re-trace the artwork) and
// layers premium motion around/through it:
//
//   L0  ambient backlight glow  (CSS keyframes, breathes every 5s)
//   L1  the rheo-logo.png       (unchanged raster)
//   L2  shimmer sweep           (CSS gradient masked to the logo shape)
//   +   Framer Motion spring    (hover scale / tap compress)
//
// All idle loops are pure CSS (GPU-cheap, no JS ticking) so it is safe in an
// always-rendered sidebar. Framer Motion is used only for the spring-based
// hover / press interaction. Respects prefers-reduced-motion on both layers.
//
// Requires the CSS in `index.additions.css` to be merged into src/index.css.

import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

// DeskFlow signature spring (matches the app's stiffness/damping/mass).
const LOGO_SPRING: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

type SidebarLogoProps = {
  /** Where the wordmark links to. Defaults to the app root. */
  href?: string;
  /** Public path to the logo asset (must match the CSS mask path). */
  src?: string;
};

export function SidebarLogo({
  href = '#/',
  src = './rheo-logo.png',
}: SidebarLogoProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.a
      href={href}
      aria-label="RHEO — Home"
      className="sidebar-logo"
      initial={false}
      whileHover={reduceMotion ? undefined : { scale: 1.04 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={LOGO_SPRING}
    >
      {/* L0 — ambient backlight glow (pink -> cyan, breathing) */}
      <span aria-hidden className="sidebar-logo__glow" />

      {/* L1 — the existing raster logo */}
      <img src={src} alt="RHEO" className="sidebar-logo__img h-8 object-contain" />

      {/* L2 — shimmer sweep, masked to the logo's pixels */}
      <span aria-hidden className="sidebar-logo__shine" />
    </motion.a>
  );
}

export default SidebarLogo;
