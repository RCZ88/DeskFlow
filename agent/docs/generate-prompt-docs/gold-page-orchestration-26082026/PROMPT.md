# PROMPT.md — Self Page Orchestration Design

## Raw Request (verbatim)

"DESIGN ON HOW THE NOTES, THE TODOLIST, Deadlines, GOALS, SCHEDULE, AND EVERYTHING IN RELATION OF THOSE CAN BE ORCHESTRATED PROPERLY AND BE IN HARMONY AND INTERCONNECTED WITH ONE ANOTHER. USE THE EXISTING CONCEPTS LIKE WHAT DOES IT MEAN BY BE ABLE TO COMMUNICATE AND INTERCONNECT TO ONE ANOTHER. THE PROMPT SHOULD ALSO INCLUDE THE REQUEST FOR THE UI COMPONENTS TO INCLUDE THOSE AND THE PROPER BACKEND LOGIC."

---

## Context

Read `CONTEXT_BUNDLE.md` first. It contains the actual DB schemas, IPC endpoints, existing components, and cross-feature links for all six systems: Schedule, Deadlines, Goals, Notes, Context Brain, and Profile.

The project is a desktop Electron + React + SQLite app called DeskFlow (RHEO). The Gold page (`src/features/warmth/gold/GoldPage.tsx`, `pageTab === 'gold'`) currently shows goals, deadlines, schedule blocks, and long-term goals in separate cards/sections. The user wants these six systems to function as ONE living, interconnected organism — not six separate panels.

---

## The Design Mandate

Design a **Unified Self System** where Schedule, Deadlines, Goals, Notes, Context Brain, and Identity are not separate features but facets of the same mind. Every element should know about and reference the others. The user should never have to hunt across six pages to understand their life.

Think of it this way: right now, a deadline is just a date in a table. But a deadline is also a goal endpoint, a schedule pressure, a knowledge graph entity, a note subject, and a signal in your identity profile. ALL of these relationships must be visible and navigable.

---

## Engineering Task: The Orchestration Layer

Design the data processing and connection logic that makes these six systems communicate.

### 1. The Relationship Graph

Every item in the system should know its connections:
- **Schedule block** → knows which goals target it (`cross_feature_link`), which deadlines fall during it, which notes reference it
- **Goal** → knows its parent long-term goal, its linked schedule block, its deadline, related context brain entities, related notes
- **Deadline** → knows its linked goals, related schedule blocks, related notes, context brain entity
- **Note** → knows which goals/deadlines/schedule blocks it references (via `links` JSON), related context brain entities
- **Context Brain entity** → knows which goals/deadlines/schedule blocks/notes it relates to (via facts)
- **Identity profile** → emerges from patterns across all of the above

Design the queries and data structures that compute these relationships in real-time. Consider:
- A "connection index" that maps every item ID to its related items across all six systems
- How to compute this efficiently (pre-computed on save? lazy queried? cached?)
- What the query shape looks like (JOINs across tables? Application-layer stitching?)

### 2. The Today View

Design what "today" means as a unified concept. Today has:
- Active schedule block (time-aware: which block is now?)
- Active goals (linked to today's schedule or due today)
- Approaching deadlines (due today or soon)
- Relevant notes (tagged or linked to today's goals/schedule)
- Context brain entities (active knowledge related to today's activities)
- Identity signals (patterns: "you usually study at this time", "you're behind on X")

The Today View should show ALL of this as one coherent picture, not six separate cards.

### 3. The Connection Explorer

Design a detail view where clicking any item shows ALL its connections across systems. Example: clicking "Study Math" (a schedule block) shows:
- Goals that target this block
- Deadlines that fall during or near this block
- Notes that reference this block
- Context brain entities related to "Math"
- Identity signals about study patterns

### 4. Backend Requirements

For each new connection or query needed, specify:
- New IPC channel (if needed) or modification to existing one
- SQL query or application logic
- Data shape returned
- Which existing tables are involved (NO new tables unless absolutely necessary)

---

## Design Task: The Visual System

Design how the Self page visually represents these connections.

### 1. The Unified Layout

The Self page should NOT be three stacked sections. Design a layout that shows the interconnected nature of the data. Consider:
- A central "mind map" or "network" view where all items are nodes and connections are edges
- A timeline view that shows how schedule/goals/deadlines interleave through the day
- A "radar" or "orbit" view where related items cluster together

### 2. Visual Connection Language

Design how connections are shown visually:
- Lines/arcs between connected items
- Color coding by system (schedule=cyan, goals=emerald, deadlines=amber, notes=violet, brain=pink)
- Proximity = relationship strength
- Shared elements (e.g., a deadline card that also shows its linked goals inline)

### 3. State Coverage

Every section must handle:
- **Loading** — skeleton matching content shape
- **Empty** — "No schedule blocks yet" with CTA to add one
- **Error** — clear message + retry
- **Populated** — the full interconnected view

### 4. Motion

Apply the Motion skill's L2 budget:
- Staggered entrance for list items
- Smooth transitions between views
- Hover lift on interactive cards
- No ambient motion behind text

### 5. Typography & Tokens

Use the existing design system from `src/components/ai/`:
- `GlassCard` for cards
- `SectionHead` for section headers
- `StateShell` for state management
- `tokens.ts` for colors (ACCENT, TEXT, SURFACE, RING)
- `lib/motion.ts` for animations
- Fonts: Source Serif 4 (headline), Geist (body), JetBrains Mono (data)

---

## UX Task: The Interaction Flow

Design the user journey:

1. **Entry**: User opens Self tab → sees Today View (what's happening now)
2. **Explore**: User clicks a schedule block → sees connected goals, deadlines, notes
3. **Drill down**: User clicks a goal → sees its parent long-term goal, schedule link, deadline, related brain entities
4. **Add connection**: User creates a goal and can link it to a schedule block and deadline inline
5. **Overview**: User zooms out to see the full network of all connections
6. **Patterns**: Identity section shows patterns derived from the connections (not just raw data)

---

## Constraints

1. **No new DB tables** unless absolutely necessary. Use existing tables and cross-reference via IDs.
2. **Reuse existing IPC endpoints** wherever possible. Only create new ones for queries that don't exist.
3. **Reuse existing components** (GlassCard, SectionHead, StateShell, tokens) — do NOT create a new design system.
4. **Must work with the existing preload bridge** — new IPC channels need preload bridges.
5. **Performance**: The connection index must not block the main thread. Consider web workers or lazy computation.
6. **The graph is the backbone**: The Context Graph (ContextGraphView) should be the visual backbone that connects everything. Schedule blocks, goals, deadlines, and notes should all appear as nodes in the graph with different visual treatments.

---

## Output Format

Produce a RESULT.md with:

1. **Architecture Overview** — diagram of how the six systems connect
2. **Backend Specification** — new/modified IPC endpoints, SQL queries, data shapes
3. **Frontend Specification** — component hierarchy, layout, visual design
4. **Interaction Design** — user flows, state transitions, feedback
5. **Implementation Plan** — ordered list of files to create/modify

Each section must reference actual file paths and line numbers from CONTEXT_BUNDLE.md.
