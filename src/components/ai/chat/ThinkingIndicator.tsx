import { motion, useReducedMotion } from "framer-motion"
import { cn } from "../lib/cn"
import { TEXT } from "../tokens"

export interface ThinkingIndicatorProps {
	label?: string
	variant?: "connecting" | "thinking"
	className?: string
}

/**
 * Three-dot "agent is thinking" cue. Dots pulse on a staggered opacity loop
 * (opacity only). Under reduced-motion the dots hold at a steady mid opacity
 * so we still show a live-but-calm state instead of a jarring blink.
 */
export function ThinkingIndicator({ label, variant = "thinking", className }: ThinkingIndicatorProps) {
	const reduce = useReducedMotion()
	const displayLabel = label ?? (variant === "connecting" ? "Connecting to AI" : "Thinking")
	const dotColor = variant === "connecting" ? "bg-amber-400/80" : "bg-pink-400/80"
	return (
		<div className={cn("flex items-center gap-2", className)} role="status" aria-label={displayLabel}>
			<div className="flex items-center gap-1">
				{[0, 1, 2].map((i) => (
					<motion.span
						key={i}
						className={cn("h-1.5 w-1.5 rounded-full", dotColor)}
						initial={ { opacity: 0.3 } }
						animate={ reduce ? { opacity: 0.5 } : { opacity: [0.3, 1, 0.3] } }
						transition={
							reduce
								? { duration: 0 }
								: { duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }
						}
					/>
				))}
			</div>
			<span className={cn("text-[12px]", TEXT.muted)}>{displayLabel}…</span>
		</div>
	)
}
