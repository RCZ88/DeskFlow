import { StatsSummaryCard } from "./renderers/StatsSummaryCard"
import { GoalSuggestionCard } from "./renderers/GoalSuggestionCard"
import { PlanUpdateCard } from "./renderers/PlanUpdateCard"
import { ChartDataCard } from "./renderers/ChartDataCard"
import type { ParsedMessage, OnCardAction } from "./deck-types"

/**
 * Maps a parsed_json assistant payload to its instrument card.
 * Wire this into MessageBubble where you currently branch on parsed content.
 * Add your remaining response types (action_list, digest_topic, connector_status,
 * form_fill, error) the same way — each returns a <CardShell>-wrapped renderer.
 */
export function ParsedMessageRouter(props: { msg: ParsedMessage; onAction: OnCardAction }) {
  const { msg, onAction } = props
  switch (msg.type) {
    case "stats_summary":
      return <StatsSummaryCard title={msg.title} metrics={msg.metrics} />
    case "goal_suggestion":
      return <GoalSuggestionCard title={msg.title} goals={msg.goals} onAction={onAction} />
    case "plan_update":
      return <PlanUpdateCard title={msg.title} changes={msg.changes} onAction={onAction} />
    case "chart_data":
      return <ChartDataCard title={msg.title} points={msg.points} unit={msg.unit} />
    case "text":
      return <div className="dk-bubble">{msg.text}</div>
    default:
      return null
  }
}
