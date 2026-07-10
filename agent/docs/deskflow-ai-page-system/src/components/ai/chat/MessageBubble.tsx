import { type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Bot, User } from "lucide-react"
import { cn } from "../lib/cn"
import { MOTION, TEXT } from "../tokens"
import { TypewriterText } from "./TypewriterText"
import { ParsedMessageRouter } from "./ParsedMessageRouter"
import type { CardAction, ParsedMessage } from "./parsed"

export interface MessageBubbleProps {
	role: "user" | "assistant"
	content: string
	/** When true (assistant, latest, streaming) reveal via typewriter. */
	streaming?: boolean
	timestamp?: string
	footer?: ReactNode
	/** Structured payload; when present (and not plain text) it renders as a card. */
	parsed?: ParsedMessage
	onAction?: (a: CardAction) => void
	actionResults?: Record<string, "running" | "done" | "error">
	connectorSyncing?: Record<string, true>
}

/**
 * One chat turn. User turns are pink-tinted and right-aligned; assistant turns
 * are neutral with a bot avatar. Assistant turns carrying a structured payload
 * render the matching interactive card (optionally preceded by any prose the
 * model included). Entry animates transform/opacity only; reduced-motion drops
 * the offset.
 */
export function MessageBubble({
	role,
	content,
	streaming,
	timestamp,
	footer,
	parsed,
	onAction,
	actionResults,
	connectorSyncing,
}: MessageBubbleProps) {
	const reduce = useReducedMotion()
	const isUser = role === "user"
	const hasCard = !isUser && parsed && parsed.type !== "text"
	return (
		<motion.div
			initial={ { opacity: 0, y: reduce ? 0 : 6 } }
			animate={ { opacity: 1, y: 0 } }
			transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease } }
			className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
		>
			<span
				aria-hidden
				className={cn(
					"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
					isUser
						? "bg-pink-500/15 text-pink-300 ring-pink-500/20"
						: "bg-zinc-800/60 text-zinc-300 ring-zinc-700/60",
				)}
			>
				{isUser ? <User size={14} /> : <Bot size={14} />}
			</span>
			<div
				className={cn(
					"flex flex-col gap-2",
					hasCard ? "w-full max-w-[92%]" : "max-w-[82%]",
					isUser ? "items-end" : "items-start",
				)}
			>
				{content ? (
					<div
						className={cn(
							"rounded-xl px-3.5 py-2.5 text-[13px] leading-6 ring-1",
							isUser
								? "bg-pink-500/10 text-zinc-100 ring-pink-500/15"
								: "bg-zinc-900/60 text-zinc-200 ring-zinc-800/60",
						)}
					>
						{streaming && !isUser ? (
							<TypewriterText text={content} />
						) : (
							<span className="whitespace-pre-wrap">{content}</span>
						)}
					</div>
				) : null}

				{hasCard ? (
					<div className="w-full">
						<ParsedMessageRouter
							parsed={parsed as ParsedMessage}
							onAction={onAction}
							actionResults={actionResults}
							connectorSyncing={connectorSyncing}
						/>
					</div>
				) : null}

				{timestamp || footer ? (
					<div className={cn("flex items-center gap-2 px-1 text-[11px]", TEXT.muted)}>
						{timestamp ? <span className="tabular-nums">{timestamp}</span> : null}
						{footer}
					</div>
				) : null}
			</div>
		</motion.div>
	)
}
