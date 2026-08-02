# Prompt — Build REAL TUI CLI Agent Interaction System

> For the **Architect** AI. You have NO file system access — all source is in `CONTEXT_BUNDLE.md`. Read it fully before writing any code.

## Task

The current agent interaction in the DeskFlow/RHEO Electron app is **FAKE**. It sends raw text to a node-pty terminal via Bracketed Paste escape sequences, and retrieves opencode session IDs by path-matching a separate SQLite database. You must design and implement a REAL TUI CLI agent interaction system that:

1. **Properly inputs prompts** to TUI-based CLI agents (opencode, claude, gemini, codex) — aware of the agent's UI mode, not blind text injection.
2. **Retrieves the session ID from agent output**, not from a separate database.
3. **Parses agent output** for structured data: session IDs, confirmation prompts, file changes, error states.
4. **Tracks agent state** robustly (launching → ready → busy → attention → done) using actual TUI output signals, not regex-on-shell-prompt heuristics.

## Constraints

- Files are CRLF. Preserve line endings; don't mass-reformat.
- Never reorder the PTY event order: **mark-spawned → spawn → created → initialize**.
- Prefer renderer-side fixes; read the FULL IPC handler before editing main.ts.
- All localStorage access wrapped in try/catch.
- Build = `node scripts/build.mjs` then rebuild preload.
- Black screen prevention: every build must produce a visible, interactive app window.

## Deliverables

### 1. Agent Output → Session ID Capture (main process)

Replace the `capture-opencode-session-id` IPC handler's DB-only approach with a **stream-parsing** approach. When the agent's PTY output arrives, scan it for the session ID token that opencode/claude/gemini/codex print on startup or in response to a query.

**Required:**
- A `parseSessionIdFromOutput(output: string, agentType: string): string | null` function.
- Called from the PTY data handler (the same place `detectAgentPrompt` runs) — the FIRST time a session ID is found, store it on the `AgentState` object AND broadcast an `agent:session-id-captured` event to the renderer.
- The renderer saves it to `terminal_sessions.resume_id` via the existing `updateSessionResumeId` IPC.
- Keep the DB lookup as a FALLBACK when output-parsing fails, but never as the primary path.

**Session ID token formats to detect:**
- opencode: The `session` table stores UUIDs. The agent may output a "Session: <uuid>" or "session_id=<uuid>" line on startup.
- Generic pattern: `/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i` — accept any UUID in the output within the first N lines of a fresh session, OR a labeled pattern.
- Do NOT match the DeskFlow-generated `session-...` IDs (those live in DeskFlow's own DB, not the agent's output).

### 2. Proper TUI Input Mode (main process + preload)

Replace the one-shot `buildAgentInputPayload` with a **mode-aware input pipeline**.

**Required:**
- A per-agent input strategy. Each `AgentConfig` gets a new field `inputMode: 'readline' | 'raw' | 'tui'`.
  - `readline`: type text + `\r` (opencode/claude CLI when in interactive prompt mode).
  - `raw`: plain `\n` (non-interactive stdin).
  - `tui`: full TUI aware — send keystrokes, handle prompt line redraws, may need ESC sequences.
- The input function must be **self-synchronizing**: before writing a prompt, it confirms the agent is in an input-accepting state (from `AgentState.phase`), and after writing, it marks the state `busy` so subsequent writes queue.
- Support a **command injection** path: to capture the session ID, the system may need to send a command like `-v` or a query to the agent. This must not corrupt the user's prompt queue.

### 3. Output Parser (main process)

Create `src/main/agentOutput.ts` (new file) with:

```typescript
export interface ParsedAgentOutput {
  sessionId?: string;
  actionRequired?: boolean;
  fileChanges?: Array<{ action: 'edit' | 'create' | 'delete' | 'rename'; filePath: string }>;
  errors?: string[];
  promptDetected?: boolean;
  agentVersion?: string;
}

export function parseAgentOutput(output: string, agentType: string, state: AgentState): ParsedAgentOutput;
```

- `parseAgentOutput` is called from the PTY data handler with each new data chunk (coalesced).
- It must be **incremental** — it can be called repeatedly with growing buffers; session ID extraction should only fire once.
- Error detection: look for known error signatures in each agent's output (e.g., `error:`, `Error:`, `✗`, `FAILED`, `Permission denied`).
- File changes: reuse/extend the existing `detectEditsInOutput` logic but make it structural (parse actual file paths from `wrote/created/updated` patterns), emitting structured events.

### 4. Agent State Machine Upgrade (main process)

Replace the regex-on-buffer `detectAgentPrompt` with a real state machine:

```typescript
interface AgentState {
  agentType: string;
  phase: AgentPhase;
  outputBuffer: string;          // accumulated raw output (bounded)
  parsed?: ParsedAgentOutput;    // last parse result
  sessionId?: string;            // captured from output
  sessionIdCaptured: boolean;
  idleSeq: number;
  lastPromptAt?: number;
  busyUntil?: number;            // if busy, when to re-check
  pendingWrites: string[];
}
```

**State transitions:**
- `launching → ready`: agent binary started, no shell prompt seen, and one of: (a) a TUI-ready marker detected, (b) a handshake token echoed, (c) output-parser says the agent is accepting input.
- `ready → busy`: input written to PTY.
- `busy → ready`: output-parser detects the agent returned to its prompt (idle). This is the key: it must distinguish "agent returned to prompt" from "agent printed a line ending in `>`" — use the TUI's actual mode indicators.
- `busy → attention`: action required (confirmation dialog, error state).
- `attention → busy`: new output after action resolved.

**Never-ready detection:** a timeout (existing `startAgentTimeout`) fires `agent:timeout` → renderer shows retry overlay. Keep this but make it smarter: if output-parser detects the agent crashed or errored, fire `agent:init-error` immediately instead of waiting.

### 5. Renderer Integration (TerminalPage.tsx + preload.ts)

- Add IPC `onAgentSessionIdCaptured` (preload listener) → renderer handler that calls `updateSessionResumeId(sessionId, resumeId)`.
- `initializeTerminal` should WAIT for `agent:session-id-captured` (with a reasonable cap) before sending the system prompt, so the session ID is already stored when the first prompt is written.
- The existing `captureOpencodeSessionId` renderer calls become a FALLBACK after `agent:session-id-captured` times out.
- Add a `status` field to `AgentState` events broadcast to renderer (`agent:status` → `{ terminalId, phase, sessionId? }`) so the UI can show "Connected — session abc-123" instead of just "ready".

### 6. Verification Plan

Include with your code:
- A list of the IPC channels added/changed (preload + main).
- A list of the new main-process functions and where they hook into the PTY data handler.
- A list of the AgentConfig changes.
- Edge cases: agent prints session ID after user prompt; agent is non-interactive (no TUI); agent crashes mid-prompt; user kills agent; resume session where output has no fresh session ID.

## Acceptance Criteria

1. When the user starts a new opencode session, the app shows the actual opencode session ID in the terminal UI within 5 seconds.
2. `terminal_sessions.resume_id` is populated from agent OUTPUT, not from DB path-matching.
3. "Resume session" works: clicking a previous session starts opencode with `--resume <real-id>`.
4. Sending a prompt marks the agent busy and queues subsequent prompts; queued prompts flush when the agent returns to ready.
5. If the agent is in a confirmation state (attention), the UI shows it and does not spam input.
6. If the agent fails to launch, the renderer shows the real error within 10 seconds (not a generic timeout).
7. The old DB-only `captureOpencodeSessionId` remains as a documented fallback, not the primary.
8. No regressions: existing sessions list, resume dialog, split panes, terminal input, file-change detection all still work.
