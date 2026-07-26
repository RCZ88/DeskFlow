# PROMPT: AI Response Cards + Grouping System for Canvas Mode

## Raw Request

"so in the deck mode you cant see any response unless the ai is already in the mode where it outputs something that is parsed as the box stuff? thats a really bad design. READLLY BAD deisgn it hsould be that thers like a box that shows the output htat is not a box. because of it really isnt. and like having to switch back and fourth between the board mode and the normal chat is kind of good, but at the same time kidn of weird."

"add a feature where theres a card that appears when the ai response, no matter if its like tool or just any response. and then i would like a feature where we can group certain response, and have the settings where it can automatically group stuff all at once place( the ones that is non-tool calls). and like another mode where the ia decide which cards to go to and stuff like that."

## Context

### Current Architecture

**Two rendering modes exist:**

1. **Canvas mode** (`canvasMode = true`, DEFAULT): `CanvasGrid` (draggable positioned cards on 40px grid) + `CanvasInput` (text input). NO ChatPanel. Cards are typed: `focus`, `plan`, `finance`, `digest`, `approval`, `transient`, `annotation`. Plain text AI responses produce NO card → invisible.

2. **Deck mode** (`canvasMode = false`): `AiPageDeck` → `ChatPanel` (full chat with message bubbles, streaming, memory chips) + expandable feature cards below (digest, connectors, focus, plan, reflect). All responses visible as chat bubbles.

**Key files:**
- `src/pages/AiPage.tsx` — mode toggle (line 143: `canvasMode`), conditional render (lines 899-1083)
- `src/components/ai/canvas/CanvasCard.tsx` — card renderers by type (143 lines)
- `src/components/ai/canvas/CanvasGrid.tsx` — grid container (31 lines)
- `src/components/ai/canvas/CanvasInput.tsx` — input bar (80 lines)
- `src/hooks/useCanvasState.ts` — card state management with reducer (114 lines)
- `src/types/canvas.ts` — card types, reducer, state interface (109 lines)
- `src/components/ai/chat/ChatPanel.tsx` — full chat panel (215 lines)
- `src/components/ai/chat/MessageBubble.tsx` — message rendering with parsed cards (90 lines)
- `src/hooks/useAiChat.ts` — chat state, send/stream/persist/finish logic (513 lines)
- `src/components/ai/chat/parsed.ts` — parseAssistantContent + ParsedMessage types (lines 61-79, 196-233)
- `src/components/ai/deck/AiPageDeck.tsx` — deck layout with chat + expandable cards (475 lines)

**Message flow:**
1. `useAiChat.send()` → streams AI response → `finish(finalText)` called
2. `finish()` calls `parseAssistantContent(finalText)` → returns `{ text, parsed }`
3. If `parsed.type !== "text"` → message gets `content=prose, parsed=card`
4. If `parsed.type === "text"` or no JSON → message gets `content=fullText, parsed=undefined`
5. In Deck mode: `ChatPanel` → `MessageBubble` renders text bubble ALWAYS, plus `ParsedMessageRouter` if parsed
6. In Canvas mode: `CanvasGrid` only renders typed cards. No `ChatPanel`. Messages stored but invisible.

**Canvas card system:**
- `useCanvasState` reducer: ADD_CARD, UPDATE_CARD, REMOVE_CARD, MOVE_CARD, PIN_CARD, DISMISS_CARD
- Cards have: id, type, position {x,y}, size {w,h}, zIndex, pinned, data, source (ai/user/system), status
- `addCard()` generates UUID, defaults to position {40,40}, size {w:8, h:5}, source 'ai'
- Unpinned cards auto-dismiss after 30 seconds
- Card types: focus, plan, reflect, finance, digest, approval, transient, annotation

**ParsedMessage types (from parsed.ts):**
- text, goal_suggestion, plan_update, stats_summary, action_list, digest_item
- connector_status, form_fill, chart_data, error, reminder_create, goal_event_link

## Requirements

### R1: Response Card Type
Add a new canvas card type `response` that renders AI responses (plain text, markdown, tool outputs) as visible cards on the canvas. When the AI responds in Canvas mode:
- If the response contains structured data (parsed type !== "text") → create the appropriate typed card (goal_suggestion, plan_update, etc.) AS BEFORE
- If the response is plain text/markdown (parsed type === "text" or undefined) → create a `response` card that renders the markdown content
- If the response contains tool output → create a `response` card with a "tool output" visual treatment
- Every response must produce at least one visible card in Canvas mode

### R2: Response Grouping
Add a grouping system for canvas cards:
- Manual grouping: user can select multiple cards and group them into a collapsible cluster
- Auto-grouping setting: in Settings, a toggle "Auto-group AI responses" that groups non-tool-call responses into a single expandable card per conversation turn
- Group visual: a container card with a count badge, expandable to show child cards
- Group persistence: groups persist across sessions (saved in canvas state)

### R3: AI-Directed Mode
Add a third card creation mode (alongside the current implicit mode):
- **Auto mode** (current behavior): cards are created at default positions
- **AI-directed mode**: the AI's response includes positioning metadata (x, y, size, type) and the canvas respects it
- This means the `parseAssistantContent` system needs to support a new JSON field: `canvas_directive: { x, y, w, h, type, group? }`
- The AI can then decide where cards go and which group they belong to

### R4: Connector Panel Fix
The ConnectorsPanel should be visible in Canvas mode. Currently it only renders in Deck mode via `connectorsSlot`. Add it as a collapsible sidebar or overlay panel in Canvas mode.

## Constraints
- Must work with existing `useCanvasState` reducer pattern (no new state management libraries)
- Must preserve Deck mode exactly as-is (no changes to Deck rendering)
- Canvas cards must use existing card styling patterns (dk-canvas-card, glass cards, etc.)
- Auto-dismiss timer (30s for unpinned) must still work for transient response cards
- Must handle the case where AI sends multiple messages in one turn (e.g. tool call + final response)

## Design Task
Design the complete implementation:
1. New `response` card type renderer (CanvasCard.tsx)
2. Group system (new component + state changes in useCanvasState.ts + types/canvas.ts)
3. Auto-grouping logic in useAiChat.ts finish() or useCanvasState.ts
4. AI-directed mode (parsed.ts extension + canvas state integration)
5. Connector panel integration in Canvas mode
6. Settings UI for auto-grouping toggle
