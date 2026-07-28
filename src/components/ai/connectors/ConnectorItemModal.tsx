import { useState } from "react"
import { X, Reply, Trash2, Check, Mail, CalendarDays, Send, Loader2, Circle } from "lucide-react"
import type { ConnectorItem } from "../../../types/connectors"
import { VoiceInputWrapper } from '@/components/VoiceInputWrapper';

interface ConnectorItemModalProps {
  item: ConnectorItem
  connectorType: "email" | "calendar"
  onClose: () => void
  onReply?: (itemId: string, draft: string) => Promise<void>
  onMarkRead?: (itemId: string, read: boolean) => Promise<void>
  onDelete?: (itemId: string) => Promise<void>
}

export function ConnectorItemModal(props: ConnectorItemModalProps) {
  const { item, connectorType } = props
  const [replyMode, setReplyMode] = useState(false)
  const [replyDraft, setReplyDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [marking, setMarking] = useState(false)

  const isEmail = connectorType === "email"
  const isUnread = item.read === false
  const fromAddr = item.metadata?.from || ""
  const dateStr = item.date ? new Date(item.date).toLocaleString() : ""
  const startTime = item.metadata?.startTime
  const endTime = item.metadata?.endTime

  const handleReply = async () => {
    if (!replyDraft.trim() || !props.onReply) return
    setSending(true)
    try {
      await props.onReply(item.id, replyDraft)
      setReplyMode(false)
      setReplyDraft("")
    } finally {
      setSending(false)
    }
  }

  const handleMarkRead = async () => {
    if (!props.onMarkRead) return
    setMarking(true)
    try {
      await props.onMarkRead(item.id, !isUnread)
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="dk-modal-overlay" onClick={props.onClose}>
      <div className="dk-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dk-modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: isEmail ? "rgba(236,72,153,.12)" : "rgba(34,211,238,.12)",
              border: `1px solid ${isEmail ? "rgba(236,72,153,.2)" : "rgba(34,211,238,.2)"}`,
              display: "grid", placeItems: "center",
            }}>
              {isEmail ? <Mail size={14} color="var(--pink)" /> : <CalendarDays size={14} color="var(--cyan)" />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tp)" }}>
                {item.subject || item.summary || "(no subject)"}
              </div>
              <div style={{ fontSize: 11, color: "var(--tm)", fontFamily: "var(--mono)", marginTop: 2 }}>
                {isEmail ? fromAddr : dateStr}
              </div>
            </div>
          </div>
          <button onClick={props.onClose} className="dk-iconbtn" style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="dk-modal-body">
          {isEmail && (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                gap: "8px 12px",
                fontSize: 12,
                color: "var(--ts)",
                marginBottom: 16,
                padding: 12,
                background: "var(--surface-2)",
                borderRadius: 10,
                border: "1px solid var(--line)",
              }}>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>From</span>
                <span>{fromAddr || "—"}</span>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Date</span>
                <span>{dateStr}</span>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Status</span>
                <span style={{ color: isUnread ? "var(--pink)" : "var(--emerald)" }}>
                  {isUnread ? <><Circle size={10} fill="var(--pink)" style={{ marginRight: 4, verticalAlign: "middle" }} />Unread</> : <><Check size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Read</>}
                </span>
              </div>
              <div style={{
                fontSize: 13.5,
                lineHeight: 1.65,
                color: "var(--tp)",
                whiteSpace: "pre-wrap",
                padding: 4,
              }}>
                {item.summary || "(no content)"}
              </div>
            </>
          )}

          {!isEmail && (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                gap: "8px 12px",
                fontSize: 12,
                color: "var(--ts)",
                marginBottom: 16,
                padding: 12,
                background: "var(--surface-2)",
                borderRadius: 10,
                border: "1px solid var(--line)",
              }}>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Start</span>
                <span>{startTime || dateStr}</span>
                {endTime && (
                  <>
                    <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>End</span>
                    <span>{endTime}</span>
                  </>
                )}
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Calendar</span>
                <span>{item.connectorId}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--tp)" }}>
                {item.summary || "(no description)"}
              </div>
            </>
          )}

          {/* Reply Composer */}
          {replyMode && (
            <div style={{
              marginTop: 20,
              padding: 14,
              background: "var(--surface-2)",
              borderRadius: 12,
              border: "1px solid var(--line)",
            }}>
              <div style={{
                fontSize: 11, color: "var(--tm)", fontFamily: "var(--mono)",
                marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px",
              }}>
                Reply
              </div>
              <VoiceInputWrapper>
                <textarea
                  value={replyDraft}
                  onChange={e => setReplyDraft(e.target.value)}
                  placeholder="Type your reply..."
                  style={{
                    width: "100%",
                    minHeight: 100,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: 10,
                    color: "var(--tp)",
                    fontSize: 13,
                    fontFamily: "var(--sans)",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              </VoiceInputWrapper>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  onClick={() => setReplyMode(false)}
                  style={{
                    fontSize: 11, padding: "6px 14px", borderRadius: 6,
                    border: "1px solid var(--line)", background: "transparent",
                    color: "var(--ts)", cursor: "pointer", fontFamily: "var(--mono)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyDraft.trim() || sending}
                  style={{
                    fontSize: 11, padding: "6px 14px", borderRadius: 6,
                    border: "none", background: "var(--emerald)",
                    color: "#0b0b0d", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 4,
                    opacity: !replyDraft.trim() || sending ? 0.5 : 1,
                  }}
                >
                  {sending ? <Loader2 size={11} className="spin" /> : <Send size={11} />}
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="dk-modal-foot">
          {isEmail && (
            <>
              <button onClick={() => setReplyMode(!replyMode)} className="dk-topbar-btn" style={{ height: 32 }}>
                <Reply size={12} />
                Reply
              </button>
              <button onClick={handleMarkRead} disabled={marking} className="dk-topbar-btn" style={{ height: 32 }}>
                {marking ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                {isUnread ? "Mark Read" : "Mark Unread"}
              </button>
            </>
          )}
          {props.onDelete && (
            <button
              onClick={() => props.onDelete?.(item.id)}
              className="dk-topbar-btn"
              style={{ height: 32, color: "var(--red)", borderColor: "rgba(248,113,113,.3)" }}
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
