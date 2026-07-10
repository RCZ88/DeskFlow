import "./deck.css"
import { ChatPanel } from "../chat/ChatPanel"
import type { AgentStep } from "../chat/AgentProgressBar"
import type { ChatSuggestion } from "../chat/ChatEmptyState"
import { QuickCommands } from "../../rail/QuickCommands"
import type { ChatMessage } from "../chat/ChatPanel"
import type { CardAction } from "../chat/parsed"
import type { ReactNode } from "react"

export interface DeckProps {
  messages: ChatMessage[]
  input: string
  onInputChange: (v: string) => void
  onSend: (text: string) => void
  onStop?: () => void
  onReset?: () => void
  onCardAction?: (a: CardAction) => void
  streaming?: boolean
  thinking?: boolean
  provider?: string
  online?: boolean
  suggestions?: ChatSuggestion[]
  agentSteps?: AgentStep[]
  agentStatus?: string
  listening?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
  contextWarnings?: string[]
  dismissError?: (index: number) => void
  onModelChange?: (provider: string, model: string) => void

  modeLabel?: string

  glanceMetrics?: { label: string; value: string }[]

  digestSlot?: ReactNode
  connectorsSlot?: ReactNode
  focusSlot?: ReactNode
  planSlot?: ReactNode
  reflectSlot?: ReactNode
}

export function AiPageDeck(props: DeckProps) {
  return (
    <>
      <div className="dk-main-row">
      <div className="dk-sidebar">
        <div className="dk-col">
          <div className="dk-microlabel">Today at a glance</div>
          <div className="dk-card dk-acc dk-violet dk-sec">
            <div className="dk-glancegrid">
              {(props.glanceMetrics ?? []).map((m, i) => (
                <div className="dk-metric" key={i}>
                  <div className="dk-metric-top"><span className="dk-metric-lab">{m.label}</span></div>
                  <div className="dk-metric-val">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dk-col">
          {props.digestSlot ? <>{props.digestSlot}</> : null}
        </div>

        <div className="dk-col">
          {props.connectorsSlot ? <>{props.connectorsSlot}</> : null}
          <QuickCommands onAction={props.onCardAction} />
        </div>
      </div>

      <div className="dk-grid">
        <div className="dk-col">
          <div className="dk-microlabel">Assistant · structured command deck</div>
          <ChatPanel
            messages={props.messages}
            streaming={props.streaming}
            thinking={props.thinking}
            provider={props.provider}
            online={props.online}
            input={props.input}
            onInputChange={props.onInputChange}
            onSend={props.onSend}
            onStop={props.onStop}
            onReset={props.onReset}
            onCardAction={props.onCardAction}
            suggestions={props.suggestions}
            agentSteps={props.agentSteps}
            agentStatus={props.agentStatus}
            listening={props.listening}
            onToggleVoice={props.onToggleVoice}
            voiceSupported={props.voiceSupported}
            actionResults={props.actionResults}
            connectorSyncing={props.connectorSyncing}
            contextWarnings={props.contextWarnings}
            dismissError={props.dismissError}
            onModelChange={props.onModelChange}
          />
        </div>
      </div>
      </div>

      <div className="dk-strip">
        {props.focusSlot ? <>{props.focusSlot}</> : null}
        {props.planSlot ? <>{props.planSlot}</> : null}
        {props.reflectSlot ? <>{props.reflectSlot}</> : null}
      </div>

      <div className="dk-foot">DeskFlow AI — Command Deck</div>
    </>
  )
}
