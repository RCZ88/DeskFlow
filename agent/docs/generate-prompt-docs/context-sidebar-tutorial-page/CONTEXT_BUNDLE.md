# Context Bundle: Context Sidebar / Tutorial Page / Setup Evaluation

## 1. Problem Statement

### 1a. Setup/WorkspaceSettingsDialog vs Sidebar

WorkspaceSettingsDialog (src/components/WorkspaceSettingsDialog.tsx) was created as a popup modal for configuring workspace context defaults. But its functionality overlaps significantly with NewSessionDialog.tsx's "advanced configuration" section — both have system toggles with token budgets, design taste knobs, and behavior settings. User feedback: "Maybe we can remove the pop-up thing and create a sidebar for context management."

### 1b. Context Management Discovery

The app already has a ContextMaintenanceTab (src/components/ContextMaintenanceTab.tsx) with 6 tabs (Overview, Contexts, History, Compactions, Search, Settings) tucked inside the IDE Terminal sidebar. But there's no dedicated page or sidebar panel for managing context — it's buried. User wants all context management in a dedicated space.

### 1c. Feature/Tutorial Page

No feature walkthrough or onboarding exists. New users don't know what the app can do. User wants: "a page specifically for showing the list of features with tutorial."

### 1d. Missing Model Improvisation

User mentioned "model improvisation" as a setting they expected in Setup. **Does not exist anywhere in the codebase** — zero matches for `modelImprov`, `model_improv`, `modelImprovisation`, or `improvisation` in any .ts/.tsx file.

---

## 2. Architecture Overview

### App Routes (src/App.tsx)
```
/                 → DashboardPage       (main dashboard)
/stats            → StatsPage           (usage statistics)
/productivity     → ProductivityPage    (focus/productivity)
/browser          → BrowserActivityPage (browser tracking)
/external         → ExternalPage        (sleep, stopwatch, manual)
/ide              → IDEProjectsPage     (IDE workspace with TerminalPage)
/settings         → SettingsPage        (app settings)
/database         → DatabasePage        (raw database view)
```

The `/ide` route renders `IDEProjectsPage` which opens a split view: left = project list, right = `TerminalPage` as workspace overlay.

### TerminalPage Structure (src/pages/TerminalPage.tsx)
The workspace has a sidebar with tabbed sections:
```
Sidebar tabs: Sessions | Problems | Requests | Checklists | Prompts | Configs | History | Skills | Analytics | Terminals | Context-maintenance
```
Context-maintenance is the last (least prominent) tab.

The workspace header has: Minimize | Initialize (green FolderTree) | Setup (amber Settings2) | New Agent (Bot) | Close (X)

### Context Assembly Architecture
```
WorkspaceSettingsDialog ─→ localStorage (workspace-context-config preference key)
         │
         ▼
NewSessionDialog ─→ reads preference → pre-populates context toggles
         │
         ▼  (on Create)
SessionConfig.contextConfig
         │
         ▼
TerminalPage ─→ sends to terminal via assembleContext() + terminalWrite()
         │
         ▼
ContextMaintenanceTab ─→ shows status of all context systems (6 tabs)
```

### Backend context storage:
```
ProjectContextService → .apptracker/context/project-context.json
RAGService            → .apptracker/context/rag-index.sqlite
Deep Memory           → agent/context/deep-memory.json
Session Summaries     → agent/context/session-summaries.json
Automations           → agent/automations/automations.json
```

### IPC call chain (renderer → main):
```
deskflowAPI.getContextSystems(projectPath)
  → ipcRenderer.invoke('get-context-systems', projectPath)
  → main.ts handler scans filesystem for system availability

deskflowAPI.getSessionSummaries(opts)
  → ipcRenderer.invoke('get-session-summaries')

deskflowAPI.getDeepMemory()
  → ipcRenderer.invoke('get-deep-memory')

deskflowAPI.trackerMindSetup(step, projectId, agentName)
  → ipcRenderer.invoke('tracker-mind-setup', { step, projectId, agentName })
  → Creates agent directory, AGENTS.md, INITIALIZE.md, etc.
```

---

## 3. Complete Context Tools Inventory

### System 1: LLM Wiki
- **Config key:** `llm_wiki`
- **Backend:** File reads via `readProjectFile` IPC
- **Data location:** `agent/*.md` — 7 files, priority-ordered:
  1. `state.md` (800 tokens, condensed via `condenseStateMd`)
  2. `context.md` (600 tokens)
  3. `PROBLEMS.md` (400 tokens)
  4. `REQUESTS.md` (200 tokens)
  5. `debugging.md` (200 tokens)
  6. `data.md` (200 tokens)
  7. `AGENTS.md` (200 tokens)
- **Always injected** (Layer 0-3): `RULES_COMPACT.md`, `state.md`, `patterns.md`, `problems.json`, `checklists.json`
- **Type in ContextConfig:** `{ enabled: boolean, max_tokens: number }`

### System 2: Obsidian Skills
- **Config key:** `obsidian_skills`
- **Backend:** `SkillsService` (src/services/SkillsService.ts, main.ts:9762)
- **Data location:** `agent/skills/*/SKILL.md`
- **Builds:** `buildSkillIndex()` — enumerates skill dirs with frontmatter parsing
- **Type:** `{ enabled: boolean, skills: string[], max_tokens: number }`

### System 3: Design Skills
- **Config key:** `design_skills`
- **Backend:** File reads via IPC
- **Data location:** `agent/skills/{frontend-design,impeccable,ui-ux-pro-max,taste-skill,design-taste}` + `agent/design-references/`
- **Builds:** `buildDesignSkillsContext()` — reads 5 skill files + reference files
- **Type:** `{ enabled: boolean, skills: string[], levels: { design_variance: 1-10, motion_intensity: 1-10, visual_density: 1-10 }, include_references: boolean, max_tokens: number }`

### System 4: Graphify
- **Config key:** `graphify`
- **Backend:** File reads via IPC
- **Data location:** `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.json`
- **Builds:** `buildGraphifyContext()` — tier-aware, only at `tier === 'top'`
- **Type:** `{ enabled: boolean, include_graph: boolean, include_summary: boolean, max_tokens: number }`

### System 5: PARA
- **Config key:** `para`
- **Backend:** File reads via IPC
- **Data location:** `CZVault/01_Areas`, `02_Resources`, `03_Archives`
- **Builds:** `buildParaContext()` — lists vault directories, only at `tier === 'top'`
- **Type:** `{ enabled: boolean, areas: string[], max_tokens: number }`

### System 6: QMD Templates
- **Config key:** `qmd_templates` (in WorkspaceConfig) / `qmd` (in ContextConfig)
- **Backend:** File reads via IPC
- **Data location:** `agent/templates/*.qmd`
- **Builds:** `buildQMDContext()` — lists .qmd files with header extraction
- **Type:** `{ enabled: boolean, templates: string[], max_tokens: number }`

### System 7: Automations
- **Config key:** `automations`
- **Backend:** File reads via IPC
- **Data location:** `agent/automations/automations.json`
- **Builds:** `buildAutomationsContext()` — filters `enabled: true` entries
- **Only at tier === 'top'**
- **Type:** `{ enabled: boolean, max_tokens: number }`

### System 8: Deep Memory
- **Config key:** `deep_memory` (in summarization config, not system toggles)
- **Backend:** IPC reads JSON
- **Data location:** `agent/context/deep-memory.json`
- **Builds:** `buildDeepMemoryContext()` — top 5 patterns by frequency
- **Type:** `{ enabled: boolean, pattern_detection: boolean, max_patterns: number, retention_days: number }`

### System 9: Session Summaries
- **Config key:** `summarization`
- **Backend:** IPC reads JSON (main.ts:6854 summarize-session handler)
- **Data location:** `agent/context/session-summaries.json`
- **Builds:** `buildDeepMemoryContext()` — last 3 session summaries
- **Type:** `{ enabled: boolean, message_threshold: number, max_recent_messages: number, summary_style: string }`

### System 10: RAG (SQLite)
- **Backend:** `RAGService` (src/services/RAGService.ts, 626 lines)
- **Data location:** `.apptracker/context/rag-index.sqlite`
- **Capabilities:** saveMessage, queryMessages, fullTextSearch (FTS5), semanticSearch (placeholder), deleteMessages, getOldMessages, createSession
- **No Config UI** — configured via ContextMaintenanceTab > Settings panel

### System 11: Project Context Manifest
- **Backend:** `ProjectContextService` (src/services/ProjectContextService.ts, 547 lines)
- **Data location:** `.apptracker/context/project-context.json`
- **Capabilities:** load/save manifest, registerContext, toggleContext, addCompaction, trackSessionContext
- **No Config UI** — configured via ContextMaintenanceTab

### System 12: Terminal Bindings (Session ↔ Terminal mapping)
- **DB Table:** `terminal_bindings` (created main.ts:1754)
- **Columns:** `id, terminal_id, project_id, agent_type, session_id, active_problem_id, active_request_id, status, created_at, last_activity_at`
- **IPC handlers:** get-terminal-bindings, get-terminal-binding, save-terminal-binding, update-terminal-binding, register-terminal

---

## 4. Existing UI Components

### 4a. WorkspaceSettingsDialog (src/components/WorkspaceSettingsDialog.tsx, 918 lines)

**Current design:** Modal popup with:
- Header: "Workspace Settings" → "Configure context systems & defaults for new sessions"
- 7 system toggle cards in 2-column grid (LLM Wiki, Skills, Graphify, PARA, QMD, Automations, Design Skills)
- Per-system token budget sliders (100-1200, step 50) when enabled
- Design Skills expandable panel with: 3 taste knobs (1-10), 5 skill toggles, references toggle, token budget
- Total active token budget bar (3200 max)
- Behavior toggles: Auto-summarization, Deep Memory
- Context Assembly Map SVG visualization
- Save/Cancel/Reset buttons
- Persists to localStorage via `setPreference('workspace-context-config', JSON.stringify(config))`

**Key interface:**
```typescript
interface WorkspaceConfig {
  systems: Record<string, SystemConfig | DesignSkillsConfig>;
  behaviors: { summarization: boolean; deep_memory: boolean };
}
interface SystemConfig { enabled: boolean; max_tokens: number; }
interface DesignSkillsConfig extends SystemConfig {
  skills: string[]; levels: { design_variance: 1-10; motion_intensity: 1-10; visual_density: 1-10 }; include_references: boolean;
}
```

**Loaded by NewSessionDialog (line 300):**
```typescript
if (prefs?.[WORKSPACE_CONFIG_PREF_KEY]) {
  const wsConfig: WorkspaceConfig = JSON.parse(prefs[WORKSPACE_CONFIG_PREF_KEY]);
  // pre-populates state: ctxLLMWiki, ctxSkills, ctxGraphify, ctxPara, ctxQMD, ctxAutomations, ctxDesignSkills
  // pre-populates: ctxSummarization, ctxDeepMemory
  // pre-populates: designVariance, motionIntensity, visualDensity, designSkillList
}
```

### 4b. NewSessionDialog (src/components/NewSessionDialog.tsx)

Mode-based dialog:
- `mode='create'` → Simple session creation (terminal, agent, session name)
- `mode='new-agent'` → Full context config with all 7 system toggles + design settings + model tier

The advanced context config section shows:
- System toggle cards (same 7 systems as WorkspaceSettingsDialog but with different visuals — colored cards with icons, inline descriptions)
- Token budget bar
- Model tier selector (top/mid/low)
- Design Skills expandable with taste knobs and skill toggles
- Behavior toggles (summarization, deep memory)

### 4c. ContextMaintenanceTab (src/components/ContextMaintenanceTab.tsx, 417 lines)

**6 tabs:**
1. **Overview** — MemoryStatusCard (token usage bars + RAG index stats) + summary cards
2. **Contexts** — ActiveContextsList (toggle on/off, expand for details)
3. **History** — RecentChatHistory (message rows with role colors, expand, copy/delete)
4. **Compactions** — CompactionsPanel (records with date range, compression ratio)
5. **Search** — ContextSearchBar (semantic + full-text search mode toggle)
6. **Settings** — SettingsPanel (auto-compaction config, RAG modes, token budgets)

**Sub-components (src/components/context-ui/):**
- MemoryStatusCard.tsx
- ActiveContextsList.tsx
- RecentChatHistory.tsx
- CompactionsPanel.tsx
- ContextSearchBar.tsx
- SettingsPanel.tsx

**Key types (from src/types/context.ts):**
```typescript
interface ContextMaintenanceConfig {
  autoCompactionEnabled: boolean;
  includeRAGInPrompt: boolean;
  compactionTrigger: { messageCount: number; interval: 'daily' | 'weekly' | 'monthly' };
  ragSearchMode: ('semantic' | 'fulltext')[];
  tokenBudgets: { projectContext: number; sessionContext: number };
}
```

### 4d. ContextConfig (src/services/ContextConfig.ts, 98 lines)

```typescript
interface ContextConfig {
  total_token_budget: number;
  model_tier: 'top' | 'mid' | 'low';
  systems: {
    llm_wiki: { enabled, max_tokens };
    obsidian_skills: { enabled, skills[], max_tokens };
    graphify: { enabled, include_graph, include_summary, max_tokens };
    para: { enabled, areas[], max_tokens };
    qmd: { enabled, templates[], max_tokens };
    automations: { enabled, max_tokens };
    design_skills: { enabled, skills[], levels, include_references, max_tokens };
  };
  summarization: { enabled, message_threshold, max_recent_messages, summary_style };
  deep_memory: { enabled, pattern_detection, max_patterns, retention_days };
}
const TIER_PROFILES = {
  top: { total_token_budget: 10000, model_tier: 'top' },
  mid: { total_token_budget: 7000, model_tier: 'mid' },
  low: { total_token_budget: 4000, model_tier: 'low' },
};
```

---

## 5. Design System

### Colors (dark theme, galaxy scheme)
- Background: `#09090b` (zinc-950), cards: `#18181b` (zinc-900)
- Borders: `#27272a` (zinc-800), `#3f3f46` (zinc-700)
- Text primary: `#f4f4f5` (zinc-100), secondary: `#a1a1aa` (zinc-400), muted: `#71717a` (zinc-500)
- Accent per system:
  - LLM Wiki: emerald
  - Skills: purple
  - Graphify: blue
  - PARA: amber
  - QMD: cyan
  - Automations: orange
  - Design Skills: pink
- Glass effect: `bg-zinc-800/60 backdrop-blur-sm border border-zinc-700/50`
- Rounded corners: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons
- Transitions: `duration-200` defaults, `transition-all` on interactive elements
- Modal pattern: `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm`
- Dialog variant: `bg-zinc-800 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-X`

### Icons
From `lucide-react` (version 0.577+ — note: `Edit2` → `Pencil`, `Toggle2` → `ToggleLeft`)
- Terminals: `Terminal`, `Plus`, `X`
- Context: `BookOpen`, `Sparkles`, `Network`, `FolderTree`, `FileCode`, `Zap`, `Palette`
- Actions: `Settings2`, `Save`, `RotateCcw`, `ChevronDown`, `ChevronUp`, `Info`
- Navigation: `Home`, `BarChart3`, `Zap`, `Globe`, `Moon`, `Table`, `Database`
- IDE workspace: `Minimize2`, `Maximize2`, `FolderTree`, `Bot`, `ScrollText`, `BookTemplate`

### Animations (framer-motion)
- Modal entry: `initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}`
- Overlay entry: `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`
- Collapsible sections: `initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}`
- Duration: 0.2s default

---

## 6. Key Redundancies & Gaps

### Redundancies
1. **System toggles duplicated:** WorkspaceSettingsDialog and NewSessionDialog both have the same 7 system toggle cards with token budget sliders. Changing one doesn't sync with the other.
2. **Design taste knobs duplicated:** WorkspaceSettingsDialog's Design Skills panel and NewSessionDialog's Design Skills expandable section are identical.
3. **Behavior toggles duplicated:** summarization + deep memory toggles in both dialogs.
4. **ContextMaintenanceTab separates token budgets** (in SettingsPanel) from system config (in WorkspaceSettingsDialog/NewSessionDialog) — users have to configure in two places.

### Gaps
1. **No model improvisation:** Zero matches in codebase. User expected to configure "how the AI improvises" — possibly temperature, creativity settings, or agent behavior tuning.
2. **No workspace-level settings for terminal communication:** How terminals share context, which agent type to use, agent CLI flags.
3. **No file location settings:** User expected to configure file paths (where context files live, where skills are stored).
4. **No feature tutorial/onboarding page:** Nothing exists.
5. **No dedicated context management page:** ContextMaintenanceTab is buried as the last sidebar tab in TerminalPage.
6. **No unified settings panel:** Settings are spread across: WorkspaceSettingsDialog (modal), NewSessionDialog (modal), ContextMaintenanceTab > Settings (IDE sidebar tab), SettingsPage (route).
