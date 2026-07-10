import { type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "../../lib/cn"
import { ACCENT, MOTION, TEXT, type AccentKey } from "../../tokens"

export interface CardShellProps {
	accent: AccentKey
	icon?: ReactNode
	title: string
	subtitle?: string
	right?: ReactNode
	children: ReactNode
	className?: string
}

/**
 * The single frame every parsed-response card uses. Guarantees each structured
 * reply reads as the same product (anti-slop): glass inset, ring depth instead
 * of shadow, one accent bar, 250ms transform/opacity dissolve. Reduced motion
 * collapses the entry offset to an instant fade.
 */
export function CardShell({
	accent,
	icon,
	title,
	subtitle,
	right,
	children,
	className,
}: CardShellProps) {
	const reduce = useReducedMotion()
	const a = ACCENT[accent]
	return (
		<motion.div
			initial={ { opacity: 0, y: reduce ? 0 : 6 } }
			animate={ { opacity: 1, y: 0 } }
			transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease } }
			className={cn(
				"relative overflow-hidden rounded-xl bg-zinc-900/60 p-5 ring-1 ring-zinc-800/60",
				className,
			)}
		>
			<span aria-hidden className={cn("absolute left-0 top-4 bottom-4 w-0.5 rounded-full", a.bar)} />
			<div className="mb-3 flex items-center gap-2.5">
				{icon ? (
					<span
						aria-hidden
						className={cn(
							"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900/60 ring-1 ring-zinc-800/60",
							a.text,
						)}
					>
						{icon}
					</span>
				) : null}
				<div className="min-w-0 flex-1">
					<p className={cn("truncate text-[13px] font-semibold", TEXT.primary)}>{title}</p>
					{subtitle ? <p className={cn("truncate text-[11px]", TEXT.muted)}>{subtitle}</p> : null}
				</div>
				{right}
			</div>
			{children}
		</motion.div>
	)
}
