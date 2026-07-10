import { useEffect, useRef, useState } from "react"
import { MessageBubble, type ChatMessage } from "./MessageBubble"
import type { OnCardAction } from "./deck-types"

/**
 * The Command Deck chat surface: header + scrolling stream + command-line input.
 * Keep your existing props/handlers from useAiChat(); this only restyles.
 */
export function ChatPanel(props: {
  messages: ChatMessage[]
  input: string
  onInputChange: (v: string) => void
  onSend: () => void
  onCardAction: OnCardAction
  provider?: string
  online?: boolean
  streaming?: boolean
}) {
  const { messages, input, onInputChange, onSend, onCardAction } = props
  const streamRef = useRef<HTMLDivElement>(null)

  // auto-scroll to newest message
  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, props.streaming])

  return (
    <div className="dk-card dk-acc dk-pink dk-deck">
      <div className="dk-deckhead">
        <div className="dk-t"><span className="dk-deck-ic">◈</span> Ask anything about your day</div>
        <div className="dk-deck-meta">thread · today · {messages.length} msgs</div>
      </div>

      <div className="dk-stream" ref={streamRef}>
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onAction={onCardAction} />
        ))}
      </div>

      <form
        className="dk-cmd"
        onSubmit={(e) => { e.preventDefault(); onSend() }}
      >
        <span className="dk-cmd-pc">›_</span>
        <input
          className="dk-cmd-ph"
          value={input}
          placeholder="ask anything, or type / for commands…"
          onChange={(e) => onInputChange(e.target.value)}
        />
        <div className="dk-cmd-tools">
          <button type="button" className="dk-iconbtn" aria-label="Voice">🎙</button>
          <button type="submit" className="dk-iconbtn dk-send" aria-label="Send">↑</button>
        </div>
      </form>
    </div>
  )
}

// Small helper so consumers can keep local input state if they don't already.
export function useDeckInput(initial = "") {
  const [input, setInput] = useState(initial)
  return { input, setInput }
}
