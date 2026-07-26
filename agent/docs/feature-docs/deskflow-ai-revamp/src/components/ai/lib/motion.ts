/**
 * Shared motion system for the /ai surface.
 *
 * Rules enforced here (Motion skill / L2 budget):
 * - Animate transform + opacity ONLY.
 * - Durations 150 / 250 / 400ms. No spring physics.
 * - Easing [0.16,1,0.3,1] standard, [0.4,0,0.2,1] in/out.
 * - Everything degrades to instant under prefers-reduced-motion.
 *
 * Use `useMotionProps()` in components so reduced-motion is handled once.
 */
import { useReducedMotion, type Variants, type Transition } from "framer-motion"
import { MOTION } from "../tokens"

export const easeOut = MOTION.ease
export const easeInOut = MOTION.easeInOut

/** Section entrance: subtle rise + fade. */
export const sectionVariants: Variants = {
	hidden: { opacity: 0, y: 8 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: MOTION.slow, ease: easeOut },
	},
}

/** Container that staggers its children on mount. */
export const staggerParent: Variants = {
	hidden: {},
	show: {
		transition: { staggerChildren: MOTION.stagger, delayChildren: 0.02 },
	},
}

/** Child row/item entrance used inside a staggerParent. */
export const itemVariants: Variants = {
	hidden: { opacity: 0, y: 6 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: MOTION.normal, ease: easeOut },
	},
}

/** Collapsible height + fade. */
export const collapseTransition: Transition = {
	duration: MOTION.normal,
	ease: easeInOut,
}

/** Dialog content. */
export const dialogVariants: Variants = {
	hidden: { opacity: 0, scale: 0.98 },
	show: { opacity: 1, scale: 1, transition: { duration: MOTION.fast, ease: easeOut } },
	exit: { opacity: 0, scale: 0.98, transition: { duration: MOTION.fast, ease: easeInOut } },
}

/**
 * Returns reduced-motion-aware variants + a flag.
 * When the user prefers reduced motion, all offsets/scales collapse so only
 * opacity (or nothing) changes, and loops should be disabled by callers.
 */
export function useMotionProps() {
	const reduce = useReducedMotion()
	if (reduce) {
		return {
			reduce: true as const,
			section: {
				hidden: { opacity: 0 },
				show: { opacity: 1, transition: { duration: 0 } },
			} satisfies Variants,
			item: {
				hidden: { opacity: 0 },
				show: { opacity: 1, transition: { duration: 0 } },
			} satisfies Variants,
			parent: { hidden: {}, show: { transition: { staggerChildren: 0 } } } satisfies Variants,
		}
	}
	return {
		reduce: false as const,
		section: sectionVariants,
		item: itemVariants,
		parent: staggerParent,
	}
}
