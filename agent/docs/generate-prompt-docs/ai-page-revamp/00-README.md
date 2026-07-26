# AI Assistant Page Revamp — Drafting Table Paradigm

> **Status**: Spec phase — audit complete, architecture proposed, awaiting answers to open questions before implementation.

## Overview

We're overhauling the AI assistant interface from a traditional chat/dashboard hybrid into a **Drafting Table spatial canvas model**. This is not a visual reskin — it's a paradigm shift in how the user interacts with the system.

## Documents

| File | Contents |
|------|----------|
| `01-audit-report.md` | Full codebase audit — components, state, IPC, data flow, technical debt |
| `02-design-plan.md` | The Drafting Table paradigm — card types, interaction model, visual style |
| `03-architecture-proposal.md` | Technical architecture — state, components, intent parsing, persistence |
| `04-open-questions.md` | Questions awaiting answers before implementation begins |
| `05-decisions-log.md` | Record of decisions made during discussion |
| `06-architect-feedback-round2.md` | Architect review: IPC allowlist, state pattern, migration table, role extension, testing strategy, clarifying questions |
| `07-phase0-implementation-plan.md` | Initial Phase 0 plan — file-by-file changes, line numbers |
| `08-architect-feedback-round3.md` | **FINAL** — Complete allowlist (35+ endpoints), ToastContext, useGoals decomposition, DB migration, handler signatures, UUID fallback |
| `09-phase1-canvas-foundation.md` | Phase 1 draft — CanvasGrid, CanvasCard, useCanvasState, persistence |
| `PROMPT_FOR_ARCHITECT.md` | **SEND THIS** — Prompt for Architect AI to generate Phases 1-5 |

## Current State

- Audit complete
- Architecture proposed
- Phase 0 COMPLETE and built
- **Phase 1-5 plans need Architect AI to generate** (see `PROMPT_FOR_ARCHITECT.md`)
