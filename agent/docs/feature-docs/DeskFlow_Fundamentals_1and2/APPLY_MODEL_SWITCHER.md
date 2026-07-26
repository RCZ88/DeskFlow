# Feature #2 — Per-session model switcher (live, re-inject) + CLI model auto-detection

**Behavior (per your choices):** switching a running session's model **keeps the session alive** and **re-injects a model directive** into the running agent; the model list is **auto-detected from the installed CLI** (with a curated fallback).

## Changed files (3)
1. `src/main.ts`
2. `src/preload.ts`
3. `src/pages/TerminalPage.tsx`

> Overwrite these three with the copies in this zip (built on top of the current source, and on top of Feature #1's stats changes).

---

## What it does
- A **model dropdown** appears in the compose toolbar (next to Send/Save) for the active session. Click it to load models and pick one.
- Picking a model **writes `/model <name>` into the running TUI** (opencode / claude / gemini / codex all accept the `/model` slash command), so the session is **not** restarted — context/resume is preserved.
- The chosen model is remembered on the session (`AgentState.currentModel`) and broadcast to the UI (`agent:model-changed`) so the dropdown reflects it.

## Model auto-detection (no new deps)
- On open, the UI calls `models:detect` for the session's agent.
- **opencode:** runs `opencode models` (6s timeout) and parses the list. If it succeeds, the dropdown is labeled **Detected**.
- If detection returns nothing (or the CLI isn't found), it falls back to a **curated list** per agent and labels it **Suggested**; if the CLI isn't on PATH it shows **"CLI not found"**.
- Curated fallbacks (edit `__FALLBACK_MODELS` in `main.ts` to taste):
  - opencode: `anthropic/claude-sonnet-4-5`, `anthropic/claude-opus-4`, `openai/gpt-5`, `openai/gpt-4o`, `google/gemini-2.5-pro`, `google/gemini-2.5-flash`
  - claude: `claude-sonnet-4-5`, `claude-opus-4`, `claude-3-5-haiku-latest`
  - gemini: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`
  - codex: `gpt-5`, `gpt-4o`, `o3`, `o4-mini`

## Edits, precisely
### `src/main.ts`
- `AgentState` gains `currentModel?: string`.
- New IPC `models:detect` (verifyAgent + `opencode models` best-effort + fallback) and `agent:set-model` (writes `/model <name>\r` to the PTY, records `currentModel`, broadcasts `agent:model-changed`).

### `src/preload.ts`
- `detectModels(agent)`, `setSessionModel(terminalId, model, agent)`, and `onModelChanged(cb)` added to the exposed API.

### `src/pages/TerminalPage.tsx`
- New `Cpu` + `ChevronDown` icon imports.
- New module-scope `ModelSwitcher` component (detects on open, lists models, calls `setSessionModel`, subscribes to `onModelChanged`).
- Rendered in the compose toolbar for the active terminal.

## Per-CLI note (please verify by hand)
The `/model` slash command is assumed for all four TUIs. If a given CLI uses different syntax (e.g. `/models` to open a picker), tell me the exact command per agent and I'll switch to a per-agent directive map — the write path is already centralized in `agent:set-model`, so it's a one-line-per-agent change.

## Testing by hand (CZ)
1. Start a session (e.g. opencode) and open the compose bar.
2. Click the model chip; it should populate (Detected for opencode if installed, else Suggested).
3. Pick a model — the TUI should receive `/model <name>` and switch in place; the chip updates to the new model.
