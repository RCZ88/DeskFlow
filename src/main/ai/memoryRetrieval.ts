import type { Database } from "better-sqlite3"

export function getRelevantMemories(
  db: Database,
  threadDate: string,
  query?: string,
  limit = 8
): Array<{ id: string; content: string; category: string; importance: number }> {
  let current: any[] = []

  if (threadDate && threadDate.trim().length > 0) {
    current = db.prepare(`
      SELECT id, content, category, importance 
      FROM ai_chat_memories 
      WHERE thread_date = ? 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `).all(threadDate, limit) as any[]
  } else if (query && query.trim().length > 0) {
    const searchPattern = `%${query.trim()}%`
    current = db.prepare(`
      SELECT id, content, category, importance 
      FROM ai_chat_memories 
      WHERE content LIKE ? OR category LIKE ?
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `).all(searchPattern, searchPattern, limit) as any[]

    if (current.length === 0) {
      current = db.prepare(`
        SELECT id, content, category, importance 
        FROM ai_chat_memories 
        ORDER BY importance DESC, created_at DESC 
        LIMIT ?
      `).all(limit) as any[]
    }
  } else {
    current = db.prepare(`
      SELECT id, content, category, importance 
      FROM ai_chat_memories 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `).all(limit) as any[]
  }

  const recent = db.prepare(`
    SELECT id, content, category, importance 
    FROM ai_chat_memories 
    WHERE thread_date != ? AND importance > 0.6
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(threadDate || '__none__', Math.floor(limit / 2)) as any[]

  const merged = [...current, ...recent]
  const seen = new Set<string>()
  return merged.filter(m => {
    const key = m.content.toLowerCase().slice(0, 30)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, limit)
}
