# PROMPT: Context Sidebar, Tutorial Page, & Setup Evaluation

## Raw Request (verbatim from user)

> "Maybe we can remove the pop-up thing and create a sidebar for context management"
>
> "I think i need a page specifically for showing the list of features with tutorial"
>
> "I think we need more settings here — model improvisation, file locations, how terminals communicate, workspace-level configs"
>
> "I want a dedicated space for context management"
>
> "token budget sliders and design settings are redundant with NewSessionDialog"

---

## Context

Read `agent/docs/context-sidebar-tutorial-page/CONTEXT_BUNDLE.md` — it contains all architecture, code structure, data shapes, IPC endpoints, and design tokens needed to design the complete solution.

---

## The Mandate

You are the **Lead Designer and Engineer**. Design a comprehensive solution covering three tightly related areas. Do NOT provide options — design the **best version** of each.

Do NOT prescribe specific component structure or file organization — declare what needs to exist and what it does. Let implementation determine the exact file layout.

---

## Area A: Context Management Sidebar (replacing WorkspaceSettingsDialog)

### Problem
WorkspaceSettingsDialog is a modal popup that duplicates what NewSessionDialog already provides (system toggles, token budgets, design taste knobs). The user wants it replaced with a proper sidebar for context management. Additionally, the ContextMaintenanceTab (6-tab pane inside the IDE Terminal sidebar) is buried and not discoverable.

### Requirements
1. **Remove the modal pattern** — WorkspaceSettingsDialog as a popup should be replaced. The Setup button in the IDE workspace header should open a persistent sidebar instead.
2. **Unify all context management** into a single sidebar that lives in the IDE workspace (alongside sessions, problems, requests, etc.). This sidebar should include:
   - Context system toggles (the 7 systems from WorkspaceConfig)
   - Token budget per system (sliders)
   - Design skills configuration (taste knobs, skill toggles, references toggle)
   - Model tier selector (top/mid/low)
   - Behavior toggles (summarization, deep memory)
   - The 6 tabs from ContextMaintenanceTab (Overview, Contexts, History, Compactions, Search, Settings) — these should feel like sub-panels, not buried tabs
3. **NewSessionDialog integration** — NewSessionDialog should still show context toggles (as an overridable quick-config before creating a session), but loading the sidebar's saved config as defaults. The sidebar is the canonical place for persistent configuration.
4. **Data persistence** — Save to the same `workspace-context-config` preference key so it interoperates with NewSessionDialog's pre-population.

### What to remove
- The WorkspaceSettingsDialog.tsx component (or merge its contents into the sidebar)

### What to create
- A new sidebar tab (e.g., "Context") in the IDE workspace sidebar alongside Sessions/Problems/Requests
- Contains: System config panel + Design config panel + ContextMaintenanceTab integration

---

## Area B: Feature Tutorial / Onboarding Page

### Problem
There is no feature walkthrough. New users open the app and don't know what features exist or how to use them. The user wants "a page specifically for showing the list of features with tutorial."

### Requirements
1. **Dedicated route** — A new page reachable from the navigation (possibly a "?" or "Help" icon in the header bar)
2. **Feature inventory** — Display all features of the app with:
   - Feature name, icon, and 1-2 sentence description
   - Status indicator (released / beta / planned)
   - Link/button to navigate directly to the feature's page
3. **Interactive tutorial mode** — Each feature card should be clickable to start an interactive walkthrough:
   - Focus highlight: dim the entire UI except the target element
   - Tooltip/instruction: "This is the Dashboard — it shows your daily activity, productivity timer, and sleep data"
   - "Try it" button: click to navigate to the feature and show a brief demo
   - "Skip" button: dismiss the tutorial
   - Progress indicator: "Feature 3 of 12"
4. **Content** — Use the project's FEATURE_TRACKER.md at `agent/FEATURE_TRACKER.md` as the source of truth for what features exist. Do NOT make up features.
5. **First-launch trigger** — Optional: show a "Welcome! Want a tour?" prompt on first app launch (track via first-launch preference flag)
6. **Empty/no-tutorial state** — If all features have been toured, show a "You've completed the tutorial!" congratulations message with a reset button

### Design Style
- Match the app's dark glass theme (zinc/glass aesthetic)
- Tutorial overlay: full-screen dim with a focused "spotlight" window on the target element
- Cards: glass cards with feature icons, gradient accents per feature category
- Navigation: arrow-based (Previous / Next) with progress dots or a progress bar
- Smooth transitions (framer-motion, 0.2-0.3s)

---

## Area C: New Settings Scope for "Setup" Panel

### Problem
The user expected the Setup panel to contain settings for "model improvisation, file locations, how terminals communicate, workspace-level configs." These do not exist anywhere in the app. Model improvisation has zero codebase matches.

### Requirements
Design the following new settings to add to the Context Management Sidebar:

1. **Model Improvisation Settings** — Control how AI agents behave during conversations:
   - Agent temperature: slider (0.1 to 2.0, step 0.1, default 1.0)
   - Max response tokens: slider (256 to 8192, step 256, default 4096)
   - Top-p sampling: slider (0.1 to 1.0, step 0.05, default 0.9)
   - Frequency penalty: slider (-2.0 to 2.0, step 0.1, default 0.0)
   - Presence penalty: slider (-2.0 to 2.0, step 0.1, default 0.0)
   - Note: These are UI-only settings that set localStorage preferences. The actual model settings are applied when the terminal sends context to the agent. They are not IPC-backed yet.

2. **File Location Overrides** — Allow users to customize where context files live:
   - Agent workspace path: text input (default: `<projectPath>/agent/`)
   - Skills directory: text input (default: `<agentPath>/skills/`)
   - Graphify output: text input (default: `<projectPath>/graphify-out/`)
   - PARA vault path: text input (default: `<projectPath>/../CZVault/` or absolute path)
   - QMD templates: text input (default: `<agentPath>/templates/`)
   - Automations file: text input (default: `<agentPath>/automations/automations.json`)
   - Deep memory file: text input (default: `<agentPath>/context/deep-memory.json`)
   - Session summaries file: text input (default: `<agentPath>/context/session-summaries.json`)
   - Design references: text input (default: `<agentPath>/design-references/`)
   - Each field should have a "Browse..." button that opens a folder/file picker
   - Persist to `workspace-file-paths` preference key

3. **Terminal Communication Settings** — How terminals interact with AI agents:
   - Default agent type: dropdown (opencode, claude, aider, codex, generic)
   - Agent CLI flags: text input (e.g., `--model claude-sonnet-4-20250514 --resume`)
   - System prompt prefix: multiline text input (prepended to assembled context)
   - Message line ending: radio (LF / CR / CRLF)
   - Context sharing between terminals: toggle (enable/disable sharing session context across split terminals)
   - Auto-create terminal on session start: toggle
   - Terminal close behavior: dropdown ("Kill agent" / "Detach" / "Ask each time")
   - Persist to `terminal-communication-config` preference key

4. **Workspace-Level Defaults** — Settings that apply to all sessions in the workspace:
   - Auto-initialize on workspace open: toggle (run trackerMindSetup on open)
   - Auto-save context on close: toggle
   - Default model tier: dropdown (top / mid / low)
   - Default token budget: slider (4000 to 20000, step 500, default 7000)
   - Session summary frequency: dropdown (every N messages, choices: 10/25/50/100/never)
   - Persist to `workspace-defaults` preference key

---

## Requirement Checklist

### Data & Storage
- [ ] Design preference keys and data shapes for: `workspace-file-paths`, `terminal-communication-config`, `workspace-defaults`
- [ ] All settings must persist via the existing `setPreference` / `getPreferences` IPC system
- [ ] Context sidebar reads from `workspace-context-config` (already exists)
- [ ] Tutorial progress must persist (which features viewed, completion status)

### Visual & UX
- [ ] All three areas must match the app's dark glass aesthetic (zinc-800/900, rounded-xl, border-zinc-700/50, backdrop-blur)
- [ ] Tutorial overlay must be visually distinctive: dimmed background + spotlight focus + instruction tooltip
- [ ] Context sidebar must feel like a natural part of the IDE workspace sidebar (matching tab bar style, scrollable content)
- [ ] New settings must follow existing patterns (toggle switches, range sliders, dropdowns, text inputs)
- [ ] Animations must use framer-motion with 0.2-0.3s durations (matching existing patterns)

### Interaction Flow
- [ ] Tutorial: feature click → overlay with focus + instruction → "Try it" navigates → back to tutorial list
- [ ] Context sidebar: click sidebar tab → panel slides in → user configures → auto-saves or manual save
- [ ] Mode: "What happens when a user changes something?" — describe the save/apply/cancel flow for each area
- [ ] Empty states for all three areas (no context systems detected, no features to tour, no settings configured)

### No-Go Constraints
- [ ] Do NOT modify the existing WorkspaceSettingsDialog in-place — either replace it or remove it
- [ ] Do NOT create a separate route for context management (it lives in the IDE workspace sidebar)
- [ ] Do NOT create new IPC endpoints for model improvisation settings — they are UI-only (localStorage)
- [ ] Do NOT change how `assembleContext()` works — the context pipeline stays identical
- [ ] Do NOT break the NewSessionDialog's pre-population from workspace-context-config
