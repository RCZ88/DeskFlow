import type { AppContext } from '../hooks/useAppContext'

export type NewsItem = {
  metric: string
  summary: string
  detail: string
  deviation: number
}

function isAcknowledged(date: string, metric: string): boolean {
  try {
    const key = `news:dismissed:${date}`
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const dismissed: string[] = JSON.parse(raw)
    return dismissed.includes(metric)
  } catch {
    return false
  }
}

function acknowledge(date: string, metric: string) {
  try {
    const key = `news:dismissed:${date}`
    const raw = localStorage.getItem(key)
    const dismissed: string[] = raw ? JSON.parse(raw) : []
    if (!dismissed.includes(metric)) {
      dismissed.push(metric)
      localStorage.setItem(key, JSON.stringify(dismissed))
    }
  } catch {
    // localStorage unavailable
  }
}

export { acknowledge as acknowledgeNews }

export function detectNews(context: AppContext, date: string = new Date().toISOString().slice(0, 10)): NewsItem[] {
  const news: NewsItem[] = []

  if (context.aggregates) {
    const agg = context.aggregates as any
    if (typeof agg.totalFocusSeconds === 'number' && agg.totalFocusSeconds > 0) {
      const hours = agg.totalFocusSeconds / 3600
      if (hours >= 6) {
        news.push({
          metric: 'focus-time',
          summary: `High focus today: ${hours.toFixed(1)}h`,
          detail: `You spent ${hours.toFixed(1)} hours focused today. That's above your usual range.`,
          deviation: hours,
        })
      } else if (hours <= 1) {
        news.push({
          metric: 'focus-time',
          summary: `Low focus today: ${hours.toFixed(1)}h`,
          detail: `You spent ${hours.toFixed(1)} hours focused today. Consider scheduling focused blocks.`,
          deviation: -hours,
        })
      }
    }
  }

  if (context.sleep) {
    const sleep = context.sleep as any
    const hours = typeof sleep.hours === 'number' ? sleep.hours : sleep.totalHours
    if (typeof hours === 'number') {
      if (hours < 6) {
        news.push({
          metric: 'sleep',
          summary: `Low sleep: ${hours.toFixed(1)}h`,
          detail: `You slept ${hours.toFixed(1)} hours. Most adults need 7-9 hours.`,
          deviation: -(7 - hours),
        })
      } else if (hours >= 8) {
        news.push({
          metric: 'sleep',
          summary: `Great sleep: ${hours.toFixed(1)}h`,
          detail: `You slept ${hours.toFixed(1)} hours. Well rested!`,
          deviation: hours - 7,
        })
      }
    }
  }

  if (context.goals.length > 0) {
    const done = context.goals.filter(g => g.status === 'completed').length
    if (done > 0) {
      news.push({
        metric: 'goals',
        summary: `${done}/${context.goals.length} goals completed`,
        detail: `You completed ${done} of ${context.goals.length} goals today.`,
        deviation: done,
      })
    }
  }

  const filtered = news.filter(n => !isAcknowledged(date, n.metric))

  filtered.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
  return filtered.slice(0, 3)
}
