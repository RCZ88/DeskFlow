# CONTEXT_BUNDLE: Terminal Compose Redesign + Design Workspace

## ═══════════════════════════════════════════════════════════════
## PART 0: FRONTEND DESIGN SKILLS SYSTEM — FULL REFERENCE
## ═══════════════════════════════════════════════════════════════

All source docs at: `agent/docs/frontend-design-skills-25052026/UI UX Workspace Infrastructure/`

### Already Implemented in src/ (back-end)

**`src/services/ContextConfig.ts`** (49 lines total)
- `design_skills` schema in `ContextConfig.systems`:
  ```typescript
  design_skills: {
    enabled: boolean;
    max_tokens: number;       // default 800
    skills: string[];          // e.g. ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill']
    levels: {
      design_variance: number;   // 1-10, default 5
      motion_intensity: number;  // 1-10, default 5
      visual_density: number;    // 1-10, default 7
    };
    include_references: boolean;
  };
  ```

**`src/services/ContextService.ts`** — `buildDesignSkillsContext()` at lines 335–393
- Reads knob values from config
- Iterates 5 design skill dirs: `frontend-design`, `impeccable`, `ui-ux-pro-max`, `taste-skill`, `design-taste`
- For each: reads `agent/skills/<name>/SKILL.md`, parses frontmatter, truncates to 600 chars excerpt
- Appends `design-taste` master skill (400 chars excerpt)
- Lists DESIGN.md references from `agent/design-references/`
- Respects `max_tokens` budget (default 800)
- Called from `assembleContext()` at line 162-163 when `config.systems.design_skills.enabled`

### Not Yet Implemented (needs workspace UI)

| Component | Status | Location |
|-----------|--------|----------|
| Skill SKILL.md files (×5) | ❌ Missing from `agent/skills/` | Only in `agent/docs/` |
| Design references (×8 DESIGN.md) | ❌ Missing from `agent/` | Only in `agent/docs/` |
| `DesignSkillsPanel.tsx` component | ❌ Doesn't exist in `src/` | Spec in docs |
| `NewSessionDialog.tsx` integration | ❌ Not wired | Spec in docs |

### The 5 Design SKILL.md Files (Full Content)

Each file lives in `agent/docs/frontend-design-skills-25052026/UI UX Workspace Infrastructure/Skills/<name>/SKILL.md`.
Target install path: `agent/skills/<name>/SKILL.md`.

---

**1. `frontend-design/SKILL.md`** (102 lines)

Frontmatter: `id: frontend-design, name: Frontend Design, version: 2.0.0, category: design`

Content summary:
- **Core Principles:** Progressive disclosure, density without clutter, glass as structure (`bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`), motion as feedback (150-300ms), type as UI (60% of visual hierarchy)
- **6 Anti-Patterns (NEVER):** no `box-shadow` in dark themes, no pure black (`#000`), max 2 font families, no layout-animating properties, no default focus rings, no <44px touch targets
- **Color System:** `zinc-950` base, `pink-500` accent, `cyan-400` info, `emerald-400` success, `amber-400` warning
- **Spacing Scale:** xs=4px, sm=8px, md=12px, lg=16px, xl=24px, 2xl=32px
- **Animation Tokens:** fast=150ms, normal=250ms, slow=400ms, spring/out easings
- **Component Patterns:** Glass Card, Status Badge, Terminal Pane Chrome — exact TSX code provided
- **Activation:** UI improvements, React/Tailwind components, dark dashboard work

---

**2. `impeccable/SKILL.md`** (167 lines)

Frontmatter: `id: impeccable, name: Impeccable, version: 1.0.0, category: design`

Content summary:
- **7 Domain References:**
  - Typography: 1.25 modular scale, 45-75ch measure, Geist+JetBrains Mono, NEVER weight 100-300 on dark
  - Color: HSL > hex for dark themes, opacity layering, max 3 accents, 4.5:1 contrast
  - Spatial: 8px grid, 3 density zones, strict z-index scale (10/20/30/40/50)
  - Motion: 5 duration tiers (micro→dramatic), 4 easing types, ONLY transform+opacity
  - Interaction: EVERY element needs hover, active=pressed, ring focus, spinner+disabled
  - Responsive: 4 breakpoints, container queries, 44×44px touch minimum
  - UX Writing: "Thing verb because reason. Action to fix." — no "please" or "sorry"
- **23 Commands:** craft, teach, document, extract, shape, critique, audit, polish, bolder, quieter, distill, harden, onboard, animate, colorize, typeset, layout, delight, overdrive, clarify, adapt, optimize, live
- **27 Anti-Patterns (5 categories):** Fonts(5), Colors(6), Cards(4), Animations(6), Layout(6)
- **Activation:** "make it look good", "polish this", "looks like AI generated"

---

**3. `ui-ux-pro-max/SKILL.md`** (156 lines)

Frontmatter: `id: ui-ux-pro-max, name: UI UX Pro Max, version: 1.0.0, category: design`

Content summary:
- **Industry Design Rules (5 industries):**
  - Developer Tools: dark chrome, monospace, 4-8px grid, no rounded >8px on code elements
  - Project Management: ultra-clean, neutral+status colors, 16-24px grid, board views
  - Financial: precision, tabular nums, green/red, tight tables
  - AI/ML: conversational, warm tones, message bubbles, confidence indicators
  - Analytics: chart-forward, 8-10 chart colors, morphing animations
- **10 Selected Styles:** Dark Glass, Neo-Brutalist, Swiss Grid, Material You, Cupertino, Terminal Chic, Editorial, Cyberpunk, Bauhaus, Minimalist
- **Color Palette Guide:** Exact hex values (`#09090b` base, `#ec4899` pink accent, `#22d3ee` cyan)
- **Typography Pairing:** Geist (UI) + JetBrains Mono (code), max contrast between heading/body
- **Pre-Delivery Checklist:** 10 items (contrast, touch targets, reduced motion, empty/loading/error states, a11y)

---

**4. `taste-skill/SKILL.md`** (111 lines)

Frontmatter: `id: taste-skill, name: Taste Skill, version: 1.0.0, category: design`

Content summary:
- **3 Tunable Knobs (1-10):**
  - `DESIGN_VARIANCE`: Conservative (1-2) → Safe (3-4) → Balanced (5-6) → Expressive (7-8) → Experimental (9-10). Default: 5
  - `MOTION_INTENSITY`: Static (1-2) → Subtle (3-4) → Moderate (5-6) → Dynamic (7-8) → Cinematic (9-10). Default: 5
  - `VISUAL_DENSITY`: Airy (1-2) → Spacious (3-4) → Balanced (5-6) → Dense (7-8) → Maximal (9-10). Default: 7
- **Aesthetic Variant Matrix:** 8 archetypes from 3-knob combinations (e.g., Low/Low/High = "Bloomberg terminal", High/Low/Low = "Brutalist web")
- **5 Anti-Repetition Rules:** font rotation, color shift, shape variation, pattern break every 5th component, contextual memory
- **Activation:** "make it look different", "less generic", "more interesting"
- **Do NOT activate:** exact design specs provided, internal tools, "default" requested

---

**5. `design-taste/SKILL.md`** (135 lines) — Master Aggregator

Frontmatter: `id: design-taste, name: Design Taste System, version: 1.0.0, category: design, tags: [master, aggregator]`

Content summary:
- **References all 4 sub-skills** (frontend-design, impeccable, ui-ux-pro-max, taste-skill)
- **Active Configuration Template:** {{design_variance}}, {{motion_intensity}}, {{visual_density}}, {{include_references}}, {{reference_count}}
- **Unified Design Vocabulary:** 5 spatial terms (Chrome, Canvas, Palette, Overlay, Gutter), 5 motion terms, 5 color terms
- **Decision Tree** (6 steps): product type → component purpose → user/internal → knob values → anti-repetition → anti-patterns
- **Design Reference Index:** 8 references (Claude, Linear, Vercel, Stripe, Supabase, Sentry, PostHog, Raycast) with style descriptions
- **Pre-Generation Checklist:** 7 items
- **ALWAYS active** when Design Skills system is enabled

### The 8 Design References

Target path: `agent/design-references/<name>/DESIGN.md`
Currently in: `agent/docs/frontend-design-skills-25052026/UI UX Workspace Infrastructure/Design References/<name>/`

| Reference | Style | Best For |
|-----------|-------|----------|
| **Claude** | Warm terracotta, clean editorial | AI agent interfaces, chat UIs |
| **Linear** | Ultra-minimal, purple accent | Project management, task lists |
| **Vercel** | Black/white precision, Geist | Dashboards, developer tools |
| **Stripe** | Purple gradients, weight-300 | Financial data, tables, charts |
| **Supabase** | Dark emerald, code-first | Developer tools, API docs |
| **Sentry** | Dark dashboard, data-dense | Error tracking, monitoring |
| **PostHog** | Playful dark, colorful charts | Analytics, funnels, graphs |
| **Raycast** | Sleek dark chrome, vibrant | Command palettes, quick actions |

### NewSessionDialog.tsx Integration (Spec from docs)

File: `agent/docs/frontend-design-skills-25052026/UI UX Workspace Infrastructure/src/NewSessionDialog.tsx` (651 lines)

The reference implementation shows:
- **Design Skills as a SEPARATE section** from core context systems — distinct pink gradient visual divider, `Design Intelligence` header
- **DesignSkillsPanel sub-component** imported from `./DesignSkillsPanel` — accepts `config`, `onChange`, `designRefCount`, `isInitialized`, `onInitialize`
- **State management:**
  ```typescript
  const [designSkillsConfig, setDesignSkillsConfig] = useState<DesignSkillConfig>({
    enabled: true,
    skills: {
      frontendDesign: true,
      impeccable: true,
      uiUxProMax: true,
      tasteSkill: true,
      designTaste: true,
    },
    levels: {
      designVariance: 5,
      motionIntensity: 5,
      visualDensity: 7,
    },
    includeReferences: true,
    activeReference: null,
  });
  ```
- **Initialization check:** `useEffect` checks if skill dirs exist via `deskflowAPI.listDirectory`
- **Initialize button:** calls `deskflowAPI.trackerMindSetup` to copy skill files
- **Token budget bar:** Combined view with blue (core) + pink (design) segments
- **Build on create:** Maps DesignSkillConfig to `contextConfig.systems.design_skills` in `handleCreate()`

### Note: `DesignSkillsPanel` Component Does Not Exist Yet

No `DesignSkillsPanel.tsx` file exists in `src/components/`. The NewSessionDialog.tsx spec imports it, but it was never created. This is a key file that needs to be built as part of the workspace.

---

## ═══════════════════════════════════════════════════════════════
## PART 1: CURRENT CODEBASE STATE
## ═══════════════════════════════════════════════════════════════

## Current Architecture Pain Points

### 1. Skills Tab — Two "Use" actions (confusing)
- **File:** `src/pages/TerminalPage.tsx`
- **Skills Tab:** lines 2860–3226
- **Skill interface:** lines 2865–2873
- **loadSkills:** lines 2948–2960
- **handleUse:** lines 2962–2972 — pops an alert prompt asking for custom instructions instead of routing to compose
- **Primary action:** Each skill card has a "Use" button that shows a `window.prompt()` for custom instructions
- **Render:** Search bar (filter), category filter pills, skill cards with expand/collapse, edit, create modals
- **Key Problem:** "Use" button is disconnected from the instruction compose panel. It asks the user "Enter custom instructions for this skill:" then just logs to console. It should instead:
  1. Select the skill in the compose panel
  2. Open the compose panel if closed
  3. Maybe pre-populate the instruction field

### 2. InstructionPanel (Compose) — Only one skill at a time
- **File:** `src/components/InstructionPanel.tsx` (528 lines total)
- **State:** lines 17–34
  - `problems: Problem[]`, `requests: Request[]`, `skills`
  - `selectedProblems: string[]`, `selectedRequests: string[]`
  - `selectedSkill: string | undefined` (single! can't compose from multiple skills)
  - `customInstruction: string`, `selectedAgentFiles: string[]`
  - `previewExpanded`, `isSending`, `copied`, `showFilePicker`
- **Skill selection:** lines 371–381 — Single `<select>` dropdown
- **generatePrompt function:** lines 186–263 — Builds a markdown prompt from:
  1. Skill description (single skill)
  2. Selected problems (context)
  3. Selected requests (tasks)
  4. Related checklist items (progress tracking)
  5. Agent files (knowledge base)
  6. Custom instructions
- **Problems/Requests checklists:** lines 223–246 — Groups checklist items by parent type/id, formats as markdown checklist
- **Send button:** lines 505–522 — Calls `onSend()` with selected items and generated prompt
- **Key Problem:** Dropdown forces single skill selection. Multi-skill composition would require:
  - Multi-select skill UI (checkboxes or chips)
  - Concatenating multiple skill instructions in `generatePrompt()`
  - Merging contexts from multiple skills

### 3. ChecklistPanel — Full-featured but never connected
- **File:** `src/components/ChecklistPanel.tsx` (357 lines)
- **ChecklistItem interface:** lines 4–16
  - `parentType: 'problem' | 'request'`, `parentId`, `step`, `description`
  - `status: 'pending' | 'in_progress' | 'completed'`
  - `requiresHuman: boolean`, `humanApproved: boolean`, `notes: string`
- **Props:** lines 30–35 — Takes `projectId`, `projectPath`, `problems`, `requests`
- **Features:**
  - Filter by status (all/pending/in_progress/completed) — lines 40, 209–213
  - Filter by parent type (all/problem/request) — lines 41, 214–218
  - Expand/collapse parent groups — lines 42, 102–116
  - Inline status change — `handleStatusChange` (lines 72–75)
  - Human approval toggle — `handleApprove` (lines 77–79)
  - Delete item — `handleDelete` (lines 82–85)
  - Inline notes editing — `handleStartEditNotes`/`handleSaveNotes` (lines 87–96)
  - Auto-polling every 5s — lines 66–70
  - Loading states, empty states, error states
- **Render (lines 110–357):**
  - Groups items by parent, shows parent title/status
  - For each item: checkbox (status), description, human-approval toggle
  - Inline notes textarea with save/cancel
  - Delete button per item
  - Collapsed parents show item count badge
- **Key Problem:** In `TerminalPage.tsx` Checklists tab (lines 2150–2157), it renders an empty placeholder `<div>` instead of `<ChecklistPanel>`. The component is fully built but never wired.

### 4. TerminalPage Tab Structure — Current layout
- **File:** `src/pages/TerminalPage.tsx`
- **Tabs/subtabs definition:** lines 2090–2100
  ```
  | Subtab         | Component          | Lines    |
  |--------------- |--------------------|----------|
  | Session        | (inline terminal)  | 2125–2137|
  | Skills         | (inline skill UI)  | 2860–3226|
  | Compose        | InstructionPanel   | 2138–2148|
  | Checklists     | (empty placeholder)| 2150–2157|
  | Problems       | (inline)           | 2455–2857|
  | Requests       | (inline)           | 3251–3405|
  | Context        | ContextMaintenanceTab | 2159–2173 |
  ```
- **Key Problem:** Problems and Requests are inline components (not extracted). The subtabs are peers, not hierarchical. There's no visual connection between the tabs.

### 5. Problems Tab — Inline CRUD
- **Lines:** 2455–2857
- **Problem interface:** 2455–2463
  - `id`, `title`, `status`, `severity`, `files`, `user_notes`, `created_at`, `updated_at`
  - `statuses: 'Open' | 'Investigating' | 'Reproducing' | 'In Progress' | 'Testing' | 'Ready for Build' | 'Build Succeeds' | 'Fixed' | 'Irrelevant'`
- **CRUD operations:**
  - `loadProblems` (2522–2547): Fetches via IPC, sorts by severity
  - `createProblem` (2549–2560): Opens NewProblemDialog
  - `deleteProblem` (2562–2572): With confirmation
  - `updateProblem` (2574–2595): Inline status change
  - `updateProblemNotes` (2597–2602): Updates user_notes
- **NewProblemDialog:** 2604–2676 — Title, status, severity, optional description
- **ProblemDetailModal:** 2678–2857 — Full detail view with notes, file list, status/severity badges

### 6. Requests Tab — Inline CRUD (mirrors Problems)
- **Lines:** 3251–3405
- **Request interface:** 3251–3260
  - `id`, `title`, `status`, `priority`, `description`, `created_at`, `updated_at`
  - `statuses: 'Open' | 'In Progress' | 'Testing' | 'Completed' | 'Cancelled'`
- **CRUD mirror of Problems** — Same patterns

### 7. Problems/Requests ↔ Checklist data flow
- **InstructionPanel generatePrompt** (lines 223–246): Filters checklist items by selected problems/requests
- **ChecklistPanel** loads independently via `getChecklists` IPC
- **No cross-component state sharing** — neither component knows when the other updates
- **No central store** — each component fetches independently

## Existing IPC Endpoints

| Channel | Direction | Payload | Used By |
|---------|-----------|---------|---------|
| `get-checklists` | IPC → Renderer | `{ projectId, projectPath }` → `{ success, data: ChecklistItem[] }` | ChecklistPanel |
| `update-checklist-item` | Renderer → IPC | `{ id, updates: Partial<ChecklistItem> }` | ChecklistPanel |
| `delete-checklist-item` | Renderer → IPC | `{ id, projectId, projectPath }` | ChecklistPanel |
| `get-problems` | IPC → Renderer | `{ projectId, projectPath }` | ProblemsTab |
| `create-problem` | Renderer → IPC | `Problem` | ProblemsTab |
| `update-problem` | Renderer → IPC | `{ id, updates: Partial<Problem> }` | ProblemsTab |
| `delete-problem` | Renderer → IPC | `{ id }` | ProblemsTab |
| `get-requests` | IPC → Renderer | `{ projectId, projectPath }` | RequestsTab |
| `create-request` | Renderer → IPC | `Request` | RequestsTab |
| `update-request` | Renderer → IPC | `{ id, updates: Partial<Request> }` | RequestsTab |
| `delete-request` | Renderer → IPC | `{ id }` | RequestsTab |
| `get-skills` | IPC → Renderer | → `{ success, data: Skill[] }` | SkillsTab |
| `send-to-terminal` | Renderer → IPC | `{ prompt, terminalId }` | InstructionPanel |

## Existing Preload Bridges

- `deskflowAPI.getProblems`, `deskflowAPI.createProblem`, `deskflowAPI.updateProblem`, `deskflowAPI.deleteProblem`
- `deskflowAPI.getRequests`, `deskflowAPI.createRequest`, `deskflowAPI.updateRequest`, `deskflowAPI.deleteRequest`
- `deskflowAPI.getSkills`
- `deskflowAPI.getChecklists`, `deskflowAPI.updateChecklistItem`, `deskflowAPI.deleteChecklistItem`

## Design Tokens (Terminal Page)

- **Background:** `bg-zinc-900` (main), `bg-zinc-800/95` (gradient), `bg-black/60` (tabs)
- **Text:** `text-zinc-300` (primary), `text-zinc-500` (secondary), `text-zinc-400` (body)
- **Accent:** Green (problems), Blue (requests), Amber (agent files), Purple→Indigo (send button)
- **Cards:** `bg-zinc-800/50` with `border-zinc-700/50`, rounded `lg`
- **Tabs:** `bg-black/60` with `border-b border-zinc-800`, active: `text-zinc-200 bg-zinc-800/80`
- **Buttons:** `bg-zinc-700/50 hover:bg-zinc-600/50` (secondary), `bg-gradient-to-r from-purple-600 to-indigo-600` (primary)
- **Dialogs/Modals:** Full-screen fixed overlay `bg-black/60`, centered card `bg-zinc-800 border border-zinc-700`
