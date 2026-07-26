# Round 1 — Initialize / Workspace Provisioning — Answers

**Date:** 2026-06-13
**Feature Scope:** All scaffolding logic: Initialize button, Setup button, `runInitAll()`, `tracker-mind-setup` IPC, `InitializeProgressModal`

---

## Q1: Two init entry points — same pipeline or different?

**Same pipeline.** Both end up calling `trackerMindSetup('init-all', ...)` → `runInitAll()`.

| Entry Point | File | Line Range | Trigger |
|---|---|---|---|
| **Green Initialize button** (FolderTree icon) | `src/pages/IDEProjectsPage.tsx` | 3941–3953 | `onClick` → `setShowInitModal(true)` → `InitializeProgressModal` renders → on mount calls `runInit()` at line 205 → calls `api.trackerMindSetup('init-all', projectId, agent)` |
| **Setup button** (Files tab header, amber Settings2 area) | `src/pages/TerminalPage.tsx` | 5412–5429 | `handleSetup()` → directly calls `window.deskflowAPI.trackerMindSetup?.('init-all', projectId)` |

Both route to the same IPC handler at `src/main.ts:15649–15665`:

```ts
ipcMain.handle('tracker-mind-setup', async (event, { step, projectId, agentName }) => {
  // …
  if (step === 'init-all') {
    return await runInitAll(baseDir, agent, projectId, event);
  }
  // …
});
```

**Key differences:**
- `InitializeProgressModal` provides granular per-step **progress streaming** (52 steps with `manifest`/`step`/`complete` events) — used by IDEProjectsPage
- `handleSetup` is a **fire-and-forget** call that only gets `{ success: true/false }` back — used by TerminalPage's Files tab
- Neither creates a terminal session; `runInitAll()` only scaffolds files/directories

---

## Q2: `runInitAll()` definition and step list

**Defined at:** `src/main.ts:14230–15645`

**Step list is hardcoded inline** as a static array at lines 14235–14297. It is NOT returned from DB or an external file. The array contains **52 entries** across 4 groups:

| Group | Count | Example entries | Lines |
|---|---|---|---|
| **agent/** | 31 | AGENTS.md, agents.md, INITIALIZE.md, PROBLEMS.md, REQUESTS.md, state.md, problems.json, requests.json, terminal-sessions.json, COMMITS.md, FEATURE_TRACKER.md, WORKSPACE_CONTEXT.md, HUMAN_TEST_CHECKLIST.md, context.md, constraints.md, patterns.md, glossary.md, data.md, debugging.md, skills.md, prompt.md, prompts.md, README.md, GENERIC_AGENT.md, qwen.md, dictionary.md, ACTIONS_SCHEMA.md, DEFAULT_SYSTEM_PROMPT.md, RULES_COMPACT.md, TERMINAL_SIDEBAR_REFERENCE.md, TRACKER_MIND_CHECKLIST.md | 14236–14268 |
| **agent/docs/** | 4 folders | docs/, templates/, core/, context/ | 14269–14273 |
| **agent/skills/** | 1 file + 18 subdirs | fix-problems.md, agent-reflect/, commit/, deep-research/, … (18 skill subdirectories) | 14274–14294 |
| **graphify-out/** | 1 folder | graphify-out/ | 14295–14296 |

Each step entry has shape:
```ts
{ id: string; label: string; type: 'folder' | 'file'; group: string; path: string }
```

---

## Q3: IPC channel and actual disk writing

**Request channel:** `'tracker-mind-setup'`
- Handler at `src/main.ts:15649`
- Preload bridge at `src/preload.ts:501`
  ```ts
  trackerMindSetup: (step: string, projectId?: string, agentName?: string) =>
    ipcRenderer.invoke('tracker-mind-setup', { step, projectId, agentName }),
  ```
- Payload in: `{ step: 'init-all', projectId?: string, agentName?: string }`
- Payload out (success): `{ success: true, projectPath: baseDir, files: allFiles }`

**Progress channel:** `'tracker-mind-init-progress'` (constant at `src/main.ts:14228`)
- Preload bridge at `src/preload.ts:502–506`
  ```ts
  onTrackerMindInitProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('tracker-mind-init-progress', handler);
    return () => { ipcRenderer.removeListener('tracker-mind-init-progress', handler); };
  },
  ```

**Does it actually write to disk?** YES. Every step calls `fs.writeFileSync()` or `fs.mkdirSync()` directly. Examples:

- `main.ts:14385` — `fs.writeFileSync(agentDir + '/AGENTS.md', agentsContent, 'utf-8')`
- `main.ts:14433` — `fs.writeFileSync(agentDir + '/INITIALIZE.md', initContent, 'utf-8')`
- `main.ts:14447` — `fs.writeFileSync(problemsPath, problemsContent, 'utf-8')`
- `main.ts:15562` — `fs.mkdirSync(docsDir, { recursive: true })`

All file content comes from **inline template strings** hardcoded inside `runInitAll()`. No external template files are read.

---

## Q4: What Initialize actually creates vs. assumes exists

| Path | Created? | Detail | Code Location |
|---|---|---|---|
| `agent/` dir | YES | `mkdirSync({ recursive: true })` | `main.ts:14311–14313` |
| `agent/AGENTS.md` | YES (if not exists) | Dynamic content listing existing .md files | `main.ts:14317–14386` |
| `agent/INITIALIZE.md` | YES (if not exists) | Inline template | `main.ts:14389–14434` |
| `agent/PROBLEMS.md` | YES (if not exists) | Via `ProblemsService` or template | `main.ts:14437–14456` |
| `agent/REQUESTS.md` | YES (if not exists) | Via `RequestsService` or template | `main.ts:14459–14478` |
| `agent/state.md` | YES (if not exists) | Inline template | `main.ts:14481–14508` |
| `agent/problems.json` | YES | Via `ProblemsService.getProblems()` | `main.ts:14511–14521` |
| `agent/requests.json` | YES | Via `RequestsService.getRequests()` | `main.ts:14523–14534` |
| `agent/terminal-sessions.json` | YES | SQLite query export | `main.ts:14537–14546` |
| `agent/COMMITS.md` | YES (if not exists) | Inline template | `main.ts:14549–14558` |
| `agent/FEATURE_TRACKER.md` | YES (if not exists) | Inline template | `main.ts:14561–14570` |
| `agent/WORKSPACE_CONTEXT.md` | YES (if not exists) | Inline template | `main.ts:14573–14582` |
| `agent/HUMAN_TEST_CHECKLIST.md` | YES (if not exists) | Inline template | `main.ts:14585–14594` |
| `agent/agents.md` (lowercase) | YES (if not exists) | Inline template | `main.ts:14597–14654` |
| `agent/context.md` | YES (if not exists) | Inline template | `main.ts:14657–14725` |
| `agent/constraints.md` | YES (if not exists) | Inline template | `main.ts:14727–14784` |
| `agent/patterns.md` | YES (if not exists) | Inline template | `main.ts:14787–14869` |
| `agent/glossary.md` | YES (if not exists) | Inline template | `main.ts:14872–14903` |
| `agent/data.md` | YES (if not exists) | Inline template | `main.ts:14905–14948` |
| `agent/debugging.md` | YES (if not exists) | Inline template | `main.ts:14951–14995` |
| `agent/skills.md` | YES (if not exists) | Inline template | `main.ts:14997–15047` |
| `agent/prompt.md` | YES (if not exists) | Inline template | `main.ts:15049–15089` |
| `agent/prompts.md` | YES (if not exists) | Inline template | `main.ts:15091–15133` |
| `agent/README.md` | YES (if not exists) | Inline template | `main.ts:15135–15183` |
| `agent/GENERIC_AGENT.md` | YES (if not exists) | Inline template | `main.ts:15185–15222` |
| `agent/qwen.md` | YES (if not exists) | Inline template | `main.ts:15224–15289` |
| `agent/dictionary.md` | YES (if not exists) | Inline template | `main.ts:15291–15341` |
| `agent/ACTIONS_SCHEMA.md` | YES (if not exists) | Inline template | `main.ts:15343–15399` |
| `agent/DEFAULT_SYSTEM_PROMPT.md` | YES (if not exists) | Inline template | `main.ts:15401–15441` |
| `agent/RULES_COMPACT.md` | YES (if not exists) | Inline template | `main.ts:15443–15462` |
| `agent/TERMINAL_SIDEBAR_REFERENCE.md` | YES (if not exists) | Inline template | `main.ts:15464–15503` |
| `agent/TRACKER_MIND_CHECKLIST.md` | YES (if not exists) | Inline template | `main.ts:15505–15553` |
| `agent/docs/` dir | YES | `mkdirSync`, empty | `main.ts:15562` |
| `agent/templates/` dir | YES | `mkdirSync`, **empty — no .qmd files** | `main.ts:15566` |
| `agent/core/` dir | YES | `mkdirSync`, **empty** | `main.ts:15570` |
| `agent/context/` dir | YES | `mkdirSync`, **empty** | `main.ts:15574` |
| `agent/skills/` dir | YES | `mkdirSync`, empty | `main.ts:15578` |
| `agent/skills/fix-problems.md` | YES (if not exists) | Inline template | `main.ts:15581–15610` |
| `agent/skills/*/` (18 dirs) | YES | `mkdirSync`, **empty — no SKILL.md** | `main.ts:15620–15628` |
| `graphify-out/` dir | YES | `mkdirSync`, **empty — no graph.json** | `main.ts:15631–15634` |
| `agent/automations/automations.json` | **NO** | Not in step list at all | — |
| `agent/templates/*.qmd` | **NO** | Directory created but empty | — |

**All writes are guarded** by `if (!fs.existsSync(path))` — existing files are read but NOT overwritten.

---

## Q5: Progress delivery mechanism

**Incremental streaming.** NOT a single resolve.

The main process pushes events via `event.sender.send(INIT_PROGRESS_CHANNEL, payload)`:

| Event type | When | Payload | Code |
|---|---|---|---|
| `manifest` | Once at start | `{ type: 'manifest', steps: InitStep[] }` | `main.ts:14307` |
| `step` | Per step | `{ type: 'step', stepId: string, status: 'creating' \| 'done' \| 'error', content?: string }` | `main.ts:14300` |
| `complete` | On success | `{ type: 'complete', stats: { total, created } }` | `main.ts:15638` |
| `error` | On failure | `{ type: 'error', error: string }` | `main.ts:15642` |

Renderer subscribes at `InitializeProgressModal.tsx:123`:
```ts
const unsub = api?.onTrackerMindInitProgress?.((data: InitProgressEvent) => {
  if (data.type === 'manifest' && data.steps) setSteps(data.steps.map(s => ({ ...s, status: 'pending' })));
  if (data.type === 'step') setSteps(prev => { /* update specific step status/content */ });
  if (data.type === 'complete') { setIsComplete(true); setIsRunning(false); onCompleteRef.current?.(); }
  if (data.type === 'error') { setIsRunning(false); setHasError(true); }
});
```

---

## Q6: Target directory + error handling

**Target directory resolution** at `main.ts:15651–15658`:
```ts
let baseDir = process.cwd();  // default: app root directory
if (projectId) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (project?.path) baseDir = project.path;  // override with project's on-disk path
}
```

**If `projectPath` is null/empty:** Falls back to `process.cwd()` (the app's installation/root directory). **No guard** checks if the folder is writable. `fs.mkdirSync`/`fs.writeFileSync` will throw EACCES/EPERM, caught by the outer `try/catch` at line 15640.

**Error handling:** One outer `try/catch` wraps the entire execution (line 15640). Three individual steps have inner `try/catch`:
- `problems.json` at `main.ts:14518–14521`
- `requests.json` at `main.ts:14531–14534`
- `terminal-sessions.json` at `main.ts:14543–14546`

All other steps are **unguarded** — any failure in those throws to the outer catch.

**Retry behavior:** The UI Retry button (`InitializeProgressModal.tsx:616`) calls `runInit()` which **RESTARTS from step 1**. It resets all state (`setSteps([])`, `setIsComplete(false)`, etc.). There is NO resume capability.

---

## Q7: Idempotency + Init Status Indicator

**Idempotency:** YES — every file write is guarded by `if (!fs.existsSync(path))`:
- `main.ts:14440` — `if (!fs.existsSync(problemsPath)) { … }`
- `main.ts:14462` — `if (!fs.existsSync(requestsPath)) { … }`
- `main.ts:14484` — `if (!fs.existsSync(statePath)) { … }`
- Same pattern for all 29+ `.md`/`.json` files

Folders use `mkdirSync({ recursive: true })` which is natively idempotent.

**Init Status Indicator (IDEProjectsPage):**
```ts
// IDEProjectsPage.tsx:246
const [provisionStatus, setProvisionStatus] = useState<'idle' | 'provisioning' | 'provisioned'>('idle');
```
- Set to `'provisioned'` at `IDEProjectsPage.tsx:3977` on modal close
- Set to `'provisioned'` via `onComplete` callback at `IDEProjectsPage.tsx:3979`
- **Does NOT check disk** — purely a local front-end state flag

**Init Status (TerminalPage Files tab):**
```ts
// TerminalPage.tsx:442
const [initStatus, setInitStatus] = useState<'idle' | 'checking' | 'ready' | 'init-ok' | 'error'>('idle');
```
- Set from `handleSetup()` result at `TerminalPage.tsx:5418`
- **Does NOT check disk** — purely a local front-end state flag

---

## Q8: Recent changes to init path

From `agent/state.md:1085`:
> **2026-06-XX:** IDEProjectsPage.tsx buttons swapped: Green FolderTree = "Initialize" (opens progress modal), Amber Settings2 = "Setup" (opens settings dialog), new "New Agent" (Bot, dispatches open-new-agent). Old one-click Setup (trigger-provision) replaced.

The entire `InitializeProgressModal` was recently added as a replacement for the old `trigger-provision` one-click flow.

**Still wired but possibly orphaned:** The `trigger-provision` CustomEvent listener remains at `TerminalPage.tsx:1874`, but the element that dispatches it is in `App.tsx:2451` — this may fire before TerminalPage mounts (race condition).

**Console errors:** No known console errors from clicking Initialize. The path is straightforward: button click → set state → render modal → useEffect fires → IPC call → progress events.

---

## Q9: Undefined functions in init path

All four functions listed as "undefined" in the questionnaire reference (§28 of some document) are actually **defined** — and none are in the init path:

| Function | Defined At | In Init Path? |
|---|---|---|
| `handleSaveWorkspace` | `TerminalPage.tsx:1358` | No |
| `handleLoadWorkspace` | `TerminalPage.tsx:1372` | No |
| `loadSavedConfigs` | `TerminalPage.tsx:1546` | No |
| `handleTerminalMoveToGroup` | `TerminalPage.tsx:1524` | No |

**Actual gap near init code:** `main.ts:15647` has a TODO stub:
```ts
// TODO: tracker-mind-generate — handler for generating content via tracker mind (e.g., prompts, summaries)
```
This is NOT implemented but also NOT called by the init pipeline.

---

## Q10: PROBLEMS.md entries about initialize

| Entry | Location | Status | Detail |
|---|---|---|---|
| "The initialize button is under file right? It's on the file page which doesn't make any sense." | `agent/PROBLEMS.md:310` | Open (user complaint) | UX concern — user confused about Initialize placement |
| "FIXED: Added missing `terminal_bindings` table creation in `initializeStorage()`" | `agent/PROBLEMS.md:360` | Fixed | DB schema bug |
| Button swap (Initialize vs Setup) | `agent/state.md:1085` | Recently changed | Green FolderTree = Initialize, removed old one-click trigger-provision |

**"Workspace Ready" card false positive potential:**
The card renders when `isComplete` is true (`InitializeProgressModal.tsx:590–612`). `isComplete` is set when:
1. `data.type === 'complete'` is received from the main process (line ~157)
2. OR after AI agent seeding succeeds (line ~162)

The `onComplete` callback fires `onCompleteRef.current?.()` which sets `provisionStatus → 'provisioned'` in the parent. **If `runInitAll()` succeeds but individual `fs.writeFileSync()` calls silently fail** (e.g., permissions, disk full), the step statuses were already set to `'creating'` → `'done'` in the progress events, so the card would still say "Workspace Ready". The main process outer catch would catch thrown errors, but some `fs` calls could partially fail before the catch triggers.

---

## Raw code references for verification

| File | Lines | What |
|---|---|---|
| `src/pages/IDEProjectsPage.tsx` | 246 | `provisionStatus` state |
| `src/pages/IDEProjectsPage.tsx` | 3941–3953 | Green Initialize button |
| `src/pages/IDEProjectsPage.tsx` | 3973–3983 | InitializeProgressModal usage |
| `src/pages/TerminalPage.tsx` | 442 | `initStatus` state |
| `src/pages/TerminalPage.tsx` | 5412–5429 | `handleSetup` (Files tab) |
| `src/components/InitializeProgressModal.tsx` | 90–104 | All state variables |
| `src/components/InitializeProgressModal.tsx` | 106–233 | `runInit()` function |
| `src/components/InitializeProgressModal.tsx` | 205–208 | IPC call: `api.trackerMindSetup('init-all', ...)` |
| `src/components/InitializeProgressModal.tsx` | 588–612 | "Workspace Ready" card |
| `src/main.ts` | 14228 | `INIT_PROGRESS_CHANNEL` constant |
| `src/main.ts` | 14230–15645 | `runInitAll()` full function |
| `src/main.ts` | 14235–14297 | Static step array (52 entries) |
| `src/main.ts` | 15649–15665 | `tracker-mind-setup` IPC handler |
| `src/preload.ts` | 501–506 | IPC bridge methods |
