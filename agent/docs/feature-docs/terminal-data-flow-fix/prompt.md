## Raw Request

"session creation doesnt work. the terminal doesnt work. always use generate prompt for things u cant do. dont overestimate urself"

## Problem Statement

The terminal PTY spawns successfully (process alive, PID confirmed), `terminalWriteRaw` writes return `{success: true}`, but **no PTY output ever reaches the xterm.js terminal** in the renderer. The xterm persistently shows only "Starting shell..." indefinitely. The `terminal:ready` fallback (3s timeout) fires, and `handleTerminalReady` in TerminalWindow.tsx flushes buffered input to the PTY — but the PTY's response never renders in xterm.

The false-crash issue (exit code -1073741510 showing crash overlay on dedupe kill) was already fixed with `intentionalKills` Set + `spawnTimes` guard. That part works. The remaining problem is the **broken data path from node-pty → renderer → xterm**.

## Context

Read `agent/docs/terminal-data-flow-fix/CONTEXT_BUNDLE.md` — it contains all relevant code with exact line numbers for:

- `terminalManager` object (src/main.ts:8375) — PTY lifecycle, `getDataHandler`, `spawn`
- `broadcast()` function (src/main.ts:8168) — sends events to all windows
- `armTerminalReadyFallback` / `clearTerminalReadyFallback` (src/main.ts:8101)
- C2 `spawn-terminal` handler (src/main.ts:8650) — the ONLY terminal creation path
- Preload bridges (src/preload.ts:283-346) — `spawnTerminal`, `onTerminalData`, `terminalAPI.onData`, `onTerminalReady`, `terminalWriteRaw`
- TerminalWindow.tsx data handler (lines 194-226) — `onTerminalData` callback, `onTerminalReady` callback
- TerminalPage.tsx `spawnTerminal` (lines 1674-1692) and `handleCreateTerminal` (lines 1708-1721)
- IPC channel summary table
- Known verified facts from Probe MCP testing

## Engineering Task

Trace the full data flow from PTY output → renderer → xterm and identify why data is lost. Specifically:

**Phase 1 — Root Cause Analysis**

1. **Trace the broadcast path:** When `broadcast('terminal:data', id, data)` is called at main.ts:8667, does `win.webContents.send('terminal:data', id, data)` actually deliver to the renderer? Check `BrowserWindow.getAllWindows()` — are there multiple windows? Is the correct window targeted?

2. **Check the preload receiver:** Both `onTerminalData` (line 287) and `terminalAPI.onData` (line 341) listen on `terminal:data`. Does `terminalAPI.removeDataListener` (line 344, calls `removeAllListeners('terminal:data')`) ever get called by any renderer code? If so, it destroys the `onTerminalData` listener.

3. **Check TerminalWindow.tsx useEffect ordering:** The `onTerminalData` registration at line 197 is inside a `useEffect` with `[terminalId]` dependency. The `terminal.onData` input handler at line 176 is also a separate `useEffect` with `[terminalId]`. Could there be a race where the data handler is registered AFTER data arrives?

4. **Verify `terminalRef.current`:** At line 198, the guard `if (id === terminalId && terminalRef.current)` could silently swallow data if `terminalRef.current` is null (xterm not mounted yet).

5. **Check for empty/control-only data:** Windows cmd.exe may output only carriage returns or ANSI sequences. The `broadcast` at line 8667 always sends data, but maybe the data is empty or xterm doesn't render it.

6. **Verify `handleTerminalReady` doesn't block data:** At line 215, `onTerminalReady` fires and calls `setIsDead(false)` which causes a re-render. Could this re-render unmount/remount the data handler, dropping any concurrent `terminal:data` broadcast?

7. **Check `clearAgentTimeout` interaction:** At line 8698, when agent is ready, `clearAgentTimeout(id)` is called. Does interfering with the timeout timer have any side effect on event delivery?

**Phase 2 — Fix**

Based on the root cause found, implement a surgical fix:

- If the `onTerminalData` vs `terminalAPI.onData` conflict: consolidate into one listener, remove `removeDataListener` or make it safe
- If useEffect ordering: move data handler registration earlier (e.g., into the same useEffect that mounts xterm)
- If `terminalRef.current` is null: buffer data until ref is set, then flush
- If broadcast targets wrong window: verify window count and send to specific window
- If data is empty/control-only: log raw data output to diagnose

**Do NOT** change:
- The false-crash fix (intentionalKills, spawnTimes, bad-cwd guard) — it works
- The terminal creation path (use `spawn-terminal`, not `terminal:create`)
- The overall event sequence (spawn → getDataHandler → getExitHandler)

**After implementing:**
1. Rebuild with `npm run build`
2. Verify the app launches without errors
3. Verify that after spawning a terminal, the cmd.exe prompt appears in xterm within 3 seconds
4. Verify typing a command in xterm and pressing Enter shows the command output

## Output Format

Return your analysis and fix as:

```
## Root Cause
[one paragraph explaining exactly why data doesn't reach xterm]

## Files Changed
- `src/main.ts` — [specific lines changed and what changed]
- `src/preload.ts` — [specific lines changed and what changed]  
- `src/components/TerminalWindow.tsx` — [specific lines changed and what changed]

## Fix
```diff
// exact diffs for each file
```

## Verification
[steps to verify the fix works]
```
