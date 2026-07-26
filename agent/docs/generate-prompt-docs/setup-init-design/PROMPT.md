## Raw Request

> "why is the setup all weird again? it should be that the setup just shows like the stuff that can be modified or like should be able to be modified, why the initialize should just be like initializing the projects like files and like infrastructure. yknow what, just use the generate prompt thing to discuss: 1. whether we should be having 2 separate things like the initialize and the setup, and how we should separate and what are the features to put on each, considering the list of features we have and like the context of what currently is in the initialize popup."

## Context

This is about the Terminal Page (`src/pages/TerminalPage.tsx`). There are currently **two buttons** in the toolbar:

### Button 1: "Setup" (green, Zap icon)
- **Function:** `handleInitSetup()` 
- **What it does:** Calls `window.deskflowAPI.trackerMindSetup('init-all', projectId, agent)` to create the agent directory structure (AGENTS.md, INITIALIZE.md, PROBLEMS.md, REQUESTS.md, state.md files).
- **UX:** One-click, no dialog. Shows "Setup" → "..." while checking → "Re-init" after success.
- **Status:** Tracks `initStatus` ('idle' | 'checking' | 'ready' | 'init-ok' | 'error').

### Button 2: "Initialize" (amber/orange, FileText icon)
- **Function:** Opens `NewSessionDialog` with `mode='initialize'`.
- **What it does:** Shows a dialog to create a new AI agent terminal session with minimal configuration:
  - Session Name input
  - AI Agent dropdown (Claude Code, OpenCode, Aider, Codex CLI, Gemini CLI)
  - Terminal selector (create new / use existing)
  - System Prompt preview (read-only)
  - Session Additions textarea
- **On confirm:** Creates a new terminal tab, spawns a session with init content + system prompt, writes to the terminal.

### Bonus: "Setup" mode in NewSessionDialog (accessible only via code — no button in toolbar)
- **mode='setup'** in NewSessionDialog shows all the heavy configuration:
  - Context Systems toggle cards: LLM Wiki, Obsidian Skills, Graphify, PARA, QMD Templates, Automations (each with enabled + max_tokens)
  - Context Map visualization
  - Behavior toggles: Auto-summarize, Deep memory, agents.md
  - Additional Agent Files checkboxes
  - Preview Init Content button

### The Confusion
The names overlap confusingly:
- "Setup" = creates agent directory files (one-click)
- "Initialize" = creates a new agent terminal session (dialog)
- "Setup" mode in dialog = full context system configuration (no button exposes this)

## Problem Statement

The user is confused about what "Setup" vs "Initialize" means and what belongs where. The buttons have overlapping conceptual territory and the naming doesn't clearly separate infrastructure setup (creating files/directories) from session initialization (starting a new AI agent session with context configuration).

## Design Task

Design a clear separation of concerns between **infrastructure provisioning** and **session initialization**. Recommend whether to keep, merge, rename, or restructure these two operations.

### Requirements to Address

1. **Naming clarity:** What should each operation be called?
2. **Feature ownership:** What features belong in each bucket?
   - Agent file creation (AGENTS.md, INITIALIZE.md, PROBLEMS.md, etc.)
   - Context system configuration (LLM Wiki, Graphify, Obsidian, PARA, QMD, Automations)
   - Terminal session creation with agent
   - System prompt configuration
   - Init content / init file selection
   - Problem/request linking
   - Behavior toggles (auto-summarize, deep memory)
3. **Dialog vs one-click:** Which operations warrant a dialog vs a simple button?
4. **Flow design:** What's the natural user workflow? (e.g., Setup first → Initialize after, or one combined flow)
5. **Existing code reuse:** Map each recommendation to existing components/states (`handleInitSetup`, `NewSessionDialog` modes, `initStatus` state, `handleCreate` callback).

## Output Format

Return a markdown document with:
1. **Recommendation** — Merge or separate? If separate, what goes where?
2. **New naming** — What each button/dialog should be called
3. **Feature matrix** — Table mapping each feature to its new home
4. **UX flow** — Step-by-step user flow for each operation
5. **Implementation sketch** — Which files change and what needs modifying
