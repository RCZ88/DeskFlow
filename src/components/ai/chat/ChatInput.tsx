import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Mic, Square } from "lucide-react"
import { CharCountRing } from "./CharCountRing"

export interface ChatInputProps {
	onSend: (text: string) => void
	onStop?: () => void
	streaming?: boolean
	disabled?: boolean
	maxChars?: number
	placeholder?: string
	listening?: boolean
	onToggleVoice?: () => void
	voiceSupported?: boolean
	value?: string
	onValueChange?: (v: string) => void
}

export function ChatInput({
	onSend,
	onStop,
	streaming,
	disabled,
	maxChars = 4000,
	placeholder = "Ask anything…",
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
		<form className="dk-cmd" onSubmit={(e) => { e.preventDefault(); send() }}>
			<span className="dk-cmd-pc">›_</span>
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
				className="dk-cmd-ph"
				style={{ resize: "none" }}
			/>
			{showRing ? <CharCountRing count={text.length} max={maxChars} className="mb-1" /> : null}
			<div className="dk-cmd-tools">
				{onToggleVoice ? (
					<button
						type="button"
						onClick={onToggleVoice}
						disabled={!voiceSupported}
						aria-pressed={listening}
						aria-label={listening ? "Stop voice input" : "Start voice input"}
						className="dk-iconbtn"
						style={listening ? { background: "rgba(236,72,153,.2)", color: "var(--pink)", borderColor: "transparent" } : undefined}
					>
						{listening && !reduce ? (
							<motion.span
								aria-hidden
								className="absolute inset-0 rounded-[9px] bg-pink-500/20"
								initial={{ opacity: 0.6, scale: 1 }}
								animate={{ opacity: 0, scale: 1.35 }}
								transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
							/>
						) : null}
						<Mic size={14} className="relative" />
					</button>
				) : null}

				{streaming ? (
					<button
						type="button"
						onClick={onStop}
						aria-label="Stop generating"
						className="dk-iconbtn"
						style={{ color: "var(--red)" }}
					>
						<Square size={12} className="fill-current" />
					</button>
				) : (
					<button
						type="submit"
						disabled={!canSend}
						aria-label="Send message"
						className={"dk-iconbtn" + (canSend ? " dk-send" : "")}
					>
						➤
					</button>
				)}
			</div>
		</form>
	)
}
