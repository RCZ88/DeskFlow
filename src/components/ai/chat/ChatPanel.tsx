import { useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
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
  onCardAction?: (a: CardAction) => void
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
  contextWarnings?: string[]
  dismissError?: (index: number) => void
  onModelChange?: (provider: string, model: string) => void
}

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
  contextWarnings,
  dismissError,
  onModelChange,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const lastAssistant = [...messages].reverse().find((mm) => mm.role === "assistant")
  const [empty, setEmpty] = useState(messages.length === 0)

  useEffect(() => {
    setEmpty(messages.length === 0)
  }, [messages.length])

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
    <div className="dk-card dk-acc dk-pink dk-deck">
      <div className="dk-deckhead">
        <div className="dk-t">
          <span className="dk-deck-ic">✦</span>
          DeskFlow Assistant
          <span className="dk-deck-meta">{provider ? "via " + provider : "copilot"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={"dk-chip" + (online ? " dk-live" : "")} style={{ height: 26, fontSize: 11, padding: "0 10px" }}>
            <span className="dk-dot" />
            {online ? "Online" : "Offline"}
          </span>
          {onReset && !empty ? (
            <button
              type="button"
              onClick={onReset}
              aria-label="Clear conversation"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {contextWarnings && contextWarnings.length > 0 && (
        <div className="mx-3 mb-1 space-y-1">
          {contextWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300 ring-1 ring-amber-500/15">
              <span className="flex-1">{w}</span>
              {dismissError && <button className="mt-0.5 text-amber-400 hover:text-amber-200" onClick={() => dismissError(i)}>×</button>}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className={`dk-stream${empty ? " dk-stream--empty" : ""}`}>
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
        {thinking ? <ThinkingIndicator /> : null}
      </div>

      <div className="dk-cmdbar">
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
    </div>
  )
}
