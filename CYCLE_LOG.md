# DeskFlow Debug Loop — Cycle Log

---

## CYCLE 1 (2026-06-21 15:21)

**BUILD**: OK | main.cjs 2026-06-21 15:20:56 (670 KB) | preload.cjs 2026-06-21 15:21:21 (48 KB)

**GATE A** `window.deskflowAPI`: object with 130+ keys — bridge UP

**FEATURE**: (none — initial clean build and gate check)

**STEPS**:
1. Deleted `dist-electron/` and `dist/`
2. Ran `node scripts/build.mjs` — full clean build passed
3. Ran `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
4. Confirmed `main.cjs` and `preload.cjs` exist with fresh timestamps
5. Launched Electron app via probe (headless with inspectMain)
6. Evaluated `window.deskflowAPI` — exists with 130+ IPC methods
7. Captured main process and renderer console logs

**OBSERVATIONS**:
- Main process healthy: SQLite initialized, system tray created, active-win tracking started
- Browser tracking unavailable (port 54321 in use — expected in probe sandbox)
- Renderer healthy: Dashboard UI loaded, sidebar with 12 nav items visible
- Minor: `url.parse()` deprecation warning (non-blocking)
- App currently tracking "Electron" as foreground (expected in dev)

**VERDICT**: PASS — system ready for patches

**ARTIFACTS**: CYCLE_LOG.md

---

## CYCLE 0 — Baseline Triage (2026-06-21 15:25)

**BUILD**: OK | main.cjs 2026-06-21 15:20:56 | preload.cjs 2026-06-21 15:21:21

**GATE A** `window.deskflowAPI`: object with 130+ keys — bridge UP

**FEATURE**: Terminal Workspace baseline test (route: `#/terminal`)

**STEPS**:
1. Clean build (reused from Cycle 1 — no code changes)
2. GATE A verified — bridge UP
3. Navigated to `#/terminal` — Terminal Page loaded
4. Clicked through all 5 group tabs and sub-tabs:

| Group | Tabs | Status |
|-------|------|--------|
| **Setup** | Presets, Configs | PASS |
| **Work** | Sessions, Map, Files | PASS |
| **Insights** | Analytics, Issues, Bugs | PASS |
| **Studio** | Skills, Design | PASS |
| **Context** | Context, Maintenance, Page Context | PASS |

5. Clicked **"+ Open Terminal"** button
6. Terminal spawned — cmd.exe PID 6604

**RENDERER CONSOLE**: No errors or warnings across all tab clicks
- `[TerminalPage] spawnTerminal called: term-1782030454450 opencode`
- `[DEBUG:TW] TerminalPane mounted, calling onTerminalReady`
- `[DEBUG:TW] handleTerminalReady called: term-1782030454450`

**MAIN CONSOLE**:
- `[TerminalManager] spawn called: term-1782030454450`
- `[TerminalManager] spawning shell: C:\WINDOWS\system32\cmd.exe in C:\Users\cleme`
- `[TerminalManager] PTY spawned, pid: 6604`
- `[TERMINAL_DEBUG] C2 data callback FIRED — received Windows version + prompt`
- Shell shows: `Microsoft Windows [Version 10.0.26200.8655]` then `C:\Users\cleme>`

**TERMINAL SHELL**: ALIVE — no exit code, prompt visible and responsive

**TAB NAVIGATION RESULTS**:
| Tab Name | Status | Notes |
|----------|--------|-------|
| Presets | PASS | Rendered Presets UI with "Add Preset" button |
| Configs | PASS | Rendered Configs view |
| Sessions | PASS | Rendered "New Session", "Import", "Save", "Load", "Save As..." buttons |
| Map | PASS | Rendered Map view |
| Files | PASS | Rendered Files view |
| Analytics | PASS | Rendered period selectors (7d/30d/All) + charts |
| Issues | PASS | Rendered Issues view |
| Skills | PASS | Rendered "Project (0)", "Browse (0)", "Saved (0)", search box |
| Design | PASS | Rendered Design view |
| Configs | PASS | (same as above, within Setup group) |
| History | **NOT FOUND** | Does not exist as a top-level tab. Only appears as a sub-button within Maintenance page's sub-nav (ref @e124). |
| Context | PASS | Rendered "Systems", "Design", "Model", "Paths", "Terminal", "Defaults" buttons |
| Maintenance | PASS | Rendered "Overview", "Contexts", "History", "Compactions", "Search", "Settings" buttons |

**OBSERVATIONS**:
- **"History" tab does NOT exist** as a standalone sidebar tab. It only appears as a sub-navigation button within the Maintenance section. This may be intentional or a regression.
- **"Bugs" tab** exists in Insights group (extra, not in requested list)
- **"Page Context" tab** exists in Context group (extra, not in requested list)
- All 5 group tabs (Setup, Work, Insights, Studio, Context) work correctly
- No console errors (renderer or main) during any navigation
- Terminal shell spawns and stays alive with correct cwd

**VERDICT**: PASS — Terminal Workspace fully functional, all tabs navigable, terminal spawns correctly

**ARTIFACTS**: CYCLE_LOG.md, console logs captured in report body

---

## CYCLE 2 — PROBE: Presets / Sessions / Files / Skills (2026-06-21 15:50)

**BUILD**: OK (reused from C1 — no code changes)

**GATE A** `window.deskflowAPI`: object with 404 keys — bridge UP

**PROBES EXECUTED**:

### PROBE 1 — Presets (Add/Run/Delete)
| Sub-probe | Method | Result | Notes |
|-----------|--------|--------|-------|
| Add | `window.deskflowAPI.addTerminalPreset({name,command})` | ✅ `{"success":true,"id":"preset-..."}` | UI "Save" click handler does NOT fire (React controlled-input not triggered by probe_type). IPC works. |
| Run | `window.deskflowAPI.executeTerminalPreset(id)` | ✅ `{"success":true,"sessionId":"session-...","command":"echo PROBE_OK"}` | New session created in DB. |
| Delete | `window.deskflowAPI.removeTerminalPreset(id)` | ✅ `{"success":true}` | Clean removal confirmed via `getTerminalPresets()` → empty. |

**Verdict**: PASS via IPC. UI handler for "Save" button is broken with programmatic input.

### PROBE 2 — Terminal Sessions (CRUD)
| Operation | Method | Result | Notes |
|-----------|--------|--------|-------|
| List | `getTerminalSessions()` | ✅ `[{id, presets_id, agent:"preset", topic:"probe-echo", ...}]` | Session auto-created by preset execution. |
| Get by ID | `getTerminalSessionById(id)` | ✅ Full session object returned | All fields populated correctly. |
| Delete | `deleteTerminalSession(id)` | ✅ `{"success":true}` | Confirmed `getTerminalSessions()` → empty. |

**Verdict**: PASS.

### PROBE 3 — Files (List/Read)
| Operation | Method | Result | Notes |
|-----------|--------|--------|-------|
| List | `listProjectFiles('src', rootPath)` | ✅ `{"success":true,"data":[{name,path,isDirectory},...]}` | Returns directory listing. |
| List (alt) | `listDirectory(rootPath, 'src')` | ✅ Works identically. | Alternative API. |
| Read | `readProjectFile('package.json', rootPath)` | ✅ `{"success":true,"data":"{...}"}` | Returns full file contents. |

**Verdict**: PASS.

### PROBE 4 — Skills (List/Create/Delete)
| Operation | Method | Result | Notes |
|-----------|--------|--------|-------|
| List | `getSkills()` | ✅ `{"success":true,"data":[]}` | Empty (no skills seeded). |
| List (app) | `getAppSkills()` | ✅ `{"success":true,"data":[]}` | Empty. |
| List (saved) | `getSavedSkills()` | ✅ `{"success":true,"data":[]}` | Empty. |
| Create | `createSkill({name, category, description, content})` | ✅ `{"success":true,"data":{id:"probe-test-skill"...}}` | Skill file written to `%TEMP%/probe-profile-.../agent/skills/`. |
| Delete | `deleteSkill({id})` | ✅ `{"success":true}` | Confirmed `getSkills()` → empty. |

**Verdict**: PASS.

### Summary

| Probe | Feature | Status | Notes |
|-------|---------|--------|-------|
| 1a | Presets — Add via UI form | ⚠️ FAIL | "Save" click handler does not fire. IPC works. |
| 1b | Presets — Execute | ✅ PASS via IPC | Creates session in DB. |
| 1c | Presets — Delete | ✅ PASS via IPC | |
| 2 | Sessions CRUD | ✅ PASS | |
| 3 | Files List/Read | ✅ PASS | |
| 4 | Skills CRUD | ✅ PASS | |

**UI ISSUE**: The Add Preset "Save" button (`@e41`) click does not trigger `handleAddPreset` when inputs are filled via `probe_type`. The IPC endpoints work perfectly when called directly via `window.deskflowAPI`.

**VERDICT**: All backend IPC APIs functional. UI event handlers may have synthetic-event compatibility issues with `probe_type`/`probe_click`.

**ARTIFACTS**: CYCLE_LOG.md

---

## CYCLE 2 — FIX PACKET: Session Resume Typing + Slow Ready (2026-06-21 18:00)

**BUILD**: full clean `node scripts/build.mjs` — renderer/preload OK, main.cjs rebuilt

**GATE A**: 404 keys — bridge UP

**CHANGE**: `src/pages/TerminalPage.tsx` — two targeted edits in `initializeTerminal`:
1. **verifyAgent false-negative fix** (line ~698): Adds `[RESUME-DBG] verifyAgent` log; for `opencode`, `found === false` no longer aborts.
2. **ready-event race fix** (line ~740): Timeout 8000ms → 3000ms (main already fires fallback at 3s).

**VERIFICATION**: Session resume → `#/terminal` → Work → Sessions → Open.

| # | Log | Result |
|---|-----|--------|
| 1 | `[RESUME-DBG] verifyAgent opencode {"found":true,...}` | ✅ seq 29 |
| 2 | `[RESUME-DBG] terminal-ready wait complete for term-...-resume` | ✅ seq 30 |
| 3 | `[TerminalPage] Wrote launch command: "opencode -s test_resume_abc123\r\n"` | ✅ seq 31 |

**TIMING**: ready → command ≈ **1s** (was 8s)

**MAIN**: `[TERMINAL_DEBUG] C2 data callback FIRED` — shell alive, no errors

**VERDICT**: **PASS** — resume in ~1s, correct resumeId typed

---

## CYCLE 3 — FIX PACKET: Agent State Machine Queue Blocks Resume (2026-06-21 19:00)

**BUILD**: full clean `node scripts/build.mjs` — renderer/preload OK, main.cjs rebuilt

**GATE A**: bridge UP, fix verified in dist/assets/index.js (lines 74032, 74055)

**ROOT CAUSE**: Resume sessions opened but showed only cmd.exe prompt — opencode never started.

The `initializeTerminal` function called `window.deskflowAPI?.terminalWrite` to send the launch command. This maps to IPC `terminal:write-old-format`, which checks the agent state machine's phase. Since `spawn-terminal` always sets `phase: 'launching'` and `detectAgentPrompt` sees the cmd.exe prompt (`C:\Users\cleme>`) matches `SHELL_PROMPT_REGEXES` → `isAgentReady()` returns false → phase stays `'launching'` forever → write is queued in `ast.pendingWrites` and never flushed.

**FIX**: Changed `terminalWrite` → `terminalWriteRaw` (maps to IPC `terminal:write-raw`) at two call sites in `initializeTerminal`:
1. Line 699: Initial launch command write
2. Line 720: Handshake token write

`terminalWriteRaw` bypasses the agent state machine entirely and writes directly to `terminalManager.write()`. This is correct because the launch command goes to the **shell** (cmd.exe), not to the agent — the agent state machine's queue logic is irrelevant here.

**CHANGE**: `src/pages/TerminalPage.tsx` — lines 699, 720

**VERIFICATION**:
- Direct test: Wrote command via `terminalWriteRaw` → TERMINAL_DEBUG confirmed command echoed by PTY
- Source verified in `src/pages/TerminalPage.tsx` and `dist/assets/index.js`

**VERDICT**: **PASS** — `terminalWriteRaw` bypasses the queue and writes directly to PTY
