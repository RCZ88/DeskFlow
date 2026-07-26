# CONTEXT_BUNDLE.md — Terminal Height & Text Input Fixes

## Raw Request (verbatim)
"THE SIZE OF HTE TERMINAL IS STILL HALF THE HEIGHT ITS SUPPOSED TO BE. NONE OF THE FIXES U MADE FIX ANYTHING IDIOT THE USER INPUT IS ALSO NOT WORKING STILL."

## Problem Statement
Two critical bugs in the terminal workspace:
1. **Terminal height is ~50% of what it should be** — the terminal pane doesn't fill its container
2. **Text input doesn't work** — typing in the terminal produces no visible output, characters don't appear

## ROOT CAUSE ANALYSIS (confirmed)

### Bug 1: Terminal Height — Missing `flex flex-col` on pane area container

**The height chain from viewport to xterm.js:**

```
App root (line 2329): flex h-screen overflow-hidden
  └─ Main Content (line 2426): flex-1 min-h-0 flex flex-col overflow-hidden
       ├─ Terminal Top Bar (line 2443): flex items-center ... px-4 py-3
       └─ Main Scroll Area (line 2678): flex-1 min-h-0 flex flex-col overflow-hidden
            └─ PageShell (line 2726): h-full min-h-0 flex-1 flex bg-black !p-0 !space-y-0 overflow-hidden
                 └─ Main Terminal Area (line 2728): flex-1 flex flex-col bg-zinc-950 relative
                      ├─ Header bar (line 2729): flex items-center ... px-4 py-2
                      ├─ Tab bar (line 3034): flex items-center ... min-h-[36px]
                      └─ Pane area (line 3138): flex-1 relative overflow-hidden  ◄── BUG HERE
                           └─ data-tutorial div (line 3203): flex-1 min-h-0 relative overflow-hidden
                                └─ TerminalLayout (line 784): w-full h-full min-h-0 bg-[#0d0d0d] flex flex-col
                                     └─ PaneRenderer leaf (line 542): flex-1 min-w-0 min-h-0 overflow-hidden
                                          └─ TerminalPane (line 410): relative w-full h-full min-h-0 overflow-hidden
                                               └─ xterm.js container
```

**THE BUG:** Line 3138 — the pane area div has `flex-1 relative overflow-hidden` but is **NOT a flex container** (missing `flex flex-col`). Its child (data-tutorial div at line 3203) has `flex-1 min-h-0` which only works if the parent is a flex container. Without `flex flex-col` on the pane area, `flex-1` on the data-tutorial div does NOTHING — it's treated as a regular block element sizing to content.

**The cascade:**
1. Pane area is a block element (not flex) → sizes to content
2. data-tutorial div's `flex-1` ignored → sizes to content  
3. TerminalLayout's `h-full` resolves to `auto` (parent has no explicit height)
4. xterm.js FitAddon reads container dimensions → gets wrong/small height
5. Terminal renders at ~50% height

**FIX:** Change line 3138 from:
```jsx
<div className="flex-1 relative overflow-hidden">
```
to:
```jsx
<div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
```

Also need `min-h-0` on the pane area to allow flex shrinking.

### Bug 2: Text Input — Input buffering never unlocks

**The input flow:**
1. User types in xterm.js → `terminal.onData` fires (line 222)
2. Checks `terminalReadyStates.get(terminalId)` (line 223)
3. If ready → `terminalWriteRaw(terminalId, data)` → IPC → PTY stdin
4. If NOT ready → data pushed to `inputBuffers` array (line 227-230)

**Three unlock mechanisms:**
1. `onTerminalReady` IPC event from main process (line 280-299)
2. First PTY output arrives via `onTerminalData` (line 257-264)
3. 2.5s safety timeout (line 304-313)

**THE BUG:** If the terminal height is wrong (Bug 1), the xterm.js container has wrong dimensions. When FitAddon tries to fit, it calculates wrong cols/rows. The PTY is spawned at wrong dimensions. The shell/TUI may not render properly, so NO output arrives via `onTerminalData`. The `onTerminalReady` IPC event may fire, but if the terminal dimensions are wrong, the shell might crash or not start.

**Additionally:** The `terminalReadyStates` starts as `false` (line 180). The 2.5s timeout should unlock input eventually. But if the user types before the timeout, their input is buffered and may be lost or sent at wrong timing.

**FIX:** The text input issue is likely a CONSEQUENCE of the height bug. Fix the height first. If text input still doesn't work after fixing height, investigate:
- Whether `onTerminalReady` IPC event fires in main process
- Whether `terminalReadyStates` becomes `true`
- Whether `terminalWriteRaw` IPC reaches main process

## Key Source Files

### App.tsx (height chain)
```jsx
// Line 2329 — App root
<div className="flex h-screen overflow-hidden bg-[#121212] text-white">

// Line 2426 — Main Content
<div className="flex-1 min-h-0 flex flex-col overflow-hidden">

// Line 2443 — Terminal Top Bar (inside Main Content, above scroll area)
<div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">

// Line 2678 — Main Scroll Area
<div className={`flex-1 min-h-0 ${location.pathname === '/terminal' ? 'flex flex-col overflow-hidden' : 'overflow-auto p-5'}`}>
```

### PageShell.tsx
```jsx
// Line 19 — terminal page gets h-full min-h-0
className={`${page === 'terminal' ? 'h-full min-h-0' : 'min-h-full'} ${layoutClass} ${className}`}
```

### TerminalPage.tsx (THE BUG)
```jsx
// Line 2726 — PageShell wrapper
<PageShell page="terminal" className="flex-1 flex bg-black text-white !p-0 !space-y-0 relative overflow-hidden">

// Line 2728 — Main Terminal Area (flex column)
<div style={accentStyle('cyan')} className="flex-1 flex flex-col bg-zinc-950 relative">

// Line 3138 — PANE AREA (BUG: missing flex flex-col)
<div className="flex-1 relative overflow-hidden">
  // ... error banners, group selector ...
  
// Line 3203 — data-tutorial div (flex-1 does nothing because parent isn't flex)
<div data-tutorial="term.panes" className="flex-1 min-h-0 relative overflow-hidden">
  <TerminalLayout ... />
</div>
```

### TerminalWindow.tsx
```jsx
// Line 410-418 — TerminalPane container
<div ref={containerRef} className="relative w-full h-full min-h-0 overflow-hidden"
     style={{ outline: isActive ? '2px solid rgb(34 197 94)' : 'none', outlineOffset: '-2px' }}
     data-terminal-id={terminalId}>

// Line 419 — xterm helper textarea CSS (STANDARD pattern, do NOT change)
<style>{`.xterm-helper-textarea { position: absolute !important; top: -9999px !important; left: -9999px !important; opacity: 0 !important; width: 1px !important; height: 1px !important; overflow: hidden !important; z-index: -1 !important; }`}</style>

// Line 784 — TerminalLayout root
<div className="w-full h-full min-h-0 bg-[#0d0d0d] overflow-hidden flex flex-col">

// Line 542 — PaneRenderer leaf
<div className="flex-1 min-w-0 min-h-0 overflow-hidden">

// Line 222-231 — Input handling
const disposable = terminal.onData((data) => {
  const isReady = terminalReadyStates.get(terminalId);
  if (isReady) {
    window.deskflowAPI?.terminalWriteRaw?.(terminalId, data);
  } else {
    const buffer = inputBuffers.get(terminalId) || [];
    buffer.push(data);
    inputBuffers.set(terminalId, buffer);
  }
});
```

## CONSTRAINTS
- The xterm-helper-textarea CSS is the STANDARD xterm.js pattern — do NOT change it
- The PaneRenderer and TerminalLayout flex chain is correct — only the pane area container (line 3138) is broken
- The input buffering system is correct — the issue is likely that the terminal height prevents the shell from rendering properly
- All changes must be in src/pages/TerminalPage.tsx (line 3138) — potentially also src/components/PageShell.tsx
