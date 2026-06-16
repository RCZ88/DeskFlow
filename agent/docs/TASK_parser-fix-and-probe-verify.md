# TASK \u2014 Fix DeskFlow AI-Agent Parsers, then Verify Everything with Probe

> **How to use this file.** Attach / `@`-tag this file to your AI coding agent (the one with
> access to the DeskFlow repo **and** the `probe` MCP server) and say: *"Execute this task
> end to end."* The agent should perform the edits itself \u2014 the human is **not** copy-pasting
> code. Work the phases **in order** and do not skip the verification phase.

---

## 0 \u2014 Mission

DeskFlow's AI-Agent sync system has 8 registered parser plugins. Only 3 (OpenCode, Gemini CLI,
Codex CLI) detect and parse data. The other 5 (Claude Code, Qwen CLI, KiloCode, Cursor AI,
Aider) show nothing despite on-disk data, and GitHub Copilot has no parser at all.

You will: **(A)** diagnose and fix every parser against the *actual* on-disk data, **(B)** make
DeskFlow observable by the Probe MCP, and **(C)** run a Probe verification pass that exercises
every action, captures every error (renderer + Electron main + IPC), and reports what works and
what doesn't. Finish with a single structured report.

### Operating rules (apply to all phases)
- **Edit the code directly** in the repo. Do not dump full files into chat; summarize each
  change as a short diff (file + line range + before/after snippet).
- **One parser at a time.** Fix \u2192 verify with Probe \u2192 only then move to the next. Never batch
  all fixes and test once at the end.
- **Do not break the working parsers** (OpenCode, Codex, Gemini). They are your regression baseline.
- **Ground every claim in evidence** \u2014 a file path, a console line, a Probe verdict, or a data
  sample. If a tool genuinely has no data on this machine, say so explicitly; do not invent fixes.
- **Be honest about uncertainty.** Where this file uses `TODO:` you must discover the real value
  from the repo (selector, IPC channel name, env flag, binary path) rather than guessing.

---

## A \u2014 Parser fix (engineering)

### A.0 Read ground truth first
1. Read `agent/docs/ai-parsers-training/CONTEXT_BUNDLE.md` **completely**. It contains, per
   plugin: the exact parser code (with `src/main.ts` line numbers), the real on-disk data
   format (JSONL structures, SQLite schemas, directory layouts), the sync pipeline
   (`detect \u2192 parseDir \u2192 parse \u2192 save`), and the cache-invalidation logic.
2. Open `src/main.ts` and locate each plugin's `detect()`, `parseDir()`, and `parse()`.
3. **Cache trap (check this before anything else):** `getDirDataSignature()` caches results.
   If a parser's *first* run found 0 files (because detection was broken), that empty state is
   cached and the plugin is skipped on every later run \u2014 so even a correct fix looks like it
   "still shows nothing." Before re-testing any parser, **invalidate / delete its cached
   signature** (find the cache store \u2014 `TODO:` confirm location \u2014 and clear the relevant key,
   or add a `--reset-cache` / env switch for test runs).

### A.1 For each parser, trace the pipeline
For **Claude Code, Qwen CLI, KiloCode, Cursor AI, Aider** (and assess **Gemini** as a baseline,
and the **missing Copilot** plugin), determine:
1. **detect()** \u2014 does the expected dir/file exist at the expected path? If not, what is the
   correct path? Is the cache masking a fixed detection?
2. **parseDir()** \u2014 does the walker find the right files, recurse subdirectories, and include
   the correct `RELEVANT_EXTS`?
3. **parse()** \u2014 what structure does the parser expect vs. what the data actually has? Pinpoint
   the mismatch (field name / nesting level / type check).
4. **Token extraction** \u2014 where do token counts actually live, and is the parser reading that
   exact path/field?
5. **Session grouping & model extraction** \u2014 how should lines group into sessions, and where
   does the model name actually live?

### A.2 Apply the fix (per parser), respecting these constraints
1. SQLite plugins must use `better-sqlite3`.
2. Handle locked files gracefully (e.g. KiloCode `EACCES`) \u2014 skip + log, never crash the run.
3. Do not break OpenCode / Codex / Gemini.
4. Handle zero-token entries (Claude Code synthetic model) \u2014 treat as valid, not as "no data."
5. Never emit `NaN` / `Infinity` for token counts (guard divisions and `Number()` parses).
6. Use the existing `PARSED_SESSION` interface \u2014 add no new fields.
7. Yield every 10 files to keep the UI responsive.
8. Tolerate encoding quirks: UTF-8 BOM, mixed line endings, partial/corrupt trailing JSONL lines.

### A.3 Record each fix in the report (format)
For every parser, produce a block:
```
## Parser: <name>
### Current Status
- detect(): \u2705/\u274c \u2014 <why>
- parseDir(): \u2705/\u274c \u2014 <why>
- parse(): \u2705/\u274c \u2014 <why>
### Root Cause
<2-3 sentences: the exact mismatch>
### Actual Data Format
<json sample from disk>
### Parser Expectation
<json the code expected>
### Fix
- File: src/main.ts, lines X-Y
- Change: <description>
- Before: <snippet>
- After: <snippet>
- Edge cases: <missing/null/zero handling>
### Probe verdict (filled in Phase C)
- <pass/fail evidence from the verification run>
```
If a tool is simply not installed / has no data here, state that plainly and skip the fix.

---

## B \u2014 Make DeskFlow observable by Probe

Probe tests through the Chrome DevTools Protocol (real DOM, console, IPC, Electron main) \u2014 not
screenshots. To let it verify *internal* truth (per-plugin session counts, token totals, parse
errors) without scraping the UI, add lightweight, **test-only** expectation checkpoints.

### B.1 Confirm the Probe MCP is available
- List the agent's tools; confirm Probe's tools are present (`open`, `snapshot`, `assert_text`,
  `assert_ipc`, `assert_expect`, `report`, etc.). If absent, set it up per the project's
  `probe/README.md` (build `dist/index.js`, register the stdio MCP server, restart the client).

### B.2 Add expectation checkpoints (guarded behind a test flag)
In the renderer, after a sync completes, publish internal results so Probe can assert on them.
Guard with an env/flag (e.g. `process.env.PROBE_TEST === '1'`) so production is untouched:
```js
// after the sync pipeline resolves, when window.__probe exists and test mode is on:
if (window.__probe && /* test mode */ true) {
  for (const r of perPluginResults) {
    window.__probe.expect(`sync.${r.plugin}.sessions`, r.sessionCount)
    window.__probe.expect(`sync.${r.plugin}.tokens`, r.tokenTotal)
    window.__probe.expect(`sync.${r.plugin}.errors`, r.errors.length)
  }
  window.__probe.expect('sync.totalSessions', totalSessions)
}
```
`TODO:` wire these to the real result objects from the sync pipeline. Keep the shape exactly
(`sync.<plugin>.sessions|tokens|errors`) so Phase C can assert on it generically.

### B.3 Make the app launchable + resettable for tests
- Confirm the Electron binary path and app entry args Probe will use (`TODO:` e.g. binary
  `./node_modules/.bin/electron`, `appArgs: ['.']`).
- Provide a deterministic way to **force a fresh sync ignoring cache** for a test run (env flag
  or hidden "Re-sync (ignore cache)" action). This is what defeats the Phase A.0 cache trap.
- Note the IPC channel name(s) the renderer uses to request a sync and to receive results
  (`TODO:` discover from the code, e.g. `agent:sync`, `agent:sync-result`).

---

## C \u2014 Verify with Probe (run this after each parser fix)

> Goal: exercise **every kind of action** and **observe its result** \u2014 not just "does it
> render." The pattern is always: **mark \u2192 act \u2192 observe (console + main + IPC + DOM) \u2192 assert.**

### C.1 Open the run
```
start_run([
  "app launches with no main-process errors",
  "AI Agent view renders",
  "each parser reports sessions > 0 (or is correctly marked no-data)",
  "sync IPC round-trips",
  "text box: sending a message produces the expected result",
  "no renderer or main console errors across the run"
])
open({ type: "electron", binary: "<TODO electron binary>", appArgs: ["."], inspectMain: true })
```
- `open` returns `{ ok, mainAttached }`. Require `mainAttached: true` (you need main-process
  visibility for IPC + main errors). If false, fix the launch before continuing.
- `mark()` immediately \u2192 keep `since` and `mainSince` so later assertions scope cleanly.

### C.2 Navigate to the AI Agent / sync view & map the UI
```
snapshot()                       // get @e# refs for buttons, lists, the message text box
```
- If the view isn't open, `click` the nav item (find its `@e#` ref from the snapshot), then
  `wait_for({ textPresent: "<TODO heading>" })`.

### C.3 Per-parser verification loop (the core)
For each parser plugin:
```
mark()                                                  // -> { since, mainSince }
// trigger a fresh, cache-ignoring sync (click the re-sync action or eval the test hook):
click({ ref: "<@e# of Re-sync>" })                      // or eval("window.__deskflow.resyncIgnoreCache()")
wait_for({ textPresent: "<TODO 'Sync complete' text>", timeoutMs: 20000 })

// 1) Internal truth via expectation checkpoints (preferred \u2014 no DOM scraping):
assert_expect({ name: "sync.<plugin>.sessions" })       // presence (>0 implied by next line)
read_expectations({ since })                            // inspect actual sessions/tokens/errors values
// If the parser SHOULD have data, assert it is non-zero:
//   read the value from read_expectations; fail the checklist item if sessions === 0.

// 2) DOM truth (what the user actually sees):
snapshot()                                              // confirm the plugin's row/count rendered
assert_text({ ref: "<@e# of plugin count>", expected: "<TODO non-zero indicator>", mode: "contains" })

// 3) Errors generated by THIS action only:
assert_no_console_errors({ since })                     // renderer
assert_main_no_errors({ since: mainSince })             // Electron main (parser runs here)
read_console({ since, level: "error", limit: 20 })      // capture details if the asserts failed
read_main_console({ since: mainSince, level: "error" }) // capture parser stack traces / EACCES

// 4) Wiring:
assert_ipc({ channel: "<TODO sync result channel>", withinMs: 20000 })
```
Record the verdicts into that parser's report block ("Probe verdict"). A fix is **only** done
when sessions > 0 in *both* the expectation checkpoint and the DOM, with zero new errors \u2014 or
when the tool is verified to have no data on this machine.

### C.4 Text box / "send a message" verification (examine the result of an action)
```
mark()
type({ ref: "<@e# of message text box>", text: "probe test message" })
click({ ref: "<@e# of send button>" })                  // or wait_for an auto-submit
wait_for({ textPresent: "probe test message", timeoutMs: 8000 })   // it appears in the thread
// examine the RESULT of sending, not just that it was typed:
snapshot()                                              // new message bubble / response present?
assert_visible({ ref: "<@e# of the resulting message/response>" })
assert_text({ ref: "<@e# of the latest message>", expected: "probe test message", mode: "contains" })
assert_no_console_errors({ since })
assert_main_no_errors({ since: mainSince })
assert_ipc({ channel: "<TODO message-send channel>", withinMs: 8000 })
```
Report: what was typed, what the UI did in response, any console/main/IPC activity, and whether
the observed result matched the expected result.

### C.5 Generalize: examine every kind of action
Apply the same **mark \u2192 act \u2192 observe \u2192 assert** pattern to each interactive surface you find in
the snapshot (buttons, toggles, filters, tabs, dropdowns, dialogs). For each action capture: the
DOM change (`snapshot` before/after), renderer console (`read_console`), main console
(`read_main_console`), IPC (`assert_ipc` on the relevant channel), and a pass/fail verdict.
Use `screenshot` **only** if a surface is canvas/WebGL with no DOM.

### C.6 Close & emit reports
```
report({ format: "junit", path: "probe-report.xml" })
report({ format: "json",  path: "probe-report.json" })
close()                                                 // returns the final run summary
```

---

## D \u2014 Final report back to the human (required output)

Return one markdown document containing:
1. **Per-parser blocks** from A.3, each with its filled-in **Probe verdict** from Phase C.
2. **What works / what doesn't** \u2014 a plain-language list, action by action (incl. the text-box
   result and every other action exercised in C.5).
3. **Every error seen**, grouped by source: renderer console, Electron main console, failed IPC
   assertions \u2014 with the captured message/stack and which action triggered it.
4. **The summary table** below, fully filled in.
5. Paths to `probe-report.xml` / `probe-report.json` and the final `close()` summary.
6. **Remaining risks / TODOs** you couldn't resolve (e.g. a tool with no data, an unconfirmed path).

### Summary table
| Plugin | detect() | Has Data? | Root Cause | Fix Complexity | Probe: sessions>0 | New errors? |
|--------|----------|-----------|------------|----------------|-------------------|-------------|
| Claude Code | | | | | | |
| Qwen CLI | | | | | | |
| KiloCode | | | | | | |
| Cursor AI | | | | | | |
| Aider | | | | | | |
| OpenCode (baseline) | | | | | | |
| Codex CLI (baseline) | | | | | | |
| Gemini CLI (baseline) | | | | | | |
| GitHub Copilot | N/A | | (no parser) | | | |

---

## Appendix \u2014 Probe tool quick reference (exact arguments)

**Lifecycle**
- `open({ type:"web"|"electron", binary, url?, appArgs?, inspectMain?, headless? })` \u2192 `{ ok, url, port, mainAttached }`
- `goto({ url })` \u00b7 `close({})` \u2192 final summary \u00b7 `start_run({ checklist:string[] })`

**Observe / inspect** (read-only)
- `snapshot({ max?, viewportOnly?, ref? })` \u2192 elements with stable `@e#` refs (role/name/testid/box)
- `query({ selector })` \u00b7 `mark({})` \u2192 `{ since, mainSince }`
- `read_console({ since?, level?, limit? })` \u00b7 `read_main_console({ since?, level?, limit? })` *(needs inspectMain)*
- `read_expectations({ since? })` \u00b7 `eval({ expression })` \u00b7 `eval_main({ expression })` *(escape hatches; use sparingly)*
- `screenshot({})` \u2014 **vision fallback only**

**Act**
- `click({ ref })` \u00b7 `type({ ref, text })` \u00b7 `set_viewport({ width, height, mobile? })`
- `wait_for({ selectorVisible? | textPresent? | refVisible?, timeoutMs? })` \u2192 `{ pass, timedOut }`

**Assert** (each returns `{ pass, ... }` and advances the checklist)
- `assert_visible({ ref })` \u00b7 `assert_text({ ref, expected, mode?:"contains"|"equals"|"regex" })`
- `assert_style({ ref, prop, expected })` \u00b7 `assert_layout({ ref, x?,y?,w?,h?, tol? })`
- `assert_contrast({ ref, min? })` \u00b7 `assert_responsive({ ref, breakpoints:[{w,h}], expect? })`
- `assert_no_console_errors({ since? })` \u00b7 `assert_main_no_errors({ since? })` *(needs inspectMain)*
- `assert_expect({ name, expected?, mode?:"equals"|"contains" })` \u2014 reads `window.__probe.expect(name, value)`
- `assert_ipc({ channel, withinMs? })` \u2014 renderer-outgoing + main-incoming for that channel

**Report**
- `report({ format?:"json"|"junit", path?, suiteName? })`

**In-app hook (add in DeskFlow, test mode only):** `window.__probe.expect(name, value)` records the
latest value for `name`; Probe reads it via `assert_expect` / `read_expectations`. Use it to expose
per-plugin session counts, token totals, and error counts.
