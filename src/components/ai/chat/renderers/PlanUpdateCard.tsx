import { useState } from "react"
import { Check } from "lucide-react"
import { CardShell } from "./CardShell"
import type { CardAction, PlanChange } from "../parsed"

const SIG: Record<string, { cls: string; glyph: string }> = {
  add:    { cls: "dk-add",  glyph: "+" },
  modify: { cls: "dk-mod",  glyph: "~" },
  complete: { cls: "dk-done", glyph: <Check size={11} /> },
}

const SIG_OP: Record<string, string> = {
  add: "add", modify: "mod", complete: "done",
}

export function PlanUpdateCard({
  changes,
  note,
  onAction,
}: {
  changes: PlanChange[]
  note?: string
  onAction?: (a: CardAction) => void
}) {
  const [applied, setApplied] = useState(false)
  return (
    <CardShell
      title="Plan update"
      badge="plan_update"
      accent="violet"
      icon="⇄"
      subtitle={note || changes.length + " proposed change" + (changes.length === 1 ? "" : "s")}
      right={
        <button
          className="dk-btn dk-pri dk-mini"
          disabled={applied}
          onClick={() => { setApplied(true); onAction?.({ kind: "apply-plan", changes } as CardAction) }}
        >
          {applied ? "Applied" : "Apply all"}
        </button>
      }
    >
      <div className="dk-diff">
        {changes.map((c, i) => {
          const opKey = SIG_OP[c.action] ?? "mod"
          const sig = SIG[opKey] ?? SIG.modify
          return (
            <div className={"dk-drow" + (c.action === "complete" ? " dk-doneline" : "")} key={c.goal.title + i}>
              <span className={"dk-sig " + sig.cls}>{sig.glyph}</span>
              <span className="dk-dl">{c.goal.title}</span>
              {typeof c.goal.priority === "number" ? <span className="dk-pri">P{c.goal.priority}</span> : null}
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}
