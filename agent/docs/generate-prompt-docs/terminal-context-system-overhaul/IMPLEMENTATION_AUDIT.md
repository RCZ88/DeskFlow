# Implementation Audit — Terminal Context System Overhaul

> **Generated:** 2026-05-23
> **Audit scope:** All 5 bundles (34 steps) from the overhaul specification
> **Method:** Codebase search across `src/` for each step's expected artifacts

## Summary

| Status | Count |
|--------|-------|
| ✅ Implemented | 16 |
| ⚠️ Partially Implemented | 9 |
| ❌ Not Implemented | 9 |

---

## Bundle A — Core Flows (Steps 1-8)

| Step | Fix | Status | Key Evidence |
|------|-----|--------|-------------|
| 1 | Wire InstructionPanel onSend | ✅ | `handleInstructionPanelSend` defined at `TerminalPage.tsx:379`, wired to `onSend` at line 1170 |
| 2 | Kill `buildInitContent`, use `assembleContext` only | ✅ | `buildInitContent` fully removed; `assembleContext` in `ContextService.ts:126` is the only path. Used in `NewSessionDialog.tsx:340` for preview |
| 3 | Add UI refresh events after AI actions | ⚠️ Partial | Backend emits `context-changed` at 13 sites in `main.ts`. Preload exposes `onContextChanged` at `preload.ts:441`. **Renderer never subscribes** — no `window.deskflowAPI.onContextChanged()` call exists |
| 4 | Fix Terminal Manual Input | ✅ | `term.onData` at `TerminalWindow.tsx:166` routes keystrokes to PTY via `terminalWriteRaw` with buffering |
| 5 | Fix Problem → Terminal Prompt Delivery | ✅ | `handleCreateTerminalForProblem` at `TerminalPage.tsx:906` queues prompt via 3s `setTimeout`, writes via `terminalWrite`. Event listener at line 966 |
| 6 | Skills Pipeline Verification | ✅ | Skill selector at `InstructionPanel.tsx:372-381`, loaded via `getSkills` API, skill content included in generated prompt at lines 183-192 |
| 7 | FlowView Audit & Wiring | ❌ | **`FlowView.tsx` does not exist anywhere** in the project |
| 8 | Fix Status Change → Terminal Message Format | ⚠️ Partial | `terminalWriteRaw` exists and is used for raw keystrokes (`TerminalWindow.tsx:169,201`), but **all system messages still use `terminalWrite`** (11 call sites in `TerminalPage.tsx`) |

### Missing in Bundle A
- **Step 3 (critical):** `onContextChanged` subscription — UI never refreshes after AI actions
- **Step 7:** `FlowView.tsx` entirely absent
- **Step 8:** System messages use wrong IPC method

---

## Bundle B — Session System (Steps 9-14)

| Step | Fix | Status | Key Evidence |
|------|-----|--------|-------------|
| 9 | Wire tracker-mind-setup into Setup Dialog | ❌ | Backend handler exists (`main.ts:9900-10224`), standalone "Setup" button works, but **`trackerMindSetup` is never called inside `NewSessionDialog.handleCreate`** |
| 10 | Init vs Setup Mode Distinction | ⚠️ Partial | `NewSessionDialog.tsx` accepts `'create' | 'initialize' | 'setup'` modes and correctly renders different UIs for each. But **TerminalPage's `newSessionMode` state (line 102) only supports `'create' | 'initialize'`**, so `'setup'` is dead code |
| 11 | Agent Selection Defaults Unification | ❌ | **`getDefaultAgent()`/`setDefaultAgent()` functions don't exist.** `localStorage.getItem('terminal-defaultAgent')` repeated inline **9+ times** across `TerminalPage.tsx` and `TerminalWindow.tsx` |
| 12 | Agent Selection Dropdown Population | ✅ | `SUPPORTED_AGENTS` constant at `NewSessionDialog.tsx:6-12` with 5 agents, properly wired to `<select>` at line 416 |
| 13 | Existing Session ID Input | ✅ | Resume session ID input with lookup, error handling, config integration at `NewSessionDialog.tsx:473-513` |
| 14 | Session List Audit | ⚠️ Partial | Backend SQL defaults to 500 rows (`main.ts:6064-6072`), but **frontend `loadSessions` hardcodes `limit=20`** (`TerminalPage.tsx:354`) |

### Missing in Bundle B
- **Step 9 (critical):** `trackerMindSetup` not wired into dialog flow; `'setup'` mode never triggered
- **Step 11:** No centralized agent default utilities — duplicated inline code
- **Step 14:** Frontend limit=20 prevents loading all sessions

---

## Bundle C — IPC Bridges & Verification (Steps 15-17, 32-35)

| Step | Fix | Status | Key Evidence |
|------|-----|--------|-------------|
| 15 | Add `electron:execute-command` IPC Handler | ✅ | Handler at `main.ts:6039`, bridge at `preload.ts:278` |
| 16 | Verify/Fix `sendInstructionsToTerminal` Handler | ✅ | Handler at `main.ts:9734`, validates terminal, writes to PTY, updates bindings |
| 17 | Document/Skip `tracker-mind-generate` | ❌ | **Only a TODO comment at `main.ts:9898`.** No implementation |
| 32 | Verify `create-terminal` Events | ✅ | Frontend listener at `TerminalPage.tsx:679-690` calls `spawnTerminal()` only. `spawn-terminal` IPC at `main.ts:5881` handles PTY creation. No double initialization |
| 33 | Verify Graphify/QMD Paths | ✅ | `ContextService.ts:89-101` reads from `graphify-out/GRAPH_REPORT.md`. QMD reads from `agent/templates/` |
| 34 | Document Vault Sync | ✅ | Comment at `ContextService.ts:4` |
| 35 | Add `useJson` Guards | ✅ | 100+ `useJson` guards across `main.ts` |

### Missing in Bundle C
- **Step 17:** `tracker-mind-generate` not implemented (only TODO)

---

## Bundle D — Terminal UX & Layout (Steps 18-25)

| Step | Fix | Status | Key Evidence |
|------|-----|--------|-------------|
| 18 | Fix Prompt Preview | ❌ | **`buildPromptPreview` function does not exist.** No prompt preview component found |
| 19 | Delta Context Messages | ⚠️ Partial | Backend emits `context-changed` at 16 locations in `main.ts`. Preload bridge exists at `preload.ts:441`. **No frontend `onContextChanged` listener** exists — delta messages never written to terminal |
| 20 | Enlarge Compose Area | ✅ | Textarea at `InstructionPanel.tsx:386-391`: `min-h-[120px] max-h-[300px] resize-y` |
| 21 | Add Target Terminal Indicator | ⚠️ Partial | Transient "Sent to X" toast only (`TerminalPage.tsx:465-466`). **No persistent "Sending to:" indicator badge** |
| 22 | Fix `@term` Routing | ✅ | Full pipeline: mention detection at `TerminalPage.tsx:1195-1277`, `resolveAtMention` IPC at `preload.ts:293-294`, backend resolver at `main.ts:6327-6356` |
| 23 | Fix Drag-Drop Layout Mutation | ❌ | **No `handleDragEnd` or drag-and-drop mechanism exists** in `TerminalWindow.tsx` |
| 24 | Fix Split Pane Height | ✅ | `min-h-0` propagates correctly: root at line 248, split container at line 389, empty state at line 485 |
| 25 | Add Resize Handles | ✅ | `SplitHandle` component at `TerminalWindow.tsx:304-338` with hover highlight and cursor changes |

### Missing in Bundle D
- **Step 18:** Prompt preview entirely absent
- **Step 19 (critical):** No frontend delta message consumer — context changes invisible to agent
- **Step 21:** No persistent target terminal indicator
- **Step 23:** No drag-drop layout mutation

---

## Bundle E — UI Polish & Context (Steps 26-34)

| Step | Fix | Status | Key Evidence |
|------|-----|--------|-------------|
| 26 | Problem List Redesign | ⚠️ Partial | `STATUS_CONFIG` at `TerminalPage.tsx:2219-2227` defines colors/icons. Problems grouped by status at lines 2344-2376. **No `ProblemCard` component** — rendered as inline `<div>` elements |
| 27 | Rich File Display | ❌ | **No `BasicMarkdownViewer` or `AgentFileViewer` exists.** Files rendered as plain `<pre>` at `TerminalPage.tsx:3018-3028` with 2000-char truncation |
| 28 | Fix Closing Session Blinking | ❌ | **No `React.startTransition` or `React.memo`** found anywhere in `TerminalPage.tsx` |
| 29 | Add Product Area/Category as Visible Tags | ✅ | `SESSION_CATEGORIES` at `TerminalPage.tsx:18-25`, `CategoryBadge` at line 34-43, rendered at line 1639, product_area at line 1656, auto-tags at line 1663 |
| 30 | Add Problem-Request Linking UI | ⚠️ Partial | **Request→Problem linking works** (`RequestDetailModal` has "Linked Problems" section at lines 3251-3283). **Problem→Request linking is missing** — `ProblemDetailModal` (lines 2402-2518) has no "Related Requests" section |
| 31 | Fix Problem/Request Modal Styling | ✅ | Consistent scheme: `bg-black/60 backdrop-blur-sm`, `bg-gray-800 rounded-xl border-gray-700`, used in all 4 dialogs |
| 32 | Remove Cross-Group Sidebar Drag | ✅ | No `draggable` attributes on sidebar headers. No drag-and-drop in sidebar |
| 33 | Context Sharpening / Deep Memory | ✅ | `summarize-session` handler at `main.ts:6761-6815`, preload bridge at `preload.ts:272`, `buildDeepMemoryContext()` at `ContextService.ts:291-309`, config at `ContextConfig.ts:12,26` |
| 34 | Defer Smart Task Routing | ❌ | **No TODO comment or deferral documentation** found anywhere |

### Missing in Bundle E
- **Step 27:** Rich file display entirely absent
- **Step 28:** No optimizations for close terminal blinking
- **Step 30:** Problem→Request linking direction missing
- **Step 34:** No documentation of deferred smart task routing

---

## Priority Gaps

### Critical (blocks UX flow)
| Step | Gap | Impact |
|------|-----|--------|
| 3/19 | No `onContextChanged` frontend subscription | UI never refreshes after AI actions. Delta messages never reach agent. |
| 9 | `trackerMindSetup` not in dialog flow | New sessions may lack required agent files (AGENTS.md, PROBLEMS.md) |
| 7 | `FlowView.tsx` missing | Flow-based problem creation doesn't exist |
| 18 | No `buildPromptPreview` | Users can't preview merged prompt before sending |

### High (polish & consistency)
| Step | Gap | Impact |
|------|-----|--------|
| 8 | System messages use `terminalWrite` via `\n` instead of `terminalWriteRaw` via `\r` | May confuse agents with malformed input |
| 11 | No unified agent default functions | 9+ duplicated inline localStorage reads |
| 14 | `limit=20` in frontend | Users can't see older sessions |
| 23 | No drag-drop layout mutation | Can't reorder terminal panes by dragging |
| 27 | No rich file display | Markdown files render as raw text |
| 28 | No React transition/memo optimizations | Visual flicker when closing terminals |

### Medium (nice-to-have)
| Step | Gap |
|------|-----|
| 10 | `'setup'` mode dead code in TerminalPage |
| 17 | `tracker-mind-generate` unimplemented |
| 21 | No persistent target terminal indicator |
| 26 | No reusable `ProblemCard` component |
| 30 | Missing Problem→Request linking direction |
| 34 | No smart task routing deferral docs |
