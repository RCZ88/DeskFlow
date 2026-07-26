# Round 2 — Terminal Spawn + Agent Readiness — Fix Spec
**Date:** 2026-06-13
**Feature Scope:** §19 Terminal Spawning + §25 Agent Status state machine
**Files:** TerminalPage.tsx, TerminalWindow.tsx, preload.ts, main.ts

---

## ROOT CAUSE

"Agent never reaches ready" is not one bug — it is a cluster of four defects that compound. Any one of them alone can leave a pane stuck in `launching` forever with no error.

### PRIMARY — agentType is dropped at spawn, so prompt detection uses the wrong readyRegex
- `spawnTerminal` wrapper (TerminalPage.tsx:1442) calls `window.deskflowAPI.spawnTerminal(terminalId, cwd || '')` and **drops the 3rd arg (agentType)**.
- The `spawn-terminal` IPC handler (main.ts:7728) therefore receives `agentType === undefined` and defaults it to `'opencode'`.
- That default is what seeds `agentStates.set(id, { agentType: 'opencode', phase: 'launching', ... })` (main.ts:7733).
- `detectAgentPrompt()` (main.ts:7288) looks up `getAgentConfig(agentType).readyRegex` using that seeded type. So for ANY non-opencode agent (claude / codex / aider / cursor), the matcher uses the wrong (or fallback) regex and **never matches the real prompt** → phase stays `launching`.
- The only fallback to ready is the handshake token, which depends on terminal echo (unreliable; see Defect D).

### SECONDARY — no main-process timeout is armed on the INITIAL launch
- `spawn-terminal` (main.ts:7733) and `terminal:create` (main.ts:7660) set phase `launching` but **never call `startAgentTimeout()`**.
- `startAgentTimeout()` (main.ts:7376 — the 30s timer that fires `agent:timeout` + `agent:init-error` and runs `diagnoseAgentFailure`) is only called from `agent:retry-launch` (main.ts:7882).
- There is also an `agent:start-timeout` IPC (main.ts:7868) that the renderer never calls.
- Result: on initial launch, the ONLY guard is the renderer-side 15s `onAgentReady` timeout in `initializeTerminal()` (TerminalPage.tsx:633), which **resolves silently** — no `agent:timeout`, no `agent:init-error`, no retry overlay. A failed initial launch sits silent forever, then the code proceeds to write the system prompt into a still-`launching` agent (queued into `pendingWrites`, never flushed because ready never fires).

### TERTIARY — `terminal:exit` never reaches the renderer (event-name mismatch)
- Main broadcasts `broadcast('terminal:exit', ...)` (main.ts:7719, 7790, colon).
- Preload listens on `ipcRenderer.on('terminal-exit', ...)` (preload.ts:276, hyphen).
- The names don't match → exit/crash events never reach the renderer → a dead/crashed PTY still looks alive, no re-spawn, no cleanup.

### QUATERNARY — `terminal:ready` is fake (100ms client timer, not real PTY readiness)
- Main never broadcasts `terminal:ready`. The signal is a 100ms `setTimeout` in TerminalWindow.tsx:163 that calls the `onTerminalReady` prop locally.
- `initializeTerminal()` step 3 (TerminalPage.tsx:587) waits on this with an 8s timeout, but it's satisfied after 100ms regardless of actual shell readiness.
- Race: the launch command (step 5) can be written before the shell is actually accepting input → the `agent` launch line is eaten/mangled → agent never starts.

---

## CHANGES REQUIRED

### A. Forward agentType through spawn (fixes PRIMARY)
- **TerminalPage.tsx:1435/1442** — add `agentType?` to the `spawnTerminal` wrapper signature and forward it: `window.deskflowAPI.spawnTerminal(terminalId, cwd || '', agentType)`.
- **TerminalPage.tsx:975 (handleCreateNewSession)** — pass `newSessionAgent` as the 3rd arg (already in scope).
- Effect: `agentStates` is seeded with the real agent type → `detectAgentPrompt` uses the correct `readyRegex`.

### B. Arm the launch timeout on the INITIAL spawn (fixes SECONDARY)
- **main.ts:7733 (spawn-terminal) and main.ts:7660 (terminal:create)** — immediately after `agentStates.set(...)` with phase `launching`, call `startAgentTimeout(id, type)`.
- This makes `agent:timeout` + `agent:init-error` + `diagnoseAgentFailure` fire on initial failures, not just retries. Remove sole reliance on the renderer's silent 15s timeout.
- Optional: have `initializeTerminal()` call the existing `agent:start-timeout` IPC instead, to keep timeout ownership in one place.

### C. Fix the `terminal:exit` event name + wire cleanup (fixes TERTIARY)
- **preload.ts:276** — listen on `'terminal:exit'` (colon) to match the main-process broadcast.
- **TerminalPage.tsx (onTerminalExit handler)** — on exit, mark the pane dead, clear `agentStates`-derived UI state, and surface a re-spawn affordance. Add re-spawn logic (none exists today).

### D. Make `terminal:ready` real (fixes QUATERNARY)
- **main.ts** — after `pty.spawn` succeeds (terminalManager.spawn, main.ts:7497), `broadcast('terminal:ready', id)` once the shell has emitted its first prompt (or first data chunk), instead of relying on TerminalWindow.tsx:163's 100ms timer.
- **TerminalWindow.tsx:163** — remove/replace the unconditional 100ms `onTerminalReady` timer; drive readiness from the real IPC event.
- Effect: the launch command is written only after the shell is genuinely accepting input.

### E. Fix the retry agentType heuristic
- **TerminalPage.tsx:2325** — replace `handleRetryAgentInit(tid, err.reason === 'not-recognized' ? 'opencode' : 'claude')` with `handleRetryAgentInit(tid, err.agentType)` (the real type is already in `agentInitErrors[tid].agentType`).
- **TerminalWindow.tsx:305 (overlay onRetryInit)** — pass the session's real agentType, not a reason-based guess. Wire the overlay callback to `(terminalId) => handleRetryAgentInit(terminalId, sessionAgentType)`.

### F. Queue agent:send during `busy`, and flush on idle
- **main.ts agent:send handler (main.ts:7813)** — when `phase === 'busy'`, push to `pendingWrites` instead of writing directly (today busy-phase sends go straight to the PTY and can be dropped/interleaved).
- **main.ts data handler busy->ready transition (main.ts:7767/7695)** — flush `pendingWrites` on `busy -> ready` (agent:idle), not only on `launching -> ready`.

### G. Preserve / surface pendingWrites on kill
- **main.ts terminalManager.kill (main.ts:7534)** — if `pendingWrites` is non-empty, mark those `terminal_messages` rows as `failed` and broadcast so the UI can show the loss instead of dropping silently.

### H. Tighten ready detection to prevent false-ready
- **main.ts getAgentConfig fallback readyRegex** (`/^[A-Za-z0-9_-]*\s*>\s*$/`) matches `node >`, `git >`, etc. For the fallback config, require a handshake-token confirmation in addition to the regex before declaring ready, or expand `SHELL_PROMPT_REGEXES`.

### I. Don't rely solely on terminal echo for the handshake
- **main.ts handshake detection (main.ts:7682)** uses `dataBuffer.includes(token)`, which assumes the agent echoes input. The `bracketedPaste` field in AgentConfig is defined but unused.
- Use `bracketedPaste` to wrap the token write, or add a per-agent ready-banner regex as a secondary signal so readiness doesn't depend exclusively on echo.

### J. Unify the three write paths
- `terminalWriteRaw` (terminal:write-raw — no DB/queue), `writeTerminal` (write-terminal — DB + rules reinjection, no queue), `agentSend` (agent:send — DB + phase-aware queue) all coexist.
- Route all agent-directed content through `agent:send` (phase-aware). Reserve `write-raw` for literal user keystrokes. Document the contract.

---

## IPC CHANGES
- Fix `terminal-exit` -> `terminal:exit` listener (C).
- Call `startAgentTimeout` on initial spawn, or invoke the existing `agent:start-timeout` IPC from the renderer (B).
- No new IPC channels strictly required; `agent:start-timeout` already exists but is unused.

## DB CHANGES
- None required.
- Optional: persist `agentType` on `terminal_sessions` so retry/resume relaunches the correct binary even after a reload.

---

## VERIFICATION
1. Launch claude / codex / aider / cursor (non-opencode): `agentStates[id].agentType` equals the selected agent (not `'opencode'`); `detectAgentPrompt` matches; `agent:ready` fires; queued system prompt flushes.
2. Launch a missing binary: within 30s an `agent:init-error` banner + retry overlay appears (previously silent forever).
3. Retry a failed non-opencode session: relaunches the SAME agent (uses `err.agentType`), not opencode/claude.
4. Kill or crash the agent process: renderer receives `terminal:exit`, the pane is marked dead, re-spawn is offered.
5. Type keystrokes before ready: they buffer in `inputBuffers` and replay after real readiness — none lost; launch command not eaten.
6. Rapid agent:send while busy: messages queue and flush in order on next idle; none dropped.

## STATUS
DIAGNOSED — backend changes: arm initial timeout (B), queue-on-busy (F), real terminal:ready broadcast (D), fallback ready hardening (H/I). Renderer changes: forward agentType (A), fix exit listener (C), fix retry agentType (E). No DB changes required.
