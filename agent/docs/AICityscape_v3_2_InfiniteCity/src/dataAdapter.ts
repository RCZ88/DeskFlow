/* ============================================================================
 * dataAdapter.ts — map YOUR DeskFlow AI-usage data to HeroInput[] for CityScene.
 * Replace the body of toHeroes() with your real overview.aiUsage.byTool shape.
 * The rule: height01 = usage / maxUsage; activity01 = recency/session weight.
 * ========================================================================== */
import type { HeroInput } from './metropolis'

// Stable per-agent neon overrides (optional). Falls back to the palette ramp.
export const AGENT_COLORS: Record<string, string> = {
  'claude-code': '#ff9e00',
  'claude-sonnet': '#ff9e00',
  cursor: '#7b2ff7',
  'gpt-4o': '#00e5ff',
  gemini: '#2de2e6',
  codex: '#ff2fb9',
}

export interface ByToolRow {
  id: string
  label?: string
  tokens?: number
  sessions?: number
  cost?: number
  active?: boolean
  lastActiveMsAgo?: number
}

export function toHeroes(rows: ByToolRow[]): HeroInput[] {
  const maxTokens = Math.max(1, ...rows.map(r => r.tokens ?? 0))
  const maxSess = Math.max(1, ...rows.map(r => r.sessions ?? 0))
  return rows.map((r) => ({
    id: r.id,
    label: r.label ?? r.id,
    height01: (r.tokens ?? 0) / maxTokens,
    activity01: r.lastActiveMsAgo != null
      ? Math.max(0, 1 - r.lastActiveMsAgo / (1000 * 60 * 60 * 24)) // last 24h -> 1..0
      : (r.sessions ?? 0) / maxSess,
    active: r.active ?? (r.tokens ?? 0) > 0,
    tokens: r.tokens,
    sessions: r.sessions,
    cost: r.cost,
    color: AGENT_COLORS[r.id] ?? AGENT_COLORS[r.label ?? ''] ?? undefined,
  }))
}
