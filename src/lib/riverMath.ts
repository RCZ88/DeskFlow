/* riverMath.ts — pure helpers for the Life Phases Timeline ("River of Years").
   No React, no DOM — everything here is unit-testable math + labels. */

export interface LifePhaseMilestone {
  id: string
  month?: number
  year: number
  label: string
}

export interface LifePhase {
  id: string
  title: string
  description: string
  category: string
  startMonth: number
  startYear: number
  endMonth?: number | null
  endYear?: number | null
  magnitude: number
  color?: string | null
  reflection: string
  eraTrends: string
  impactNotes: string
  milestones: LifePhaseMilestone[]
  connections: string[]
  updatedAt?: string
}

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

export const PHASE_CATEGORIES = [
  { id: 'growth', label: 'Growth', color: '#6fb38f' },
  { id: 'career', label: 'Career', color: '#38bdf8' },
  { id: 'love', label: 'Love', color: '#f472b6' },
  { id: 'challenge', label: 'Challenge', color: '#a1a1aa' },
  { id: 'joy', label: 'Joy', color: '#fbbf24' },
  { id: 'rest', label: 'Rest', color: '#a78bfa' },
  { id: 'adventure', label: 'Adventure', color: '#2dd4bf' },
  { id: 'creation', label: 'Creation', color: '#e8866b' },
] as const

export type PhaseCategory = (typeof PHASE_CATEGORIES)[number]['id']

export function categoryOf(id: string): { id: string; label: string; color: string } {
  return (
    PHASE_CATEGORIES.find(c => c.id === id) ?? {
      id,
      label: id,
      color: '#fbbf24',
    }
  )
}

/** Map a (year, month) to a 0..1 position along a timeline spanning minYear..maxYear. */
export function timeToX(year: number, month: number, minYear: number, maxYear: number): number {
  const span = Math.max(1, maxYear - minYear)
  const t = year + (month - 1) / 12
  return Math.min(1, Math.max(0, (t - minYear) / span))
}

export function phaseStartX(p: LifePhase, minYear: number, maxYear: number): number {
  return timeToX(p.startYear, p.startMonth || 1, minYear, maxYear)
}

export function phaseEndX(p: LifePhase, minYear: number, maxYear: number): number {
  if (p.endYear != null && p.endYear > 0) {
    return timeToX(p.endYear, p.endMonth || 12, minYear, maxYear)
  }
  return 1
}

/** The river is drawn as a set of rounded "reaches"; taller = bigger magnitude. */
export function reachHeight(magnitude: number): number {
  const m = Math.min(100, Math.max(0, magnitude))
  return 0.32 + (m / 100) * 0.48
}

/** Soft (sigmoid-ish) fill ramp between two normalized x positions. */
export function rampFill(from: number, to: number, x: number): number {
  if (to <= from) return 1
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

export interface ZoomView {
  zoom: number
  minYear: number
  maxYear: number
  yearSpan: number
}

/** Current zoom level → the year window the canvas displays. */
export function zoomStops(zoom: number, dataMinYear: number, dataMaxYear: number): ZoomView {
  const levels: Array<{ z: number; span: number }> = [
    { z: 0, span: 100 },
    { z: 1, span: 60 },
    { z: 2, span: 40 },
    { z: 3, span: 25 },
    { z: 4, span: 15 },
  ]
  const idx = Math.min(levels.length - 1, Math.max(0, Math.round(zoom)))
  const span = levels[idx].span
  const dataSpan = dataMaxYear - dataMinYear
  const today = new Date().getFullYear()
  const center = Math.max(dataMinYear, Math.min(today, Math.round((dataMinYear + dataMaxYear) / 2)))
  const half = Math.max(span, dataSpan) / 2
  return {
    zoom: idx,
    minYear: Math.floor(center - half),
    maxYear: Math.ceil(center + half),
    yearSpan: Math.ceil(center + half) - Math.floor(center - half),
  }
}

export function magnitudeWords(v: number): string {
  const m = Math.min(100, Math.max(0, Math.round(v)))
  if (m < 10) return 'barely a ripple'
  if (m < 20) return 'a quiet current'
  if (m < 30) return 'a gentle stream'
  if (m < 40) return 'a steady flow'
  if (m < 50) return 'a widening river'
  if (m < 60) return 'a strong current'
  if (m < 70) return 'a powerful stretch'
  if (m < 80) return 'a roaring torrent'
  if (m < 90) return 'a cataract'
  return 'the full flood'
}

export function magnitudeGradient(v: number): string {
  const m = Math.min(100, Math.max(0, Math.round(v)))
  return `linear-gradient(to right, #fbbf24 ${m}%, rgba(255,255,255,0.08) ${m}%)`
}

/** "Mar 2018 – Jun 2021" | "Mar 2018 – present" */
export function phaseSpanLabel(p: LifePhase): string {
  const start = `${MONTHS[(p.startMonth || 1) - 1]} ${p.startYear}`
  const end =
    p.endYear != null && p.endYear > 0
      ? `${MONTHS[(p.endMonth || 12) - 1]} ${p.endYear}`
      : 'present'
  return `${start} – ${end}`
}

export function phaseAgeLabel(p: LifePhase): string {
  const now = new Date()
  const endY = p.endYear != null && p.endYear > 0 ? p.endYear : now.getFullYear()
  const endM = p.endMonth != null && p.endMonth > 0 ? p.endMonth : now.getMonth() + 1
  const years = endY - p.startYear + (endM - (p.startMonth || 1)) / 12
  if (years < 1) return 'a season'
  if (years < 2) return 'a year'
  return `${Math.round(years)} years`
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function sortPhases(phases: LifePhase[]): LifePhase[] {
  return [...phases].sort((a, b) => {
    const aStart = a.startYear + (a.startMonth || 1) / 12
    const bStart = b.startYear + (b.startMonth || 1) / 12
    return aStart - bStart
  })
}
