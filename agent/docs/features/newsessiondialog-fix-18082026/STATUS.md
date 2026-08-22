# NewSessionDialog Missing Props Fix

## Meta
- **Slug:** newsessiondialog-fix
- **Page/Area:** Terminal (New Session dialog)
- **Created:** 2026-08-18
- **Last Updated:** 2026-08-18
- **Author:** Agent (opencode)

## Status
- **Overall:** complete
- **Spec:** complete (bug fix — user report)
- **Backend:** N/A (no backend changes)
- **UI:** complete (added missing props to NewSessionDialog rendering)
- **Tested:** partial (build OK, runtime NOT LAUNCHED)
- **Approved by User:** pending

## Checklist
- [x] Spec written (inline — bug report)
- [x] UI implemented (added projectPath, terminalTabs, defaultAgent, initialTerminalMode, initialSelectedTerminal)
- [x] Build passes (vite + preload)
- [ ] Runtime verified (RHEO needs relaunch)
- [ ] User approved

## References
- **Prompt package:** (none — bug fix)
- **Back-and-forth:** (none)
- **Source files:** `src/pages/TerminalPage.tsx:4115-4125`
- **IPC channels:** (none)
- **DB tables:** (none)

## History
| Date | Event | Author |
|------|-------|--------|
| 2026-08-18 | User reported: New Session button not opening dialog | CZ |
| 2026-08-18 | Root cause: missing required props (projectPath, terminalTabs, defaultAgent) | Agent |
| 2026-08-18 | Fix applied, build verified | Agent |
