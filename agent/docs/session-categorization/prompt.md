# Session Categorization & @mention Routing System

## Context

You are designing a subsystem for **DeskFlow** (an Electron + React + TypeScript + Tailwind v4 desktop app with SQLite storage). The app has a "Tracker Mind" terminal workspace where users run multiple AI coding agents (opencode, claude) in split-pane terminal layouts. Each terminal runs an AI agent session.

### Current State

- **Terminal sessions** are stored in SQLite `terminal_sessions` table: `{ id, preset_id, project_id, agent, resume_id, topic, working_directory, terminal_id, total_tokens, total_cost, created_at, updated_at }`
- Each session has one `topic` field — a free-text string, often empty or generic ("Unnamed Session")
- Terminal tabs show the tab name ("Terminal 1") and a small topic label if one exists
- The sidebar "Sessions" tab lists all sessions with their topic, agent type, and date
- The "Terminals" sidebar tab shows running terminals with their session binding
- The `terminal_messages` table stores chat history per session: `{ id, session_id, role, content, created_at }`
- Sessions are exported to `agent/terminal-sessions.json` during workspace init
- AGENT.md and INITIALIZE.md are auto-generated but contain no session-level metadata instructions for AI agents
- The `workspace_problems` table has a `category` field (text); `workspace_requests` has one too

### Current Limitations

1. **No session categorization**: Sessions have only a `topic` string. No category, product area, or status fields. Users can't filter sessions by what they're working on (bug fix vs feature vs refactor).
2. **No @mention routing**: Users type input into a single "Send" bar that writes to the active terminal. There's no way to type `@term3 fix this bug` and have it route to terminal 3.
3. **No AI metadata contract**: The AGENTS.md/INITIALIZE.md don't instruct AI agents to provide structured metadata (title, description, status, area) for their sessions. The AI outputs free text that isn't parsed.
4. **No session organization**: Sessions are a flat list sorted by date. No grouping, no filtering, no way to see "all feature work" vs "all bug fixes."
5. **Messages are isolated**: `terminal_messages` stores raw text. No extraction of decisions, action items, or categorized content from the conversation.

### Key Files

- `src/main.ts` — Electron main process, SQLite schema + IPC handlers
- `src/pages/TerminalPage.tsx` — Main terminal workspace UI (2854 lines)
- `src/components/TerminalWindow.tsx` — Split-pane terminal layout component
- `src/components/MapEditor.tsx` — Drag-and-drop layout editor with @dnd-kit
- `src/preload.ts` — IPC bridge layer
- `agent/skills/generate-prompt/SKILL.md` — This prompt was generated using it
- `agent/state.md` — Project state tracking
- `agent/AGENTS.md` — Auto-generated during workspace init
- `agent/INITIALIZE.md` — Auto-generated init guide for AI agents

### Visual Design Tokens

- Background: `#0d0d0d` (terminal), `#18181b` (zinc-900, sidebar)
- Accent: `#10b981` (emerald-500, active), `#06b6d4` (cyan-500, session), `#3b82f6` (blue-500, link)
- Text: `#e4e4e7` (zinc-200, primary), `#a1a1aa` (zinc-400, secondary), `#71717a` (zinc-500, muted)
- Buttons: pill-shaped, small text (`text-xs`), rounded (`rounded` or `rounded-md`), colored hover states
- Terminal theme: dark background (`#0d0d0d`), green cursor (`#00ff00`), green accent (`#0dbc79`)
- Layout: Tailwind v4, utility classes, flexbox, small text (8-12px), tight spacing (1-2px padding)

---

## The Mandate

Design a **comprehensive technical and visual specification** for a Session Categorization & @mention Routing system. This is NOT a set of independent features — it is an **integrated system** where:

1. Sessions automatically categorize themselves based on AI agent conversation content
2. Users can @mention any terminal by name or number to route input directly to it
3. AI agents are prompted to provide structured session metadata (title, description, status, product area)
4. The sidebar and terminal tabs reflect organized session categories in real-time
5. Session messages are parsed for decisions, action items, and status updates

Your design must cover **data processing logic**, **visual specifications**, and **interaction flow** in a single unified solution. Do NOT offer multiple options — design the best solution.

---

## Requirement Checklist

### 1. Data Processing Pipeline

**Session Categorization:**
- Add `category` (enum: `bug-fix`, `feature`, `refactor`, `research`, `review`, `other`), `status` (enum: `active`, `paused`, `completed`, `archived`), `product_area` (free-text), `description` (text), `auto_tags` (JSON array) fields to the session model
- Design how categories are auto-assigned: keyword detection in AI output → weighted scoring → category suggestion (user confirms or overrides)
- Design how `product_area` is extracted: parse AGENTS.md/PROBLEMS.md references in AI output → map to known areas
- Design how session `status` transitions work: active → paused (user action or idle timeout) → completed (user marks done) → archived (auto after N days)
- Design how `auto_tags` are populated: detect issue numbers (`#123`), file paths (`src/foo.ts`), and technology mentions (`React`, `SQLite`) from messages
- Design the migration path: existing `terminal_sessions` table needs new columns; provide ALTER TABLE + fallback

**@mention Detection:**
- Design how the "Send" input bar detects `@term<N>` or `@tab-name` patterns
- Design how @mentions resolve to terminal IDs (by number, by tab name, by fuzzy match)
- Design what happens when @mention references a closed/dead terminal (create new? show error?)
- Design the message routing pipeline: parse @mention → resolve terminal ID → write to target terminal → log to session messages → auto-categorize if not yet set

**Message Parsing:**
- Design how to extract structured data from `terminal_messages` content:
  - Decisions made (lines with "decision:", "going with", "let's use")
  - Action items (lines with "todo:", "need to", "next step")
  - Status changes (lines with "fixed", "done", "complete", "blocked on")
  - References (issue numbers, file paths, technology names)
- Design the storage format: new table `session_parsed_items` or JSON field on `terminal_messages`?
- Design when parsing runs: real-time on message insert vs batch after session ends

### 2. Visual Specifications

**Session Category Badges:**
- Design the badge component for session categories (bug-fix=red, feature=blue, refactor=purple, research=teal, review=amber, other=gray)
- Specify exact hex codes, padding, border radius, font size, and icon for each category
- Show where badges appear: terminal tab bar, session list, terminals sidebar

**Session Card Redesign:**
- Redesign the session list item to show: badge + title + description preview + status dot + timestamp + tag pills
- Specify layout (flex row, columns), truncation behavior, hover state, and responsive breakpoints
- Show the "closed" vs "active" visual distinction

**@mention Autocomplete Dropdown:**
- Design the dropdown that appears when user types `@` in the Send bar
- Show: terminal number, name, agent type, category badge, session topic
- Specify: backdrop, max-height, scroll behavior, keyboard navigation (arrow keys + Enter), highlight matching text
- Show selected state vs hover state vs empty state

**Terminal Tab Enhancement:**
- Redesign terminal tab to show: [category badge] Terminal Name [status dot]
- Add category badge and status dot to the existing tab bar design (dark zinc background, green top border when active)
- Specify exact spacing and sizing to fit within the existing 36px tab bar

**Category Filter / Grouped View:**
- Add a row of filter pills above the session list: All | Bug Fix | Feature | Refactor | Research | Review
- Active pill = filled color matching category, inactive = transparent with border
- When a filter is active, sessions list is filtered to that category

### 3. Interaction Flow

**@mention Flow:**
1. User types `@` in Send input bar
2. Autocomplete dropdown appears with all running terminals (and optionally closed sessions)
3. User continues typing to filter (`@term` matches "Terminal 1", "Terminal 3")
4. User selects via click or press `Enter`
5. Text in bar shows `@Terminal 1 >> "
6. User types message and presses Enter/Send
7. Message is written to the @mentioned terminal AND logged in its session_messages
8. Toast confirms "Sent to Terminal 1" (green, 3s auto-dismiss)
9. If the target has no session → auto-create one with category from message content

**Session Category Assignment Flow:**
1. When a new session is created, it starts as "uncategorized"
2. After N messages (configurable, default 5), auto-analysis runs on session messages
3. Auto-analysis assigns tentative category + product_area + tags
4. User sees a subtle suggestion indicator on the session: "Categorized as Feature? [Accept] [Change]"
5. User accepts (one click) or opens edit to change
6. User can also manually set category at any time via session context menu

**Session Status Flow:**
1. Active session: green pulse dot in tab bar and sidebar
2. User clicks "Pause" on session → status = paused → dot turns yellow
3. User marks "Complete" → status = completed → dot turns gray with checkmark
4. After 14 days idle → auto-archived → moved to "Archived" section
5. Archived sessions can be restored (which re-activates them)

**AGENT.md Metadata Contract Flow:**
1. During workspace init (tracker-mind-setup), AGENTS.md includes a new section instructing AI agents to provide structured metadata
2. The instruction template tells the AI to output at the start of each session:
   ```
   ## Session Metadata
   - Title: [descriptive title]
   - Description: [what this session is working on]
   - Status: [active/paused/completed]
   - Product Area: [which part of the app]
   - Category: [bug-fix/feature/refactor/research/review]
   ```
3. When the AI outputs this metadata, the app parses it from terminal_messages and updates the session record
4. If the AI doesn't provide metadata, the app falls back to auto-analysis after N messages

### 4. Constraints

- Must work with existing SQLite schema (add columns, don't break existing sessions)
- Must use existing IPC pattern (preload bridge → main.ts handler → renderer callback)
- Must fit within existing TerminalPage component architecture (2854 lines)
- Must not break the existing session save/resume/delete flow
- Must work with the MapEditor drag-to-split layout system
- @mention routing must work even if the target terminal is behind (buffered writes)
- The AGENT.md metadata section must be language-agnostic (works for opencode, claude, any AI agent)
- Category auto-analysis must be async and non-blocking (don't delay message display)
- Must support both keyboard and mouse interaction for @mention selection
- Must handle edge cases: @mention to own terminal, @mention to non-existent terminal, @mention in the middle of text

---

## Output Format

Produce a single comprehensive specification document (`RESULT.md`) covering:

1. **Database Schema Changes** — exact SQL for new columns and tables (with migration handling for existing DBs)
2. **Data Processing Pipeline** — algorithms for categorization, @mention parsing, message extraction (pseudocode or TypeScript)
3. **Backend IPC Changes** — new or modified IPC handlers with request/response shapes
4. **Frontend Component Architecture** — component tree, props, state management approach
5. **Visual Design Spec** — exact hex codes, spacing, typography, component dimensions
6. **Interaction Flow Diagrams** — step-by-step flows for all 4 major flows above
7. **AGENT.md Template Update** — exact new section to add to the auto-generated AGENTS.md
8. **Migration Plan** — how to roll this out without breaking existing sessions
