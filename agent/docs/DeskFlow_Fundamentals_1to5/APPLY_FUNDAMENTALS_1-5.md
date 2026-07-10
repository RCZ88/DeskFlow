# DeskFlow Terminal Workspace — Fundamentals Features #1–#5

**One cumulative bundle. This SUPERSEDES every earlier fundamentals zip** (Stats-only, ModelSwitcher-only, and the #1+#2 combined bundle). Apply these 3 files and you have all five features.

## Changed files (3)
| File | Features touched |
|------|------------------|
| `main.ts` | #1 resource stats, #2 model switch, #3 CLI update/anomaly detection, #4 config generator |
| `preload.ts` | #1, #2, #3, #4 IPC bridge methods |
| `pages/TerminalPage.tsx` | #1, #2, #3, #4 UI + #5 unified polish |

Drop them in over your existing copies (they are full files, not diffs).

---

## Feature #1 — Real-time RAM / CPU / lag stats per session
- **main.ts:** spawn now records `{ id, pty, cwd, pid }`; event-loop-lag tracker; cross-platform process-tree sampler (`ps` on unix, `Get-CimInstance Win32_Process` on Windows with CPU-delta); 3s sampler broadcasts `terminal:resource-stats`; `ipcMain.handle('terminal:get-resource-stats')`.
- **preload.ts:** `getResourceStats()`, `onResourceStats(cb)`.
- **TerminalPage.tsx:** `SessionResourceStats` badge (CPU %, mem, PID, lag dot that pulses when laggy) rendered per session.

## Feature #2 — Model switcher (keep session, re-inject directive)
- **main.ts:** `AgentState.currentModel`; `models:detect` (runs `opencode models`, falls back to a built-in list); `agent:set-model` writes `/model <name>\r` into the **running** agent (no restart), updates state, broadcasts `agent:model-changed`.
- **preload.ts:** `detectModels()`, `setSessionModel()`, `onModelChanged(cb)`.
- **TerminalPage.tsx:** `ModelSwitcher` dropdown in the compose toolbar (auto-detects installed CLI models).

## Feature #3 — CLI update + anomaly detection → notify + mark tab
- **main.ts:**
  - `detectCliNotice(buffer)` scans the last ~10 lines of each session's output (ANSI-stripped) for **anomalies** (quota, rate-limit, auth 401/403, context-length, network ECONN*, crash/panic) and **update notices**.
  - `maybeBroadcastNotice(id)` (90s dedupe, capped) → broadcasts `terminal:anomaly` `{ terminalId, kind, type, severity, detail, ts }`. Hooked into **both** output-processing sites.
  - `checkCliUpdatesOnce()` compares each installed CLI's `--version` against `npm view <pkg> version` (opencode-ai, @anthropic-ai/claude-code, @google/gemini-cli, @openai/codex) → broadcasts `cli:update-available`. Runs 15s after boot + every 6h (`.unref()`), plus on-demand via `cli:check-updates`.
- **preload.ts:** `onTerminalAnomaly(cb)`, `onCliUpdateAvailable(cb)`, `checkCliUpdates()`.
- **TerminalPage.tsx:** per-tab `AlertCircle` marker (red pulse for high severity, amber otherwise) = **tab needs human interaction**; the previously-unused `AnomalyBadge` is now wired into the toolbar for the active session (dismissable); a CLI-update pill appears when updates are available.

## Feature #4 — Project vs global vs custom-directory config generator
- **main.ts:**
  - `generateAgentConfigs({ agent, scope, baseDir, customDir, overwrite })` writes complete, correct config files:
    - **opencode** → `opencode.json` (schema, model, `instructions` pointing at the generated `agent/` files)
    - **gemini** → `GEMINI.md` + `.gemini/settings.json`
    - **claude** → `CLAUDE.md` + `.claude/settings.json`
    - **codex** → `AGENTS.md` + `.codex/config.toml`
  - **Scope** resolves the target root: `project` → repo root, `global` → home dir, `custom` → a directory you pass. Existing files are **skipped unless `overwrite:true`**.
  - `previewAgentConfigs(...)` returns what *would* be written (new/exists + byte size) without touching disk.
  - IPC: `config:generate`, `config:preview`. **Init now auto-generates project-scope configs** (wired into `runInitAll`'s trigger).
- **preload.ts:** `generateAgentConfigs(opts)`, `previewAgentConfigs(opts)`.
- **TerminalPage.tsx:** `ConfigGenerator` control in the compose toolbar — pick **Project / Global / Custom directory**, then generate for the active agent (reports written/skipped + target root).

> Note on layout: configs are written **root-relative** to the resolved scope root (e.g. `<root>/opencode.json`, `<root>/.gemini/settings.json`). For `global`, root = home dir. If you want the strict canonical global paths for a specific CLI, tell me and I'll special-case it.

## Feature #5 — Uniform premium polish
- Unified the new toolbar controls (model switcher, Configs generator, CLI-update pill) onto **one** accent-aware chip language: `rounded-md`, `ring-1 ring-inset`, accent hover ring (`--page-accent`), consistent `text-[11px]` height and `transition-colors duration-150`.
- Config generator's primary action now uses the page accent (`--page-accent`) instead of an ad-hoc color, and its dropdown matches the model switcher's ring/elevation treatment.
- Result: the added controls read as part of the existing design system rather than bolt-ons.

---

## How to test (by hand)
1. **#1** open a session → CPU/mem/PID/lag badge updates every ~3s; hammer the CLI → lag dot pulses.
2. **#2** open the model dropdown → switch model → the running agent receives `/model ...` without restarting.
3. **#3** trigger a rate-limit/auth error (or wait for a real one) → tab gets the alert marker + AnomalyBadge; when a CLI has a newer npm version, the update pill appears (or click it / call `checkCliUpdates()`).
4. **#4** click **Configs** → choose Project/Global/Custom → Generate → verify the config files appear at the reported root; re-run init and confirm project configs are auto-created.
5. **#5** confirm the three controls share the same look and hover accent.

_Scope: strictly `/terminal`. No new dependencies. Windows/CRLF preserved. opencode = code only; CZ tests by hand._
