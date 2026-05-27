# DeskFlow AI Agent Instructions

## ⚡ MANDATORY: Read AGENTS.md First

**At the START of EVERY session, you MUST read agent/AGENTS.md** before doing anything else. This file contains:
- All project rules and constraints
- Critical warnings (e.g., NEVER use git commands, Tailwind v4 rules)
- Behavioral guidelines
- How to use knowledge systems (graphify, LLM wiki)
- Current active issues
- The "idiot" auto-reflect trigger

If you do NOT read AGENTS.md, you will miss critical rules and break the project. This is the #1 instruction.

---

You are an AI agent operating within **DeskFlow**, a desktop productivity tracking application built with Electron, React, TypeScript, and SQLite. You have access to the full codebase, databases, and IPC bridge to interact with the application.

---

## Your Environment

You run in a **multi-pane terminal workspace** at \`/terminal\`. The UI has:

- **Terminal panes** — Multiple split terminals running via node-pty. You can create, close, and rearrange them.
- **Sidebar** (left, ~400px) — Tabs for Presets, Sessions, Map, Analytics, Problems, Requests, Checklists, Files, Skills, Configs.
- **Header bar** — Project selector, New Session, Open Terminal, Initialize Agent buttons.
- **InstructionPanel** — Full composer for building prompts with problem/request context and skills.

You run in a **terminal shell** (node-pty). You cannot call JavaScript IPC methods. Instead, you communicate with DeskFlow through **three mechanisms**:

### Mechanism 1: Structured Output Blocks
When you output these blocks in your response, the system automatically parses and executes them:

**Session Metadata** — Updates your session's topic, status, category:
\`\`\`
## Session Metadata
- Title: Short descriptive title
- Description: 1-2 sentences explaining the goal
- Status: active | paused | completed
- Product Area: Dashboard | Settings | Terminal | Database | External Page | IDE Page
- Category: bug-fix | feature | refactor | research | review
\`\`\`

**Actions** — Creates/updates problems, checklists, requests:
\`\`\`
## Actions
- [create-problem] Problem Title - priority: high - category: bug-fix - description: What's broken
- [update-problem] ProblemID - status: In Progress
- [complete-checklist] checklist-item-id
\`\`\`

### Mechanism 2: File Writes (agent/*.json)
You can write directly to JSON files in the \`agent/\` directory. The system watches these files with \`fs.watch\` and reacts in real-time:

**Problems** — \`agent/problems.json\`:
- Create: Write a new problem object to the array
- Update: Modify the matching problem's \`status\` field
- Delete: Remove the problem object

**Requests** — \`agent/requests.json\`:
- Create: Write a new request object to the array
- Update: Modify the matching request's \`status\` field

**Checklists** — \`agent/checklists.json\`:
- Create: Write a new checklist item (parentType, parentId, description, status)
- Update: Modify the matching item's status

**AI Tasks** — \`agent/ai-tasks.json\`:
- Report progress: Set \`tasks[0].status\` to \`completed\` when done

### Mechanism 3: actions.json Queue
Write structured actions to \`agent/actions.json\` for batch execution:
\`\`\`json
{
  "terminal_id": "term-xxx",
  "actions": [
    { "type": "create_problem", "title": "...", "priority": "high", "category": "bug-fix", "description": "..." },
    { "type": "update_problem", "id": "1.5", "status": "FIXED" },
    { "type": "complete_checklist", "id": "problem-1.5-step-1" },
    { "type": "update_request", "id": "1", "status": "IMPLEMENTED" }
  ]
}
\`\`\`

---

## Session System

Your conversation is tracked as a **Session** in the \`terminal_sessions\` table. Sessions have:

- \`id\` — Format: \`session-{timestamp}\`
- \`agent\` — Your type: "opencode", "claude", "aider", "codex", or "custom"
- \`topic\` — Session title — set via \`## Session Metadata\` block
- \`category\` — "bug-fix" | "feature" | "refactor" | "research" | "review" | "other"
- \`status\` — "active" | "paused" | "completed" | "archived"
- \`product_area\` — Which part of DeskFlow

**How to update session metadata:**
Output a \`## Session Metadata\` block in your response. The system parses it and updates the database automatically. Examples:

- When starting a task: set topic, product area, category
- When switching focus: update topic
- When done: set status to "completed"

**IMPORTANT: Session Topic Naming**
- NEVER use formats like "Instruction: Xp Yr" or shorthand
- ALWAYS use descriptive, human-readable titles
- Good: "Fix terminal height sizing", "Add cancel button"
- Bad: "Instruction: 0p 0r", "Fix bug"

---

## Task Management: Problems, Requests, Checklists

### Problems (Bug/Issue Tracking)

Problems live in \`agent/problems.json\`. Each has:

- \`id\` — Format: "X.Y"
- \`title\`, \`description\`, \`root_cause\`, \`fix_description\`
- \`status\` — NEW → IN_PROGRESS → TESTING → FIXED → CLOSED
- \`priority\` — "critical" | "high" | "medium" | "low"

**How to create/update problems:**

Method A — \`## Actions\` block (easiest):
\`\`\`
## Actions
- [create-problem] Login button broken - priority: high - category: bug-fix - description: Clicking login does nothing
- [update-problem] 1.5 - status: In Progress
\`\`\`

Method B — Write to \`agent/actions.json\`:
\`\`\`bash
node -e "
const p='agent/actions.json'