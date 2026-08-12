# PROMPT: Robust TUI Prompt Insertion for opencode / claude / gemini / codex

## Raw Request

> "THE BACKEND LOGIC OF THE SYSTEM DOESN'T WORK. with how the handling of the insertion of the prompt into the TUI of the opencode claude code and everything"
>
> "do you really know on how to insert it properly into an opencode?"
>
> "and other tools as well?"

## The Problem

DeskFlow's Terminal Workspace spawns real CLI AI agents (opencode, claude, gemini, codex)
inside a node-pty PTY and injects a system prompt / init content / user message into each
agent's interactive TUI after launch. **The insertion does not work reliably.** The text
either never appears, or is written blind into the TUI boot sequence and vanishes.

Concrete failure mechanics (all in `src/main.ts`, line numbers in CONTEXT_BUNDLE.md):

1. **Ready detection is regex-based and fails for TUIs.** `detectAgentPrompt` (main.ts:11080)
   checks the last non-empty ANSI-stripped line against per-agent `readyRegex`
   (`/^(?:opencode)?\s*>\s*$/i` etc.). opencode's Ink full-screen TUI renders an input box,
   never a bare `>` line, so the regex never matches.
2. **The fallback is a blind force-ready.** `startAgentTimeout` (main.ts:11305) forces
   `markAgentReady` after 5s regardless of what the TUI actually did. The queued prompt is
   then flushed via `flushPendingAgentWrites` → `buildAgentInputPayload` (bracketed paste
   `\x1b[200~...\x1b[201~\r`) with **no verification** that the TUI's input handler was
   attached and no way to know if the bytes were consumed.
3. **Queueing hides failures.** `agent:send` (main.ts:12243) returns `{ success: true, queued: true }`
   while the agent is `launching`/`busy`; the renderer cannot distinguish "queued and later
   flushed" from "queued and lost forever". There is no retry, no echo verification.
4. **The optimistic any-output heuristic** (`hasEnoughAgentOutputToAcceptInput`, main.ts:11183)
   flips to ready on the FIRST output chunk for bracketedPaste agents — the flush can hit
   the TUI before its input loop is ready.

## Your Mandate

**Design and implement ONE robust, per-agent strategy for inserting text into each of the
four agent TUIs (opencode, claude, gemini, codex), end to end in the existing
architecture.** Replace the fragile regex-ready + blind force-ready + fire-and-forget
queue with a mechanism that:

- knows per agent **what output signal means "the TUI will accept input now"**,
- writes the initial system prompt and subsequent user messages through a **single,
  verified write path**,
- **confirms or retries** rather than silently dropping,
- keeps the existing IPC surface (`agent:send`, `agent:get-phase`, `terminal:write-raw`,
  `agent:arm-handshake`, events `agent:ready` / `agent:status` / `agent:session-id-captured`),
  and
- degrades gracefully (clear `error`/`queued` semantics) when a tool cannot be verified.

You have the full context in `CONTEXT_BUNDLE.md` (verbatim code with line numbers). Do not
invent new IPC channels unless the existing ones cannot express the requirement — if you
do add one, specify the exact preload.ts + deskflow-api.d.ts changes.

## Requirements

1. **Per-agent readiness strategy.** For EACH of opencode, claude, gemini, codex, define:
   - the exact output pattern(s) that indicate "input accepted" (if detectable), and how
     to detect them reliably (regex on ANSI-stripped tail, cursor-position sequences,
     handshake token echo, or a bounded settle + probe sequence);
   - a safe bounded wait (with timeout) between launch command and first write;
   - the write payload strategy (bracketed paste vs plain + CR; multi-line normalization).
2. **Verified write path.** After a write, VERIFY the text reached the TUI (e.g. scan the
   next N seconds of output for a marker/echo, or check phase transition) and retry once
   if unverified — without double-sending a confirmed message. Specify exact timings and
   what marks a message as "confirmed" in `terminal_messages.status`.
3. **No silent loss.** Change `agent:send` semantics so every call returns an honest
   outcome: `{ success, queued, written?, verified?, error? }`. Queued messages must flush
   with verification once ready; if they cannot be flushed within the launch window they
   must surface as an error (existing `agent:init-error` / `agent:timeout` broadcasts or a
   new explicit event).
4. **Keep the queued-message mechanism** for messages sent while busy — but only flush on
   a REAL ready signal (regex match OR verified signal), never on the blind 5s fallback
   alone; the force-ready timeout may remain only as a last resort and must mark the flush
   as unverified so the renderer can surface it.
5. **Dummy-Enter / wake behavior** (TerminalPage.tsx:1134) must be folded into the per-agent
   strategy: if a tool needs a keystroke to draw its input box, do it deterministically
   before the settle, not as a blind last-ditch probe.
6. **opencode-specific handling.** Document and handle the fact that opencode's session DB
   row is created lazily (first message) and that its TUI input box differs from
   claude/gemini/codex `>` prompts. Do not break the existing session-id capture paths
   (output parse + `capture-opencode-session-id` db-pid fallback).
7. **Renderer updates in `TerminalPage.tsx` `initializeTerminal`** (main.ts:1154 area):
   the initial system prompt + init content should go through the new verified path (the
   current code still uses raw `agentSend` and logs only success/queued).
8. **Instrumentation.** Add clear `[AGENT-*]` main-process log lines so the fix is
   verifiable from the main console when the app is launched with the debug port (Probe
   attach mode). Include what a PASS looks like per agent in your implementation notes.

## Constraints

- Modify only what the design requires. Primary files: `src/main.ts` (state machine,
  configs, handlers), `src/pages/TerminalPage.tsx` (initializeTerminal /
  handleCreateNewSession), `src/preload.ts` (+ `src/deskflow-api.d.ts`) ONLY if you add
  IPC.
- NEVER run destructive git commands (`git checkout`, `git restore`, `git reset`,
  `git stash`, `git clean`). No new npm dependencies. Files are CRLF — do not reformat.
- Keep the Result<T> convention: `{ success: boolean, error?: string }`.
- Do NOT touch preload-old.ts / preload2.ts. Do NOT reorder the PTY event chain
  (mark-spawned → spawn → created → initialize).
- The app must stay buildable and runnable after your patch
  (`node scripts/build.mjs`; preload via the esbuild command in section 14 of the bundle).

## Output Format

1. **Root-cause summary** (≤15 lines) — the single core defect behind the unreliable
   insertion, with evidence from the code.
2. **Design** — per-agent table (readiness signal, wait, payload, verify, retry) + the
   unified write-path state machine (states/transitions), all in prose + ASCII.
3. **Exact code changes** — every change as a diff-style block with file path and line
   anchor (use the line numbers in CONTEXT_BUNDLE.md as anchors; they are current).
4. **New log lines + PASS criteria per agent** (what to look for in the main console).
5. **Testing plan** — how to verify each agent (note: runtime verification on this machine
   is ATTACH-ONLY via Probe against an already-running app; interactive TUI behavior for
   opencode/claude/gemini/codex may require the user's manual pass — label it as such).
6. **Risks** — what could regress (e.g. double-send, busy-phase false-idle, session-id
   capture races) and how your design prevents each.

## What NOT to Do

- Do NOT redesign the New Session dialog, the workspace UI, or the resume flows.
- Do NOT add an `opencode serve` HTTP-API-based bypass unless it is presented as an
  explicitly optional fallback (the PTY is the primary path).
- Do NOT remove `hasEnoughAgentOutputToAcceptInput` without replacing its purpose
  (fast flush for non-bracketedPaste agents still needs a ready gate).
- Do NOT write prose summaries of code — every claim must cite the real function/line.

## Success Criteria

- A new session with each agent tool reaches a state where the initial prompt appears in
  the TUI and a follow-up message round-trips, with `terminal_messages` rows reflecting
  real confirmed writes (or explicit errors).
- No message is ever silently dropped: every `agent:send` returns an honest outcome and
  every queued message either flushes verified or surfaces an error.
- `[AGENT-*]` logs show per-agent readiness + verification so a non-interactive observer
  can confirm PASS without clicking the UI.
