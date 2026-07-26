import { CardShell } from "../CardShell"
import type { GoalSuggestion, OnCardAction } from "../deck-types"

const CAT_LABEL: Record<GoalSuggestion["category"], string> = {
  work: "work", learn: "learning", health: "health", pers: "personal",
}

export function GoalSuggestionCard(props: {
  title?: string
  goals: GoalSuggestion[]
  onAction: OnCardAction
}) {
  const { title = "Suggested goals · today", goals, onAction } = props
  return (
    <CardShell title={title} badge="goal_suggestion" icon="◎">
      {goals.map((g) => (
        <div className="dk-grow" key={g.id}>
          <div className="dk-grow-body">
            <div className="dk-gt">
              {g.title} <span className={`dk-tag dk-${g.category}`}>{CAT_LABEL[g.category]}</span>
            </div>
            <div className="dk-gr">{g.reason}</div>
          </div>
          <div className="dk-grow-act">
            <button
              className="dk-btn dk-pri dk-mini"
              onClick={() => onAction({ type: "accept-goal", payload: g })}
            >
              Accept
            </button>
            <button
              className="dk-btn dk-ghost dk-mini"
              onClick={() => onAction({ type: "dismiss-goal", payload: g.id })}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </CardShell>
  )
}
