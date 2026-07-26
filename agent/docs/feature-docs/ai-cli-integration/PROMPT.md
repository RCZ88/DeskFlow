# PROMPT: AI Agent CLI Integration — Terminal Layout & Prompt Insertion

## Raw Request

> "can you make sure that the open code tui or any ai agnet terminal CLI works properly as in fitting into the terminal properly. it should not push the ui down, it should display everything properly and not break. use generate-prompt skill to do the research on like what to do to maintain and insert the prompts and anything into the textbox on the CLI and TUI of opencode claude code gemini cli codex, etc."

## Context Bundle Reference

Read `agent/docs/ai-cli-integration/CONTEXT_BUNDLE.md` for the complete source code of all files involved. The context bundle contains:
- `src/components/TerminalWindow.tsx` — TerminalPane, TerminalLayout, PaneRenderer, measureSpawnSize
- `src/pages/TerminalPage.tsx` — spawnTerminal, initializeTerminal, handleSendToTerminal
- `src/preload.ts` — IPC bridge for terminal operations
- AI agent type definitions from `IDEProjectsPage.tsx`

## Problem Statement

The terminal workspace has three issues:

1. **Open Terminal button slides down** — The center button in the empty terminal state doesn't stay centered. When switching sidebar pages, it briefly centers but then slides down. The parent container lacks a bounded height, so `h-full` doesn't work correctly in the flex chain.

2. **AI agent TUIs break layout** — Full-screen TUI apps (like opencode) redraw the entire terminal buffer and can push the UI down or cause layout shifts. The `measureSpawnSize` function at `TerminalWindow.tsx:590` tries to measure the pane size but falls back to 80x24 when dimensions aren't available.

3. **Prompt insertion into CLI textboxes** — Need to understand how each AI CLI (opencode, claude-code, codex, gemini) accepts input and how to properly inject prompts into their text input. The current `agentSend()` IPC sends raw text to PTY stdin, but different CLIs may require different input methods.

## Engineering Task

### Task A: Research AI CLI Input Mechanisms

For each supported AI agent, research and document:

1. **Input method:** How does the CLI accept user input? (stdin, TUI text field, readline, etc.)
2. **Prompt injection:** Can you programmatically send a prompt? What's the exact API/method?
3. **Session management:** How to create/resume sessions programmatically
4. **Output format:** Does it output to stdout? Does it use ANSI escape codes?
5. **Size requirements:** Does it need a minimum terminal size? Does it redraw the full screen?

**Agents to research:**
- opencode (`opencode` CLI)
- claude-code (`claude` CLI)
- codex (`codex` CLI)
- gemini CLI (`gemini` CLI)

### Task B: Fix Terminal Layout

Design fixes for:

1. **Center button positioning:**
   - The empty state div at `TerminalWindow.tsx:757` uses `absolute inset-0` now
   - Ensure the parent chain provides a bounded height
   - Verify the button stays centered after sidebar page switches

2. **TUI "push down" prevention:**
   - The xterm.js container at `TerminalWindow.tsx:410` uses `w-full h-full min-h-0 overflow-hidden`
   - Full-screen TUI apps must not expand this container
   - Need to ensure `overflow: hidden` prevents content from pushing the layout

3. **Terminal resize handling:**
   - `ResizeObserver` at line 169 handles resize
   - `fitAddon.fit()` is called on resize
   - PTY resize is sent via `terminalResize()` IPC
   - Need to verify this works correctly for all agent types

### Task C: Prompt Insertion System

Design a system for inserting prompts into AI CLI textboxes:

1. **How to detect the active input method** — stdin vs TUI text field
2. **How to programmatically type into the TUI** — using xterm.js `terminal.write()` or PTY stdin via `terminalWriteRaw()`
3. **How to handle multi-line prompts** — line breaks, escape sequences
4. **How to handle special characters** — quotes, backticks, code blocks
5. **How to verify the prompt was received** — check for acknowledgment

### Task D: Integration Points

Map the integration points in the existing codebase:

1. **`initializeTerminal()`** at `TerminalPage.tsx:933` — where prompts are sent after terminal spawn
2. **`handleSendToTerminal()`** at `TerminalPage.tsx:1411` — how messages are sent to running terminals
3. **`agentSend()` IPC** — the bridge between renderer and main process
4. **`TerminalPane` component** at `TerminalWindow.tsx:103` — where xterm.js is set up and FitAddon is managed

## Constraints

- Must work with existing xterm.js setup (no framework changes)
- Must not break existing terminal functionality
- Must handle all 4 AI agent types
- Must work with the existing sidebar/terminal layout
- Must preserve terminal session state on resize
- Must not push the UI down when TUI apps redraw

## Output Format

Return:
1. **AI CLI Input Reference** — per-agent documentation of input methods (table format)
2. **Layout Fix Specs** — exact CSS/JS changes for terminal positioning
3. **Prompt Insertion API** — function signatures and data flow for each agent
4. **Integration Plan** — which files change and how (file path + line numbers)
5. **Testing Strategy** — how to verify each agent works correctly
