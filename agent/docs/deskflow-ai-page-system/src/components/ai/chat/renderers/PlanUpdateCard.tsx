import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { GitBranch, Plus, PencilLine, Check } from "lucide-react"
import { cn } from "../../lib/cn"
import { MOTION, TEXT } from "../../tokens"
import { CardShell } from "./CardShell"
import type { CardAction, PlanChange } from "../parsed"

const META: Record<PlanChange["action"], { label: string; klass: string; icon: typeof Plus }> = {
	add: { label: "Add", klass: "bg-emerald-500/15 text-emerald-300", icon: Plus },
	modify: { label: "Modify", klass: "bg-amber-500/15 text-amber-300", icon: PencilLine },
	complete: { label: "Complete", klass: "bg-emerald-500/15 text-emerald-300", icon: Check },
}

/**
 * Animated diff of proposed long-term plan changes. Each row staggers in and is
 * color-coded by action. "Apply" hands the whole change set to AiPage which
 * persists via saveGoalsBatch.
 */
export function PlanUpdateCard({
	changes,
	note,
	onAction,
}: {
	changes: PlanChange[]
	note?: string
	onAction?: (a: CardAction) => void
}) {
	const reduce = useReducedMotion()
	const [applied, setApplied] = useState(false)
	return (
		<CardShell
			accent="violet"
			icon={<GitBranch size={14} />}
			title="Plan update"
			subtitle={note || changes.length + " proposed change" + (changes.length === 1 ? "" : "s")}
			right={
				<button
					type="button"
					disabled={applied}
					onClick={() => {
						setApplied(true)
						onAction?.({ kind: "apply-plan", changes })
					}}
					className={cn(
						"rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60",
						applied
							? "bg-emerald-500/15 text-emerald-300"
							: "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25",
					)}
				>
					{applied ? "Applied" : "Apply all"}
				</button>
			}
		>
			<ul className="space-y-1.5">
				{changes.map((c, i) => {
					const m = META[c.action] || META.modify
					const Icon = m.icon
					return (
						<motion.li
							key={c.goal.title + i}
							initial={ { opacity: 0, x: reduce ? 0 : -6 } }
							animate={ { opacity: 1, x: 0 } }
							transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease, delay: reduce ? 0 : i * MOTION.stagger } }
							className="flex items-center gap-2.5 rounded-lg bg-zinc-900/40 px-3 py-2 ring-1 ring-zinc-800/60"
						>
							<span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", m.klass)}>
								<Icon size={13} />
							</span>
							<span className={cn("min-w-0 flex-1 truncate text-[13px]", TEXT.primary)}>{c.goal.title}</span>
							{typeof c.goal.priority === "number" ? (
								<span className="shrink-0 rounded-full bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
									P{c.goal.priority}
								</span>
							) : null}
							<span className={cn("shrink-0 text-[10px] uppercase tracking-wide", TEXT.muted)}>{m.label}</span>
						</motion.li>
					)
				})}
			</ul>
		</CardShell>
	)
}
