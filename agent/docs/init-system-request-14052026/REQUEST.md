# Initialize System — Complete Specification

## 1. Initialize Button + Dialog

### Button
- A dedicated "Initialize" button on the Terminal page
- Clicking it opens a dialog/pop-up

### Dialog
- Lets user choose which **terminal** or **session** to use for initialization
  - Option A: Create a new terminal (default)
  - Option B: Select an existing terminal from a dropdown
- Field: Choose which **AI agent** to use (Claude Code / OpenCode)
- Field: Select **Initialize.md** (the init file) — files come from `{projectPath}/agent/` directory ONLY
- Field: **Custom system prompt** — plain textarea where user can add extra instructions
- Checkboxes: Select which **problems** and **requests** to include as context
- Button: "Initialize" to confirm

### What happens on confirm
1. The system builds the full initialization content:
   ```
   [Initialize.md content from selected file]
   + [custom system prompt if provided]
   + [problem/request context if selected]
   ```
2. Sends it to the chosen terminal BEFORE the agent launch command
3. Then launches the agent (`claude` / `opencode`)
4. Saves the session config to `{projectPath}/agent/session-configs/{sessionId}.json`

---

## 2. System Prompt Customization (Separate Feature)

- User should be able to customize the **base system prompt** that goes into EVERY prompt
- This is NOT the per-session custom prompt — this is a persistent system prompt
- Could be stored in preferences (like `deskflow-prefs.json`)
- Every time the agent is launched, this base system prompt is sent first, THEN the init content
- This gives the AI persistent context about the project

---

## 3. AI Progress Tracking via JSON

- When the AI runs, it should be able to read/write a progress JSON file
- Purpose: track what files have been created, what's in progress, what's done
- Location: `{projectPath}/agent/` directory
- The JSON tracks:
  ```json
  {
    "session_id": "...",
    "status": "in_progress",
    "files_created": ["src/foo.ts", "src/bar.ts"],
    "files_modified": ["src/baz.ts"],
    "current_task": "Implementing X",
    "completed_tasks": ["Setup Y", "Fix Z"],
    "blockers": ["Waiting for API key"]
  }
  ```
- The UI should be able to display this progress
- The AI reads this file to know what's been done
- The AI writes to this file to update progress

---

## 4. File Picker for Compose / InstructionPanel

- The compose/instruction area should let users **click files** to include them
- Files should be selectable from `{projectPath}/agent/` directory
- NOT from root, NOT from other directories — only `agent/`
- Clicking a file should insert its content or a reference into the instruction
- This replaces needing to type file paths manually

---

## 5. agent.md Integration

- The initialization should include context from `agent/agent.md`
- This file contains the project's agent rules
- When initializing, read `agent.md` and include its content as part of the system context
- This ensures the AI knows the project conventions

---

## 6. Terminal Not Showing — MUST FIX

### Symptom
- Clicking "New Terminal" or creating a terminal from the dialog
- The terminal pane area stays blank or shows "Open Terminal" button
- The PTY spawns (shell starts) but the xterm pane doesn't render

### Likely root causes to check
- **Layout not being set** — when `create-terminal` event fires without the layout being set first, TerminalLayout shows "Open Terminal" button forever
- **Race condition** — `handleTerminalCreated` calls `initializeTerminal` which sets the idempotent guard, then the onCreate handler can't send custom content
- **TerminalLayout condition** — the `if (!layout || getLeafIds(layout).length === 0)` might be true when it shouldn't be
- **React re-render** — layout state is set but TerminalLayout doesn't re-render because the reference didn't change or because of batched updates

### Verification
- After clicking "New Terminal" or confirming the Initialize dialog:
  1. A tab should appear in the tab bar
  2. The terminal pane should render (dark background with xterm cursor)
  3. "Starting shell..." should appear
  4. Shell prompt should appear (e.g., `PS C:\...>`)
  5. Agent should launch (if initialization is configured)

---

## 7. Session Save / Load — MUST WORK

### Save
- When a session is created via the Initialize dialog, save:
  - Session config JSON → `{projectPath}/agent/session-configs/{sessionId}.json`
  - Terminal binding → DB (`terminal_bindings` table)
  - Session record → DB (`terminal_sessions` table)
  - Layout → DB (`terminal_layouts` table)

### Load / Resume
- On page load, load the saved layout and sessions
- "Resume" button on a session should:
  1. Create or select a terminal
  2. Send the init content + system prompt
  3. Launch the agent with `--resume {resumeId}` (if supported)

---

## 8. File Source Rules

- **Init files**: loaded from `{projectPath}/agent/` directory
- **System prompt files**: loaded from `{projectPath}/agent/` directory  
- **Progress JSON**: written to `{projectPath}/agent/` directory
- **Session configs**: saved to `{projectPath}/agent/session-configs/`
- **ONLY the `agent/` directory under the project root** should be used for these files
- NOT the app's userDataPath
- NOT the project root itself
- NOT any other location

---

## Data Flow Diagram

```
[Initialize Button] → [Dialog]
                         ├── Select terminal (new/existing)
                         ├── Select AI agent
                         ├── Select Initialize.md from agent/
                         ├── Custom system prompt (optional)
                         ├── Select problems/requests (optional)
                         └── [Confirm]
                              │
                              ├── Build init content:
                              │   ├── agent/agent.md (always)
                              │   ├── selected Initialize.md
                              │   ├── custom system prompt
                              │   └── problem/request context
                              │
                              ├── Create/select terminal
                              ├── Set layout
                              ├── Send init content → terminalWrite()
                              ├── Wait for shell ready
                              ├── Send launch command (claude/opencode)
                              │
                              └── Save:
                                  ├── session config → agent/session-configs/{id}.json
                                  ├── session record → DB
                                  ├── terminal binding → DB
                                  └── layout → DB
```

## Files to Modify

### Core (must fix)
- `src/pages/TerminalPage.tsx` — `initializeTerminal`, `onCreate` handler, `handleTerminalCreated`, layout management
- `src/components/NewSessionDialog.tsx` — add "Initialize" mode if separate from "New Session"
- `src/components/InstructionPanel.tsx` — file picker for agent/ directory
- `src/main.ts` — `read-init-file`, `list-init-files` handlers (use project path, not userDataPath)
- `src/preload.ts` — expose `readInitFile`, `listInitFiles`

### If needed
- `src/components/TerminalWindow.tsx` — `TerminalLayout` condition fix, `handleCreateTerminal`
- `src/services/ProblemsService.ts` — JSON source of truth
- `src/services/RequestsService.ts` — JSON source of truth

## Acceptance Criteria

1. Clicking Initialize button opens a dialog
2. Dialog lets you select terminal/session, agent, init file, system prompt, problems, requests
3. On confirm, init content (agent.md + Initialize.md + system prompt + context) is sent to terminal
4. Agent launches afterwards
5. Terminal pane renders correctly (not blank, not stuck on "Open Terminal")
6. Session config is saved and can be loaded/resumed
7. Progress JSON can be read/written by the AI
8. File picker in compose shows files from agent/ directory
9. All files come from `{projectPath}/agent/` — NOT userDataPath, NOT root
