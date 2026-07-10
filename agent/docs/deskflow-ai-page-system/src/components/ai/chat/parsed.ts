/**
 * Structured-output contract for the DeskFlow assistant ("Command Deck").
 *
 * The assistant may answer with plain prose OR emit a typed payload that renders
 * as an interactive card. Payloads are stored verbatim in the ai_chat_messages
 * `parsed_json` column and re-hydrated on load, so the shapes here are the
 * single source of truth for both save and render.
 */
import type { AccentKey } from "../tokens"

export interface ParsedGoal {
	title: string
	category?: string
	reason?: string
	priority?: number
}

export interface PlanChange {
	action: "add" | "modify" | "complete"
	goal: { title: string; priority?: number; category?: string }
}

export interface StatMetric {
	label: string
	value: number
	/** Signed percentage change vs. the previous period. */
	change?: number
	/** lucide icon name, e.g. "Clock". Falls back to a generic glyph. */
	icon?: string
	/** How to render the number. */
	format?: "number" | "duration" | "percent" | "hours"
}

export interface ActionItem {
	label: string
	description?: string
	priority?: number
	actionButton?: { label: string; ipc: string; payload?: Record<string, unknown> }
}

export interface SourceLink {
	title: string
	url: string
}

export interface ConnectorStatusItem {
	name: string
	status: "connected" | "error" | "syncing" | "idle" | string
	lastSync?: string
	itemsCount?: number
	id?: string
}

export type FormFieldType = "text" | "number" | "select" | "toggle"

export interface FormField {
	name: string
	label: string
	type: FormFieldType
	value?: string | number | boolean
	options?: Array<{ label: string; value: string }>
	placeholder?: string
	required?: boolean
}

export interface ChartDataset {
	label: string
	data: number[]
	color?: string
}

/** Discriminated union of everything the assistant can render. */
export type ParsedMessage =
	| { type: "text"; text?: string }
	| { type: "goal_suggestion"; goals: ParsedGoal[]; source?: string }
	| { type: "plan_update"; changes: PlanChange[]; note?: string }
	| { type: "stats_summary"; metrics: StatMetric[]; period?: string }
	| { type: "action_list"; actions: ActionItem[]; note?: string }
	| { type: "digest_item"; topic: string; summary: string; sources?: SourceLink[] }
	| { type: "connector_status"; connectors: ConnectorStatusItem[] }
	| { type: "form_fill"; title?: string; submitLabel?: string; fields: FormField[] }
	| {
			type: "chart_data"
			chartType: "bar" | "line" | "pie"
			labels: string[]
			datasets: ChartDataset[]
			title?: string
	  }
	| { type: "error"; message: string; recovery?: string }

export type ParsedType = ParsedMessage["type"]

/** Actions a card emits back up to AiPage's dispatcher. */
export type CardAction =
	| { kind: "accept-goal"; goal: ParsedGoal }
	| { kind: "dismiss-goal"; goal: ParsedGoal }
	| { kind: "apply-plan"; changes: PlanChange[] }
	| { kind: "run-ipc"; ipc: string; payload?: Record<string, unknown>; label?: string }
	| { kind: "submit-form"; values: Record<string, string | number | boolean> }
	| { kind: "sync-connector"; id?: string; name: string }
	| { kind: "open-url"; url: string }
	| { kind: "retry" }
	| { kind: "send-text"; text: string }

const ACCENT_BY_TYPE: Record<ParsedType, AccentKey> = {
	text: "pink",
	goal_suggestion: "emerald",
	plan_update: "violet",
	stats_summary: "cyan",
	action_list: "pink",
	digest_item: "cyan",
	connector_status: "cyan",
	form_fill: "violet",
	chart_data: "amber",
	error: "red",
}

export function accentForType(t: ParsedType): AccentKey {
	return ACCENT_BY_TYPE[t] ?? "pink"
}

const KNOWN_TYPES: string[] = [
	"text",
	"goal_suggestion",
	"plan_update",
	"stats_summary",
	"action_list",
	"digest_item",
	"connector_status",
	"form_fill",
	"chart_data",
	"error",
]

export function isParsedMessage(v: unknown): v is ParsedMessage {
	return (
		!!v &&
		typeof v === "object" &&
		typeof (v as { type?: unknown }).type === "string" &&
		KNOWN_TYPES.includes((v as { type: string }).type)
	)
}

/**
 * Extract a structured payload from a raw assistant reply.
 * Resolution order: stored parsed_json string -> ```json fenced block ->
 * whole-string JSON. Returns display prose (with any JSON block stripped) plus
 * the parsed payload when present. Never throws.
 */
export function parseAssistantContent(
	raw: string,
	storedJson?: string | null,
): { text: string; parsed?: ParsedMessage } {
	if (storedJson) {
		try {
			const obj = JSON.parse(storedJson)
			if (isParsedMessage(obj)) {
				const t = obj.type === "text" && obj.text ? String(obj.text) : raw || ""
				return { text: obj.type === "text" ? t : "", parsed: obj }
			}
		} catch {
			/* fall through */
		}
	}
	const text = raw ?? ""
	const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
	if (fence) {
		try {
			const obj = JSON.parse(fence[1].trim())
			if (isParsedMessage(obj)) {
				return { text: text.replace(fence[0], "").trim(), parsed: obj }
			}
		} catch {
			/* not a payload */
		}
	}
	const trimmed = text.trim()
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
		try {
			const obj = JSON.parse(trimmed)
			if (isParsedMessage(obj)) return { text: "", parsed: obj }
		} catch {
			/* plain prose that happens to start with a brace */
		}
	}
	return { text }
}

/** Serialize a payload for the ai-chat:save `parsed_json` column. */
export function serializeParsed(parsed?: ParsedMessage): string | undefined {
	if (!parsed) return undefined
	try {
		return JSON.stringify(parsed)
	} catch {
		return undefined
	}
}

/** Human-friendly number formatting shared by stat cards + charts. */
export function formatStat(value: number, format?: StatMetric["format"]): string {
	if (format === "duration") {
		const s = Math.max(0, Math.round(value))
		const h = Math.floor(s / 3600)
		const m = Math.floor((s % 3600) / 60)
		if (h > 0) return h + "h " + m + "m"
		if (m > 0) return m + "m"
		return s + "s"
	}
	if (format === "hours") return (Math.round((value / 3600) * 10) / 10) + "h"
	if (format === "percent") return Math.round(value) + "%"
	return new Intl.NumberFormat().format(Math.round(value))
}
