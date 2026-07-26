/**
 * Builds the system prompt for the DeskFlow assistant ("Command Deck").
 *
 * Two halves:
 *  1. A STATIC catalog of every app page + the structured-output contract, so
 *     the model knows what it can answer and how to emit interactive cards.
 *  2. A LIVE snapshot assembled per-send from the real IPC endpoints (goals,
 *     usage, projects, planning notes, trends). Failures are swallowed per
 *     source so one dead endpoint never blocks a chat.
 *
 * Nothing here reimplements backend logic — it only reads existing IPC.
 */

type AnyRec = Record<string, unknown>

// The preload bridge is exposed on window.deskflowAPI in this app.
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

/** Static description of the whole product + the response contract. */
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
	return s.length > max ? s.slice(0, max) + "…" : s
}

/**
 * Assemble the live-context system message from real IPC. Every source is
 * optional and independently guarded so the bundle degrades gracefully.
 */
export async function buildContextBundle(): Promise<string> {
	const b = bridge()
	const date = todayIso()

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

	const dash = await safe<unknown>(
		b && (() => (b.getDashboardAggregates as (a: AnyRec) => Promise<unknown>)({ period: "today" })),
		null,
	)

	const lines: string[] = ["## Live user context (" + date + ")"]
	if (goals) lines.push("### Today's goals", clip(goals))
	if (longterm) lines.push("### Long-term goals", clip(longterm))
	if (goalCtx) lines.push("### 7-day goal trends", clip(goalCtx, 800))
	if (dash) lines.push("### Today's app usage", clip(dash, 900))
	if (usage) lines.push("### AI usage today", clip(usage, 600))
	if (projects) lines.push("### Active projects", clip(projects, 800))
	if (planning) lines.push("### Planning notes", clip(planning, 900))
	if (lines.length === 1) lines.push("(No live data available right now.)")

	return PAGE_CATALOG + "\n\n" + lines.join("\n")
}
