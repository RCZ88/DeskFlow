import type { ReactNode } from "react"
import type { AccentKey } from "./deck-types"

/**
 * The wrapper every AI “instrument card” uses inside the chat stream.
 * Renders the accent spine (via .dk-inst border + colored header) plus the
 * mono response-type badge.
 */
export function CardShell(props: {
  title: string
  /** Response type name shown in the mono badge, e.g. "stats_summary". */
  badge: string
  /** Left icon (emoji/glyph or your icon component). */
  icon?: ReactNode
  accent?: AccentKey
  children: ReactNode
}) {
  const { title, badge, icon, children } = props
  return (
    <div className="dk-inst">
      <div className="dk-inst-head">
        <div className="dk-inst-lt">
          {icon ? <span aria-hidden>{icon}</span> : null}
          {title}
        </div>
        <span className="dk-badge">{badge}</span>
      </div>
      <div className="dk-inst-ib">{children}</div>
    </div>
  )
}
