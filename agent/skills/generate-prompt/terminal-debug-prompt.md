# 🔧 Terminal Debugging Prompt for External AI

## Context

You are debugging an Electron + React + TypeScript app called DeskFlow. The integrated terminal is stuck displaying:

```
Terminal initialized. Waiting for shell...
```

and never shows the actual shell prompt. The user has attempted fixes twice already.

## Architecture

**Backend (`src/main.ts` lines ~4740-4920):**
- `terminalManager` object manages PTY processes via `node-pty`
- `spawn(id, cwd, cols, rows)` — creates PTY shell process
- `getDataHandler(id, cb)` — registers callback for PTY output
- `getExitHandler(id, cb)` — registers callback for PTY exit
- IPC handler `terminal:create` calls `spawn()` then `getDataHandler()`

**Frontend (`src/components/TerminalWindow.tsx`):**
- `TerminalPane` component creates xterm.js terminal instance
- On mount, it writes placeholder text: `"Terminal initialized. Waiting for shell...\r\n"`
- It registers for `window.deskflowAPI.onTerminalData` to receive PTY output
- `onTerminalReady` callback triggers `TerminalLayout.handleTerminalReady()`
- `handleTerminalReady` calls `spawnTerminal()` if not already spawned

**Frontend (`src/pages/TerminalPage.tsx`):**
- "Open Terminal" button adds new pane to layout
- `spawnTerminal()` calls `window.deskflowAPI.terminalAPI.create(id, cwd, 80, 24)`

**Preload (`src/preload.ts`):**
- `terminalAPI.create` → IPC `terminal:create`
- `onTerminalData` listens to `terminal:data` events from main process

## Current State (After 2026-05-03 Fix)

The `terminalManager` now has:
1. `proc.onData` attached **immediately** in `spawn()` (not deferred to `getDataHandler`)
2. `dataBuffer` Map that stores PTY output when no callbacks are registered yet
3. `getDataHandler()` flushes buffered data when first callback is added
4. No double-spawn in frontend

**BUT the terminal might still be broken on the user's machine.**

## Your Task

Diagnose why the terminal is **STILL** stuck on "Waiting for shell..." and provide a definitive fix. Consider:

1. **Does the PTY actually spawn?** Check `node-pty` logs, shell path detection on Windows, working directory existence.
2. **Does data reach the renderer?** Check if `terminal:data` IPC events are firing, if preload is receiving them, if frontend callback is triggered.
3. **Is xterm.js rendering correctly?** Check container dimensions, CSS, whether `terminal.write()` is being called with actual shell output.
4. **Is the shell exiting immediately?** Check `proc.onExit`, error codes, shell permissions.
5. **Are there frontend race conditions?** Check if `onTerminalData` is registered before or after `terminal:create` resolves.

## Requirements

- Provide logging code to insert at key points to trace the data flow
- Identify the EXACT file and line where data is lost or the chain breaks
- Give a surgical fix — minimal changes, no refactoring
- The fix must work for the initial terminal (`term-initial`) AND new terminals created via "Open Terminal"

## Files to Examine

1. `src/main.ts` — `terminalManager` object (~line 4740)
2. `src/preload.ts` — `terminalAPI` and `onTerminalData` (~line 175)
3. `src/components/TerminalWindow.tsx` — `TerminalPane` and `TerminalLayout`
4. `src/pages/TerminalPage.tsx` — `spawnTerminal` and button click handler

## Constraints

- Do NOT change the IPC channel names (`terminal:data`, `terminal:create`, etc.)
- Do NOT downgrade `node-pty` or `xterm.js`
- Do NOT add new npm dependencies
- Must work on Windows (PowerShell) and ideally cross-platform
