import { AlertTriangle } from "lucide-react"
import { CardShell } from "./CardShell"
import type { CardAction } from "../parsed"

export function ErrorCard({
  message,
  recovery,
  onAction,
}: {
  message: string
  recovery?: string
  onAction?: (a: CardAction) => void
}) {
  return (
    <CardShell title="Error" badge="error" accent="red" icon={<AlertTriangle size={14} />}>
      <div role="alert" className="flex flex-col gap-2" style={{ color: "var(--red)" }}>
        <div className="flex items-center gap-2 text-[13px] font-medium">{message}</div>
        {recovery ? <div className="text-[12px] opacity-80">{recovery}</div> : null}
        <div>
          <button
            className="dk-btn dk-ghost dk-mini"
            onClick={() => onAction?.({ kind: "retry" })}
            style={{ color: "var(--red)", borderColor: "var(--red)" }}
          >
            ⟳ Retry
          </button>
        </div>
      </div>
    </CardShell>
  )
}
