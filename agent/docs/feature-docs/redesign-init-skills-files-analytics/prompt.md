# Technical Brief: AI Workspace Redesign

## Context

**Project:** DeskFlow — Electron/React desktop app (Tailwind v4, TypeScript, Vite)
**Target file:** `src/pages/TerminalPage.tsx` (~3500 lines, single-file sidebar tabs component)
**Design system:** Dark theme, zinc/gray palette with colored accent per tab (green=presets/sessions/analytics, purple=problems, blue=requests, yellow=files, cyan/teal=terminals)
**Existing sidebar tabs:** presets | sessions | map | **analytics** | problems | requests | **files** | terminals
**Data layer:** IPC bridge via `window.deskflowAPI`, backend services in `src/services/*.ts`, JSON file storage in `agent/` directory

## Problem Statement

The AI workspace sidebar has three tabs that feel unfinished and poorly integrated:

1. **Analytics tab** — shows two small boxes (total tokens, total cost) and an agent breakdown list. No charts, no trends, no time range selector, no meaningful visualizations. Data is available via `getAIUsageSummary` but is displayed as raw numbers with no processing.

2. **Files tab** — lists `agent/` directory files but renders their content as raw markdown in a `<pre>` tag (truncated to 2000 chars). Files like `state.md`, `debugging.md`, `problems.json` have rich structure that is invisible to the user. No search, no structured views, no edit capability.

3. **NewSessionDialog initialize mode** — includes problem/request checkboxes that are meaningless for workspace initialization. The init content should instead include infrastructure context: graphify knowledge graph, QMD templates, skills library, agent file references.

4. **No Skills management page** — skills are only visible as a dropdown in InstructionPanel. Users cannot browse, read full content, create, or edit skills from the sidebar.

5. **No visible checklist overview** — checklist items are embedded in problem/request detail modals. There is no top-level view of all checklist items, their status, approval state, or progress across all problems/requests.

The user's perception is that these features are "barren/empty" and that the AI isn't being set up with the right infrastructure context.

---

## Your Role

You are the **Lead Designer and Engineer**. You must design a single, comprehensive solution for all five problems above. Do not present options. Design the best version.

The solution must cover:
1. **Data Processing Pipeline** — how raw data gets transformed for display
2. **High-Fidelity Visual Specs** — exact layout, colors, spacing, chart types
3. **Interaction Flow** — click, hover, empty states, transitions

---

## Requirements

### 1. Analytics Tab — Data-Rich Charts

**Data available:**
- `getAIUsageSummary(period: 'day' | 'week' | 'month')` → `{ totalTokens, totalCost, totalRequests, byTool: Record<string, { tokens, cost, requests }> }`
- `getChecklists()` → `ChecklistItem[]` with `{ status, step, description, humanApproved, notes, parentType, parentId, createdAt, updatedAt }`
- `sessions` state array → `Session[]` with `{ topic, agent, status, product_area, created_at }`
- `getProblems()`, `getRequests()` — active counts

**Design a data processing pipeline that:**
- Aggregates token/cost data by agent across multiple periods for trend comparison
- Computes session metrics (sessions per day, avg session duration, agent distribution)
- Processes checklist data into completion rates by problem/request
- Caches or memoizes heavy computations to avoid re-render on unrelated state changes

**Visual spec:**
- Top row: 4 metric cards (Total Sessions, Total Tokens, Total Cost, Active Checklist Items) — large number + label + mini sparkline trend
- Time range selector: Today / Week / Month / All tabs at top
- Chart row 1: Token usage by agent — stacked bar chart or grouped bar, 7-day lookback
- Chart row 2: Cost breakdown — donut/pie chart by agent
- Chart row 3: Sessions over time — line chart with daily session count
- Chart row 4: Checklist completion rate — progress bar per problem/request with approved/completed/total breakdown
- All charts dark-themed (zinc background, green/cyan/purple accent colors matching existing tab scheme)
- Empty states: show a centered message with icon, no raw "No data" text

**Interaction flow:**
- Clicking a metric card navigates to relevant tab (e.g., clicking "Sessions" selects sessions tab)
- Hover on chart segments shows tooltip with exact values
- Time range selector re-fetches data and animates chart transitions
- All data is scoped to the sidebar width (~400px default, resizable)

### 2. Files Tab — Structured Markdown Browser

**Current state:** Lists files, shows raw markdown in `<pre>` (truncated 2000 chars).
**Desired state:** A markdown-aware file browser that parses and renders file contents with structure.

**Data available:**
- `readAgentFiles(projectPath)` → `AgentFile[]` with `{ name, path, isDirectory, content? }`
- `readAgentFile(filePath, projectPath)` → full file content as string
- `onAgentFileChanged` — real-time notification when agent files are modified by tracker-mind

**Design a data processing pipeline that:**
- Parses markdown frontmatter (YAML between `---` delimiters) to extract metadata (version, last_updated, tags, purpose)
- Detects file type and applies structural parsing:
  - `state.md` / `context.md` → section-based hierarchy (### headings → collapsible sections)
  - `PROBLEMS.md` / `REQUESTS.md` → table/list views with status badges
  - `debugging.md` → error pattern cards with search
  - `dictionary.md` → term search/filter list
  - `checklists.json` / `problems.json` / `requests.json` → structured JSON tree or table view
  - Generic `.md` → rendered markdown (headings, code blocks, lists, links)
- Maintains a search index for quick filtering across all files

**Visual spec:**
- Left pane: file browser tree (collapsible folders, file icons per type, real-time change indicator dot)
- Right pane: structured content view
  - state.md: version badge at top, section headings as collapsible accordion, recent changes as timeline
  - problems/requests: table with ID, title, status, priority columns, filter/search bar at top
  - debugging.md: pattern cards with error/solution split, search by error message
  - JSON files: formatted table or tree view depending on structure
- Top bar: search input (filters file list + content), sort toggle (name/mtime)
- Live change indicator: green pulse dot on files that changed within the last 10s
- Empty state: illustration + "Initialize your project" CTA

**Interaction flow:**
- Click file to view formatted content (not raw text)
- Click `{file}.md` heading to collapse/expand section
- Search filters both file list and highlights matching content
- Hover on file shows tooltip with mtime, line count, brief description (from frontmatter)
- Click status badge on problems/requests to change status inline

### 3. Initialize Mode — Infrastructure Context

**Current state:** Include problems/requests checkboxes, which are irrelevant.
**Desired state:** Init mode passes infrastructure context instead.

**Design the init content composition pipeline:**
- Step 1: Include Initialize.md content (the setup checklist)
- Step 2: Include agents.md (project instructions for the AI)
- Step 3: Include graphify context — read `graphify-out/` or GRAPH_REPORT.md and summarize architecture (god nodes, community structure)
- Step 4: Include QMD templates — list available templates in `agent/templates/`
- Step 5: Include skills library — list available skills with descriptions (from SkillsService)
- Step 6: Include selected agent files (user's choice, same as current)
- Step 7: **Remove** problems/requests sections entirely — they don't belong in workspace init
- Step 8: Include checklist context **only if** tied to the init process itself (not attached to specific problems/requests)

**Visual changes in NewSessionDialog:**
- Add graphify/QMD/skills toggle checkboxes (similar to existing agents.md toggle)
- Show preview of the composed init content with infrastructure sections clearly labeled
- Remove the "Related Problems" and "Related Requests" sections when in initialize mode
- Add infrastructure status indicators (green check if graphify data exists, yellow warning if not configured)

### 4. Skills Management Page

**Current state:** Skills only appear as a `<select>` dropdown in InstructionPanel. Users see only `name`.
**Desired state:** A full-page skill browser with CRUD and content preview.

**Data available:**
- `SkillsService.getSkills()` → `Skill[]` with `{ id, name, description, category, content, filePath }`
- Skills stored as `agent/skills/{id}/SKILL.md` or `agent/skills/{id}.md`
- Each skill has YAML frontmatter with `id`, `name`, `description`, `category`, `tags`, `version`

**Design a data pipeline that:**
- Groups skills by category (frontend-design, fix-problems, generate-prompt, maintain-context, etc.)
- Extracts frontmatter metadata for structured display
- Computes skill usage stats from session data or checklist context
- Supports skill creation (file write and frontmatter generation)

**Visual spec:**
- Category filter pills at top (row of clickable category badges)
- Grid of skill cards: icon/emoji (from frontmatter), name, description snippet, category badge, "Use" button
- Click a card → expand to full view with formatted markdown content, metadata panel (version, tags, created date)
- "Create Skill" button → inline form with name, category, description, content editor (textarea with markdown preview)
- "Edit" button on each skill → opens same form pre-populated
- Search bar to filter by name, description, or content

**Interaction flow:**
- Click category pill → filter grid to that category (active state on pill)
- Search filters as-you-type across all skills
- Click "Use" → closes skill browser, returns to InstructionPanel with that skill selected
- Click skill card → modal or expand with full content
- Empty state: "No skills found" with "Create your first skill" CTA

### 5. Checklist Overview

**Current state:** Checklist items only visible inside ProblemDetailModal / RequestDetailModal.
**Desired state:** A view (either as a dedicated tab or as a subsection of the Problems/Requests tab) showing all checklist items across all parent items.

**Data available:**
- `getChecklists()` → `ChecklistItem[]` with `{ id, parentType, parentId, step, description, status, humanApproved, notes, createdAt, updatedAt }`
- Linked via `parentType` (problem/request) → `parentId`

**Design a data pipeline that:**
- Groups checklist items by parent (problem/request)
- Computes aggregate stats: total items, completed, approved, pending
- Sorts by completion status (pending first) and by step number
- Links back to parent problem/request for context

**Visual spec:**
- Summary bar at top: "# done / # total — # approved" with progress bar
- Grouped list by parent: parent title as group header, then checklist items with status checkbox, step number, description, approval badge, truncated notes
- Click parent header → opens the relevant detail modal
- Click checkbox → toggles status (same as ModalChecklist behavior)
- Click notes → expand inline notes editor (same as existing implementation)

**Interaction flow:**
- Checkbox toggle updates item status in real-time (calls `updateChecklistItem`)
- Approve/revoke button beside each completed item
- Expand notes with inline textarea (Ctrl+Enter to save)
- Empty state: "No checklist items yet"

---

## Constraints

1. All new UI must use existing dark theme palette: zinc-800/900 backgrounds, zinc-300/400 text, green-400/500 accents (can use purple, blue, amber for tab-specific accents)
2. All components are SFCs defined inline in `TerminalPage.tsx` (follow existing pattern unless extracting is necessary)
3. Data fetching must use existing IPC bridge (`window.deskflowAPI`) — no new IPC channels unless CRITICAL
4. No external chart libraries — Chart.js is already a dependency (`^4.5.1`) and used elsewhere in the app (Dashboard, Stats pages). Use the same `react-chartjs-2` wrapper.
5. Must pass `npm run build` (renderer + electron) with no TypeScript errors
6. Tailwind v4 syntax must be used (`@import "tailwindcss"` in index.css, v3 directives will break)
7. Sidebar width is ~400px default, resizable — all charts and layouts must work within this constraint
8. No dead code — if a component/function becomes unused, remove it or mark explicitly as preserved

## Deliverable

Provide a single comprehensive implementation plan covering:
1. Data processing logic and pipeline for each of the 5 areas
2. Exact component structure (what JSX/TSX to write, where to place it)
3. Visual specifications with colors, spacing, typography from the existing design system
4. Interaction flow for all states (loading, empty, error, populated)
5. Modification plan for existing files (what to remove, what to change, what to add)
6. Build verification steps

The user will review and approve before implementation begins.
