import { Mail, CalendarDays, ChevronRight } from "lucide-react"

interface ConnectorStatusBarProps {
  unreadCount: number
  todayEventCount: number
  lastSyncTime?: string
  onExpand: () => void
  syncing?: boolean
}

export function ConnectorStatusBar(props: ConnectorStatusBarProps) {
  return (
    <div
      onClick={props.onExpand}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "6px 18px", margin: "0 18px 6px",
        borderRadius: 8,
        background: "rgba(24,24,27,.45)",
        border: "1px solid var(--line)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontSize: 11,
        color: "var(--ts)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--line-2)"
        e.currentTarget.style.background = "var(--surface-2)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--line)"
        e.currentTarget.style.background = "rgba(24,24,27,.45)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Mail size={12} color="var(--pink)" />
        <span>
          <strong style={{ color: "var(--tp)" }}>{props.unreadCount}</strong> unread
        </span>
      </div>
      <div style={{ width: 1, height: 12, background: "var(--line)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CalendarDays size={12} color="var(--cyan)" />
        <span>
          <strong style={{ color: "var(--tp)" }}>{props.todayEventCount}</strong> today
        </span>
      </div>
      {props.lastSyncTime && (
        <>
          <div style={{ width: 1, height: 12, background: "var(--line)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>
            {props.syncing ? "Syncing\u2026" : `Synced ${props.lastSyncTime}`}
          </span>
        </>
      )}
      <ChevronRight size={12} color="var(--tm)" style={{ marginLeft: "auto" }} />
    </div>
  )
}
