# 🧠 Tracker Mind - AI Agent Command Center

## Context: The "Why"

**User's Vision:** Currently, managing multiple AI agent sessions is chaotic. When running 5+ opencode/claude agents in different terminals across multiple projects, users lose track of:
- Which terminal is working on which problem
- What the AI was last doing
- What needs user input/testing
- Where to send new instructions

**The Core Problem:** AI agents output to terminals, but terminals provide no context about *what* they're discussing. Users must manually track everything in their head or in separate notes.

**The Solution:** A "Tracker Mind" workspace that binds problems to terminals, auto-updates from AI output, and provides clear visual feedback about what each agent is doing.

---

## The Mandate

Design a **high-fidelity solution** for Tracker Mind that transforms the Terminal workspace from "dumb terminal multiplexor" into an "AI Agent Command Center".

This is NOT about adding features one-by-one. This is about designing an **integrated system** where:
1. Problems flow naturally into terminals
2. AI output updates the UI in real-time
3. Every terminal shows its mission at a glance
4. Skills guide the AI's approach automatically

---

## Feature 1: Terminal-Problem Binding

### Problem Statement
When a user has 5 terminals open, there's no way to know which is debugging, which is adding features, which is refactoring. The user must mentally track this or add manual labels.

### Engineering Task
Design the **data binding architecture**:
- How to store terminal ↔ problem relationships
- How to persist bindings across app restarts
- How to handle terminal close/crash (orphan binding cleanup)
- How to support multiple terminals per problem (parallel work)
- How to suggest/create terminal when problem has no binding

### Visual Specs Required
Design the **terminal header badge** that shows:
- Problem ID badge (e.g., "#73" with purple background)
- Problem title (truncated to N chars)
- Status indicator (dot: green=active, yellow=waiting, gray=idle)
- Assignment: "Terminal 3 of 5"

Design the **binding flow UI**:
- Dropdown to assign existing problem to terminal
- Button to "Create terminal for this problem"
- Auto-detection: if terminal output mentions issue number, prompt to bind

### UX Flow Required
1. User clicks problem in sidebar → "Open in Terminal" button
2. If matching terminal exists → focus it, highlight binding
3. If no match → create new terminal with pre-filled context
4. Terminal header shows binding badge
5. If AI mentions "Issue #XX" in output → prompt: "Bind this terminal to Issue #XX?"

---

## Feature 2: Send Instructions to Terminal

### Problem Statement
Currently, to give AI instructions, users must manually switch to terminal and type. This breaks flow. The UI should allow sending instructions directly from problem context.

### Engineering Task
Design the **instruction pipeline**:
- How to route instructions from UI → correct terminal
- How to handle terminal not ready (buffer instructions?)
- How to preserve context (append vs replace)
- How to handle multiple terminals bound to same problem
- How to show instruction was sent (confirmation feedback)

### Visual Specs Required
Design the **problem detail panel** with instruction area:
- Multi-line textarea for instructions
- Character/line counter
- "Send" button with loading state
- "Sent to Terminal #3" confirmation toast
- History of sent instructions (collapsible)

Design the **inline terminal input** (optional alternative):
- Input field directly in terminal header
- Type + Enter to send
- Auto-focus on terminal switch

### UX Flow Required
1. User opens problem detail modal
2. Types instructions in textarea
3. Clicks "Send" or presses Cmd+Enter
4. Instructions appear in bound terminal
5. Toast confirms "Sent to Terminal 3"
6. Terminal auto-focuses
7. User sees AI begin processing

---

## Feature 3: Skill Selection

### Problem Statement
Different problems require different AI approaches. Users should select a "skill" that provides context/instructions to the AI automatically.

### Engineering Task
Design the **skill system**:
- How to load skills from `agent/skills/` directory
- How to display skill options (icons, descriptions)
- How to inject skill context into terminal (prompt prefix)
- How to allow multiple skills per problem
- How to suggest skills based on problem category/priority

### Visual Specs Required
Design the **skill selector UI**:
- Grid of skill cards (icon + name + short description)
- "Selected" state with checkmark
- Multi-select capability
- Skill tags shown on problem detail

Design the **skill injection display**:
- When terminal receives skill context, show "Context loaded: [skill names]"
- Collapsible "View loaded skills" section

### UX Flow Required
1. User creates/edits problem
2. Skill selector shows available skills
3. User selects relevant skills (e.g., "fix-problem", "refactor", "design-ui")
4. When problem is sent to terminal, skill context is prepended
5. AI receives: "You are working on [skill context]. Now: [user instructions]"

---

## Feature 4: Requests Tab

### Problem Statement
Problems track bugs. Requests track features. Currently only Problems exists. Need Requests tab parallel to Problems.

### Engineering Task
Design the **RequestService** (parallel to ProblemsService):
- How to parse `agent/REQUESTS.md`
- How to create/update requests
- How to transition status (pending → in_progress → implemented)
- How to link requests to problems (feature → implementation bugs)

### Visual Specs Required
Design the **Requests tab** (parallel to Problems tab):
- Same filter structure (all/pending/in-progress/implemented)
- Different color scheme (blue for requests, purple for problems)
- Request cards showing: title, status, priority, linked issues
- "New Request" dialog with fields: title, description, priority, category

Design the **request-problem link**:
- Show "Implements: Request #X" on related problems
- Show "Related Issues: #73, #74" on request detail

### UX Flow Required
1. User clicks "Requests" tab in sidebar
2. Sees list of feature requests
3. Can create new request → appears in REQUESTS.md
4. Can mark request as "in progress" → creates linked problem
5. Can mark request as "implemented" → auto-marks linked problems

---

## Feature 5: Live Parsing from AI

### Problem Statement
AI agents write to PROBLEMS.md, REQUESTS.md, state.md. Currently UI only refreshes on manual action. Should update automatically when AI writes.

### Engineering Task
Design the **file watcher system**:
- How to detect file changes (fs.watch vs polling)
- How to debounce rapid changes
- How to parse only changed sections (not full re-parse)
- How to handle conflict (user + AI editing simultaneously)
- How to notify user of AI updates

### Visual Specs Required
Design the **update notification**:
- Subtle indicator when problems updated ("3 new updates")
- Click to see diff: "Issue #73: Fixed → In Progress by AI"
- "Dismiss" vs "View" options

Design the **live status indicator**:
- Terminal header shows "AI updating..." when AI writes to agent files
- Pulse animation on problem badge when updated
- Toast: "AI updated PROBLEMS.md - Issue #73 marked as Fixed"

### UX Flow Required
1. AI writes to PROBLEMS.md mid-session
2. File watcher detects change
3. UI parses updated content
4. Notification appears: "AI updated Issue #73"
5. Problem badge pulses purple
6. User clicks to see AI's update
7. User can verify/override AI's changes

---

## Hard Constraints

1. **Must use existing markdown files** - agent/PROBLEMS.md, agent/REQUESTS.md, agent/state.md
2. **Must persist bindings** - SQLite via existing `terminal_bindings` table
3. **Must work with current terminal system** - xterm.js, node-pty, existing IPC
4. **Must not break existing features** - presets, sessions, split panes all still work
5. **Must be in TerminalPage sidebar** - not a separate page
6. **Must handle offline gracefully** - if AI isn't running, all features still work

---

## Integration Points

| Component | File | What to Modify |
|-----------|------|---------------|
| Terminal bindings | `src/main.ts` | Add IPC handlers for binding CRUD |
| Terminal header | `src/components/TerminalWindow.tsx` | Add binding badge display |
| Problems service | `src/services/ProblemsService.ts` | Add parsing for binding fields |
| Requests service | `NEW: src/services/RequestsService.ts` | Parallel to ProblemsService |
| Skills loader | `NEW: src/services/SkillsService.ts` | Load from agent/skills/ |
| File watcher | `src/main.ts` | Add fs.watch for agent/*.md |
| Preload APIs | `src/preload.ts` | Add binding, skill, request APIs |
| TerminalPage | `src/pages/TerminalPage.tsx` | Add Requests tab, binding UI |

---

## Expected Deliverables

1. **Data Processing Pipeline** - How bindings, skills, requests flow through the system
2. **High-Fidelity Visual Specs** - Exact colors, spacing, animations for all new UI elements
3. **Interaction Flows** - Step-by-step flows for each major action
4. **Component Architecture** - New components needed and their responsibilities
5. **IPC Contract** - New API endpoints required

---

## Success Metrics

- User can assign problem to terminal in 2 clicks
- Terminal shows problem context at all times
- Instructions sent from problem modal appear in terminal
- Skills inject automatically when terminal opens
- Requests tab mirrors Problems tab functionality
- AI updates appear in UI within 5 seconds
- Zero manual markdown editing required for problem/request management
