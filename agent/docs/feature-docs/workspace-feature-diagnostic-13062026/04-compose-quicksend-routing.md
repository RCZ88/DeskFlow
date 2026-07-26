# Round 4 — Compose / Quick Send -> Agent Message Routing — Fix Spec
**Date:** 2026-06-13
**Feature Scope:** Quick Send bar, Compose / InstructionPanel, message routing, terminal_messages lifecycle
**Files:** TerminalPage.tsx, DesignWorkspacePage.tsx, main.ts; table terminal_messages

> NOTE: The coding agent's R4 answer included an "Already fixed in R3" list. That is INCORRECT — R1–R3 are diagnosed/specced only, NOT applied. Ignore that section.

---

## ROOT CAUSE

Message delivery is **inconsistent across send paths**, and the completion/failure bookkeeping is **lossy** — leaving stuck "thinking" indicators and ghost tasks.

### PRIMARY — Quick Send uses different channels with different semantics
- `sendInstruction()` (TerminalPage.tsx:1060) routes three ways:
  - auto-assign (confidence >= 0.7) -> `handleSendToTerminal` -> `agent:send` (phase-aware, appends \r\n, carries agentType).
  - `@mention` -> `terminalWrite` -> `terminal:write-old-format` (line 1137).
  - default (no routing) -> same `terminalWrite` path.
- The old-format path does **not** append \r\n (renderer appends `message + '\r\n'` manually) and **drops agentType** (old-format has no agent concept).
- So the most common send (plain Quick Send, no @mention) does not carry the agent type and depends on manual line-ending handling.

### SECONDARY — double \r\n on queued old-format sends
- For `terminal:write-old-format`, the renderer appends `\r\n` before calling. When the agent is `launching`/`busy`, the payload is queued in `pendingWrites` as `"message\r\n"`, and the data-handler flush appends **another** `\r\n` (main.ts:7821/7831) -> `"message\r\n\r\n"`.
- Result: queued @mention/default sends submit a **spurious extra blank line** to the agent (can trigger an empty prompt / double submit). Immediate (ready) writes get a single \r\n, so behavior differs by phase.

### TERTIARY — failPendingWrites only fails ONE row
- `failPendingWrites()` (main.ts:8003) uses `ORDER BY created_at DESC LIMIT 1`, marking only the newest pending row `failed` on terminal kill.
- If multiple writes were queued, the rest stay `in_progress` **forever** -> permanent ghost "thinking" tasks.

### QUATERNARY — markTaskCompleted is all-or-nothing
- `markTaskCompleted()` (main.ts:7507/7511) does `UPDATE terminal_messages SET status='completed' WHERE session_id=? AND status='in_progress'` — marks **all** in-progress rows complete on a single prompt detection, regardless of how many are actually done.

### QUINARY — completion depends on prompt detection that may never fire
- Completion is gated on `promptSeen` (readyRegex, main.ts:7847). If the agent crashes mid-output or uses an unrecognized prompt (see Round 2 readyRegex/agentType bug), `markTaskCompleted` never fires -> rows stuck `in_progress` indefinitely. This compounds the Round 2 defects.

### Also
- `handleInstructionPanelSend()` (TerminalPage.tsx:914) resolves agent type from `existingSession?.agent || 'claude'`, **ignoring the agent chosen in the InstructionPanel config**.
- `DesignWorkspacePage.tsx:339` sends via `terminalWrite` with `\n` (not `\r\n`) and no agentType.
- The **20-char threshold** means short user prompts (e.g. "continue", "yes", "fix it") are neither recorded nor tracked -> no optimistic UI and no completion lifecycle for them.

---

## CHANGES REQUIRED

### A. Route ALL Quick Send paths through agent:send (fixes PRIMARY)
- **TerminalPage.tsx:1137** — replace the `@mention` and default `terminalWrite(... + '\r\n')` calls with `handleSendToTerminal(resolvedTargetId, message, agentType)`.
- Resolve `agentType` from the target session (resolveAtMention's session for @mention; active session for default). Stop appending `\r\n` in the renderer — `agent:send` owns it.

### B. Single line-ending owner (fixes SECONDARY)
- For any phase-aware channel, the **handler** owns the trailing `\r\n`; callers never append. If `terminal:write-old-format` must remain, make it append `\r\n` on immediate write AND not double-append on flush (store payloads without line endings; append exactly once at write time). After A, old-format should no longer be on the user-send path.

### C. Fail ALL pending rows on kill (fixes TERTIARY)
- **main.ts:8003** — remove `ORDER BY created_at DESC LIMIT 1`; mark every `in_progress` row for the session `failed`. Broadcast the count.

### D. Per-message completion (fixes QUATERNARY)
- **main.ts:7507** — carry a `messageId` through the `pendingWrites` queue (or complete the oldest `in_progress` row FIFO, matching flush order) so one prompt detection completes exactly one message, not all.

### E. Completion watchdog (fixes QUINARY)
- Reconcile stuck rows: on `agent:timeout` or `terminal:exit` (use the Round 2 exit-listener fix), set lingering `in_progress` rows to `failed`. Optionally add a max-duration watchdog per message.

### F. Respect the InstructionPanel's agent
- **TerminalPage.tsx:914** — use `config.agent || existingSession?.agent || 'claude'` so the panel's selection wins.

### G. Track short messages
- Lower/remove the 20-char threshold for user-originated sends (or always record + track), so short prompts get optimistic UI + a completion lifecycle.

### H. Fix DesignWorkspacePage send
- **DesignWorkspacePage.tsx:339** — route through `agentSend` (carries agentType + correct \r\n) instead of `terminalWrite` with `\n`.

---

## IPC CHANGES
- No new channels. Consolidate user-send paths onto `agent:send`; demote `terminal:write-old-format` to non-user-send uses (or fix its line-ending ownership per B).

## DB CHANGES
- None required. Optional: thread a `message_id` from queue to completion for precise per-row status (D).

---

## VERIFICATION
1. Plain Quick Send (no @mention) carries the correct agent type and submits exactly ONE newline whether the agent is ready or queued.
2. @mention send carries the resolved session's agent type.
3. Queued send (agent launching/busy) does NOT produce a double blank line.
4. Compose panel respects the agent chosen in the panel.
5. Kill a terminal with 3 queued messages -> all 3 marked `failed` (none stuck `in_progress`).
6. Agent crashes mid-response -> task reconciled to `failed` within the watchdog window; no stuck "thinking".
7. Short prompt ("continue") shows optimistic UI and completes.

## STATUS
DIAGNOSED — renderer: consolidate send paths + agentType (A/F/H). backend: line-ending ownership (B), fail-all-pending (C), per-message completion (D), completion watchdog (E), threshold (G). Compounds Round 2 (readyRegex/agentType, terminal:exit). No DB changes required.
