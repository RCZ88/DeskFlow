# Implementation Plan — Terminal + Context System Overhaul

> **Purpose:** Maps every fix from Bundles A-E to exact code locations, noting where RESULT.md proposals differ from actual code.
> **Based on:** Bundle A-E prompts + code trace of all source files (2026-05-22)
> **Build verification:** `npm run build` after each bundle

---

## ⚠️ Critical Findings — RESULT.md Assumptions vs Reality

These are the most important adaptations needed. If you're an AI implementing from the bundles, read this first.

| # | RESULT.md Says | Actual Code | Adaptation |
|---|----------------|-------------|------------|
| 1 | `buildInitContent()` is in **TerminalPage.tsx** | It's in **NewSessionDialog.tsx** line 316 | Target the right file |
| 2 | `handleCreateSession` is a named function | Session creation is an **inline lambda** at TerminalPage.tsx line 2413 | Don't look for a function — look for the `onCreate={async (config) => { ... }}` block |
| 3 | `dispatchCreateTerminal` is a named function | `create-terminal` is dispatched **inline** at 3 locations: lines 1071, 1251, 1585 | Search for `dispatchEvent(new CustomEvent('create-terminal'` |
| 4 | `terminal:write` IPC handler exists | **NO handler exists** for `terminal:write`. Only `terminal:write-raw` (line 5969) and `terminal:write-old-format` (line 6008) | The preload.ts bridge at line 235 calls `terminal:write` which has no handler. This is a latent bug! Either add the handler or fix preload to use `terminal:write-old-format` |
| 5 | `getDatabase()` function exists | `db` is a plain **module-level variable** initialized at line ~1409 | Use `if (!db) return` pattern, not `if (!getDatabase()) return` |
| 6 | `terminalManager` is a `Map<string, TerminalInfo>` | It's a **plain object literal** at line 5728: `{ terminals: new Map(), spawn() {...}, write() {...}, ... }` | Access via `terminalManager.terminals.get(id)` and `terminalManager.write(id, data)` |
| 7 | `swapLeavesInTree` is in TerminalWindow.tsx | Not found in TerminalWindow.tsx. It's defined at the **module level** of the file that uses it | Check imports or define where needed |
| 8 | ProblemDetailModal.tsx is a separate file | It's **inline in TerminalPage.tsx** at line 3134 | Target `TerminalPage.tsx` around line 3134-3256 |
| 9 | `AGENT_SIGNATURES` constant exists | **Doesn't exist**. There's `detectAgentPrompt()` function at main.ts line 5608 | Use or extend `detectAgentPrompt()` instead |
| 10 | `context-changed` events don't include entity data | They **ALREADY include** entity data at all 13 dispatch sites | The enhancement needed (Fix 5) is just the UI-side refresh handler, plus adding entity data to `executeActionsFromFile` which currently doesn't include it |
| 11 | `messageQueueRef` stores `{ content, timestamp, isSystemPrompt?, isInitContent? }` | Stores only `{ content, timestamp }` at line 182 | Add extra fields to the queue item type |
| 12 | ContextConfig is a single state variable in NewSessionDialog | It's **6 individual boolean states** (ctxLLMWiki, ctxSkills, etc.) built into an object at call time (line 387) | Structural change: replace 6 booleans with one `contextConfig` state |
| 13 | `sessionCategoryFilter` is `sessionFilter` | State is named `sessionCategoryFilter` at line 203 | Use the actual state name |
| 14 | `context-changed` cleanup uses correct handler reference | Line 431: `ipcRenderer.removeListener('context-changed', () => {})` — **BUG**: creates a new function, doesn't remove the real handler | Fix the cleanup function to store the handler reference |
| 15 | `send-instructions-to-terminal` exists at line 9629 | It exists but the function signature in SECOND_RESULT.md has `linkedProblemId`/`linkedRequestId` which the real handler doesn't support | Extension needed |
| 16 | Main.ts is TypeScript source | It's **compiled CJS** (`dist-electron/main.cjs`) — line numbers are from the compiled file, NOT the source | The actual source is `src/main.ts` in a different format. The compiled file has different line numbers. **Always trace from `src/main.ts`**, not from `dist-electron/` |

---

## Bundle A — Core Flows: Exact Code Map

### Step 1: Wire onSend

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Replace stub | Line 1384 | Change `onSend={(config) => { setPendingSkill(undefined); setShowInstructionPanel(false); }}` to `onSend={handleInstructionPanelSend}` |
| Fix `handleInstructionPanelSend` signature | Line 385 | Current: `(config: { problems: string[]; requests: string[]; skill?: string; instruction: string; prompt: string })`. Target: `(config: { prompt: string; linkedProblemIds?: string[]; linkedRequestIds?: string[]; skillId?: string; targetTerminalId?: string })` |
| Add resolution logic | Line 390 | `resolvedTargetId = config.targetTerminalId \|\| activeTerminalId \|\| sendTargetSession` |
| Add error | After line 390 | Show toast: `showError('No terminal available')` |
| Append linked problems | After line 393 | `const linkedProblems = allProblems.filter(p => config.linkedProblemIds?.includes(p.id))` |
| Append linked requests | After linked problems | `const linkedRequests = allRequests.filter(r => config.linkedRequestIds?.includes(r.id))` |
| Append skill | After linked requests | `const skill = skills.find(s => s.id === config.skillId)` |
| Update binding | Line 401 area | Add `deskflowAPI.updateTerminalBinding({ terminalId: resolvedTargetId, activeProblemId: config.linkedProblemIds?.[0], activeRequestId: config.linkedRequestIds?.[0] })` |
| Save message | Before closing panel | Add `deskflowAPI.saveTerminalMessage({ sessionId, role: 'user', content: composedPrompt })` |

**Type changes needed in InstructionPanel.tsx:**
- Line 40-46: Update `InstructionConfig` to match the new signature
- Line 48-52: No structural change needed — `onSend` prop already matches

**Ripple check:** The `onSend` prop is also passed to InstructionPanel at line 1384. Only one call site. No other files reference it.

### Step 2: Kill buildInitContent, Use assembleContext Only

**Files:** `src/pages/TerminalPage.tsx`, `src/components/NewSessionDialog.tsx`

**NewSessionDialog.tsx:**

| Action | Exact Location | Code |
|--------|---------------|------|
| Remove `ctxLLMWiki` etc. booleans | Lines 209-217 | Delete 6+ individual `useState` calls |
| Add `contextConfig` state | Replace above | `const [contextConfig, setContextConfig] = useState<ContextConfig>(DEFAULT_CONTEXT_CONFIG)` |
| Replace toggle cards wiring | Lines 501-515 | Toggle calls `setContextConfig(prev => ({ ...prev, systems: { ...prev.systems, [system]: { ...prev.systems[system], enabled } } }))` |
| Remove `buildInitContent()` function completely | Lines 316-362 (approx) | Delete the entire function |
| Replace `buildInitContent()` calls | Lines 311, 386 | Replace with `assembleContext(projectPath, contextConfig)` |
| Import ContextConfig type | Line 1 area | Add `import { ContextConfig, DEFAULT_CONTEXT_CONFIG } from '../services/ContextConfig'` |
| Fix SessionConfig type | Lines 15-27 | Remove the inline contextConfig shape, use the imported type instead |
| Add `trackerMindSetup` call | Before assembleContext at line 386 | `await window.deskflowAPI?.trackerMindSetup?.('init-all', undefined, agentType)` |

**TerminalPage.tsx:**

| Action | Exact Location | Code |
|--------|---------------|------|
| Ensure `assembleContext` is called | Line 2429 | Already calls `assembleContext(cwd, config.contextConfig, config.id)` — verify it uses the config from the dialog correctly |
| Import ContextConfig | Line 13 area | May need to add to existing imports |
| Merge system prompt | Lines 2445-2465 | Build: default → project → general → session. Currently may be different order. |

**Ripple check:** `DEFAULT_CONTEXT_CONFIG` is `total_token_budget: 7000` vs the dialog's `totalBudget` which defaults to `10000`. The dialog's totalBudget may need to be removed or overridden when using the imported DEFAULT.

### Step 3: UI Refresh Events

**File:** `src/main.ts` (compiled — trace from `dist-electron/main.cjs`)

| Action | Exact Location | Code |
|--------|---------------|------|
| Add refresh events in `executeActionsFromFile` | Line ~6555 area | Currently dispatches `context-changed` only for individual actions WITHIN the function. Need to add entity data to those dispatches (they currently may not include full entity info). |
| Add refresh events in `parseAndExecuteActions` | Line ~6438 area | Currently does NOT dispatch `context-changed` at all. Need to add after actions are processed. |

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Add UI refresh listener | New effect near line 1159 | A separate `useEffect` that calls `loadProblems()`, `loadRequests()`, `loadChecklists()` on context-changed. Do NOT merge with the existing agent notification handler. |
| Existing handler | Line 1160 | Already writes `[System: ...]` to terminal. Keep this as-is, identity. |

**IMPORTANT ADAPTATION:** The existing `onContextChanged` cleanup at preload.ts line 431 is broken:
```
return () => { ipcRenderer.removeListener('context-changed', () => {}); };
```
This creates a NEW empty callback and tries to remove it, which does nothing. **Fix this**: store the handler reference and remove the real one.

### Step 4: Terminal Manual Input

**File:** `src/components/TerminalWindow.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Verify `onData` routes to PTY | Line 162 | Current: `terminal.onData((data) => { const isReady = terminalReadyStates.get(terminalId); if (isReady) { [check if is edit mode, not edit = use deskflowAPI.terminalAPI.write/terminalWrite] } })` |
| | | The actual write call inside the condition depends on terminal mode. Verify it writes via `deskflowAPI.terminalWrite(terminalId, data)` or `deskflowAPI.terminalAPI.write(terminalId, data)` |
| Verify focus | Terminal element | No explicit `addEventListener('click', () => term.focus())` found. May need to add. |

**IMPORTANT ADAPTATION:** `terminalAPI.write` at preload line 235 calls `terminal:write` which has **NO handler** in main.ts. This is a pre-existing bug. Either:
- Fix preload to use `terminal:write-old-format` for `terminalAPI.write`, OR
- Add a `terminal:write` handler in main.ts that calls `terminalManager.write(id, data)`

### Step 5: Problem Prompt Delivery

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Queue problem prompt | Line 1074 | Current: `setTimeout(async () => { ... }` — may do nothing with the prompt. Replace with: add prompt to messageQueueRef if agent not ready, or write directly if ready. |

**IMPORTANT ADAPTATION:** The `create-terminal` event listener at line 1092 calls `spawnTerminal()`. The `handleCreateTerminalForProblem` at line 1059 ALSO dispatches `create-terminal`. But `initializeTerminal`/`initializeSession` is called SEPARATELY at line 2469 (from the `onCreate` lambda). For the problem path, `initializeTerminal` is NOT called — only `spawnTerminal`. So the queue mechanism at line 232 only works if `agentReadyRef` is set. We need to ensure the `create-terminal` listener (line 1092) calls `initializeSession` after spawn, OR the `handleCreateTerminalForProblem` queues the prompt AND calls `initializeSession`.

### Step 6: Skills Pipeline

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Append skill in `handleInstructionPanelSend` | Line ~385-410 | After step 1 wiring, add the skill content appending logic shown in SECOND_RESULT.md Fix 1.5 |

### Step 7: FlowView Audit

**File:** `src/components/FlowView.tsx`

Read the file to determine if it's functional or a placeholder. If it creates problems locally via useState, replace with `deskflowAPI.createProblem()`. If it's a stub, leave it.

### Step 8: Status Change Format

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Fix format | Line 1163 | Current: `[System: ${label} ${data.action}: ${data.entity?.title || ...}]`. Fix to: `[SYSTEM: Problem #${id} status changed to "${status}"]` |
| Use `terminalWriteRaw` | Line 1164 | Already uses `terminalWriteRaw`. Verify the `\r\n` is appropriate or change to `\r` |

---

## Bundle B — Session System: Exact Code Map

### Step 9: tracker-mind-setup in Setup Dialog

Already covered in Step 2 above — add call to `trackerMindSetup('init-all')` before `assembleContext()`.

### Step 10: Init vs Setup Mode Distinction

**File:** `src/components/NewSessionDialog.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Current mode prop | Line 45: `mode?: 'create' \| 'initialize'` | Add `'setup'` to union: `mode?: 'create' \| 'initialize' \| 'setup'` |
| Conditionally render toggles | Lines 501-530 area | Wrap toggle cards in `{mode === 'setup' && (...)}` |
| Conditionally render prompt preview | Lines 530+ | Wrap in `{mode === 'setup' && (...)}` |
| Change title | Line 415 | Based on mode: `'initialize'` → "Quick Initialize", `'setup'` → "Setup Agent Workspace", `'create'` → "Create New Session" |
| Button label | Line ~400 area | `'initialize'` → "Initialize", `'setup'` → "Create Session" |

**IMPORTANT ADAPTATION:** The current dialog has `mode = 'create'` as default. The header button currently opens it without setting mode. You'll need to:
1. Add `setShowNewSessionDialog({ mode: 'setup' })` for the Setup button
2. Add a new "Quick Init" button with `setShowNewSessionDialog({ mode: 'initialize' })`

### Step 11: Agent Defaults Unification

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Add `getDefaultAgent()` | Top of file, after line 21 | `function getDefaultAgent(): string { return localStorage.getItem('terminal-defaultAgent') \|\| 'claude'; }` |
| Replace line 1062 | `const agent = localStorage.getItem('terminal-defaultAgent') \|\| 'claude'` | `const agent = getDefaultAgent()` |
| Replace line 1096 | Similar pattern | `const agentType = agent \|\| getDefaultAgent()` |
| Replace line 1244 | `localStorage.getItem('terminal-defaultAgent') \|\| 'claude'` | `getDefaultAgent()` |
| Replace line 1264 | Same | `getDefaultAgent()` |
| Replace line 1579 | Same | `getDefaultAgent()` |
| Replace line 1613 | Same | `getDefaultAgent()` |
| Replace line 1642 | Same | `getDefaultAgent()` |
| Replace line 2420 | `localStorage.setItem('terminal-defaultAgent', agent)` | Keep as-is — this is the setter, already works |
| Replace line 2490 | `defaultAgent={localStorage.getItem('terminal-defaultAgent') \|\| 'claude'}` | `defaultAgent={getDefaultAgent()}` |

**Total replacements:** 9 sites. Search for `localStorage.getItem('terminal-defaultAgent')` globally.

### Step 12: Agent Dropdown Population

**File:** `src/components/NewSessionDialog.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Replace agent select | Lines 434-444 | Replace `<option value="claude">Claude Code</option><option value="opencode">OpenCode</option>` with loop over SUPPORTED_AGENTS |
| Add SUPPORTED_AGENTS | Top of file or near agent select | `const SUPPORTED_AGENTS = [{ id: 'claude', name: 'Claude Code' }, ...]` |

### Step 13: Session ID Input

**File:** `src/components/NewSessionDialog.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Add input field | After agent selector (~line 444) | Add the resume session ID input block |
| Handle in `handleCreate` | After line 370 | Add resume-branch before create-new-session branch |

### Step 14: Session List Audit

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Fix limit | Line 359 | Change `20` to `500`: `deskflowAPI.getTerminalSessions(selectedProject \|\| undefined, 500)` |
| Remove topic filter | After line 359 | Ensure no `.filter(s => !s.topic)` exists |

**File:** `src/main.ts` (or compiled)

| Action | Exact Location | Code |
|--------|---------------|------|
| Verify SQL | Line 6047 | Current: `SELECT * FROM terminal_sessions WHERE project_id = ? OR project_id IS NULL ORDER BY created_at DESC LIMIT ?` — returns all sessions for project or null project. This is correct. |
| Verify NULL handling | Line 6045 | `if (!db) return []` — OK. `projectId || null` — OK. |

---

## Bundle C — IPC & Verification: Exact Code Map

### Step 15: `electron:execute-command`

**File:** `src/main.ts`

Add a new IPC handler. Use the pattern from existing handlers. No adaptation needed — this is new code.

**File:** `src/preload.ts`

Add bridge method. Follow the pattern at line 196 or 420.

### Step 16: `sendInstructionsToTerminal`

**File:** `src/main.ts` — compiled CJS line 9629

The handler exists but needs extension. Current signature: `(data: { terminalId: string; instructions: string })`. SECOND_RESULT.md adds `linkedProblemId` and `linkedRequestId`. Add those fields and the binding update.

### Step 17: `tracker-mind-generate`

**Confirmation:** Does not exist in main.ts. Add TODO comment. No code changes.

### Step 32: Verify `create-terminal` Events

**File:** `src/pages/TerminalPage.tsx`

Verify all 4 dispatch sites (lines 1071, 1251, 1585, 3196) are handled by the listener at line 1130. The handler at line 1092 calls `spawnTerminal()` only — verify it does NOT also call `initializeTerminal()`.

### Step 33: Graphify/QMD Paths

**File:** `src/services/ContextService.ts`

| Path | Line | Current | Verified? |
|------|------|---------|-----------|
| Graphify | 217 | `readFile(projectPath, 'graphify-out/GRAPH_REPORT.md')` | ✅ Correct |
| QMD templates | 252 | `listDir(projectPath, 'agent/templates')` | ✅ Correct (NOT double-nested) |

**Conclusion:** Paths are already correct. No changes needed for Fix 7.2.

### Step 34: Vault Sync Documentation

**File:** `src/services/ContextService.ts`

Add comment at top of file or near the relevant functions. No functional changes.

### Step 35: `useJson` Guards

**File:** `src/main.ts` — all NEW handlers

The `db` variable is a module-level `let db = null` initialized at line ~1409. Existing handlers already use `if (!db) return ...` pattern. New handlers must follow the same pattern.

---

## Bundle D — Terminal UX & Layout: Exact Code Map

### Step 18: Prompt Preview

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| New state | After line 200 | `const [showPromptPreview, setShowPromptPreview] = useState(false)` |
| Add preview button | Near line 1240 (header area) | Add "Review" button that calls `buildPromptPreview` |
| New function | After `loadSessions()` (~line 362) | `const buildPromptPreview = useCallback(async () => { ... }, [computedProjectPath, projects, contextConfig])` |

**IMPORTANT ADAPTATION:** `contextConfig` state isn't available at TerminalPage level — it lives in NewSessionDialog. Need to either:
- Pass it up via `onCreate`, OR
- Re-read from dialog state, OR
- Store it in a ref at TerminalPage level

### Step 19: Delta Context

**Files:** `src/pages/TerminalPage.tsx`, `src/main.ts`

| Action | Exact Location | Code |
|--------|---------------|------|
| Enhance UI refresh | New effect (separate from line 1160) | `onContextChanged` → `loadProblems()`, `loadRequests()`, `loadChecklists()` |
| Fix cleanup | preload.ts line 431 | Store handler ref for proper removal |
| Enhance main.ts entity data | Lines 6555, 6563, 6569, 6577 | `executeActionsFromFile` dispatches may need richer entity data |

### Step 20: Enlarge Compose Area

**File:** `src/components/InstructionPanel.tsx`

| Action | Line | Code |
|--------|------|------|
| Change textarea | Line 375 | `h-12` → `min-h-[120px] max-h-[300px]`, `h-12 resize-none` → `min-h-[120px] resize-y`, `rows={6}` |

### Step 21: Target Terminal Indicator

**File:** `src/components/InstructionPanel.tsx`

Add indicator between the header and the compose area (after line ~280, before the problem checkboxes). Needs `activeTerminalId` and `agentReadyRef` passed as props or accessed via context.

**IMPORTANT ADAPTATION:** `activeTerminalId` and `agentReadyRef` are in TerminalPage, not InstructionPanel. These need to be passed as props:
- Add `activeTerminalId?: string | null` and `isAgentReady?: boolean` to `InstructionPanelProps`
- Pass from TerminalPage at line 1381

### Step 22: @term Routing

**File:** `src/pages/TerminalPage.tsx`

| Action | Line | Code |
|--------|------|------|
| Existing @term parsing | Lines 1442-1446 | Already inline in the onChange handler. Works by detecting `@` in textarea, filtering terminal tabs, showing dropdown. |
| Enhancement needed | After dropdown selection | On selecting a term from dropdown, it should prefix the message with `@termid >> ` and route the message to that terminal when sent. |

**Current behavior:** The dropdown shows matching terminals. When you click one, it likely inserts the terminal name into the text. The actual routing happens (or should happen) when `queueOrSend` is called — it uses the resolved target from the message text.

### Step 23: Drag-Drop Layout

**File:** `src/components/TerminalWindow.tsx`

| Action | Line | Code |
|--------|------|------|
| Find `onDragEnd` | **Not found** in TerminalWindow.tsx | The drag-drop likely uses the MapEditor component at `src/components/MapEditor.tsx` |
| Find `swapLeavesInTree` | Also exported from **MapEditor.tsx** | Import from MapEditor, not from TerminalWindow |

**IMPORTANT ADAPTATION:** The drag-drop layout mutation is in `MapEditor.tsx`, not `TerminalWindow.tsx`. Bundle D step 19 should target MapEditor, not TerminalWindow.

### Step 24: Split Pane Height

**File:** `src/components/TerminalWindow.tsx`

| Action | Line | Code |
|--------|------|------|
| Verify `min-h-0` | Line 341 (PaneRenderer) | Check if `min-h-0` and `flex-1` propagate at all nesting levels |
| Root container | Line ~1-10 | Check parent wrapping div for `flex-1 min-h-0` |

### Step 25: Resize Handles

**File:** `src/components/TerminalWindow.tsx`

| Action | Line | Code |
|--------|------|------|
| Existing `SplitHandle` | Line 300 | Already exists as a component. Verify it works (may have been the focus of previous terminal sizing fixes) |
| May not need changes | — | If `SplitHandle` already works, skip this step |

---

## Bundle E — UI Polish & Context: Exact Code Map

### Step 26: Problem List Redesign

**File:** `src/pages/TerminalPage.tsx` — `ProblemsTab` component

| Action | Exact Location | Code |
|--------|---------------|------|
| STATUS_COLORS | New constant, near line 2814 | Add alongside existing `STATUS_CONFIG` |
| Replace problem rendering | Lines ~2900-2950 (in ProblemsTab) | Replace plain list items with styled `ProblemCard` |
| CategoryBadge component | Check if exists | If not, create simple inline badge |

**IMPORTANT ADAPTATION:** `ProblemsTab` is defined inline at line 2829 within `TerminalPage.tsx`. It's NOT a separate file. All changes go in TerminalPage.tsx.

### Step 27: Rich File Display

**File:** `src/pages/TerminalPage.tsx` — `FilesTab` component

| Action | Exact Location | Code |
|--------|---------------|------|
| Add BasicMarkdownViewer | New component before FilesTab (~line 3765) | Simple markdown→HTML converter |
| Detect AI files | In FilesTab rendering | Check if file path starts with `agent/` or `graphify-out/` |
| Conditionally render | Replace raw `<pre>` display | Use BasicMarkdownViewer for AI files, keep raw for source code |

### Step 28: Close Session Blinking

**File:** `src/pages/TerminalPage.tsx`

| Action | Exact Location | Code |
|--------|---------------|------|
| Rewrite `closeTerminal` | Lines 718-724 | Batch all setState calls inside `React.startTransition` |
| Add `React.startTransition` | Import | Already available in React ^19.2.0 |
| Add `React.memo` on tabs | Not found | Wrap terminal tab rendering in `React.memo` |

### Step 29: Product Area Tags

**File:** `src/pages/TerminalPage.tsx` — session list rendering

| Action | Exact Location | Code |
|--------|---------------|------|
| Add tags | Line ~1900 area (session card rendering) | Add category badge and product_area tag to each session card |
| Filter pills | Line ~1900 area | Already has `sessionCategoryFilter` state (line 203) and filter rendering. May need to add product area filter. |

### Step 30: Problem-Request Linking

**File:** `src/pages/TerminalPage.tsx` — ProblemDetailModal at line 3134

| Action | Exact Location | Code |
|--------|---------------|------|
| Add related requests section | After line 3187 (Assign to Terminal button) | Add the related requests dropdown + linked requests display |

### Step 31: Modal Styling

**File:** `src/pages/TerminalPage.tsx` — ProblemDetailModal at line 3134

| Action | Line | Code |
|--------|------|------|
| Modal wrapper | 3157 | Already uses `bg-zinc-800 rounded-xl p-6` — close to target. May need minor tweaks. |
| Status buttons | 3167-3180 | Uses colored buttons. Apply `STATUS_COLORS` badges instead. |
| Priority | 3248 | Uses plain text `Priority: {problem.priority}`. Replace with `PRIORITY_INDICATORS`. |
| Actions | 3188-3209 | Keep but re-style to match zinc theme |

### Step 32: Remove Cross-Group Drag

**File:** `src/pages/TerminalPage.tsx` — sidebar sections

Search for `draggable` attributes or `onDragStart`/`onDragOver` on sidebar section headers. Remove them.

### Step 33: Context Sharpening

**Files:** `src/main.ts`, `src/preload.ts`

| Action | Location | Code |
|--------|----------|------|
| New handler | main.ts — add after existing handlers | `ipcMain.handle('summarize-session', ...)` |
| New bridge | preload.ts — add after line ~390 | `summarizeSession: (sessionId: string) => ipcRenderer.invoke('summarize-session', sessionId)` |

### Step 34: Defer NL Routing

Just a TODO comment in TerminalPage.tsx. No code changes.

---

## Build & Test Sequence

```
Bundle A (Core Flows):
  Step 1 → npm run build
  Step 2 → npm run build
  Step 3 → npm run build
  Step 4 → npm run build
  Step 5 → npm run build
  Step 6 → npm run build
  Step 7 → npm run build (if FlowView is functional)
  Step 8 → npm run build

Bundle B (Session System):
  Step 9 → npm run build (trivial — already done in Step 2)
  Step 10 → npm run build
  Step 11 → npm run build
  Step 12 → npm run build
  Step 13 → npm run build
  Step 14 → npm run build

Bundle C (IPC & Verification):
  Step 15 → npm run build
  Step 16 → npm run build
  Step 17 → npm run build (trivial — just a comment)
  Step 32 → npm run build (verification, minimal code)
  Step 33 → npm run build (no changes — paths already correct)
  Step 34 → npm run build (trivial — just a comment)
  Step 35 → npm run build (guards in new handlers only)

Bundle D (Terminal UX):
  Step 18 → npm run build
  Step 19 → npm run build
  Step 20 → npm run build
  Step 21 → npm run build
  Step 22 → npm run build
  Step 23 → npm run build
  Step 24 → npm run build
  Step 25 → npm run build (if SplitHandle needs changes)

Bundle E (UI Polish):
  Step 26 → npm run build
  Step 27 → npm run build
  Step 28 → npm run build
  Step 29 → npm run build
  Step 30 → npm run build
  Step 31 → npm run build
  Step 32 → npm run build (trivial)
  Step 33 → npm run build
  Step 34 → npm run build (trivial)
```

---

## File Change Summary (Actual)

| File | Bundle(s) | Changes Needed |
|------|-----------|----------------|
| `src/pages/TerminalPage.tsx` | A, B, C, D, E | onSend wiring, context-changed refresh listener, closeTerminal batching, agent defaults unification, problem prompt queue, skills pipeline, status format, prompt preview, @term routing, problem list redesign, rich file display, product area tags, modal styling, delta context, link UI, remove cross-group drag |
| `src/main.ts` (compiled as `dist-electron/main.cjs`) | A, C | execute-command handler, entity data in executeActionsFromFile, context-changed in parseAndExecuteActions, summarize-session handler, sendInstructionsToTerminal extension, useJson guards |
| `src/preload.ts` | A, C | executeCommand bridge, summarizeSession bridge, fix onContextChanged cleanup |
| `src/components/NewSessionDialog.tsx` | A, B | Replace 6 booleans with contextConfig state, remove buildInitContent, import ContextConfig, add tracker-mind-setup call, init/setup modes, agent dropdown SUPPORTED_AGENTS, session ID input |
| `src/components/TerminalWindow.tsx` | A, D | xterm onData verification, PaneRenderer flex/min-h-0 chain, SplitHandle verification, MapEditor drag-drop |
| `src/components/InstructionPanel.tsx` | A, D | InstructionConfig type update, enlarge textarea, add target terminal indicator props |
| `src/services/ContextService.ts` | C | Add vault sync documentation comment |
| `src/components/FlowView.tsx` | A | IPC wiring if functional |
| `src/components/MapEditor.tsx` | D | Fix drag-drop onDragEnd/swapLeavesInTree |
