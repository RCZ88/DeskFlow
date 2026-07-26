# Open Questions

> These must be answered before implementation begins.
> Last updated: Jul 18, 2026

---

## Q1: Card Data Freshness

When goals change (e.g., user completes a goal from the Focus card), should the canvas:
- **A)** Re-render that card live (WebSocket/polling)
- **B)** Require a manual refresh button on each card
- **C)** Auto-refresh every N seconds (polling)

**Recommendation**: Option A — live updates for cards that have active data sources (goals, finance). The existing IPC pattern already supports this via event listeners.

---

## Q2: AI Response Location

When the user types a complex question ("what should I focus on today?"), should the AI response appear:
- **A)** As a card ON the canvas
- **B)** In the TranscriptRail
- **C)** Both — card on canvas + explanation in rail

**Recommendation**: Option C — the card is the primary output (e.g., a "Focus Recommendations" card with suggested goals), and the TranscriptRail shows the AI's reasoning/explanation as a collapsible thread.

---

## Q3: Connectors on Canvas

You said connectors move to settings. But what about:
- **Unread email count** — should that be a small badge on the canvas?
- **Today's events** — should there be a "Today" card?
- **Last sync time** — where does the user see this?

**Recommendation**: A small "Status Bar" card (1×1 grid unit) showing unread count + today's events + last sync. Clicking it opens the full connector settings. The bulk of connector management is in Settings.

---

## Q4: Finance Card Scope

The finance module is massive (wallets, transactions, subscriptions, crypto). Should the FinanceCard:
- **A)** Show a summary dashboard (total balance, recent transactions, subscription count)
- **B)** Have sub-cards for each wallet/subscription
- **C)** Be a single card that expands to show detail

**Recommendation**: Option A — summary card with key numbers. Clicking "Detail" opens a modal or expands the card. Sub-cards would clutter the canvas.

---

## Q5: Responsive Design

Is the Drafting Table:
- **A)** Desktop-only (minimum 1200px width)
- **B)** Responsive down to tablet (768px)
- **C)** Fully responsive including mobile

**Recommendation**: Option A for v1 — the canvas model works best with real estate. Mobile can have a simplified list view later.

---

## Q6: Undo Mechanism

When the AI mutates a card (e.g., adds a goal), should there be:
- **A)** An undo button per mutation
- **B)** A global undo stack (Ctrl+Z)
- **C)** No undo — just delete the card

**Recommendation**: Option C for v1 — cards are deletable. Full undo is complex and can come later.

---

## Q7: Multiple Canvases

Is there:
- **A)** One canvas per user (global layout)
- **B)** Multiple canvases (work, personal, etc.)
- **C)** One canvas per project

**Recommendation**: Option A for v1 — one global canvas. The canvas layout is the user's "dashboard." Multiple canvases add complexity with no clear value yet.

---

## Q8: Transition Strategy

How do we handle the transition from old to new?
- **A)** Hard cutover — replace the old page entirely
- **B)** Feature flag — old view as fallback
- **C)** Gradual migration — start with canvas, keep chat accessible

**Recommendation**: Option C — Phase 1 keeps the chat as a card on the canvas. Users who prefer the old chat-first view can pin the chat card prominently. Over time, the canvas becomes the default.

---

## Q9: Keyboard Navigation

How does keyboard navigation work on a spatial canvas?
- Tab order: left-to-right, top-to-bottom by grid position?
- Arrow keys to move between cards?
- Enter to activate a card?
- Escape to close/dismiss?

**Recommendation**: Tab cycles through cards in grid order. Enter activates/expands a card. Escape closes the active card. Arrow keys for fine-grained navigation within a card.

---

## Q10: Performance Threshold

How many cards can the canvas handle before we need virtualization?
- 10 cards? 20? 50?

**Recommendation**: Virtualize at 20+ cards. For v1, assume max 15 visible cards (5 persistent + 5 transient + 5 annotations). If the user exceeds this, show a "too many cards" warning.

---

## Q11: Card Size Defaults

What are the default grid sizes for each card type?

| Card Type | Default Size | Rationale |
|-----------|-------------|-----------|
| Focus | 4×3 | Needs room for goal list |
| Plan | 4×3 | Similar to Focus |
| Finance | 4×2 | Summary numbers + small chart |
| Digest | 3×2 | Topic list |
| Approval | 3×2 | Action buttons + description |
| Transient | 3×2 | Q&A response |
| Annotation | 2×1 | Small comment pin |
| Status | 1×1 | Badge/counter |

---

## Q12: Grid Configuration

- Grid cell size: 40px (as specified)
- Canvas dimensions: infinite scroll? Or fixed size (e.g., 20×15 grid)?
- Card snapping: always snap? Or free-form with snap-on-release?

**Recommendation**: 40px cells, 20×15 grid (800×600px logical), snap-on-release. This gives enough room for ~15 cards without scrolling. Scrolling can be added later.
