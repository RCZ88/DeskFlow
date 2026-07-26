import { ParsedMessageRouter } from "./ParsedMessageRouter"
import type { ParsedMessage, OnCardAction } from "./deck-types"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  /** Plain text portion (streamed markdown), rendered above any parsed card. */
  text?: string
  /** Parsed structured payload, if the assistant returned parsed_json. */
  parsed?: ParsedMessage | null
}

export function MessageBubble(props: { msg: ChatMessage; onAction: OnCardAction }) {
  const { msg, onAction } = props
  if (msg.role === "user") {
    return (
      <div className="dk-msg dk-user">
        <div className="dk-av dk-me">CZ</div>
        <div className="dk-bubble">{msg.text}</div>
      </div>
    )
  }
  return (
    <div className="dk-msg dk-ai">
      <div className="dk-av dk-ai">✦</div>
      <div className="dk-aiwrap">
        {msg.text ? <div className="dk-bubble">{msg.text}</div> : null}
        {msg.parsed ? <ParsedMessageRouter msg={msg.parsed} onAction={onAction} /> : null}
      </div>
    </div>
  )
}
