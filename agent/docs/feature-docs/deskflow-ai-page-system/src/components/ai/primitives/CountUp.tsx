import { useEffect, useRef } from "react"
import { animate, useInView, useMotionValue, useReducedMotion } from "framer-motion"
import { cn } from "../lib/cn"

export interface CountUpProps {
	value: number
	/** Animation duration in ms. Default 400 (MOTION.slow). */
	durationMs?: number
	/** Format the interpolated number for display. */
	format?: (n: number) => string
	className?: string
}

/**
 * Duration-based number count-up. Deliberately NOT spring-based (constraint:
 * no spring physics). Animates once when scrolled into view; renders the final
 * value instantly under prefers-reduced-motion.
 */
export function CountUp({
	value,
	durationMs = 400,
	format = (n) => String(Math.round(n)),
	className,
}: CountUpProps) {
	const ref = useRef<HTMLSpanElement>(null)
	const inView = useInView(ref, { once: true, margin: "0px" })
	const reduce = useReducedMotion()
	const mv = useMotionValue(0)

	useEffect(() => {
		const node = ref.current
		if (!node) return
		if (reduce || !inView) {
			node.textContent = format(value)
			return
		}
		const unsub = mv.on("change", (v) => {
			if (ref.current) ref.current.textContent = format(v)
		})
		const controls = animate(mv, value, {
			duration: durationMs / 1000,
			ease: "easeOut",
		})
		return () => {
			unsub()
			controls.stop()
		}
	}, [value, inView, reduce, durationMs, format, mv])

	return (
		<span
			ref={ref}
			className={cn("tabular-nums", className)}
			style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const}
		>
			{format(0)}
		</span>
	)
}
