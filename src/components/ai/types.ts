/**
 * Shared data types for the /ai surface.
 * Goal-related types re-exported from src/types/goals.ts (canonical).
 */

export type {
  GoalCategory, Goal, GoalTarget, GoalLink, LongTermGoal,
} from '../../types/goals';

export type Mode = "morning" | "in-progress" | "review"

export interface GoalDay {
  date: string
  goals: import('../../types/goals').Goal[]
  reviewSummary?: string
}

export interface TopicDigestItem {
	topic: string
	headline?: string
	summary: string
	date?: string
	confidence?: number
	source?: {
		name: string
		url: string
		authority: "high" | "medium" | "low"
	}
	stats?: {
		label: string
		value: string | number
		change?: number
		trend?: "up" | "down" | "flat"
	}
	tags?: string[]
	mentions?: number
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
