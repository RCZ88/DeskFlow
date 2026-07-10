import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { cn } from "../lib/cn"

export interface TypewriterTextProps {
	text: string
	/** Characters revealed per second. */
	speed?: number
	/** Called once the full text has rendered. */
	onDone?: () => void
	className?: string
}

/**
 * Reveals streamed assistant text one chunk at a time via requestAnimationFrame
 * (no per-character setTimeout storm). Respects reduced-motion by showing the
 * full text immediately. Safe if `text` grows while streaming.
 */
export function TypewriterText({ text, speed = 90, onDone, className }: TypewriterTextProps) {
	const reduce = useReducedMotion()
	const [count, setCount] = useState(reduce ? text.length : 0)
	const rafRef = useRef<number | null>(null)
	const startRef = useRef<number | null>(null)
	const doneRef = useRef(false)

	useEffect(() => {
		if (reduce) {
			setCount(text.length)
			return
		}
		const tick = (t: number) => {
			if (startRef.current === null) startRef.current = t
			const elapsed = (t - startRef.current) / 1000
			const next = Math.min(text.length, Math.floor(elapsed * speed))
			setCount(next)
			if (next < text.length) {
				rafRef.current = requestAnimationFrame(tick)
			} else if (!doneRef.current) {
				doneRef.current = true
				onDone?.()
			}
		}
		rafRef.current = requestAnimationFrame(tick)
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current)
			startRef.current = null
		}
	}, [text, speed, reduce, onDone])

	return (
		<span className={cn("whitespace-pre-wrap", className)}>
			{text.slice(0, count)}
			{count < text.length ? (
				<span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-pink-400 motion-reduce:animate-none" />
			) : null}
		</span>
	)
}
