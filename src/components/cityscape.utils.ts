import * as THREE from 'three'

const AGENT_COLORS: Record<string, string> = {
  'claude-code': '#f97316',
  'cursor': '#a855f7',
  'opencode': '#3b82f6',
  'gemini': '#22c55e',
  'codex': '#10b981',
  'qwen': '#f59e0b',
  'aider': '#f59e0b',
  'kilocode': '#22c55e',
}

export function agentColor(agentId: string): string {
  return AGENT_COLORS[agentId] || hashColor(agentId)
}

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 55%)`
}

export function neon(hex: string, gain = 4): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(gain)
}

const MODEL_PREFIXES: Record<string, string> = {
  'claude': 'claude',
  'gpt': 'gpt',
  'gemini': 'gemini',
  'sonnet': 'claude-sonnet',
  'opus': 'claude-opus',
  'haiku': 'claude-haiku',
}

export function modelFamily(name: string): string {
  const lower = name.toLowerCase()
  for (const [prefix, family] of Object.entries(MODEL_PREFIXES)) {
    if (lower.startsWith(prefix)) return family
  }
  return lower.replace(/-\d{8,}.*$/, '').replace(/v?\d+\.\d+.*$/, '').trim()
}

const H_MIN = 0.4, H_MAX = 14
const W_MIN = 0.8, W_MAX = 2.4

export function scaleHeight(value: number, maxValue: number): number {
  if (value <= 0 || maxValue <= 0) return 0
  return H_MIN + (H_MAX - H_MIN) * Math.log10(value + 1) / Math.log10(maxValue + 1)
}

export function scaleFootprint(value: number, maxValue: number): number {
  if (value <= 0 || maxValue <= 0) return W_MIN
  return W_MIN + (W_MAX - W_MIN) * Math.sqrt(value) / Math.sqrt(maxValue)
}

const WINDOW_POOL: (THREE.CanvasTexture | null)[] = []

export function getWindowTexture(litRatio: number, tint = '#bfe9ff'): THREE.CanvasTexture {
  const idx = Math.min(Math.floor(litRatio / 0.2), 4)
  if (!WINDOW_POOL[idx]) {
    const c = document.createElement('canvas')
    c.width = 64; c.height = 128
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#04060c'; ctx.fillRect(0, 0, 64, 128)
    const cols = 6, rows = 14, pad = 4
    const cw = (64 - pad * (cols + 1)) / cols
    const ch = (128 - pad * (rows + 1)) / rows
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = Math.random() < litRatio
        ctx.globalAlpha = lit ? 0.6 + Math.random() * 0.4 : 1
        ctx.fillStyle = lit ? tint : '#0a0f1a'
        ctx.fillRect(pad + x * (cw + pad), pad + y * (ch + pad), cw, ch)
      }
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    WINDOW_POOL[idx] = tex
  }
  return WINDOW_POOL[idx]!
}

export function disposeWindowPool(): void {
  for (const t of WINDOW_POOL) if (t) t.dispose()
}

export interface BuildingDef {
  id: string
  label: string
  height: number
  footprint: number
  color: string
  metricValue: number
  cost: number
  agentId?: string
  active: boolean
  messageCount: number
  sessions: number
  models: string[]
}

export interface PlacedBuilding extends BuildingDef {
  x: number
  z: number
}

const GAP = 2.0

export function layoutSpiral(buildings: BuildingDef[]): PlacedBuilding[] {
  const sorted = [...buildings].sort((a, b) => b.height - a.height)
  const result: PlacedBuilding[] = []
  for (let i = 0; i < sorted.length; i++) {
    const angle = i * 137.508 * Math.PI / 180
    const r = Math.sqrt(i + 1) * (W_MAX + GAP)
    result.push({
      ...sorted[i],
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
    })
  }
  return result
}

export interface CityModel {
  buildings: PlacedBuilding[]
  metricMax: number
  costMax: number
}

export function buildCityModel(
  overview: any,
  mode: 'agent' | 'model' | 'time',
  metric: string,
  timeDate?: string,
): CityModel {
  const byTool = overview?.aiUsage?.byTool || {}
  const toolIds = Object.keys(byTool)
  const metricField = metric === 'messages' ? 'messageCount' : metric

  if (mode === 'agent' || mode === 'time') {
    const defs: BuildingDef[] = []
    let metricMax = 0, costMax = 0

    for (const toolId of toolIds) {
      const tool = byTool[toolId]
      let value = 0, cost = 0
      if (mode === 'time' && timeDate) {
        const day = tool.daily?.[timeDate] || {}
        value = metric === 'cost' ? (day.cost || 0) : (day[metricField] || 0)
        cost = day.cost || 0
      } else {
        value = metric === 'cost' ? (tool.cost || 0) : (tool[metricField] || 0)
        cost = tool.cost || 0
      }
      if (value > metricMax) metricMax = value
      if (cost > costMax) costMax = cost
      const lastUsed = tool.lastUsed ? new Date(tool.lastUsed).getTime() : 0
      defs.push({
        id: toolId,
        label: toolId,
        height: 0, footprint: 0,
        color: agentColor(toolId),
        metricValue: value,
        cost,
        agentId: toolId,
        active: lastUsed > 0 && (Date.now() - lastUsed < 86400000),
        messageCount: tool.messageCount || 0,
        sessions: tool.sessions || 0,
        models: tool.models || [],
      })
    }

    for (const b of defs) {
      b.height = scaleHeight(b.metricValue, metricMax)
      const c = metric === 'cost' ? b.metricValue : b.cost
      b.footprint = scaleFootprint(c, costMax)
    }
    return { buildings: layoutSpiral(defs), metricMax, costMax }
  }

  if (mode === 'model') {
    const modelMap = new Map<string, {
      tokens: number; messages: number; sessions: number; cost: number; agents: Set<string>; models: string[]
    }>()
    for (const toolId of toolIds) {
      const tool = byTool[toolId]
      const breakdown = tool.modelBreakdown || []
      for (const entry of breakdown) {
        const family = modelFamily(entry.model || entry.name || toolId)
        if (!modelMap.has(family)) {
          modelMap.set(family, { tokens: 0, messages: 0, sessions: 0, cost: 0, agents: new Set(), models: [] })
        }
        const m = modelMap.get(family)!
        m.tokens += entry.tokens || 0
        m.messages += entry.messageCount || 0
        m.sessions += entry.sessions || 0
        m.cost += entry.cost || 0
        m.agents.add(toolId)
        m.models.push(entry.model || entry.name || '')
      }
    }
    const defs: BuildingDef[] = []
    let metricMax = 0, costMax = 0
    for (const [family, data] of modelMap.entries()) {
      const value = metric === 'cost' ? data.cost : (metric === 'messages' ? data.messages : metric === 'tokens' ? data.tokens : data.sessions)
      if (value > metricMax) metricMax = value
      if (data.cost > costMax) costMax = data.cost
      const primaryAgent = data.agents.values().next().value || 'unknown'
      defs.push({
        id: family,
        label: family,
        height: 0, footprint: 0,
        color: agentColor(primaryAgent),
        metricValue: value,
        cost: data.cost,
        agentId: primaryAgent,
        active: false,
        messageCount: data.messages,
        sessions: data.sessions,
        models: Array.from(data.models).slice(0, 5),
      })
    }
    for (const b of defs) {
      b.height = scaleHeight(b.metricValue, metricMax)
      const c = metric === 'cost' ? b.metricValue : b.cost
      b.footprint = scaleFootprint(c, costMax)
    }
    return { buildings: layoutSpiral(defs), metricMax, costMax }
  }

  return { buildings: [], metricMax: 0, costMax: 0 }
}

export function extractDateRange(overview: any): string[] {
  const byTool = overview?.aiUsage?.byTool || {}
  const dateSet = new Set<string>()
  for (const tool of Object.values(byTool) as any[]) {
    if (tool.daily) {
      for (const dateStr of Object.keys(tool.daily)) {
        dateSet.add(dateStr)
      }
    }
  }
  return Array.from(dateSet).sort()
}

export function formatMetricValue(value: number, metric: string): string {
  if (metric === 'cost') return `$${value.toFixed(4)}`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}
