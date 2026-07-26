# Bundle A — Core Flows

> **Implementation order:** FIRST — unblocks everything else
> **Steps:** 1-8 (Fixes 1, 2, 5, 3, 4, 1.5, 1.6, 1.7)
> **Dependencies:** None (can be done first)
> **Build verification:** `npm run build` must pass after each step

## Required Context

This bundle targets `src/pages/TerminalPage.tsx`, `src/main.ts`, `src/components/TerminalWindow.tsx`, `src/components/InstructionPanel.tsx`, `src/components/NewSessionDialog.tsx`, `src/components/FlowView.tsx`, `src/services/ContextService.ts`, `src/services/ContextConfig.ts`.

Read `CONTEXT_BUNDLE.md` for full architectural context. Key points:

- **`window.deskflowAPI`** is the renderer's only access to backend — all IPC via preload.ts
- **`TerminalPage.tsx`** (~5000 lines) manages: terminals, sessions, context assembly, compose, problem/request UI
- **`main.ts`** (~10k lines, CJS) has all IPC handlers, terminal manager, DB, services
- **Services** (ProblemsService, RequestsService, etc.) run only in main process via IPC
- **`DEFAULT_SYSTEM_PROMPT`** in `src/lib/defaults.ts` (~280 lines)

---

## Step 1 — Wire InstructionPanel onSend

**Source:** RESULT.md Fix 1

**File:** `src/pages/TerminalPage.tsx` line ~1384

Replace the current stub with `onSend={handleInstructionPanelSend}`.

**Verify `handleInstructionPanelSend` (line ~385) is complete:**
1. Resolve target terminal: `config.targetTerminalId || activeTerminalId || sendTargetSession`
2. Show error if no terminal (`showError('No terminal available. Open a terminal first.')`)
3. Compose full prompt: user text + linked problems (title/status/description) + linked requests (title/status) + skill content
4. Call `queueOrSend(targetId, composedPrompt)`
5. Save message to DB via `deskflowAPI.saveTerminalMessage({ sessionId, role: 'user', content })`
6. Update terminal binding via `deskflowAPI.updateTerminalBinding({ terminalId, activeProblemId, activeRequestId })`
7. Close panel and clear state

**Build:** `npm run build` — must pass

---

## Step 2 — Kill `buildInitContent`, Use `assembleContext` Only

**Source:** RESULT.md Fix 2

**Files:** `src/pages/TerminalPage.tsx`, `src/components/NewSessionDialog.tsx`

**In TerminalPage.tsx:**
1. Gut or remove `buildInitContent()` function entirely
2. Replace all calls to `buildInitContent()` with `assembleContext(projectPath, contextConfig)`
3. In `handleCreateSession`:
   - Call `deskflowAPI.trackerMindSetup('init-all', undefined, agent)` first (ensures files exist)
   - Then call `assembleContext(projectPath, dialogConfig.contextConfig)` ← toggle cards control this
   - Build merged system prompt: default → project additions → general additions → session additions
   - Queue: system prompt block + init content block
   - Save session to DB
   - Call `setupActionsFileWatcher`

**In NewSessionDialog.tsx:**
1. Remove the duplicate inline `ContextConfig` type — import `import { ContextConfig, DEFAULT_CONTEXT_CONFIG } from '../services/ContextConfig'`
2. Replace toggle state with `const [contextConfig, setContextConfig] = useState<ContextConfig>(DEFAULT_CONTEXT_CONFIG)`
3. Toggle cards directly mutate `contextConfig`:
   ```typescript
   const handleToggle = (system: keyof ContextConfig['systems'], enabled: boolean) => {
     setContextConfig(prev => ({ ...prev, systems: { ...prev.systems, [system]: { ...prev.systems[system], enabled } } }));
   };
   ```
4. Pass `contextConfig` through `onCreate`

**Build:** `npm run build` — must pass

---

## Step 3 — Add UI Refresh Events After AI Actions

**Source:** RESULT.md Fix 5

**Files:** `src/main.ts`, `src/pages/TerminalPage.tsx`

**In main.ts — `executeActionsFromFile()`:**
After processing all actions and clearing `actions.json`, dispatch refresh events:
```typescript
const windows = BrowserWindow.getAllWindows();
for (const win of windows) {
  if (win.isDestroyed()) continue;
  if (problemsChanged) win.webContents.send('context-changed', { type: 'problems', action: 'updated' });
  if (requestsChanged) win.webContents.send('context-changed', { type: 'requests', action: 'updated' });
  if (checklistsChanged) win.webContents.send('context-changed', { type: 'checklists', action: 'updated' });
}
```
Same pattern in `parseAndExecuteActions()`.

**In TerminalPage.tsx:**
```typescript
useEffect(() => {
  const cleanup = deskflowAPI.onContextChanged(async (data) => {
    if (data.type === 'problems') await loadProblems();
    if (data.type === 'requests') await loadRequests();
    if (data.type === 'checklists') await loadChecklists();
  });
  return cleanup;
}, []);
```

**Build:** `npm run build`

---

## Step 4 — Fix Terminal Manual Input

**Source:** RESULT.md Fix 3

**File:** `src/components/TerminalWindow.tsx`

In the xterm Terminal initialization:
```typescript
term.onData((data: string) => {
  deskflowAPI.terminalWrite(terminalId, data);  // Route keystrokes to PTY
});
term.onBinary((data: string) => {
  deskflowAPI.terminalWrite(terminalId, data);
});
```
Ensure the terminal is focusable: `term.element?.addEventListener('click', () => term.focus())`.

**Verify in main.ts** that `terminal:write` handler exists and calls `info.pty.write(data)`.

**Build:** `npm run build`

---

## Step 5 — Fix Problem → Terminal Prompt Delivery

**Source:** RESULT.md Fix 4

**File:** `src/pages/TerminalPage.tsx` — `handleCreateTerminalForProblem`

The function currently creates a tab, spawns a terminal, saves the session — but the problem prompt is never written to the terminal.

**Fix:** After creating the terminal, queue the problem prompt:
```typescript
if (prompt) {
  const queue = messageQueueRef.current.get(terminalId) || [];
  queue.push({ terminalId, content: prompt, timestamp: Date.now() });
  messageQueueRef.current.set(terminalId, queue);
}
```
Also add `setupActionsFileWatcher` call after terminal is created.

**Build:** `npm run build`

---

## Step 6 — Skills Pipeline Verification

**Source:** SECOND_RESULT.md Fix 1.5

**Files:** `src/components/InstructionPanel.tsx`, `src/services/ContextService.ts`

**Verify InstructionPanel skill selector:**
1. Dropdown populates via `deskflowAPI.getSkills()`
2. When skill is selected + Send clicked: `handleInstructionPanelSend` must append skill content:
   ```typescript
   if (config.skillId) {
     const skill = skills.find(s => s.id === config.skillId);
     if (skill) composedPrompt += `\n\n--- Skill: ${skill.name} ---\n${skill.content || skill.description}`;
   }
   ```

**Verify Setup dialog toggle:**
1. `ctxSkills` toggle → `contextConfig.systems.obsidian_skills.enabled`
2. When enabled → `assembleContext()` calls `buildSkillIndex()` → skill names + descriptions in init context
3. When disabled → no skill index in init context

**Verification test in browser:** Toggle Skills ON → create session → init contains skill index. Toggle OFF → no skill index.

**Build:** `npm run build`

---

## Step 7 — FlowView Audit & Wiring

**Source:** SECOND_RESULT.md Fix 1.6

**File:** `src/components/FlowView.tsx`

**Audit the component:**
1. Is it functional or a placeholder/stub?
2. Does it call any IPC methods?
3. Does it create problems via ProblemsService?

**If functional (has UI, creates nodes):**
Wire problem creation through IPC:
```typescript
const problemId = await deskflowAPI.createProblem({
  title, priority, category, description, projectId: selectedProjectId,
});
if (activeTerminalId) {
  await deskflowAPI.updateTerminalBinding({ terminalId: activeTerminalId, activeProblemId: problemId });
}
```

**If placeholder/stub:** Add a comment noting it needs a full implementation and move on (don't build it now).

**Build:** `npm run build`

---

## Step 8 — Fix Status Change → Terminal Message Format

**Source:** SECOND_RESULT.md Fix 1.7

**File:** `src/pages/TerminalPage.tsx` — the `context-changed` handler

**Current (broken):** `deskflowAPI.terminalWrite(terminalId, '[System: Problem updated: ...]\n')`

**Fixed:**
```typescript
const systemMessage = `[SYSTEM: Problem #${problem.id} status changed to "${problem.status}"]`;
deskflowAPI.terminalWriteRaw(terminalId, systemMessage + '\r');
```
Rules: plain text only (no markdown), single line, `\r` not `\n`, `terminalWriteRaw` not `terminalWrite` (don't record as user message).

**Build:** `npm run build`

---

## Build Verification

After ALL steps in this bundle:
```bash
npm run build
```
Must pass without errors. If errors occur, fix them before proceeding to Bundle B.
