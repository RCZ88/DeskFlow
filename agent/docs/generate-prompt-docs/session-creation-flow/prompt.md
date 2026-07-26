# Session Creation Flow — Remaining Fixes

## Raw Request

> "the prompt sending session creation stuff doesnt work."

## Problem Statement

There are two code paths for creating a new terminal session. Path B (auto-route/disambiguation) was recently fixed to properly write the prompt, wait for opencode to create a session, resolve the real session ID, and save with `resumeId`. But Path A — the **main user flow** via NewSessionDialog — still has two critical gaps:

1. **No opencode session ID capture**: After writing `initContent` to the terminal (either via `initializeTerminal` or direct `terminalWrite`), the handler immediately saves the session with an auto-generated ID and **never** calls `resolveOpencodeSessionId()`. The `resumeId` field is always empty, so sessions created from the dialog cannot be resumed later.
2. **Incomplete save payload**: The `saveTerminalSession` call in Path A omits `description`, `autoNamed`, and `resumeId` fields — all present in Path B's working implementation.

See `CONTEXT_BUNDLE.md` for full code context, IPC endpoints, data structures, and call sites.

## Engineering Task

Design the fix for the `onCreate` handler at `src/pages/TerminalPage.tsx:3640-3712`. The handler must:

1. **After writing initContent (both branches — 'select' and 'create' new terminal):**
   - Wait ~2 seconds for opencode to process the prompt and create its session
   - Call `resolveOpencodeSessionId(cwd)` to get the real opencode session ID
   - Fall back to the auto-generated `config.id` if no opencode ID is found

2. **Save payload must include:**
   - `id`: The real opencode session ID (if found) or `config.id` as fallback
   - `resumeId`: The real opencode session ID (if found) — enables session resume
   - `description`: `config.initContent` or empty string
   - `autoNamed`: `1`
   - All existing fields: `projectId`, `agent`, `terminalId`, `topic`, `workingDirectory`

3. **Edge cases:**
   - `initContent` is empty → no wait needed, skip resolution, save with `config.id`
   - `terminalMode === 'select'` → write to existing terminal, then wait + resolve
   - `initializeTerminal` already writes `initContent` internally (line 506-508) → in the 'create' branch, the wait/resolve happens AFTER `initializeTerminal` returns
   - If `resolveOpencodeSessionId` returns null → use `config.id`, don't set `resumeId`

## Constraint

- Do NOT touch `handleCreateNewSession` (Path B) — already working
- Do NOT modify `initializeTerminal` — it correctly writes initContent
- Only modify the inline `onCreate` handler at line 3640

## Verification Checklist

- [ ] After clicking Create in NewSessionDialog, session appears in sidebar with the correct opencode session ID
- [ ] `resumeId` field in DB contains the real opencode session ID (not a generated one)
- [ ] Closing and reopening the session via resume works
- [ ] Empty `initContent` (no prompt typed) still creates a session with generated ID — no crash
- [ ] `config.terminalMode === 'select'` path also captures session ID after writing to existing terminal
- [ ] Build passes with `npm run build`
