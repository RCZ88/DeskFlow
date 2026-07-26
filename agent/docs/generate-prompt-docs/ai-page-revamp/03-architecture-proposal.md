# Architecture Proposal: Drafting Table

> Source: Engineering analysis of audit + design plan
> Date: Jul 18, 2026

---

## 1. State Architecture

### Canvas State Model

```ts
interface CanvasState {
  cards: Map<string, CanvasCard>
  layout: { columns: number; gap: number; snapToGrid: boolean }
  transientQueue: string[]  // IDs of transient cards (FIFO, max 5 visible)
  viewport: { x: number; y: number; zoom: number }
}

interface CanvasCard {
  id: string
  type: CardType
  position: { x: number; y: number }  // grid-snapped coordinates
  size: { w: number; h: number }      // grid units (e.g., 4×3)
  zIndex: number
  pinned: boolean                     // false = transient (auto-dismiss)
  data: Record<string, any>           // type-specific payload
  source: 'ai' | 'user' | 'system'
  status: 'live' | 'stale' | 'error' | 'loading'
  createdAt: number
  dismissedAt?: number
  metadata: {
    parentId?: string                 // for annotation cards pinned to a parent
    threadDate?: string               // link to conversation thread
    confidence?: number               // AI intent confidence
  }
}

type CardType =
  | 'focus'       // active goals with progress
  | 'plan'        // long-term goals with milestones
  | 'reflect'     // daily reflections
  | 'finance'     // wallet summaries, spending charts
  | 'digest'      // AI-generated news/topics
  | 'approval'    // action-required with approve/reject
  | 'transient'   // Q&A response, auto-dismiss
  | 'annotation'  // AI comment pin attached to another card
```

### Persistence Strategy

| Data | Storage | Rationale |
|------|---------|-----------|
| Card positions & sizes | localStorage | Cheap, fast, layout-only |
| Card content | Existing IPC (DB) | Goals, finance, digest already in DB |
| Canvas viewport | localStorage | User preference |
| Transient cards | Ephemeral (no persist) | Auto-dismiss, not worth persisting |

**Why hybrid?** Card positions are lightweight coordinates (JSON ~2KB for 20 cards). Card content already lives in the DB via existing IPC endpoints. No need to duplicate.

---

## 2. Component Hierarchy

```
DraftingTable (new root — replaces AiPage as canvas container)
├── CanvasGrid
│   │   Background: 40px grid pattern (CSS)
│   │   Drag layer: pointer events for card repositioning
│   │   Drop zones: snap-to-grid helper
│   │
│   ├── CanvasCard (wrapper — handles position, drag, error boundary)
│   │   ├── FocusCard (wraps FocusBoard logic)
│   │   ├── PlanCard (wraps PlanBoard logic)
│   │   ├── FinanceCard (new — summary dashboard)
│   │   ├── DigestCard (wraps DailyDigestBoard logic)
│   │   ├── ApprovalCard (new — approve/reject + confirmation)
│   │   ├── TransientCard (translucent wrapper, auto-dismiss timer)
│   │   └── AnnotationCard (dashed-border, positioned relative to parent)
│   │
│   └── DropZone (visual feedback during drag)
│
├── CommandPalette (⌘K, bottom center)
│   ├── IntentParser (keyword → action routing)
│   ├── AutocompleteList (built-in + custom commands)
│   └── CommandHistory (recent commands, arrow-up to recall)
│
├── TranscriptRail (right slide-out, collapsible)
│   ├── ThreadHeader (thread name, date, close button)
│   ├── MessageList (existing chat messages)
│   │   └── MessageBubble (per message)
│   └── ChatInput (for conversational fallback)
│
├── CanvasToolbar (top bar)
│   ├── Zoom controls (zoom in/out/reset)
│   ├── Layout reset button
│   ├── Card filter (by type)
│   └── Fullscreen toggle
│
└── Modals (existing, reused)
    ├── SlashCommandManager
    ├── AiProviderSelectModal
    └── ConnectorSetupModal
```

---

## 3. Intent Parsing (Command Palette)

### Routing Table

```
User types text
  → IntentParser.parse(text)
    → Match 1: Slash command prefix (/focus, /plan, /sync)
      → Route to handler
    → Match 2: Keyword patterns ("show goals", "my finances", "what's new")
      → Route to card spawn
    → Match 3: Custom slash command (from localStorage)
      → Fill prompt template, send to AI
    → Match 4: Conversational ("what should I focus on today?")
      → Open TranscriptRail, send to AI
    → No match → Show "Did you mean?" suggestions
```

### Ambiguous Input Handling

When the intent parser can't determine a single card type:

1. Show a **transient clarification card** with options:
   - "Did you mean: Focus card? Plan card? Or ask in chat?"
2. User clicks an option → spawn that card
3. Auto-dismiss after 10s if no choice

### Multi-Step Workflows

Example: "I want to reallocate $200"

1. AI analyzes intent → returns `workflow_step` in JSON
2. Canvas shows **ApprovalCard**: "Move $200 from Savings to Emergency Fund?"
3. User clicks Approve → AI executes → card transforms to success state
4. User clicks Reject → card shows "Cancelled" → fades out

---

## 4. API Contract: AI → Canvas

### Current Contract (ParsedMessage)

```ts
// AI returns JSON in fenced block:
{ type: "goal_suggestion", goals: [...] }
// → ParsedMessageRouter dispatches to GoalSuggestionCard
```

### New Contract (CardGeneration)

```ts
interface CardGeneration {
  cardType: string            // which card to spawn/mutate
  cardId?: string             // existing card to update (null = new)
  action: 'create' | 'update' | 'dismiss'
  position?: { x: number; y: number }  // suggested grid position
  size?: { w: number; h: number }      // suggested grid size
  data: Record<string, any>   // type-specific payload
  transient?: boolean         // auto-dismiss after 30s
  confidence: number          // for ambiguous intents (0-1)
  reasoning?: string          // why this card was created (for annotations)
}
```

### Streaming in Cards

| Phase | Card State | UI |
|-------|-----------|-----|
| AI generating | `status: 'loading'` | Skeleton shimmer + "Thinking..." |
| Streaming content | `status: 'live'` | Progressive content fill (typewriter) |
| Complete | `status: 'live'` | Full card content, interactive |
| Error | `status: 'error'` | Error overlay + retry button |

---

## 5. Error Boundary Strategy

Each `CanvasCard` is wrapped in its own `<ErrorBoundary>`:

```tsx
<ErrorBoundary fallback={<CardErrorFallback cardType={card.type} />}>
  <ActualCardContent />
</ErrorBoundary>
```

**Fallback UI per card type:**
- Shows the card type name + error icon
- "Retry" button that re-fetches card data
- "Dismiss" button that removes the card
- Does NOT crash the entire canvas

**Canvas-level fallback:**
- If the canvas itself crashes, a full-page error boundary catches it
- Shows "Canvas crashed — Reset to default layout" button
- Resets localStorage canvas state + reloads

---

## 6. Decomposition Plan (Prerequisite)

Before building the canvas, `AiPage.tsx` (1081 lines, 33 state vars) must be decomposed:

### Extract Domain Hooks

| Hook | State Moved | Lines Saved |
|------|-------------|-------------|
| `useGoals()` | goals, goalsState, goalsError, suggestions, planGoals, longTermGoals, review, reviewError, toggleErrors, acceptErrors | ~300 |
| `useDigest()` | digestTopics, digestState, digestReason, digestPollRef | ~100 |
| `useConnectors()` | connectors, connectorsState, connectorSyncing, connectorStatus, showConnectorSetup | ~150 |
| `useReminders()` | reminders, remindersLoading, remindersError, calendarEvents | ~100 |
| `useToasts()` | toasts, showToast | ~50 |

### Result
AiPage.tsx shrinks from ~1081 lines to ~300 lines (routing, layout, modal orchestration only).

---

## 7. Migration Path

### Phase 0: Decompose (no visual change)
- Extract domain hooks from AiPage
- Fix critical bugs (setExpandedCardId, SummaryGrid dead import)
- Add Error Boundaries
- **No user-visible changes**

### Phase 1: Canvas Foundation
- Build `CanvasGrid` with CSS grid background
- Build `CanvasCard` wrapper with position, drag, error boundary
- Convert existing ExpandableCards to CanvasCards
- Keep chat panel as a card (not yet a rail)
- **User sees: same content, but cards can be repositioned**

### Phase 2: Command Palette
- Build CommandPalette component (⌘K)
- Move chat input into palette
- Intent parser with keyword routing
- Transient card spawning
- **User sees: �K replaces chat input, simple responses appear as cards**

### Phase 3: Transcript Rail
- Move conversation history to right slide-out
- Canvas cards become the primary interface
- Chat is now a fallback, not the default
- **User sees: canvas-first, chat in sidebar**

### Phase 4: Card Types
- Implement FocusCard, PlanCard, FinanceCard, DigestCard
- Approval cards with approve/reject
- Annotation cards (AI comment pins)
- **User sees: full Drafting Table experience**
