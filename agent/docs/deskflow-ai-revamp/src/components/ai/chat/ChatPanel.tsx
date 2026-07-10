import { useEffect, useRef } from "react"
import { Bot } from "lucide-react"
import { GlassCard } from "../GlassCard"
import { SectionHead } from "../SectionHead"
import { StatusDot } from "../StatusDot"
import { MessageBubble } from "./MessageBubble"
import { ThinkingIndicator } from "./ThinkingIndicator"
import { AgentProgressBar, type AgentStep } from "./AgentProgressBar"
import { ChatEmptyState, type ChatSuggestion } from "./ChatEmptyState"
import { ChatInput } from "./ChatInput"

export interface ChatMessage {
	id: string
	role: "user" | "assistant"
	content: string
	timestamp?: string
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
	listening?: boolean
	onToggleVoice?: () => void
	voiceSupported?: boolean
}

/**
 * Composite chat surface wiring the pieces together. AiPage should own the
 * message list + streaming state and pass them down; this component is purely
 * presentational so it drops into the existing IPC without new endpoints.
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
	listening,
	onToggleVoice,
	voiceSupported,
}: ChatPanelProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const lastAssistant = [...messages].reverse().find((mm) => mm.role === "assistant")

	useEffect(() => {
		const el = scrollRef.current
		if (el) el.scrollTop = el.scrollHeight
	}, [messages, thinking, streaming])

	const empty = messages.length === 0

	return (
		<GlassCard accent="pink" bar variant="elevated" className="flex h-full min-h-[420px] flex-col">
			<SectionHead
				accent="pink"
				icon={<Bot size={16} />}
				title="DeskFlow Assistant"
				desc={provider ? "via " + provider : "Your workspace copilot"}
				right={<StatusDot tone={online ? "ready" : "error"} label={online ? "Online" : "Offline"} showLabel />}
			/>

			<div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
				{empty ? (
					<ChatEmptyState suggestions={suggestions} onPick={(p) => onInputChange?.(p)} />
				) : (
					messages.map((mm) => (
						<MessageBubble
							key={mm.id}
							role={mm.role}
							content={mm.content}
							timestamp={mm.timestamp}
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
