import { useState } from "react"
import { CardShell } from "./CardShell"
import type { CardAction, ParsedGoal } from "../parsed"

const CAT_LABEL: Record<string, string> = {
  work: "work", personal: "personal", health: "health", learning: "learning", finance: "finance",
}

const CAT_TAG: Record<string, string> = {
  work: "dk-work", personal: "dk-pers", health: "dk-health", learning: "dk-learn", finance: "dk-work",
}

export function GoalSuggestionCard({
  goals,
  source,
  onAction,
}: {
  goals: ParsedGoal[]
  source?: string
  onAction?: (a: CardAction) => void
}) {
  const [gone, setGone] = useState<Record<string, true>>({})
  const visible = goals.filter((g) => !gone[g.title])

  const resolve = (g: ParsedGoal, kind: "accept-goal" | "dismiss-goal") => {
    setGone((p) => ({ ...p, [g.title]: true }))
    onAction?.({ kind, goal: g } as CardAction)
  }

  return (
    <CardShell title="Suggested goals · today" badge="goal_suggestion" accent="emerald" icon="◎">
      {visible.length === 0 ? (
        <div className="text-[12px] text-[var(--tm)]">All suggestions handled.</div>
      ) : visible.map((g) => {
        const tagCls = CAT_TAG[g.category ?? ""] || "dk-work"
        return (
          <div className="dk-grow" key={g.title}>
            <div className="dk-grow-body">
              <div className="dk-gt">
                {g.title}
                {g.category ? <span className={"dk-tag " + tagCls}>{CAT_LABEL[g.category] || g.category}</span> : null}
              </div>
              {g.reason ? <div className="dk-gr">{g.reason}</div> : null}
            </div>
            <div className="dk-grow-act">
              <button className="dk-btn dk-pri dk-mini" onClick={() => resolve(g, "accept-goal")}>Accept</button>
              <button className="dk-btn dk-ghost dk-mini" onClick={() => resolve(g, "dismiss-goal")}>Dismiss</button>
            </div>
          </div>
        )
      })}
    </CardShell>
  )
}
