import type { Database } from "better-sqlite3"

export function getRelevantMemories(
  db: Database,
  threadDate: string,
  query?: string,
  limit = 8
): Array<{ id: string; content: string; category: string; importance: number }> {
  const current = db.prepare(`
    SELECT id, content, category, importance 
    FROM ai_chat_memories 
    WHERE thread_date = ? 
    ORDER BY importance DESC, created_at DESC 
    LIMIT ?
  `).all(threadDate, limit) as any[]

  const recent = db.prepare(`
    SELECT id, content, category, importance 
    FROM ai_chat_memories 
    WHERE thread_date != ? AND importance > 0.6
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(threadDate, Math.floor(limit / 2)) as any[]

  const merged = [...current, ...recent]
  const seen = new Set<string>()
  return merged.filter(m => {
    if (seen.has(m.content.toLowerCase().slice(0, 30))) return false
    seen.add(m.content.toLowerCase().slice(0, 30))
    return true
  }).slice(0, limit)
}
