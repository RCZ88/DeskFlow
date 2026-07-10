import { type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "../lib/cn"
import { MOTION } from "../tokens"

export interface CollapsibleProps {
	open: boolean
	onToggle: () => void
	header: ReactNode
	children: ReactNode
	className?: string
	headerClassName?: string
}

/**
 * Height + opacity collapsible. Replaces the bespoke AnimatePresence accordions
 * in the digest / history cards with one consistent, reduced-motion-aware idiom.
 */
export function Collapsible({
	open,
	onToggle,
	header,
	children,
	className,
	headerClassName,
}: CollapsibleProps) {
	const reduce = useReducedMotion()
	return (
		<div className={cn("overflow-hidden", className)}>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				className={cn(
					"flex w-full items-center gap-2 text-left",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 rounded-lg",
					headerClassName,
				)}
			>
				<span className="min-w-0 flex-1">{header}</span>
				<motion.span
					aria-hidden
					animate={ { rotate: open ? 180 : 0 } }
					transition={ { duration: reduce ? 0 : MOTION.fast, ease: MOTION.ease } }
					className="text-zinc-500"
				>
					<ChevronDown size={15} />
				</motion.span>
			</button>
			<AnimatePresence initial={false}>
				{open ? (
					<motion.div
						key="content"
						initial={ { height: 0, opacity: 0 } }
						animate={ { height: "auto", opacity: 1 } }
						exit={ { height: 0, opacity: 0 } }
						transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.easeInOut } }
					>
						{children}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}
