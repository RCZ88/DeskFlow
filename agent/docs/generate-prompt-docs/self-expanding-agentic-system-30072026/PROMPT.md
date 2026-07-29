# Self-Expanding Agentic System — Engineering Prompt

## Raw Request

> *Voice recording transcript, 2026-07-29*

"While I remember there's this feature in which it's very interesting and very good, it's very unorthodox, it's not something that has been discussed in the world. Like in terms of agentic systems, why not make a system where the AI has the capabilities to do whatever? But there are some certain constraints, of course, whatever it is.

For example, basically it's by utilizing the data that is gathered and is able to make stuff out of it. So first example is related to goals. For example, if I want to have a goal where I would want to sleep at 10pm for example. And the application has the data of the sleeping and also has the data of tracking usage. And you can see what time it is. And if it's gone beyond that, it should automatically consider the fail.

And the fact that we already have a lot of those features in front of us that we can utilize the data that are gathered and having a system where the AI is able to generate something. So something like this confuses me as a part where how you're supposed to do it isn't supposed to be some sort of framework where there's a lot of, there's a limit to what you can make. The app provides you on stuff that you can make and connect to one another.

For example, in this case of the goals or daily to-doos is to make so that you are able to add those goals through the AI. The goals can be customized and it can be related to the not just user manually complete and tracks the goal by itself by the user. But rather the system does the ones that it does the system that takes it. It's a very judicial system where it's completely fair because the system is the one that's getting to decide whether this thing is ticked or not.

But I guess yeah, you can't really, how would you make a AI being able to be the ones that create those features? It's a self-expanding thing that means that the AI needs to have access to the code which is not really ethical close to being ethical at all. It's just very interesting. We have a lot of data sources in front of us. A lot of them. We could probably utilize that.

It basically it's something that I dream of and I think it's very interesting to look at. Would require a lot of tunings and just things of proper research, proper planning. But the fact that it exists as a free idea just being a proof of concept and being able to be launched separately from the main app. Maybe it is something that interests me and if I is something that they're gonna do it's interesting."

---

## Context

- **Codebase**: DeskFlow — Electron + React + better-sqlite3 desktop productivity tracker
- **Context Bundle**: `agent/docs/generate-prompt-docs/self-expanding-agentic-system-30072026/CONTEXT_BUNDLE.md`
  - Contains ACTUAL source code (DB schemas, IPC handlers, type definitions, component patterns) for all 5 composable subsystems: Goals, Learning, IDE Projects, Finance, AiPage Canvas
  - Includes the full IPC map (~150 channels), design tokens, and data flow patterns
  - The receiving AI MUST read this file first; it has no other codebase access
- **Current State**: Each subsystem is a data island. No feature automatically reads from or writes to another. The missing layer is a "connection fabric" — a constrained DSL + event system that lets the AI compose features without arbitrary code execution.

---

## The Mandate

Design a comprehensive **Self-Expanding Agentic System** architecture for DeskFlow that enables an AI to autonomously compose new capabilities by connecting existing feature data, WITHOUT granting the AI access to source code or arbitrary execution.

The system must solve six core problems simultaneously:

### 1. Ambient Goal Evaluation ("AI Judge")
- Goals like "sleep by 10pm" should auto-evaluate using tracked data (screen time, active window logs, time of day)
- The system is the sole arbiter — no user manual tick needed
- Must work with ANY tracked data source (screen time, IDE activity, finance transactions, learning progress)

### 2. Constrained Composition DSL
- A limited, auditable language the AI uses to express feature compositions
- NOT arbitrary code — think SQL-level constraint, not Python-level freedom
- Grammar must be learnable by the AI and reviewable by a human
- Examples: `WHEN {event} IF {condition} THEN {action}`, `WATCH {dataSource} ON {trigger} EVALUATE {rule}`

### 3. Data Connectivity Mesh
- A shared fabric that lets any feature register data sources and any feature subscribe
- Current gap: goals can't read finance data; IDE projects can't read goals; learning can't read screen time
- Must support: polling queries, push events, aggregated summaries
- Backend: new DB tables + IPC channels + in-memory event bus
- Frontend: React context provider + hooks for cross-feature subscriptions

### 4. Self-Expansion Without Code Access
- The AI "expands" the system by composing existing primitives in novel configurations
- No new DB tables, no new IPC handlers, no new React components generated by the AI
- New feature = new composition of existing blocks
- Must include a registry where the AI can save/share compositions

### 5. Safety Guardrails
- Rate limits: max N compositions per session, max M evaluations per minute
- Scope limits: compositions can only read data the user has access to
- Kill switch: disable all AI compositions with one toggle
- Audit trail: every composition activation is logged with full context
- Review queue: human must approve compositions that touch finance or destructive actions

### 6. User-Facing UI
- A "Compositions" tab in the workspace (likely under Work or Insights group)
- Card-based display showing: what composes what, status (active/paused/error), last evaluation time, result
- Create/Edit modal with the DSL (code editor or guided form)
- Activity feed showing each composition's evaluations and actions
- Toggle/pause per composition, with error state badge

---

## Requirements Checklist

### Engineering (Data Processing Pipeline)
- [ ] DSL lexer/parser/interpreter — define grammar tokens, parse tree, evaluation engine
- [ ] Event bus architecture — Pub/sub with typed channels, async dispatch, dedup
- [ ] Data source registry — each subsystem registers its readable datasets + triggers
- [ ] Evaluation scheduler — polling intervals, cron-like triggers, real-time event handlers
- [ ] Action executor — limited set of safe actions (create goal, mark complete, send notification, trigger terminal write)
- [ ] Composition storage — DB table for compositions (id, name, DSL source, status, last_run, audit trail)
- [ ] Audit trail — log every evaluation result, action taken, error encountered
- [ ] Rate limiter + throttle — prevent runaway evaluations
- [ ] Security sandbox — verify compositions cannot read/write outside their declared scope

### Design (High-Fidelity Visual Specs)
- [ ] Compositions dashboard — card grid with status badges (active/paused/error)
- [ ] Composition editor — DSL code editor with syntax highlighting OR guided rule builder
- [ ] Composition detail — full view of source, evaluation history, action log
- [ ] Activity feed — chronological list of "when X triggered Y and did Z"
- [ ] Empty state — "No compositions yet. Ask the AI to create one."
- [ ] Error state — broken composition card with red badge, error message, "Edit" / "Disable"
- [ ] Loading state — skeleton cards during composition list load
- [ ] All cards use the glass pattern: `bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]` with top-edge gradient highlight

### UX (Interaction Flow)
- [ ] Creating a composition: button → modal → DSL editor or guided form → save → activate
- [ ] Editing a composition: click card → detail view → "Edit" → modal prefilled
- [ ] Viewing results: composition card shows last evaluation timestamp + result summary
- [ ] Error recovery: composition transitions to "error" state, card shows error, user can edit/disable
- [ ] Pausing: toggle switch on card pauses without deleting
- [ ] AI suggestion flow: AI proposes a composition → user reviews in a modal → accept/edit/reject
- [ ] Kill switch: global toggle in sidebar or settings to disable all compositions immediately

### Backend Implementation
- [ ] New DB tables: `agent_compositions` (DSL source, status, config), `composition_executions` (audit trail), `composition_triggers` (event subscriptions)
- [ ] New IPC channels: `compositions:list`, `compositions:create`, `compositions:update`, `compositions:delete`, `compositions:toggle`, `compositions:get-executions`, `compositions:get-logs`
- [ ] New service class: `src/services/CompositionEngine.ts` — parser, evaluator, scheduler, action executor
- [ ] Data source registration: each subsystem exposes a manifest (what data, what triggers, what actions)
- [ ] Event bus: in-memory typed pub/sub in main process, optionally persisted to DB for crash recovery

---

## Constraints

1. **No code generation.** The AI must never generate new React components, new DB schemas, or new IPC handlers. All expansion is composition of existing primitives.
2. **DSL only.** The composition language must be a strict, bounded DSL with no escape hatch to arbitrary JavaScript/Python/SQL.
3. **Audit everything.** Every composition evaluation, every action taken, every error must be logged in a DB table with timestamps.
4. **Must work offline.** All evaluation logic runs locally (no cloud dependency). Only AI suggestions may call the provider.
5. **Must coexist with existing features.** Composability is additive; no existing feature should break when compositions are added.
6. **Performance.** Composition evaluations must not block the main thread. Use worker threads or async scheduling.
7. **Existing glass pattern.** All new UI components must use the established glass aesthetic.

---

## Verify Checklist

- [ ] DSL grammar is defined (BNF or equivalent) and auditable by a human
- [ ] Every subsystem (goals, learning, IDE, finance, canvas) has a data source manifest
- [ ] Composition storage uses the existing SQLite DB (new tables)
- [ ] IPC channels follow the existing naming convention (lowercase, colon-separated)
- [ ] Preload bindings follow the existing camelCase pattern
- [ ] All new components use the glass pattern and existing shadcn components
- [ ] No new npm packages required beyond what's already installed
- [ ] The system can be disabled with a single toggle (kill switch)
- [ ] Error states are handled gracefully without crashing the app
- [ ] The design supports both DSL code editing AND a guided form-based builder

---

## Deliverables

Output as `RESULT.md` containing:

1. **Architecture Overview** — system diagram (ASCII), component relationships, data flow
2. **DSL Specification** — full grammar with examples for each production rule
3. **DB Schema** — CREATE TABLE statements for all new tables
4. **IPC Channel Definitions** — channel names, payload types, return types
5. **Service Design** — CompositionEngine class API, event bus API, data source registry API
6. **UI Component Tree** — component hierarchy, props interfaces, state management
7. **High-Fidelity UI Specs** — exact layout, color codes, spacing, typography per component
8. **Interaction Flows** — sequence diagrams for create/edit/run/toggle/error recovery
9. **Safety and Security** — rate limiting, scope checking, audit trail, kill switch implementation
10. **Implementation Phases** — ordered build plan from MVP to full system
