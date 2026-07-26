import { motion, useReducedMotion } from "framer-motion"
import { Bot, Calendar, Flag, Sparkles } from "lucide-react"
import { cn } from "../lib/cn"
import { MOTION, TEXT } from "../tokens"

export interface ChatSuggestion {
	id: string
	label: string
	prompt: string
}

export interface ChatEmptyStateProps {
	suggestions?: ChatSuggestion[]
	onPick?: (prompt: string) => void
	greeting?: string
}

const DEFAULTS: ChatSuggestion[] = [
	{ id: "plan", label: "Plan my day", prompt: "Help me plan my day based on my goals." },
	{ id: "summary", label: "Summarize progress", prompt: "Summarize my progress this week." },
	{ id: "focus", label: "What should I focus on?", prompt: "What's the most important thing to focus on right now?" },
]

const ICONS = [Calendar, Sparkles, Flag]

/**
 * First-run chat state: a calm greeting + tappable prompt chips (staggered in).
 * No giant hero headline or eyebrow label — keeps to the anti-slop brief.
 */
export function ChatEmptyState({ suggestions = DEFAULTS, onPick, greeting }: ChatEmptyStateProps) {
	const reduce = useReducedMotion()
	return (
		<div className="flex flex-col items-center justify-center gap-4 px-5 py-10 text-center">
			<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20">
				<Bot size={20} />
			</span>
			<div className="space-y-1">
				<p className={cn("text-[14px] font-semibold", TEXT.primary)}>
					{greeting ?? "How can I help?"}
				</p>
				<p className={cn("text-[12px]", TEXT.muted)}>Ask anything, or start with a suggestion.</p>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-2">
				{suggestions.map((s, i) => {
					const Icon = ICONS[i % ICONS.length]
					return (
						<motion.button
							key={s.id}
							type="button"
							onClick={() => onPick?.(s.prompt)}
							initial={ { opacity: 0, y: reduce ? 0 : 6 } }
							animate={ { opacity: 1, y: 0 } }
							transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease, delay: reduce ? 0 : i * MOTION.stagger } }
							className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/60 px-3 py-1.5 text-[12px] font-medium text-zinc-300 ring-1 ring-zinc-800/60 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
						>
							<Icon size={13} className="text-pink-300/80" />
							{s.label}
						</motion.button>
					)
				})}
			</div>
		</div>
	)
}
