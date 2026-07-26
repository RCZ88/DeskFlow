import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Zap, Loader2, Check, ChevronRight } from "lucide-react"
import { cn } from "../../lib/cn"
import { MOTION, TEXT } from "../../tokens"
import { CardShell } from "./CardShell"
import type { ActionItem, CardAction } from "../parsed"

/**
 * Interactive checklist. Each action can carry an IPC button; clicking it fires
 * a run-ipc action that AiPage dispatches, then the row flips to a done state.
 * onResult lets AiPage report back success/failure per action label.
 */
export function ActionListCard({
	actions,
	note,
	onAction,
	results,
}: {
	actions: ActionItem[]
	note?: string
	onAction?: (a: CardAction) => void
	results?: Record<string, "running" | "done" | "error">
}) {
	const reduce = useReducedMotion()
	const [localRunning, setLocalRunning] = useState<Record<string, true>>({})
	return (
		<CardShell accent="pink" icon={<Zap size={14} />} title="Suggested actions" subtitle={note}>
			<ul className="space-y-1.5">
				{actions.map((act, i) => {
					const state = results?.[act.label] || (localRunning[act.label] ? "running" : undefined)
					return (
						<motion.li
							key={act.label + i}
							initial={ { opacity: 0, y: reduce ? 0 : 4 } }
							animate={ { opacity: 1, y: 0 } }
							transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease, delay: reduce ? 0 : i * MOTION.stagger } }
							className="flex items-center gap-3 rounded-lg bg-zinc-900/40 p-3 ring-1 ring-zinc-800/60"
						>
							<div className="min-w-0 flex-1">
								<p className={cn("truncate text-[13px] font-medium", TEXT.primary)}>{act.label}</p>
								{act.description ? <p className={cn("mt-0.5 text-[11px] leading-5", TEXT.secondary)}>{act.description}</p> : null}
							</div>
							{act.actionButton ? (
								<button
									type="button"
									disabled={state === "running" || state === "done"}
									onClick={() => {
										setLocalRunning((p) => ({ ...p, [act.label]: true }))
										onAction?.({
											kind: "run-ipc",
										ipc: act.actionButton!.ipc,
										payload: act.actionButton!.payload,
										label: act.label,
									})
									}}
									className={cn(
										"inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60",
										state === "done"
											? "bg-emerald-500/15 text-emerald-300"
											: state === "error"
												? "bg-red-500/15 text-red-300"
												: "bg-pink-500/15 text-pink-300 hover:bg-pink-500/25",
									)}
								>
									{state === "running" ? (
										<Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
									) : state === "done" ? (
										<Check size={13} />
									) : (
										<ChevronRight size={13} />
									)}
									{state === "done" ? "Done" : state === "error" ? "Failed" : act.actionButton.label}
								</button>
							) : null}
						</motion.li>
					)
				})}
			</ul>
		</CardShell>
	)
}
