import { type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { MOTION } from "../tokens"
import { TypewriterText } from "./TypewriterText"
import { ParsedMessageRouter } from "./ParsedMessageRouter"
import type { CardAction, ParsedMessage } from "./parsed"

export interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  streaming?: boolean
  timestamp?: string
  footer?: ReactNode
  parsed?: ParsedMessage
  onAction?: (a: CardAction) => void
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
}

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
      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease }}
    >
      <div className={"dk-msg" + (isUser ? " dk-user" : " dk-ai")}>
        <div className={"dk-av" + (isUser ? " dk-me" : " dk-ai")}>
          {isUser ? "CZ" : "✦"}
        </div>
        <div className={hasCard ? "dk-aiwrap" : ""}>
          {content || isUser ? (
            <div className="dk-bubble">
              {streaming && !isUser ? (
                <TypewriterText text={content} />
              ) : (
                <span>{content}</span>
              )}
            </div>
          ) : null}

          {hasCard ? (
            <div className="w-full" style={{ marginTop: content ? 11 : 0 }}>
              <ParsedMessageRouter
                parsed={parsed as ParsedMessage}
                onAction={onAction}
                actionResults={actionResults}
                connectorSyncing={connectorSyncing}
              />
            </div>
          ) : null}

          {timestamp || footer ? (
            <div className="flex items-center gap-2 px-1 text-[11px] text-[var(--tm)]" style={{ marginTop: 4 }}>
              {timestamp ? <span className="tabular-nums">{timestamp}</span> : null}
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
