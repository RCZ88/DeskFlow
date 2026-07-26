# PROMPT: Bridge Parsed AI Responses → Canvas Cards

## Raw Request

"WHY HAVE YOU NOT MADE IT?? didnt it include on the package of implementation??? the parsing system should call the features and add a card for each of the features like the finance page features or the other page's features"

## Problem Statement

The AI Canvas mode has two parallel systems that don't talk to each other:

1. **Parsed response system** — AI returns structured JSON (goal_suggestion, plan_update, stats_summary, etc.), `parseAssistantContent()` extracts it, `ParsedMessageRouter` renders inline cards in the chat transcript. This works.

2. **Canvas card system** — Draggable cards on the canvas (focus, plan, finance, digest, approval, connectors, response). These work when spawned manually via command palette or demo seed. This works.

**The bridge is missing.** When AI responds with structured JSON, the canvas gets nothing. The useEffect in `AiPage.tsx` line 178 explicitly skips structured messages: `if (!isStructured)`.

## Context Bundle

Read `CONTEXT_BUNDLE.md` in this directory for the complete source code of every affected file. The target AI must read this first before designing the solution.

## Engineering Task

Design the data pipeline that maps each `ParsedMessage` type to a `CanvasCard` type and calls `canvas.addCard()` with the correct data.

### Mapping Table

| ParsedMessage type | CardType | data shape | Card size |
|---|---|---|---|
| `goal_suggestion` | `focus` | `{ goals: ParsedGoal[] }` | `{ w: 8, h: 6 }` |
| `plan_update` | `plan` | `{ goals: PlanChange[].goal, notes: string }` | `{ w: 8, h: 6 }` |
| `stats_summary` | `finance` | `{ metrics: StatMetric[] }` or map to `{ balance, income, expense }` | `{ w: 6, h: 4 }` |
| `digest_item` | `digest` | `{ topics: [{ topic, summary, sources }] }` | `{ w: 6, h: 4 }` |
| `action_list` | `approval` | `{ title: actions[0].label, description: note }` | `{ w: 6, h: 4 }` |
| `connector_status` | `connectors` | `{ connectors: ConnectorStatusItem[] }` | `{ w: 10, h: 8 }` |
| `form_fill` | `response` | `{ content: JSON.stringify(fields) }` | `{ w: 8, h: 5 }` |
| `chart_data` | `response` | `{ content: "Chart: " + title }` | `{ w: 8, h: 5 }` |
| `reminder_create` | `annotation` | `{ text, parentType: "reminder" }` | `{ w: 6, h: 3 }` |
| `goal_event_link` | `annotation` | `{ text: eventTitle, parentType: "goal link" }` | `{ w: 6, h: 3 }` |
| `error` | `response` | `{ content: message }` | `{ w: 8, h: 4 }` |

### Where to Implement

**Only one file needs changes:** `src/pages/AiPage.tsx`, specifically the useEffect at lines 155-208 that watches `chat.messages`.

The current code at lines 177-205:
```typescript
const isStructured = msg.parsed && msg.parsed.type !== 'text';
if (!isStructured) {
  // ... creates response card ...
}
//当 isStructured === true 时，什么都不做 — 这就是缺失的桥接
```

Must be changed to:
```typescript
const isStructured = msg.parsed && msg.parsed.type !== 'text';
if (isStructured && msg.parsed) {
  // NEW: Create typed canvas card from parsed data
  // Use the mapping table above
  // Also create a response card for any prose text alongside the JSON
} else if (!isStructured) {
  // ... existing response card logic unchanged ...
}
```

### Edge Cases to Handle

1. **No prose text** — AI returns pure JSON with no surrounding text. Only create the typed card, skip the response card.
2. **Multiple structured types in one message** — Not possible with current parser (one JSON block per message). But handle gracefully if it happens.
3. **Unknown parsed type** — Fall back to creating a `response` card with the raw content.
4. **Position conflicts** — Offset new cards by 40px per existing card of same type. Don't overlap pinned cards.
5. **Prose extraction** — Need a helper to extract text outside the JSON fenced code block. The `parseAssistantContent` already does this (returns `text` = prose, `parsed` = structured). Use `msg.content` when `parsed` exists — it already contains just the prose portion.

### Constraints

- Only modify `src/pages/AiPage.tsx` (the useEffect at lines 155-208)
- Do NOT modify `parsed.ts`, `useAiChat.ts`, `CanvasCard.tsx`, `ParsedMessageRouter.tsx`, or any canvas card component
- Inline card rendering in chat (ParsedMessageRouter) must continue working unchanged
- Demo cards and command palette card creation must continue working unchanged
- New cards from AI responses should be unpinned (auto-dismiss after 30s) unless user pins them
- The `canvas` object and `canvas.addCard()` API are already available in scope

## Design Task

Design the complete implementation including:
1. The switch statement mapping each ParsedMessage type to CardType + data
2. The prose extraction logic (when to create a response card alongside the typed card)
3. Position calculation for new cards
4. Deduplication logic (don't create duplicate cards for same parsed type within 5 seconds)
5. Error handling for malformed parsed data

## UX Task

- Typed canvas cards should appear with a subtle entrance animation (use existing `motion.div` patterns)
- The prose response card (if any) should appear below the typed card
- Cards should auto-position to avoid overlapping existing pinned cards
- User should see visual feedback that a card was created (brief highlight or pulse)

## Constraints

- Must work with existing `canvas.addCard()` API (returns card ID, accepts type + data + opts)
- Must not break Deck mode
- Must not break existing canvas features
- Canvas cards auto-dismiss after 30s if unpinned (existing behavior via useCanvasState)
