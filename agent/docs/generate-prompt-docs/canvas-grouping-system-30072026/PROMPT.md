# Canvas Grouping System — Full Stack Prompt

## Raw Request

> THE GROUPING SYSTEM DOENST EVEN WORK YET. I CAN GROUP THE BUNCH OF CARDS INTO LIKE THE PROPER GROUPING. IT DOESNT COMBINE THOSE INTO ONE CARD PROPERLY. DO WE EVEN HAVE THE SYSTEM FOR IT??
>
> WHAT THE FUCK IS THE GROUPING SYSTEM?? WHY IS IT JUST TURNING MY CARDS INTO RESPONSES? AND THERES THE PROPER UI AND EVERYTHING???? WHERES THE PROPER UI HANDLING?? WHERES A WAY TO ARRANGE THE PROPORTION AND LIKE HOW CAN I SEPARATE THEM FROM THE GROUP. AND LIKE SEEING THE LIST OF GROUPS AND EVERY POSSIBLE QoL FEATURE OF THE AI ASSISTANT PAGE
>
> WHY DOES IT NOW SIMPLY SAY "GROUP" AS IN THERES NO WAY FOR ME TO MODIFY IT, THERES NO CUSTOMIZABILITY. ALSO DOES THE AGENT HAVE THE ACCESS TO SMART ARRANGE THE SIZE AND EVERYTHING? AND GROUPING THE UI? DOES IT HAVE ACCESS TO THE POSITIONS, THE COLORS OF THE GROUP AND EVERYTHING??
>
> WE NEED TO HAVE THOSE FEATURES PROPERLY.

## Context

- **Codebase**: DeskFlow — Electron + React + better-sqlite3 desktop productivity tracker
- **Context Bundle**: `agent/docs/generate-prompt-docs/canvas-grouping-system-30072026/CONTEXT_BUNDLE.md`
  - Contains ACTUAL source code for all canvas files: types, reducer, hook, components, CSS
  - The receiving AI MUST read this file first; it has no other codebase access

## The Mandate

Design a **complete, production-ready canvas grouping system** — both backend (state management, data model, persistence) and frontend (components, interactions, visuals). The system must let users group cards visually, rename groups, change colors, ungroup, and let the AI agent control group properties.

---

## Part 1: Backend — State Model & Data Flow

### 1.1 Fix the Group Data Model

The `CanvasCard` type for `type: 'group'` currently stores child cards in `data.childCards` as flat objects. This is fragile — child cards lose their position history and can't be restored properly on ungroup.

**Design a better data model** that:
- Stores child card IDs (not full copies) to avoid duplication
- Keeps a reference map so child card data can be reconstructed
- Supports group metadata: label, color, creation timestamp, author (user vs agent)
- Supports group actions: rename, recolor, add card, remove card, ungroup, smart-arrange

### 1.2 Fix the Ungroup Flow

Current ungroup: dismisses the group card → child cards are lost forever.

**Design an ungroup flow** that:
- Restores all child cards to their original positions (or smart-arranged positions)
- Removes the group card
- Clears `groupId` from all child cards
- Supports "ungroup and keep layout" vs "ungroup and scatter"

### 1.3 Fix the Grouping Callback

The `onGroupCards` callback in AiPage creates a group card but:
- Stores child data as flat objects (loses card structure)
- Doesn't use the `createGroup` function from the hook
- Doesn't create a proper `CanvasGroup` in the groups map

**Design a corrected flow** that:
- Uses `createGroup` to create the group metadata
- Stores child card IDs in the group, not copies
- Creates the group card with a reference to the group ID
- Properly links cards via `groupId`

### 1.4 Smart Arrange

The AI agent should be able to arrange cards within a group:
- Grid layout (auto-size based on card count)
- Stack layout (cards stacked vertically)
- Mosaic layout (cards arranged to fill space)
- Custom positions (agent specifies exact x,y for each card)

**Design the arrange algorithms** and the API the agent uses to invoke them.

### 1.5 CanvasGrid Filtering

CanvasGrid currently renders ALL cards individually. Cards with `groupId` should NOT render as standalone cards — they should be rendered inside their group.

**Design the filtering logic** and how group cards render their children.

---

## Part 2: Frontend — Components & Interactions

### 2.1 GroupCard Component (Rebuild)

The current GroupCard shows text items. Rebuild it to:

**Header:**
- Editable group name (click to edit, Enter to save)
- Color dot showing group color
- Card count badge
- Action buttons (rename, color picker, ungroup) — visible on hover
- Expand/collapse chevron

**Body (expanded):**
- Shows child cards as mini-cards with:
  - Card type icon/badge (colored by group color)
  - Content preview (first 120 chars)
  - Status indicator
- Each mini-card can be clicked to select it
- Empty state: "No cards in this group"

**Color Picker:**
- 8 preset colors (violet, blue, emerald, amber, rose, cyan, pink, slate)
- Grid of color swatches
- Click to apply, click outside to close
- Active color has white border + glow

### 2.2 Ungroup Interaction

- Click ungroup button → group card disappears → child cards appear at their original positions
- Confirmation dialog if group has >5 cards
- "Scatter" option: arrange child cards in a grid around the group's center

### 2.3 Drag-Out-of-Group

- When group is expanded, dragging a mini-card out of the group should:
  - Remove it from the group
  - Create a new standalone card at the drop position
  - Update group's child count

### 2.4 Group List Panel

A side panel (toggled from toolbar) showing:
- List of all groups with:
  - Color dot + name
  - Card count
  - Created timestamp
- Click to zoom-to-group on canvas
- Right-click context menu: rename, recolor, ungroup, delete

### 2.5 Agent Control

The AI agent should be able to:
- Create a group with a specific name and color
- Add/remove cards from a group
- Arrange cards within a group (grid/stack/mosaic)
- Rename and recolor groups
- Ungroup with specific layout preservation

This means the `addCard` call for type `'group'` should accept:
```ts
{
  childCards: string[],  // card IDs to group
  label: string,
  colorId: GroupColorId,
  arrange?: 'grid' | 'stack' | 'mosaic' | 'custom',
  customPositions?: Record<string, { x: number; y: number }>
}
```

---

## Part 3: Verification Checklist

### Backend
- [ ] `CanvasGroup` type has `label`, `colorId`, `cardIds`, `position`, `size`
- [ ] `CREATE_GROUP` reducer creates group and sets `groupId` on child cards
- [ ] `UPDATE_GROUP` reducer updates label/color
- [ ] `UNGROUP` reducer removes group, clears `groupId` from children, restores cards
- [ ] `useCanvasState` exposes `createGroup`, `updateGroup`, `ungroup`
- [ ] `onGroupCards` callback uses `createGroup` properly
- [ ] CanvasGrid filters out cards with `groupId`
- [ ] Group card data stored via group ID reference, not copies

### Frontend
- [ ] GroupCard shows editable name, color dot, card count, action buttons
- [ ] GroupCard expand/collapse shows child cards as mini-cards
- [ ] Color picker with 8 presets, click-to-apply
- [ ] Ungroup restores child cards to canvas
- [ ] Drag-out-of-group removes card from group
- [ ] Group list panel shows all groups
- [ ] Agent can create groups with name/color/arrange
- [ ] Smart arrange algorithms (grid, stack, mosaic)
- [ ] All CSS follows glass pattern: `bg-[rgba(24,24,27,0.80)] backdrop-blur-xl`
- [ ] All interactive elements have hover/focus states
- [ ] Empty states handled (no cards in group, no groups on canvas)

---

## Deliverables

Output as `RESULT.md` containing:

1. **Data Model** — updated TypeScript interfaces for group cards
2. **Reducer Changes** — exact reducer cases for group operations
3. **Hook API** — `useCanvasState` additions for group management
4. **Component Specs** — GroupCard props, states, rendering logic
5. **Interaction Flows** — sequence diagrams for group/ungroup/rename/recolor
6. **CSS Specs** — exact classes, colors, spacing for group components
7. **Agent API** — how the AI agent creates and manages groups
8. **Smart Arrange Algorithms** — grid, stack, mosaic layout logic
9. **CanvasGrid Changes** — filtering logic for grouped cards
10. **Group List Panel** — side panel component spec
