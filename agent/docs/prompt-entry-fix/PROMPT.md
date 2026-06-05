# Design Prompt: Fix Prompt Entry, Sending, and Session UID

## Raw Request

> BROTHER , IT DOESNT ENTER IN THE PROMTP PROPERLY. IT DOESNT ENTER IT ON THE TEXT BOX IDIOT. CREATE A PROMPT TO FIX AOTAT MAKE SURE THEENTERING OF THE PROMPT< THE SENDING OF THE PROMPT, NAD THE SAVING OF THE SESSION UID IS WORKING PROPERLY. session uid can be done with opencode session list command and teh ngetting the latest session id the ones on the top.

## Problem Statement

The `DEFAULT_SYSTEM_PROMPT` (700+ line constant in `src/lib/defaults.ts`) is currently **display-only**. It shows up in the Settings page and NewSessionDialog preview, but NEVER gets entered into the instruction panel text box. When a user clicks "Send to Terminal" in the InstructionPanel, the generated prompt includes skill content, problems, requests, checklists, and custom instructions — but the system prompt is entirely absent. The session record is saved with a fake `session-${Date.now()}` ID and a generic topic like `"Instruction: 0p 0r"`.

This means every AI agent session starts without the system prompt, making all the AGENTS.md instructions, cross-session sync rules, and behavior guidelines invisible to the agent. The session is untraceable because the ID is a fake timestamp rather than the real opencode session ID.

## Context Bundle

Read `CONTEXT_BUNDLE.md` at `agent/docs/prompt-entry-fix/CONTEXT_BUNDLE.md` for complete code references — it contains exact file paths, line numbers, IPC handlers, data schemas, and the full flow diagram.

## Engineering Task

Design the complete solution for these three issues:

### Issue 1: Prompt Not Entering the Text Box
**Current behavior:** `InstructionPanel.tsx:generatePrompt()` builds a prompt from skill + problems + requests + checklists + agent files + custom instruction. The `DEFAULT_SYSTEM_PROMPT` is never included.

**Required behavior:** When the instruction panel opens, it should either:
- Pre-populate the textarea with the effective system prompt (from `DEFAULT_SYSTEM_PROMPT` or user prefs) so the user can see it and edit it, OR
- Automatically include the system prompt as a layer in `generatePrompt()` (hidden from the textarea, visible in preview), OR
- Add a toggle/checkbox in the panel that lets the user choose whether to include the system prompt

**Data flow:**
- `InstructionPanel` receives a `systemPrompt` prop from `TerminalPage` (which resolves the effective prompt from `DEFAULT_SYSTEM_PROMPT` + custom additions + user prefs)
- When building the prompt for sending, the system prompt content is prepended or included as the first section
- The textarea shows the custom instruction only (current behavior) OR the combined prompt

### Issue 2: Prompt Sending Not Working Properly
**Current behavior:** `TerminalPage.tsx:handleInstructionPanelSend()` writes `config.prompt` to the terminal via `terminalWrite()`, then saves a session with `session-${Date.now()}` and topic `"Instruction: Xp Yr"`. The topic is useless — no one knows what the prompt was about.

**Required behavior:**
- The session topic should reflect the actual content: use the first N chars of the prompt or instruction as the topic
- The session should be saved BEFORE the terminal write, so the session exists when the AI starts processing
- Add better error handling: if `saveTerminalSession` fails, write an error log and show a user-facing alert
- Ensure the system prompt is part of what gets written to the terminal, not just the instruction content

### Issue 3: Session UID Not Saved with Real opencode Session ID
**Current behavior:** `session-${Date.now()}` is generated in the renderer. No connection to the actual opencode CLI session.

**Required behavior:**
- In `handleInstructionPanelSend()` (or a new helper), call `window.deskflowAPI.executeCommand('opencode session list')` to get the actual opencode sessions
- Parse the CLI output to extract the latest session ID (first row after the header — "the ones on the top")
- Use this real opencode session ID when calling `saveTerminalSession()`
- Store the real ID in `terminal_sessions.id` or in a new `opencode_session_id` column
- If the CLI command fails or returns empty, fall back to the current generated ID pattern
- Add a new IPC handler or preload bridge if needed for this specific operation

**`opencode session list` output format (expected):**
The output is tabular. The first line is a header, then each subsequent line is a session. The first column is the session ID. Example:
```
ID              Agent   Started              Topic
abc123-def456   claude  2026-05-31 10:00:00  Fix prompt entry
```

## Design Requirements

### Data Processing Pipeline
1. `InstructionPanel.tsx`: Add `systemPrompt` prop (string). Modify `generatePrompt()` to optionally include system prompt content as a leading section.
2. `TerminalPage.tsx` `handleInstructionPanelSend()`: Before saving the session, call `executeCommand('opencode session list')`. Parse the flat text output to extract the latest session ID. Use that as the session ID in `saveTerminalSession()`.
3. `InstructionPanel.tsx`: Add a checkbox/toggle "Include System Prompt" (default: ON) that controls whether the system prompt is prepended.
4. `TerminalPage.tsx`: Resolve the effective system prompt (from preferences or DEFAULT_SYSTEM_PROMPT) and pass it as prop to InstructionPanel.
5. Update the session topic to include a truncated version of the actual instruction text instead of just "Xp Yr".

### UI/UX Specifications
1. **InstructionPanel**: Add a collapsible "System Prompt" section at the top of the panel, showing the first ~200 chars of the active system prompt with a "Show more" expand. Include a toggle to include/exclude it from the sent prompt.
2. **Send flow**: Show the resolved session ID in a toast after send (e.g., "Sent to terminal (session: abc123-def456)")
3. **Session topic**: Instead of "Instruction: 2p 1r", use something like "Fix login bug — [Instruction: 2p 1r]" or the first 60 chars of the instruction text
4. **Loading state**: Show a brief loading indicator when fetching the opencode session list (it's a subprocess call, may take 500ms-2s)

### Interaction Flow
1. User opens InstructionPanel → system prompt section is visible (collapsed, showing first 200 chars) with "Include System Prompt" toggle defaulting to ON
2. User composes instruction text → clicks "Send to Terminal"
3. System resolves the effective prompt = (optionally system prompt) + generatePrompt() output
4. System calls `executeCommand('opencode session list')` → parses output → gets latest session ID
5. System calls `terminalWrite()` with the full prompt
6. System calls `saveTerminalSession()` with the real opencode session ID
7. Toast shows success with session ID
8. If opencode CLI fails → fall back to `session-${Date.now()}` + show warning toast

### Error States
- **opencode CLI not installed**: Fall back to generated ID, show warning toast
- **opencode session list returns empty**: Fall back to generated ID
- **saveTerminalSession fails**: Show error toast, but the terminalWrite already happened so the prompt was at least delivered
- **terminalWrite fails**: Show error toast, don't save session

## Constraints
- Must work with existing IPC infrastructure (`electron:execute-command` already exists)
- `terminal_sessions.id` is TEXT PRIMARY KEY — can accept opencode session IDs
- Must NOT introduce new Node.js dependencies
- Must handle the case where `opencode` binary isn't available (graceful fallback)
- The `terminal_messages.session_id` column stores terminal IDs, not session UUIDs — don't confuse the two
- Must preserve backward compatibility with existing sessions

## Verification Checklist
- [ ] When InstructionPanel opens, system prompt is visible and toggleable
- [ ] System prompt is included in the written terminal output when toggle is ON
- [ ] After send, `saveTerminalSession()` is called with real opencode session ID
- [ ] Session topic shows meaningful text (first 60 chars of instruction, not "Xp Yr")
- [ ] When `opencode session list` fails, fallback works and toast shows warning
- [ ] Build passes with `npm run build`
