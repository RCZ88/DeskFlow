import { forwardRef, type ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "./lib/cn"
import { ACCENT, MOTION, RING, SURFACE, type AccentKey } from "./tokens"

export interface GlassCardProps {
	children: ReactNode
	className?: string
	/** Section accent — drives the left bar + focus ring hue. Applied sparingly. */
	accent?: AccentKey
	variant?: "default" | "elevated" | "interactive"
	/** Show the vertical accent bar on the left edge. */
	bar?: boolean
	onClick?: () => void
	"aria-label"?: string
}

/**
 * The one card idiom for the /ai surface.
 * Depth comes from ring brightness + glass layering — never box-shadow.
 * rounded-xl + p-5 max, always.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
	function GlassCard(
		{ children, className, accent, variant = "default", bar = false, onClick, ...rest },
		ref,
	) {
		const interactive = variant === "interactive"
		const surface = variant === "elevated" ? SURFACE.cardHi : SURFACE.card
		return (
			<motion.div
				ref={ref}
				onClick={onClick}
				whileHover={interactive ? { y: -1 } : undefined}
				transition={{ duration: MOTION.fast, ease: MOTION.ease } as const}
				className={cn(
					"relative rounded-xl p-5",
					surface,
					RING.base,
					interactive && "cursor-pointer transition-[box-shadow] hover:" + RING.hover,
					interactive && RING.focus,
					className,
				)}
				{...rest}
			>
				{bar && accent ? (
					<span
						aria-hidden
						className={cn(
							"absolute left-0 top-4 bottom-4 w-0.5 rounded-full",
							ACCENT[accent].bar,
						)}
					/>
				) : null}
				{children}
			</motion.div>
		)
	},
)
