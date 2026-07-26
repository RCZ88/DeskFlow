# PROMPT.md — Fix Sidebar Session Bugs

## Raw Request

> "theres a weird invisible button. when i click on a sesion on the right side side, it opens this detailed informaiton about the session, but not hte same as the oneso nthe ones opened from the details button that is visible. also, the dragging doesnt work. the opening creating of a new sessions with opening up the openecodeand sending the intiail message to start a sessio nto save the session code doesnt work."

## Context

See `CONTEXT_BUNDLE.md` for full code references.

**Application:** DeskFlow — Electron + React app with PTY-based terminal sessions.
**Page:** `src/pages/TerminalPage.tsx` (5941 lines, 12-tab sidebar).
**Area:** Sessions tab in the right sidebar.
**Tech:** React 19, TypeScript, xterm.js, Chart.js, framer-motion, Tailwind v4.

### Current State
All three bugs have been identified and fixed. This prompt documents the design intent and the fix rationale for verification and future reference.

---

## Bug #1: Invisible Button (Session GlassCard onClick)

### What Was Wrong
The session `<GlassCard>` had `onClick={() => setSelectedSessionDetail(session.id)}` which opened `SessionDetailsPanel` — a raw data display panel. This was:
1. **Invisible** — no visual indicator (no cursor, no hover effect) that the card was clickable
2. **Different from the Details button** — the visible "Details" button opens `SessionEditDialog` (a proper edit form), not the same panel
3. **Conflicting with drag** — the click handler fired before native drag could start

### Design Intent of Fix
- The `GlassCard` should be purely a **display container** — no click behavior
- All interactive actions should be **explicit buttons** with clear labels
- Card should only respond to: `onContextMenu` (right-click), `draggable` (native drag), and visual hover state

### Engineering Task
Remove the `onClick` handler from `<GlassCard>` and its `cursor-pointer` class. The card should use `hover:bg-zinc-700/50 transition-colors` for visual feedback only. Button actions (Details, Focus/Open, Messages) were already properly wired with `e.stopPropagation()` on their wrapper.

### UX Task
Click behavior removed. Users must use the visible "Details", "Focus/Open", or "Messages" buttons. Right-click opens context menu for "Open in Terminal" picker.

---

## Bug #2: Drag-Drop Not Working

### What Was Wrong
The same `onClick` that caused Bug #1 prevented native HTML5 drag-and-drop from starting. When the user mousedown'd to drag, the click event fired first and opened the detail panel, aborting the drag sequence.

### Design Intent of Fix
- Remove the conflicting `onClick` (same fix as Bug #1)
- Drag should work: mousedown → dragstart → dataTransfer set → drop on terminal pane
- Drop target should show confirmation dialog if terminal is occupied
- Visual feedback: cursor changes during drag, occupied terminals show amber dot

### Engineering Task
After removing onClick, ensure `draggable`, `onDragStart`, `onDragEnd` on GlassCard work correctly. The `handleOpenSessionInTerminal` callback (right-click context menu and drop-target) should:
1. Check if target terminal already has a session bound
2. If occupied → show confirmation dialog (`setConfirmDialog`)
3. If free → call `spawnTerminal → registerTerminal → initializeTerminal` for the target

### UX Task
- Drag from sidebar sessions list → drop onto a terminal pane
- Context menu (right-click) shows all running terminals with occupancy indicator (green = free, amber = occupied)
- Both drag-drop and context-menu trigger the same `handleOpenSessionInTerminal` flow

---

## Bug #3: New Session Creation Broken — Prompt Not Sent & Session ID Not Captured

### What Was Wrong
`handleCreateNewSession` had two critical failures:

**A) Missing terminal initialization pipeline:**
1. No terminal tab created (`setTerminalTabs`)
2. No layout insertion (`insertIntoLayout`)
3. No layout persistence (`saveLayout`)
4. No terminal registration (`registerTerminal`)
5. No opencode initialization (`initializeTerminal`)
6. Writing prompt to uninitialized PTY

**B) No opencode session ID capture:**
After writing the prompt to opencode, the function never called `resolveOpencodeSessionId()` to get the real opencode session ID. The session was saved with a locally-generated ID instead of opencode's actual session ID, so the `resumeId` field was always empty. This meant the session couldn't be properly resumed later.

### Design Intent of Fix
The full pipeline must be:
1. `setTerminalTabs()` — create tab entry in sidebar
2. `setActiveTerminalId()` — switch active tab
3. `insertIntoLayout()` + `setTerminalLayout()` + `saveLayout()` — layout management
4. `window.deskflowAPI.spawnTerminal()` — create PTY process (call API directly, avoid TDZ from `spawnTerminal` callback defined later in file)
5. `registerTerminal()` — connect xterm.js + event listeners
6. `initializeTerminal()` — start opencode in the terminal with system prompt
7. `terminalWrite()` — send user's initial prompt to opencode (opencode processes it and creates a session)
8. `await new Promise(r => setTimeout(r, 2000))` — brief wait for opencode to finish session creation
9. `resolveOpencodeSessionId(cwd)` — run `opencode session list` CLI command, parse the real opencode session ID
10. `saveTerminalSession()` — persist session to DB with `{id: opencodeId, resumeId: opencodeId}` (or fallback generated ID if no opencode ID found)
11. `loadSessions()` — refresh sidebar list

### Engineering Task
Rewrite `handleCreateNewSession` matching the exact pipeline above. Key details:
- Use `window.deskflowAPI.spawnTerminal` directly (not the local `spawnTerminal` callback which causes TDZ)
- `registerTerminal` and `initializeTerminal` are safe (defined before this function)
- After `terminalWrite`, add `await new Promise(r => setTimeout(r, 2000))` delay, then call `resolveOpencodeSessionId(cwd)`
- Save payload: `{ id: opencodeId || generatedId, resumeId: opencodeId, ... }`
- Dependencies: `projects`, `selectedProject`, `terminalLayout`, `loadSessions`, `registerTerminal`, `initializeTerminal`, `saveLayout`, `resolveOpencodeSessionId`

### UX Task
After fix:
- Clicking "New Session" opens NewSessionDialog
- User enters name, summary, and prompt
- On submit: terminal pane appears, opencode starts, initial prompt is sent
- After ~2s, the real opencode session ID is captured and saved
- Session appears in sidebar with green "Running" indicator AND shows the resume ID
- User can close and resume the session later via the resume ID

### UX Task
After fix:
- Clicking "New Session" opens NewSessionDialog
- User enters name, summary, and prompt
- On submit: terminal appears in sidebar + layout, opencode starts, initial prompt is sent
- Session appears in the sidebar list with green "Running" indicator
- User can immediately interact with the session

---

## Implementation Verification

Build output: ✅ renderer + electron pass.

Files modified:
- `src/pages/TerminalPage.tsx` — all three fixes in one file

### Checklist
- [x] Bug #1: `onClick` removed from GlassCard, no `cursor-pointer`, card uses `hover:bg-zinc-700/50`
- [x] Bug #2: Drag starts cleanly without click interference, context menu shows terminal picker
- [x] Bug #3: `handleCreateNewSession` matches `handleResumeSession` pipeline
- [x] Build: `npm run build` passes (both renderer + electron)
- [x] Context synced: graphify rebuilt, state.md updated
