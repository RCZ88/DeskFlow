import { motion, useReducedMotion } from "framer-motion"
import { cn } from "../lib/cn"
import { ACCENT, MOTION, TEXT } from "../tokens"
import { CheckDraw } from "../primitives/CheckDraw"
import { CATEGORY_ACCENT, type Goal } from "../types"

export interface GoalRowProps {
	goal: Goal
	onToggle?: (goal: Goal) => void
	className?: string
}

function fmtTarget(seconds?: number): string | null {
	if (!seconds || seconds <= 0) return null
	const h = Math.floor(seconds / 3600)
	const m = Math.round((seconds % 3600) / 60)
	if (h > 0) return m > 0 ? h + "h " + m + "m" : h + "h"
	return m + "m"
}

/**
 * A single goal line: animated check + category dot + title + target chip.
 * Aligns to the shared row grid (40px min height, 12px gutter).
 */
export function GoalRow({ goal, onToggle, className }: GoalRowProps) {
	const reduce = useReducedMotion()
	const done = goal.status === "done" || Boolean(goal.target.done)
	const accentKey = (CATEGORY_ACCENT[goal.category] ?? "emerald") as keyof typeof ACCENT
	const target = fmtTarget(goal.target.targetSeconds)
	return (
		<motion.div
			layout={!reduce}
			className={cn(
				"flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5",
				"transition-colors duration-150 hover:bg-zinc-800/30",
				className,
			)}
		>
			<CheckDraw
				done={done}
				reduce={Boolean(reduce)}
				accent="emerald"
				onToggle={() => onToggle?.(goal)}
				label={(done ? "Mark incomplete: " : "Mark complete: ") + goal.title}
			/>
			<span
				aria-hidden
				className={cn("h-2 w-2 shrink-0 rounded-full", ACCENT[accentKey].dot)}
			/>
			<span
				className={cn(
					"min-w-0 flex-1 truncate text-[13px]",
					done ? cn(TEXT.muted, "line-through") : TEXT.primary,
				)}
			>
				{goal.title}
			</span>
			{target ? (
				<span className="shrink-0 rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[11px] tabular-nums text-zinc-400">
					{target}
				</span>
			) : null}
		</motion.div>
	)
}
