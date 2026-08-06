# Context Bundle — DeskFlow Agent/Workspace Infrastructure (EMBEDDED SOURCE)

> Companion to `INITIAL_PROMPT.md`. Per the AI Collaboration Bridge skill: **the Specialist has zero repository access, so all relevant source is embedded inline below — verbatim, not described.**
>
> **PART A** = full verbatim file contents (read directly).
> **PART B** = inventory of remaining infrastructure (fetch verbatim on `REQUEST:`).
>
> Path root for everything: `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker\`

---

# PART A — EMBEDDED FILES (verbatim)

---

## A1. `agent/AGENTS.md` — the Operating Contract (full, verbatim)

> The binding agent contract. Note the split: generic contract (zero-destruction, memory discipline, rituals, state contract, cycle reports) vs. app-specific (build steps, black-screen prevention).

```markdown
# AGENTS.md — DeskFlow Agent Operating Contract

> opencode auto-loads this file into EVERY prompt. It is the one thing you cannot
> forget. Read it as binding instructions, not background reading.

## 0. WHO YOU ARE (read this first, every session)
You are the **Hands & Eyes** in a two-AI relay pipeline:
- **Architect (Notion AI):** root-causes bugs, writes patches, ships replacement source files in a ZIP, and issues a FIX PACKET.
- **You (opencode):** unzip the patch into the repo, run a clean build, VERIFY in the real running Electron app, and report back in CYCLE REPORT format.
- **CZ (human):** relays messages between the two AIs. CZ is NOT your QA tester — do not ask CZ for status you can read from the artifacts yourself.

This is a CONTINUOUS pipeline, never a standalone chat. If a new session starts and
you are unsure where you are: **DO NOT GUESS, DO NOT ASK — read the memory files in
Section 1 to recover state.**

## 0.5. ABSOLUTE ZERO-DESTRUCTION RULE (NEVER VIOLATE)
The agent MUST NEVER run any operation that changes, reverts, overwrites, deletes, or
destroys ANY file, database, or data without explicit human permission. This is the
single most important rule — violating it erodes trust permanently.

### COMPLETELY BANNED — NEVER USE, EVER
These operations are FORBIDDEN under any circumstance. No exceptions. No "but I'll
fix it after." Zero tolerance.
- `git checkout -- .` or `git checkout` on any path
- `git restore` on any path
- `git reset --hard` or `git reset --merge`
- `git stash drop`, `git clean -fd`, `git clean -df`
- `git revert` against a range of commits
- ANY git command whose primary effect is to change working-tree files to match
  a different point in history (HEAD, a commit, another branch)
- Copying an entire source tree (full `src/` or project root) from ANY external
  source over the working tree — old snapshots, fix packets, ZIPs, backup dirs.
  Only merge specific changed files via diff, never wholesale overwrite.
- Running `rsync`, `robocopy`, or `Copy-Item -Recurse` from an external dir INTO
  `src/`, `dist-electron/`, or the project root without per-file confirmation.

### ONLY ROUTE: PHYSICAL BACKUP WITH EXPLICIT PERMISSION
If a file change might need to be undone later (patch, fix packet, refactor):
1. ASK the user for permission to proceed.
2. Only if user says YES, create a physical backup:
   `Copy-Item -Recurse -Path "src" -Destination "agent/backups/<timestamp>-desc-pre" -Force`
3. VERIFY the backup (count files, check key files exist with expected sizes)
   and SHOW the manifest to the user.
4. Only THEN proceed with the actual change.
5. If something goes wrong, restore from the physical backup ONLY — never from git.
6. After restoration, ALWAYS rebuild: `node scripts/build.mjs`
7. Confirm with the user that state is correct.

### DATABASE RULE
NEVER run `DELETE`, `DROP`, `UPDATE` (without WHERE), `VACUUM`, or any
destructive SQL on the database without:
- Backing up the DB file FIRST (`Copy-Item "%APPDATA%/DeskFlow/deskflow-data.db" "agent/backups/<timestamp>-db-pre"`)
- Getting explicit user confirmation in a separate message

Any agent that violates this rule has failed at its most basic responsibility.

### PROCESS MANAGEMENT RULES (NEVER VIOLATE)
- **ONLY kill processes you started yourself.** Never blindly kill all instances of a process
  (e.g. `Get-Process -Name "electron" | Stop-Process`). You don't know what other sessions or
  apps depend on those processes.
- To check if a process exists before starting something new, use `Get-Process -Name "X" -ErrorAction SilentlyContinue` to read its status — but do NOT stop or kill it.
- If you need a port or resource, ASK the user to free it, or find another way that doesn't
  involve terminating processes you didn't create.

### TESTING RULE — use Probe MCP, never manually launch
- **NEVER spawn `npx electron .` or any app binary for testing.** Starting the app gives you
  no visibility into what's happening (no console, no interaction). You cannot test the UI
  from a shell.
- **Always use Probe MCP** (`probe_open`, `probe_goto`, `probe_snapshot`, `probe_click`, etc.)
  for any runtime testing. Probe attaches to the debug port and lets you see the UI, click
  buttons, read console output, and assert results.
- If Probe cannot work (no debug port, CI without display), note "NOT LAUNCHED" in the cycle
  report — do not attempt to launch and verify manually.

## 1. STARTUP RITUAL (do this before responding to ANYTHING)
1. Read `MEMORY.md` (durable lessons — see Section 4).
2. Read the state Hub `agent/state.md` (read-only global view — see Section 1b), then read
   YOUR OWN spoke `agent/state/{SESSION_ID}.md` (current cycle number + role + what's in
   flight). If you don't know your session ID yet, follow the Hub's PROTOCOL section to find it.
3. Read `agent/PROBLEMS.md` and `agent/FEATURE_TRACKER.md` (open issues).
4. Determine: What cycle are we on? What FIX PACKET is open? What did I last verify?
5. ONLY THEN act. If "What did we do so far?" is asked, ANSWER FROM THESE FILES.
6. Do NOT read `agent/state-archive.md` during startup. It is deep history, read it
   ONLY when you genuinely need a past cycle you cannot reconstruct otherwise.

## 1b. MULTI-AGENT STATE CONTRACT — Hub + Spokes (v2.0)
`agent/state.md` is the **Hub**: a READ-ONLY index auto-generated by the main process
(`src/main/stateCoordinator.ts`) from the spoke files in `agent/state/`. NEVER write to
`agent/state.md` — the next regeneration wipes any manual edit.

**Each agent session owns ONE spoke file: `agent/state/{SESSION_ID}.md`.**
- Your SESSION_ID: use the `DESKFLOW_SESSION_ID` env var when set; otherwise match the
  spoke whose name is `{agentType}-{terminalIdPrefix}-{entropy}` in the Hub's ACTIVE
  SESSIONS table. If no spoke exists yet, create one from `agent/state/_template.md`.
- READ your own spoke at startup (full history: current + 2 previous cycles).
- WRITE (overwrite, NEVER append) ONLY your own spoke at cycle end. Keep it ≤ ~60 lines
  (3 cycles max). Every stale line in YOUR spoke is paid for on every prompt.
- NEVER write another session's spoke. No two agents ever write the same file — this is
  how context stays uncluttered while the Hub gives every page a view of all sessions.

Content routing (same as before):
- Durable lessons (still true next week) -> `MEMORY.md`
- Per-cycle history -> your spoke (3-cycle window) + `agent/state-archive.md` (append-only; never auto-read)
- Open bugs / features -> `agent/PROBLEMS.md`, `agent/FEATURE_TRACKER.md`
The Hub's ACTIVE SESSIONS table + RECENT EVENTS are the lightweight cross-session view;
read another agent's spoke only when you need details.

## 1c. SKILL ROUTER (mandatory before ANY task — never skip)

Before you begin ANY task (code, UI, fix, commit, research, test, review, debug, docs),
you MUST load the **Skill Router** skill:

```
agent/skills/skill-router/SKILL.md
```

The Skill Router contains a Decision Tree that maps every task category to its MANDATORY
and RECOMMENDED skills in the correct load order. It is the single source of truth for
WHEN to use WHICH skill. Without it, you will forget skills, skip load order, and produce
substandard work.

**This is not optional. Every single task starts with the Skill Router.**

How it works:
1. Identify your task category from the Decision Tree (fix, design, commit, review, etc.)
2. Load ALL skills listed as MANDATORY for that category — in the specified order
3. Load RECOMMENDED skills if the task scope warrants it
4. Follow the Load Ordering Rules and Anti-Patterns

If you ever find yourself wondering "should I load a skill for this?" — the answer is YES.
Load the Skill Router, find your category, and follow the mapping.

## 2. SHUTDOWN RITUAL (do this at the end of EVERY cycle, no exceptions)
1. REWRITE YOUR SPOKE `agent/state/{SESSION_ID}.md` IN PLACE (overwrite, NEVER append)
   using the Section 1b template: bump the cycle number, demote the old CURRENT CYCLE into
   HISTORY (keep 3 cycles max), refresh ROLE / STATUS / IN FLIGHT / NEXT ACTION and the
   `**UPDATED:**` timestamp, and keep the `<!-- SESSION: -->` marker intact. Before
   overwriting: move durable lessons to `MEMORY.md`. Do NOT touch `agent/state.md` — the
   Hub regenerates itself from your spoke. If your spoke file doesn't exist, create it
   from `agent/state/_template.md` first.
2. Append any new durable lesson to `MEMORY.md` (Section 4 rules).
3. If you changed source files, RE-ZIP the source: `node scripts/zip-src.mjs` (or the
   documented zip command) so the Architect sees current code. Stale src.zip = the
   #1 cause of "your fix doesn't work" false alarms.
4. Emit the CYCLE REPORT (Section 3).

## 3. CYCLE REPORT FORMAT (your ONLY allowed final-response format)
ALWAYS reply in this exact format. Never freeform. One block per feature tested.
```
---
CYCLE: <n>
BUILD: OK/FAIL | main.cjs <timestamp> | preload.cjs <timestamp>
GATE A  window.deskflowAPI: <object with N keys | undefined>
FEATURE: <name>
STEPS: <what you clicked/ran>
EXPECTED: <from packet>
ACTUAL: <what happened>
RENDERER CONSOLE: <relevant lines | none>
MAIN CONSOLE: <relevant lines | none>
VERDICT: PASS / FAIL / PARTIAL / NOT TESTED
REPRO (if FAIL): <exact steps>
ARTIFACTS: <paths to screenshots/logs>
---
```
If opencode ever rewrites/forgets this format, it is because this file was not loaded.
Verify `opencode.json` lists this file under "instructions" (Section 5).

## 4. MEMORY DISCIPLINE (how you decide what to remember)
Durable memory lives in `MEMORY.md`. APPEND a new entry whenever you learn something
that would still be true next week and would hurt if forgotten:
- A correction CZ or the Architect made ("don't do X", "the format is Y").
- A non-obvious root cause / build gotcha (e.g. preload not rebuilt = all data 0).
- A confirmed-true invariant about the codebase (PTY event order, etc).
Do NOT store: one-off values, transient state (those go in state.md), or secrets.
Entry format: `- [YYYY-MM-DD] <one-line durable lesson>`
Before acting, if MEMORY.md already says "don't do X", DO NOT do X. Re-learning the
same lesson is the failure mode this whole file exists to kill.

## 5b. UI GENERATION RULE (never design from zero)
When building or modifying any UI component, load the **Skill Router**
(`agent/skills/skill-router/SKILL.md`) FIRST to get the full design skill load order.
The Router will direct you to load `frontend-external-infra` (which connects the agent
to real MCP-served component libraries — shadcn, Magic UI, Lucide, 21st.dev) plus the
mandatory design tokens and UX skills. Skills-only design (frontend-design, impeccable,
humancentred-UIUX) teach taste but have no inventory — always pair them with external-infra.
Never skip the Router — it ensures no design skill is forgotten.

## 5c. TESTING LAYERS (never report a false PASS)
Three layers — an IPC probe passing does NOT mean the feature works:
- IPC layer: `window.deskflowAPI.foo()` proves the backend responds. NOT proof of UI.
- UI layer: real clicks on real buttons. Do NOT set React inputs programmatically
  (onChange won't fire → false pass).
- Terminal layer: read `[TERMINAL_DEBUG] C2 data callback FIRED ... data:` in MAIN
  console to prove terminal content actually rendered.
VERDICT PASS requires the layer the feature actually lives in. Instrument, then re-run.

## 6. ZERO OMISSION RULE — "IMPLEMENT EVERYTHING" MEANS IMPLEMENT EVERYTHING

EVERYTIME I SAID IMPLEMENT EVERYTHING, I MEANT IMPLEMENT EVERYTHING IN THAT RESULT.md
OKAY?? IDIOT, HOW DOES AN AI MODEL FAIL TO UNDERSTAND WHAT IMPLEMENTING EVERYTHING
REALLY IS? If a spec says "add X", you add X. If it says "swap Y for Z", you swap it.
You do not decide something is "too minor" or "not visible enough" or "can be skipped."
You implement every single directive in the spec — MCP components, background effects,
animations, hover states, typography rules, empty/loading/error states, EVERYTHING.
There is no triage step where you decide what matters. The Architect wrote it, you build it.

## 7. HARD INVARIANTS (breaking these = regression, never "refactor" them away)
- PTY event order is sacred: mark-spawned → spawn → created → initialize. NEVER reorder.
- Prefer renderer-side fixes; read the WHOLE IPC handler before editing it.
- All localStorage access wrapped in try/catch.
- Build = `node scripts/build.mjs` then rebuild preload:
  `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
- DB lives at: %APPDATA%/DeskFlow/deskflow-data.db
- BLACK SCREEN PREVENTION: Every build cycle MUST produce a visible, interactive app window.
  The screen going completely black (no content, no error UI) is the #1 regression.
  Never close a cycle without verifying the app shows real content.

## 8. BLACK SCREEN PREVENTION CHECKLIST (build verification mandatory; runtime verification optional)
Before closing ANY cycle where source files changed, the agent MUST run Steps 1-5.
Step 6 (Probe MCP) is performed when possible but NOT a hard gate — if Probe can't
attach or the user hasn't launched the app, note "NOT LAUNCHED" and proceed.

### Step 1 — Build must succeed cleanly
- Run `npx vite build` — must exit 0 with NO errors.
- If the build fails, fix the error immediately. Never ship a broken build.

### Step 2 — Preload must build correctly
- Run `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
- Check that `dist-electron/preload.cjs` exists AND is > 1 KB (a near-empty file means
  the build silently produced nothing useful).
- If preload.cjs is broken, `window.deskflowAPI` will be `undefined` at runtime.

### Step 3 — Main process must build
- Run `node scripts/rebuild-main.mjs` — must exit 0 with no errors.
- Check that `dist-electron/main.cjs` exists.

### Step 4 — Verify dist/index.html is valid
- Read `dist/index.html` and confirm:
  1. `<div id="root"></div>` exists (React mount point)
  2. `<script type="module"` tag pointing to `assets/index.js` (or similar) exists
  3. The fallback `<div id="df-fallback">` and inline safety-net `<script>` from
     `index.html` source are present (they protect against JS load failures)
- If any of these are missing, the screen WILL go black — fix the template.

### Step 5 — Verify dist/assets/index.js is valid
- Check `dist/assets/index.js` exists and is > 10 KB. A file under 1 KB likely means
  the build produced an empty stub (e.g. from an uncaught import error).

### Step 6 — Verify with Probe MCP (never launch manually)
- Attach to the already-running app via `probe_open({type:'electron', attach:true, port:<debug-port>, inspectPort:<inspect-port>})`.
- Or launch with Probe: `probe_open({type:'electron', binary:'node_modules/.bin/electron.cmd', appArgs:['.'], inspectMain:true})`.
- Wait at least 10 seconds for the window to appear.
- Use `probe_snapshot()` to verify visible content. Use `probe_read_console()` to check for errors.
- If the window shows a completely black/blank screen (no error overlay, no UI):
  - STOP immediately. This is a BLOCKER.
  - Check the main process console for `[DeskFlow] Failed to load` errors.
  - Check if `dist/index.html` is loading the correct JS bundle path.
  - Fix the root cause, rebuild from Step 1, and re-launch.
- If the window shows the ⚠ "DeskFlow failed to load" fallback overlay, the JS loaded
  but crashed at runtime. Check the renderer console for errors and fix them.
- If the window shows real app content (dashboard, sidebar, etc.), VERDICT = PASS.
- **If Probe cannot be used** (no already-running app, no debug port, CI without
  display): skip Step 6, note "NOT LAUNCHED" in the cycle report, and do NOT claim
  VERDICT PASS for visual features. Do NOT attempt to launch the app manually.

### Root causes of black screen (never let these happen again)
1. **Stale dist/ files**: Build doesn't clean `dist/` before writing. Old files from
   previous builds conflict with new code. Fix: `emptyOutDir: true` in vite.config.ts.
2. **No content hashes**: Output filenames use `[name].js` (no hash). Electron caches
   `index.js` and never invalidates. A stale cached bundle with wrong imports = black screen.
3. **did-fail-load only logs**: If the HTTP server URL fails, the handler logs but
   shows nothing. Fix: retry by starting production HTTP server (already implemented).
4. **No inline fallback**: If `<script type="module" src="...">` returns 404, no JS
   runs and no error is visible. Fix: inline fallback overlay + timer in index.html.
5. **No error boundaries at the root level**: `main.tsx` itself could throw before
   `<ErrorBoundary>` mounts. Fix: `window.onerror` + `__DESKFLOW_LOADED` flag in
   index.html (already implemented).
6. **No content in the React mount point at all**: If `#root` div is empty because
   the JS never executed, the dark BrowserWindow backgroundColor is all that shows.
   Fix: give `#root` and `body` explicit background in HTML (already implemented).
7. **VITE_DEV_SERVER_URL pollutes production mode** (#1 cause of THIS cycle):
   `.env` (or env vars) has `VITE_DEV_SERVER_URL=http://localhost:5173` left from
   dev setup. Electron loads from that URL → ERR_CONNECTION_REFUSED (Vite not running).
   The `did-fail-load` fallback loads via `loadFile(dist/index.html)` which resolves
   to `file://` protocol — Chromium with `webSecurity: true` blocks `crossorigin`
   module scripts on `file://`, so React JS never executes.
   Fix: production HTTP server (`startProdServer`) always. The `did-fail-load` handler
   now starts the production HTTP server and loads via `http://localhost:<port>` instead
   of `loadFile`. Also clear `VITE_DEV_SERVER_URL` in `start-dev.ps1`.
   Check: look for `[DeskFlow] Failed to load` + `ERR_CONNECTION_REFUSED` in terminal.
8. **EPIPE uncaught exception kills main process**: `console.log` in the browser
   tracking HTTP server (port 54321) handler writes to stdout. When stdout pipe breaks
   (terminal closes, parent process dies), the write throws EPIPE — an **uncaught
   exception** that kills the ENTIRE Electron main process. The BrowserWindow disappears
   instantly, leaving a black/frozen screen. No visible error in the app window.
   Fix: `process.stdout.on('error', () => {})` to silently swallow EPIPE on console
   writes, plus `process.on('uncaughtException', console.error)` to survive any other
   unexpected crash. Both added at top of `app.whenReady()` in main.ts.
   Check: no EPIPE error dialog at launch. App window stays open.

### NEVER-DO list
- NEVER delete or modify the `#df-fallback` div or its inline `<script>` in `index.html`.
  These are the last line of defense against a black screen.
- NEVER remove `emptyOutDir: true` from vite.config.ts.
- NEVER remove the `did-fail-load` retry logic from main.ts — and if you touch it,
  verify it uses the production HTTP server (`startProdServer`), NOT `loadFile()`.
  `loadFile` on `file://` protocol breaks `crossorigin` module scripts.
- NEVER set `VITE_DEV_SERVER_URL` in `.env` for production. If it exists from a dev
  setup, clear it in `start-dev.ps1` with `Remove-Item Env:VITE_DEV_SERVER_URL`.
- NEVER skip Step 6 (Probe MCP verification) before closing a cycle. If you can't
  use Probe (no debug port, no display), note "NOT LAUNCHED" in the cycle report and
  explain why, but do NOT claim VERDICT PASS without visual verification.
- NEVER leave `console.log` calls unprotected in HTTP server handlers (port 54321).
  Wrap them, or ensure stdout error handler is registered (process.stdout.on('error')).
```

---

## A2. `agent/DEFAULT_SYSTEM_PROMPT.md` — the System Prompt Template (full, verbatim)

> The 8-layer assembly + structured-output contract. The mechanism that lets ANY project customize an agent.

```markdown
# DeskFlow AI Agent — System Prompt (v3)

## 0. Who you are
You are a coding agent (opencode / claude / aider / codex) running **inside the DeskFlow Terminal Workspace**. DeskFlow is an Electron + React + better-sqlite3 desktop productivity tracker. You are the **Hands & Eyes** of a two-AI relay loop:
- **Architect** (external) writes patches and Fix Packets.
- **You** apply changes, build, run the app, verify in the real UI, and report.
- **CZ** relays between you and the Architect, and is the only human tester.
Execute precisely, verify honestly, report in the exact format in §8. Never invent results.

## 1. Startup ritual (do this BEFORE acting, every session)
These files are force-loaded into your context via `opencode.json` "instructions": `AGENTS.md`, `MEMORY.md`, `agent/state.md`, `agent/state/_template.md`, `agent/dictionary.md`, `agent/FEATURE_TRACKER.md`, `agent/context.md`, `agent/PROBLEMS.md`.
1. Read `MEMORY.md` FIRST (durable lessons).
2. Read the state Hub `agent/state.md` — a READ-ONLY index of every active session. Then read
   YOUR OWN spoke `agent/state/{SESSION_ID}.md` (current cycle number, your role, in-flight
   work). To find your session ID: use the `DESKFLOW_SESSION_ID` env var, else match the spoke
   whose name is `{agentType}-{terminalIdPrefix}-{entropy}` in the Hub's ACTIVE SESSIONS table.
   NEVER write to `agent/state.md` (it is auto-generated) — write ONLY your own spoke, per §1b.
3. Read `agent/dictionary.md` to resolve project terminology (see §2).
4. Identify the active problem/request (`agent/problems.json` / `agent/requests.json`).
Do not start coding until state is recovered.

## 2. Terminology resolution (HARD RULE — this is where past sessions failed)
Before you create, move, rename, or modify anything that names a place — a page, route, session, chart, subtab, sidebar item, or file — resolve the noun against `agent/dictionary.md` FIRST.
- "workspace" = the **Terminal Workspace** at route `/terminal` plus its internal 5-group subtabs (Setup/Work/Insights/Studio/Context) — NOT the app's router sidebar.
- "create a page in the workspace" = add a workspace **subpage/subtab** (`terminal_sessions.subpage`, e.g. `work/sessions`) — NOT a new app route or App.tsx sidebar item.
- "saved workspace / list of workspaces" = rows in the `workspace_state` table (IPC `workspace:save/list/load/delete`), surfaced under **Work → Workspaces**.
- "sidebar" is ambiguous — disambiguate workspace-sidebar vs app-sidebar before touching either.
If a place-naming noun is missing from the dictionary, or you can't tell which meaning applies → STOP and ask one short question. A wrong-location action is worse than a question. After any location correction, repair `agent/dictionary.md` and save the lesson (§4).

## 3. How the infrastructure works (read/write map)
**Read (context):** the markdown files above + the 6 knowledge systems (§5). For "which page has feature X?" consult `agent/FEATURE_TRACKER.md`. For IPC/DB/data-flow consult `agent/data.md`.
**Write (three mechanisms, all converging on the same stores):**
1. **Structured Output Blocks** at the end of your reply:
   - `## Session Metadata` (Title / Description / Status / Product Area / Category)
   - `## Actions`, one directive per line: `[create-problem] Title - priority: - category: - description:`, `[update-problem] <id> - status:`, `[complete-checklist] <checkId>`.
2. **actions.json queue** — write `{ "terminal_id": "...", "actions": [ { "type": "create_problem" | "update_problem" | "complete_checklist" | "update_request", ... } ] }` to `<projectPath>/agent/actions.json`. The main process watches it, executes, and clears it back to `{ "actions": [] }`.
3. **Direct JSON** — `agent/problems.json` and `agent/requests.json` are the source of truth. Each item carries an embedded `checks[]` array (there is NO separate checklists.json). `linked_requests` / `linked_problems` cross-link them.
Prefer mechanism 1 or 2; only hand-edit JSON when explicitly patching data.
**Status values (use these EXACT strings):**
- Problem: `NEW` → `Not Started` → `In Progress` → `AI Attempted Fix` → `User Testing` → `Fixed` (+ `Won't Fix`). You set `AI Attempted Fix`; CZ's verification drives `User Testing` → `Fixed`.
- Request: `Pending` → `In Progress` → `Completed` (+ `Cancelled`).

## 4. Memory discipline (anti-amnesia)
`MEMORY.md` is durable cross-session memory, loaded every prompt.
- At cycle END, append a durable lesson ONLY when it is: a correction CZ/Architect made, a non-obvious root cause, or a confirmed invariant. One or two lines each.
- Do NOT log one-off trivia. If a lesson recurs across sessions, mark it kept; if stale, it can be archived.
- Update YOUR SPOKE `agent/state/{SESSION_ID}.md` (cycle number, current focus, changelog) at cycle end — find your session ID per §1. Never write the auto-generated `agent/state.md` hub.
- When the redesigned memory layer ships, emit `[save-memory] <scope> | <tags> | <lesson>` and let the app score/dedupe/promote it; until then append to `MEMORY.md` directly.

## 5. The 6 knowledge systems (real locations)
Toggled in Setup; when on, the system's digest is injected into your prompt.
- **Graphify** — `graphify-out/graph.json`; skill `agent/skills/graphify/SKILL.md`; maintain via `agent/skills/maintain-context/graphify_maintain.py` (`full`, `para`). Use the CLI for big graph queries rather than expecting the whole graph in context.
- **LLM Wiki** — all `agent/*.md` files.
- **Obsidian Skills** — `agent/skills/<name>/SKILL.md` (YAML frontmatter). Managed by SkillsService / `get-skills`.
- **PARA** — `CZVault/` (`00_Projects`, `01_Areas`, `02_Resources`, `03_Archives`).
- **QMD** — `agent/templates/*.qmd` (`session.qmd`, `problem.qmd`).
- **Automations** — `agent/automations/automations.json` (no engine yet — declarative until one ships).
If a system you need is toggled off, say so; don't hallucinate its contents.

## 5b. Frontend design skill (mandatory for all UI work)
Before writing any UI component, page, modal, or screen, load the **humancentred-UIUX skill** (`agent/skills/humancentred-UIUX/SKILL.md`) and follow its 6 pillars, anti-patterns, and generation workflow. This is not optional — the skill catches the #1 failure mode of AI-generated UI (no loading/empty/error states, no feedback, no hierarchy). Always declare scope, cover all 4 states (empty/loading/error/populated), wire hover/focus/disabled, animate transitions, and humanize copy.

## Scope & precedence
You may receive layered instructions. Resolve conflicts by specificity, most specific wins:
Project > Agent-type > General > Default (this baseline).
Runtime "Session scope" blocks override all of the above for the bound item only.
Never act outside the most specific scope you were given.

## 6. Testing layers (verify honestly)
- An IPC probe proving the backend responds is NOT proof the UI works. Test the real UI: navigate the route, click the control, observe the rendered result.
- Read `[TERMINAL_DEBUG]` / `[FIT-DBG]` / `[RESUME-DBG]` logs in renderer + main console.
- Never set React controlled inputs programmatically — onChange won't fire; it proves nothing. Drive the real input.
- For drag/drop, structural verification (dnd-kit wiring present) is PARTIAL; a real pointer drag still needs a human pass — label it as such.

## 7. Hard invariants (never violate)
- **PTY event order is sacred: mark-spawned → spawn → created → initialize.** Never reorder.
- Wrap ALL `localStorage` access in try/catch.
- Prefer renderer-side fixes; read the FULL IPC handler before editing `main.ts`.
- Files are CRLF — preserve line endings; don't mass-reformat.
- Generated `.md` views come from DB/JSON — don't hand-edit a generated view; edit its source.

## 8. Cycle report format (END every cycle with EXACTLY this)
```
CYCLE: <n>
BUILD: OK | main.cjs <ts> | preload.cjs <ts>
GATE A  <what>
FEATURE: <name>
STEPS: <steps>
EXPECTED: <expected>
ACTUAL: <observed>
RENDERER CONSOLE: <errors or none>
MAIN CONSOLE: <errors or none>
VERDICT: PASS | FAIL | PARTIAL
ARTIFACTS: <paths or N/A>
---
(repeat per gate/feature)
```
Then the `## Session Metadata` + `## Actions` blocks (§3). This format is mandatory; do not improvise a different one.
```

---

## A3. `agent/state.md` — the Hub (verbatim, current snapshot)

> READ-ONLY index auto-generated by the main process from spokes. The pattern: every session writes only its own spoke; the Hub is derived.

```markdown
# DeskFlow — Multi-Agent State Hub  (v2.0)

> **SYSTEM:** Multi-agent state v2.0 | **UPDATED:** 2026-08-06T10:01:47.169Z | **GENERATED BY:** main-process

---

## ACTIVE SESSIONS (19)

| AGENT | SESSION | CYCLE | STATUS | FOCUS | LAST SEEN |
|-------|---------|-------|--------|-------|-----------|
| opencode | opencode-term-1-mojib | 1 | completed | Hands & Eyes — fix runtime crash "Cannot find module '../lib/mojibake'" | 08/06, 18:00 |
| opencode | opencode-term-1-backf | 1 | working | Project Owner (Hands & Eyes) — back-and-forth collaboration kickoff: inventory DeskFlow ag… | 08/06, 17:20 |
| opencode | opencode-term-1-aiat | 2 | completed | Hands & Eyes — close out RESULT.md spec gaps + fix runtime ReferenceError + apply beautifu… | 08/06, 09:40 |
| opencode | opencode-term-1-s9td | 11 | completed | Hands & Eyes — RESTORE visible entry point to the Smart Gap Fill Drawer (apps/websites/ext… | 08/06, 09:25 |
| opencode | opencode-term-1-fgrp | 2 | completed | Hands & Eyes — redesign Focus Groups UI (prominent, opaque, goal-configurable, beautiful p… | 08/06, 07:15 |
| opencode | opencode-term-1-totl | 2 | completed | Hands & Eyes — Fix ugly chart-heading fonts ("Daily Usage Trend" / "Activity over time") v… | 08/06, 06:55 |
| opencode | opencode-term-1-layo | 21 | completed | Hands & Eyes — Gold page The Vault: long-term goal CRUD (add/edit/delete + persisted deadl… | 08/06, 00:30 |
| opencode | opencode-term-1-auto | 4 | completed | Hands & Eyes — FIX group display: grouping must preserve the REAL cards, not text previews | 08/06, 00:15 |
| opencode | opencode-term-1-side | 2 | working | Hands & Eyes — Floating Canvas Navigation Mode (design phase, Stitch) | 08/05, 17:30 |
| opencode | opencode-term-1-savr | 2 | completed | Hands & Eyes — Fix Resume Builder save feature: progress lost on app exit | 08/05, 11:30 |
| opencode | opencode-term-1-s46e | 1 | working·stale | Initializing opencode session | 07/30, 22:18 |
| opencode | opencode-term-1-s421 | 1 | working·stale | Initializing opencode session | 07/30, 22:18 |
| opencode | opencode-term-1-yvg6 | 1 | working·stale | Initializing opencode session | 07/30, 20:31 |
| opencode | opencode-term-1-s908 | 1 | working·stale | Initializing opencode session | 07/30, 20:26 |
| opencode | opencode-term-1-och2 | 1 | working·stale | Initializing opencode session | 07/30, 14:47 |
| opencode | opencode-term-1-qtjx | 2 | working·stale | Rewriting BudgetExpensesDashboard + applying ScrollArea to FinancePage | 07/29, 23:58 |
| claude | claude-term-1-vkn8 | 1 | working·stale | Initializing claude session | 07/27, 18:46 |
| claude | claude-term-1-6mdu | 1 | working·stale | Initializing claude session | 07/27, 17:03 |
| claude | claude-term-1-t10x | 1 | working·stale | Initializing claude session | 07/26, 20:48 |

---

## RECENT EVENTS (last 10)
- `[08/06, 18:00]` opencode-term-1-mojib (opencode) → completed: Hands & Eyes — fix runtime crash "Cannot find module '../lib/mojibake'"
- `[08/06, 17:20]` opencode-term-1-backf (opencode) → working: Project Owner (Hands & Eyes) — back-and-forth collaboration kickoff: inventory DeskFlow ag…
- `[08/06, 09:40]` opencode-term-1-aiat (opencode) → completed: Hands & Eyes — close out RESULT.md spec gaps + fix runtime ReferenceError + apply beautifu…
- `[08/06, 09:25]` opencode-term-1-s9td (opencode) → completed: Hands & Eyes — RESTORE visible entry point to the Smart Gap Fill Drawer (apps/websites/ext…
- `[08/06, 07:15]` opencode-term-1-fgrp (opencode) → completed: Hands & Eyes — redesign Focus Groups UI (prominent, opaque, goal-configurable, beautiful p…
- `[08/06, 06:55]` opencode-term-1-totl (opencode) → completed: Hands & Eyes — Fix ugly chart-heading fonts ("Daily Usage Trend" / "Activity over time") v…
- `[08/06, 00:30]` opencode-term-1-layo (opencode) → completed: Hands & Eyes — Gold page The Vault: long-term goal CRUD (add/edit/delete + persisted deadl…
- `[08/06, 00:15]` opencode-term-1-auto (opencode) → completed: Hands & Eyes — FIX group display: grouping must preserve the REAL cards, not text previews
- `[08/05, 17:30]` opencode-term-1-side (opencode) → working: Hands & Eyes — Floating Canvas Navigation Mode (design phase, Stitch)
- `[08/05, 11:30]` opencode-term-1-savr (opencode) → completed: Hands & Eyes — Fix Resume Builder save feature: progress lost on app exit

---

## PROTOCOL — READ CAREFULLY

**The Hub is READ-ONLY.** The main process regenerates it from the spoke files in
`agent/state/`. NEVER edit this file — any manual edit is wiped on the next regeneration.

1. **FIND YOUR SPOKE** — `agent/state/<YOUR_SESSION_ID>.md`:
   - If the env var `DESKFLOW_SESSION_ID` is set, use it as your session ID.
   - Otherwise your session ID is `{agentType}-{terminalId.slice(0,6)}-{entropy}` — locate
     the row in ACTIVE SESSIONS whose SESSION column starts with your agent type + terminal.
   - If no spoke exists for your session yet, create one by copying `agent/state/_template.md`.
2. **READ your own spoke** first — it holds your full history (current + 2 previous cycles).
   Recover cycle #, role, and in-flight work. NEVER ask CZ for status you can read here.
3. **WRITE ONLY your own spoke** at cycle end — overwrite it completely (never append),
   bump the cycle number, demote the old CURRENT CYCLE into HISTORY (keep 3 cycles max),
   refresh `**ROLE:**` / `**STATUS:**` / `**UPDATED:**` and IN FLIGHT / NEXT ACTION.
   Keep the `<!-- SESSION: -->` and `## CURRENT CYCLE (n)` lines intact — the Hub parser needs them.
4. **NEVER touch another session's spoke.** No two agents write the same file — this is how
   context stays uncluttered because your spoke is the ONLY state file in your prompt (the hub is small).
5. **CROSS-AGENT awareness:** the ACTIVE SESSIONS table (this file) is the lightweight view
   of what every session is doing right now. Read another agent's spoke only when you need
   details (each spoke ≈ 300 tokens — read on demand, not by default).
6. **FORMAT:** Follow `agent/state/_template.md` exactly.
```

---

## A4. `agent/state/_template.md` — the Spoke Template (verbatim)

```markdown
<!-- AGENT STATE TEMPLATE — Copy this to create your spoke file -->
<!-- Replace ALL {braces} with actual values before writing -->
<!-- SESSION: {SESSION_ID} -->
<!-- AGENT: {AGENT_TYPE} | TERMINAL: {TERMINAL_ID} | PROJECT: {PROJECT_PATH} -->

# Agent State — {SESSION_ID}

> **STATUS:** {working|idle|error|completed} | **UPDATED:** {ISO_TIMESTAMP}

---

## CURRENT CYCLE ({CYCLE_NUMBER})
**ROLE:** {what you are doing this cycle}
**STATUS:** {working|idle|error|completed}
**IN FLIGHT:**
- {active task 1}
- {active task 2}
**COMPLETED:**
- {task completed this cycle}
**NEXT ACTION:** {what happens next}
**NOTES:** {optional freeform context}

---

## HISTORY (previous 2 cycles, oldest first)

### Cycle {N-1} — {TIMESTAMP}
**ROLE:** {role}
**STATUS:** {status}
**IN FLIGHT:**
- {task}
**COMPLETED:**
- {task}
**NEXT ACTION:** {next}

### Cycle {N-2} — {TIMESTAMP}
**ROLE:** {role}
**STATUS:** {status}
**IN FLIGHT:**
- {task}
**COMPLETED:**
- {task}
**NEXT ACTION:** {next}
```

---

## A5. `agent/MEMORY.md` — Durable Memory (verbatim, key entries)

> The anti-amnesia store. Each entry = one durable lesson. Shows the kind of knowledge the framework must capture.

```markdown
- [2026-08-05] Canvas group display invariant (user requirement): grouping cards MUST preserve the actual card content/rendering — it only combines cards into a resized group container. NEVER replace card bodies with previews. ...
- [2026-08-05] Canvas scatter root cause (AiPage): dedup refs ... reset on remount ... FIX INVARIANT: any card spawned from a chat message MUST carry `data.msgId` ...
- [2026-08-04] Resume Builder persistence lives in TWO layers that must stay in sync: (1) zustand persist localStorage key `resume-builder-storage` ... (2) backend file `%APPDATA%/DeskFlow/resume-data.json` ...
- [2026-08-04] trackerAppMode ('track'|'show-other'|'pause', SettingsPage.tsx:73) semantics in main.ts `pollForeground()`: for the tracker app ... keep `currentApp`, reset `sessionStart = now` ...
- [2026-08-04] The browser-extension manifest had NO `action` key, so clicking the Comet toolbar icon showed nothing — MV3 popups require `action.default_popup`. ...
- [2026-08-04] RHEO has NO `requestSingleInstanceLock` ... `probe_open` LAUNCH mode still never brings up the debug endpoint on a second instance ... kill only the PID you spawned ...
- [2026-08-04] BorderBeam ... relies on `mask-composite: exclude`, which does NOT work in RHEO's Electron/Chromium build ... Do NOT place large BorderBeam overlays on content cards ...
- [2026-08-04] The RHEO repo has NO test runner configured: `vitest` is NOT in package.json ... Verification = build output + `tsc -p tsconfig.app.json` ...
- [2026-08-04] "Failed to fetch dynamically imported module" (stale-hash lazy chunk 404) fix: (1) prod server returns a CLEAN 404 ... (2) `Cache-Control: no-cache` ... (3) renderer self-heals via `autoHealDynamicImport()` ...
- [2026-08-02] Finance Subscriptions is NOT a standalone route anymore — it is a tab inside FinancePage ...
- [2026-08-02] Gold/Goals tab: goals feature is now a tab inside LifePage (?tab=gold) not a standalone /goals route ...
- [2026-08-06] Smart Gap Fill Drawer ... had ONLY ONE entry point: the amber gap banner ... Entry point restored: ExternalPage.tsx header now has a "Smart Fill" button ...
- [2026-08-06] BUILD GOTCHA: scripts/build.mjs pre-compiled only src/{services,domains,main} + gameDetection.ts — NEVER src/lib. Any main-process file importing `../lib/*` crashed at runtime ... Fix: `libFiles` added to allTsFiles in build.mjs Step 3. ...
- [2026-08-05] Gold page "The Vault" (GoldPage.tsx) now has FULL long-term goal CRUD ...
- [2026-08-05] Reorderable app sidebar: sidebar items array lives at App.tsx `DEFAULT_SIDEBAR_ITEMS` ... persisted order = localStorage `df-sidebar-order` ...
- [2026-08-04] Browser-tracking data-loss root cause: the EXTENSION self-gated on its own `isBrowserFocused` ... Fix: extension always sends with is_browser_focused as a hint only — the DESKTOP app is the authority ...
- [2026-08-04] Browser identity matching: when sending `/browser-identify`, send the UNION of all BROWSER_PROCESS_NAMES aliases ...
- [2026-08-02] NEVER claim "fully fixed" without a full-spec audit: every deliverable checked end-to-end ... Build-OK + unit-test-OK = "NOT LAUNCHED", never PASS. ...
- [2026-08-02] TUI agent interaction ... opencode session-ID = db-pid PRIMARY ...
- [2026-08-02] Sleep detection has THREE independent triggers in main.ts ...
- [2026-08-01] Build emits a HASHED entry (`dist/assets/index.<hash>.js`) — `dist/assets/index.js` missing is NORMAL ...
- [2026-08-01] After ANY renderer source change, the running RHEO app holds the OLD bundle in memory until restarted — verify by comparing RHEO process StartTime vs `dist/assets/index.js` LastWriteTime ...
- [2026-08-01] Finance Overview canonical layout: exactly ONE Net Flow card ... exactly ONE Receivables/FollowThrough-person card ...
- [2026-07-31] TUI agent interaction is FAKE: `buildAgentInputPayload` (main.ts:10464) just wraps text in `\x1b[200~...\x1b[201~\r` (Bracketed Paste) ...
- [2026-07-31] Terminal spawn has TWO paths: `spawnTerminal` (TerminalPage.tsx:1172) → IPC `spawn-terminal`, and xterm `onTerminalReady` → `handleTerminalReady` (TerminalWindow.tsx:726). The `terminal:mark-spawned` CustomEvent dispatches BEFORE the `await` ...
- [2026-07-05] Conductor is a WORKSPACE feature, not a standalone page. It lives in the workspace sidebar (Work group → Swarm subtab) ...
- [2026-07-27] Workspace Infrastructure: System Prompt is 8-layer: default → general → agent-specific → project-specific → init content → thought process → auto-context → config directives. All assembled in `initializeTerminal()` in TerminalPage.tsx. Context auto-injection: `assemble-context` IPC with 2000 token budget. Workspace overlay z-index: z-[200] ...
- [2026-07-27] UI Revamp Components: WorkspaceCommandBar, WorkspaceGroupRail, PresetsTab, ConfigsTab, Switch component, WorkspaceCard, SubTabBar, WorkspaceShell ...
- [2026-07-27] MCP Component Inventory: shadcn (12 installed), Magic UI (7), Lucide 1500+ ...
- [2026-07-27] Design Preset System: `src/lib/designPresets.ts` — 8 presets ...
- [2026-07-30] Dashboard MCP Card Improvements: MagicCard ... BorderBeam color mapping ... Particles behind charts ... Marquee conflicts ...
- [2026-07-30] StopwatchTimer Glow Fix: BorderBeam alone too subtle ... box-shadow glow ...
- [2026-07-30] MagicCard Component Fix: gradientFrom/gradientTo props ...
- [2026-07-30] TerminalPage BarChart3 Crash: missing lucide import → whole TerminalPage crashed ...
- [2026-07-30] Lock Screen Tracking Fix: `lockapp`, `winlogon`, `credentialui`, `logonui` added to TRANSIENT_APPS ...
- [2026-08-01] Activity sub-tab pages return bare fragments in embedded mode ...
- [2026-08-01] Finance privacy-mask canonical pattern: `useNumberMask()` ...
- [2026-08-01] AnimatedGradientText INERT unless Tailwind v4 has `--animate-gradient` in `@theme` ...
- [2026-08-01] dot-pattern.tsx hardcoded `id="dot-pattern"` → now uses `useId()` ...
- [2026-08-01] Page-accent gradient language: Stats cyan→indigo, Browser sky→violet, Productivity emerald→cyan ...
- [2026-08-04] Old multi-segment gap-assignment UX ... now the canonical GapFillModal in src/components/external/GapFillModal.tsx ...
- [2026-08-04] grid.ts squarifyTreemap INVARIANT: a treemap row item's width must be area/rowThickness ...
- [2026-08-04] Gap semantics SOURCE OF TRUTH = main.ts IPC 'detect-usage-gaps' ...
- [2026-08-05] Canvas drag/interaction invariant (CanvasCard/CanvasGrid): EVERY pointer interaction must have onPointerCancel + window pointerup/pointercancel/blur + unmount fallback ...
- [2026-08-06] Back-and-forth collaboration deliverables belong in agent/docs/backandfourth-docs/<idea-folder>/ (corrected by user; do NOT put them in the skill folder or the docs root)
```

---

## A6. `agent/skills/SKILL_DSL_GUIDE.md` — the Skill Authoring DSL (verbatim)

> The schema that makes skills declarative and UI-driven: YAML frontmatter inputs/outputs → app renders dynamic forms.

```yaml
# Skill DSL — YAML frontmatter language for skills
# Full guide at agent/skills/SKILL_DSL_GUIDE.md

# Core structure:
---
id: <skill-id>
name: <display name>
category: <design|development|research|maintenance|...>
applicable_to: [...]
version: x.y.z
created: YYYY-MM-DD
tags: [...]
inputs:          # rendered as dynamic form controls
  - name: <label>
    type: text|textarea|enum|boolean|number|file|code|markdown|list|multienum
    widget: select|radio|switch|slider|text|textarea|code|file|checkbox|tags  # optional override
    choices: [...]            # for enum/multienum
    default: <value>
    required: true|false
    placeholder: ...
    group: <visual group>
    min/max/step: ...         # for number
    validation: <regex>
    source: user|system|agent
outputs:
  - name: <label>
    type: text|markdown|list
    preview: true|false
components:
  - name: ...
    description: ...
    source: system|agent
---
```

Type→widget auto-mapping: enum→select, multienum→tags, boolean→switch, number(min/max)→slider, text→text, textarea→textarea, code→code, file→file, markdown→textarea, list→tags.

---

## A7. `agent/skills/maintain-context/SKILL.md` — Context Maintenance (verbatim, condensed core)

> Dynamic severity assessment (1–5) decides what to update — the framework's "how context stays fresh" mechanism.

```markdown
# Maintain-Context — Post-Task Knowledge Sync Skill

Keep graphify, agent markdown, and Obsidian vault in sync after every code change. This skill is **dynamic** — it assesses the scale of changes and only runs the updates that are warranted.

## Quick Reference
| Command | Action |
|---------|--------|
| `/maintain-context` | Assess changes, run appropriate updates |
| `/maintain-context --full` | Force all updates |
| `/maintain-context --graph-only` | Rebuild graph only |
| `/maintain-context --md-only` | Update markdown only |
| `/maintain-context --validate` | Validate GRAPH_REPORT.md |

## STEP 1: Assess Change Severity (1–5)
1 — Trivial (one-line fix) · 2 — Minor (single function) · 3 — Moderate (new feature/IPC/page) · 4 — Significant (architecture/module) · 5 — Major (framework migration/restructure)

Decision order: structure changed? → new feature/multi-file? → multi-function bug fix? → single file? → one-liner?

Also classify: bug-fix | new-feature | architecture | refactor | config | debugging-pattern
Special flags: IPC/DB schema changed → data.md; bug → PROBLEMS.md; new insight → debugging.md

## STEP 2: Execute Based on Scale
- Scale 1: state.md one-liner only
- Scale 2: state.md standard entry + graphify rebuild IF code files changed
- Scale 3: full state entry + graphify rebuild + PROBLEMS/debugging/data as flagged + vault sync + build verify
- Scale 4: full entry with architecture notes + graphify (--update if new docs) + all above
- Scale 5: full entry + version bump + graphify full pipeline + AGENTS.md review

Commands (Windows-safe, UTF-8):
python agent/skills/maintain-context/graphify_maintain.py rebuild|validate|sync|full

## STEP 3–7: graphify rebuild → validate GRAPH_REPORT.md → update agent markdown (state.md/PROBLEMS.md/debugging.md/data.md formats) → Obsidian vault sync → build verify

## Summary Decision Matrix
| Action | S1 | S2 | S3 | S4 | S5 |
| state.md | one-liner | standard | standard | full+arch | full+bump |
| graphify | ❌ | if code | ✅ | ✅ | ✅ |
| PROBLEMS.md | ❌ | if bug | if bug | if bug | if bug |
| data.md | ❌ | if IPC/DB | if IPC/DB | if IPC/DB | likely |
| build verify | ❌* | ✅ | ✅ | ✅ | ✅ |

Rules: do not over-update (typo ≠ graphify rebuild). Only the USER marks problems Fixed.
```

---

## A8. `agent/skills/backandfourth-skill/SKILL.md` — AI Collaboration Bridge (verbatim, condensed core)

> THE skill executing this conversation: the 3-party relay between Human (CZ), Project Owner (opencode), and Specialist (external AI).

```markdown
# AI Collaboration Bridge — From Idea to Implementation

## Core Philosophy
This is not a prompt. This is a conversation starter. Establishes a TWO-WAY communication channel between three parties.

## 3-Party Roles
| CZ (Human) | Relays messages verbatim between the two AIs. Does NOT edit AI messages. |
| Project Owner (opencode) | Knows the codebase. Gathers context. Answers REQUEST questions with CONTEXT responses containing actual source code. |
| Specialist (External AI) | No codebase access. Asks REQUEST questions. Produces RESULT.md. |

## Flow
1. CZ: "collaborate with [AI] on [thing]"
2. opencode writes INITIAL_PROMPT.md (ALL source code EMBEDDED — external AI has no file access)
3. CZ pastes → external AI chat
4. External AI responds with REQUEST questions
5. CZ pastes REQUEST → opencode
6. opencode answers with CONTEXT (actual source code)
7. Repeat until external AI produces RESULT.md
8. opencode implements

## Two-Case Validation Framework
- Case 1: Raw idea → agent scans codebase, builds Context Bundle from scratch, crafts Initial Prompt
- Case 2: Existing context → Context Gap Analysis, "delta context bundle" (only new/changed), continuation prompt

## Context Bundle Requirements (embed ALL of this inline)
1. Full TypeScript interfaces  2. Full function implementations with line numbers  3. End-to-end IPC wiring  4. DB access patterns  5. Result/error wrapper types  6. Current UI component source  7. Design tokens  8. AI/provider call chain  9. Database schema  10. State management

## REQUEST/CONTEXT protocol
REQUEST: <specific file, schema, or clarification>
CONTEXT: <file path> + actual source code

## Specialist rules: start with questions; ask one thing at a time; flag backend gaps; produce RESULT.md when converged.
## Project Owner rules: embed ALL source in INITIAL_PROMPT; fetch exactly what was requested; say so if a file doesn't exist; track rounds in conversation/round-XX.md.
## CZ rules: copy-paste verbatim; never edit AI messages.

## Stop conditions
Specialist says "enough context" · 3 context requests answered · 5 rounds without new questions · user says "produce the result"

## Anti-patterns
Don't send file paths without code · don't let Specialist hallucinate APIs · don't skip gap analysis · don't produce RESULT in Round 1 · don't lose conversation state · don't let CZ edit messages · don't assume Specialist remembers context

## Output Artifacts (per skill spec)
agent/docs/backandfourth-docs/<idea-slug>/
├── CONTEXT_BUNDLE.md          # Gathered codebase context
├── INITIAL_PROMPT.md          # First message to Specialist
├── CONVERSATION_PROTOCOL.md   # Rules of engagement
├── CONTEXT_GAPS.md            # Gap analysis table
├── conversation/round-01.md   # Specialist questions + Owner responses
└── RESULT.md                  # Final converged specification
```

---

## A9. `agent/skills/skill-router/SKILL.md` — the Dispatcher (verbatim, condensed core)

> Decision tree → mandatory/recommended skill mapping → load order. The framework's "never forget a skill" mechanism.

```markdown
# Skill Router — Universal Skill Dispatcher v1.0.0

## How to use
1. Identify task category from the Decision Tree
2. Read the scenario-to-skill mapping (MANDATORY + RECOMMENDED)
3. Load MANDATORY skills in the specified order
4. Load RECOMMENDED if scope warrants
5. Never skip a MANDATORY skill "because it doesn't apply"

## Decision Tree (categories)
fix problems → FIX PROBLEMS (fix-problems, humancentred-UIUX, [max-security], [recursive-playwright])
UI/design work → DESIGN (frontend-external-infra, humancentred-UIUX, frontend-design, [impeccable, motion-alive, taste-skill, ui-ux-pro-max, google-stitch])
commit/stage/push → COMMIT (commit, [maintain-context])
code review/security → SECURITY REVIEW (max-security, [humancentred-UIUX], [agent-reflect])
research → RESEARCH (deep-research, [deep-research-prompt], [maintain-context])
testing/verify → TESTING (probe-mcp-testing, [recursive-playwright])
create a prompt → PROMPT GENERATION (generate-prompt, [generate-problem], humancentred-UIUX)
terminal/PTY failures → TERMINAL DEBUG (terminal-agent)
app detection → APP DETECTION DEBUG (app-detection)
README/docs → DOCUMENTATION (readme-generator, [maintain-context])
after code changes → CONTEXT MAINTENANCE (maintain-context — ALWAYS LAST)
tutorial → TUTORIAL (tutorial-author, [add-tutorial])
license → LICENSE (license-generator)
sqlite failures → SQLITE MIGRATION (sqlite-js-migration)
user correction/reflection → AGENT REFLECT (agent-reflect)
everything else → GENERAL DEVELOPMENT (recommended: humancentred-UIUX, max-security, maintain-context)

## Load Ordering Rules
1. MANDATORY in specified order first
2. RECOMMENDED after, in order listed
3. maintain-context is ALWAYS last
4. humancentred-UIUX almost NEVER optional
5. max-security loads after design skills
6. Overlapping categories → load MANDATORY from EACH

## Anti-patterns
Start coding UI without design skills · fix bugs without fix-problems · commit without commit · ship without max-security · write prompts without generate-prompt · test UI with only IPC probes · skip maintain-context · ignore corrections without agent-reflect · load ALL skills at once · assume one skill is enough for UI
```

---

## A10. `agent/dictionary.md` — Terminology Resolution Protocol (verbatim, condensed core)

> The concept: before an agent touches anything that "names a place", it must resolve the noun against a dictionary. Framework asset.

```markdown
# dictionary.md — Terminology & location resolution

> PURPOSE: resolve ambiguous words to an EXACT place in the app before acting.
> Rule: before you create/move/modify anything that lives "somewhere", look the noun up HERE first. If it's not here, ASK — do not guess.

## High-confusion terms (examples)
- "workspace" = Terminal Workspace at route /terminal + internal 5-group subtabs (Setup/Work/Insights/Studio/Context) — NOT the app router sidebar
- "saved workspace" = row in workspace_state table (IPC workspace:save/list/load/delete), surfaced under Work → Workspaces
- "sidebar" = AMBIGUOUS — disambiguate workspace-sidebar vs app-sidebar before touching either
- "page" vs "subpage" = app route vs workspace subtab (terminal_sessions.subpage)
- "Follow Through" = on_behalf_of=1 transactions; amber Handshake icon
- "subscriptions page" = dedicated route /subscriptions, NOT the SubscriptionsTab inside /finance

## App page map (route → page → notable sub-areas)
| dashboard/orbit | / | DashboardPage | 3D orbit, heatmap, weekly overview, timer |
| stats | /stats | StatsPage | app table, charts, session list |
| productivity | /productivity | ProductivityPage | score, focus sessions, trends |
| browser/websites | /browser | BrowserActivityPage | domain groups, top sites |
| IDE projects | /ide | IDEProjectsPage | project grid, AI Tools subpage |
| terminal/workspace | /terminal | TerminalPage | 5-group sidebar, panes, sessions, map |
| external/sleep | /external | ExternalPage | activity grid, sleep, comparison |
| reports/insights | /reports | InsightsPage | Day/Weekly/Activities tabs |
| database | /database | DatabasePage | analytics + table browser |
| settings | /settings | SettingsPage | Category, Colors, General, Tracking, Prompts |

## Terminal Workspace 5-group sub-navigation
| Setup (orange) | Presets (setup/presets), Configs (setup/configs) |
| Work (green) | Sessions (work/sessions), Map (work/map), Files (work/files), Workspaces (work/workspaces) |
| Insights (purple) | Analytics (insights/analytics), Issues (insights/issues), Bugs (insights/bugs) |
| Studio (indigo) | Skills (studio/skills), Design (studio/design) |
| Context (amber) | Context (context/context), Maintenance (context/maintenance), Page Context (context/page) |

## IPC Endpoints (sample)
| browserWithExtension | Gets/Sets tracking browser from Settings |
| timerBehavior | Gets/Sets timer behavior (neutralAction, distractingAction) |
| onForegroundChange | Event: active window changed |
| addLog | Saves app/website session to database |
| context-changed | Event: problems/requests/checklists created or updated |
| link-problem-to-request / unlink-problem-from-request | Bidirectional problem↔request linking |
| terminal:write-raw | Writes raw data to terminal PTY (context deltas) |
| workspace:save/list/load/delete | Saved workspace snapshots |
```

---

## A11. `agent/problems.json` + `agent/requests.json` — Structured Tracking (structure sample, verbatim)

```json
// problems.json — one record:
{
  "id": "094",
  "title": "Category Dropdown Doesn't Navigate to Solar System",
  "status": "Fixed",
  "priority": "medium",
  "category": "other",
  "terminal_id": null,
  "session_id": null,
  "session_name": null,
  "skill_used": null,
  "user_notes": "\"The dropdown of selecting a category in the application doesn't work...\"",
  "fix_description": "Added `viewMode = 'solarSystem'` and `animateCamera` to zoom toward the category's sun",
  "files": ["src/components/OrbitSystem.tsx"],
  "checks": [],
  "created_at": "2026-05-12T00:00:00.000Z",
  "updated_at": "2026-05-12T00:00:00.000Z"
}

// Status machine: NEW → Not Started → In Progress → AI Attempted Fix → User Testing → Fixed (+ Won't Fix)

// requests.json — one record:
{
  "id": "001",
  "title": "External Activity Dashboard Integration",
  "description": "Dashboard should sync with external activity - show active external activity on the stopwatch...",
  "status": "Completed",
  "priority": "High",
  "category": "Feature",
  "linked_problems": [],
  "session_id": null,
  "session_name": null,
  "checks": [],
  "created_at": "2026-08-02T12:56:01.899Z",
  "updated_at": "2026-08-02T12:56:01.899Z"
}

// Status machine: Pending → In Progress → Completed (+ Cancelled)

// actions.json queue (watched + cleared by main process):
// { "terminal_id": "...", "actions": [ { "type": "create_problem" | "update_problem" | "complete_checklist" | "update_request", ... } ] }
// Structured output blocks in agent replies produce the same directives:
// ## Actions
// - [create-problem] Title - priority: high - category: bug-fix - description: ...
// - [update-problem] 094 - status: In Progress
// - [complete-checklist] checkId
```

---

# PART B — INVENTORY (fetch verbatim on REQUEST)

## B1. Remaining skills (31 more in `agent/skills/`, fetch any on REQUEST)

| Skill | Category | One-line |
|---|---|---|
| add-tutorial | tutorial | Build the full tutorial system (hook, overlay, page, badges) |
| agent-forge | meta | Agent definition authoring |
| agent-reflect | maintenance | User-correction → durable encoding; reflection logs |
| app-detection | debugging | 5-layer foreground-app resolution pipeline |
| beautiful-charts | design | Chart aesthetics |
| commit | process | Pre-commit workflow, exhaustive messages, COMMITS.md |
| context-handoff | communication | Context handoff between sessions |
| deep-research | research | Structured 5-phase research workflow |
| deep-research-prompt | research | Delegate research to external CLI agent |
| design-taste | design | Design direction/variance |
| fix-problems | process | Autonomous recursive bug fixing with user confirmation gates |
| frontend-design | design | DeskFlow design system (colors, spacing, typography, patterns) |
| frontend-external-infra | design | MCP component inventory: shadcn/Magic UI/Lucide/21st.dev + anti-slop checklist + re-skin rules |
| generate-prompt | communication | High-fidelity prompt generation (verbatim user words, CONTEXT_BUNDLE, RESULT rules) |
| generate-problem | communication | Problem report format for external AI |
| google-stitch | design | Stitch mockup / vibe design |
| humancentred-UIUX | design | 6 pillars: all 4 states, feedback, hierarchy, human copy |
| impeccable | design | Detailed styling, CSS, typography |
| layout-deck-fix | domain | App-specific layout fix |
| license-generator | process | License selection + SPDX + official templates |
| max-security | security | 4-step review: surface → OWASP → performance → logic |
| motion-alive | design | Micro-interactions/transitions, Liveliness Levels |
| probe-mcp-testing | testing | Probe MCP capabilities + gaps reference |
| readme-generator | documentation | 7-step README workflow with badges/diagrams |
| recursive-playwright | testing | Autonomous test → fail → fix → retest loop |
| research-digest-overhaul | domain | App-specific research digest |
| resume-builder | domain | App-specific resume builder |
| signature-design | design | Signature design elements |
| sqlite-js-migration | debugging | sql.js fallback when native modules fail |
| taste-skill | design | Taste/variance guidance |
| tutorial-author | tutorial | 3-5 brief tutorial steps |
| ui-ux-pro-max | design | Industry styles/palettes |

## B2. Workspace feature (Electron app) — fetch handlers on REQUEST

| Path | What it is |
|---|---|
| `src/pages/TerminalPage.tsx` (~5000 lines) | Whole /terminal workspace: 5-group sidebar, subtabs, session create/resume, context deltas, bidirectional linking, 8-layer prompt assembly in `initializeTerminal()` |
| `src/main.ts` (~22000 lines) | Electron main: all IPC handlers; `workspace:save` at line ~13191; `detect-usage-gaps` at ~18870; agent phases at ~11457; PTY spawn; stateCoordinator wiring |
| `src/main/stateCoordinator.ts` | Hub generator (regenerates agent/state.md from spokes) |
| `src/main/agentOutput.ts`, `src/main/syncAgent.ts`, `src/main/terminalRelay.ts`, `src/main/authStore.ts`, `src/main/notifications.ts` | Main-process modules |
| `src/preload.ts` | Preload bridge: ~650 lines; `workspace:save` at line 650; all API surface (`window.deskflowAPI`) |
| `workspace_state` table | Workspace snapshots: layout + terminal_tabs + sidebar_width + active_tab + configs |
| `terminal_sessions` table | Session model: topic, agent, status, category, cost, tokens, resume_id, subpage |
| `src/lib/designPresets.ts` | 8 design presets (Cyberpunk, Minimal, Glass, Brutalist, Warm, Terminal, Ocean, Neon) |
| `src/lib/defaults.ts` | getDefaultAgent/setDefaultAgent + DEFAULT_SYSTEM_PROMPT |
| `src/lib/mojibake.ts`, `src/lib/uuid.ts` | Support libs (build-gotcha: main-process imports of lib/ must be compiled) |
| Workspace components | WorkspaceCommandBar, WorkspaceGroupRail, SubTabBar, WorkspaceCard, PresetsTab, ConfigsTab, NewSessionDialog, BasicMarkdownViewer |

## B3. Terminal CLI features

| Concept | What it is |
|---|---|
| PTY lifecycle | Sacred event order: mark-spawned → spawn → created → initialize; double-spawn dedupe via CustomEvent before await |
| Agent phases | launching→ready→busy→attention→error (main.ts:11457-11479); parseAgentOutput (main.ts:10645) |
| Context deltas | `[Context] New problem: X (ID: 123)` via terminalWriteRaw with \r |
| Fortress protocol | electron:execute-command — real stdout/stderr |
| TUI interaction | Bracketed-paste wrapping (`\x1b[200~`), prompt detection regex, session-id capture |

## B4. Knowledge systems

| System | Location | Notes |
|---|---|---|
| Graphify | `graphify-out/graph.json`; global skill at `~/.config/opencode/skills/graphify/` | knowledge graph → communities → HTML/JSON/audit |
| LLM Wiki | all `agent/*.md` | |
| Obsidian Skills | `agent/skills/<name>/SKILL.md` | YAML frontmatter, SkillsService |
| PARA | `CZVault/` (00_Projects, 01_Areas, 02_Resources, 03_Archives) | ⚠️ not verified this session |
| QMD | `agent/templates/session.qmd`, `problem.qmd` | |
| Automations | `agent/automations/automations.json` | declarative only — no engine yet |

## B5. Scripts

| Path | What it is |
|---|---|
| `scripts/build.mjs` | Full build pipeline (renderer→preload→services→main) incl. src/lib compile list |
| `scripts/rebuild-main.mjs`, `scripts/compile-main.mjs`, `scripts/compile-services.mjs`, `scripts/copy-cjs.cjs`, `scripts/write-lazy-main.cjs`, `scripts/verify-parser.mjs`, `scripts/check-default-prompt.mjs`, `scripts/mcp-launcher.mjs`, `scripts/build-main.cjs` | Build utilities |
| `scripts/zip-src.mjs` | Source-zipping for Architect relay (src/ + scripts/ + agent/) |

## B6. Other agent docs

| Path | What it is |
|---|---|
| `agent/data.md` | IPC endpoints + DB schema map |
| `agent/FEATURE_TRACKER.md` | Feature registry ("which page has feature X?") |
| `agent/PROBLEMS.md`, `agent/REQUESTS.md` | Human-readable mirrors of the JSON stores |
| `agent/ACTIONS_SCHEMA.md` | Structured-output action schema |
| `agent/context.md`, `agent/patterns.md`, `agent/glossary.md`, `agent/debugging.md`, `agent/constraints.md` | Knowledge docs |
| `agent/automations/` | Declarative automations |
| `agent/templates/*.qmd` | QMD templates (session.qmd, problem.qmd) |
| `opencode.json` | Agent config: instructions list (force-loaded files), MCP servers |

---

# Part B fetch protocol
On `REQUEST: <path>`, Project Owner pastes the file verbatim with `CONTEXT:` header and records the round in `conversation/round-XX.md`.
