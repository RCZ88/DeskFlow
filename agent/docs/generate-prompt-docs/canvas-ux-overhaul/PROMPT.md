# Canvas UX Overhaul — Resize, Groups, Interactivity, Navigation

## User's Raw Request

> "why is there no way for me to resize the cards on the canvas? make sure theres like smart resizing and like the ability for me to resize cards, and maybe like group them or like you know those extra features. and like having the ai output something at a specific group location of cards somewhere that i can select maybe. also, like why are the schedules and stuff cards not interactive as in like click so that i can view in detail for example or like those other details? same goes for the planner and every other card. you need to think on the human side of how they're going to view stuff properly. there should also be a quick nav bar where we can switch and go to the next card on the canvas quicker. and the ability to like split the viewing of a group for example to like split into two screens vertically or horizontally. and like those grid layouts for different numbers of cards on a group. also can we replace the pin button with something without the color. it should only show the color when it is clicked. and like theres no clear usage of the pin because i cant even click on it. it DOESNT DO ANYTHING."

---

## Feature 1: Card Resizing

**User Problem:** Cards are fixed size. Can't make them bigger to see more content or smaller to save space.

**What It Should Do:**
- Drag bottom-right corner to resize card
- Resize snaps to 40px grid cells
- Minimum size: 4×4 cells (160×160px)
- Maximum size: 20×20 cells (800×800px)
- Resize handle appears on hover (bottom-right corner)
- Visual feedback during resize (border highlight)
- Card content reflows to fit new size

**Implementation:**
- Add resize handle div to CanvasCard (bottom-right corner, 12×12px)
- On pointerdown on handle, start resize mode
- On pointermove, compute new size from delta / zoom
- Snap to grid: `Math.round(newSize / CELL) * CELL`
- Clamp to min/max
- Update `card.size` via `onMoveCard` or new `onResizeCard` callback
- CSS: resize handle appears on `.dk-canvas-card:hover`

---

## Feature 2: Smart Card Groups

**User Problem:** Cards are scattered randomly. No way to organize them into logical groups.

**What It Should Do:**
- Drag cards near each other → auto-group when within threshold
- Group has a visual container (dashed border, group label)
- Cards in a group move together when dragging the group header
- Ungroup by dragging card out of group
- AI can output cards to a specific group location

**Implementation:**
- New `group` data structure: `{ id, label, cardIds: string[], position }`
- Proximity detection: when card is within 80px of another card's center, suggest grouping
- Group container: dashed border, label at top, cards positioned relative to group
- Group header: draggable, shows group name + card count
- New IPC: `group:create`, `group:delete`, `group:add-card`, `group:remove-card`

---

## Feature 3: Card Interactivity (Click to Detail)

**User Problem:** Cards show summary data but can't click to see details. Schedule shows text blocks but can't click to see full schedule. Planner shows goals but can't click to see goal details.

**What It Should Do:**
- Click on a card → expand to full detail view (modal or expanded card)
- Schedule card: click a schedule block → show full event details (title, time, location, description)
- Planner card: click a goal → show goal details (progress history, linked deadlines, notes)
- Deadline card: click a deadline → show full deadline details (description, linked tasks, notes)
- Digest card: click a topic → show full article/summary
- Response card: click to expand full markdown content

**Implementation:**
- Add `onClick` handlers to card content elements
- New `CardDetailModal` component (fullscreen overlay with card-specific content)
- Each card type defines its own detail view
- Modal shows: full content, metadata, actions (edit, delete, link)
- Smooth expand animation from card position to fullscreen

---

## Feature 4: Quick Nav Bar

**User Problem:** With many cards on canvas, hard to find specific cards. No way to jump between cards quickly.

**What It Should Do:**
- Floating toolbar at bottom of canvas (above input bar)
- Shows list of all cards with type icon + truncated title
- Click a card in nav → smooth pan to that card
- Current card highlighted (card in center of viewport)
- Filter by card type (tabs: All, Goals, Schedule, etc.)
- Keyboard shortcut: arrow keys to navigate between cards

**Implementation:**
- New `CanvasNavBar` component
- Positioned at bottom of canvas, above input bar
- Scrollable horizontal list of card thumbnails
- Each thumbnail: icon + title (truncated), click to pan
- Current card detection: which card center is closest to viewport center
- Filter tabs at top of nav bar

---

## Feature 5: Split View / Group Layouts

**User Problem:** Can't compare cards side by side. No way to organize cards in a grid layout.

**What It Should Do:**
- Select multiple cards → right-click → "Split Vertical" / "Split Horizontal"
- Split creates a layout region where cards are arranged in a grid
- Grid layouts: 1×1, 1×2, 2×1, 2×2, 3×1, etc.
- Cards in a split view resize to fill their grid cell
- Exit split view → cards return to free positioning

**Implementation:**
- New `SplitLayout` component
- Multi-select: Ctrl+click to add cards to selection
- Right-click context menu: Split options
- Split region: CSS Grid layout
- Cards in split: `position: static` within grid cell
- Exit split: restore original positions

---

## Feature 6: Pin Button Fix

**User Problem:** Pin button (📌 emoji) doesn't do anything. No visual feedback. Shows color even when not pinned.

**What It Should Do:**
- Replace 📌 emoji with a proper pin icon (Lucide `Pin` or `PinOff`)
- Click pin → card becomes pinned (stays on canvas, doesn't auto-dismiss)
- Click again → unpin (card can be auto-dismissed)
- Visual: unpinned = outline icon, pinned = filled icon with accent color
- Pin indicator: subtle dot in top-right corner (only when pinned)

**Implementation:**
- Replace `<span className="dk-canvas-pin">📌</span>` with `<button>` using Lucide `Pin`/`PinOff`
- `onClick` toggles `card.pinned` via `updateCard`
- CSS: unpinned = `color: var(--dk-text-faint)`, pinned = `color: var(--dk-accent)`
- Remove the `::after` pseudo-element for pin indicator (it's redundant with the icon state)

---

## Feature 7: AI Output to Specific Group Location

**User Problem:** AI generates cards but they appear at random positions. Want to direct AI output to a specific area.

**What It Should Do:**
- Select a group or region on canvas → "Set as AI output target"
- When AI generates a new card, it appears at the target location
- Target indicator: glowing border around the target region
- Multiple targets possible (different AI features output to different areas)

**Implementation:**
- New state: `aiOutputTarget: { x, y, groupId? } | null`
- When target is set, new cards spawn at target position
- Visual: pulsing border around target region
- Clear target: click empty area or press Escape

---

## Priority Order

1. **Pin button fix** (quick, high impact)
2. **Card interactivity / click-to-detail** (high impact, moderate complexity)
3. **Quick nav bar** (high impact, moderate complexity)
4. **Card resizing** (high impact, moderate complexity)
5. **Smart groups** (high complexity, high impact)
6. **Split view / grid layouts** (high complexity, medium impact)
7. **AI output targeting** (medium complexity, medium impact)
