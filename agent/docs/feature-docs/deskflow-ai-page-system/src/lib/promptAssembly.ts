import { DEFAULT_SYSTEM_PROMPT } from "./defaults"

export type AgentType = "claude" | "opencode" | "custom" | string

export interface SystemPromptsPrefs {
	claude?: string
	opencode?: string
	custom?: string
	generalAdditions?: string
	__v?: string
	[key: string]: string | undefined
}

export const RESERVED_PROMPT_KEYS = ["claude", "opencode", "custom", "generalAdditions", "__v"]
export const PROJECT_KEY_PREFIX = "project:"
export const projectKey = (projectId: string) => `${PROJECT_KEY_PREFIX}${projectId}`

export function migrateSystemPrompts(sp: SystemPromptsPrefs | undefined): SystemPromptsPrefs {
	if (!sp) return { __v: "2" }
	if (sp.__v === "2") return sp
	const reserved = new Set(RESERVED_PROMPT_KEYS)
	const out: SystemPromptsPrefs = {}
	for (const [k, v] of Object.entries(sp)) {
		if (reserved.has(k) || k.startsWith(PROJECT_KEY_PREFIX)) out[k] = v
		else out[projectKey(k)] = v
	}
	out.__v = "2"
	return out
}

export interface PromptLayer {
	id: "default" | "general" | "agent" | "project"
	label: string
	scope: "app" | "agent" | "project"
	content: string
	color: string
	loadedExternally?: boolean
}

export interface AssembleInput {
	systemPrompts: SystemPromptsPrefs
	agentType: AgentType
	projectId?: string | null
	projectName?: string | null
	agentLoadsAppLayersExternally?: boolean
}

export function buildPromptLayers(input: AssembleInput): PromptLayer[] {
	const { systemPrompts: sp, agentType, projectId, projectName } = input
	const ext = !!input.agentLoadsAppLayersExternally
	const layers: PromptLayer[] = []

	layers.push({ id: "default", label: "Default (app baseline)", scope: "app",
		content: DEFAULT_SYSTEM_PROMPT || "", color: "text-cyan-400", loadedExternally: ext })

	const general = (sp.generalAdditions || "").trim()
	if (general) layers.push({ id: "general", label: "General (all projects · all agents)",
		scope: "app", content: general, color: "text-blue-400", loadedExternally: ext })

	const agentAdd = (sp[agentType] || "").trim()
	if (agentAdd) layers.push({ id: "agent", label: `Agent: ${agentType}`, scope: "agent",
		content: agentAdd, color: "text-emerald-400" })

	if (projectId) {
		const proj = (sp[projectKey(projectId)] || "").trim()
		if (proj) layers.push({ id: "project", label: `Project: ${projectName || projectId}`,
			scope: "project", content: proj, color: "text-purple-400" })
	}
	return layers
}

export const PRECEDENCE_NOTE =
	"When instructions conflict, the most specific scope wins: Project > Agent-type > General > Default."

const SECTION_SEP = "\n\n---\n\n"

export interface RenderOptions {
	layerToggles?: Partial<Record<PromptLayer["id"], boolean>>
	includeExternallyLoaded?: boolean
	includePrecedenceNote?: boolean
}

export function renderSystemPrompt(layers: PromptLayer[], opts: RenderOptions = {}): string {
	const { layerToggles = {}, includeExternallyLoaded = false, includePrecedenceNote = true } = opts
	const active = layers.filter((l) => {
		if (layerToggles[l.id] === false) return false
		if (l.loadedExternally && !includeExternallyLoaded) return false
		return (l.content || "").trim().length > 0
	})
	const blocks = active.map((l) => l.content.trim())
	if (includePrecedenceNote && active.length > 1) blocks.unshift(`> ${PRECEDENCE_NOTE}`)
	return blocks.join(SECTION_SEP)
}

export interface ScopeBlockInput {
	kind: "problem" | "request" | "page"
	id: string
	title: string
}

export function scopeBlock(s: ScopeBlockInput): string {
	return [
		"## Session scope (runtime — highest priority)",
		`- This session is bound to ${s.kind}: \"${s.title}\" (id: ${s.id}).`,
		"- Work ONLY on this item. Do not touch unrelated problems, requests, files, or projects.",
		"- Operate only in this bound terminal/session; do not write to other sessions or chats.",
		"- When state changes, emit one machine-readable line so DeskFlow can update status:",
		"  STATUS: <Not Started | In Progress | AI Attempted Fix | User Testing | Fixed | Won't Fix>",
		"- End each work cycle with the mandatory cycle report (see Default §8).",
	].join("\n")
}

export function scopeBlockFromSelected(problems: string[], requests: string[], allProblems: any[], allRequests: any[]): string | null {
	if (problems.length === 1) {
		const p = allProblems.find((x: any) => x.id === problems[0])
		if (p) return scopeBlock({ kind: "problem", id: p.id, title: p.title })
	}
	if (requests.length === 1) {
		const r = allRequests.find((x: any) => x.id === requests[0])
		if (r) return scopeBlock({ kind: "request", id: r.id, title: r.title })
	}
	return null
}
