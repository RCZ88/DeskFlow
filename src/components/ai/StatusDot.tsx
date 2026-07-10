import { motion, useReducedMotion } from "framer-motion"
import { cn } from "./lib/cn"
import { TEXT } from "./tokens"

export type DotTone = "ready" | "busy" | "error" | "idle"

const TONE: Record<DotTone, string> = {
	ready: "bg-emerald-400",
	busy: "bg-amber-400",
	error: "bg-red-400",
	idle: "bg-zinc-500",
}

export interface StatusDotProps {
	tone?: DotTone
	/** The single sanctioned ambient loop on the page (chat header only). */
	breathe?: boolean
	size?: number
	/** Optional text shown beside the dot when showLabel is set. */
	label?: string
	showLabel?: boolean
	className?: string
}

export function StatusDot({
	tone = "idle",
	breathe = false,
	size = 8,
	label,
	showLabel = false,
	className,
}: StatusDotProps) {
	const reduce = useReducedMotion()
	const pulse =
		breathe && !reduce ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }
	const dot = (
		<motion.span
			role={showLabel ? undefined : "status"}
			aria-label={showLabel ? undefined : label}
			style={ { width: size, height: size } }
			className={cn("inline-block shrink-0 rounded-full", TONE[tone], className)}
			animate={pulse}
			transition={
				breathe && !reduce
					? { duration: 2, ease: "easeInOut", repeat: Infinity }
					: { duration: 0 }
			}
		/>
	)
	if (!showLabel || !label) return dot
	return (
		<span className="inline-flex items-center gap-1.5" role="status">
			{dot}
			<span className={cn("text-[12px]", TEXT.secondary)}>{label}</span>
		</span>
	)
}
