# CONTEXT_BUNDLE.md — AI Assistant Full Rebuild

> This file contains ALL source code, types, IPC endpoints, and architecture notes
> needed to redesign the AI Assistant chat system. The target AI must read this first.

---

## 1. Architecture Overview

```
AiPage.tsx (route: /ai)
  └─ AiPageDeck.tsx (layout: topbar + chat + expandable cards)
       ├─ ChatPanel.tsx (message list + input + thinking indicator)
       │    ├─ ChatEmptyState.tsx (greeting + suggestion chips)
       │    ├─ MessageBubble.tsx (user/assistant bubbles + markdown + parsed cards)
       │    │    ├─ TypewriterText.tsx (streaming text reveal)
       │    │    ├─ ParsedMessageRouter.tsx (routes parsed type → renderer)
       │    │    │    ├─ GoalSuggestionCard.tsx (Accept/Dismiss)
       │    │    │    ├─ PlanUpdateCard.tsx (animated diff)
       │    │    │    ├─ StatsSummaryCard.tsx (metric grid)
       │    │    │    ├─ ActionListCard.tsx (action buttons + confirmation)
       │    │    │    ├─ DigestTopicCard.tsx (collapsible topic)
       │    │    │    ├─ ConnectorStatusCard.tsx (status grid)
       │    │    │    ├─ FormFillCard.tsx (inline form)
       │    │    │    ├─ ChartDataCard.tsx (chart)
       │    │    │    └─ ErrorCard.tsx (error with retry)
       │    │    └─ parsed.ts (type definitions + parseAssistantContent)
       │    ├─ ThinkingIndicator.tsx (3-dot pulse during inference)
       │    ├─ ChatInput.tsx (textarea + slash commands + voice + history)
       │    ├─ SlashCommandPalette.tsx (command dropdown)
       │    ├─ AgentProgressBar.tsx (tool progress)
       │    └─ CharCountRing.tsx
       ├─ ExpandableCard (Daily Digest, Connectors, Focus, Plan, Reflect)
       └─ deck.css (all styling)
```

## 2. Data Flow

```
User types → ChatInput.onChange → useAiChat.setInput
User sends → useAiChat.send()
  → buildContextBundleDetailed() (system prompt with app data)
  → provider-chat-call IPC → streaming chunks via onProviderChunk
  → parseAssistantContent() → detect parsed_json → render via ParsedMessageRouter
  → persist() → ai-chat:save IPC → SQLite (ai_chat_messages + ai_chat_threads)
  → extractMemories() → ai-chat:extract-memories IPC
```

## 3. IPC Endpoints (ALL EXIST AND WORK)

### Chat System
| Channel | Handler Location | Purpose |
|---------|-----------------|---------|
| `provider-chat-call` | main.ts:14507 | Streaming AI call with onChunk callback |
| `provider-chat-basic` | main.ts:14527 | Non-streaming AI call |
| `ai-chat:save` | main.ts:14798 | Save thread messages to SQLite |
| `ai-chat:load` | main.ts:14789 | Load thread messages from SQLite |
| `ai-chat:reset` | main.ts:14833 | Delete thread messages |
| `ai-chat:list-threads` | main.ts:14883 | List all threads with metadata |
| `ai-chat:get-memories` | main.ts:14925 | Get memories for a thread |
| `ai-chat:extract-memories` | main.ts:14960 | Extract memories from conversation |

### Provider System
| Channel | Handler Location | Purpose |
|---------|-----------------|---------|
| `get-ai-providers` | main.ts:14410 | Get all providers + routing config |
| `test-ai-provider` | main.ts:14483 | Test a provider with a ping message |
| `set-ai-providers` | main.ts:14440 | Save provider config |

### App Data (for context bundle)
| Channel | Purpose |
|---------|---------|
| `getGoals` | Get today's goals |
| `saveGoal` | Create/update goal |
| `suggestGoals` | AI suggests goals |
| `getLongtermGoals` | Get long-term goals |
| `getDashboardAggregates` | Today's usage stats |
| `getAIUsageSummary` | AI token/cost usage |
| `getProjects` | Active projects |
| `getTopicDigest` | Daily digest topics |
| `connectors:list` | List connectors |
| `connectors:sync` | Sync a connector |

## 4. Types (parsed.ts — FULL)

```ts
export type ParsedMessage =
  | { type: "text"; text?: string }
  | { type: "goal_suggestion"; goals: ParsedGoal[]; source?: string }
  | { type: "plan_update"; changes: PlanChange[]; note?: string }
  | { type: "stats_summary"; metrics: StatMetric[]; period?: string }
  | { type: "action_list"; actions: ActionItem[]; note?: string }
  | { type: "digest_item"; topic: string; summary: string; sources?: SourceLink[] }
  | { type: "connector_status"; connectors: ConnectorStatusItem[] }
  | { type: "form_fill"; title?: string; submitLabel?: string; fields: FormField[] }
  | { type: "chart_data"; chartType: "bar"|"line"|"pie"; labels: string[]; datasets: ChartDataset[]; title?: string }
  | { type: "error"; message: string; recovery?: string }

export type CardAction =
  | { kind: "accept-goal"; goal: ParsedGoal }
  | { kind: "dismiss-goal"; goal: ParsedGoal }
  | { kind: "apply-plan"; changes: PlanChange[] }
  | { kind: "run-ipc"; ipc: string; payload?: Record<string, unknown>; label?: string }
  | { kind: "submit-form"; values: Record<string, string | number | boolean> }
  | { kind: "sync-connector"; id?: string; name: string }
  | { kind: "open-url"; url: string }
  | { kind: "retry" }
  | { kind: "send-text"; text: string }
```

## 5. Design Tokens (tokens.ts)

```ts
export const SURFACE = {
  base: "bg-zinc-950",
  card: "bg-zinc-900/40",
  cardHi: "bg-zinc-900/60",
  inset: "bg-zinc-950/60",
}

export const TEXT = {
  primary: "text-zinc-100",
  secondary: "text-zinc-400",
  muted: "text-zinc-500",
  disabled: "text-zinc-600",
}

export const ACCENT = {
  pink:    { hex: "#f472b6", pill: "bg-pink-500/10 text-pink-300 ring-pink-500/20" },
  emerald: { hex: "#10b981", pill: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20" },
  amber:   { hex: "#f59e0b", pill: "bg-amber-500/10 text-amber-300 ring-amber-500/20" },
  violet:  { hex: "#a78bfa", pill: "bg-violet-500/10 text-violet-300 ring-violet-500/20" },
  red:     { hex: "#f87171", pill: "bg-red-500/10 text-red-300 ring-red-500/20" },
  cyan:    { hex: "#22d3ee", pill: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/20" },
}
```

## 6. Current CSS (deck.css — relevant sections)

```css
/* Chat stream container */
.dk-stream {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  scroll-behavior: smooth;
}

/* Messages */
.dk-msg {
  display: flex;
  gap: 12px;
  max-width: 92%;
  animation: msgEnter 0.25s ease-out;
}
.dk-msg.dk-user { align-self: flex-end; flex-direction: row-reverse; margin-left: auto; }
.dk-msg.dk-ai { align-self: flex-start; margin-right: auto; }

/* Bubble */
.dk-bubble {
  font-size: 14px;
  line-height: 1.6;
  color: var(--tp);
  word-break: break-word;
}
.dk-msg.dk-user .dk-bubble {
  background: var(--raised);
  border: 1px solid var(--line-2);
  padding: 11px 16px;
  border-radius: 16px 16px 4px 16px;
  color: #f4f4f5;
}
.dk-msg.dk-ai .dk-bubble { padding-top: 2px; color: rgba(250,250,250,.88); }
```

## 7. What's Currently Broken

1. **No `<thought>` tag parsing** — AI outputs `<thought>...</thought>` for reasoning but it renders as raw text
2. **MessageBubble renders markdown inline** but has no container for thought sections
3. **ThinkingIndicator only shows during `thinking` state** — disappears when streaming starts
4. **No permission/approval UI** — action buttons fire immediately (partially fixed with confirmation)
5. **Chat scroll is broken** — dk-root overflow: hidden blocks scrolling (partially fixed)
6. **Session history not saving** — list-threads return format mismatch (partially fixed)
7. **No markdown rendering for streaming** — TypewriterText shows raw text during streaming

## 8. Provider Call Chain

```
useAiChat.send()
  → bridge().providerChatCall({ provider, messages, model })
  → preload.ts: ipcRenderer.invoke('provider-chat-call', data)
  → main.ts:14507 handler calls callProvider()
  → services/providers/callProvider.ts: builds HTTP request with auth headers
  → Streams chunks via event.sender.send('provider-chunk', { delta })
  → preload.ts: onProviderChunk callback → useAiChat chunk handler
  → Accumulates full text → parseAssistantContent() → finish()
```

## 9. Database Schema (SQLite)

```sql
-- Chat threads
CREATE TABLE ai_chat_threads (
  thread_date TEXT PRIMARY KEY,
  title TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at INTEGER,
  preview TEXT,
  updated_at INTEGER
);

-- Chat messages
CREATE TABLE ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_date TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  parsed_json TEXT,
  created_at TEXT,
  FOREIGN KEY (thread_date) REFERENCES ai_chat_threads(thread_date)
);

-- Chat memories
CREATE TABLE ai_chat_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_date TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TEXT
);
```
