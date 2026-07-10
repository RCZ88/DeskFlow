type AnyRec = Record<string, unknown>

function bridge(): AnyRec | undefined {
  const w = window as unknown as { deskflowAPI?: AnyRec }
  return w.deskflowAPI
}

async function safe<T>(fn: (() => Promise<T> | T) | undefined, fallback: T): Promise<T> {
  try {
    if (typeof fn !== "function") return fallback
    const v = await fn()
    return (v ?? fallback) as T
  } catch {
    return fallback
  }
}

export function todayIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate())
}

export const PAGE_CATALOG = [
  "You are DeskFlow AI, an assistant embedded in the user's productivity tracker.",
  "Be concise, concrete, and reference the user's real data below when relevant.",
  "",
  "## App pages you can reason about",
  "- Dashboard (/): productive timer, recent sessions, 7x24 heatmap, weekly overview.",
  "- Stats (/stats): per-app totals, sessions list, live foreground app + category.",
  "- IDE Projects (/ide): detected projects, AI tool usage/cost, per-project git stats.",
  "- Browser (/browser): domain groups, top sites, time per site.",
  "- External (/external): logged off-device activity, sleep tracking, time audit.",
  "- Terminal (/terminal): AI agent workspace sessions, terminal tabs, saved workspaces.",
  "- Settings (/settings): category tiers, browser rules, AI providers, tracking config.",
  "- Insights (/reports): hourly day view, weekly comparison, per-activity analysis.",
  "- Finance (/finance): transactions, budgets, net worth, crypto, subscriptions.",
  "- AI (/ai): goals/focus, long-term plan, daily digest, connectors, and this chat.",
  "",
  "## Structured output contract",
  "When a rich, actionable answer fits one of these shapes, reply with ONLY a fenced",
  "```json block (no prose outside it) using one of these `type` values:",
  '- goal_suggestion: { type, goals:[{title,category,reason}], source }',
  '- plan_update: { type, changes:[{action:"add"|"modify"|"complete", goal:{title,priority,category}}] }',
  '- stats_summary: { type, metrics:[{label,value,change,icon,format}], period }',
  '- action_list: { type, actions:[{label,description,priority,actionButton:{label,ipc,payload}}] }',
  '- digest_item: { type, topic, summary, sources:[{title,url}] }',
  '- connector_status: { type, connectors:[{name,status,lastSync,itemsCount,id}] }',
  '- form_fill: { type, title, submitLabel, fields:[{name,label,type,value,options}] }',
  '- chart_data: { type, chartType:"bar"|"line"|"pie", labels:[], datasets:[{label,data,color}], title }',
  '- error: { type, message, recovery }',
  "For ordinary conversation, reply in plain text (no JSON). Never mix prose and a JSON block.",
  'Valid metric `icon` values: Activity, Clock, Flame, Target, Zap, BarChart3.',
  'Valid `format` values: number, duration (seconds), hours (seconds), percent.',
].join("\n")

function clip(v: unknown, max = 1200): string {
  let s: string
  try {
    s = typeof v === "string" ? v : JSON.stringify(v)
  } catch {
    return ""
  }
  if (!s) return ""
  return s.length > max ? s.slice(0, max) + "\u2026" : s
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '\u2026' : s
}

// CHANGED — return type now includes warnings for silent degradation
export interface ContextBundleResult {
  content: string
  warnings: string[]
}

const MAX_CONTEXT_CHARS = 6000  // ~1500 tokens safety budget

export async function buildContextBundle(): Promise<string> {
  const result = await buildContextBundleDetailed()
  return result.content
}

export async function buildContextBundleDetailed(): Promise<ContextBundleResult> {
  const b = bridge()
  const date = todayIso()
  const warnings: string[] = []

  const [goals, longterm, goalCtx, usage, projects, planning] = await Promise.all([
    safe<unknown>(b && (() => (b.getGoals as (d: string) => Promise<unknown>)(date)), null),
    safe<unknown>(b && (() => (b.getLongtermGoals as () => Promise<unknown>)()), null),
    safe<unknown>(b && (() => (b.getGoalContext as () => Promise<unknown>)()), null),
    safe<unknown>(
      b && (() => (b.getAIUsageSummary as (p?: string) => Promise<unknown>)("today")),
      null,
    ),
    safe<unknown>(b && (() => (b.getProjects as () => Promise<unknown>)()), null),
    safe<unknown>(b && (() => (b.readPlanningMd as () => Promise<unknown>)()), null),
  ])

  // ADDED — connectors context (was missing)
  let connectors: unknown = null
  try {
    connectors = b && await (b.connectorList as () => Promise<unknown>)()
  } catch {
    warnings.push('Connectors context failed')
  }

  // ADDED — active goals as current focus
  let activeGoals: unknown = null
  try {
    const goalsResult = goals as any
    activeGoals = goalsResult?.goals?.filter?.((g: any) => g.status === 'active').slice(0, 5) ?? null
  } catch {
    /* already warned above */
  }

  const dash = await safe<unknown>(
    b && (() => (b.getDashboardAggregates as (a: AnyRec) => Promise<unknown>)({ period: "today" })),
    null,
  )

  const lines: string[] = ["## Live user context (" + date + ")"]
  if (goals) lines.push("### Today's goals", clip(goals))
  else warnings.push('Goals unavailable')
  if (longterm) lines.push("### Long-term goals", clip(longterm))
  if (goalCtx) lines.push("### 7-day goal trends", clip(goalCtx, 800))
  if (dash) lines.push("### Today's app usage", clip(dash, 900))
  if (usage) lines.push("### AI usage today", clip(usage, 600))
  if (projects) lines.push("### Active projects", clip(projects, 800))
  if (planning) lines.push("### Planning notes", clip(planning, 900))

  // ADDED — connectors in context
  if (connectors) lines.push("### Active connectors", clip(connectors, 600))

  // ADDED — current focus (active goals)
  if (activeGoals) lines.push("### Current focus", clip(activeGoals, 400))

  if (lines.length === 1) lines.push("(No live data available right now.)")

  let content = PAGE_CATALOG + "\n\n" + lines.join("\n")

  // ADDED — truncate to fit token budget
  if (content.length > MAX_CONTEXT_CHARS) {
    content = content.slice(0, MAX_CONTEXT_CHARS) + '\n\n[Context truncated to fit token budget]'
    warnings.push('Context truncated to fit token budget')
  }

  return { content, warnings }
}
