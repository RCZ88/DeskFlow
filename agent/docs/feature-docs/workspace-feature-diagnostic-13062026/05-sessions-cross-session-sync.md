# Round 5 — Sessions tab + Cross-Session Sync — Fix Spec
**Date:** 2026-06-13
**Feature Scope:** Session persistence/resume, Sessions tab, /sync, cross-session context
**Files:** TerminalPage.tsx, main.ts; tables terminal_sessions, terminal_messages, terminal_bindings, session_parsed_items, touched_files

> NOTE: R1–R4 remain diagnosed/specced only — NOT applied. The coding agent's earlier "fixed in R3/R4" claims are inaccurate.

---

## ROOT CAUSE

Session lifecycle mostly works, but four real defects degrade it — the worst being how /sync injects multi-line text into a raw PTY, and the resume path inheriting the Round 2 agentType bug.

### PRIMARY — /sync writes multi-line markdown into raw stdin (newline fragmentation)
- `/sync` (TerminalPage.tsx:859-868) calls `terminalWrite(resolvedTargetId, summary + '\r\n')`. `compileSyncSummary` (main.ts:16577) returns a **multi-line markdown** block (headers + per-terminal sections + file lists).
- Writing that to a PTY's stdin means **every embedded newline is a submit** — the shell/agent receives the summary line-by-line, executing/submitting each fragment instead of one coherent message. The context-changed auto-notify (TerminalPage.tsx:520-538) has the same flaw.
- This is the same class of bug as Round 4: a structured payload should go through `agent:send` (one message) or use bracketed paste, not raw `terminalWrite`.

### SECONDARY — no cascade delete on session delete
- `delete-terminal-session` (main.ts:8293-8303) runs only `DELETE FROM terminal_sessions WHERE id = ?`.
- `terminal_messages` (joined by `session_id`), `terminal_bindings`, and `session_parsed_items` are **not** cleaned up -> orphaned rows accumulate, still queryable, and can resurface in message views. The only other message delete is by message `id` (main.ts:9432), never by `session_id`.

### TERTIARY — resume inherits the Round 2 agentType bug + unverified resumeId
- `handleResumeSession` (TerminalPage.tsx:1810-1868) re-spawns a PTY via `spawnTerminal(terminalId, cwd, session.agent)` then `initializeTerminal(..., resumeId, ...)` writes `${agent} -s ${resumeId}`.
- But the Round 2 finding stands: the `spawnTerminal` wrapper drops the 3rd arg, so `agentStates` is seeded as `opencode` regardless of `session.agent` -> wrong `readyRegex` -> a resumed non-opencode agent may never reach `ready`.
- `resumeId` is captured as `openCodeSessionId` at the init callback (line 1682). If the agent CLI's real session id wasn't captured (or differs per agent), `-s ${resumeId}` **silently fails** and the agent starts fresh — with no error surfaced.

### QUATERNARY — no restart reconstruction / no drift reconciliation
- On restart nothing auto-reconstructs terminals from `terminal_sessions`; rows show as "Closed" until manual resume (ties to the R3 load gap). There is no routine reconciling live `terminalTabs` against DB rows (live PTY with no row; row pointing at a dead terminal_id).

### Minor / perf
- `auto_tags` is regenerated from full message content on **every send** (main.ts:7486) — an O(n) SQL UPDATE per message. Cache/debounce it.
- The renderer `sessions` state name collides conceptually with a separate app-tracking `sessions` table — rename to avoid confusion.

---

## CHANGES REQUIRED

### A. Send /sync (and context-notify) as one structured message (fixes PRIMARY)
- **TerminalPage.tsx:863 and :531** — deliver the summary via `agentSend(resolvedTargetId, summary, agentType)` (single message, handler owns line ending), or wrap in bracketed paste so embedded newlines aren't submitted line-by-line.
- Decide intent: if /sync is meant to brief the agent, `agent:send` is correct; if it's an FYI for the human, render it in the UI instead of stdin.

### B. Cascade cleanup on session delete (fixes SECONDARY)
- **main.ts:8296** — within a transaction, also delete from `terminal_messages`, `terminal_bindings`, and `session_parsed_items` where `session_id = ?`. Or add `ON DELETE CASCADE` FKs + enable `PRAGMA foreign_keys=ON`.

### C. Fix resume agentType + verify resumeId (fixes TERTIARY)
- Apply the Round 2 fix (forward `agentType` through `spawnTerminal`) so resumed sessions seed the correct `readyRegex`.
- Capture the agent's real session id per agent (not just opencode) and store it as `resume_id`. Before sending `-s ${resumeId}`, validate it's non-empty; if missing, fall back to a fresh launch and tell the user the session couldn't be resumed instead of silently starting over.

### D. Reconstruct + reconcile sessions (fixes QUATERNARY)
- Fold into the R3 Load Workspace fix: on load, reconstruct terminals from saved `terminal_tabs`/sessions (re-spawn + resume).
- Add a lightweight reconciler: mark `terminal_sessions` rows whose `terminal_id` has no live tab as `status='closed'`, and warn on live tabs with no DB row.

### E. Cache auto_tags (perf)
- **main.ts:7486** — only regenerate `auto_tags` when content materially changes (hash/length delta) or on a debounce, not on every send.

### F. Rename colliding `sessions` identifier (clarity)
- Rename the renderer state (e.g. `terminalSessions`) to disambiguate from the unrelated `sessions` DB table.

---

## IPC CHANGES
- None new. `/sync` and context-notify move from `terminalWrite` to `agent:send` (A).

## DB CHANGES
- Add cascade cleanup (transaction or FK `ON DELETE CASCADE`) for session deletion (B). No schema change strictly required if done via explicit deletes.

---

## VERIFICATION
1. Run /sync: the agent receives the summary as ONE message (no per-line submits / fragmented commands).
2. Delete a session: its `terminal_messages`, `terminal_bindings`, and `session_parsed_items` rows are gone (no orphans).
3. Resume a non-opencode session: `agentStates.agentType` matches the saved agent; it reaches `ready`; `-s ${resumeId}` actually resumes (or falls back with a clear message if resumeId is missing).
4. Restart + Load Workspace: saved sessions re-spawn and resume; reconciler marks dead-terminal rows closed.
5. Rapid sends: auto_tags is not re-derived on every keystroke-send (perf).

## STATUS
DIAGNOSED — mostly low/medium severity. Highest impact: A (/sync fragmentation) and C (resume inherits R2 agentType bug + silent resumeId failure). B/D/E/F are hygiene + perf. Depends on the Round 2 spawn fix and Round 3 load fix.
