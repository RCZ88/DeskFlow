import { parse, addDays, isValid } from 'date-fns'

export interface ParsedScheduleEntry {
  title: string
  location?: string
  day_of_week: number
  start_time: string
  end_time: string
  category: string
  color?: string
}

export interface ParsedDeadline {
  title: string
  course?: string
  due_date: string
  priority: string
}

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

export function parseScheduleInput(input: string): ParsedScheduleEntry | null {
  const dayMatch = input.match(/\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  if (!dayMatch) return null
  const day_of_week = DAY_MAP[dayMatch[1].toLowerCase()]

  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!timeMatch) return null
  const start_time = normalizeTime(timeMatch[1], timeMatch[2], timeMatch[3])
  const end_time = normalizeTime(timeMatch[4], timeMatch[5], timeMatch[6] || timeMatch[3])

  let title = input.split(/[:@]/)[1]?.trim() || input.replace(dayMatch[0], '').replace(timeMatch[0], '').trim()

  let location: string | undefined
  const locMatch = input.match(/(?:in|@|at)\s+(.+?)(?:\s*$|\s+(?=\())/i)
  if (locMatch) {
    location = locMatch[1].trim()
    title = title.replace(locMatch[0], '').trim()
  }

  let category = 'class'
  const lower = input.toLowerCase()
  if (lower.includes('lab')) category = 'lab'
  else if (lower.includes('study')) category = 'study'
  else if (lower.includes('exam')) category = 'exam'

  return { title, location, day_of_week, start_time, end_time, category }
}

export function parseDeadlineInput(input: string): ParsedDeadline | null {
  const dueMatch = input.match(/due\s+(.+?)(?:\s*$|\.)/i)
  if (!dueMatch) return null

  const dueText = dueMatch[1].trim()
  const due_date = parseNaturalDate(dueText)
  if (!due_date) return null

  let title = input.split(/due/i)[0].trim()
  const courseMatch = title.match(/^([A-Z]{2,}\s*\d{3}[A-Z]?)/i)
  const course = courseMatch ? courseMatch[1] : undefined
  if (course) title = title.replace(course, '').trim()

  let priority = 'medium'
  const lower = input.toLowerCase()
  if (lower.includes('urgent') || lower.includes('critical')) priority = 'critical'
  else if (lower.includes('important')) priority = 'high'

  return { title, course, due_date, priority }
}

function normalizeTime(hour: string, minute: string | undefined, ampm: string | undefined): string {
  let h = parseInt(hour)
  const m = minute ? parseInt(minute) : 0
  if (ampm?.toLowerCase() === 'pm' && h !== 12) h += 12
  if (ampm?.toLowerCase() === 'am' && h === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function parseNaturalDate(text: string): string | null {
  const now = new Date()

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const d = new Date(text)
    return isValid(d) ? d.toISOString() : null
  }

  const formats = ['MMM d yyyy', 'MMM d', 'M/d/yyyy', 'M/d', 'yyyy-MM-dd']
  for (const f of formats) {
    const parsed = parse(text, f, new Date())
    if (isValid(parsed)) return parsed.toISOString()
  }

  const lower = text.toLowerCase()
  if (lower.includes('tomorrow')) return addDays(now, 1).toISOString()

  const dayMatch = lower.match(/\bnext\s+(mon|tue|wed|thu|fri|sat|sun)/)
  if (dayMatch) {
    const dayMap: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 }
    const target = dayMap[dayMatch[1]]
    let daysUntil = target - now.getDay()
    if (daysUntil <= 0) daysUntil += 7
    return addDays(now, daysUntil).toISOString()
  }

  const dowMatch = text.match(/\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  if (dowMatch) {
    const target = DAY_MAP[dowMatch[1].toLowerCase()]
    let daysUntil = target - now.getDay()
    if (daysUntil <= 0) daysUntil += 7
    const d = addDays(now, daysUntil)
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (timeMatch) {
      let h = parseInt(timeMatch[1])
      const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      if (timeMatch[3]?.toLowerCase() === 'pm' && h !== 12) h += 12
      if (timeMatch[3]?.toLowerCase() === 'am' && h === 12) h = 0
      d.setHours(h, m, 0, 0)
    } else {
      d.setHours(23, 59, 0, 0)
    }
    return d.toISOString()
  }

  return null
}
