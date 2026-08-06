# Context Gap Analysis — Generalizable AI Agent Framework

> Companion to `INITIAL_PROMPT.md`. Table of what context exists vs. is missing, and how to obtain it.
> Core files are EMBEDDED VERBATIM in `CONTEXT_BUNDLE.md` Part A — no fetch needed for those.

| Context Needed | Status | Location | How to Obtain |
|---|---|---|---|
| Full verbatim AGENTS.md (contract) | ✅ Embedded | `CONTEXT_BUNDLE.md` Part A (A1) | No fetch needed |
| System prompt template (8-layer) | ✅ Embedded | Part A (A2) | No fetch needed |
| Hub+Spokes state contract | ✅ Embedded | Part A (A3: `state.md` hub + `_template.md`) | No fetch needed |
| Hub regeneration logic | ✅ Have (code) | `src/main/stateCoordinator.ts` | Request — Electron-coupled; generalizing is a design question |
| Memory discipline + cycle report | ✅ Embedded | Part A (A1 + A4 MEMORY.md) | No fetch needed |
| Skills DSL spec | ✅ Embedded | Part A (A5) | No fetch needed |
| Skill router | ✅ Embedded | Part A (A7) | No fetch needed |
| AI Collaboration Bridge | ✅ Embedded | Part A (A8) | No fetch needed |
| maintain-context + graphify_maintain.py | ✅ Embedded | Part A (A6) | No fetch needed |
| problems/requests JSON + actions queue | ✅ Embedded | Part A (A10) | No fetch needed |
| Dictionary / terminology protocol | ✅ Embedded | Part A (A11) | No fetch needed |
| Terminal workspace IPC/DB wiring | ✅ Have | `src/main.ts` (workspace handlers ~line 13191), `src/preload.ts` (~line 650), `src/pages/TerminalPage.tsx` | Request specific handlers |
| PTY event order invariants | ✅ Embedded | Part A (A4 MEMORY.md) | No fetch needed |
| QMD templates | ✅ Have | `agent/templates/session.qmd`, `problem.qmd` | Request |
| Graphify global skill | ✅ Have (global) | `~/.config/opencode/skills/graphify/SKILL.md` (outside repo) | Request — global opencode install, not part of repo |
| CZVault PARA layout | ⚠️ Partial | `CZVault/` — not verified this session | Request a directory listing |
| automations.json | ⚠️ Partial | `agent/automations/automations.json` — not verified this session | Request |
| Framework repo target location | ❌ Missing | N/A — user: "not important yet" | Deferred to implementation round |
| Framework licensing/distribution | ❌ Missing | N/A | Deferred — Architect may propose |
| "User back-and-forth skill" (new skill deliverable) | ❌ Missing | N/A — a NEW skill to author after discussion converges | Post-RESULT round |
| Which skills are universal vs app-specific | ⚠️ Placeholder verdicts | `INITIAL_PROMPT.md` layer table + `conversation/round-01.md` | Architect confirms/adjusts in discussion |

**Rules for the conversation:** if a gap exists, the Project Owner explicitly offers: *"We do not yet have [X]. If you need it, ask and we will fetch it."* — and fetches verbatim on `REQUEST:`.
