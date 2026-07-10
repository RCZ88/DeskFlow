import { useState } from "react"
import { CardShell } from "./CardShell"
import type { ActionItem, CardAction } from "../parsed"

export function ActionListCard({
  actions,
  note,
  onAction,
  results,
}: {
  actions: ActionItem[]
  note?: string
  onAction?: (a: CardAction) => void
  results?: Record<string, "running" | "done" | "error">
}) {
  const [localRunning, setLocalRunning] = useState<Record<string, true>>({})
  return (
    <CardShell title="Suggested actions" badge="action_list" icon="⚡" subtitle={note}>
      {actions.map((act, i) => {
        const state = results?.[act.label] || (localRunning[act.label] ? "running" : undefined)
        return (
          <div className="dk-grow" key={act.label + i}>
            <div className="dk-grow-body">
              <div className="dk-gt">{act.label}</div>
              {act.description ? <div className="dk-gr">{act.description}</div> : null}
            </div>
            {act.actionButton ? (
              <div className="dk-grow-act">
                <button
                  className={"dk-btn dk-pri dk-mini" + (state === "done" ? " opacity-50" : "")}
                  disabled={state === "running" || state === "done"}
                  onClick={() => {
                    setLocalRunning((p) => ({ ...p, [act.label]: true }))
                    onAction?.({ kind: "run-ipc", ipc: act.actionButton!.ipc, payload: act.actionButton!.payload, label: act.label })
                  }}
                >
                  {state === "running" ? "…" : state === "done" ? "✓" : act.actionButton.label}
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
    </CardShell>
  )
}
