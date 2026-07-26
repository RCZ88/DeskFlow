import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Sparkles, Check, X } from "lucide-react"
import { cn } from "../../lib/cn"
import { ACCENT, MOTION, TEXT, type AccentKey } from "../../tokens"
import { CardShell } from "./CardShell"
import type { CardAction, ParsedGoal } from "../parsed"
import { useState } from "react"

const CATEGORY_ACCENT: Record<string, AccentKey> = {
	work: "pink",
	personal: "violet",
	health: "emerald",
	learning: "cyan",
	finance: "amber",
	relationships: "red",
}
function catAccent(c?: string): AccentKey {
	return (c && CATEGORY_ACCENT[c]) || "emerald"
}

/**
 * Renders AI-suggested goals as accept/dismiss cards. Accepting optimistically
 * removes the row and fires an accept-goal action (AiPage persists via saveGoal
 * and reloads). Category drives a single pill accent.
 */
export function GoalSuggestionCard({
	goals,
	source,
	onAction,
}: {
	goals: ParsedGoal[]
	source?: string
	onAction?: (a: CardAction) => void
}) {
	const reduce = useReducedMotion()
	const [gone, setGone] = useState<Record<string, true>>({})
	const visible = goals.filter((g) => !gone[g.title])

	const resolve = (g: ParsedGoal, kind: "accept-goal" | "dismiss-goal") => {
		setGone((p) => ({ ...p, [g.title]: true }))
		onAction?.({ kind, goal: g } as CardAction)
	}

	return (
		<CardShell
			accent="emerald"
			icon={<Sparkles size={14} />}
			title="Suggested goals"
			subtitle={source ? "Based on " + source : "Tap to add to today"}
		>
			{visible.length === 0 ? (
				<p className={cn("text-[12px]", TEXT.muted)}>All suggestions handled.</p>
			) : (
				<ul className="space-y-2">
					<AnimatePresence initial={false}>
						{visible.map((g) => {
							const a = ACCENT[catAccent(g.category)]
							return (
								<motion.li
									key={g.title}
								layout={!reduce}
								initial={ { opacity: 0, y: reduce ? 0 : 4 } }
								animate={ { opacity: 1, y: 0 } }
								exit={ { opacity: 0, height: 0, marginBottom: 0 } }
								transition={ { duration: reduce ? 0 : MOTION.fast, ease: MOTION.ease } }
								className="flex items-start gap-3 rounded-lg bg-zinc-900/40 p-3 ring-1 ring-zinc-800/60"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className={cn("truncate text-[13px] font-medium", TEXT.primary)}>{g.title}</span>
											{g.category ? (
												<span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", a.pill)}>
													{g.category}
												</span>
											) : null}
										</div>
										{g.reason ? <p className={cn("mt-1 text-[11px] leading-5", TEXT.secondary)}>{g.reason}</p> : null}
									</div>
									<div className="flex shrink-0 items-center gap-1">
										<button
											type="button"
											onClick={() => resolve(g, "accept-goal")}
											aria-label={"Accept " + g.title}
											className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
										>
											<Check size={14} />
										</button>
										<button
											type="button"
											onClick={() => resolve(g, "dismiss-goal")}
											aria-label={"Dismiss " + g.title}
											className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60"
										>
											<X size={14} />
										</button>
									</div>
								</motion.li>
							)
						})}
					</AnimatePresence>
				</ul>
			)}
		</CardShell>
	)
}
