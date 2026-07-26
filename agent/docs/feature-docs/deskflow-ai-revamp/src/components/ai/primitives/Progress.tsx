import { motion, useReducedMotion } from "framer-motion"
import { cn } from "../lib/cn"
import { ACCENT, MOTION, type AccentKey } from "../tokens"

export interface ProgressProps {
	/** 0..1. Ignored when indeterminate. */
	value?: number
	indeterminate?: boolean
	accent?: AccentKey
	className?: string
	"aria-label"?: string
}

/**
 * Progress / sync bar. Determinate fills via scaleX (transform only).
 * Indeterminate slides a segment for honest "working..." feedback; under
 * reduced-motion it falls back to a static partial fill (no loop).
 */
export function Progress({
	value = 0,
	indeterminate,
	accent = "cyan",
	className,
	...rest
}: ProgressProps) {
	const reduce = useReducedMotion()
	const a = ACCENT[accent]
	const clamped = Math.max(0, Math.min(1, value))
	return (
		<div
			role="progressbar"
			aria-label={rest["aria-label"]}
			aria-valuenow={indeterminate ? undefined : Math.round(clamped * 100)}
			className={cn(
				"relative h-1 w-full overflow-hidden rounded-full bg-zinc-800/60",
				className,
			)}
		>
			{indeterminate ? (
				reduce ? (
					<div className={cn("h-full w-1/3 rounded-full opacity-70", a.bar)} />
				) : (
					<motion.div
						className={cn("h-full w-1/3 rounded-full", a.bar)}
						initial={ { x: "-100%" } }
						animate={ { x: "320%" } }
						transition={ { duration: 1.2, ease: "linear", repeat: Infinity } }
					/>
				)
			) : (
				<motion.div
					className={cn("h-full origin-left rounded-full", a.bar)}
					initial={ { scaleX: 0 } }
					animate={ { scaleX: clamped } }
					style={ { width: "100%" } }
					transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease } }
			/>
			)}
		</div>
	)
}
