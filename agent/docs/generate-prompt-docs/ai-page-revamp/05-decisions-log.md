# Decisions Log

> Record of all decisions made during the Drafting Table design discussion.
> Format: `[DATE] DECISION: <what> | RATIONALE: <why>`

---

## Jul 18, 2026

**DECISION: Custom slash commands are global, not project-scoped**
RATIONALE: The AI Assistant page (`/ai`) is a global page, not tied to any project. Custom commands should work the same across all contexts.

**DECISION: Manage Commands via dedicated modal, not inline in settings**
RATIONALE: A modal gives full screen real estate for the CRUD interface (list, add, edit, delete). Settings panels are too cramped.

**DECISION: Existing built-in commands stay as defaults**
RATIONALE: `/unread`, `/inbox`, `/calendar`, `/today`, `/sync`, `/email` are core functionality. No pre-loaded custom commands — users create their own.

**DECISION: Connector management moves to Settings, not on canvas**
RATIONALE: Connectors are configuration, not live data. The canvas shows derived data (unread count, today's events), not the connector management UI.

**DECISION: Audit the codebase before writing any design code**
RATIONALE: The existing codebase has 43 components, 33 state variables, 35+ IPC endpoints, and 17 technical debt items. Understanding the full picture prevents designing something that's impossible to build.

**DECISION: Decompose AiPage before building canvas**
RATIONALE: AiPage is a 1081-line god component with 33 state variables. Building a canvas on top of this would be unmaintainable. Domain hooks must be extracted first.

**DECISION: Canvas state uses hybrid persistence (localStorage for layout, DB for content)**
RATIONALE: Card positions are lightweight coordinates (~2KB). Card content already lives in the DB. No need to duplicate.

**DECISION: Each CanvasCard gets its own ErrorBoundary**
RATIONALE: One card crashing shouldn't kill the entire canvas. Per-card error boundaries provide graceful degradation.

**DECISION: Transient cards auto-dismiss after 30 seconds**
RATIONALE: Simple Q&A responses are ephemeral. If the user doesn't pin them, they're not important enough to clutter the canvas.

**DECISION: Approval cards require explicit user action**
RATIONALE: The AI should never execute destructive actions without confirmation. Approval cards are the visual enforcement of this principle.
