import { type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Bot, User } from "lucide-react"
import { cn } from "../lib/cn"
import { MOTION, TEXT } from "../tokens"
import { TypewriterText } from "./TypewriterText"

export interface MessageBubbleProps {
	role: "user" | "assistant"
	content: string
	/** When true (assistant, latest, streaming) reveal via typewriter. */
	streaming?: boolean
	timestamp?: string
	footer?: ReactNode
}

/**
 * One chat turn. User turns are pink-tinted and right-aligned; assistant turns
 * are neutral with a bot avatar. Entry animates y+opacity (transform/opacity),
 * duration 250ms, spring-free. Reduced-motion => no entry offset.
 */
export function MessageBubble({ role, content, streaming, timestamp, footer }: MessageBubbleProps) {
	const reduce = useReducedMotion()
	const isUser = role === "user"
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
			<div className={cn("flex max-w-[82%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
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
