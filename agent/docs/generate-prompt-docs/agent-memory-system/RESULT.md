# Agent Memory System — Complete Design Document
## DeskFlow Terminal Workspace — v1.0 Design

---

## 1. EXECUTIVE SUMMARY

The Agent Memory System solves cross-session amnesia by creating a **three-tier memory store** (Hot/Warm/Cold) with automatic capture, scoring, deduplication, and token-budget-aware injection into every agent prompt. It reuses all existing scaffolding: `deep_memory` config, `memoryExtractor.ts` logic, `ContextService.ts` layered assembly, and the preferences IPC layer.

**Core principle:** *The agent never has to "remember to remember."* Memories are captured automatically from corrections, emitted via a structured protocol, scored by relevance, and injected into the prompt without the agent knowing how.

---

## 2. DATA MODEL

### 2.1 Memory Entry Schema

```typescript
// src/types/memory.ts

export type MemoryTier = 'hot' | 'warm' | 'cold';
export type MemoryCategory = 
  | 'correction'      // User said "no, do it this way"
  | 'invariant'       // "NEVER run git clean -fdx"
  | 'root_cause'      // Non-obvious bug root cause
  | 'pattern'         // Recurring code/design pattern
  | 'preference'      // User preference ("I prefer X over Y")
  | 'decision'        // Architectural decision
  | 'workflow'        // How a specific workflow works
  | 'error_recovery'; // "If you see error X, do Y"

export interface MemoryEntry {
  id: string;                    // UUID v4
  content: string;                 // The lesson itself (1-2 sentences max)
  category: MemoryCategory;
  tier: MemoryTier;

  // Scoring & Ranking
  importance: number;            // 0.0 - 1.0, initial score from extractor
  accessCount: number;           // How many times injected into prompt
  lastAccessedAt: number;          // Timestamp
  createdAt: number;               // Timestamp
  correctedAt: number[];           // Timestamps of each re-correction (strengthens)

  // Deduplication
  dedupKey: string;              // Normalized content hash (first 60 chars, lowercased, whitespace-normalized)

  // Source Tracking
  source: {
    type: 'user_correction' | 'agent_self_reflect' | 'reflection_log' | 'common_errors' | 'manual';
    sessionId?: string;            // Which session created this
    cycleNumber?: number;          // From agent/state.md
    originalMessage?: string;      // The raw correction message (for warm/cold storage)
  };

  // Decay
  decayRate: number;             // Per-day decay (default 0.01 for corrections, 0.005 for invariants)
  staleAfterDays: number;        // When to auto-archive (from tier config)
}

export interface MemoryStore {
  version: number;               // Schema version for migrations
  hot: MemoryEntry[];            // In-prompt memories (max ~15 entries)
  warm: MemoryEntry[];           // Sidebar-visible, summarized (max ~50 entries)
  cold: MemoryEntry[];           // Archived, searchable on demand (unbounded)
  stats: {
    totalCaptured: number;
    totalDeduped: number;
    lastCompactionAt: number;
    lastDecayRunAt: number;
  };
}
```

### 2.2 Tier Configuration

```typescript
// Extends ContextConfig.ts deep_memory section

export interface DeepMemoryConfig {
  enabled: boolean;
  pattern_detection: boolean;
  max_patterns: number;          // Max HOT memories
  retention_days: number;          // When to move warm → cold

  // NEW fields (added to ContextConfig)
  hot: {
    max_entries: number;           // 10 (low), 15 (mid), 20 (top)
    max_tokens: number;            // 800 (low), 1200 (mid), 2000 (top)
    min_importance: number;        // 0.7 to enter hot
  };
  warm: {
    max_entries: number;           // 30 (low), 40 (mid), 60 (top)
    max_tokens: number;            // 1500 (low), 2000 (mid), 3000 (top)
    min_importance: number;        // 0.4 to enter warm
  };
  cold: {
    max_entries: number;           // Unlimited (archived)
    auto_archive_after_days: number; // 90 (low), 120 (mid), 180 (top)
  };
  scoring: {
    base_correction: number;      // 0.7
    base_invariant: number;       // 0.85
    base_pattern: number;         // 0.6
    user_repeat_bonus: number;    // +0.1 per re-correction
    access_bonus: number;         // +0.02 per prompt injection
    decay_daily: number;          // -0.01 per day
    stale_threshold: number;      // 0.3 (below this → cold)
  };
}

// Updated TIER_PROFILES
export const TIER_PROFILES: Record<ModelTier, Partial<ContextConfig>> = {
  top: { 
    total_token_budget: 10000, 
    deep_memory: { 
      enabled: true, 
      pattern_detection: true, 
      max_patterns: 20, 
      retention_days: 120,
      hot: { max_entries: 20, max_tokens: 2000, min_importance: 0.7 },
      warm: { max_entries: 60, max_tokens: 3000, min_importance: 0.4 },
      cold: { auto_archive_after_days: 180 },
      scoring: { base_correction: 0.7, base_invariant: 0.85, base_pattern: 0.6, user_repeat_bonus: 0.1, access_bonus: 0.02, decay_daily: 0.01, stale_threshold: 0.3 }
    } 
  },
  mid: { 
    total_token_budget: 7000, 
    deep_memory: { 
      enabled: true, 
      pattern_detection: true, 
      max_patterns: 15, 
      retention_days: 90,
      hot: { max_entries: 15, max_tokens: 1200, min_importance: 0.7 },
      warm: { max_entries: 40, max_tokens: 2000, min_importance: 0.4 },
      cold: { auto_archive_after_days: 120 },
      scoring: { base_correction: 0.7, base_invariant: 0.85, base_pattern: 0.6, user_repeat_bonus: 0.1, access_bonus: 0.02, decay_daily: 0.01, stale_threshold: 0.3 }
    } 
  },
  low: { 
    total_token_budget: 4000, 
    deep_memory: { 
      enabled: true, 
      pattern_detection: false, 
      max_patterns: 10, 
      retention_days: 30,
      hot: { max_entries: 10, max_tokens: 800, min_importance: 0.7 },
      warm: { max_entries: 30, max_tokens: 1500, min_importance: 0.4 },
      cold: { auto_archive_after_days: 90 },
      scoring: { base_correction: 0.7, base_invariant: 0.85, base_pattern: 0.6, user_repeat_bonus: 0.1, access_bonus: 0.02, decay_daily: 0.01, stale_threshold: 0.3 }
    } 
  },
};
```

---

## 3. STORAGE LAYER

### 3.1 SQLite Schema (Single Table)

```sql
-- Uses existing SQLite database, no new DB needed

CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'warm',
  importance REAL NOT NULL DEFAULT 0.5,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at INTEGER,
  created_at INTEGER NOT NULL,
  corrected_at TEXT NOT NULL DEFAULT '[]',  -- JSON array of timestamps
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
```

### 3.2 Preferences Fallback

If SQLite migration is blocked, store as a single preference key:

```typescript
// Fallback: prefs['agentMemoryStore'] = JSON.stringify(MemoryStore)
// With a 5MB cap (Electron localStorage limit consideration)
```

**Decision:** Use SQLite table as primary. Preferences fallback only if DB is unavailable.

---

## 4. CAPTURE MECHANISM (Auto-Write)

### 4.1 Trigger Patterns

The system listens for **three capture triggers** in the main process:

```typescript
// src/main/ai/memoryCapture.ts

const CAPTURE_TRIGGERS = {
  // Trigger 1: Explicit memory emission from agent
  // Format: [save-memory] <scope> | <tags> | <lesson>
  explicit: /\[save-memory\]\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)/i,

  // Trigger 2: User correction patterns ("idiot trigger")
  // Detects when user is correcting the agent
  userCorrection: [
    /(?:you idiot|i told you|i already told you|no,? that's wrong|incorrect|you forgot|you keep|stop doing|never do|always do)/i,
    /(?:i said|i already said|as i mentioned|like i said|remember that|don't forget)/i,
    /(?:wrong|incorrect|not right|that's not|should be|needs to be|must be)/i,
  ],

  // Trigger 3: Agent self-reflection (after cycle report)
  // Detected by following cycle report with self-criticism
  selfReflect: /(?:i made a mistake|i was wrong|i forgot|i should have|next time i will|lesson learned)/i,
};
```

### 4.2 Capture Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Message   │────▶│  Pattern Matcher │────▶│  Extract Lesson │
│  or Agent Emit  │     │  (3 triggers)    │     │  (memoryExtractor│
└─────────────────┘     └──────────────────┘     │   logic reused) │
                                                 └────────┬────────┘
                                                          │
                              ┌───────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Deduplication   │◄── Check dedup_key against DB
                    │  (fuzzy match)   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │  New    │    │  Exists │    │  Similar│
        │ Memory  │    │ (update)│    │ (merge) │
        └────┬────┘    └────┬────┘    └────┬────┘
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                    ┌──────────────────┐
                    │  Score & Rank    │
                    │  (importance calc) │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │  Assign Tier     │
                    │  (hot/warm/cold) │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │  Persist to DB   │
                    │  (SQLite)        │
                    └──────────────────┘
```

### 4.3 Capture Implementation

```typescript
// src/main/ai/memoryCapture.ts

import { MemoryEntry, MemoryCategory, MemoryTier } from '../../types/memory';
import { extractMemoriesFromMessages } from './memoryExtractor'; // Reused

interface CaptureResult {
  captured: boolean;
  memory?: MemoryEntry;
  action: 'new' | 'updated' | 'deduped' | 'ignored';
}

export async function captureMemoryFromMessage(
  message: string,
  sender: 'user' | 'agent',
  sessionId: string,
  cycleNumber?: number
): Promise<CaptureResult> {

  // 1. Check if message matches any trigger
  const triggerType = detectTrigger(message, sender);
  if (!triggerType) return { captured: false, action: 'ignored' };

  // 2. Extract lesson content
  const lesson = extractLesson(message, triggerType);
  if (!lesson || lesson.length < 15) return { captured: false, action: 'ignored' };

  // 3. Generate dedup key
  const dedupKey = generateDedupKey(lesson);

  // 4. Check for existing memory
  const existing = await db.prepare('SELECT * FROM agent_memories WHERE dedup_key = ?').get(dedupKey);

  if (existing) {
    // Update: strengthen importance, add correction timestamp
    const correctedAt = JSON.parse(existing.corrected_at);
    correctedAt.push(Date.now());

    const newImportance = Math.min(1.0, existing.importance + 0.1); // Repeat bonus
    const newTier = recalcTier(newImportance, existing.access_count);

    await db.prepare(`
      UPDATE agent_memories 
      SET importance = ?, corrected_at = ?, tier = ?, access_count = access_count + 1, last_accessed_at = ?
      WHERE id = ?
    `).run(newImportance, JSON.stringify(correctedAt), newTier, Date.now(), existing.id);

    return { 
      captured: true, 
      action: 'updated',
      memory: { ...existing, importance: newImportance, tier: newTier }
    };
  }

  // 5. Create new memory
  const memory: MemoryEntry = {
    id: crypto.randomUUID(),
    content: lesson,
    category: categorizeLesson(lesson, triggerType),
    tier: 'warm', // Start in warm, promote on next compaction
    importance: calculateInitialImportance(lesson, triggerType),
    accessCount: 0,
    lastAccessedAt: Date.now(),
    createdAt: Date.now(),
    correctedAt: [Date.now()],
    dedupKey,
    source: {
      type: triggerType === 'userCorrection' ? 'user_correction' : 
            triggerType === 'selfReflect' ? 'agent_self_reflect' : 'manual',
      sessionId,
      cycleNumber,
      originalMessage: message.slice(0, 500) // Truncate for storage
    },
    decayRate: triggerType === 'userCorrection' ? 0.005 : 0.01,
    staleAfterDays: 90
  };

  // 6. Insert into DB
  await insertMemory(memory);

  // 7. Trigger async compaction (don't block)
  scheduleCompaction();

  return { captured: true, action: 'new', memory };
}

function detectTrigger(message: string, sender: 'user' | 'agent'): string | null {
  if (sender === 'agent' && CAPTURE_TRIGGERS.explicit.test(message)) return 'explicit';
  if (sender === 'agent' && CAPTURE_TRIGGERS.selfReflect.test(message)) return 'selfReflect';
  if (sender === 'user') {
    for (const pattern of CAPTURE_TRIGGERS.userCorrection) {
      if (pattern.test(message)) return 'userCorrection';
    }
  }
  return null;
}

function extractLesson(message: string, triggerType: string): string {
  if (triggerType === 'explicit') {
    const match = message.match(CAPTURE_TRIGGERS.explicit);
    return match ? match[3].trim() : '';
  }

  // For corrections, extract the sentence containing the trigger + next sentence
  const sentences = message.match(/[^.!?]+[.!?]+/g) || [];
  let lesson = '';

  for (let i = 0; i < sentences.length; i++) {
    if (isCorrectionSentence(sentences[i])) {
      lesson = sentences[i].trim();
      // Include next sentence if it clarifies
      if (i + 1 < sentences.length && sentences[i + 1].length < 100) {
        lesson += ' ' + sentences[i + 1].trim();
      }
      break;
    }
  }

  return lesson.slice(0, 200); // Hard cap at 200 chars
}

function generateDedupKey(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .slice(0, 60)
    .trim();
}

function categorizeLesson(lesson: string, triggerType: string): MemoryCategory {
  if (/never|always|must not|do not/i.test(lesson)) return 'invariant';
  if (/because|root cause|the reason/i.test(lesson)) return 'root_cause';
  if (/pattern|usually|typically|convention/i.test(lesson)) return 'pattern';
  if (/prefer|like|instead of|rather/i.test(lesson)) return 'preference';
  if (/decided|choose|went with/i.test(lesson)) return 'decision';
  if (/workflow|process|steps? to/i.test(lesson)) return 'workflow';
  if (/error|fix|if you see|when.*happens/i.test(lesson)) return 'error_recovery';
  return 'correction';
}

function calculateInitialImportance(lesson: string, triggerType: string): number {
  let score = 0.5;
  if (triggerType === 'userCorrection') score += 0.2;
  if (triggerType === 'explicit') score += 0.15;
  if (/never|always|critical|important|must/i.test(lesson)) score += 0.15;
  if (/git clean|destructive|delete|wipe/i.test(lesson)) score += 0.2; // High-stakes
  return Math.min(1.0, score);
}
```

---

## 5. INJECTION MECHANISM (Auto-Load)

### 5.1 New Layer in Context Assembly

```typescript
// src/services/ContextService.ts — ADD after Layer 2

// LAYER 2.5: HOT MEMORIES (auto-loaded critical lessons)
// This layer sits between STATE and PATTERNS so the agent sees it early
async function injectMemoryLayer(
  projectPath: string, 
  config: ContextConfig,
  opts?: AssembleOptions
): Promise<string> {

  if (!config.deep_memory?.enabled) return '';

  const tierConfig = config.deep_memory.hot;
  const maxTokens = tierConfig.max_tokens;

  // Fetch HOT memories from DB
  const memories = await memoryStore.getHotMemories(tierConfig.max_entries);

  if (memories.length === 0) return '';

  // Format as compact directive list
  const formatted = formatMemoriesForPrompt(memories, maxTokens);

  // Update access counts (fire-and-forget)
  memoryStore.bumpAccessCounts(memories.map(m => m.id));

  return `[LAYER 2.5 — CRITICAL MEMORIES (auto-loaded)]\n${formatted}\n`;
}

function formatMemoriesForPrompt(memories: MemoryEntry[], maxTokens: number): string {
  let output = 'You MUST remember these lessons from past sessions:\n';
  let tokenCount = estimateTokens(output);

  for (const memory of memories) {
    const line = `• [${memory.category.toUpperCase()}] ${memory.content}\n`;
    const lineTokens = estimateTokens(line);

    if (tokenCount + lineTokens > maxTokens) break;

    output += line;
    tokenCount += lineTokens;
  }

  return output;
}
```

### 5.2 Integration Point in assembleContext()

```typescript
// In ContextService.ts assembleContext():

// LAYER 0: RULES COMPACT (always injected)
// ... existing ...

// LAYER 1: STATE SNAPSHOT (always injected)
// ... existing ...

// LAYER 2.5: HOT MEMORIES ← NEW
const memoryLayer = await injectMemoryLayer(projectPath, config, opts);
if (memoryLayer) {
  forceAdd(memoryLayer); // Always inject, but respect token budget
}

// LAYER 2: PATTERNS & CONVENTIONS
// ... existing ...
```

### 5.3 opencode.json Update

```json
{
  "instructions": [
    "AGENTS.md",
    "agent/DEFAULT_SYSTEM_PROMPT.md",
    "agent/GENERAL_ADDITIONS.md",
    "agent/dictionary.md",
    "agent/state.md",
    "agent/MEMORY.md"
  ]
}
```

**Note:** `MEMORY.md` is added as a fallback. The system prompt (DEFAULT_SYSTEM_PROMPT.md) is updated to tell the agent that memories are auto-loaded and it should emit `[save-memory]` tags.

---

## 6. COMPACTION & DECAY ENGINE

### 6.1 Compaction Algorithm

Runs every 10 messages or on demand. Promotes/demotes memories between tiers.

```typescript
// src/main/ai/memoryCompaction.ts

export async function compactMemories(config: DeepMemoryConfig): Promise<CompactionResult> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Apply decay to all memories
  await db.prepare(`
    UPDATE agent_memories 
    SET importance = MAX(0.1, importance - (decay_rate * ((? - last_accessed_at) / ?)))
    WHERE tier != 'cold'
  `).run(now, dayMs);

  // 2. Recalculate tiers
  const allMemories = await db.prepare('SELECT * FROM agent_memories WHERE tier != "cold"').all();

  for (const memory of allMemories) {
    const newTier = recalcTier(memory.importance, memory.access_count, config);
    if (newTier !== memory.tier) {
      await db.prepare('UPDATE agent_memories SET tier = ? WHERE id = ?').run(newTier, memory.id);
    }
  }

  // 3. Enforce tier caps (promote best, demote rest)
  await enforceTierCap('hot', config.hot.max_entries);
  await enforceTierCap('warm', config.warm.max_entries);

  // 4. Archive stale memories to cold
  const staleThreshold = now - (config.cold.auto_archive_after_days * dayMs);
  await db.prepare(`
    UPDATE agent_memories 
    SET tier = 'cold' 
    WHERE tier = 'warm' AND created_at < ? AND importance < ?
  `).run(staleThreshold, config.scoring.stale_threshold);

  return { promoted: 0, demoted: 0, archived: 0 };
}

function recalcTier(importance: number, accessCount: number, config?: DeepMemoryConfig): MemoryTier {
  const hotMin = config?.hot?.min_importance ?? 0.7;
  const warmMin = config?.warm?.min_importance ?? 0.4;

  // Access count can boost tier
  const accessBoost = Math.min(0.15, accessCount * 0.02);
  const effectiveImportance = importance + accessBoost;

  if (effectiveImportance >= hotMin) return 'hot';
  if (effectiveImportance >= warmMin) return 'warm';
  return 'cold';
}

async function enforceTierCap(tier: MemoryTier, maxEntries: number) {
  const count = await db.prepare('SELECT COUNT(*) as count FROM agent_memories WHERE tier = ?').get(tier);
  if (count.count <= maxEntries) return;

  // Demote lowest-importance memories
  const toDemote = await db.prepare(`
    SELECT id FROM agent_memories 
    WHERE tier = ? 
    ORDER BY importance ASC, last_accessed_at ASC 
    LIMIT ?
  `).all(tier, count.count - maxEntries);

  const newTier = tier === 'hot' ? 'warm' : 'cold';
  for (const row of toDemote) {
    await db.prepare('UPDATE agent_memories SET tier = ? WHERE id = ?').run(newTier, row.id);
  }
}
```

### 6.2 Schedule

```typescript
// In main process startup:

// Compact every 30 minutes
setInterval(() => compactMemories(getCurrentTierConfig()), 30 * 60 * 1000);

// Also compact after every memory capture (debounced)
let compactionTimeout: NodeJS.Timeout;
function scheduleCompaction() {
  clearTimeout(compactionTimeout);
  compactionTimeout = setTimeout(() => compactMemories(getCurrentTierConfig()), 5000);
}
```

---

## 7. IPC ENDPOINTS

### 7.1 New IPC Channels

```typescript
// preload.ts — add to contextBridge.exposeInMainWorld

memory: {
  // Get memories for a tier (for sidebar display)
  getMemories: (tier: MemoryTier, limit?: number) => 
    ipcRenderer.invoke('memory:get', tier, limit),

  // Search cold storage
  searchMemories: (query: string) => 
    ipcRenderer.invoke('memory:search', query),

  // Manual add (for user UI)
  addMemory: (content: string, category: MemoryCategory) => 
    ipcRenderer.invoke('memory:add', content, category),

  // Delete/archive a memory
  deleteMemory: (id: string) => 
    ipcRenderer.invoke('memory:delete', id),

  // Get memory stats
  getStats: () => 
    ipcRenderer.invoke('memory:stats'),

  // Force compaction
  compact: () => 
    ipcRenderer.invoke('memory:compact'),
}

// main.ts — handlers
ipcMain.handle('memory:get', async (_, tier: MemoryTier, limit = 50) => {
  return db.prepare('SELECT * FROM agent_memories WHERE tier = ? ORDER BY importance DESC LIMIT ?')
    .all(tier, limit);
});

ipcMain.handle('memory:search', async (_, query: string) => {
  return db.prepare(`
    SELECT * FROM agent_memories 
    WHERE content LIKE ? OR dedup_key LIKE ?
    ORDER BY importance DESC LIMIT 20
  `).all(`%${query}%`, `%${query}%`);
});

ipcMain.handle('memory:add', async (_, content: string, category: MemoryCategory) => {
  return captureMemoryFromMessage(content, 'user', 'manual-ui', undefined);
});

ipcMain.handle('memory:delete', async (_, id: string) => {
  db.prepare('DELETE FROM agent_memories WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('memory:stats', async () => {
  return db.prepare(`
    SELECT 
      tier,
      COUNT(*) as count,
      AVG(importance) as avg_importance,
      MAX(created_at) as latest
    FROM agent_memories 
    GROUP BY tier
  `).all();
});

ipcMain.handle('memory:compact', async () => {
  return compactMemories(getCurrentTierConfig());
});
```

---

## 8. UI / SIDEBAR INTEGRATION

### 8.1 ContextMaintenanceTab Extension

```typescript
// src/components/sidebar/ContextMaintenanceTab.tsx — ADD section

import { useState, useEffect } from 'react';

export function MemoryStatusPanel() {
  const [stats, setStats] = useState<any>(null);
  const [hotMemories, setHotMemories] = useState<MemoryEntry[]>([]);

  useEffect(() => {
    window.memory.getStats().then(setStats);
    window.memory.getMemories('hot', 20).then(setHotMemories);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200">🧠 Agent Memory</h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {stats?.map((s: any) => (
          <div key={s.tier} className={`p-2 rounded ${
            s.tier === 'hot' ? 'bg-red-900/30 border border-red-700' :
            s.tier === 'warm' ? 'bg-amber-900/30 border border-amber-700' :
            'bg-slate-800 border border-slate-700'
          }`}>
            <div className="font-bold capitalize">{s.tier}</div>
            <div className="text-lg">{s.count}</div>
            <div className="text-slate-400">avg: {(s.avg_importance * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>

      {/* Hot memories preview */}
      <div className="space-y-1">
        <div className="text-xs text-slate-400 uppercase tracking-wider">In Prompt Now</div>
        {hotMemories.map(m => (
          <div key={m.id} className="text-xs p-2 bg-slate-800/50 rounded border-l-2 border-red-500">
            <span className="text-red-400 font-medium">[{m.category}]</span>{' '}
            <span className="text-slate-300">{m.content}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button 
          onClick={() => window.memory.compact()}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
        >
          Compact Now
        </button>
        <button 
          onClick={() => window.memory.getMemories('warm', 50)}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
        >
          View Warm
        </button>
      </div>
    </div>
  );
}
```

---

## 9. MIGRATION & BOOTSTRAP

### 9.1 One-Time Migration

```typescript
// src/main/migrations/memoryMigration.ts

export async function bootstrapMemorySystem() {
  // 1. Create table
  await db.exec(`
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
  `);

  // 2. Import existing MEMORY.md entries
  const memoryMd = await readProjectFile('agent/MEMORY.md');
  const lines = memoryMd.split('\n').filter(l => l.trim().startsWith('- ['));

  for (const line of lines) {
    const content = line.replace(/^- \[.*?\]\s*/, '').trim();
    if (content.length < 10) continue;

    await captureMemoryFromMessage(content, 'user', 'migration', undefined);
  }

  // 3. Import COMMON_ERRORS_FIXED.md
  const errorsMd = await readProjectFile('agent/COMMON_ERRORS_FIXED.md');
  // Parse ## Entry N — Title format
  const entries = errorsMd.split(/## Entry \d+/).slice(1);
  for (const entry of entries) {
    const lines = entry.split('\n').filter(l => l.trim());
    const prevention = lines.find(l => l.startsWith('Prevention:'));
    if (prevention) {
      await captureMemoryFromMessage(prevention, 'user', 'migration', undefined);
    }
  }

  // 4. Import agent-reflect/problem.md rules
  const rulesMd = await readProjectFile('agent/skills/agent-reflect/problem.md');
  const rules = rulesMd.split('\n').filter(l => /^\d+\./.test(l.trim()));
  for (const rule of rules) {
    await captureMemoryFromMessage(rule, 'user', 'migration', undefined);
  }

  // 5. Import reflection logs (parse titles for lessons)
  // ... iterate log files ...
}
```

### 9.2 Updated DEFAULT_SYSTEM_PROMPT.md §4

```markdown
## 4. Memory discipline (anti-amnesia) — AUTO-LOADED
Critical lessons from past sessions are injected automatically into your prompt 
under [LAYER 2.5 — CRITICAL MEMORIES]. You do NOT need to read MEMORY.md manually.

To SAVE a new memory, emit this exact format anywhere in your response:
  [save-memory] <scope> | <tags> | <lesson>
Example:
  [save-memory] build | tailwind,v4 | NEVER use v3 directives in v4 projects

The system will capture, score, and inject it automatically. You do not need 
to append to MEMORY.md directly.

DO NOT emit [save-memory] for trivial or one-off items. Only for:
- Corrections CZ/Architect made
- Non-obvious root causes you discovered
- Confirmed invariants ("NEVER X", "ALWAYS Y")
- Recurring patterns that caused bugs
```

---

## 10. DATA FLOW SUMMARY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERACTION                                │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│ User corrects   │────▶│ Capture Engine   │────▶│ Deduplicate & Score     │
│ agent:          │     │ (memoryCapture.ts)│     │ (memoryExtractor logic) │
│ "You idiot,     │     │ • Pattern match  │     │ • Check dedup_key       │
│  I told you X"  │     │ • Extract lesson │     │ • Calculate importance  │
└─────────────────┘     └──────────────────┘     └───────────┬─────────────┘
                                                            │
                              ┌─────────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  SQLite DB       │
                    │  agent_memories  │
                    │  table           │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ HOT (in prompt) │  │ WARM (sidebar)   │  │ COLD (archive)  │
│ Max 20 entries  │  │ Max 60 entries   │  │ Unlimited       │
│ Auto-injected   │  │ Searchable       │  │ Search on demand│
│ into Layer 2.5  │  │ into prompt      │  │                 │
└─────────────────┘  └──────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT PROMPT ASSEMBLY                              │
│  [LAYER 0] Rules Compact                                                     │
│  [LAYER 1] State Snapshot                                                    │
│  [LAYER 2.5] HOT MEMORIES ← NEW (auto-loaded)                              │
│  [LAYER 2] Patterns & Conventions                                           │
│  [LAYER 3+] Other systems (wiki, skills, etc.)                               │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Agent reads      │
│ prompt, sees     │
│ memories, acts    │
│ accordingly       │
└─────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Agent emits:     │────▶│ Capture Engine   │
│ [save-memory]    │     │ picks it up      │
│ scope|tags|lesson│     │ (explicit trigger)│
└─────────────────┘     └──────────────────┘
```

---

## 11. FILES TO CREATE / MODIFY

### New Files
| File | Purpose |
|------|---------|
| `src/types/memory.ts` | Type definitions |
| `src/main/ai/memoryCapture.ts` | Auto-capture engine |
| `src/main/ai/memoryCompaction.ts` | Tier management & decay |
| `src/main/ai/memoryStore.ts` | DB abstraction layer |
| `src/main/migrations/memoryMigration.ts` | One-time bootstrap |
| `src/components/sidebar/MemoryStatusPanel.tsx` | Sidebar UI |

### Modified Files
| File | Change |
|------|--------|
| `opencode.json` | Add `agent/MEMORY.md` to instructions |
| `agent/DEFAULT_SYSTEM_PROMPT.md` | Update §4 with [save-memory] protocol |
| `src/services/ContextConfig.ts` | Expand deep_memory config with hot/warm/cold |
| `src/services/ContextService.ts` | Add Layer 2.5 memory injection |
| `src/main/preload.ts` | Add memory IPC channels |
| `src/main/main.ts` | Register memory IPC handlers |
| `src/main/ai/memoryExtractor.ts` | Extend categories for agent context |
| `src/components/sidebar/ContextMaintenanceTab.tsx` | Add MemoryStatusPanel |

---

## 12. TOKEN BUDGET ANALYSIS

| Tier | Total Budget | Hot Memory Budget | Hot Entries | Avg Tokens/Entry |
|------|-------------|-------------------|-------------|------------------|
| Low  | 4,000       | 800               | 10          | 80               |
| Mid  | 7,000       | 1,200             | 15          | 80               |
| Top  | 10,000      | 2,000             | 20          | 100              |

Each memory is capped at 200 characters ≈ 50 tokens. With formatting overhead, budget is conservative.

---

## 13. EDGE CASES & SAFEGUARDS

1. **Duplicate storm:** If user repeats same correction 10x, importance caps at 1.0, access count tracks but doesn't unboundedly grow.
2. **Token overflow:** If hot memories exceed budget, lowest-importance entries are dropped from prompt (not deleted from DB).
3. **DB corruption:** Preferences fallback stores last-known-good state.
4. **Privacy:** Original correction messages are truncated to 500 chars and stored locally only.
5. **Agent type compatibility:** The `[save-memory]` emission format is plain text — works with opencode, Claude, Codex, Gemini.
6. **Empty DB:** System gracefully degrades — no memory layer injected, no errors.

---

*End of Design Document*
