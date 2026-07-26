# AiPage — Plan CRUD, Goals & Reminders, Calendar Synergy

## Raw Request

> the plan card doesnt have the feature of deleting a plan, viewing the detail of the plan and everything like that. theres like no way to view the detail theres no way to remove theres no way to edit. and WHATS EVEN THE HISTORY CARD?? IT SHOULD BE LIKE GOALS AND REMINDERS STUFF, and it should have like connections to the calendar or something. like we need to prioritize the USEFULLNESS of this page. i want some improvements on the history either to remove, and mainly the goals and stuff, and how much synergy that should be around these on how the tools can work together, and the AI being the orchestrator.

---

## Problem Statement

The AiPage (route `/ai`, component `AiPage.tsx`) has three critical usability gaps:

1. **Plan card has no CRUD operations.** The `PlanBoard` component shows long-term goals but only supports toggle done/active. There is no way to delete a goal, view its full detail, or edit its fields (title, description, category, priority). The `deleteGoal` IPC endpoint already exists in preload.ts + main.ts, and a legacy `LongTermPlanCard` component already has more functionality — but PlanBoard doesn't use any of it.

2. **History card is chat threads, not goals/reminders.** The `ChatHistory` drawer sits above the chat panel and shows chat thread history. The user wants this replaced with a **Goals & Reminders** section that shows upcoming calendar events, due goals, and reminders — connected to the calendar connector system.

3. **No synergy between goals, calendar, and AI.** Calendar events exist in the connector system (CalDAV → `connector_items` with `item_type = 'event'`) but are never surfaced alongside goals. The AI chat can create/update goals but has no awareness of calendar events or reminders.

---

## Context Bundle

Read **`agent/docs/ai-page-plan-crud/CONTEXT_BUNDLE.md`** first. It contains the full source code of every component, type, IPC endpoint, and DB schema referenced here.

All files and line numbers in this prompt refer to the codebase at the project root `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker`.

---

## Design

### Component Inventory (from MCP servers)

| Component | Source | Use For |
|-----------|--------|---------|
| dialog | shadcn | Goal detail/edit modal, delete confirmation |
| dropdown-menu | shadcn | Per-goal action menu (Edit, Delete, View Detail) |
| sheet | shadcn | Slide-over for goal detail (alternative to dialog) |
| card | shadcn | Reminder card, calendar event card |
| badge | shadcn | Priority badge, category badge |
| separator | shadcn | Visual sections in detail view |
| Trash2 | Lucide | Delete action icon |
| Pencil | Lucide | Edit action icon |
| Eye | Lucide | View detail icon |
| Bell | Lucide | Reminder icon |
| CalendarDays | Lucide | Calendar event icon |
| Clock | Lucide | Due time icon |

Re-skin all components to DeskFlow tokens (`bg-zinc-900/80 backdrop-blur-xl`, `rounded-xl`, `p-5`, dark mode only, Geist + JetBrains Mono fonts).

### Architecture

There are two separate subsystems to redesign:

#### A. PlanBoard — Add CRUD Operations

**Current (PlanBoard.tsx):** Renders `LongTermRow` per goal with only toggle + "Add" bulk import. No delete, edit, detail.

**What to add:**
1. **Per-goal action menu** (three-dot or dropdown) on each `LongTermRow` with: View Detail, Edit, Delete
2. **Detail view** — modal or expanded state showing full goal info: title, description, category, priority, status, target_seconds, created_at, completed_at
3. **Edit modal** — form fields for title, description, category (dropdown), priority (1-5), status toggle
4. **Delete with confirmation** — use existing `window.deskflowAPI!.deleteGoal(goalId)`
5. **Refresh after any CRUD** — call `props.onRetry()` or `loadLongTermGoals` equivalent

**IPC endpoints already available:**
- `deleteGoal(goalId)` — exists in preload.ts:849, handled in main.ts:14817
- `saveGoal(date, goal)` — can be used for edit (INSERT OR REPLACE)
- `getGoal(goalId)` — exists in preload.ts for single goal retrieval
- `saveGoalsBatch(goals)` — exists for batch operations

#### B. Replace ChatHistory with Goals & Reminders

**Current (AiPageDeck.tsx + AiPage.tsx):**
- `historySlot` renders `<ChatHistory>` from `src/components/ai/chat/ChatHistory.tsx`
- Floating `History` button (bottom-left) toggles the drawer
- `ChatHistory` shows chat threads with `{ threadDate, title, messageCount, preview }`

**What to replace with:**

A **Goals & Reminders** section that covers:

1. **Upcoming calendar events** — fetch from `connectors.items(id, { type: 'event', limit: 10 })` across all calendar connectors. Show event title, date/time, connector source.

2. **Overdue/upcoming goals** — goals with approaching deadlines or missed status. Query from existing goals data.

3. **Reminders** — either from a new `reminders` DB table (create if needed) or parsed from goals/events. Simple text + due date.

4. **AI-orchestrated suggestions** — the AI chat should be able to create reminders, link them to goals, and connect to calendar events.

**Layout options:**
- **Option A:** Replace the ChatHistory drawer entirely with a "Goals & Reminders" drawer at the same position (bottom-left floating button)
- **Option B:** Add a new expandable card in the deck's card grid (like Focus/Plan/Reflect) dedicated to Calendar + Reminders

---

## UX Flow

1. **Plan CRUD:**
   - Each `LongTermRow` gets a `···` dropdown button on hover (positioned right side)
   - Dropdown contains: "View Detail", "Edit", "Delete" with respective icons
   - "View Detail" opens a modal showing full goal info + a "Back" button
   - "Edit" opens a pre-filled form modal. Save calls `saveGoal()` and refreshes the list
   - "Delete" shows confirmation ("Are you sure? Deleting this goal cannot be undone.") with Cancel/Delete buttons. Delete calls `deleteGoal(goalId)` and refreshes
   - Loading states: spinner on the action button during save/delete. Error toast on failure
   - Empty state: current "No long-term goals yet" remains

2. **Goals & Reminders (replacing ChatHistory):**
   - Same position: floating bottom-left button toggles a drawer
   - Drawer has three tabs (Segmented control): "Events" / "Goals" / "Reminders"
   - Events tab: list of upcoming calendar events from connectors, grouped by date. Each shows time, title, connector name
   - Goals tab: overdue goals at top (red tint), then upcoming. Show status, priority, due date
   - Reminders tab: simple list with checkbox, add inline input at bottom
   - Clicking an event/goal opens the relevant detail
   - Empty state per tab: "No upcoming events" / "All goals on track" / "No reminders"

3. **AI Orchestration:**
   - The AI chat should be able to call: `createReminder(text, dueDate)`, `linkGoalToEvent(goalId, eventId)`, `getCalendarEvents(from, to)`
   - New IPC endpoints as needed for reminders + cross-linking

---

## Data Flow

### Plan CRUD:
```
User clicks Delete → confirm dialog → window.deskflowAPI!.deleteGoal(id)
  → main.ts 'delete-goal' handler → db.prepare('DELETE FROM goals WHERE id = ?').run(id)
  → refresh PlanBoard goals list ← window.deskflowAPI!.getLongtermGoals()
```

### Calendar Events:
```
User opens Goals & Reminders → loadConnectors() → for each calendar connector:
  window.deskflowAPI!.connectors.items(connectorId, { type: 'event', limit: 20 })
  → main.ts 'connectors:items' handler → SELECT * FROM connector_items WHERE connector_id = ? AND item_type = 'event'
  → render event list grouped by date
```

### Reminders (new if needed):
```
User creates reminder → window.deskflowAPI!.createReminder({ text, dueDate, goalId? })
  → main.ts handler → INSERT INTO reminders (id, text, due_date, goal_id, done, created_at)
  → return success
```

---

## Constraints

1. **No new dependencies.** Use existing Tailwind, Framer Motion, Lucide, shadcn (already present)
2. **Dark mode only.** All new components must match `bg-zinc-950/40` + `border-zinc-800/50` + `text-zinc-100` patterns
3. **StateShell pattern.** All new data-viewing components must handle loading/empty/error/ready states using the existing `StateShell` component from `src/components/ai/StateShell.tsx`
4. **Toast system.** Use existing `showToast` from AiPage.tsx for feedback
5. **Existing IPC preferred.** Do NOT add new IPC endpoints if existing ones can be adapted. New IPC is only for truly missing functionality (e.g., reminders)
6. **Keep the PlanBoard notes pane.** The notes/scratchpad segmented pane in PlanBoard must remain — only the goals pane gets enhanced
7. **ChatHistory deletion.** The ChatHistory component and its toggle button can be replaced (the user wants it gone), but chat thread data must remain accessible somewhere (move to a submenu in Settings or reduce to a compact button)

---

## Output Requirements

Provide a single comprehensive **RESULT.md** with:

1. **Phase 1 — Plan Board CRUD:** Exact changes to `PlanBoard.tsx`, `AiPage.tsx`, any new modal/dropdown components. Include props interfaces, all states (loading/empty/error/ready), and complete JSX.

2. **Phase 2 — Goals & Reminders Section:** Specification for the replacement of ChatHistory. Include component tree, state management, IPC call patterns, layout specs.

3. **Phase 3 — Calendar Synergy:** How calendar events from connectors get surfaced alongside goals. Any new IPC or DB schema needed for reminders + cross-linking.

4. **Backend Audit:** A table mapping every feature to its IPC channel, handler location, service class, and DB schema — with flags for anything that needs new backend code.

5. **Implementation Order:** Recommended sequence of changes, dependency order, and rebuild/verify steps.

Do NOT provide Options A/B/C. Design the single best version. Act as Lead Designer and Engineer — own the solution from the data pipeline to the pixel.
