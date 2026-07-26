import type { Gap } from '../types/gaps'

export interface CellKey { day: number; hour: number }
export const cellId = (day: number, hour: number): string => day + ':' + hour

export const jsDayToRow = (jsDay: number): number => (jsDay === 0 ? 6 : jsDay - 1)

export function isoToCell(iso: string): CellKey {
  const d = new Date(iso)
  return { day: jsDayToRow(d.getDay()), hour: d.getHours() }
}

export interface GapCellCoverage { day: number; hour: number; coveredSeconds: number }

export function gapToCells(gap: Gap): GapCellCoverage[] {
  const out: GapCellCoverage[] = []
  let cursor = new Date(gap.start).getTime()
  const end = new Date(gap.end).getTime()
  let guard = 0
  while (cursor < end && guard < 48) {
    guard += 1
    const d = new Date(cursor)
    const hourStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0, 0).getTime()
    const hourEnd = hourStart + 3600 * 1000
    const chunkEnd = Math.min(end, hourEnd)
    out.push({ day: jsDayToRow(d.getDay()), hour: d.getHours(), coveredSeconds: (chunkEnd - cursor) / 1000 })
    cursor = chunkEnd
  }
  return out
}

export function buildGapMap(gaps: Gap[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const g of gaps) {
    for (const c of gapToCells(g)) {
      const k = cellId(c.day, c.hour)
      m.set(k, (m.get(k) ?? 0) + c.coveredSeconds)
    }
  }
  return m
}
