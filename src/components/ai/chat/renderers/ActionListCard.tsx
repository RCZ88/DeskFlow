import { useState } from "react"
import { Zap, Check, AlertTriangle, Shield } from "lucide-react"
import { CardShell } from "./CardShell"
import type { ActionItem, CardAction } from "../parsed"

export function ActionListCard({
  actions,
  note,
  onAction,
  results,
  autoApprove = false,
}: {
  actions: ActionItem[]
  note?: string
  onAction?: (a: CardAction) => void
  results?: Record<string, "running" | "done" | "error">
  autoApprove?: boolean
}) {
  const [localRunning, setLocalRunning] = useState<Record<string, true>>({})
  const [confirming, setConfirming] = useState<string | null>(null)

  const executeAction = (act: ActionItem) => {
    setLocalRunning((p) => ({ ...p, [act.label]: true }))
    setConfirming(null)
    onAction?.({ kind: "run-ipc", ipc: act.actionButton!.ipc, payload: act.actionButton!.payload, label: act.label })
  }

  return (
    <CardShell title="Suggested actions" badge="action_list" accent="pink" icon={<Zap size={14} />} subtitle={note}>
      {actions.map((act, i) => {
        const state = results?.[act.label] || (localRunning[act.label] ? "running" : undefined)
        const isConfirming = confirming === act.label

        return (
          <div className="dk-grow" key={act.label + i}>
            <div className="dk-grow-body">
              <div className="dk-gt">{act.label}</div>
              {act.description ? <div className="dk-gr">{act.description}</div> : null}
            </div>
            {act.actionButton ? (
              <div className="dk-grow-act">
                {isConfirming ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> Confirm?
                    </span>
                    <button
                      className="dk-btn dk-mini"
                      style={{ background: "rgba(248,113,113,.15)", color: "#f87171", borderColor: "rgba(248,113,113,.3)" }}
                      onClick={() => setConfirming(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="dk-btn dk-pri dk-mini"
                      onClick={() => executeAction(act)}
                    >
                      Run
                    </button>
                  </div>
                ) : (
                  <button
                    className={"dk-btn dk-pri dk-mini" + (state === "done" ? " opacity-50" : "")}
                    disabled={state === "running" || state === "done"}
                    onClick={() => {
                      if (autoApprove) {
                        executeAction(act)
                      } else {
                        setConfirming(act.label)
                      }
                    }}
                  >
                    {state === "running" ? "…" : state === "done" ? <><Check size={11} /></> : act.actionButton.label}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </CardShell>
  )
}
