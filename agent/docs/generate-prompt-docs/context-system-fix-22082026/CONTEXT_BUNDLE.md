# CONTEXT_BUNDLE.md — Context System Fix

> VERBATIM source code for all broken subsystems.

---

## 1. memoryRetrieval.ts (FULL FILE — 32 lines)

```typescript
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
```

**BUG:** Called with `getRelevantMemories(db, '', queryTopic, 3)` from assemble-context (main.ts:15270). Empty threadDate means `WHERE thread_date = ?` matches nothing.

---

## 2. memoryCapture.ts (lines 1-50)

```typescript
const CAPTURE_TRIGGERS = {
  explicit: /\[save-memory\]\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)/i,
  userCorrection: [
    /(?:you idiot|i told you|i already told you|no,? that's wrong|incorrect|you forgot|you keep|stop doing|never do|always do)/i,
    /(?:i said|i already said|as i mentioned|like i said|remember that|don't forget)/i,
    /(?:wrong|incorrect|not right|that's not|should be|needs to be|must be)/i,
  ],
  selfReflect: /(?:i made a mistake|i was wrong|i forgot|i should have|next time i will|lesson learned)/i,
};
```

**BUG:** Only triggers on "you idiot", "wrong", "stop doing". Normal conversation never captures. Result: 0 rows in agent_memories.

---

## 3. entityExtraction.ts (lines 1-60)

```typescript
function parseExtractionJson(text: string): ExtractionResult | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : [],
    }
  } catch {
    return null
  }
}
```

**BUG:** LLM returns non-JSON, parseExtractionJson returns null, job marked 'failed'. 46/47 jobs failed.

---

## 4. assemble-context Budget (main.ts:15399-15404)

```typescript
const budget = data.tokenBudget || 2000;  // ONLY 2000 tokens
const maxChars = budget * 4;               // 8000 chars for EVERYTHING
```

**BUG:** 8000 chars shared across 8+ sources. Brain/memory get scraps.

---

## 5. assemble-context caller (main.ts:15270)

```typescript
const chatMemories = memoryRetrieval.getRelevantMemories(db, '', queryTopic, 3);
//                                                        ^^ empty string = bug
```

---

## 6. Brain keywordSearch (contextBrain.ts)

```typescript
export function keywordSearch(query: string, limit: number = 10) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return []
  // LIKE %word% on episodes, entities, facts
}
```

**BUG:** Generic queries like "Quick instruction" → words ["quick", "instruction"] → LIKE %quick% matches nothing.

---

## 7. Episode writers missing extraction

writeFinanceEpisode, writeTerminalEpisode, writeAiChatEpisode do NOT call brain.createExtractionJob(epId). Only writeGoalEpisode, writeDeadlineEpisode, writeLifePhaseEpisode, writeLearnEpisode queue extraction.
