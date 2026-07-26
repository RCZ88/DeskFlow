import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Mic, Send, Square } from "lucide-react"
import { cn } from "../lib/cn"
import { MOTION } from "../tokens"
import { CharCountRing } from "./CharCountRing"

export interface ChatInputProps {
	onSend: (text: string) => void
	onStop?: () => void
	streaming?: boolean
	disabled?: boolean
	maxChars?: number
	placeholder?: string
	/** Voice input hooks (Web Speech / native). */
	listening?: boolean
	onToggleVoice?: () => void
	voiceSupported?: boolean
	/** Controlled value bridge for suggestion chips populating the box. */
	value?: string
	onValueChange?: (v: string) => void
}

/**
 * Auto-growing composer. Enter sends, Shift+Enter newlines. The send button
 * swaps to a stop button while streaming. A live mic pulse (opacity/scale)
 * signals active listening. Character ring appears as the budget tightens.
 */
export function ChatInput({
	onSend,
	onStop,
	streaming,
	disabled,
	maxChars = 4000,
	placeholder = "Message DeskFlow…",
	listening,
	onToggleVoice,
	voiceSupported,
	value,
	onValueChange,
}: ChatInputProps) {
	const reduce = useReducedMotion()
	const [internal, setInternal] = useState("")
	const text = value ?? internal
	const setText = (v: string) => {
		if (onValueChange) onValueChange(v)
		else setInternal(v)
	}
	const ref = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		el.style.height = "0px"
		el.style.height = Math.min(el.scrollHeight, 160) + "px"
	}, [text])

	const canSend = text.trim().length > 0 && !disabled && text.length <= maxChars
	const send = () => {
		if (!canSend) return
		onSend(text.trim())
		setText("")
	}

	const showRing = text.length > maxChars * 0.7

	return (
		<div
			className={cn(
				"flex items-end gap-2 rounded-xl bg-zinc-900/60 p-2 ring-1 ring-zinc-800/60",
				"transition-[box-shadow] duration-150 focus-within:ring-pink-500/40",
			)}
		>
			{onToggleVoice ? (
				<button
					type="button"
					onClick={onToggleVoice}
					disabled={!voiceSupported}
					aria-pressed={listening}
					aria-label={listening ? "Stop voice input" : "Start voice input"}
					className={cn(
						"relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
						listening
							? "bg-pink-500/15 text-pink-300"
							: "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
						"disabled:opacity-30",
					)}
				>
					{listening && !reduce ? (
						<motion.span
							aria-hidden
							className="absolute inset-0 rounded-lg bg-pink-500/20"
							initial={ { opacity: 0.6, scale: 1 } }
							animate={ { opacity: 0, scale: 1.35 } }
							transition={ { duration: 1.2, repeat: Infinity, ease: "easeOut" } }
						/>
					) : null}
					<Mic size={16} className="relative" />
				</button>
			) : null}

			<textarea
				ref={ref}
				value={text}
				rows={1}
				disabled={disabled}
				placeholder={placeholder}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault()
						send()
					}
				}}
				className="max-h-40 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] leading-6 text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none"
			/>

			{showRing ? <CharCountRing count={text.length} max={maxChars} className="mb-1" /> : null}

			{streaming ? (
				<button
					type="button"
					onClick={onStop}
					aria-label="Stop generating"
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 transition-colors hover:bg-zinc-700"
				>
					<Square size={14} className="fill-current" />
				</button>
			) : (
				<motion.button
					type="button"
					onClick={send}
					disabled={!canSend}
					aria-label="Send message"
					whileTap={canSend && !reduce ? { scale: 0.92 } : undefined}
					transition={ { duration: MOTION.fast, ease: MOTION.ease } }
					className={cn(
						"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
						canSend
							? "bg-pink-500 text-white hover:bg-pink-400"
							: "bg-zinc-800 text-zinc-600",
					)}
				>
					<Send size={15} />
				</motion.button>
			)}
		</div>
	)
}
