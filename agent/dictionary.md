# dictionary.md — DeskFlow terminology & location resolution

> PURPOSE: resolve ambiguous words to an EXACT place in the app before acting.
> This file is FORCE-INJECTED into every agent prompt (opencode.json instructions).
> Rule (see AGENTS.md): before you create/move/modify anything that lives
> "somewhere", look the noun up HERE first. If it's not here, ASK — do not guess.

## 🔴 High-confusion terms (these have burned us before)

### "workspace"  (DEFAULT meaning in the terminal context)
- MEANS: the **Terminal Workspace** at route `/terminal` — the multi-pane terminal area
  PLUS its own internal 5-group sub-navigation (Setup / Work / Insights / Studio /
  Context). This is NOT the application's left router sidebar.
- "work ON the workspace" / "in the workspace" = work inside `/terminal` and its subtabs.
- DO NOT create app-level routes or items in the App.tsx router sidebar when the user
  says "workspace". Those are different navigations (see "sidebar" below).

### "saved workspace" / "save the workspace" / "list of workspaces"
- MEANS: a snapshot row in the `workspace_state` table (layout + terminal_tabs +
  sidebar_width + active_tab + configs), managed by IPC `workspace:save` / `workspace:list`
  / `workspace:load` / `workspace:delete`.
- It is surfaced in the UI under **Work → Workspaces** subtab.
- "warn before exiting" = prompt to `workspace:save` when leaving `/terminal` with unsaved changes.

### "sidebar"  (AMBIGUOUS — always disambiguate)
- "workspace sidebar" = the in-`/terminal` 5-group sidebar (Setup/Work/Insights/Studio/Context).
- "app sidebar" / "navigation" = the App.tsx router rail (Dashboard, Stats, IDE, Settings…).
- If unqualified and the topic is the terminal workspace → assume the WORKSPACE sidebar.

### "page" vs "subpage"
- App-level "page" = a route (e.g. `/ide`, `/dashboard`). Lives in App.tsx router + sidebar.
- Workspace "subpage" / "subtab" = a section INSIDE `/terminal`, addressed like
  `work/sessions`, `work/map`, `studio/skills` (see `terminal_sessions.subpage`).
- "create a page in the workspace" = add a workspace SUBPAGE/subtab, NOT an app route.

## 🗺️ App page map (route → page → where features live)
| You say… | Route | Page component | Notable sub-areas |
|---|---|---|---|
| dashboard / home / orbit | `/` | DashboardPage | 3D orbit, heatmap, weekly overview, timer |
| stats / app table | `/stats` | StatsPage | app table, charts, session list |
| productivity / focus score | `/productivity` | ProductivityPage | score, focus sessions, trends |
| browser / websites | `/browser` | BrowserActivityPage | domain groups, top sites |
| **IDE projects / "ID projects"** | `/ide` | IDEProjectsPage | project grid, detection, **AI Tools subpage** |
| terminal / **workspace** | `/terminal` | TerminalPage | 5-group sidebar, panes, sessions, map |
| external / sleep | `/external` | ExternalPage | activity grid, sleep, comparison |
| reports / insights | `/reports` | InsightsPage | Day / Weekly / Activities tabs |
| database / tables | `/database` | DatabasePage | analytics + table browser |
| settings | `/settings` | SettingsPage | Category, Colors, General, Tracking, Prompts |

### IDE Projects → "AI Tools" subpage (your line-chart example)
- "AI tools subpage" = the AI usage section inside `/ide` (IDEProjectsPage).
- "line chart" there = AI usage / cost over time (fed by IPC `get-ai-usage-summary`,
  `get-ide-projects-overview`). When the user says "the line chart on AI tools", target
  THIS chart, not a dashboard chart.

## 🧭 Terminal Workspace sub-navigation (the 5 groups)
| Group | Accent | Subtabs (subpage keys) |
|---|---|---|
| Setup | orange | Presets (`setup/presets`), Configs (`setup/configs`) |
| Work | green | Sessions (`work/sessions`), Map (`work/map`), Files (`work/files`), Workspaces (`work/workspaces`) |
| Insights | purple | Analytics (`insights/analytics`), Issues (`insights/issues`), Bugs (`insights/bugs`) |
| Studio | indigo | Skills (`studio/skills`), Design (`studio/design`) |
| Context | amber | Context (`context/context`), Maintenance (`context/maintenance`), Page Context (`context/page`) |

---

## Key Terms & Meanings (legacy definitions — kept for reference)

### Tracking Browser
- **Setting Location:** Settings → Browser Activity page
- **What it is:** The browser with the DeskFlow extension installed (e.g., "Comet ★")
- **How it works:** When this browser is detected as active window, tracking switches from APP mode to WEBSITE mode
- **Important:** This is DYNAMIC - reads from `browserWithExtension` preference in Settings

### Recent Sessions / Activity Feed
- **Location:** Dashboard page, bottom section
- **What it shows:** List of tracked apps and websites with live stopwatches
- **Active session:** Has green pulsing dot, shows live timer counting up (格式: HH:MM:SS)
- **Completed session:** Shows "X ago" (time since finished)

### Timer / Stopwatch
- **Location:** Dashboard page, main hero section
- **What it tracks:** Productive time only (from productive-tier apps/websites)
- **Behavior:** 
  - Counts UP when using productive apps
  - Resets/pauses based on timerBehavior settings when switching to distracting apps
  - Continues tracking when in browser (uses website category, not app category)

### Tracking - Provision vs New Agent
- **Provision** (formerly "Setup"): One-click infrastructure setup. Creates AGENTS.md, INITIALIZE.md, PROBLEMS.md, REQUESTS.md, state.md on disk. Green button, FolderTree icon. Does NOT create a terminal session.
- **New Agent** (formerly "Initialize"): Dialog-based agent session creation. Opens NewSessionDialog with session name, agent dropdown, terminal selector, system prompt. Amber button, Bot icon. Has collapsible "Advanced Configuration" section for context system toggles.
- **Start Agent**: Submit button in New Agent dialog. Creates terminal session with init content + system prompt.

### Advanced Configuration
- **Location:** New Agent dialog, collapsed by default
- **What it contains:** Context System toggles (LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations), Behavior toggles (Auto-summarize, Deep memory, agents.md), Agent Files selection, Preview Init Content
- **Trigger:** Click ChevronDown toggle inside New Agent dialog

### Context Delta Messages
- **What they are:** Real-time notifications written to active terminal when context changes (problems/requests/checklists created or updated)
- **Format:** `[Context] New problem: Bug X (ID: 123)` or `[Context] Updated problem: Bug X → Fixed`
- **IPC:** `onContextChanged` → `context-changed` event from main process
- **Delivery:** `terminalWriteRaw` with `\r` for reliable agent parsing

### Bidirectional Problem↔Request Linking
- **Linked Problems:** RequestDetailModal shows which problems are linked to a request (dropdown to add, chips to view)
- **Related Requests:** ProblemDetailModal shows which requests are linked to a problem (dropdown to add, chips with × to unlink)
- **IPC:** `linkProblemToRequest` / `unlinkProblemFromRequest`
- **DB Storage:** `linked_problems` array on Request records

### BasicMarkdownViewer
- **File:** `src/components/BasicMarkdownViewer.tsx`
- **What it does:** Lightweight markdown renderer for file previews. Handles headers, bold, italic, inline code, fenced code blocks, ordered/unordered lists, checkboxes, blockquotes, links.
- **No external dependencies** — pure React + Tailwind

### Agent Defaults
- **Utility:** `getDefaultAgent()` / `setDefaultAgent()` in `src/lib/defaults.ts`
- **Storage:** `localStorage` key `'terminal-defaultAgent'`
- **Default value:** `'claude'`
- **Replaces:** 9 previously-inline `localStorage.getItem('terminal-defaultAgent')` calls

### Terminal Workspace

- **Location:** Terminal page (`/terminal`)
- **What it is:** The entire terminal UI including sidebar + terminal layout (split panes, tabs)
- **Minimize:** Hides the terminal layout and sidebar but keeps PTY processes alive in the background. Clicking "Restore" shows everything again.
- **Close Workspace:** Kills all terminal processes and clears the workspace state. Always prompts to save first (Save & Close / Discard / Cancel). The save feature saves all active terminal sessions.
- **Saved Workspace Config:** A named snapshot of the terminal layout (which terminals are open, their split ratios) that can be restored later via the Configs tab in the sidebar.

### Workspace vs Session Distinction

- **Workspace** (noun): The permanent container — sidebar groups (Setup/Work/Insights/Studio/Context), terminal layout, project integration, presets, configs. Persists via `workspace:save`/`workspace:load` IPC. Survives session close/reopen.
- **Session** (noun): An ephemeral AI agent conversation within the workspace. Has a topic, agent type, status (active/idle/completed/error/cancelled), category, cost, tokens. Lives in `terminal_sessions` DB table. Can be resumed via `resume_id`.
- **Workspace Group** (noun): One of 5 top-level nav buttons (Setup/Work/Insights/Studio/Context) with browser-tab style, accent color, and sub-tab navigation.
- **Sub-tab** (noun): A secondary navigation within a group (e.g., Sessions/Map/Files under Work group). Rendered as rounded-full chip pills via SubTabBar.
- **Open Workspace:** Launch terminal workspace for a project from IDE page (navigates to /terminal with projectId + projectPath).
- **New Session:** Create a new AI agent conversation within an existing workspace (opens NewSessionDialog in terminal page).
- **Resume Session:** Reconnect to a previous AI agent conversation using its resume_id.
- **Saved Workspace List:** DOES NOT EXIST YET — workspace state auto-saves to `workspace_state` DB table but there's no UI to browse/restore previous workspaces.

### IPC Endpoints

| Endpoint | Purpose |
|----------|---------|
| `browserWithExtension` | Gets/Sets the tracking browser name from Settings |
| `timerBehavior` | Gets/Sets timer behavior (neutralAction, distractingAction) |
| `onForegroundChange` | Event: active window changed |
| `onBrowserTrackingEvent` | Event: browser tab changed (from extension) |
| `addLog` | Saves app/website session to database |
| `context-changed` | Event: context changed (problems/requests/checklists created/updated) |
| `link-problem-to-request` | Links a problem to a request |
| `unlink-problem-from-request` | Removes a problem-request link |
| `trackerMindSetup` | Provision flow: creates AGENTS.md, INITIALIZE.md, etc. |
| `terminal:write-raw` | Writes raw data to terminal PTY (used for context deltas) |

### File References

| File | Purpose |
|------|---------|
| `src/pages/DashboardPage.tsx` | Main UI: timer, recent sessions, heatmap |
| `src/pages/SettingsPage.tsx` | Settings UI: timerBehavior, browserWithExtension |
| `src/pages/TerminalPage.tsx` | Terminal workspace: context delta listener, bidirectional linking, agent defaults |
| `src/App.tsx` | Main app shell, loads preferences, passes to Dashboard |
| `src/main.ts` | Electron main process, database, IPC handlers |
| `src/components/NewSessionDialog.tsx` | New Agent dialog with Advanced Configuration toggle |
| `src/components/BasicMarkdownViewer.tsx` | Markdown renderer for file previews |
| `src/components/InstructionPanel.tsx` | Compose instruction panel with prompt preview |
| `src/lib/defaults.ts` | `getDefaultAgent()`/`setDefaultAgent()` + `DEFAULT_SYSTEM_PROMPT` |

### Key State Variables

| Variable | Where Defined | Purpose |
|----------|---------------|---------|
| `trackingBrowser` | App.tsx | Browser name from Settings (e.g., "Comet") |
| `isInBrowser` | DashboardPage.tsx | Boolean - is user currently in tracking browser |
| `currentApp` | DashboardPage.tsx | Current foreground app data |
| `currentWebsite` | DashboardPage.tsx | Current website data from browser extension |
| `activityFeed` | DashboardPage.tsx | Array of recent sessions with timestamps |
| `timerBehavior` | App.tsx / DashboardPage.tsx | { neutralAction, distractingAction } |
| `tierAssignments` | App.tsx / DashboardPage.tsx | { productive, neutral, distracting } arrays |
| `activeTerminalId` | TerminalPage.tsx | Currently focused terminal ID (context deltas target this) |
| `showAdvanced` | NewSessionDialog.tsx | Whether Advanced Configuration is expanded |
| `allRequests` | TerminalPage.tsx (ProblemDetailModal) | All requests loaded for bidirectional linking |

### Browser App
- **Setting Location:** Settings → Browser Activity → "Browser with Extension" dropdown
- **What it is:** The browser that has the DeskFlow extension installed (e.g., Comet, Chrome)
- **How it works:** When the browser app is the foreground window, the extension sends website data that gets logged to the database. When the user switches to a non-browser app, the extension data is blocked by the foreground app check in `handleBrowserData()` (main.ts:10643).
- **Key constraint:** Browser website data is ONLY persisted when the browser app is the active foreground window. This prevents phantom entries from background browser tabs.

### Flow: How Tracking Works

1. **App active** → `onForegroundChange` fires → check if tracking browser
2. **If tracking browser** → set `isInBrowser = true`, don't update `currentApp`
3. **Browser tab changes** → `onBrowserTrackingEvent` fires → show website
4. **Switch away from browser** → set `isInBrowser = false`, resume app tracking
5. **Timer logic** → uses `currentApp.category` OR `currentWebsite.category` depending on mode

---

## External Frontend Infrastructure Terms

### frontend-external-infra skill
- **Location:** `agent/skills/frontend-external-infra/SKILL.md`
- **What it is:** A skill that connects MCP servers serving real component/icon/motion libraries, so the agent doesn't invent UI from zero ("AI slop")
- **How it differs from other design skills:** Other design skills (frontend-design, impeccable, humancentred-UIUX) are *instructions* — they teach taste. This skill is the *inventory connector* — it tells the agent which MCP server to call for real building blocks.

### MCP Servers for Frontend (configured in opencode.json)

| Server | Package | Purpose |
|--------|---------|---------|
| **shadcn** | `npx shadcn@latest mcp` | Browse/search/read source of thousands of shadcn-compatible Tailwind+React components from any registered registry (shadcn/ui, Aceternity, etc.) |
| **magicui** | `@magicuidesign/mcp` | 150+ animated React components: beams, particles, bento grids, text animations, backgrounds, device mocks |
| **lucide** | `lucide-icons-mcp` | 1500+ SVG icon search — never guess icon names |
| **@21st-dev/magic** | `@21st-dev/magic` | Prompt→polished-React-component generation for unique variations (API key from `.env`) |
| **motion-dev** (community) | `github.com/Abhishekrajpurohit/motion-dev-mcp` | Offline Motion.dev docs + animation codegen for React/JS/Vue (free — clone+`npm run build`) |
| **unsplash** | `unsplash-smart-mcp-server` | Search stock photography with auto-attribution (Unsplash API key from `.env`) |
| **reactbits** | `reactbits-dev-mcp-server` | 135+ animated React components (CSS + Tailwind variants) |
| **iconify** | `better-icons-mcp` | 200,000+ icons across 200+ icon sets |

### AI Slop
- **Definition:** Generic, mass-produced UI output that looks like the statistical average of training data — indistinguishable from every other AI build
- **Root cause (in this context):** The agent invents UI patterns from scratch instead of pulling from real, curated, production-grade libraries
- **Fix:** Connected MCP servers (shadcn, Magic UI, Lucide, 21st.dev, Motion community MCP, Unsplash, React Bits, Iconify) + re-skin rules + anti-slop checklist
- **Reference:** `agent/docs/frontend-external-infra.md`

### Source Routing
- **Definition:** The decision table in the frontend-external-infra skill that tells the agent *which* MCP server to call for *what* kind of UI need (e.g., "standard block → shadcn", "animated effect → Magic UI", "icon → Lucide")
- **Location:** `agent/skills/frontend-external-infra/SKILL.md` — "Source Routing" section

### Re-Skin (or "re-skin rules")
- **Definition:** After pulling a component from any external source, the agent must replace the source's original styling with the project's own design tokens
- **For DeskFlow:** Replace colors with `--bg-primary`, `--accent-primary`, etc.; use `rounded-xl` max; use `p-5` padding; use Geist/JetBrains Mono fonts
- **Why this matters:** Without re-skin rules, sourced components would look foreign and inconsistent with the rest of the app

### Anti-Slop Checklist
- **Location:** `agent/skills/frontend-external-infra/SKILL.md`
- **What it is:** 10 checkpoints that block a PR if any fail — type, color, geometry, hero pattern, section labels, motion, imagery, empty states, icons, accessibility
- **Purpose:** Guards against the recognizable signature of AI-generated UI (default fonts, purple gradients, same-radius-everything, hero clichés)