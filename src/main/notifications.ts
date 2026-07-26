import { Notification } from 'electron'

export function showNotification(title: string, body: string) {
  new Notification({ title, body }).show()
}

const TIERS = [
  { key: '1d', ms: 86400000 },
  { key: '3h', ms: 10800000 },
  { key: '1h', ms: 3600000 },
]

export function checkDeadlines(db: any) {
  const now = Date.now()
  const rows = db.prepare(`
    SELECT * FROM deadlines
    WHERE status != 'done'
      AND (snoozed_until IS NULL OR snoozed_until <= ?)
  `).all(new Date().toISOString()) as any[]

  for (const row of rows) {
    const notified = JSON.parse(row.notified_at || '{}')
    const due = new Date(row.due_date).getTime()
    const timeLeft = due - now

    for (const tier of TIERS) {
      if (timeLeft <= tier.ms && timeLeft > 0 && !notified[tier.key]) {
        showNotification(
          `${tier.key} until deadline`,
          `${row.title}${row.course ? ` (${row.course})` : ''}`
        )
        notified[tier.key] = true
        db.prepare('UPDATE deadlines SET notified_at = ? WHERE id = ?')
          .run(JSON.stringify(notified), row.id)
        break
      }
    }
  }
}
