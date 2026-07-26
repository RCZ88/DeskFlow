import type { HeroInput } from './metropolis'

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
  messages?: number
  sessions?: number
  cost?: number
  active?: boolean
  lastActiveMsAgo?: number
}

export function toHeroes(rows: ByToolRow[], metric: 'tokens' | 'messages' | 'sessions' | 'cost' = 'tokens'): HeroInput[] {
  const maxTokens = Math.max(1, ...rows.map(r => r.tokens ?? 0))
  const maxSess = Math.max(1, ...rows.map(r => r.sessions ?? 0))
  const maxMsgs = Math.max(1, ...rows.map(r => r.messages ?? 0))
  const maxCost = Math.max(1, ...rows.map(r => r.cost ?? 0))
  return rows.map((r) => {
    let rawVal: number
    let maxVal: number
    switch (metric) {
      case 'messages':
        rawVal = r.messages ?? 0; maxVal = maxMsgs; break
      case 'sessions':
        rawVal = r.sessions ?? 0; maxVal = maxSess; break
      case 'cost':
        rawVal = r.cost ?? 0; maxVal = maxCost; break
      default:
        rawVal = r.tokens ?? 0; maxVal = maxTokens
    }
    return {
      id: r.id,
      label: r.label ?? r.id,
      height01: rawVal / maxVal,
      activity01: r.lastActiveMsAgo != null
        ? Math.max(0, 1 - r.lastActiveMsAgo / (1000 * 60 * 60 * 24))
        : (r.sessions ?? 0) / maxSess,
      active: r.active ?? (r.tokens ?? 0) > 0,
      metricValue: rawVal,
      metric,
      tokens: r.tokens,
      sessions: r.sessions,
      cost: r.cost,
      color: AGENT_COLORS[r.id] ?? AGENT_COLORS[r.label ?? ''] ?? undefined,
    }
  })
}
