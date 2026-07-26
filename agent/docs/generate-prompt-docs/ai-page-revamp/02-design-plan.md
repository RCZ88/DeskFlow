# Design Plan: Drafting Table Paradigm

> Source: Initial design & engineering collaboration prompt
> Date: Jul 18, 2026

---

## The Shift

From **chat bubbles** (linear, ephemeral, two-party) to a **spatial canvas** (persistent, spatial, data-centric).

The user's life data exists as **draggable, persistent cards** on a dark canvas. The AI doesn't respond in chat bubbles — it spawns, mutates, and annotates cards.

---

## Card Types

| Card | Source | Behavior |
|------|--------|----------|
| **Focus** (active goals) | Goals IPC | Live card with progress bars, completion toggles |
| **Plan** (long-term goals) | Long-term goals IPC | Live card with milestones, category pills |
| **Reflect** (daily reflections) | Goal reviews | Status card with day summary |
| **Finance** | Finance IPC | Live card with charts/numbers |
| **Digest** (news/AI-generated) | Digest IPC | Generated cards from AI research |
| **Approval** | AI actions | Action-required cards with Approve/Reject buttons |
| **Transient** | AI Q&A | Slightly translucent, auto-dismisses after 30s unless pinned |
| **Annotation** | AI | Dashed-border comment pins attached to relevant cards |

---

## Key Interaction Model

### Command Palette (⌘K)
- Located at **bottom center** of the canvas
- Replaces the chat input box
- All user input goes through here
- Shows autocomplete for built-in + custom commands

### Input Routing
| Input Type | Canvas Behavior |
|------------|-----------------|
| Simple Q&A | Spawns a **transient card** (translucent, auto-dismiss 30s unless pinned) |
| Complex/Actionable | Spawns or **mutates persistent cards** on the canvas |
| Approval requests | Spawns **action cards** with explicit Approve/Reject buttons |
| Conversational threads | Slides out a **transcript rail** from the right (collapsible) |
| Connectors (RSS/data) | Moved to **dedicated settings page**, NOT on the canvas |

### Transcript Rail
- Right side slide-out panel
- Collapsible (default collapsed on desktop)
- Shows conversation history for complex multi-turn interactions
- Canvas never becomes a chat log

---

## Visual Style

- **Dark theme** (matches current app)
- Cards: subtle shadows, 1px borders, 12px radius
- **Cyan accent** for active/live states only
- **40px grid background** on canvas
- AI annotations: dashed-border comment pins attached to relevant cards
- Card hover: subtle elevation change
- Card loading: skeleton shimmer
- Card error: red left border + retry button

---

## Card Lifecycle

### Creation
1. User types in Command Palette
2. Intent parser determines card type
3. AI generates card content (streaming into card)
4. Card appears on canvas with entry animation

### Update
1. AI or user triggers a change
2. Card receives new data
3. Card smoothly transitions to new state (no full re-render)

### Dismissal
- **Transient cards**: Auto-dismiss after 30s (fade out)
- **Persistent cards**: User clicks close → card shrinks and fades
- **Approval cards**: Approve/Reject → card transforms to success/fail state → fades

### Error Recovery
- Card's data source fails → card shows error overlay with retry
- AI fails to generate → transient card shows error toast
- Canvas state corrupts → reset to default layout via toolbar button
