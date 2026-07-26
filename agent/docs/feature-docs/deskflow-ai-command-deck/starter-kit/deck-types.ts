// Shared types for the Command Deck renderers.
// These mirror your existing components/ai/chat/parsed.ts union. If your field
// names differ, adapt the mapping in ParsedMessageRouter.tsx — not every card.

export type AccentKey = "pink" | "emerald" | "amber" | "violet" | "cyan" | "red"
export type CategoryKey = "work" | "learn" | "health" | "pers"

export type CardActionType =
  | "accept-goal" | "dismiss-goal" | "apply-plan" | "run-ipc"
  | "submit-form" | "sync-connector" | "open-url" | "retry" | "send-text"

export interface CardAction {
  type: CardActionType
  payload?: unknown
}
export type OnCardAction = (action: CardAction) => void

export interface StatMetric {
  label: string
  value: string
  icon?: string            // emoji or glyph; swap for lucide-react if you prefer
  accent?: AccentKey
  trend?: { dir: "up" | "dn"; text: string }
}

export interface GoalSuggestion {
  id: string
  title: string
  reason: string
  category: CategoryKey
}

export interface PlanChange {
  op: "add" | "mod" | "done"
  label: string
  priority?: string        // "P1" | "P2" | "done"
}

export interface ChartPoint { label: string; value: number }

// Discriminated union consumed by ParsedMessageRouter.
export type ParsedMessage =
  | { type: "stats_summary"; title?: string; metrics: StatMetric[] }
  | { type: "goal_suggestion"; title?: string; goals: GoalSuggestion[] }
  | { type: "plan_update"; title?: string; changes: PlanChange[] }
  | { type: "chart_data"; title?: string; points: ChartPoint[]; unit?: string }
  | { type: "text"; text: string }
