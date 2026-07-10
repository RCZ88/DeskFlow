import { useEffect, useRef, useState } from "react"
import { Bot, History, Trash2 } from "lucide-react"
import { GlassCard } from "../GlassCard"
import { SectionHead } from "../SectionHead"
import { StatusDot } from "../StatusDot"
import { MessageBubble } from "./MessageBubble"
import { ThinkingIndicator } from "./ThinkingIndicator"
import { AgentProgressBar, type AgentStep } from "./AgentProgressBar"
import { ChatEmptyState, type ChatSuggestion } from "./ChatEmptyState"
import { ChatInput } from "./ChatInput"
import type { CardAction, ParsedMessage } from "./parsed"

export interface ChatMessage {
	id: string
	role: "user" | "assistant"
	content: string
	timestamp?: string
	/** Structured payload rendered as an interactive card when present. */
	parsed?: ParsedMessage
}

export interface ChatPanelProps {
	messages: ChatMessage[]
	streaming?: boolean
	thinking?: boolean
	agentSteps?: AgentStep[]
	agentStatus?: string
	suggestions?: ChatSuggestion[]
	provider?: string
	online?: boolean
	input?: string
	onInputChange?: (v: string) => void
	onSend: (text: string) => void
	onStop?: () => void
	onReset?: () => void
	listening?: boolean
	onToggleVoice?: () => void
	voiceSupported?: boolean
	/** Dispatch for interactive cards (accept goal, run ipc, submit form, etc.). */
	onCardAction?: (a: CardAction) => void
	actionResults?: Record<string, "running" | "done" | "error">
	connectorSyncing?: Record<string, true>
}

/**
 * Composite chat surface. AiPage owns the message list + streaming state and
 * passes them down; this component stays presentational so it drops into the
 * existing IPC without new endpoints. Auto-scrolls to the newest turn but
 * pauses when the user has scrolled up to read history.
 */
export function ChatPanel({
	messages,
	streaming,
	thinking,
	agentSteps,
	agentStatus,
	suggestions,
	provider,
	online = true,
	input,
	onInputChange,
	onSend,
	onStop,
	onReset,
	listening,
	onToggleVoice,
	voiceSupported,
	onCardAction,
	actionResults,
	connectorSyncing,
}: ChatPanelProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const pinnedRef = useRef(true)
	const lastAssistant = [...messages].reverse().find((mm) => mm.role === "assistant")
	const [empty, setEmpty] = useState(messages.length === 0)

	useEffect(() => {
		setEmpty(messages.length === 0)
	}, [messages.length])

	// Track whether the user is pinned to the bottom; only auto-scroll if so.
	const onScroll = () => {
		const el = scrollRef.current
		if (!el) return
		pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
	}

	useEffect(() => {
		const el = scrollRef.current
		if (el && pinnedRef.current) el.scrollTop = el.scrollHeight
	}, [messages, thinking, streaming])

	return (
		<GlassCard accent="pink" bar variant="elevated" className="flex h-full min-h-[420px] flex-col">
			<SectionHead
				accent="pink"
				icon={<Bot size={16} />}
				title="DeskFlow Assistant"
				desc={provider ? "via " + provider : "Your workspace copilot"}
				right={
					<div className="flex items-center gap-2">
						<StatusDot tone={online ? "ready" : "error"} label={online ? "Online" : "Offline"} showLabel />
						{onReset && !empty ? (
							<button
								type="button"
								onClick={onReset}
								aria-label="Clear conversation"
								className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60"
							>
								<Trash2 size={14} />
							</button>
						) : null}
					</div>
				}
			/>

			<div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-4 overflow-y-auto pr-1">
				{empty ? (
					<ChatEmptyState suggestions={suggestions} onPick={(p) => onInputChange?.(p)} />
				) : (
					messages.map((mm) => (
						<MessageBubble
							key={mm.id}
							role={mm.role}
							content={mm.content}
							timestamp={mm.timestamp}
							parsed={mm.parsed}
							onAction={onCardAction}
							actionResults={actionResults}
							connectorSyncing={connectorSyncing}
							streaming={Boolean(streaming) && mm.id === lastAssistant?.id}
						/>
					))
				)}
				{thinking ? <ThinkingIndicator className="pl-9" /> : null}
			</div>

			<div className="mt-4 space-y-2">
				<AgentProgressBar
					visible={Boolean(agentSteps?.length) || Boolean(agentStatus)}
					steps={agentSteps}
					statusText={agentStatus}
				/>
				<ChatInput
					onSend={onSend}
					onStop={onStop}
					streaming={streaming}
					value={input}
					onValueChange={onInputChange}
					listening={listening}
					onToggleVoice={onToggleVoice}
					voiceSupported={voiceSupported}
				/>
			</div>
		</GlassCard>
	)
}
