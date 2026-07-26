/**
 * Shared data types for the /ai surface (mirrors CONTEXT_BUNDLE.md §9).
 * These match the existing IPC payloads — do not change shapes.
 */

export type GoalCategory =
	| "work"
	| "personal"
	| "health"
	| "learning"
	| "finance"
	| "relationships"

export type Mode = "morning" | "in-progress" | "review"

export interface GoalTarget {
	type: "time" | "completion"
	targetSeconds?: number
	matchCategory?: string
	done?: boolean
}

export interface GoalLink {
	label: string
	url: string
}

export interface Goal {
	id: string
	title: string
	description?: string
	category: GoalCategory
	target: GoalTarget
	period: string
	status: "active" | "done" | "missed"
	date: string
	source: string
	links: GoalLink[]
	progressSeconds?: number
	createdAt: string
	completedAt?: string
}

export interface GoalDay {
	date: string
	goals: Goal[]
	reviewSummary?: string
}

export interface LongTermGoal {
	id: string
	title: string
	description?: string
	category: GoalCategory
	status: "active" | "done" | "missed"
	target_seconds?: number
	priority: number
}

export interface TopicDigestItem {
	topic: string
	summary: string
	sources?: { title: string; url: string }[]
}

/** The four render states every data component must handle. */
export type DataState = "loading" | "empty" | "error" | "ready"

/** Maps a category to an accent key for consistent color coding. */
export const CATEGORY_ACCENT: Record<GoalCategory, string> = {
	work: "pink",
	personal: "violet",
	health: "emerald",
	learning: "cyan",
	finance: "amber",
	relationships: "red",
}
