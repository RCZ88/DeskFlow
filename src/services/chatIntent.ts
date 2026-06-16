export type GoalCategory = 'work' | 'personal' | 'health' | 'learning'

export type Intent = 'create' | 'toggle' | 'edit' | 'delete' | 'list' | 'unknown'

export interface ParsedIntent {
  intent: Intent
  title?: string
  category?: GoalCategory
  date?: string
  confidence: number
}

const CATEGORIES: GoalCategory[] = ['work', 'personal', 'health', 'learning']

function extractCategory(text: string): { text: string; category?: GoalCategory } {
  for (const cat of CATEGORIES) {
    const re = new RegExp(`\\(${cat}\\)`, 'i')
    if (re.test(text)) {
      return { text: text.replace(re, '').trim(), category: cat }
    }
  }
  return { text }
}

function extractDate(text: string): { text: string; date?: string } {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  if (/\btoday\b/i.test(text)) {
    return { text: text.replace(/\btoday\b/gi, '').trim(), date: today }
  }
  if (/\btomorrow\b/i.test(text)) {
    return { text: text.replace(/\btomorrow\b/gi, '').trim(), date: tomorrow }
  }
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (isoMatch) {
    return { text: text.replace(isoMatch[0], '').trim(), date: isoMatch[1] }
  }
  return { text, date: today }
}

function extractTitle(text: string): { text: string; title?: string } {
  const quoted = text.match(/'([^']+)'|"([^"]+)"/)
  if (quoted) {
    const title = quoted[1] || quoted[2]
    return { text: text.replace(quoted[0], '').trim(), title }
  }
  return { text }
}

export function parseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase().trim()

  let { text: noDate, date } = extractDate(lower)
  const { text: noCat, category } = extractCategory(noDate)
  const { text: noTitle, title } = extractTitle(noCat)

  const ctx = { text: noTitle, category, date, title: title || noTitle }

  if (/^(create|add|make|new)\b/.test(ctx.text)) {
    return {
      intent: 'create',
      title: ctx.title || ctx.text.replace(/^(create|add|make|new)\s+(goal\s+)?/i, '').trim(),
      category: ctx.category,
      date: ctx.date,
      confidence: ctx.title ? 0.9 : 0.7,
    }
  }

  if (/^(delete|remove|destroy|erase)\b/.test(ctx.text)) {
    return {
      intent: 'delete',
      title: ctx.title || ctx.text.replace(/^(delete|remove|destroy|erase)\s+(goal\s+)?/i, '').trim(),
      category: ctx.category,
      date: ctx.date,
      confidence: ctx.title ? 0.9 : 0.7,
    }
  }

  if (/^(mark|set|toggle|complete|done)\b/.test(ctx.text) || /done$/i.test(ctx.text)) {
    return {
      intent: 'toggle',
      title: ctx.title || ctx.text.replace(/^(mark|set|toggle|complete|done)\s+/i, '').replace(/\s+(done|completed)$/i, '').trim(),
      category: ctx.category,
      date: ctx.date,
      confidence: ctx.title ? 0.85 : 0.65,
    }
  }

  if (/^(edit|update|change|modify)\b/.test(ctx.text)) {
    return {
      intent: 'edit',
      title: ctx.title || ctx.text.replace(/^(edit|update|change|modify)\s+(goal\s+)?/i, '').trim(),
      category: ctx.category,
      date: ctx.date,
      confidence: ctx.title ? 0.85 : 0.6,
    }
  }

  if (/(^show|^list|^what|goals|my goals|all goals)/i.test(ctx.text) && !/create|add|delete|remove/i.test(ctx.text)) {
    return {
      intent: 'list',
      category: ctx.category,
      date: ctx.date,
      confidence: 0.8,
    }
  }

  if (/^how was my day|^how.*day|^summary|^what.*new|^news/i.test(ctx.text)) {
    return {
      intent: 'list',
      confidence: 0.7,
    }
  }

  return { intent: 'unknown', confidence: 0 }
}
