# Context Bundle — DSL Engine Architecture for Self-Expanding Compositions

> Self-contained source of truth for the DSL engine decision. External AI has NO codebase access — all relevant context is inline.

---

## 1. Project Overview

RHEO (formerly DeskFlow) is an Electron + React + better-sqlite3 desktop productivity tracker. The app tracks foreground windows, browser tabs, IDE projects, learning progress, and finances. All data is local SQLite.

## 2. The Feature: Self-Expanding Agentic System

A DSL-driven composition engine that lets the AI propose and the user approve cross-subsystem automations. The DSL is strictly bounded — no eval, no dynamic SQL, no filesystem access, no arbitrary execution.

**Key constraints:**
- DSL compiles to AST JSON (interpreted by a runtime engine)
- AST node cap: 1200 nodes per composition
- Execution timeout: 2000ms per action
- No DSL block exceeds 50 lines
- Max 5 consecutive errors before circuit breaker
- Finance and destructive actions require human review
- Global kill switch disables all compositions

## 3. DSL Grammar Summary (~30 production rules)

The DSL has 4 trigger types, 6 action types, 5 value types, and scope declarations:

```
composition           → SCOPE scope_block trigger_block [condition_block] action_block
scope_block           → READ (identifier ("," identifier)*)? WRITE (identifier ("," identifier)*)?
trigger_block         → (ON trigger_event | EVERY interval | AT datetime | MANUAL)
trigger_event         → "focus:session_ended" | "focus:session_started" | "goal:completed" | ...
interval              → NUMBER ("m" | "h" | "d")
condition_block       → IF "(" expression ")"
action_block          → DO "(" action ("," action)* ")"
action                → action_type "(" param ("," param)* ")"
action_type           → "NOTIFY" | "CREATE_GOAL" | "SET_STATE" | "IF_THEn_CREATE" | "LOG" | "SEND_EVENT"
expression            → value OP value | STATE "(" STRING ")"
value                 → NUMBER | STRING | BOOLEAN | dataset "." field
```

## 4. Target Subsystems & Data Sources

The DSL reads from and writes to these subsystems via adapters:

| Subsystem | Read datasets | Write operations | Security level |
|-----------|--------------|-----------------|----------------|
| Focus | `focus.streak`, `focus.dailySessions`, `focus.currentState` | None (read-only) | Low |
| Goals | `goals.active`, `goals.completed`, `goal.{id}` | `CREATE_GOAL` | Medium |
| System | `system.currentApp`, `system.time`, `system.lastActiveAt` | None (read-only) | Low |
| Finance | `finance.balance`, `finance.recentTxns`, `finance.budgetStatus` | None via DSL (review queue) | High |
| Learning | `learn.currentCurriculum`, `learn.dailyLessons`, `learn.masteryByTopic` | None (read-only) | Low |
| IDE | `ide.activeProject`, `ide.dailyCommits`, `ide.linesChanged` | None (read-only) | Low |

## 5. Existing Codebase Architecture

**Build pipeline:**
- `npx vite build` → renderer (dist/)
- `npx esbuild src/preload.ts` → preload.cjs
- Step 3: walks `src/services/`, `src/domains/`, `src/main/` — each .ts compiled individually
- Step 4: `npx vite build` (library mode) → main.cjs

**Module pattern (recommended for new features):**
- `src/domains/compositions/compositionSchema.ts` — DB schema
- `src/domains/compositions/compositionEngine.ts` — Lexer, Parser, Validator, ScopeChecker
- `src/domains/compositions/compositionRuntime.ts` — EventBus, Scheduler, ActionExecutor, AuditLogger
- `src/domains/compositions/compositionAdapters.ts` — DataSourceRegistry + adapters
- `src/domains/compositions/compositionManager.ts` — orchestrator + IPC handlers

**No existing parser infrastructure.** The codebase has zero parser combinator libraries, zero DSL interpreters. All IPC handlers are flat in main.ts (~29K lines).

**Existing dependencies (relevant):** better-sqlite3, electron, react, vite, esbuild, tailwindcss

## 6. Security Requirements

- AST must be reviewable: every node has a type, line, column
- No eval/Function constructor allowed
- No dynamic require/import
- No filesystem operations
- No network requests
- Scope checker verifies all READ/WRITE against declared scope before execution
- Rate limiting: global (100 exec/min) + per-composition (60 exec/min)
- Circuit breaker: auto-pause after 5 consecutive errors

## 7. Example Compositions

```
SCOPE READ goals WRITE goals
ON goal:completed
IF STATE("focus.streak") < 3
DO (
  CREATE_GOAL(title: "Complete 3 focus sessions this week", priority: "medium")
)
```

```
SCOPE READ finance WRITE goals
WHEN finance.budgetStatus("monthly") == "overspent"
DO (
  NOTIFY(message: "You've overspent this month. Consider pausing non-essential spending.")
)
```

```
SCOPE READ focus
EVERY 15m
IF focus.currentState == "idle" AND TIME("HH") >= 22
DO (
  NOTIFY(message: "Wind-down time? You've been idle for 15min late at night.")
)
```
