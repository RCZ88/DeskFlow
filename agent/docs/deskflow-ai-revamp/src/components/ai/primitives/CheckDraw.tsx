import { motion } from "framer-motion"
import { cn } from "../lib/cn"
import { ACCENT, MOTION, type AccentKey } from "../tokens"

export interface CheckDrawProps {
	done: boolean
	onToggle?: () => void
	accent?: AccentKey
	size?: number
	reduce?: boolean
	label?: string
	className?: string
}

/**
 * Animated check circle. On toggle the checkmark draws itself via pathLength
 * (transform/opacity-safe). Pass reduce to render instantly under reduced-motion.
 * This is the goal-row micro-interaction that replaces the instant checkbox swap.
 */
export function CheckDraw({
	done,
	onToggle,
	accent = "emerald",
	size = 18,
	reduce = false,
	label = "Toggle complete",
	className,
}: CheckDrawProps) {
	const stroke = ACCENT[accent].hex
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={done}
			aria-label={label}
			className={cn(
				"inline-flex items-center justify-center rounded-full transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60",
				className,
			)}
		>
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
				<circle
					cx="12"
					cy="12"
					r="9"
					stroke={done ? stroke : "#52525b"}
					strokeWidth="1.5"
					fill={done ? stroke + "22" : "transparent"}
				/>
				{done ? (
					<motion.path
						d="M8 12.5l2.5 2.5L16 9"
						stroke={stroke}
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						initial={ { pathLength: reduce ? 1 : 0 } }
						animate={ { pathLength: 1 } }
						transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease } }
					/>
				) : null}
			</svg>
		</button>
	)
}
