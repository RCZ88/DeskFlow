import type { CardAction, ParsedMessage } from "./parsed"
import { GoalSuggestionCard } from "./renderers/GoalSuggestionCard"
import { PlanUpdateCard } from "./renderers/PlanUpdateCard"
import { StatsSummaryCard } from "./renderers/StatsSummaryCard"
import { ActionListCard } from "./renderers/ActionListCard"
import { DigestTopicCard } from "./renderers/DigestTopicCard"
import { ConnectorStatusCard } from "./renderers/ConnectorStatusCard"
import { FormFillCard } from "./renderers/FormFillCard"
import { ChartDataCard } from "./renderers/ChartDataCard"
import { ErrorCard } from "./renderers/ErrorCard"

export interface ParsedMessageRouterProps {
  parsed: ParsedMessage
  onAction?: (a: CardAction) => void
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
  autoApprove?: boolean
}

export function ParsedMessageRouter({
  parsed,
  onAction,
  actionResults,
  connectorSyncing,
  autoApprove,
}: ParsedMessageRouterProps) {
  switch (parsed.type) {
    case "goal_suggestion":
      return <GoalSuggestionCard goals={parsed.goals} source={parsed.source} onAction={onAction} />
    case "plan_update":
      return <PlanUpdateCard changes={parsed.changes} note={parsed.note} onAction={onAction} />
    case "stats_summary":
      return <StatsSummaryCard metrics={parsed.metrics} period={parsed.period} />
    case "action_list":
      return <ActionListCard actions={parsed.actions} note={parsed.note} onAction={onAction} results={actionResults} autoApprove={autoApprove} />
    case "digest_item":
      return <DigestTopicCard topic={parsed.topic} summary={parsed.summary} sources={parsed.sources} onAction={onAction} />
    case "connector_status":
      return <ConnectorStatusCard connectors={parsed.connectors} onAction={onAction} syncing={connectorSyncing} />
    case "form_fill":
      return <FormFillCard title={parsed.title} submitLabel={parsed.submitLabel} fields={parsed.fields} onAction={onAction} />
    case "chart_data":
      return <ChartDataCard chartType={parsed.chartType} labels={parsed.labels} datasets={parsed.datasets} title={parsed.title} />
    case "error":
      return <ErrorCard message={parsed.message} recovery={parsed.recovery} onAction={onAction} />
    default:
      return null
  }
}
