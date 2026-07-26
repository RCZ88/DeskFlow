# PROMPT — Terminal Height & Text Input Fixes

## Raw Request
"THE SIZE OF HTE TERMINAL IS STILL HALF THE HEIGHT ITS SUPPOSED TO BE. NONE OF THE FIXES U MADE FIX ANYTHING IDIOT THE USER INPUT IS ALSO NOT WORKING STILL."

## Problem Statement
Two critical bugs in the DeskFlow terminal workspace:
1. **Terminal height is ~50% of what it should be** — the terminal pane doesn't fill its container
2. **Text input doesn't work** — typing in the terminal produces no visible output

## Context
Read `CONTEXT_BUNDLE.md` first. It contains the full height chain trace, root cause analysis, and all relevant source code with line numbers.

## ROOT CAUSE (confirmed)

### Bug 1: Terminal Height
**Line 3138 in `src/pages/TerminalPage.tsx`:**
```jsx
<div className="flex-1 relative overflow-hidden">
```
This pane area div is `flex-1` in a `flex-col` parent BUT is **NOT a flex container itself** (missing `flex flex-col`). Its child (data-tutorial div at line 3203) has `flex-1 min-h-0` which only works if the parent is a flex container. Without `flex flex-col` on the pane area, `flex-1` on the child does NOTHING.

**Cascade:** pane area → block element → sizes to content → child's flex-1 ignored → TerminalLayout h-full resolves to auto → xterm.js gets wrong dimensions → terminal renders at ~50% height.

### Bug 2: Text Input
Likely a CONSEQUENCE of Bug 1. When terminal height is wrong:
- xterm.js FitAddon calculates wrong cols/rows
- PTY spawned at wrong dimensions
- Shell/TUI may not render properly
- No output arrives → `terminalReadyStates` stays false → input buffered forever

The input buffering system (lines 222-231) and unlock mechanisms (lines 257-264, 280-299, 304-313) are correct. Fix the height first.

## MANDATORY FIX

### Fix 1: Add `flex flex-col min-h-0` to pane area (TerminalPage.tsx line 3138)

Change:
```jsx
<div className="flex-1 relative overflow-hidden">
```
To:
```jsx
<div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
```

This makes the pane area a flex column container, enabling the data-tutorial div's `flex-1 min-h-0` to work correctly.

### Fix 2: Verify text input works after height fix

After fixing the height, verify:
1. xterm.js FitAddon reads correct container dimensions
2. PTY spawns at correct cols/rows
3. Shell renders properly
4. `terminalReadyStates` becomes true (check console for `[INPUT-FIX]` logs)
5. User can type and see characters appear

If text input still doesn't work after height fix, investigate:
- Whether `onTerminalReady` IPC event fires (check main process console)
- Whether `terminalWriteRaw` IPC reaches main process (check preload bridge)
- Whether the xterm.js textarea receives keyboard events (check browser dev tools)

## CONSTRAINTS
- Do NOT change the xterm-helper-textarea CSS — it's the standard xterm.js pattern
- Do NOT change the input buffering system — it's correct
- Do NOT change the PaneRenderer or TerminalLayout flex chain — it's correct
- Only change line 3138 in TerminalPage.tsx
- The pane area's children (error banners, group selector, data-tutorial div) should stack vertically in the flex column

## VERIFICATION
After the fix:
1. Build: `npx vite build` → must succeed
2. Terminal height should fill the entire pane area (from header bar to bottom of screen)
3. xterm.js cursor should be visible and blinking
4. Typing characters should appear in the terminal
5. Shell commands should execute and output should appear
