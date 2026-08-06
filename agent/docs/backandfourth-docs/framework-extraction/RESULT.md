# RESULT.md — Framework Extraction Plan

> **Bridge:** ai-collaboration-bridge | **Idea:** framework-extraction | **Date:** 2026-08-06
> **Status:** ✅ CONVERGED — Ready for Implementation Round

This document is the final extraction plan for generalizing the DeskFlow agent infrastructure into a standalone, reusable AI-agent framework repository.

---

## 1. Extraction Verdict Table

| Component | Current Location | Verdict | Generalization Action |
|---|---|---|---|
| **Operating Contract** | `agent/AGENTS.md` | 🟡 Generalize | Split into universal `AGENTS.md` (Zero-Destruction, rituals, memory) and user-created `project-overrides.md` (build steps, QA checklists). |
| **System Prompt** | `agent/DEFAULT_SYSTEM_PROMPT.md` | 🟡 Generalize | Strip DeskFlow terminology and specific IPC layer instructions. Retain the 8-layer assembly mechanism as a baseline template. |
| **State Hub Template** | `agent/state.md` | 🟡 Generalize | Make agnostic to `DESKFLOW_SESSION_ID`. Update PROTOCOL prose to reflect new env var and `{agentType}-{entropy}` ID fallback. |
| **State Spoke Template** | `agent/state/_template.md` | 🟢 Extract | Extract as-is. Universal structure for cycle tracking. |
| **Hub Generator** | `src/main/stateCoordinator.ts` | 🟢 Extract | Lift fs-only logic 1:1 into `scripts/regen-state.mjs`. Parameterize title/env vars via `framework.config.json`. Add `--watch` daemon flag. |
| **Memory Discipline** | `agent/MEMORY.md` | 🟢 Extract | Ship as empty template with format rules in `AGENTS.md`. |
| **Terminology Protocol** | `agent/dictionary.md` | 🟡 Generalize | Extract the *concept* (disambiguation before action) but ship an empty template. DeskFlow's specific page map stays behind. |
| **Structured Tracking** | `problems.json`, `requests.json` | 🟢 Extract | Extract schema and status state machines as-is. |
| **Actions Queue** | `actions.json` (main process watch) | 🟡 Generalize | Extract watch/execute/clear logic into `scripts/actions-watcher.mjs`. Transition states directly in JSON files (no DB). |
| **Skill DSL** | `agent/skills/SKILL_DSL_GUIDE.md` | 🟢 Extract | Extract as-is. YAML frontmatter standard is universal. |
| **Skill Router** | `agent/skills/skill-router/` | 🟡 Generalize | Extract dispatcher. Remove app-specific skills from the decision tree. Document repo-first, then global, resolution order. |
| **Core Skills (14)** | `agent/skills/...` | 🟢 Extract | Extract universal skills (router, maintain-context, backandfourth, etc.) as-is. |
| **App-Specific Skills (6)** | `agent/skills/...` | 🔴 Leave / Example | Move to `community-skills/` as non-core examples. |
| **CLI Configuration** | `opencode.json` | 🟡 Generalize | Sanitize API keys. Ship as `opencode.json.template` with placeholder ENV vars. |
| **Electron/PTY/DB** | `src/main.ts`, `src/preload.ts`, etc. | 🔴 Leave | App-specific infrastructure. Not part of the framework. |

---

## 2. Generalization Design

### A. The AGENTS.md & Prompt Layering Split
The framework must separate *how an agent behaves* from *how the project builds*.
*   **Core Contract (`AGENTS.md`):** Contains the universal rules. Zero-Destruction, Startup/Shutdown Rituals, Skill Router enforcement, Cycle Report format, and Memory Discipline.
*   **Project Overlay (`project-overrides.md`):** A user-created file. The core contract instructs the agent to read this at startup. DeskFlow would place its Vite build steps, black-screen prevention, and Electron DB paths here. A Python project would place `pytest` and `docker compose` steps here.
*   **Prompt Layering (`LAYERING_CONTRACT.md`):** The framework ships the 8-layer assembly order (default → general → agent-specific → project-specific → init content → thought process → auto-context → config directives) and the precedence rules (Project > Agent-type > General > Default) as a documented contract. CLI adapter notes (opencode `instructions`, aider `--read`, Claude `CLAUDE.md`) are provided so users know how to wire the layers in their specific CLI.

### B. The State Contract (Hub + Spokes)
The state management is decoupled from Electron and moved to a standalone Node CLI.
*   **Generator (`scripts/regen-state.mjs`):** Extracted 1:1 from `stateCoordinator.ts`. Purely file-system based. Reads `agent/state/*.md`, parses markers (`<!-- SESSION: -->`, `## CURRENT CYCLE`), sorts by `updatedAt`, and atomic-writes `agent/state.md`.
*   **Configuration (`framework.config.json`):** Parameterizes `hubTitle`, `sessionEnvVar`, and `generatedBy` strings injected into the Hub markdown.
*   **Session ID Convention:** Env-var-first (e.g., `AGENT_SESSION_ID`), with `{agentType}-{entropy}` as a fallback. The `terminalId` is dropped from the core framework to keep it UI-agnostic.
*   **Execution:** Users run `node scripts/regen-state.mjs --watch` in a background terminal pane to keep the Hub live as spokes are updated.

### C. The Skills System
*   **Universal Library:** 14 core skills extracted to `skills/`. The `skill-router` decision tree is pruned of app-specific mappings.
*   **Resolution:** The router resolves skills repo-first (`skills/`), then global (`~/.config/opencode/skills/`).
*   **Context Maintenance (`scripts/maintain-context.mjs`):** A slimmed, generic Node script that syncs `state.md`, `PROBLEMS.md`, and `MEMORY.md`. The Graphify sync becomes an optional conditional hook (`scripts/graphify_maintain.py`), removing the hard Python/Graphify dependency.

### D. The Actions Queue (`scripts/actions-watcher.mjs`)
Decouples the structured-output queue from DeskFlow's main process.
*   Watches `agent/actions.json` with a 500ms debounce.
*   Parses the 4 action types: `create_problem`, `update_problem`, `complete_checklist`, `update_request`.
*   Applies status transitions directly to `problems.json` and `requests.json` (following the exact state machines: NEW → Not Started → In Progress → AI Attempted Fix → User Testing → Fixed; Pending → In Progress → Completed).
*   Clears the queue to `{ "actions": [] }` after execution.

---

## 3. Proposed Framework Repository File Tree

```text
ai-agent-framework/
├── README.md
├── LICENSE                   # MIT (Confirm with CZ before publishing)
├── framework.config.json     # Parameterizes hub title, env vars, agent types
├── opencode.json.template    # Sanitized template for CLI wiring (instructions + MCP)
├── .gitignore                # Ignores state.md, .env, tmp files
│
├── agent/                    # The core agent contract & state
│   ├── AGENTS.md             # Universal operating contract (stripped of DeskFlow specifics)
│   ├── DEFAULT_SYSTEM_PROMPT.md # 8-layer assembly template (stripped of DeskFlow terms)
│   ├── LAYERING_CONTRACT.md  # Documents the 8 layers, precedence, and CLI adapter notes
│   ├── MEMORY.md             # Empty template with format rules
│   ├── dictionary.md         # Terminology protocol (empty template)
│   ├── problems.json         # Empty array []
│   ├── requests.json         # Empty array []
│   ├── actions.json          # Empty queue {"actions": []}
│   ├── project-overrides.md  # (User-created) Project-specific build/QA steps
│   ├── state.md              # Auto-generated Hub (gitignored)
│   └── state/
│       └── _template.md      # Spoke template
│
├── skills/                   # The DSL library (14 universal skills)
│   ├── SKILL_DSL_GUIDE.md
│   ├── skill-router/
│   ├── maintain-context/
│   ├── backandfourth-skill/
│   ├── agent-reflect/
│   ├── commit/
│   ├── deep-research/
│   ├── max-security/
│   ├── humancentred-UIUX/
│   ├── frontend-external-infra/
│   ├── generate-prompt/
│   ├── context-handoff/
│   ├── license-generator/
│   ├── readme-generator/
│   └── tutorial-author/
│
├── community-skills/         # App-specific examples (not in default router tree)
│   ├── layout-deck-fix/
│   ├── resume-builder/
│   ├── research-digest-overhaul/
│   ├── app-detection/
│   ├── sqlite-js-migration/
│   └── probe-mcp-testing/
│
└── scripts/                  # The CLI bridge
    ├── regen-state.mjs       # Extracted stateCoordinator.ts (CLI + --watch)
    ├── actions-watcher.mjs   # Generic fs-watch + JSON transition executor
    ├── maintain-context.mjs  # Generic markdown sync (optional graphify hook)
    └── graphify_maintain.py  # Optional Graphify sync hook
```

---

## 4. Build Order (For Implementation Round)

When the implementation round begins, execute in this order to ensure stability:

1.  **Scaffold & Config:** Create the repo structure. Initialize `framework.config.json` and sanitized `opencode.json.template`.
2.  **State Infrastructure:** Extract `stateCoordinator.ts` into `scripts/regen-state.mjs`. Parameterize the PROTOCOL prose generation. Test `--watch` mode on a dummy spoke.
3.  **Actions Infrastructure:** Author `scripts/actions-watcher.mjs`. Test applying transitions to `problems.json` and clearing the queue.
4.  **Core Contracts:** Generalize `AGENTS.md` and `DEFAULT_SYSTEM_PROMPT.md`. Author `LAYERING_CONTRACT.md`.
5.  **Skills Extraction:** Copy the 14 universal skills into `skills/`. Prune the `skill-router` decision tree. Copy the 6 app-specific skills into `community-skills/`.
6.  **Maintain-Context:** Author the generic `scripts/maintain-context.mjs` and isolate the Graphify logic into `scripts/graphify_maintain.py`.
7.  **Documentation:** Write the `README.md` explaining how to install, configure, and run the framework for a new project.

---

## 5. Open / Deferred Items

*   **Licensing:** Recommend MIT. CZ must confirm before the repo is published.
*   **Framework Repo Location:** To be decided with CZ in the implementation round.
*   **"User Back-and-Fourth Skill":** A new skill to author post-convergence, teaching the framework how to initiate this exact relay protocol with an external AI.
