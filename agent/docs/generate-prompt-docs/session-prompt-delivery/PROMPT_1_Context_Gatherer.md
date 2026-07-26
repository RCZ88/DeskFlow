# PROMPT #1: Context Gathering — Terminal Workspace Deep Dive

## Your Task
I need you to gather the COMPLETE source code of the terminal workspace system and package it into a self-contained Context Bundle. This is for an external research agent that has zero knowledge of our project.

## What to Gather

For EACH file below, paste the FULL source code (not summaries, not descriptions — the actual code). Include line numbers in comments.

### Priority 1 — Core Terminal Files (MUST HAVE)

1. **`src/pages/TerminalPage.tsx`** — ALL of it. Especially:
   - `initializeTerminal()` function (lines ~935-1088)
   - `handleSendToTerminal()` function (lines ~1411+)
   - `spawnTerminal()` function (lines ~1139-1156)
   - Any state variables, refs, or hooks related to terminal/agent initialization
   - The full `useEffect` that listens for `create-terminal` events
   - The full `useEffect` that listens for `terminal-created` events
   - The full `useEffect` that listens for `conductor:spawn-for-conductor` events

2. **`src/components/TerminalWindow.tsx`** — ALL of it. Especially:
   - `TerminalPane` component (lines ~103-471)
   - `measureSpawnSize()` function (lines ~590-668)
   - `handleTerminalReady()` function (lines ~629+)
   - `PaneRenderer` component (lines ~515-581)
   - `TerminalLayout` component (lines ~669-796)
   - The empty state / center button code (lines ~755-778)
   - The `debounce` utility
   - Any module-level variables like `terminalReadyStates`, `inputBuffers`, `spawnedTerminalsRef`

3. **`src/main.ts`** — The terminal and agent-related sections. Especially:
   - `agent:send` IPC handler (search for `ipcMain.handle('agent:send'`)
   - `terminal:write-raw` IPC handler (search for `ipcMain.handle('terminal:write-raw'`)
   - `terminal:write` IPC handler
   - `terminal:resize` IPC handler
   - `spawn-terminal` IPC handler
   - `buildAgentInputPayload()` function
   - `detectAgentPrompt()` function
   - `markAgentReady()` function
   - `flushPendingAgentWrites()` function
   - `AGENT_CONFIGS` object/constant
   - `agentStates` Map declaration and its type definition
   - `terminalManager` class/object (spawn, write, resize, kill methods)
   - Any `broadcast()` function used for terminal events

4. **`src/preload.ts`** — ALL IPC bridge definitions. Especially:
   - `terminalWriteRaw`
   - `terminalWrite`
   - `terminalWriteDisplay`
   - `terminalResize`
   - `spawnTerminal`
   - `agentSend`
   - `verifyAgent`
   - `retryAgentLaunch`
   - `onTerminalData`
   - `onTerminalReady`
   - `onTerminalExit`
   - `onAgentReady`

### Priority 2 — Agent Configuration & Types

5. **`src/pages/IDEProjectsPage.tsx`** — The `AGENT_DETAILS` constant and any agent-related types/interfaces.

6. **Any agent config files** — Search for files containing `AGENT_CONFIGS`, `opencode`, `claude-code`, `gemini`, `codex` configurations.

7. **`package.json`** — The dependencies section (especially `xterm`, `node-pty`, `electron` versions).

### Priority 3 — Terminal-Related CSS/Styles

8. **Any CSS/Tailwind classes** used for the terminal container chain. Look for:
   - The root terminal container styles
   - The sidebar + terminal layout flex chain
   - Any `h-full`, `min-h-0`, `overflow-hidden` usage in terminal-related components

## Output Format

Save everything to a single file: `TERMINAL_CONTEXT_BUNDLE.md`

Structure it like this:

```markdown
# TERMINAL CONTEXT BUNDLE — DeskFlow Workspace

## File: src/pages/TerminalPage.tsx
### Lines 935-1088: initializeTerminal()
```typescript
[paste FULL function here with line numbers in comments]
```

### Lines 1411-1420: handleSendToTerminal()
```typescript
[paste FULL function here]
```

## File: src/components/TerminalWindow.tsx
### Lines 103-471: TerminalPane component
```typescript
[paste FULL component here]
```

[... and so on for every file ...]
```

## Rules
- Do NOT summarize. Do NOT describe. Paste the ACTUAL CODE.
- If a file is too large, paste the ENTIRE file. Do not truncate.
- Include line number comments every 20-30 lines so references are clear.
- If you cannot find a file, explicitly state: "FILE NOT FOUND: [path]"
- If a function is split across non-contiguous lines, paste each section with its line range.

## After Gathering
Reply with the full `TERMINAL_CONTEXT_BUNDLE.md` content in a code block. I will copy it and send it to the research agent.
