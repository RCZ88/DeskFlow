import { CardShell } from "../CardShell"
import type { PlanChange, OnCardAction } from "../deck-types"

const SIG: Record<PlanChange["op"], { cls: string; glyph: string }> = {
  add:  { cls: "dk-add",  glyph: "+" },
  mod:  { cls: "dk-mod",  glyph: "~" },
  done: { cls: "dk-done", glyph: "✓" },
}

export function PlanUpdateCard(props: {
  title?: string
  changes: PlanChange[]
  onAction: OnCardAction
}) {
  const { title = "Plan update", changes, onAction } = props
  return (
    <CardShell title={title} badge="plan_update" icon="⇄">
      <div className="dk-diff">
        {changes.map((c, i) => {
          const sig = SIG[c.op]
          return (
            <div className={`dk-drow ${c.op === "done" ? "dk-doneline" : ""}`} key={i}>
              <span className={`dk-sig ${sig.cls}`}>{sig.glyph}</span>
              <span className="dk-dl">{c.label}</span>
              {c.priority ? <span className="dk-pri">{c.priority}</span> : null}
            </div>
          )
        })}
      </div>
      <div style={ { display: "flex", gap: 8, marginTop: 13 } }>
        <button
          className="dk-btn dk-pri dk-mini"
          onClick={() => onAction({ type: "apply-plan", payload: changes })}
        >
          Apply all
        </button>
        <button className="dk-btn dk-ghost dk-mini" onClick={() => onAction({ type: "send-text", payload: "Review my plan" })}>
          Review
        </button>
      </div>
    </CardShell>
  )
}
