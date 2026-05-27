## Raw Request

> tge terminal is very slow, teh words of the initial prompt comes like not in complete instantly. it doesnt send it to the thing, the size of teh terminal AGAIN, STILL ISNT FIXED. ITS WIDTH IS NOW ALSO A PROBLEM. WHY THE FUCK HAVENT YOU FIX TEH SIZING TO ALWAYS MATCH THE CURRENT SIZE IDIOTTTTTTTTT???

> BITCH THE RESUME TERMINAL COMMAND IS ALREADY WRONG U FUCKASS

---

## Context

**Project:** DeskFlow — Electron desktop app (React, TypeScript, Vite, Tailwind v4, SQLite via better-sqlite3). The app has a Terminal page where users can spawn shell PTYs that run AI agents.

### Architecture

```
App.tsx (route wrapper) → TerminalPage.tsx → TerminalWindow.tsx
  ├── flex-1 min-h-0 flex flex-col overflow-hidden  (App.tsx line 2312)
  │   └── flex-1 flex bg-black text-white  (TerminalPage root, line 1169)
  │       └── flex-1 flex flex-col  (header + content, line 1171)
  │           └── flex-1 flex flex-col min-h-0 overflow-hidden bg-black  (content area, line 1564)
  │               └── w-full flex-1 min-h-0  (TerminalLayout wrapper, line 1598)
  │                   └── w-full h-full overflow-hidden  (TerminalLayout, line 486)
  │                       └── PaneRenderer split children (line 376)
  │                           └── TerminalPane → xterm instance with FitAddon
```

### Terminal Sizing Chain

- **App.tsx line 2312:** `<div className="flex-1 min-h-0 flex flex-col overflow-hidden">` — parent has definite height from its own flex chain
- **TerminalPage root line 1169:** `<div className="flex-1 flex bg-black text-white">` — flex-1 child in a flex column
- **TerminalPage content line 1564:** `<div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-black">` — inner flex column
- **TerminalLayout wrapper line 1598:** `<div className="w-full flex-1 min-h-0">` — contains TerminalLayout
- **TerminalLayout line 486:** `<div className="w-full h-full bg-[#0d0d0d] overflow-hidden">` — h-full depends on parent having definite height
- **PaneRenderer split (line 376):** `<div className="flex flex-row w-full h-full">` — split direction container
- **PaneRenderer split children (line 377, 392):** `<div style={{ flex: ratio, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>` — flex children for each pane
- **TerminalPane (line 234):** `<div ref={containerRef} className="relative flex flex-col w-full h-full" style={{ minHeight: 0 }}>` — xterm container
- **xterm (line 138):** `requestAnimationFrame(() => fitAddon.fit())` — initial fit on mount
- **ResizeObserver (line 221):** observes containerRef and calls fit()
- **Window resize (line 222):** `window.addEventListener('resize', handleResize)`

### Session Resume Flow

```
handleResumeSession() → setupTerminal() → initializeSession(agent, resumeId)
  ↓
initializeSession writes launch command to PTY:
  launchCommand = resumeId ? `opencode --resume ${resumeId}\r\n` : `opencode\r\n`
  ↓
Waits for agent:ready event (up to 35s)
  ↓
Pre-fetches buildSessionContext() + getPreferences() in parallel with agent wait
  ↓
Sends merged system prompt to agent
```

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/TerminalPage.tsx` | ~5012 | Terminal page UI, session management, prompt assembly |
| `src/components/TerminalWindow.tsx` | ~595 | xterm wrapper, TerminalPane, PaneRenderer, TerminalLayout |
| `src/main.ts` | ~10325 | Electron main process, PTY spawning, IPC handlers |
| `src/preload.ts` | ~467 | IPC bridge between renderer and main |
| `src/App.tsx` | ~2351 | Route wrapper with flex layout |
| `src/lib/defaults.ts` | ~1 | DEFAULT_SYSTEM_PROMPT (large static text ~8KB) |
| `agent/PROBLEMS.md` | - | Known issues tracked here |
| `agent/REQUESTS.md` | - | User requests tracked here |

### Current Issues (User Reports)

1. **Terminal sizing WRONG** — Width AND height don't fill container. Multiple past fix attempts failed.
2. **Terminal speed SLOW** — Initial prompt appears character-by-character, not sent as a complete unit.
3. **Resume command WRONG** — Was using `${agent}` (e.g. `claude`) instead of `opencode` as the executable name.

---

## Engineering Task

### 1. Terminal Sizing — Root Cause Analysis

Design a comprehensive solution for terminal sizing that GUARANTEES xterm always fills its container at any window size.

**Requirements:**

A. **Trace the full CSS chain** from App.tsx → TerminalPage → TerminalWindow → TerminalPane → xterm. Identify EVERY node in the chain where height/width inheritance might break. Consider:
   - `height: 100%` vs `flex-1` vs `h-full` — which works and when
   - `min-height: 0` / `min-width: 0` on every flex item (default `min-height: auto` prevents shrinking)
   - `overflow: hidden` on relevant containers
   - Whether `height: 100%` resolves to a definite value at every link in the chain
   - Whether React Router elements (`<Routes>`, `<Route>`) insert wrapper DOM nodes that break the chain

B. **Verify FitAddon behavior:**
   - Is `fit()` called at the right time? (after mount, after resize, after tab switch)
   - Does `ResizeObserver` on `containerRef` reliably fire when flex layout recalculates?
   - Does `window.addEventListener('resize')` cover all cases (sidebar open/close, split handle drag)?

C. **Propose exact CSS changes** (class names, inline styles, or both) for each node in the chain. State the EXACT Tailwind classes or style properties needed.

D. **Test the solution** by verifying:
   - Terminal fills FULL container on initial load
   - Terminal resizes when window is resized
   - Terminal resizes when sidebar toggles
   - Terminal resizes when split panes are dragged
   - Terminal resizes when switching between tabs/sessions

### 2. Terminal Speed — Prompt Delivery

Design a solution for sending the system prompt to the agent as a SINGLE complete unit, not character-by-character.

**Requirements:**

A. **Investigate the PTY write path:**
   - `terminalWriteRaw` → `terminal:write-raw` IPC → `terminalManager.write()` → `pty.write(data)`
   - Is node-pty's `write()` synchronous? Does it buffer?
   - Does the shell echo input back, making large prompts appear as typing?

B. **Design alternatives:**
   - Option: Write prompt in a single `pty.write()` call vs multiple smaller writes — which does the code do?
   - Option: Bypass the shell and write directly to agent's stdin via a pipe
   - Option: Pre-write to a temp file and have the agent read it (`opencode --init-file /tmp/prompt.txt`)
   - Option: Use a dedicated IPC channel for system prompt that bypasses the PTY entirely

C. **Consider the timing:**
   - `buildSessionContext()` makes 3 IPC calls (problems, requests, checklists). Starting them in parallel with agent readiness helps, but is there still a delay?
   - Should the DEFAULT_SYSTEM_PROMPT be pre-fetched/sent before `buildSessionContext` completes?
   - Should context be appended as a SECOND write after the initial prompt?

### 3. Session Resume Command

This is the simplest fix: ensure the PTY launch command always uses `opencode` (the correct executable) rather than the `agent` label variable (which might be `"claude"` or other non-executable names).

**Requirements:**
- Launch command: `opencode` (no resume) or `opencode --resume <resumeId>`
- The `agent` variable is only for UI display and agent detection signatures, NOT the executable name
- Verify this doesn't break agent detection (AGENT_SIGNATURES regex in main.ts)

---

## Design Task

### Terminal Layout Visual Specs

Design the ideal visual layout for the terminal system:

- **Background:** Flat `#0d0d0d` for terminal area, gradient `#000000 → #09090b` for chrome
- **xterm theme:** Dark theme with green cursor `#00ff00`, green accent `#0dbc79`, cyan links `#11a8cd`
- **Font:** `Consolas, "Courier New", monospace` at 14px
- **Split panes:** Zinc-800 `#27272a` split handles, 1px, green-600 on hover
- **Tab bar:** Zinc-900 `#18181b` background, zinc-800 `#27272a` border
- **Active tab indicator:** Green-500 `#22c55e` bottom border

Specify:
1. Exact padding/margins for each container in the chain
2. How the status indicator overlays (".Initializing agent...") should be positioned
3. Scrollbar styling
4. Empty state (no terminals) layout

---

## UX Task

### Terminal Interaction Flow

Specify the complete interaction flow:

1. **Opening a terminal:**
   - User clicks "Open Terminal" or starts a session
   - Shell spawns, shows "Starting shell..." message
   - Agent type selected, launch command written to PTY
   - Agent startup detected (signature regex), status → "waiting" → "ready"
   - System prompt + context sent as complete unit
   - User can start interacting

2. **Resizing:**
   - On ANY layout change (window resize, sidebar toggle, split drag, tab switch)
   - xterm FitAddon calls `fit()` immediately
   - New cols/rows sent to PTY via `terminalResize`

3. **Resuming a session:**
   - User clicks "Resume" in session list
   - Terminal creates, shell spawns
   - `opencode --resume <resumeId>` written to PTY
   - Agent resumes from saved state
   - Previous context restored

4. **Empty/error states:**
   - No terminals: "Open Terminal" button centered
   - Agent timeout: Amber warning with retry button
   - PTY exit: Red "Process exited" message
   - Init failure: Red error banner at top

---

## Constraints

1. **Must work on Windows** — PTY uses node-pty, shell is PowerShell or CMD. `\r\n` line endings required.
2. **Existing IPC structure preserved** — don't change main.ts IPC handlers unless necessary
3. **No new npm dependencies** — use @xterm/xterm, @xterm/addon-fit, @xterm/addon-web-links only
4. **Tailwind v4 only** — no v3 directives, no postcss/autoprefixer
5. **TypeScript strict** — no `any` types in new code where avoidable
6. **Must build with `npm run build`** — both Vite renderer and tsc electron build
7. **xterm CSS** — Only override via inline `<style>` tags in TerminalWindow.tsx, never via CSS files or `!important`
8. **Resume format** — Always `opencode --resume <id>` not `${agent} --resume <id>`
9. **No git commands** — all changes manual
