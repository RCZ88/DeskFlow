# CONTEXT_BUNDLE.md — Parsed AI Response → Canvas Card Bridge

## Problem

When the AI responds with structured JSON (e.g., `goal_suggestion`, `plan_update`, `stats_summary`), the parsing system correctly extracts it and renders an inline card in the chat transcript. But **no canvas card is created**. The useEffect in AiPage.tsx skips structured responses entirely (line 178: `if (!isStructured)`). The two systems are architecturally disconnected.

## Source Code

### src/types/canvas.ts (full file — 110 lines):

```typescript
export type CardType =
  | 'focus' | 'plan' | 'reflect' | 'finance'
  | 'digest' | 'approval' | 'transient' | 'annotation'
  | 'response' | 'group' | 'connectors'

export type CardStatus = 'live' | 'stale' | 'error' | 'loading'

export interface CanvasCard {
  id: string
  type: CardType
  position: { x: number; y: number }
  size: { w: number; h: number }
  zIndex: number
  pinned: boolean
  data: Record<string, any>
  source: 'ai' | 'user' | 'system'
  status: CardStatus
  createdAt: number
  dismissedAt?: number
}
```

### src/components/ai/chat/parsed.ts (lines 1-94 — types and interfaces):

```typescript
export interface ParsedGoal {
  title: string
  category?: string
  reason?: string
  priority?: number
}

export interface PlanChange {
  action: "add" | "modify" | "complete"
  goal: { title: string; priority?: number; category?: string }
}

export interface StatMetric {
  label: string
  value: number
  change?: number
  icon?: string
  format?: "number" | "duration" | "percent" | "hours"
}

export interface ActionItem {
  label: string
  description?: string
  priority?: number
  actionButton?: { label: string; ipc: string; payload?: Record<string, unknown> }
}

export interface ConnectorStatusItem {
  name: string
  status: "connected" | "error" | "syncing" | "idle" | string
  lastSync?: string
  itemsCount?: number
  id?: string
}

export type ParsedMessage =
  | { type: "text"; text?: string }
  | { type: "goal_suggestion"; goals: ParsedGoal[]; source?: string }
  | { type: "plan_update"; changes: PlanChange[]; note?: string }
  | { type: "stats_summary"; metrics: StatMetric[]; period?: string }
  | { type: "action_list"; actions: ActionItem[]; note?: string }
  | { type: "digest_item"; topic: string; summary: string; sources?: SourceLink[] }
  | { type: "connector_status"; connectors: ConnectorStatusItem[] }
  | { type: "form_fill"; title?: string; submitLabel?: string; fields: FormField[] }
  | { type: "chart_data"; chartType: "bar" | "line" | "pie"; labels: string[]; datasets: ChartDataset[]; title?: string }
  | { type: "error"; message: string; recovery?: string }
  | { type: "reminder_create"; text: string; dueDate?: string; goalId?: string }
  | { type: "goal_event_link"; goalId: string; eventId: string; eventTitle: string }
```

### src/hooks/useAiChat.ts (lines 405-421 — finish function):

```typescript
const finish = (finalText: string) => {
  const { text: prose, parsed } = parseAssistantContent(finalText)
  setMessages((prev) => {
    const next = prev.map((m) =>
      m.id === assistantId
        ? {
            ...m,
            content: parsed && parsed.type !== "text" ? prose : finalText,
            parsed: parsed && parsed.type !== "text" ? parsed : undefined,
          }
        : m,
    )
    persist(next)
    return next
  })
  stop()
}
```

### src/pages/AiPage.tsx (lines 155-208 — THE GAP, the useEffect that watches messages):

```typescript
useEffect(() => {
  if (!canvasMode) return;

  const newMsgs = chat.messages.filter(m => !processedMsgIds.current.has(m.id));

  if (newMsgs.length === 0) return;

  newMsgs.forEach(msg => {
    processedMsgIds.current.add(msg.id);

    if (msg.role === 'user') {
      lastCardId.current = canvas.addCard('response', {
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        isUserInput: true,
      }, {
        size: { w: 10, h: 4 },
        pinned: true,
        source: 'user',
      });
    } else if (msg.role === 'assistant') {
      const isStructured = msg.parsed && msg.parsed.type !== 'text';
      if (!isStructured) {
        // AI response — append to last user card or create new
        if (lastCardId.current && canvas.allCards[lastCardId.current]) {
          const existing = canvas.allCards[lastCardId.current];
          if (existing.type === 'response' && existing.data?.isUserInput) {
            canvas.updateCard(lastCardId.current, {
              data: {
                ...existing.data,
                aiResponse: msg.content,
                aiTimestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
              },
              size: { w: 10, h: 8 },
            });
            return;
          }
        }
        lastCardId.current = canvas.addCard('response', {
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          isToolOutput: msg.content.includes('```tool') || msg.content.includes('```'),
        }, {
          size: { w: 10, h: 6 },
          pinned: true,
          source: 'ai',
        });
      }
      // ***当 isStructured === true 时，这里什么都不做 — 这就是缺失的桥接***
    }
  });
}, [chat.messages, canvasMode]);
```

### src/components/ai/chat/ParsedMessageRouter.tsx (full file — 49 lines):

```typescript
import type { CardAction, ParsedMessage } from "./parsed"
import { GoalSuggestionCard } from "./renderers/GoalSuggestionCard"
import { PlanUpdateCard } from "./renderers/PlanUpdateCard"
import { StatsSummaryCard } from "./renderers/StatsSummaryCard"
import { ActionListCard } from "./renderers/ActionListCard"
import { DigestTopicCard } from "./renderers/DigestTopicCard"
import { ConnectorStatusCard } from "./renderers/ConnectorStatusCard"
import { FormFillCard } from "./renderers/FormFillCard"
import { ChartDataCard } from "./renderers/ChartDataCard"
import { ErrorCard } from "./renderers/ErrorCard"

export function ParsedMessageRouter({ parsed, onAction, actionResults, connectorSyncing, autoApprove }: ParsedMessageRouterProps) {
  switch (parsed.type) {
    case "goal_suggestion": return <GoalSuggestionCard goals={parsed.goals} source={parsed.source} onAction={onAction} />
    case "plan_update": return <PlanUpdateCard changes={parsed.changes} note={parsed.note} onAction={onAction} />
    case "stats_summary": return <StatsSummaryCard metrics={parsed.metrics} period={parsed.period} />
    case "action_list": return <ActionListCard actions={parsed.actions} note={parsed.note} onAction={onAction} results={actionResults} autoApprove={autoApprove} />
    case "digest_item": return <DigestTopicCard topic={parsed.topic} summary={parsed.summary} sources={parsed.sources} onAction={onAction} />
    case "connector_status": return <ConnectorStatusCard connectors={parsed.connectors} onAction={onAction} syncing={connectorSyncing} />
    case "form_fill": return <FormFillCard title={parsed.title} submitLabel={parsed.submitLabel} fields={parsed.fields} onAction={onAction} />
    case "chart_data": return <ChartDataCard chartType={parsed.chartType} labels={parsed.labels} datasets={parsed.datasets} title={parsed.title} />
    case "error": return <ErrorCard message={parsed.message} recovery={parsed.recovery} onAction={onAction} />
    default: return null
  }
}
```

### src/components/ai/canvas/CanvasCard.tsx (lines 17-50 — card renderer switch):

```typescript
function renderCardContent(card: CanvasCardType) {
  switch (card.type) {
    case 'focus': return <FocusCard card={card} goals={card.data?.goals} loading={card.status === 'loading'} />
    case 'plan': return <PlanCard card={card} goals={card.data?.goals} notes={card.data?.notes} loading={card.status === 'loading'} />
    case 'finance': return <FinanceCard card={card} summary={card.data?.summary} loading={card.status === 'loading'} />
    case 'digest': return <DigestCard card={card} topics={card.data?.topics} loading={card.status === 'loading'} />
    case 'approval': return <ApprovalCard card={card} />
    case 'annotation': return <AnnotationCard card={card} />
    case 'response': return <ResponseCardContent content={card.data?.content || ''} isToolOutput={card.data?.isToolOutput} timestamp={card.data?.timestamp} />
    case 'group': return <GroupCard items={card.data?.items || []} />
    case 'connectors': return <ConnectorsCard state={card.data?.state || 'loading'} connectors={card.data?.connectors || []} ... />
    default: return <div>{card.type}</div>
  }
}
```

### useCanvasState.ts (lines 32-61 — addCard function):

```typescript
const addCard = useCallback((
  type: CardType,
  data: Record<string, any>,
  opts?: { position?: { x: number; y: number }; size?: { w: number; h: number }; pinned?: boolean; source?: CanvasCard['source'] }
) => {
  const id = generateUUID()
  const card: CanvasCard = {
    id,
    type,
    position: opts?.position ?? { x: 40, y: 40 },
    size: opts?.size ?? { w: 8, h: 5 },
    zIndex: 0,
    pinned: opts?.pinned ?? false,
    data,
    source: opts?.source ?? 'ai',
    status: 'live',
    createdAt: Date.now(),
  }
  dispatch({ type: 'ADD_CARD', card })
  if (!card.pinned) {
    const timer = setTimeout(() => {
      dispatch({ type: 'DISMISS_CARD', id })
      dismissTimers.current.delete(id)
    }, DISMISS_TIMEOUT_MS)
    dismissTimers.set(id, timer)
  }
  return id
}, [])
```
