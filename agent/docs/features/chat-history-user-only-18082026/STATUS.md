# Chat History (User-Only Instructions)

## Meta
- **Slug:** chat-history-user-only
- **Page/Area:** Terminal (assemble-context IPC)
- **Created:** 2026-08-18
- **Last Updated:** 2026-08-18
- **Author:** Agent (opencode)

## Status
- **Overall:** complete
- **Spec:** complete (user request — no formal RESULT.md)
- **Backend:** complete (assemble-context handler queries role='user' only)
- **UI:** N/A (no UI component — context injection only)
- **Tested:** partial (build OK, runtime NOT LAUNCHED)
- **Approved by User:** pending

## Checklist
- [x] Spec written (inline — user request)
- [x] Backend implemented (terminal_messages WHERE role='user' query in assemble-context)
- [x] Build passes (main.cjs includes Chat History section)
- [ ] Runtime verified (RHEO needs relaunch)
- [ ] User approved

## References
- **Prompt package:** (none — inline implementation)
- **Back-and-forth:** (none)
- **Source files:** `src/main.ts:15293-15320`
- **IPC channels:** `assemble-context` (same handler as context-brain-memory-restore)
- **DB tables:** `terminal_messages`

## History
| Date | Event | Author |
|------|-------|--------|
| 2026-08-18 | User requested: only user instructions in context, no AI responses | CZ |
| 2026-08-18 | Implemented: role='user' filter in assemble-context handler | Agent |
| 2026-08-18 | Build verified, runtime pending relaunch | Agent |
