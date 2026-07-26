import type { MemoryTier, CompactionResult, DeepMemoryConfig } from '../../types/memory';
import * as store from './memoryStore';

export function compactMemories(config: DeepMemoryConfig): CompactionResult {
  const db = store.getMemoryDb();
  if (!db) return { promoted: 0, demoted: 0, archived: 0 };

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Apply decay to all non-cold memories
  db.prepare(`
    UPDATE agent_memories
    SET importance = MAX(0.1, importance - (decay_rate * ((? - last_accessed_at) / ?)))
    WHERE tier != 'cold'
  `).run(now, dayMs);

  // 2. Recalculate tiers
  const allMemories = store.getAllMemoriesForCompaction();
  let promoted = 0, demoted = 0;

  for (const m of allMemories) {
    const newTier = recalcTier(m.importance, m.accessCount, config);
    if (newTier !== m.tier) {
      store.updateMemoryTier(m.id, newTier);
      if (newTier === 'hot') promoted++;
      else demoted++;
    }
  }

  // 3. Enforce tier caps
  enforceTierCap('hot', config.hot.max_entries);
  enforceTierCap('warm', config.warm.max_entries);

  // 4. Archive stale warm memories to cold
  const staleThreshold = now - (config.cold.auto_archive_after_days * dayMs);
  db.prepare(`
    UPDATE agent_memories SET tier = 'cold'
    WHERE tier = 'warm' AND created_at < ? AND importance < ?
  `).run(staleThreshold, config.scoring.stale_threshold);

  return { promoted, demoted, archived: 0 };
}

function recalcTier(importance: number, accessCount: number, config: DeepMemoryConfig): MemoryTier {
  const accessBoost = Math.min(0.15, accessCount * 0.02);
  const effective = importance + accessBoost;
  if (effective >= config.hot.min_importance) return 'hot';
  if (effective >= config.warm.min_importance) return 'warm';
  return 'cold';
}

function enforceTierCap(tier: MemoryTier, maxEntries: number): void {
  const db = store.getMemoryDb();
  if (!db) return;
  const count = db.prepare('SELECT COUNT(*) as count FROM agent_memories WHERE tier = ?').get(tier);
  if (count.count <= maxEntries) return;

  const toDemote = db.prepare(`
    SELECT id FROM agent_memories
    WHERE tier = ?
    ORDER BY importance ASC, last_accessed_at ASC
    LIMIT ?
  `).all(tier, count.count - maxEntries);

  const newTier = tier === 'hot' ? 'warm' : 'cold';
  for (const row of toDemote) {
    store.updateMemoryTier(row.id, newTier);
  }
}

let compactionTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleCompaction(config: DeepMemoryConfig): void {
  if (compactionTimer) clearTimeout(compactionTimer);
  compactionTimer = setTimeout(() => compactMemories(config), 5000);
}
