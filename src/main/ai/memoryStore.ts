import type { MemoryEntry, MemoryTier, MemoryCategory, CompactionResult } from '../../types/memory';

let dbRef: any = null;

export function setMemoryDb(db: any) { dbRef = db; }
export function getMemoryDb() { return dbRef; }

export function bootstrapMemoryTable(): void {
  if (!dbRef) return;
  dbRef.exec(`
    CREATE TABLE IF NOT EXISTS agent_memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'warm',
      importance REAL NOT NULL DEFAULT 0.5,
      access_count INTEGER NOT NULL DEFAULT 0,
      last_accessed_at INTEGER,
      created_at INTEGER NOT NULL,
      corrected_at TEXT NOT NULL DEFAULT '[]',
      dedup_key TEXT NOT NULL UNIQUE,
      source_type TEXT NOT NULL,
      source_session_id TEXT,
      source_cycle_number INTEGER,
      source_original_message TEXT,
      decay_rate REAL NOT NULL DEFAULT 0.01,
      stale_after_days INTEGER NOT NULL DEFAULT 90
    );
    CREATE INDEX IF NOT EXISTS idx_memories_tier ON agent_memories(tier);
    CREATE INDEX IF NOT EXISTS idx_memories_importance ON agent_memories(importance DESC);
    CREATE INDEX IF NOT EXISTS idx_memories_dedup ON agent_memories(dedup_key);
    CREATE INDEX IF NOT EXISTS idx_memories_category ON agent_memories(category);
    CREATE INDEX IF NOT EXISTS idx_memories_created ON agent_memories(created_at DESC);
  `);
}

export function insertMemory(m: MemoryEntry): void {
  if (!dbRef) return;
  dbRef.prepare(`
    INSERT OR REPLACE INTO agent_memories
    (id, content, category, tier, importance, access_count, last_accessed_at, created_at, corrected_at, dedup_key, source_type, source_session_id, source_cycle_number, source_original_message, decay_rate, stale_after_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(m.id, m.content, m.category, m.tier, m.importance, m.accessCount, m.lastAccessedAt, m.createdAt, JSON.stringify(m.correctedAt), m.dedupKey, m.source.type, m.source.sessionId || null, m.source.cycleNumber || null, m.source.originalMessage || null, m.decayRate, m.staleAfterDays);
}

export function getMemoryByDedupKey(dedupKey: string): MemoryEntry | undefined {
  if (!dbRef) return undefined;
  const row = dbRef.prepare('SELECT * FROM agent_memories WHERE dedup_key = ?').get(dedupKey);
  return row ? rowToMemory(row) : undefined;
}

export function getHotMemories(limit: number = 15): MemoryEntry[] {
  if (!dbRef) return [];
  const rows = dbRef.prepare('SELECT * FROM agent_memories WHERE tier = ? ORDER BY importance DESC LIMIT ?').all('hot', limit);
  return rows.map(rowToMemory);
}

export function getMemoriesByTier(tier: MemoryTier, limit: number = 50): MemoryEntry[] {
  if (!dbRef) return [];
  const rows = dbRef.prepare('SELECT * FROM agent_memories WHERE tier = ? ORDER BY importance DESC LIMIT ?').all(tier, limit);
  return rows.map(rowToMemory);
}

export function searchMemories(query: string): MemoryEntry[] {
  if (!dbRef) return [];
  const rows = dbRef.prepare(`
    SELECT * FROM agent_memories
    WHERE content LIKE ? OR dedup_key LIKE ?
    ORDER BY importance DESC LIMIT 20
  `).all(`%${query}%`, `%${query}%`);
  return rows.map(rowToMemory);
}

export function updateMemoryImportance(id: string, importance: number, tier: MemoryTier, correctedAt: number[]): void {
  if (!dbRef) return;
  dbRef.prepare(`
    UPDATE agent_memories SET importance = ?, tier = ?, corrected_at = ?, access_count = access_count + 1, last_accessed_at = ?
    WHERE id = ?
  `).run(importance, tier, JSON.stringify(correctedAt), Date.now(), id);
}

export function bumpAccessCounts(ids: string[]): void {
  if (!dbRef || ids.length === 0) return;
  const stmt = dbRef.prepare('UPDATE agent_memories SET access_count = access_count + 1, last_accessed_at = ? WHERE id = ?');
  const now = Date.now();
  for (const id of ids) stmt.run(now, id);
}

export function updateMemoryTier(id: string, tier: MemoryTier): void {
  if (!dbRef) return;
  dbRef.prepare('UPDATE agent_memories SET tier = ? WHERE id = ?').run(tier, id);
}

export function deleteMemory(id: string): void {
  if (!dbRef) return;
  dbRef.prepare('DELETE FROM agent_memories WHERE id = ?').run(id);
}

export function getMemoryStats(): { tier: string; count: number; avg_importance: number; latest: number }[] {
  if (!dbRef) return [];
  return dbRef.prepare(`
    SELECT tier, COUNT(*) as count, AVG(importance) as avg_importance, MAX(created_at) as latest
    FROM agent_memories GROUP BY tier
  `).all();
}

export function getAllMemoriesForCompaction(): MemoryEntry[] {
  if (!dbRef) return [];
  const rows = dbRef.prepare('SELECT * FROM agent_memories WHERE tier != ?').all('cold');
  return rows.map(rowToMemory);
}

function rowToMemory(row: any): MemoryEntry {
  return {
    id: row.id,
    content: row.content,
    category: row.category as MemoryCategory,
    tier: row.tier as MemoryTier,
    importance: row.importance,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at,
    createdAt: row.created_at,
    correctedAt: JSON.parse(row.corrected_at || '[]'),
    dedupKey: row.dedup_key,
    source: {
      type: row.source_type,
      sessionId: row.source_session_id,
      cycleNumber: row.source_cycle_number,
      originalMessage: row.source_original_message,
    },
    decayRate: row.decay_rate,
    staleAfterDays: row.stale_after_days,
  };
}
