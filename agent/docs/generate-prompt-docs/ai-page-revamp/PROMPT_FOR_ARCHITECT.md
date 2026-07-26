# Prompt for Architect AI — Continue Phase 1-5 Engineering

> Send this to the Architect AI to continue the Drafting Table implementation.

---

## Context

Phase 0 is complete and built. The codebase now has:
- IPC allowlist (`src/services/ipcAllowlist.ts`) — 24 READ + 16 WRITE endpoints
- 14 new files created (uuid, ToastContext, ipcAllowlist, migrations, 9 domain hooks)
- ChatMsg.role extended to `user | assistant | system | tool`
- AiPage god component partially decomposed (hooks created, not yet wired)
- Dynamic IPC dispatch replaced with `dispatchIPC()`
- DB migration for relaxed role CHECK constraint
- Backup at `agent/backups/phase0-pre/`

## What You Need to Generate

Generate detailed implementation plans for **Phases 1-5** of the Drafting Table revamp. Each phase must include:

1. **Exact file paths** for every new file and every modified file
2. **Component interfaces** (props, return types)
3. **Hook signatures** (state, callbacks, return values)
4. **Data flow diagrams** (how data moves between components)
5. **Integration points** with existing code (specific line numbers where changes go)
6. **Manual test checklists** (specific actions to verify each phase works)

## Phase Requirements

### Phase 1: Canvas Foundation
- CanvasGrid with 40px grid background
- CanvasCard with drag, snap-to-grid, error boundary
- useCanvasState (useReducer + Record<string, CanvasCard>)
- Canvas persistence (localStorage for layout, DB for content)
- Integration with AiPage

### Phase 2: Command Palette + IntentParser
- �K command palette at bottom center
- IntentParser with keyword routing
- Transient card spawning (auto-dismiss 30s)
- Custom command integration
- Slash command autocomplete in palette

### Phase 3: Transcript Rail
- Right slide-out panel (collapsible)
- Message list with extended roles (user/assistant/system/tool)
- Chat input in rail for conversational fallback
- Thread management (rename, history)

### Phase 4: Card Types
- FocusCard (wraps existing FocusBoard logic)
- PlanCard (wraps existing PlanBoard logic)
- FinanceCard (new summary dashboard)
- DigestCard (wraps existing DailyDigestBoard)
- ApprovalCard (approve/reject buttons)
- AnnotationCard (AI comment pins)

### Phase 5: Testing
- Unit tests for IntentParser routing
- Unit tests for CardGeneration validation
- E2E tests for approval flow
- Error boundary fallback tests
- IPC allowlist enforcement tests

## Constraints

- All handlers must accept single payload objects (not positional args)
- Use `Record<string, CanvasCard>` not Map for state
- Each CanvasCard gets its own ErrorBoundary
- Transient cards auto-dismiss after 30s
- Approval cards require explicit user action
- No breaking existing AI response paths (ParsedMessageRouter stays as-is during migration)

## Existing Docs Reference

All architecture docs are in `agent/docs/ai-page-revamp/`:
- `01-audit-report.md` — Full codebase audit
- `02-design-plan.md` — Drafting Table paradigm
- `03-architecture-proposal.md` — Technical architecture
- `06-architect-feedback-round2.md` — IPC allowlist, state pattern, migration table
- `08-architect-feedback-round3.md` — Complete allowlist, ToastContext, decomposition, testing strategy
- `09-phase1-canvas-foundation.md` — Phase 1 plan (already drafted, review and refine)

## Deliverable

For each phase, output a markdown file like `09-phase1-canvas-foundation.md` with:
- File-by-file changes with line numbers
- Complete code for new files
- Exact edits for modified files
- Manual test checklist

Write all files to `agent/docs/ai-page-revamp/`.
