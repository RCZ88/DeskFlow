# CONTEXT_BUNDLE — Research Digest Overhaul

> Self-contained reference for the target AI. All relevant code, data shapes, and architecture are documented here.

---

## 1. File Map

| File | Role |
|------|------|
| `src/components/ai/types.ts` | `TopicDigestItem` type (lines 60-80) — extended with new fields |
| `src/components/ai/digest/DailyDigestBoard.tsx` | Main digest UI — GlassCard with collapsible topic cards |
| `src/components/ai/chat/renderers/DigestTopicCard.tsx` | Chat message renderer for digest_item type |
| `src/components/ai/chat/parsed.ts` | Parsed message types — `digest_item` variant |
| `src/main.ts` lines 2011-2033 | DB schema: `ai_briefs` (cache) + `ai_interests` (topics) |
| `src/main.ts` lines 12812-13050 | IPC handler: `get-topic-digest`, generation orchestration |
| `src/main.ts` lines 13052-13078 | IPC CRUD: interest topics |
| `src/services/AIService.ts` lines 130-158 | Legacy OpenRouter digest generation |
| `src/preload.ts` lines 187-199 | IPC bridge: digest endpoints |
| `src/pages/AiPage.tsx` lines 55-58, 80-84, 120-129, 161-194 | Consumer: loads digest, polls, passes to DailyDigestBoard |
| `src/components/ai/StateShell.tsx` | 4-state handler (loading/empty/error/ready) used by digest |
| `src/components/ai/deck/AiPageDeck.tsx` | Deck layout holding digestSlot |

---

## 2. Data Type (current — already expanded with new fields)

`src/components/ai/types.ts` lines 60-80:

```typescript
export interface TopicDigestItem {
  topic: string
  headline?: string
  summary: string
  date?: string
  confidence?: number
  source?: {
    name: string
    url: string
    authority: "high" | "medium" | "low"
  }
  stats?: {
    label: string
    value: string | number
    change?: number
    trend?: "up" | "down" | "flat"
  }
  tags?: string[]
  mentions?: number
  sources?: { title: string; url: string }[]
}
```

---

## 3. DailyDigestBoard.tsx — Current Implementation

**Props:** `state: DataState`, `topics: TopicDigestItem[]`, `generating?`, `provider?`, `readyToGenerate?`, `onRefresh`, `onConfigure`, `onGenerate`, `errorMessage?`

**Structure:** GlassCard (cyan accent) → SectionHead (hero, title "Daily Digest") → StateShell (4 states)

**TopicCard (inline, lines 137-179):**
- Collapsible with topic name header + source count badge
- On expand: summary text + source list with URLs
- Uses: `Collapsible`, `Skeleton`, `StateShell` from ai component library

---

## 4. DigestTopicCard.tsx — Chat Renderer

**Props:** `topic`, `summary`, `sources?`, `onAction?`

**Structure:** CardShell with title, badge "digest_topic", icon "📰", subtitle "Daily digest"
- Shows summary text
- Collapsible source list with open-url buttons

---

## 5. Digest Generation — IPC Handler (main.ts)

**Flow:**
1. Query `ai_interests WHERE enabled=1` → topic names[]
2. Check `ai_briefs WHERE type='topic' AND date=today` cache
3. **Path A — Provider Chain:** `buildChain(pState, 'researchDigest')` → `runWithFallback(chain, { systemPrompt, messages, maxTokens:2000, temperature:0.4 })`
4. **Path B — Legacy OpenRouter:** `AIService.generateTopicDigest(apiKey, {topics, today}, model, maxTokens)` with retry loop
5. Parse: `cleanDigestJson()` → strip code fences, BOM, extract brackets
6. Cache: `INSERT OR REPLACE ai_briefs`
7. Broadcast: `digest-generation-complete` event
8. Return: `{ success, topics: TopicDigestItem[] }`

**Current system prompt (main.ts line 12860) — already updated:**
```
Output a JSON array of research digests. Today is ${today}.
Each item must follow this schema:
{"topic":"exact topic name","headline":"News-style headline","summary":"2-3 paragraph detailed summary with specific data points","date":"ISO date or 'recent'","confidence":0.0-1.0,"source":{"name":"domain","url":"URL","authority":"high|medium|low"},"stats":{"label":"metric","value":number,"change":percentage,"trend":"up|down|flat"},"tags":["breaking|analysis|trending|update"],"mentions":number,"sources":[{"title":"article","url":"URL"}]}
Required: topic, headline, summary, date. Optional: confidence, source, stats, tags, mentions, sources.
Never fabricate. Include numerical data when available.
Respond with ONLY the JSON array. No markdown, no code fences, no preamble.
```

**Legacy prompt (AIService.ts line 135) — already updated:**
```
Output JSON array. Each item: {"topic":"name","headline":"Headline","summary":"1-2 paragraph summary with data","date":"ISO date or recent","confidence":0.0-1.0,"source":{"name":"domain","url":"URL","authority":"high|medium|low"},"stats":{"label":"metric","value":number,"change":number,"trend":"up|down|flat"},"tags":["tag"],"sources":[{"title":"title","url":"URL"}]}. Required: topic, headline, summary, date. Never fabricate. Include numbers when available. Only JSON, no markdown.
```

---

## 6. DB Schema

```sql
-- ai_briefs: digest cache
CREATE TABLE IF NOT EXISTS ai_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  content TEXT,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(type, date)
);

-- ai_interests: user's interest topics
CREATE TABLE IF NOT EXISTS ai_interests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);
```

---

## 7. IPC Endpoints

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `get-topic-digest` | renderer→main | `{force?: boolean}` | Generate or fetch cached digest |
| `is-digest-generating` | renderer→main | none | Poll in-progress status |
| `digest-generation-complete` | main→renderer | `{success, topics}` | Event when generation finishes |
| `get-interest-topics` | renderer→main | none | Get all enabled topics |
| `add-interest-topic` | renderer→main | `topic: string` | Add new interest topic |
| `remove-interest-topic` | renderer→main | `topic: string` | Remove interest topic |
| `get-ai-config` | renderer→main | none | Get AI config including model |
| `save-ai-config` | renderer→main | `{digestModel?, ...}` | Save AI config |

---

## 8. AiPage.tsx — Consumer Pattern

```typescript
// Lines 55-58
const [digestTopics, setDigestTopics] = useState<any[]>([]);
const [digestState, setDigestState] = useState<DataState>('loading');
const [digestReason, setDigestReason] = useState<string | null>(null);
const digestPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

// Lines 120-129: loadDigest function — calls getTopicDigest IPC
// Lines 161-194: on mount + polling logic + digest-generation-complete listener

// Lines 383-394: passes digestSlot to AiPageDeck
<DailyDigestBoard
  state={digestDataState}
  topics={digestTopics}
  generating={digestGenerating}
  provider={providerBadge}
  readyToGenerate={digestTopics.length === 0 && !digestReason}
  onRefresh={() => loadDigest(true, true)}
  onConfigure={() => navigate('/settings')}
  onGenerate={() => loadDigest(true, true)}
  errorMessage={digestReason || undefined}
/>
```

---

## 9. Design Tokens (from GlassCard, StateShell, tokens.ts)

```
--bg-primary: #09090b
--accent-primary: cyan (#22d3ee)
GlassCard: bg-zinc-900/80 backdrop-blur-xl, rounded-xl, ring-1 ring-zinc-800
SectionHead: hero variant with larger title, icon, right actions
StateShell: handles loading (skeletons), empty (icon+title+message+cta), error (message+retry), ready (children)
```

---

## 10. Current UI Issues (user feedback verbatim)

1. "Too many drop downs" — every topic is behind a Collapsible
2. "List of keywords" — just topic name + text summary, not visually interesting
3. "No source whatsoever" — sources are often empty
4. "No date" — no publication date shown
5. "Not convincing — just plain text" — no images, charts, or rich data
6. "Not interesting" — presentation is not engaging
7. "Needs numerical data" — percentages, counts, growth rates
8. "Data oriented" — numbers and data rather than just text
9. "Like The Browser newsletter" — terminal-style news digest as reference
