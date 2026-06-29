# RESULT — Lyceum "Learn" Module: Onboarding + Import UX Build Packet

> **For the coding agent (OpenCode / Codex / etc.).** This is an implementation-grade spec. Build it in DeskFlow following the existing house conventions documented in §1. Do not invent new patterns. When done, every item in §10 (Acceptance) must pass.

---

## 0 · TL;DR — what's actually wrong and what to do

**Diagnosis (verified against the shipped `src/`):** The Learn module is *not present in the codebase*. There is **no `learn:` IPC handler**, **no `.ldoc` schema/validator**, **no `LearnPage`, no `/learn` route, no sidebar entry**, and **no `window`/`deskflowAPI` Learn methods**. The `No handler registered for 'learn:importLdoc'` and `no such file in directory` errors are the direct symptom of a renderer calling into a module that was never registered or bundled.

**Therefore the task is not "polish the UI" — it is "build the module's onboarding + import surface correctly, end to end."** This document specifies exactly that, in the order it must be built. The non-negotiable user-facing outcome:

1. A first-run **"How Learn works"** panel that explains, in ~30 seconds of reading: what the module does, what a `.ldoc` is, **how to make an AI generate one** (with a copy-paste author prompt + schema), what to input, and what to configure.
2. An **empty state** that is never a dead end: one-click **"Import the worked example"**, plus **"Import a .ldoc file"** and **"Paste JSON"**, plus a visible **"How it works"** button.
3. A robust **Import & Validate** flow with a real file picker (native dialog), a validation report (all errors, with jump-links), and an import button gated on errors.
4. The two import errors **fixed at the root**: register `learn:importLdoc` correctly, and resolve bundled files (`ldoc.schema.json` + worked-example) via an Electron-safe path in **both dev and packaged** builds.

---

## 1 · House conventions you MUST follow (from the existing code)

These are pulled from the current `src/`. Match them exactly so Learn integrates instead of bolting on.

### 1.1 IPC channel naming + handler registration (main process)
Channels are namespaced `module:action`, kebab-case action. Handlers live in the main process file alongside the others:
```ts
// existing pattern (finance)
electron_1.ipcMain.handle('finance:get-accounts', async () => { /* ... */ });
electron_1.ipcMain.handle('finance:create-transaction', async (_event, data: any) => { /* ... */ });
```
➡️ **Learn channels:** `learn:import-ldoc`, `learn:validate`, `learn:list-lessons`, `learn:get-lesson`, `learn:pick-file`, `learn:get-worked-example`, `learn:get-schema`, `learn:get-author-guide`. (The handoff used `learn:importLdoc`; **standardize on kebab-case `learn:import-ldoc`** to match every other channel in the app, and make the preload method name the camelCase wrapper.)

### 1.2 Preload bridge (single object, not `window.learn`)
The app exposes **one** bridge object `deskflowAPI` via `contextBridge.exposeInMainWorld('deskflowAPI', { ... })`. There is **no** `window.learn`. Add Learn methods to `deskflowAPI` following the finance style:
```ts
// existing pattern
financeGetAccounts: () => ipcRenderer.invoke('finance:get-accounts'),
financeCreateTransaction: (data: any) => ipcRenderer.invoke('finance:create-transaction', data),
```
➡️ **Add:**
```ts
learnImportLdoc: (json: unknown) => ipcRenderer.invoke('learn:import-ldoc', json),
learnValidate:   (json: unknown) => ipcRenderer.invoke('learn:validate', json),
learnListLessons:() => ipcRenderer.invoke('learn:list-lessons'),
learnGetLesson:  (id: string) => ipcRenderer.invoke('learn:get-lesson', id),
learnPickFile:   () => ipcRenderer.invoke('learn:pick-file'),          // opens native dialog, returns { ok, json, path } or { ok:false, error }
learnGetWorkedExample: () => ipcRenderer.invoke('learn:get-worked-example'),
learnGetSchema:  () => ipcRenderer.invoke('learn:get-schema'),
learnGetAuthorGuide: () => ipcRenderer.invoke('learn:get-author-guide'),
```
Renderer calls them as `window.deskflowAPI.learnImportLdoc(json)`. **Preload is compiled to `preload.cjs` and loaded via `path.join(__dirname,'preload.cjs')` — after editing preload you MUST rebuild it and fully restart Electron (HMR does NOT cover preload or main).**

### 1.3 Result envelope
Every Learn IPC call returns a discriminated `Result<T>`:
```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
```
Renderer must handle `ok:false` everywhere (no silent throws → that is how you get dead-end "no such file" toasts today).

### 1.4 Database (reuse the existing better-sqlite3 DB)
The app opens one DB with `const Database = require('better-sqlite3'); db = new Database(dbPath);` and already namespaces tables (e.g. `finance_*`). The DB lives under `app.getPath('userData')`. **Reuse the same `db` handle**; add `learn_*` tables via a migration that runs at startup (idempotent `CREATE TABLE IF NOT EXISTS`). Do **not** open a second database file.

### 1.5 Page registration (renderer)
A page is wired in `App.tsx` in three places: (a) `import`, (b) the `sidebarItems` array, (c) a `<Route>`. Match the existing entries:
```tsx
import LearnPage from './pages/LearnPage';
// sidebarItems:
{ icon: GraduationCap, label: 'Learn', path: '/learn' },   // lucide-react icon, sibling of 'AI Assistant'
// routes:
<Route path="/learn" element={<LearnPage />} />
```

### 1.6 Visual stack / tokens
React + react-router + Tailwind + framer-motion (`motion.button`) + lucide-react icons. Dark canvas `#121212`, zinc borders (`border-zinc-800`), `.glass` panels, indigo→emerald accents. Reuse the **design tokens already defined in the Frontend Design Spec v0.2 §2** (`--bg`, `--surface`, `--accent`, mastery scale). Don't introduce a new palette.

---

## 2 · Fix the two import errors at the root

### 2.1 `No handler registered for 'learn:import-ldoc'`
**Cause:** handler never registered (or its module threw during load, silently aborting registration). **Fix:**
1. Create `registerLearnIpc(db)` and **call it once** during startup where the other `ipcMain.handle(...)` registrations run (i.e. the same place `finance:*` is registered, at/after `app.whenReady`). 
2. Verify the register function is actually invoked — add a one-line log `console.log('[learn] IPC registered')` and confirm it prints in the **MAIN** terminal (not DevTools).
3. If a `require` at the top of the learn module throws (e.g. `ajv` not installed), registration silently aborts. Install deps first (`ajv` 2020-12) and wrap module top-level in nothing risky.
4. After editing main/preload: **rebuild preload + FULL Electron restart.** Channel strings must be **byte-exact** between preload and handler.

**Acceptance:** in DevTools, `await window.deskflowAPI.learnValidate({})` returns a `Result` object (not "No handler registered").

### 2.2 `no such file in directory` on import
There are two independent causes — fix both:

**(a) The renderer must never read a file by filesystem path.** Today's error is almost certainly the renderer trying to `fs.readFile(somePath)` or receiving a path it can't resolve. Replace with **one** of these renderer-safe inputs:
- **Native file picker (preferred):** renderer calls `window.deskflowAPI.learnPickFile()`. The **main** process opens `dialog.showOpenDialog({ filters:[{name:'Lyceum lesson', extensions:['ldoc','json']}], properties:['openFile'] })`, reads the file in main with `fs.readFile`, `JSON.parse`es it, and returns `{ ok:true, data:{ json, path } }`. The renderer never touches the filesystem.
- **Drag-and-drop / `<input type="file">`:** read the `File` object in the renderer with the browser `FileReader` / `await file.text()` → `JSON.parse`. This needs no path at all.
- **Paste JSON:** a `<textarea>`; parse on submit.

**(b) Bundled resources must resolve in dev AND packaged.** `ldoc.schema.json` and the worked-example `.ldoc` must be copied into the build and loaded via an Electron-safe path in the **main** process:
```ts
import { app } from 'electron';
import path from 'path';
const resBase = app.isPackaged ? process.resourcesPath : app.getAppPath();
const schemaPath  = path.join(resBase, 'resources', 'learn', 'ldoc.schema.json');
const examplePath = path.join(resBase, 'resources', 'learn', 'memory-hierarchy.ldoc');
```
- Add the files to the build config (electron-builder `extraResources`, or your copy step) so they land in `resources/learn/` of the packaged app.
- **Never** load them with a dev-relative path like `./validator/ldoc.schema.json` — that breaks in production and is a prime "no such file" suspect.
- On read failure, return `{ ok:false, error:'Bundled example not found at <path>' }` — surfaced as a recoverable UI message, never a crash.

**Acceptance:** "Import the worked example" works in both `npm run dev` and a packaged build; the error string (if any) names the exact path.

---

## 3 · The Onboarding / Instructions surface (the heart of the request)

This is what the user means by "there's no clear instructions / where do I put files / how does the AI generate this JSON / what do I configure." It must exist as an **always-reachable** surface, not a one-time tutorial.

### 3.1 Where it appears
- A persistent **"How it works"** button in the Learn header (icon: `HelpCircle`), opens a right-side **drawer** (or modal on narrow widths).
- The **empty state** embeds a condensed version inline (so a brand-new user sees it without clicking).
- Reachable any time, even when lessons exist.

### 3.2 Content (write this copy verbatim-ish, terse, scannable — NOT a tutorial wall)

**Panel title:** "Learn — living textbooks, AI-tutored"

**Section A — What this is (2 lines):**
> Learn renders `.ldoc` lessons: structured JSON made of typed blocks (prose, math, diagrams, code, quizzes). Import one and it becomes an interactive, AI-tutored lesson with mastery tracking.

**Section B — Get a lesson in 3 steps (numbered, each one line + a button):**
1. **Don't have one? Generate it with AI.** → button **[Copy AI author prompt]** (copies the §6 prompt incl. schema to clipboard). Caption: "Paste into any capable model (Claude/GPT). It returns valid `.ldoc` JSON."
2. **Have a `.ldoc` or `.json`?** → button **[Import file]** (native picker) or **[Paste JSON]**.
3. **Just exploring?** → button **[Import the worked example]** (the bundled Memory-Hierarchy lesson).

**Section C — What you need to provide (the "requirements" the user asked for):**
- A `.ldoc`/`.json` file that conforms to **ldoc/1.0** (schema below / link **[View format docs]**).
- (Optional) An AI provider key in **Settings → AI** if you want the live tutor + open-quiz grading. Reading + import work without it.
- Images/video in blocks must be public URLs (the importer does a reachability check; broken ones show a fallback, not a crash).

**Section D — What you can configure (answers "what to configure"):**
- **AI provider/model** for the tutor (Settings → AI).
- **Target mastery** per node (defaults from the lesson).
- **Theme** (dark/light) — inherits DeskFlow.

**Section E — Inline format docs (collapsible):** render the §5 block catalog + the §6 schema in a `<details>`/accordion, with a **[Copy schema]** button.

### 3.3 Human-centric UX rules (apply the "taste"/impeccable principles directly)
The 21st.dev / taste skills are not available to the planner, so encode the principles instead:
- **No dead ends.** Every error state shows *what broke* + *one clear next action* (retry / fix / view docs). Never show a raw stack trace or a bare "no such file".
- **Progressive disclosure.** Empty state shows the 3 buttons + one-paragraph what-this-is; deep format docs live behind "How it works" / accordions.
- **One primary action per state.** Empty state's primary = "Import the worked example" (lowest-friction success); secondary = file/paste.
- **Show, don't assume.** Buttons are labeled with verbs the user understands ("Import file", "Paste JSON", "Copy AI author prompt") — not jargon like ".ldoc ingest".
- **Feedback within 100ms.** Every button has hover/active/disabled/loading states (use framer-motion + the existing `.glass`/zinc styles). Loading uses skeletons, not spinners, for content.
- **Calm aesthetic.** Reuse tokens from Frontend Spec §2; color reserved for meaning (mastery, validation pass/fail).
- **Accessibility.** Keyboard reachable, focus-visible rings, AA contrast, `aria-label`s on icon-only buttons.

---

## 4 · Empty / Loading / Error states (per Frontend Spec §6, made concrete)

| State | What the user sees |
|---|---|
| **Empty (no lessons)** | Friendly headline "No lessons yet", one-paragraph what-this-is, the **3 action buttons** (worked example = primary), and a "How it works" link. NOT just a bare "Import .ldoc" button. |
| **Loading** | Skeleton cards matching the final library layout. No bare spinner. |
| **Importing** | Inline progress: "Validating… → Importing… → Done" with the validation report appearing live. |
| **Validation failed** | The **ValidationReport** (see §5.4): list ALL errors, each with node/block jump-link + a fix hint. Import button disabled until errors clear (warnings allowed). |
| **Import error (file/handler/path)** | Recoverable card: human message + the exact failing path/handler + **[Try again]** and **[View format docs]**. |
| **AI key missing (tutor)** | Non-blocking notice in the tutor panel: "Add an AI key in Settings to enable the tutor" + deep-link. Reading still works. |

---

## 5 · Import & Validate flow (detailed)

### 5.1 Entry points → all converge on `{ json }`
File picker, drag-drop, paste, and worked-example all resolve to a **parsed JSON object**, then call `learn:validate` → show report → enable `learn:import-ldoc`.

### 5.2 Pipeline (main process, transactional + idempotent)
1. Parse JSON (fail → `ParseError`, friendly message, abort).
2. Validate against `ldoc.schema.json` with **ajv (2020-12)** → return **ALL** failures, not first-fail.
3. Per-node `content_hash = sha256(canonicalize(node))`; diff vs existing → skip unchanged (re-import identical = no-op).
4. `BEGIN TX`: upsert lesson/nodes/prereqs/sources → `COMMIT`.
5. Media precheck (HEAD images/video) → mark broken (non-fatal).
6. Return `ImportResult { lessonId, nodes, warnings[], validation }`.

### 5.3 ImportResult / ValidationReport shapes
```ts
type ValidationReport = { ok: boolean; errors: ValIssue[]; warnings: ValIssue[] };
type ValIssue = { path: string; nodeId?: string; blockId?: string; rule: string; message: string; hint?: string };
type ImportResult = { lessonId: string; nodes: number; warnings: ValIssue[]; validation: ValidationReport };
```

### 5.4 `<ValidationReport>` UI
- Header: "Looks good ✓" (green) or "N issues to fix" (amber/red).
- Each issue row: rule name, human message, **fix hint**, and a **jump-link** (`nodeId`/`blockId`) that scrolls the offending location into view.
- Distinguish **errors** (block import) from **warnings** (allow import).
- **[Import]** disabled while `errors.length > 0`.

---

## 6 · The `.ldoc` format docs + AI author prompt + schema (ship these IN the app)

This directly answers "where are the instructions so an AI can generate this JSON?" Bundle all three: a copy-paste **author prompt**, the **JSON Schema**, and a **worked example**. Expose via `learn:get-author-guide` / `learn:get-schema` / `learn:get-worked-example` and render in the onboarding panel.

### 6.1 Copy-paste AI author prompt (the "[Copy AI author prompt]" button copies this)
```text
You are authoring a lesson in the Lyceum .ldoc format (ldoc/1.0). Output ONE JSON
object and nothing else. It MUST validate against the schema below.

Top-level shape:
{
  "doc": "ldoc/1.0",
  "lesson": { "id": "kebab-id", "title": "...", "part": 0, "version": "1.0.0", "summary": "1-2 sentences" },
  "nodes": [ { "id": "node-id", "title": "...", "target_mastery": "L3",
              "prereqs": ["other-node-id"],
              "blocks": [ ...typed blocks... ] } ]
}

Block types (each block has a unique "id" and a "type"):
- prose:   { id, type:"prose", md:"markdown text" }
- math:    { id, type:"math", tex:"KaTeX", caption?:"..." }
- mermaid: { id, type:"mermaid", code:"graph TD; ...", caption?:"..." }
- code:    { id, type:"code", lang:"python", code:"...", runnable?:false }
- image:   { id, type:"image", url:"https://...", alt:"...", caption?:"...", fallback_url?:"..." }
- callout: { id, type:"callout", tone:"info|tip|warn", md:"..." }
- quiz:    { id, type:"quiz", format:"mcq|numeric|open",
             q:"...", choices?:["a","b"], answer?:0, rubric?:"...", explain?:"..." }
- layer:   { id, type:"layer", level:"deeper|refresher", title:"...", blocks:[...] }

Rules:
- Every node targeting L2+ MUST contain at least one visual block (math, mermaid, image, or code).
- Use stable, unique ids for every node and block.
- Keep one concept per node. Prefer a diagram/figure as the hero; prose supports it.
- Output valid JSON only. No comments, no trailing commas, no prose outside the object.

Now author a lesson on: <YOUR TOPIC HERE>.
```

### 6.2 JSON Schema (`ldoc.schema.json`, JSON Schema draft 2020-12) — bundle this
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "ldoc-1.0",
  "type": "object",
  "required": ["doc", "lesson", "nodes"],
  "properties": {
    "doc": { "const": "ldoc/1.0" },
    "lesson": {
      "type": "object",
      "required": ["id", "title", "part", "version", "summary"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
        "title": { "type": "string", "minLength": 1 },
        "part": { "type": "integer", "minimum": 0 },
        "version": { "type": "string" },
        "summary": { "type": "string" }
      },
      "additionalProperties": false
    },
    "nodes": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "title", "blocks"],
        "properties": {
          "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "title": { "type": "string" },
          "target_mastery": { "enum": ["L0","L1","L2","L3","L4","L5"] },
          "prereqs": { "type": "array", "items": { "type": "string" } },
          "blocks": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/block" } }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false,
  "$defs": {
    "block": {
      "type": "object",
      "required": ["id", "type"],
      "properties": {
        "id": { "type": "string" },
        "type": { "enum": ["prose","math","mermaid","code","image","callout","quiz","layer"] },
        "md": { "type": "string" },
        "tex": { "type": "string" },
        "code": { "type": "string" },
        "lang": { "type": "string" },
        "runnable": { "type": "boolean" },
        "url": { "type": "string" },
        "fallback_url": { "type": "string" },
        "alt": { "type": "string" },
        "caption": { "type": "string" },
        "tone": { "enum": ["info","tip","warn"] },
        "format": { "enum": ["mcq","numeric","open"] },
        "q": { "type": "string" },
        "choices": { "type": "array", "items": { "type": "string" } },
        "answer": {},
        "rubric": { "type": "string" },
        "explain": { "type": "string" },
        "level": { "enum": ["deeper","refresher"] },
        "title": { "type": "string" },
        "blocks": { "type": "array", "items": { "$ref": "#/$defs/block" } }
      },
      "allOf": [
        { "if": { "properties": { "type": { "const": "prose" } } }, "then": { "required": ["md"] } },
        { "if": { "properties": { "type": { "const": "math" } } }, "then": { "required": ["tex"] } },
        { "if": { "properties": { "type": { "const": "mermaid" } } }, "then": { "required": ["code"] } },
        { "if": { "properties": { "type": { "const": "code" } } }, "then": { "required": ["code","lang"] } },
        { "if": { "properties": { "type": { "const": "image" } } }, "then": { "required": ["url","alt"] } },
        { "if": { "properties": { "type": { "const": "callout" } } }, "then": { "required": ["md"] } },
        { "if": { "properties": { "type": { "const": "quiz" } } }, "then": { "required": ["format","q"] } },
        { "if": { "properties": { "type": { "const": "layer" } } }, "then": { "required": ["level","blocks"] } }
      ]
    }
  }
}
```
*(Beyond schema, add one custom rule in `validate.ts`: each node with `target_mastery` in L2–L5 must contain ≥1 visual block (math|mermaid|image|code); emit a `visual-required` error with the node jump-link.)*

### 6.3 Worked example (`memory-hierarchy.ldoc`) — bundle this for one-click import
```json
{
  "doc": "ldoc/1.0",
  "lesson": { "id": "memory-hierarchy", "title": "The Memory Hierarchy", "part": 1, "version": "1.0.0", "summary": "Why computers stack registers, caches, RAM, and disk — and how locality makes it fast." },
  "nodes": [
    { "id": "why-hierarchy", "title": "Why a hierarchy?", "target_mastery": "L3", "blocks": [
      { "id": "p1", "type": "prose", "md": "Fast memory is small and expensive; big memory is slow and cheap. A hierarchy gives the **illusion** of large + fast memory." },
      { "id": "d1", "type": "mermaid", "code": "graph TD; CPU-->Registers-->L1-->L2-->L3-->RAM-->Disk", "caption": "Closer to the CPU = faster + smaller." },
      { "id": "q1", "type": "quiz", "format": "mcq", "q": "Which is fastest?", "choices": ["Disk","RAM","L1 cache","Registers"], "answer": 3, "explain": "Registers sit inside the CPU core." }
    ]},
    { "id": "locality", "title": "Locality of reference", "target_mastery": "L3", "prereqs": ["why-hierarchy"], "blocks": [
      { "id": "p2", "type": "prose", "md": "Temporal locality: recently used data is reused soon. Spatial locality: nearby data is used soon." },
      { "id": "m1", "type": "math", "tex": "\\text{AMAT} = t_{hit} + \\text{miss rate}\\times t_{miss}", "caption": "Average memory access time." }
    ]}
  ]
}
```

---

## 7 · File / change checklist (mapped to the existing repo)

> Follow the backend spec's intended layout where possible, but **wire it into the real main-process entry + the single `deskflowAPI` preload object**.

**Main process**
- [ ] `src/main/learn/index.ts` → `export function registerLearnIpc(db)` that registers all `learn:*` handlers. **Call it once** where `finance:*` handlers are registered (at/after `app.whenReady`).
- [ ] `src/main/learn/import.service.ts` — parse → validate → hash/diff → TX upsert → media precheck → `ImportResult`.
- [ ] `src/main/learn/validate.ts` — ajv 2020-12 compile of `ldoc.schema.json` + custom `visual-required` rule; returns ALL issues.
- [ ] `src/main/learn/repo.ts` + migration `learn_lessons`, `learn_nodes`, `learn_prereqs`, `learn_sources`, `learn_progress` (all `IF NOT EXISTS`, reuse existing `db`).
- [ ] `learn:pick-file` handler → `dialog.showOpenDialog` + main-side read/parse.
- [ ] Bundled-resource loader using `app.isPackaged ? process.resourcesPath : app.getAppPath()`.

**Resources / build**
- [ ] `resources/learn/ldoc.schema.json` (§6.2) and `resources/learn/memory-hierarchy.ldoc` (§6.3).
- [ ] Build config copies `resources/learn/**` into packaged `resources/` (electron-builder `extraResources`).
- [ ] `ajv` (+`ajv-formats` if needed) added to dependencies.

**Preload**
- [ ] Add the 8 `learn*` methods (§1.2) to the `deskflowAPI` object. Rebuild `preload.cjs`.

**Renderer**
- [ ] `src/pages/LearnPage.tsx` — Home (Library + empty state + "How it works").
- [ ] `src/components/learn/OnboardingPanel.tsx` (§3), `ImportDialog.tsx` (§5), `ValidationReport.tsx` (§5.4), `LessonCard.tsx`.
- [ ] `App.tsx`: add import, `sidebarItems` entry `{ icon: GraduationCap, label:'Learn', path:'/learn' }`, and `<Route path="/learn" element={<LearnPage/>} />`.
- [ ] TypeScript: extend the `window.deskflowAPI` interface declaration with the new `learn*` methods (the app declares it in `App.tsx`/a `.d.ts`).

---

## 8 · Build order (do it in this sequence so each step is verifiable)
1. **Backend plumbing first:** schema + validator + `learn:validate` + `learn:get-schema`/`get-worked-example`/`get-author-guide` handlers, registered and logging. *Verify in DevTools console.*
2. **Import path:** `learn:pick-file` + `learn:import-ldoc` + repo/migration. *Verify worked example imports end-to-end (dev).*
3. **Renderer shell:** sidebar entry + route + LearnPage empty state with the 3 buttons. *Verify navigation + empty state.*
4. **Onboarding panel** (§3) + copy buttons. *Verify copy-to-clipboard + docs render.*
5. **ImportDialog + ValidationReport** with all states (§4). *Verify a deliberately-broken JSON shows per-rule errors with jump-links and a disabled Import.*
6. **Packaged build check:** confirm bundled files resolve via `process.resourcesPath`.

---

## 9 · Electron gotchas (so you don't re-hit them)
- Vite HMR reloads the **renderer only**. **Main + preload changes require a full Electron restart.**
- If preload isn't rebuilt, `window.deskflowAPI.learn*` is `undefined`.
- A throw during the learn module's top-level load **silently aborts** `ipcMain.handle` registration → "No handler registered". Check the **MAIN** terminal.
- Channel strings must be **byte-exact** between preload and handler.
- Never read files by path from the renderer; go through `learn:pick-file` (dialog in main) or the `File`/`FileReader` API.

---

## 10 · Acceptance criteria (must all pass)
- [ ] **Sidebar shows "Learn"; `/learn` route renders.**
- [ ] **Empty state is not a dead end:** shows what-this-is + "Import the worked example" (primary) + "Import file" + "Paste JSON" + "How it works".
- [ ] **"How it works" panel** explains: what Learn is, what `.ldoc` is, how to make an AI generate it (with a working **[Copy AI author prompt]**), what to input, what to configure — all skimmable, no tutorial wall.
- [ ] **Worked example imports in one click** in BOTH dev and packaged builds. No "no such file".
- [ ] **`learn:import-ldoc` / `learn:validate` handlers exist** and round-trip (no "No handler registered").
- [ ] **Invalid `.ldoc` shows ALL errors** with node/block jump-links + fix hints; **Import disabled until errors clear**.
- [ ] **Re-importing identical JSON is a no-op** (content-hash).
- [ ] **Every failure is recoverable** (message + next action); no raw stack traces, no bare paths shown as the whole error.
- [ ] **Format docs + JSON schema are viewable inside the app** with copy buttons.
- [ ] **Spec/plan discipline:** if CZ has not said "go," deliver this as the plan and confirm before writing app code.

---

### Appendix — honest note on scope
The v0.2 Frontend Spec assumed a built module and under-specified onboarding (its §4.7 was ~2 sentences). This packet supersedes §4.7/§6 for the onboarding+import surface and is self-contained: schema, author prompt, worked example, IPC contracts, states, and acceptance are all here. Other Lyceum surfaces (reader, tutor, mastery, graph) remain as in the v0.2 specs and are out of scope for this packet.
