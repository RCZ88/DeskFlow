# Self-Expanding Agentic System — Architecture Specification

> **DeskFlow Composable Agentic Layer**  
> **Date:** 2026-07-30  
> **Status:** Engineering Design Document (RFC)  
> **Constraint:** Zero new npm packages. Zero AI-generated runtime code. DSL-only expansion.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [DSL Specification](#2-dsl-specification)
3. [Database Schema](#3-database-schema)
4. [IPC Channel Definitions](#4-ipc-channel-definitions)
5. [Service Design](#5-service-design)
6. [UI Component Tree](#6-ui-component-tree)
7. [High-Fidelity UI Specs](#7-high-fidelity-ui-specs)
8. [Interaction Flows](#8-interaction-flows)
9. [Safety and Security](#9-safety-and-security)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELECTRON MAIN PROCESS                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    COMPOSITION ENGINE (Singleton)                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│  │  │ DSL Parser  │  │  Scheduler  │  │      Action Executor        │ │   │
│  │  │  (Lexer +   │  │  (Cron +    │  │  ┌─────┐ ┌─────┐ ┌─────┐  │ │   │
│  │  │   AST)      │  │   Event)    │  │  │Goal │ │Fin. │ │Learn│  │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  │  │Act. │ │Act. │ │Act. │  │ │   │
│  │         │                │         │  └─────┘ └─────┘ └─────┘  │ │   │
│  │  ┌──────▼──────┐  ┌──────▼──────┐  │  ┌─────┐ ┌─────┐ ┌─────┐  │ │   │
│  │  │  Condition  │  │   Rate      │  │  │ IDE │ │Sys. │ │Canvas│  │ │   │
│  │  │  Evaluator  │  │  Limiter    │  │  │Act. │ │Act. │ │Act. │  │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  │  └─────┘ └─────┘ └─────┘  │ │   │
│  │         │                │         └─────────────────────────────┘ │   │
│  │  ┌──────▼──────┐  ┌──────▼──────┐                                │   │
│  │  │   Audit     │  │   Scope     │                                │   │
│  │  │   Logger    │  │   Checker   │                                │   │
│  │  └─────────────┘  └─────────────┘                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌───────────────────────────▼─────────────────────────────────────┐       │
│  │                      EVENT BUS (Typed Pub/Sub)                   │       │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │       │
│  │   │ goals.* │ │finance.*│ │learn.*  │ │ ide.*   │ │system.* │  │       │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                              │                                              │
│  ┌───────────────────────────▼─────────────────────────────────────┐       │
│  │                 DATA SOURCE REGISTRY (Manifests)                 │       │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │       │
│  │   │ Goals   │ │ Finance │ │ Learning│ │  IDE    │ │ System  │  │       │
│  │   │Adapter  │ │Adapter  │ │Adapter  │ │Adapter  │ │Adapter  │  │       │
│  │   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │       │
│  └────────┼───────────┼───────────┼───────────┼───────────┼───────┘       │
│           │           │           │           │           │                │
│  ┌────────▼───────────▼───────────▼───────────▼───────────▼───────┐       │
│  │              EXISTING SQLITE DATABASE (better-sqlite3)           │       │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │       │
│  │  │ goals  │ │ finance_*│ │ learn_*  │ │ projects │ │canvas_*│  │       │
│  │  │ tables │ │ tables   │ │ tables   │ │ tables   │ │tables  │  │       │
│  │  └────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘  │       │
│  └──────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ IPC
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REACT RENDERER PROCESS                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CompositionsPage (Route)                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│  │  │Composition  │  │ Composition │  │   Create/Edit Dialog        │ │   │
│  │  │   List      │  │   Detail    │  │  ┌─────────┐ ┌─────────┐  │ │   │
│  │  │  (Grid)     │  │   (Modal)   │  │  │ Guided  │ │  DSL    │  │ │   │
│  │  └─────────────┘  └─────────────┘  │  │  Form   │ │ Editor  │  │ │   │
│  │  ┌─────────────┐  ┌─────────────┐  │  └─────────┘ └─────────┘  │ │   │
│  │  │ Activity    │  │   Kill      │  │  ┌─────────────────────┐  │ │   │
│  │  │   Feed      │  │   Switch    │  │  │  Preview / Approval │  │ │   │
│  │  │ (Sidebar)   │  │  (Header)   │  │  └─────────────────────┘  │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌───────────────────────────▼─────────────────────────────────────┐       │
│  │              CompositionContext (React Context)                  │       │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │       │
│  │   │  list   │ │  get    │ │ create  │ │ update  │ │ delete  │  │       │
│  │   │  state  │ │  state  │ │  state  │ │  state  │ │  state  │  │       │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │       │
│  └──────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Philosophy

The system is built on three inviolable principles:

1. **Composition, Not Generation.** The AI never writes code. It writes **declarations** in a bounded DSL. New capabilities emerge from novel combinations of existing database tables, IPC channels, and UI primitives — not from new code.

2. **The System is the Judge.** For ambient goals (e.g., "sleep by 10pm"), the application — not the user — evaluates success or failure based on tracked data. The user can dispute, but cannot self-report.

3. **Auditability Over Convenience.** Every evaluation, every action, every error is persisted. A human must understand what a composition does before it can touch destructive or financial operations.

### 1.3 Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Trigger   │────▶│   Parse &   │────▶│   Condition     │────▶│   Action    │
│   (Event    │     │   Validate  │     │   Evaluation    │     │   Execution   │
│   or Poll)  │     │   DSL AST   │     │   (Query DS)    │     │   (Limited    │
│             │     │             │     │                 │     │   Set)      │
└─────────────┘     └─────────────┘     └─────────────────┘     └─────────────┘
       │                   │                     │                      │
       ▼                   ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUDIT TRAIL (SQLite)                               │
│  composition_executions ──▶ composition_actions ──▶ composition_events      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Feature Connectivity Matrix

| From ↓ / To → | Goals | Learning | Finance | IDE | Canvas | System |
|---|---|---|---|---|---|---|
| **Goals** | — | Read progress | Read budgets | Read sessions | Write cards | Notify |
| **Learning** | Create milestone | — | — | — | — | Notify |
| **Finance** | Create spending goal | — | — | — | — | Alert |
| **IDE** | Create sprint goal | — | — | — | — | Notify |
| **Canvas** | Update goal | Create lesson | Add txn | Update project | — | Notify |
| **System** | Fail sleep goal | — | — | — | — | — |

> **Note:** Write operations to Finance require explicit human approval. Read operations are unrestricted within the user's scope.


---

## 2. DSL Specification

### 2.1 Grammar (EBNF)

```ebnf
COMPOSITION      ::= "COMPOSITION" IDENTIFIER METADATA TRIGGER CONDITION? ACTION CONFIG? "END"

METADATA         ::= ( "NAME" STRING | "DESC" STRING | "VERSION" NUMBER | "AUTHOR" AUTHOR_TYPE )*
AUTHOR_TYPE      ::= "user" | "ai" | "system"

TRIGGER          ::= "WHEN" DATA_SOURCE "." EVENT_NAME [ TRIGGER_PARAMS ]
TRIGGER_PARAMS   ::= "WITH" PARAM ("," PARAM)*
PARAM            ::= IDENTIFIER "=" VALUE

CONDITION        ::= "IF" EXPRESSION
EXPRESSION       ::= TERM ( ("AND" | "OR") TERM )*
TERM             ::= "NOT" TERM | "(" EXPRESSION ")" | COMPARISON
COMPARISON       ::= PATH OPERATOR VALUE
PATH             ::= IDENTIFIER ( "." IDENTIFIER | "[" NUMBER "]" )*
OPERATOR         ::= "==" | "!=" | ">" | "<" | ">=" | "<=" | "CONTAINS" | "MATCHES" | "IN"

ACTION           ::= "THEN" ACTION_ITEM ( "AND" ACTION_ITEM )*
ACTION_ITEM      ::= ACTION_NAME [ ACTION_TARGET ] [ "WITH" PARAM ("," PARAM)* ]
ACTION_NAME      ::= "CREATE_GOAL" | "UPDATE_GOAL" | "COMPLETE_GOAL" | "FAIL_GOAL" |
                     "SEND_NOTIFICATION" | "LOG_EVENT" | "CREATE_LESSON" |
                     "UPDATE_PROGRESS" | "ADD_TRANSACTION" | "UPDATE_WALLET" |
                     "CREATE_CARD" | "UPDATE_CARD" | "ARCHIVE_PROJECT"
ACTION_TARGET    ::= "ON" PATH

CONFIG           ::= "CONFIG" CONFIG_ITEM+
CONFIG_ITEM      ::= "RATE_LIMIT" NUMBER "PER" TIME_UNIT |
                     "COOLDOWN" NUMBER |
                     "TIMEOUT" NUMBER |
                     "RETRIES" NUMBER
TIME_UNIT        ::= "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH"

VALUE            ::= STRING | NUMBER | BOOLEAN | NULL | ARRAY
STRING           ::= '"' CHAR* '"' | "'" CHAR* "'"
NUMBER           ::= ["-"] DIGIT+ ["." DIGIT+]
BOOLEAN          ::= "true" | "false"
NULL             ::= "null"
ARRAY            ::= "[" VALUE ("," VALUE)* "]"
IDENTIFIER       ::= LETTER (LETTER | DIGIT | "_")*
```

### 2.2 Reserved Keywords

```
COMPOSITION, END, NAME, DESC, VERSION, AUTHOR, WHEN, IF, THEN, AND, OR, NOT,
WITH, ON, WHERE, CONTAINS, MATCHES, IN, CONFIG, RATE_LIMIT, PER, COOLDOWN,
TIMEOUT, RETRIES, SECOND, MINUTE, HOUR, DAY, WEEK, MONTH, true, false, null
```

### 2.3 Data Source Namespace

| Feature | Source Path | Schema (Readable Fields) | Triggers | Actions |
|---|---|---|---|---|
| **Goals** | `goals.active` | id, title, description, category, tier, status, progress, target_date, start_date | `goal_created`, `goal_updated`, `goal_completed`, `review_saved` | `CREATE_GOAL`, `UPDATE_GOAL`, `COMPLETE_GOAL`, `FAIL_GOAL` |
| | `goals.completed` | (same as active) | | |
| | `goals.all` | (same + is_pinned, sort_order) | | |
| **Finance** | `finance.transactions` | id, amount, type, category_id, wallet_id, date, merchant | `transaction_added`, `budget_threshold` | `ADD_TRANSACTION` *(approval)* |
| | `finance.wallets` | id, name, type, balance, account_id | `balance_changed` | `UPDATE_WALLET` *(approval)* |
| | `finance.budgets` | id, name, amount, period, alert_threshold | `threshold_reached` | — |
| | `finance.subscriptions` | id, name, price, status, next_renewal | `renewal_due` | — |
| **Learning** | `learning.curricula` | id, name, description, skill_level | `mastery_changed` | `CREATE_LESSON` |
| | `learning.mastery` | curriculum_id, chapter_id, score | `score_updated` | `UPDATE_PROGRESS` |
| | `learning.progress` | lesson_id, status, completed_at | `lesson_completed` | — |
| **IDE** | `ide.projects` | id, name, path, status, last_active | `session_started`, `session_ended` | `ARCHIVE_PROJECT` |
| | `ide.sessions` | project_id, tool_name, duration_sec | `commit_detected` | — |
| | `ide.ai_usage` | project_id, tokens_in, tokens_out, cost | `usage_spike` | — |
| **Canvas** | `canvas.cards` | id, title, type, status, position | `card_created`, `card_updated` | `CREATE_CARD`, `UPDATE_CARD` |
| **System** | `system.time` | hour, minute, day_of_week, date | `time_tick` | — |
| | `system.screen_time` | last_active, total_today, active_window | `threshold_exceeded` | `SEND_NOTIFICATION` |
| | `system.notifications` | — | — | `SEND_NOTIFICATION` |

### 2.4 Production Examples

#### Example A: Ambient Sleep Goal Evaluation

```dsl
COMPOSITION sleep_eval
  NAME "Sleep Goal Auto-Evaluation"
  DESC "Marks sleep goals as failed if screen active past 10pm"
  VERSION 1
  AUTHOR system

  WHEN time.daily WITH hour = 22, minute = 30

  IF goals.active WHERE title CONTAINS "sleep" AND status == "active"
     AND system.screen_time.last_active > "22:00"

  THEN 
    FAIL_GOAL ON goals.active WHERE title CONTAINS "sleep"
      WITH reason = "Screen activity detected past 10pm"
    AND
    SEND_NOTIFICATION 
      WITH title = "Sleep goal auto-evaluated"
      WITH body = "Your sleep goal was marked failed due to late screen activity"
      WITH priority = "low"

  CONFIG
    RATE_LIMIT 1 PER DAY
    COOLDOWN 3600
    TIMEOUT 5

END
```

#### Example B: Budget Alert → Spending Goal

```dsl
COMPOSITION budget_alert_goal
  NAME "Budget Alert to Goal"
  DESC "Creates a spending reduction goal when any budget exceeds 80%"
  VERSION 1
  AUTHOR ai

  WHEN finance.budget_threshold WITH threshold_type = "warning"

  IF finance.budgets WHERE percentage >= 80 AND status == "active"

  THEN
    CREATE_GOAL
      WITH title = "Reduce {category} spending"
      WITH description = "Budget '{name}' is at {percentage}%. Reduce by {remaining}."
      WITH tier = "one_time"
      WITH category = "finance"
      WITH target_date = "+7 days"
    AND
    SEND_NOTIFICATION
      WITH title = "Budget warning: {name}"
      WITH body = "A new spending goal has been created."
      WITH priority = "normal"

  CONFIG
    RATE_LIMIT 1 PER WEEK
    COOLDOWN 86400

END
```

#### Example C: Learning Milestone → Milestone Goal

```dsl
COMPOSITION learning_milestone
  NAME "Learning Milestone Goal"
  DESC "Creates a milestone goal when curriculum mastery reaches 80%"
  VERSION 1
  AUTHOR user

  WHEN learning.mastery_changed

  IF learning.mastery WHERE curriculum_id == {trigger.curriculum_id} AND score >= 80

  THEN
    CREATE_GOAL
      WITH title = "Complete {curriculum_name}"
      WITH tier = "milestone"
      WITH category = "learning"
      WITH target_date = "+14 days"
    AND
    SEND_NOTIFICATION
      WITH title = "Milestone unlocked"
      WITH body = "You've reached 80% mastery in {curriculum_name}."

  CONFIG
    RATE_LIMIT 1 PER MONTH
    COOLDOWN 604800

END
```

#### Example D: IDE Inactivity → Goal Failure

```dsl
COMPOSITION ide_streak_goal
  NAME "IDE Streak Goal Evaluation"
  DESC "Fails a daily coding goal if no IDE session in 3 days"
  VERSION 1
  AUTHOR system

  WHEN time.daily WITH hour = 23, minute = 59

  IF goals.active WHERE title CONTAINS "code" AND tier == "daily_habit"
     AND ide.sessions WHERE last_session < "-3 days"

  THEN
    FAIL_GOAL ON goals.active WHERE title CONTAINS "code"
      WITH reason = "No coding activity for 3+ days"

  CONFIG
    RATE_LIMIT 1 PER DAY
    TIMEOUT 10

END
```

### 2.5 Variable Interpolation

Values in action parameters support template substitution using `{path}` syntax, resolved at evaluation time from the trigger payload or queried data:

- `{trigger.curriculum_id}` — value from the trigger event payload
- `{goals.active.title}` — first matching value from a queried data source
- `{finance.budgets.name}` — first matching budget name
- `{system.time.date}` — current date string

Interpolation is performed **after** condition evaluation and **before** action execution.


---

## 3. Database Schema

All tables use the existing SQLite database. Foreign keys reference existing tables where applicable.

```sql
-- ============================================================
-- 3.1 Core Composition Storage
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_compositions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  dsl_source TEXT NOT NULL,
  status TEXT DEFAULT 'draft' 
    CHECK(status IN ('draft','active','paused','error','disabled','pending_approval')),
  version INTEGER DEFAULT 1,
  author TEXT DEFAULT 'user' CHECK(author IN ('user','ai','system')),
  metadata TEXT, -- JSON: {tags, category, icon}

  -- Runtime state
  last_evaluated_at TEXT,
  last_error TEXT,
  evaluation_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,

  -- Safety config (overrides DSL CONFIG block)
  rate_limit_count INTEGER DEFAULT 10,
  rate_limit_period TEXT DEFAULT 'hour' CHECK(rate_limit_period IN ('second','minute','hour','day','week','month')),
  cooldown_seconds INTEGER DEFAULT 60,
  timeout_seconds INTEGER DEFAULT 5,
  max_retries INTEGER DEFAULT 0,

  -- Approval state
  approval_status TEXT DEFAULT 'auto' 
    CHECK(approval_status IN ('auto','pending','approved','rejected')),
  approval_required_for TEXT, -- JSON array of action names
  approved_by TEXT,
  approved_at TEXT,

  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- 3.2 Execution Audit Trail
-- ============================================================

CREATE TABLE IF NOT EXISTS composition_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  composition_id TEXT NOT NULL REFERENCES agent_compositions(id) ON DELETE CASCADE,

  -- Trigger context
  trigger_source TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_payload TEXT, -- JSON

  -- Evaluation result
  evaluation_result TEXT NOT NULL 
    CHECK(evaluation_result IN ('success','condition_false','error','rate_limited','timeout','approval_pending')),
  condition_matched INTEGER DEFAULT 0,

  -- Performance
  execution_time_ms INTEGER,

  -- Error context
  error_message TEXT,
  error_stack TEXT,

  -- Serialized snapshot of the AST evaluated
  ast_snapshot TEXT, -- JSON

  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_exec_composition ON composition_executions(composition_id);
CREATE INDEX IF NOT EXISTS idx_exec_result ON composition_executions(evaluation_result);
CREATE INDEX IF NOT EXISTS idx_exec_created ON composition_executions(created_at);

-- ============================================================
-- 3.3 Action-Level Audit Log
-- ============================================================

CREATE TABLE IF NOT EXISTS composition_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id INTEGER NOT NULL REFERENCES composition_executions(id) ON DELETE CASCADE,
  composition_id TEXT NOT NULL,

  action_sequence INTEGER DEFAULT 0,
  action_type TEXT NOT NULL,
  target_feature TEXT,
  target_id TEXT,
  payload TEXT, -- JSON of parameters sent

  result TEXT NOT NULL CHECK(result IN ('success','error','forbidden','skipped')),
  error_message TEXT,

  -- Before/after state for critical actions
  state_before TEXT, -- JSON
  state_after TEXT, -- JSON

  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_action_exec ON composition_actions(execution_id);
CREATE INDEX IF NOT EXISTS idx_action_comp ON composition_actions(composition_id);

-- ============================================================
-- 3.4 Event Bus Persistence (Crash Recovery)
-- ============================================================

CREATE TABLE IF NOT EXISTS composition_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  source_feature TEXT NOT NULL,
  payload TEXT, -- JSON
  processed INTEGER DEFAULT 0,
  processed_at TEXT,
  composition_ids TEXT, -- JSON array of compositions that handled this
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_events_unprocessed ON composition_events(processed, created_at);

-- ============================================================
-- 3.5 Rate Limit Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS composition_rate_limits (
  composition_id TEXT PRIMARY KEY REFERENCES agent_compositions(id) ON DELETE CASCADE,
  window_start TEXT NOT NULL,
  window_count INTEGER DEFAULT 0,
  last_executed_at TEXT,
  total_executions INTEGER DEFAULT 0
);

-- ============================================================
-- 3.6 Data Source Registry Cache
-- ============================================================

CREATE TABLE IF NOT EXISTS composition_data_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT CHECK(source_type IN ('query','event','aggregate')),
  schema TEXT, -- JSON Schema of available fields
  triggers TEXT, -- JSON array of {name, params[]}
  actions TEXT, -- JSON array of {name, params[], requiresApproval, destructive}
  query_template TEXT, -- SQL template with :params
  is_active INTEGER DEFAULT 1,
  UNIQUE(feature, source_name)
);

-- ============================================================
-- 3.7 System Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS composition_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- Seed settings
INSERT OR IGNORE INTO composition_settings (key, value) VALUES 
  ('global_enabled', 'true'),
  ('max_compositions', '100'),
  ('max_executions_per_day', '1000'),
  ('max_actions_per_execution', '100'),
  ('default_timeout_seconds', '5'),
  ('require_approval_for_finance', 'true'),
  ('require_approval_for_destructive', 'true'),
  ('log_retention_days', '90');
```


---

## 4. IPC Channel Definitions

### 4.1 Preload Bindings (`preload.ts`)

```typescript
// Composition CRUD
compositionsList: (filters?: { status?: string; author?: string }) => 
  ipcRenderer.invoke('compositions:list', filters),
compositionsGet: (id: string) => 
  ipcRenderer.invoke('compositions:get', id),
compositionsCreate: (data: { name: string; description?: string; dsl_source: string; author?: string }) => 
  ipcRenderer.invoke('compositions:create', data),
compositionsUpdate: (data: { id: string; name?: string; description?: string; dsl_source?: string; config?: any }) => 
  ipcRenderer.invoke('compositions:update', data),
compositionsDelete: (id: string) => 
  ipcRenderer.invoke('compositions:delete', id),

// Lifecycle
compositionsToggle: (id: string, active: boolean) => 
  ipcRenderer.invoke('compositions:toggle', id, active),
compositionsExecute: (id: string, manualTrigger?: any) => 
  ipcRenderer.invoke('compositions:execute', id, manualTrigger),
compositionsValidate: (dsl: string) => 
  ipcRenderer.invoke('compositions:validate', dsl),

// Audit & Logs
compositionsGetExecutions: (id: string, options?: { limit?: number; offset?: number; result?: string }) => 
  ipcRenderer.invoke('compositions:get-executions', id, options),
compositionsGetLogs: (executionId: number) => 
  ipcRenderer.invoke('compositions:get-logs', executionId),
compositionsGetActivityFeed: (options?: { limit?: number; feature?: string }) => 
  ipcRenderer.invoke('compositions:get-activity-feed', options),

// Registry & Settings
compositionsGetDataSources: () => 
  ipcRenderer.invoke('compositions:get-data-sources'),
compositionsGetSettings: () => 
  ipcRenderer.invoke('compositions:get-settings'),
compositionsUpdateSettings: (data: Record<string, string>) => 
  ipcRenderer.invoke('compositions:update-settings', data),
compositionsKillSwitch: (enabled: boolean) => 
  ipcRenderer.invoke('compositions:kill-switch', enabled),

// Approval Flow
compositionsApprove: (id: string, approved: boolean, reason?: string) => 
  ipcRenderer.invoke('compositions:approve', id, approved, reason),

// AI Suggestion
compositionsSuggest: (prompt: string, context?: any) => 
  ipcRenderer.invoke('compositions:suggest', prompt, context),
compositionsPreview: (dsl: string) => 
  ipcRenderer.invoke('compositions:preview', dsl),
```

### 4.2 Main Process Handlers (`main.ts`)

| Channel | Payload | Returns | Description |
|---|---|---|---|
| `compositions:list` | `{ status?, author? }` | `{ compositions: AgentComposition[] }` | List with optional filters |
| `compositions:get` | `id: string` | `{ composition: AgentComposition \| null }` | Single composition |
| `compositions:create` | `{ name, description?, dsl_source, author? }` | `{ composition: AgentComposition; approvalRequired: boolean }` | Creates draft, returns if approval needed |
| `compositions:update` | `{ id, ...partial }` | `{ composition: AgentComposition }` | Update metadata or DSL |
| `compositions:delete` | `id: string` | `{ success: boolean }` | Hard delete + cascade |
| `compositions:toggle` | `id: string, active: boolean` | `{ composition: AgentComposition }` | Activate/pause |
| `compositions:execute` | `id: string, manualTrigger?` | `{ execution: CompositionExecution }` | Manual trigger |
| `compositions:validate` | `dsl: string` | `{ valid: boolean; errors: string[]; ast?: object }` | Syntax & semantic validation |
| `compositions:get-executions` | `id: string, { limit?, offset?, result? }` | `{ executions: CompositionExecution[], total: number }` | Paginated history |
| `compositions:get-logs` | `executionId: number` | `{ actions: CompositionAction[] }` | Action-level log |
| `compositions:get-activity-feed` | `{ limit?, feature? }` | `{ items: ActivityFeedItem[] }` | Global activity |
| `compositions:get-data-sources` | — | `{ sources: DataSourceManifest[] }` | Full registry |
| `compositions:get-settings` | — | `{ settings: Record<string, string> }` | System settings |
| `compositions:update-settings` | `Record<string, string>` | `{ settings: Record<string, string> }` | Update settings |
| `compositions:kill-switch` | `enabled: boolean` | `{ enabled: boolean }` | Global toggle |
| `compositions:approve` | `id: string, approved: boolean, reason?` | `{ composition: AgentComposition }` | Approve/reject pending |
| `compositions:suggest` | `prompt: string, context?` | `{ dsl: string \| null; explanation: string }` | AI-generated DSL |
| `compositions:preview` | `dsl: string` | `{ plainEnglish: string; actions: string[]; approvalRequired: boolean }` | Human-readable preview |

### 4.3 TypeScript Interfaces

```typescript
// AgentComposition maps to agent_compositions table
interface AgentComposition {
  id: string;
  name: string;
  description: string;
  dsl_source: string;
  status: 'draft' | 'active' | 'paused' | 'error' | 'disabled' | 'pending_approval';
  version: number;
  author: 'user' | 'ai' | 'system';
  metadata: Record<string, any> | null;
  last_evaluated_at: string | null;
  last_error: string | null;
  evaluation_count: number;
  error_count: number;
  success_count: number;
  approval_status: 'auto' | 'pending' | 'approved' | 'rejected';
  approval_required_for: string[] | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CompositionExecution {
  id: number;
  composition_id: string;
  trigger_source: string;
  trigger_event: string;
  trigger_payload: any;
  evaluation_result: 'success' | 'condition_false' | 'error' | 'rate_limited' | 'timeout' | 'approval_pending';
  condition_matched: boolean;
  execution_time_ms: number;
  error_message: string | null;
  ast_snapshot: any;
  created_at: string;
}

interface CompositionAction {
  id: number;
  execution_id: number;
  composition_id: string;
  action_sequence: number;
  action_type: string;
  target_feature: string | null;
  target_id: string | null;
  payload: any;
  result: 'success' | 'error' | 'forbidden' | 'skipped';
  error_message: string | null;
  state_before: any;
  state_after: any;
  created_at: string;
}

interface DataSourceManifest {
  feature: string;
  sources: DataSource[];
  triggers: TriggerDef[];
  actions: ActionDef[];
}

interface DataSource {
  name: string;
  type: 'query' | 'event' | 'aggregate';
  schema: Record<string, string>;
  description: string;
}

interface TriggerDef {
  name: string;
  description: string;
  params: ParamDef[];
  schedule?: boolean;
}

interface ActionDef {
  name: string;
  description: string;
  params: ParamDef[];
  requiresApproval: boolean;
  destructive: boolean;
}

interface ParamDef {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json';
  required: boolean;
  enumValues?: string[];
  description: string;
}

interface ActivityFeedItem {
  id: number;
  composition_id: string;
  composition_name: string;
  trigger_source: string;
  result: string;
  action_count: number;
  created_at: string;
}
```


---

## 5. Service Design

### 5.1 CompositionEngine Class

```typescript
class CompositionEngine {
  private parser: DSLParser;
  private registry: DataSourceRegistry;
  private eventBus: EventBus;
  private scheduler: Scheduler;
  private rateLimiter: RateLimiter;
  private scopeChecker: ScopeChecker;
  private actionExecutor: ActionExecutor;
  private auditLogger: AuditLogger;
  private db: Database; // better-sqlite3

  // Active composition cache
  private compositions: Map<string, ParsedComposition> = new Map();
  private globalEnabled: boolean = true;

  constructor(db: Database) {
    this.db = db;
    this.parser = new DSLParser();
    this.registry = new DataSourceRegistry(db);
    this.eventBus = new EventBus();
    this.scheduler = new Scheduler(this.eventBus);
    this.rateLimiter = new RateLimiter(db);
    this.scopeChecker = new ScopeChecker(this.registry);
    this.actionExecutor = new ActionExecutor(this.registry);
    this.auditLogger = new AuditLogger(db);

    this.loadCompositions();
    this.registerSystemTriggers();
  }

  // Load all active compositions from DB into memory
  private loadCompositions(): void {
    const rows = this.db.prepare(
      `SELECT * FROM agent_compositions WHERE status IN ('active', 'paused', 'error')`
    ).all();

    for (const row of rows) {
      this.registerComposition(row);
    }
  }

  // Parse and register a composition
  private registerComposition(row: any): void {
    try {
      const ast = this.parser.parse(row.dsl_source);
      const validation = this.parser.validate(ast, this.registry);

      if (!validation.valid) {
        this.setCompositionError(row.id, validation.errors.join('; '));
        return;
      }

      const parsed: ParsedComposition = {
        id: row.id,
        ast,
        metadata: ast.metadata,
        trigger: ast.trigger,
        condition: ast.condition,
        actions: ast.actions,
        config: { ...ast.config, ...this.extractDbConfig(row) },
        status: row.status
      };

      this.compositions.set(row.id, parsed);

      // Subscribe to trigger events
      const triggerKey = `${parsed.trigger.source}.${parsed.trigger.event}`;
      this.eventBus.subscribe(triggerKey, (event) => this.evaluate(row.id, event));

      // Register scheduled triggers
      if (parsed.trigger.source === 'time') {
        this.scheduler.schedule(row.id, parsed.trigger);
      }
    } catch (err) {
      this.setCompositionError(row.id, err.message);
    }
  }

  // Core evaluation loop
  async evaluate(compositionId: string, event: CompositionEvent): Promise<EvaluationResult> {
    if (!this.globalEnabled) {
      return { result: 'skipped', reason: 'global_kill_switch' };
    }

    const comp = this.compositions.get(compositionId);
    if (!comp || comp.status !== 'active') {
      return { result: 'skipped', reason: 'not_active' };
    }

    const startTime = Date.now();
    let executionId: number | null = null;

    try {
      // Rate limit check
      if (!this.rateLimiter.check(compositionId, comp.config)) {
        executionId = this.auditLogger.logExecution(compositionId, event, 'rate_limited', null, 0);
        return { result: 'rate_limited', executionId };
      }

      // Scope check
      const scopeResult = this.scopeChecker.verify(comp);
      if (!scopeResult.allowed) {
        executionId = this.auditLogger.logExecution(compositionId, event, 'error', scopeResult.reason, 0);
        return { result: 'error', reason: scopeResult.reason, executionId };
      }

      // Evaluate condition (if present)
      let conditionMatched = true;
      if (comp.condition) {
        conditionMatched = await this.evaluateCondition(comp.condition, event);
      }

      if (!conditionMatched) {
        executionId = this.auditLogger.logExecution(compositionId, event, 'condition_false', null, Date.now() - startTime);
        return { result: 'condition_false', executionId };
      }

      // Check approval for sensitive actions
      const pendingApproval = this.checkApprovalRequired(comp);
      if (pendingApproval.required) {
        executionId = this.auditLogger.logExecution(compositionId, event, 'approval_pending', null, Date.now() - startTime);
        this.updateCompositionStatus(compositionId, 'pending_approval');
        return { result: 'approval_pending', actions: pendingApproval.actions, executionId };
      }

      // Execute actions
      const actionResults: ActionResult[] = [];
      for (let i = 0; i < comp.actions.length; i++) {
        const action = comp.actions[i];

        // Timeout guard
        const actionPromise = this.actionExecutor.execute(action, { compositionId, event, registry: this.registry });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Action timeout')), comp.config.timeout * 1000)
        );

        const result = await Promise.race([actionPromise, timeoutPromise]).catch(err => ({
          success: false,
          error: err.message
        }));

        actionResults.push(result as ActionResult);

        if (!result.success && comp.config.max_retries && comp.config.max_retries > 0) {
          // Retry logic omitted for brevity
        }
      }

      const elapsed = Date.now() - startTime;
      executionId = this.auditLogger.logExecution(compositionId, event, 'success', null, elapsed);

      // Log individual actions
      for (let i = 0; i < actionResults.length; i++) {
        this.auditLogger.logAction(executionId, compositionId, comp.actions[i], actionResults[i], i);
      }

      this.rateLimiter.record(compositionId);
      this.updateCompositionStats(compositionId, true);

      return { result: 'success', executionId, actions: actionResults };

    } catch (err) {
      const elapsed = Date.now() - startTime;
      executionId = this.auditLogger.logExecution(compositionId, event, 'error', err.message, elapsed);
      this.setCompositionError(compositionId, err.message);
      return { result: 'error', reason: err.message, executionId };
    }
  }

  // Condition evaluation against live data
  private async evaluateCondition(condition: ConditionNode, event: CompositionEvent): Promise<boolean> {
    switch (condition.type) {
      case 'and':
        return await this.evaluateCondition(condition.left, event) && 
               await this.evaluateCondition(condition.right, event);
      case 'or':
        return await this.evaluateCondition(condition.left, event) || 
               await this.evaluateCondition(condition.right, event);
      case 'not':
        return !await this.evaluateCondition(condition.operand, event);
      case 'comparison':
        const value = await this.registry.queryValue(condition.path, event);
        return this.compare(value, condition.operator, condition.value);
      default:
        return false;
    }
  }

  private compare(left: any, operator: string, right: any): boolean {
    switch (operator) {
      case '==': return left == right;
      case '!=': return left != right;
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case 'CONTAINS': return String(left).includes(String(right));
      case 'MATCHES': return new RegExp(String(right)).test(String(left));
      case 'IN': return Array.isArray(right) ? right.includes(left) : false;
      default: return false;
    }
  }

  // Public API for IPC handlers
  public createComposition(data: CreateCompositionData): { composition: AgentComposition; approvalRequired: boolean } { /* ... */ }
  public updateComposition(id: string, data: UpdateCompositionData): AgentComposition { /* ... */ }
  public deleteComposition(id: string): boolean { /* ... */ }
  public toggleComposition(id: string, active: boolean): AgentComposition { /* ... */ }
  public validateDSL(dsl: string): ValidationResult { /* ... */ }
  public getDataSources(): DataSourceManifest[] { return this.registry.list(); }
  public setKillSwitch(enabled: boolean): void { this.globalEnabled = enabled; }
  public approveComposition(id: string, approved: boolean): AgentComposition { /* ... */ }

  // Helpers
  private setCompositionError(id: string, error: string): void { /* ... */ }
  private updateCompositionStats(id: string, success: boolean): void { /* ... */ }
  private updateCompositionStatus(id: string, status: string): void { /* ... */ }
  private extractDbConfig(row: any): ConfigNode { /* ... */ }
  private checkApprovalRequired(comp: ParsedComposition): { required: boolean; actions: string[] } { /* ... */ }
}
```

### 5.2 DSLParser

```typescript
class DSLParser {
  private lexer: DSLLexer;

  parse(source: string): CompositionAST {
    const tokens = this.lexer.tokenize(source);
    return this.parseComposition(tokens);
  }

  validate(ast: CompositionAST, registry: DataSourceRegistry): ValidationResult {
    const errors: string[] = [];

    // Validate trigger source exists
    if (!registry.hasTrigger(ast.trigger.source, ast.trigger.event)) {
      errors.push(`Unknown trigger: ${ast.trigger.source}.${ast.trigger.event}`);
    }

    // Validate condition paths
    if (ast.condition) {
      this.validateConditionPaths(ast.condition, registry, errors);
    }

    // Validate actions
    for (const action of ast.actions) {
      if (!registry.hasAction(action.name)) {
        errors.push(`Unknown action: ${action.name}`);
      }
      // Validate action parameters against schema
      const actionDef = registry.getAction(action.name);
      if (actionDef) {
        this.validateParams(action.params, actionDef.params, errors);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private parseComposition(tokens: Token[]): CompositionAST { /* recursive descent */ }
  private parseMetadata(tokens: Token[]): CompositionMetadata { /* ... */ }
  private parseTrigger(tokens: Token[]): TriggerNode { /* ... */ }
  private parseCondition(tokens: Token[]): ConditionNode { /* ... */ }
  private parseExpression(tokens: Token[]): ConditionNode { /* ... */ }
  private parseAction(tokens: Token[]): ActionNode[] { /* ... */ }
  private parseConfig(tokens: Token[]): ConfigNode { /* ... */ }
  private validateConditionPaths(node: ConditionNode, registry: DataSourceRegistry, errors: string[]): void { /* ... */ }
  private validateParams(params: Record<string, any>, defs: ParamDef[], errors: string[]): void { /* ... */ }
}
```

### 5.3 DataSourceRegistry

```typescript
class DataSourceRegistry {
  private manifests: Map<string, DataSourceManifest> = new Map();
  private queryAdapters: Map<string, QueryAdapter> = new Map();
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.registerBuiltInAdapters();
    this.loadFromDatabase();
  }

  private registerBuiltInAdapters(): void {
    // Goals adapter
    this.queryAdapters.set('goals.active', {
      query: (params: any) => this.db.prepare(`SELECT * FROM goals WHERE status = 'active'`).all(),
      schema: { id: 'number', title: 'string', status: 'string', progress: 'number', tier: 'string' }
    });

    this.queryAdapters.set('goals.completed', {
      query: () => this.db.prepare(`SELECT * FROM goals WHERE status = 'completed'`).all(),
      schema: { id: 'number', title: 'string', completed_at: 'string' }
    });

    // Finance adapters
    this.queryAdapters.set('finance.transactions', {
      query: (params: any) => {
        const limit = params.limit || 100;
        return this.db.prepare(`SELECT * FROM finance_transactions ORDER BY date DESC LIMIT ?`).all(limit);
      },
      schema: { id: 'number', amount: 'number', type: 'string', date: 'string' }
    });

    this.queryAdapters.set('finance.wallets', {
      query: () => this.db.prepare(`SELECT * FROM finance_wallets WHERE archived = 0`).all(),
      schema: { id: 'number', name: 'string', type: 'string', balance: 'number' }
    });

    this.queryAdapters.set('finance.budgets', {
      query: () => this.db.prepare(`SELECT * FROM finance_budgets`).all(),
      schema: { id: 'number', name: 'string', amount: 'number', period: 'string' }
    });

    // Learning adapters
    this.queryAdapters.set('learning.mastery', {
      query: (params: any) => this.db.prepare(`SELECT * FROM learn_mastery WHERE curriculum_id = ?`).all(params.curriculum_id),
      schema: { curriculum_id: 'number', chapter_id: 'number', score: 'number' }
    });

    this.queryAdapters.set('learning.progress', {
      query: () => this.db.prepare(`SELECT * FROM learn_user_progress WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 50`).all(),
      schema: { lesson_id: 'number', status: 'string', completed_at: 'string' }
    });

    // IDE adapters
    this.queryAdapters.set('ide.projects', {
      query: () => this.db.prepare(`SELECT * FROM projects WHERE status = 'active'`).all(),
      schema: { id: 'string', name: 'string', last_active: 'string' }
    });

    this.queryAdapters.set('ide.sessions', {
      query: (params: any) => {
        const projectId = params.project_id;
        return this.db.prepare(`SELECT * FROM project_sessions WHERE project_id = ? ORDER BY start_time DESC LIMIT 10`).all(projectId);
      },
      schema: { project_id: 'string', tool_name: 'string', duration_sec: 'number' }
    });

    // System adapters
    this.queryAdapters.set('system.time', {
      query: () => [{ hour: new Date().getHours(), minute: new Date().getMinutes(), day_of_week: new Date().getDay(), date: new Date().toISOString().split('T')[0] }],
      schema: { hour: 'number', minute: 'number', day_of_week: 'number', date: 'string' }
    });

    this.queryAdapters.set('system.screen_time', {
      query: () => {
        const lastActive = this.db.prepare(`SELECT MAX(timestamp) as last_active FROM screen_time_events`).get();
        return [{ last_active: lastActive?.last_active || null, total_today: 0 }];
      },
      schema: { last_active: 'string', total_today: 'number' }
    });

    // Canvas adapters
    this.queryAdapters.set('canvas.cards', {
      query: () => {
        const cards = JSON.parse(localStorage.getItem('canvas_default') || '[]');
        return cards;
      },
      schema: { id: 'string', title: 'string', type: 'string', status: 'string' }
    });
  }

  async queryValue(path: string, event: CompositionEvent): Promise<any> {
    const parts = path.split('.');
    const sourceName = parts.slice(0, 2).join('.'); // e.g., "goals.active"
    const fieldPath = parts.slice(2).join('.'); // e.g., "title"

    const adapter = this.queryAdapters.get(sourceName);
    if (!adapter) return undefined;

    const rows = await adapter.query(event.payload || {});
    if (!rows || rows.length === 0) return undefined;

    // Return first matching row's field value
    // For array access like goals.active[0].title, handle indexing
    return this.extractField(rows, fieldPath);
  }

  private extractField(rows: any[], path: string): any {
    // Handle array indexing: "goals.active[0].title"
    // Simplified: return first row's property
    const firstRow = rows[0];
    if (!firstRow) return undefined;
    return path.split('.').reduce((obj, key) => obj?.[key], firstRow);
  }

  hasTrigger(source: string, event: string): boolean { /* ... */ }
  hasAction(name: string): boolean { /* ... */ }
  getAction(name: string): ActionDef | undefined { /* ... */ }
  list(): DataSourceManifest[] { return Array.from(this.manifests.values()); }

  private loadFromDatabase(): void {
    // Load any user-registered custom data sources from composition_data_sources
    const rows = this.db.prepare(`SELECT * FROM composition_data_sources WHERE is_active = 1`).all();
    for (const row of rows) {
      // Register custom adapters
    }
  }
}
```


### 5.4 ActionExecutor

```typescript
class ActionExecutor {
  private handlers: Map<string, ActionHandler> = new Map();
  private registry: DataSourceRegistry;

  constructor(registry: DataSourceRegistry) {
    this.registry = registry;
    this.registerBuiltInHandlers();
  }

  private registerBuiltInHandlers(): void {
    // Goal actions
    this.handlers.set('CREATE_GOAL', async (params, context) => {
      const result = await ipcMain.handle('goals:create', null, params);
      return { success: true, data: result };
    });

    this.handlers.set('UPDATE_GOAL', async (params, context) => {
      const { where, ...updateData } = params;
      const targets = await this.resolveTargets('goals.active', where);
      for (const id of targets) {
        await ipcMain.handle('goals:update', null, { id, ...updateData });
      }
      return { success: true, affected: targets.length };
    });

    this.handlers.set('COMPLETE_GOAL', async (params, context) => {
      const targets = await this.resolveTargets('goals.active', params.where);
      for (const id of targets) {
        await ipcMain.handle('goals:update', null, { id, status: 'completed', progress: 100, completed_at: new Date().toISOString() });
      }
      return { success: true, affected: targets.length };
    });

    this.handlers.set('FAIL_GOAL', async (params, context) => {
      const targets = await this.resolveTargets('goals.active', params.where);
      for (const id of targets) {
        await ipcMain.handle('goals:update', null, { id, status: 'abandoned', progress: 0 });
      }
      return { success: true, affected: targets.length };
    });

    // Notification action
    this.handlers.set('SEND_NOTIFICATION', async (params, context) => {
      const { title, body, priority = 'normal' } = params;
      await ipcMain.handle('show-notification', null, title, body);
      return { success: true };
    });

    // Log action
    this.handlers.set('LOG_EVENT', async (params, context) => {
      console.log(`[Composition ${context.compositionId}]`, params.message);
      return { success: true };
    });

    // Learning actions
    this.handlers.set('CREATE_LESSON', async (params, context) => {
      const result = await ipcMain.handle('learn:create-lesson', null, params);
      return { success: true, data: result };
    });

    this.handlers.set('UPDATE_PROGRESS', async (params, context) => {
      return { success: true };
    });

    // Finance actions (require approval)
    this.handlers.set('ADD_TRANSACTION', async (params, context) => {
      if (!await this.checkApproval(context.compositionId, 'ADD_TRANSACTION')) {
        return { success: false, error: 'Action requires approval' };
      }
      const result = await ipcMain.handle('finance:add-transaction', null, params);
      return { success: true, data: result };
    });

    this.handlers.set('UPDATE_WALLET', async (params, context) => {
      if (!await this.checkApproval(context.compositionId, 'UPDATE_WALLET')) {
        return { success: false, error: 'Action requires approval' };
      }
      const result = await ipcMain.handle('finance:update-wallet', null, params);
      return { success: true, data: result };
    });

    // Canvas actions
    this.handlers.set('CREATE_CARD', async (params, context) => {
      return { success: true };
    });

    this.handlers.set('UPDATE_CARD', async (params, context) => {
      return { success: true };
    });

    // IDE actions
    this.handlers.set('ARCHIVE_PROJECT', async (params, context) => {
      const result = await ipcMain.handle('update-ide-project', null, { id: params.id, status: 'archived' });
      return { success: true, data: result };
    });
  }

  async execute(action: ActionNode, context: ExecutionContext): Promise<ActionResult> {
    const handler = this.handlers.get(action.name);
    if (!handler) {
      return { success: false, error: `Unknown action: ${action.name}` };
    }

    try {
      const interpolatedParams = this.interpolateParams(action.params, context);
      return await handler(interpolatedParams, context);
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  private interpolateParams(params: Record<string, any>, context: ExecutionContext): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.includes('{')) {
        result[key] = value.replace(/\{([^}]+)\}/g, (match, path) => {
          return this.registry.queryValue(path, context.event) || match;
        });
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private async resolveTargets(source: string, whereClause: any): Promise<string[]> {
    return [];
  }

  private async checkApproval(compositionId: string, actionType: string): Promise<boolean> {
    return true;
  }
}
```

### 5.5 EventBus

```typescript
interface CompositionEvent {
  type: string;
  source: string;
  payload: any;
  timestamp: number;
}

type EventHandler = (event: CompositionEvent) => void;
type UnsubscribeFn = () => void;

class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private db: Database | null;

  constructor(db?: Database) {
    this.db = db || null;
  }

  subscribe(eventType: string, handler: EventHandler): UnsubscribeFn {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  emit(event: CompositionEvent): void {
    if (this.db) {
      this.db.prepare(`
        INSERT INTO composition_events (event_type, source_feature, payload, processed)
        VALUES (?, ?, ?, 0)
      `).run(event.type, event.source, JSON.stringify(event.payload));
    }

    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`EventBus handler error for ${event.type}:`, err);
        }
      }
    }

    const wildcards = this.listeners.get('*');
    if (wildcards) {
      for (const handler of wildcards) {
        try {
          handler(event);
        } catch (err) {
          console.error(`EventBus wildcard handler error:`, err);
        }
      }
    }
  }

  emitAsync(event: CompositionEvent): Promise<void> {
    return new Promise((resolve) => {
      setImmediate(() => {
        this.emit(event);
        resolve();
      });
    });
  }

  replayUnprocessed(): void {
    if (!this.db) return;
    const events = this.db.prepare(`
      SELECT * FROM composition_events 
      WHERE processed = 0 
      ORDER BY created_at ASC 
      LIMIT 100
    `).all();

    for (const row of events) {
      this.emit({
        type: row.event_type,
        source: row.source_feature,
        payload: JSON.parse(row.payload || '{}'),
        timestamp: new Date(row.created_at).getTime()
      });

      this.db.prepare(`UPDATE composition_events SET processed = 1 WHERE id = ?`).run(row.id);
    }
  }
}
```

### 5.6 Scheduler

```typescript
class Scheduler {
  private eventBus: EventBus;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  schedule(compositionId: string, trigger: TriggerNode): void {
    this.cancel(compositionId);

    if (trigger.source !== 'time') return;

    const params = trigger.params || {};

    if (trigger.event === 'daily') {
      const hour = params.hour || 0;
      const minute = params.minute || 0;
      this.scheduleDaily(compositionId, hour, minute);
    } else if (trigger.event === 'interval') {
      const minutes = params.minutes || 60;
      this.scheduleInterval(compositionId, minutes * 60 * 1000);
    } else if (trigger.event === 'weekly') {
      const day = params.day || 0;
      const hour = params.hour || 0;
      const minute = params.minute || 0;
      this.scheduleWeekly(compositionId, day, hour, minute);
    }
  }

  private scheduleDaily(id: string, hour: number, minute: number): void {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target.getTime() - now.getTime();

    const timer = setTimeout(() => {
      this.eventBus.emit({
        type: `time.daily`,
        source: 'system',
        payload: { hour, minute, date: target.toISOString() },
        timestamp: Date.now()
      });
      this.scheduleDaily(id, hour, minute);
    }, delay);

    this.timers.set(id, timer);
  }

  private scheduleInterval(id: string, ms: number): void {
    const timer = setInterval(() => {
      this.eventBus.emit({
        type: `time.interval`,
        source: 'system',
        payload: { interval_ms: ms },
        timestamp: Date.now()
      });
    }, ms);

    this.timers.set(id, timer);
  }

  private scheduleWeekly(id: string, day: number, hour: number, minute: number): void {
    // Similar to daily but with day-of-week check
  }

  cancel(compositionId: string): void {
    const timer = this.timers.get(compositionId);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.timers.delete(compositionId);
    }
  }

  cancelAll(): void {
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.clear();
  }
}
```

### 5.7 RateLimiter

```typescript
class RateLimiter {
  private db: Database;
  private memoryCache: Map<string, { windowStart: number; count: number }> = new Map();

  constructor(db: Database) {
    this.db = db;
  }

  check(compositionId: string, config: ConfigNode): boolean {
    const periodMs = this.parsePeriod(config.rateLimit?.per || 'hour');
    const maxCount = config.rateLimit?.count || 10;
    const cooldownMs = (config.cooldown || 60) * 1000;

    const now = Date.now();
    const cache = this.memoryCache.get(compositionId);

    if (cache) {
      if (now - cache.windowStart > periodMs) {
        cache.windowStart = now;
        cache.count = 0;
      }
      if (cache.count >= maxCount) return false;
    }

    const row = this.db.prepare(`
      SELECT window_start, window_count, last_executed_at 
      FROM composition_rate_limits 
      WHERE composition_id = ?
    `).get(compositionId);

    if (row) {
      const windowStart = new Date(row.window_start).getTime();
      if (now - windowStart > periodMs) {
        this.db.prepare(`
          UPDATE composition_rate_limits 
          SET window_start = datetime('now'), window_count = 0 
          WHERE composition_id = ?
        `).run(compositionId);
      } else if (row.window_count >= maxCount) {
        return false;
      }

      if (row.last_executed_at) {
        const lastExec = new Date(row.last_executed_at).getTime();
        if (now - lastExec < cooldownMs) return false;
      }
    }

    return true;
  }

  record(compositionId: string): void {
    const now = Date.now();
    const cache = this.memoryCache.get(compositionId);
    if (cache) {
      cache.count++;
    } else {
      this.memoryCache.set(compositionId, { windowStart: now, count: 1 });
    }

    this.db.prepare(`
      INSERT INTO composition_rate_limits (composition_id, window_start, window_count, last_executed_at)
      VALUES (?, datetime('now'), 1, datetime('now'))
      ON CONFLICT(composition_id) DO UPDATE SET
        window_count = window_count + 1,
        last_executed_at = datetime('now')
    `).run(compositionId);
  }

  private parsePeriod(period: string): number {
    const map: Record<string, number> = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    return map[period] || map.hour;
  }
}
```


---

## 6. UI Component Tree

```
src/
├── pages/
│   └── CompositionsPage.tsx          # Route entry, layout shell
├── components/
│   └── compositions/
│       ├── CompositionHeader.tsx     # Title + KillSwitch + Create button
│       ├── CompositionTabs.tsx       # shadcn Tabs (Active/Paused/Error/Pending/All)
│       ├── CompositionList.tsx       # Grid container, filtering logic
│       ├── CompositionCard.tsx       # Glass card with status, stats, actions
│       ├── CompositionEmptyState.tsx # Illustration + CTA when no compositions
│       ├── CompositionDetailModal.tsx# Full-screen/detail modal (read-only view)
│       ├── CreateCompositionDialog.tsx # Create/Edit modal (guided + DSL)
│       │   ├── ModeToggle.tsx        # Segmented control: Guided | DSL
│       │   ├── GuidedForm.tsx        # Form-based builder
│       │   │   ├── TriggerBuilder.tsx  # Data source -> Event -> Params
│       │   │   ├── ConditionBuilder.tsx # AND/OR tree with field/operator/value
│       │   │   ├── ActionBuilder.tsx    # Action type -> Target -> Params
│       │   │   └── ConfigPanel.tsx      # Rate limit, cooldown, timeout
│       │   ├── DSLEditor.tsx         # Textarea with line numbers + validation
│       │   │   ├── LineNumbers.tsx   # Custom line number gutter
│       │   │   ├── ValidationBanner.tsx # Green/Red status bar
│       │   │   └── SyntaxCheatSheet.tsx # Collapsible reference
│       │   ├── PreviewPanel.tsx      # Plain English summary
│       │   ├── ApprovalWarning.tsx   # Alert banner for finance/destructive
│       │   └── DialogFooter.tsx      # Save Draft / Activate / Cancel
│       ├── ActivityFeed.tsx          # Sidebar or bottom drawer
│       │   ├── ActivityFeedHeader.tsx
│       │   ├── ActivityFeedItem.tsx  # Single execution log entry
│       │   └── ActivityFeedEmpty.tsx
│       ├── KillSwitch.tsx            # Global toggle component
│       ├── DataSourceExplorer.tsx    # Registry browser (read-only)
│       ├── CompositionStatusBadge.tsx # Active/Paused/Error/Pending pill
│       └── CompositionActionsBar.tsx # Toggle/Edit/Run/Delete buttons
├── hooks/
│   └── useCompositions.ts            # React Query-style hook for CRUD
├── context/
│   └── CompositionContext.tsx        # Provider + useComposition hook
└── lib/
    └── composition-utils.ts          # DSL formatting, validation helpers
```

### 6.1 State Management

```typescript
// CompositionContext.tsx
interface CompositionState {
  compositions: AgentComposition[];
  selectedId: string | null;
  filter: { status?: string; author?: string };
  isLoading: boolean;
  error: string | null;
  killSwitchEnabled: boolean;
  activityFeed: ActivityFeedItem[];
}

type CompositionAction =
  | { type: 'SET_COMPOSITIONS'; payload: AgentComposition[] }
  | { type: 'ADD_COMPOSITION'; payload: AgentComposition }
  | { type: 'UPDATE_COMPOSITION'; payload: AgentComposition }
  | { type: 'REMOVE_COMPOSITION'; payload: string }
  | { type: 'SET_SELECTED'; payload: string | null }
  | { type: 'SET_FILTER'; payload: { status?: string; author?: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_KILL_SWITCH'; payload: boolean }
  | { type: 'SET_ACTIVITY_FEED'; payload: ActivityFeedItem[] }
  | { type: 'APPEND_ACTIVITY'; payload: ActivityFeedItem };

const CompositionContext = createContext<{
  state: CompositionState;
  dispatch: React.Dispatch<CompositionAction>;
} | null>(null);
```

---

## 7. High-Fidelity UI Specs

All new components use the established **glass pattern**:
```
bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)] rounded-xl
```

Top-edge highlight (pseudo-element):
```
before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px 
before:bg-gradient-to-r before:from-transparent before:via-[rgba(255,255,255,0.06)] before:to-transparent
```

### 7.1 CompositionsPage Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Sidebar (existing)  │  Header (64px)                                       │
│                      │  ┌──────────────────────────────────────────────┐   │
│                      │  │ Compositions        [KillSwitch] [+ Create]  │   │
│                      │  └──────────────────────────────────────────────┘   │
│                      │  Tabs (40px)                                         │
│                      │  ┌──────────────────────────────────────────────┐   │
│                      │  │ Active | Paused | Error | Pending | All      │   │
│                      │  └──────────────────────────────────────────────┘   │
│                      │  Content Area                                        │
│                      │  ┌──────────────────────────────────────────────┐   │
│                      │  │ [Card] [Card] [Card]                         │   │
│                      │  │ [Card] [Card] [Card]                         │   │
│                      │  └──────────────────────────────────────────────┘   │
│                      │  Activity Feed (collapsible, 240px height)         │
│                      │  ┌──────────────────────────────────────────────┐   │
│                      │  │ Activity Feed                                │   │
│                      │  │ • sleep_eval  - success  - 2m ago          │   │
│                      │  │ • budget_alert - condition_false - 5m ago  │   │
│                      │  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 CompositionCard Specs

**Container:**
- `relative min-h-[280px] p-5 rounded-xl`
- Glass pattern + top-edge gradient highlight
- `transition-all duration-200 hover:border-[rgba(255,255,255,0.1)]`

**Status Badge (absolute top-3 right-3):**
- Active: `bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.30)] rounded-full px-2 py-0.5 text-xs font-medium`
- Paused: `bg-[rgba(161,161,170,0.15)] text-[#a1a1aa] border border-[rgba(161,161,170,0.30)] rounded-full px-2 py-0.5 text-xs font-medium`
- Error: `bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.30)] rounded-full px-2 py-0.5 text-xs font-medium`
- Pending: `bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border border-[rgba(245,158,11,0.30)] rounded-full px-2 py-0.5 text-xs font-medium`

**Title:** `text-lg font-semibold text-[#d4d4d8] truncate`

**Description:** `text-sm text-[#a1a1aa] line-clamp-2 mt-1`

**Trigger Info Row:**
- `flex items-center gap-2 mt-3`
- Icon: `w-4 h-4 text-[#71717a]` (Clock icon for time, Zap for events)
- Text: `text-xs text-[#71717a]`

**Stats Row:**
- `flex items-center gap-4 mt-3`
- Last evaluated: `text-xs text-[#71717a]`
- Eval count: `text-xs text-[#71717a]`
- Success rate: `text-xs text-[#10b981]` (if > 80%) or `text-xs text-[#ef4444]` (if < 50%)

**Action Bar:**
- `flex items-center gap-2 mt-4 pt-3 border-t border-[rgba(63,63,70,0.30)]`
- Toggle: shadcn `Switch` (size sm)
- Edit: `Button variant="ghost" size="icon"` with `Pencil` icon
- Run Now: `Button variant="ghost" size="icon"` with `Play` icon
- Delete: `Button variant="ghost" size="icon" className="text-[#ef4444] hover:text-[#ef4444]"` with `Trash2` icon

**Error State:**
- If `status === 'error'`: `mt-3 p-2 rounded bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)]`
- Error text: `text-xs text-[#ef4444] font-mono line-clamp-3`

### 7.3 CreateCompositionDialog Specs

**Modal Container:**
- `max-w-3xl w-full max-h-[85vh] overflow-y-auto`
- Glass pattern background
- `p-0` (padding in sections)

**Header:**
- `flex items-center justify-between p-5 border-b border-[rgba(63,63,70,0.50)]`
- Title: `text-xl font-semibold text-[#d4d4d8]`
- Close: `Button variant="ghost" size="icon"` with `X` icon

**Mode Toggle:**
- `flex p-5 pb-0`
- Segmented control using shadcn `ToggleGroup`
- Active segment: `bg-[rgba(63,63,70,0.80)] text-[#d4d4d8]`
- Inactive: `text-[#71717a]`

**Guided Form Sections:**

*Trigger Section:*
- Card container: glass pattern, `p-4 mt-4`
- Header: `text-sm font-medium text-[#d4d4d8] mb-3` with `Zap` icon
- Fields:
  - Data Source: `Select` with options from registry
  - Event: `Select` populated based on data source
  - Params: Dynamic form fields based on trigger definition

*Condition Section:*
- Card container: glass pattern, `p-4 mt-4`
- Header: `text-sm font-medium text-[#d4d4d8] mb-3` with `Filter` icon
- Builder: AND/OR tree
  - Each row: `Select` (field) + `Select` (operator) + `Input` (value) + `Button` (remove)
  - Add button: `Button variant="outline" size="sm"` with `Plus` icon
  - Operator options: `==`, `!=`, `>`, `<`, `>=`, `<=`, `CONTAINS`, `MATCHES`, `IN`

*Action Section:*
- Card container: glass pattern, `p-4 mt-4`
- Header: `text-sm font-medium text-[#d4d4d8] mb-3` with `Play` icon
- Builder: Stacked action rows
  - Each row: `Select` (action type) + dynamic param fields + `Button` (remove)
  - Add button: `Button variant="outline" size="sm"` with `Plus` icon

*Config Section:*
- Collapsible (shadcn `Collapsible`)
- Header: `text-sm font-medium text-[#71717a]` with `Settings` icon
- Fields: Number inputs for Rate Limit, Cooldown, Timeout, Retries

**DSL Editor:**
- `relative mt-4`
- Textarea: `w-full min-h-[300px] bg-[rgba(0,0,0,0.40)] border border-[rgba(63,63,70,0.50)] rounded-lg p-4 font-mono text-sm text-[#d4d4d8] resize-y focus:outline-none focus:border-[#10b981]`
- Line numbers: `absolute left-0 top-0 bottom-0 w-10 bg-[rgba(0,0,0,0.20)] border-r border-[rgba(63,63,70,0.30)] text-right pr-2 pt-4 text-xs text-[#71717a] font-mono select-none`
- Validation banner: 
  - Valid: `bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.30)] rounded-lg p-3 mt-3`
  - Invalid: `bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.30)] rounded-lg p-3 mt-3`

**Preview Panel:**
- Card container: glass pattern, `p-4 mt-4 bg-[rgba(16,185,129,0.05)]`
- Header: `text-sm font-medium text-[#10b981] mb-2` with `Eye` icon
- Content: `text-sm text-[#a1a1aa] leading-relaxed`

**Approval Warning:**
- `bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border border-[rgba(245,158,11,0.30)] rounded-lg p-4 mt-4`
- Icon: `AlertTriangle`
- Text: `text-sm font-medium` + `text-xs mt-1`

**Footer:**
- `flex items-center justify-end gap-3 p-5 border-t border-[rgba(63,63,70,0.50)]`
- Save Draft: `Button variant="outline"` 
- Activate: `Button className="bg-[#10b981] hover:bg-[#059669]"` (disabled if invalid)
- Cancel: `Button variant="ghost"`

### 7.4 ActivityFeed Specs

**Container:**
- `h-[240px] flex flex-col border-t border-[rgba(63,63,70,0.50)]`
- Glass pattern background

**Header:**
- `flex items-center justify-between p-3 px-5`
- Title: `text-sm font-medium text-[#d4d4d8]`
- Clear button: `Button variant="ghost" size="sm" className="text-[#71717a]"`

**List:**
- `flex-1 overflow-y-auto px-5 pb-3`
- Empty state: `text-center text-sm text-[#71717a] py-8`

**Item:**
- `flex items-start gap-3 py-2 border-b border-[rgba(63,63,70,0.20)] last:border-0`
- Status dot:
  - Success: `w-2 h-2 rounded-full bg-[#10b981] mt-1.5`
  - Error: `w-2 h-2 rounded-full bg-[#ef4444] mt-1.5`
  - Condition false: `w-2 h-2 rounded-full bg-[#71717a] mt-1.5`
- Content:
  - Name: `text-sm font-medium text-[#d4d4d8]`
  - Detail: `text-xs text-[#a1a1aa]`
- Timestamp: `text-xs text-[#71717a] ml-auto whitespace-nowrap`

### 7.5 KillSwitch Specs

**Container:**
- `flex items-center gap-3`

**Label:**
- `text-sm font-medium text-[#d4d4d8]`
- Subtitle: `text-xs text-[#71717a]`

**Switch:**
- shadcn `Switch` with custom styling:
  - Active: `data-[state=checked]:bg-[#10b981]`
  - Inactive: `data-[state=unchecked]:bg-[rgba(63,63,70,0.80)]`

**Disabled State:**
- When kill switch is OFF:
  - Page overlay: `absolute inset-0 bg-[rgba(0,0,0,0.40)] backdrop-blur-sm z-50 flex items-center justify-center`
  - Message: `text-lg font-semibold text-[#d4d4d8]` + `text-sm text-[#a1a1aa]`
  - Badge: `bg-[rgba(239,68,68,0.20)] text-[#ef4444] border border-[rgba(239,68,68,0.40)] rounded-full px-3 py-1 text-sm font-medium`

---

## 8. Interaction Flows

### 8.1 Create Composition (Guided Form)

```
User clicks "+ Create Composition"
    |
    ▼
Modal opens with ModeToggle defaulting to "Guided"
    |
    ▼
User selects Data Source (e.g., "Goals")
    |
    ▼
Event dropdown populates with available triggers (goal_created, goal_updated, etc.)
    |
    ▼
User selects Event + fills params
    |
    ▼
User clicks "Add Condition"
    |
    ▼
Condition row appears: Field (goals.active.title) + Operator (CONTAINS) + Value ("sleep")
    |
    ▼
User clicks "Add Action"
    |
    ▼
Action row appears: Type (SEND_NOTIFICATION) + dynamic params (title, body, priority)
    |
    ▼
PreviewPanel updates in real-time with plain English summary
    |
    ▼
If action requires approval, ApprovalWarning banner appears
    |
    ▼
User clicks "Activate"
    |
    ▼
System validates DSL -> If valid, saves to DB
    |
    ▼
If approval required, status = "pending_approval"
    |                    Else, status = "active"
    ▼
Modal closes, new card appears in grid
```

### 8.2 Create Composition (DSL Editor)

```
User clicks "+ Create Composition"
    |
    ▼
User toggles Mode to "DSL"
    |
    ▼
Textarea appears with placeholder template
    |
    ▼
User types DSL source
    |
    ▼
On blur or Ctrl+Enter, system calls compositions:validate
    |
    ▼
ValidationBanner shows green (valid) or red (invalid with error message)
    |
    ▼
If valid, PreviewPanel shows plain English translation
    |
    ▼
User clicks "Activate"
    |
    ▼
System parses and registers composition
    |
    ▼
Modal closes, card appears
```

### 8.3 AI Suggestion Flow

```
User clicks "Ask AI to Create" (or types in AI chat)
    |
    ▼
System calls compositions:suggest with user prompt
    |
    ▼
AI generates DSL + explanation via callProvider IPC
    |
    ▼
Modal opens pre-filled with suggested DSL
    |
    ▼
User reviews PreviewPanel (plain English summary)
    |
    ▼
User can: [Accept] -> Activate immediately
         [Edit]   -> Modify in DSL or Guided mode
         [Reject] -> Close modal, discard
    |
    ▼
If accepted, composition saved with author = "ai"
```

### 8.4 Composition Evaluation (Runtime)

```
Trigger fires (time event, DB change, or manual run)
    |
    ▼
EventBus emits event to subscribed compositions
    |
    ▼
CompositionEngine.evaluate() called
    |
    ▼
[Rate Limiter] Check passed?
    |-- NO -> Log "rate_limited", return
    |-- YES -> Continue
    ▼
[Scope Checker] All sources/actions valid?
    |-- NO -> Log "error", return
    |-- YES -> Continue
    ▼
[Condition Evaluator] Condition matched?
    |-- NO -> Log "condition_false", return
    |-- YES -> Continue
    ▼
[Approval Check] Sensitive actions?
    |-- YES -> Set status "pending_approval", notify user, return
    |-- NO -> Continue
    ▼
[Action Executor] Execute each action with timeout
    |
    ▼
[Audit Logger] Log execution + all actions
    |
    ▼
Update composition stats (evaluation_count, success_count)
    |
    ▼
If any action failed -> Set status "error", show error on card
```

### 8.5 Error Recovery Flow

```
Composition transitions to "error" state
    |
    ▼
Card shows red badge + error message
    |
    ▼
User sees error and clicks "Edit"
    |
    ▼
Modal opens with pre-filled DSL + ValidationBanner showing error
    |
    ▼
User fixes error
    |
    ▼
User clicks "Save & Reactivate"
    |
    ▼
System re-validates and re-registers composition
    |
    ▼
Status returns to "active", error cleared
```

### 8.6 Approval Flow

```
Composition with finance action is created/activated
    |
    ▼
Status set to "pending_approval"
    |
    ▼
Card shows amber "Pending" badge
    |
    ▼
User clicks "Review"
    |
    ▼
Modal shows: DSL source, PreviewPanel, list of actions requiring approval
    |
    ▼
User clicks "Approve" or "Reject"
    |
    ▼
If approved -> status = "active", composition evaluates normally
If rejected -> status = "disabled", user can edit later
```

### 8.7 Kill Switch Flow

```
User toggles KillSwitch to OFF
    |
    ▼
System calls compositions:kill-switch(false)
    |
    ▼
CompositionEngine.globalEnabled = false
    |
    ▼
All scheduled timers paused
    |
    ▼
EventBus stops dispatching to composition handlers
    |
    ▼
UI shows overlay: "AI Compositions Disabled"
    |
    ▼
Existing compositions remain in DB but do not evaluate
    |
    ▼
User toggles back ON -> Normal operation resumes immediately
```

---

## 9. Safety and Security

### 9.1 Rate Limiting

| Limit | Default | Configurable | Scope |
|---|---|---|---|
| Evaluations per composition | 10/hour | Yes (DSL CONFIG) | Per composition |
| Cooldown between evaluations | 60 seconds | Yes (DSL CONFIG) | Per composition |
| Max compositions per user | 100 | No (system setting) | Global |
| Max executions per day | 1,000 | No (system setting) | Global |
| Max actions per execution | 100 | No (system setting) | Per execution |
| Action timeout | 5 seconds | Yes (DSL CONFIG) | Per action |
| Execution timeout | 30 seconds | No (hard limit) | Per execution |

**Algorithm:** Token bucket per composition with DB-backed persistence. Memory cache for hot path, DB for crash recovery.

### 9.2 Scope Checking

Before any composition evaluates:
1. **Source Validation:** All data sources in conditions must exist in the registry.
2. **Action Validation:** All actions must exist in the registry and not be blacklisted.
3. **Path Validation:** All field paths must match the declared schema of their data source.
4. **Type Safety:** Values in comparisons must be coercible to the schema type of the field being compared.

### 9.3 Approval Queue

**Auto-approved actions (no human review):**
- `CREATE_GOAL`, `UPDATE_GOAL`, `COMPLETE_GOAL`, `FAIL_GOAL`
- `SEND_NOTIFICATION`, `LOG_EVENT`
- `CREATE_LESSON`, `UPDATE_PROGRESS`
- `CREATE_CARD`, `UPDATE_CARD`

**Requires approval:**
- `ADD_TRANSACTION`, `UPDATE_WALLET` (Finance writes)
- `ARCHIVE_PROJECT` (Destructive)

**Approval UI:**
- Pending compositions shown in dedicated "Pending" tab
- Notification badge on Compositions nav item
- Modal shows full DSL + plain English + action breakdown
- One-click Approve/Reject with optional reason

### 9.4 Audit Trail

Every evaluation produces:
1. **Execution Record:** Trigger, result, timing, error (if any), AST snapshot
2. **Action Records:** One per action with payload, result, before/after state
3. **Event Record:** Raw event persisted for 90 days

**Retention:**
- Executions: 90 days (configurable via `log_retention_days`)
- Events: 90 days
- Actions: 90 days
- Daily cleanup job purges old records

### 9.5 Kill Switch

- **Location:** Header of CompositionsPage + Settings page
- **Persistence:** `composition_settings.global_enabled`
- **Effect:** Immediately stops all evaluations; does not delete compositions
- **Recovery:** Toggle back ON resumes normal operation without data loss
- **Visual:** Full-page overlay with disabled state message

### 9.6 Sandbox Constraints

The DSL interpreter is strictly sandboxed:
- **No file system access** (except through existing IPC handlers)
- **No network access** (except through existing IPC handlers)
- **No arbitrary code execution** (no eval, no Function constructor)
- **No infinite loops** (max execution time enforced)
- **No recursion** (condition tree depth limited to 10)
- **No dynamic data source registration** (only pre-registered sources)

### 9.7 Error Handling

| Error Type | User Impact | Recovery |
|---|---|---|
| Syntax error | Card shows "Error", red badge | Edit DSL, fix syntax |
| Validation error | Card shows "Error", red badge | Edit to use valid sources/actions |
| Runtime error | Card shows "Error", last error message | Check audit log, edit condition |
| Rate limited | Silent skip, logged | Wait for cooldown/window reset |
| Timeout | Action skipped, execution marked error | Increase timeout in CONFIG |
| Approval pending | Card shows "Pending", amber badge | User reviews and approves |

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Core infrastructure + basic UI + 3 safe actions

**Tasks:**
- [ ] Create DB migration (all 7 new tables)
- [ ] Implement `DSLParser` with lexer + recursive descent parser
- [ ] Implement `DataSourceRegistry` with built-in adapters for Goals, System, and Notifications
- [ ] Implement `EventBus` with in-memory pub/sub + DB persistence
- [ ] Implement `Scheduler` for daily/interval time triggers
- [ ] Implement `ActionExecutor` with 3 actions: `SEND_NOTIFICATION`, `LOG_EVENT`, `CREATE_GOAL`
- [ ] Implement `AuditLogger` writing to `composition_executions` and `composition_actions`
- [ ] Add IPC handlers: `compositions:list`, `compositions:get`, `compositions:create`, `compositions:update`, `compositions:delete`, `compositions:toggle`, `compositions:validate`, `compositions:execute`
- [ ] Add preload bindings
- [ ] Create `CompositionsPage` with `CompositionList`, `CompositionCard`, `CompositionEmptyState`
- [ ] Create `CreateCompositionDialog` with Guided Form mode only
- [ ] Create `ActivityFeed` sidebar
- [ ] Create `KillSwitch` component
- [ ] Wire up React Context + hooks

**Deliverable:** User can create compositions that send notifications and create goals based on time triggers and simple conditions.

### Phase 2: Condition Engine + Cross-Feature (Week 2)
**Goal:** Full condition evaluation + cross-feature data sources + DSL editor

**Tasks:**
- [ ] Implement full `ConditionEvaluator` with AND/OR/NOT, all operators, path resolution
- [ ] Add Finance read adapters (transactions, wallets, budgets, subscriptions)
- [ ] Add Learning read adapters (mastery, progress, curricula)
- [ ] Add IDE read adapters (projects, sessions, ai_usage)
- [ ] Add Canvas read adapter (cards)
- [ ] Implement `DSLEditor` with line numbers, basic syntax highlighting (CSS spans), validation banner
- [ ] Add `ModeToggle` to switch between Guided and DSL
- [ ] Implement `PreviewPanel` (plain English translation)
- [ ] Add IPC handlers: `compositions:preview`, `compositions:get-data-sources`
- [ ] Add `DataSourceExplorer` component
- [ ] Add more actions: `UPDATE_GOAL`, `COMPLETE_GOAL`, `FAIL_GOAL`, `CREATE_LESSON`, `UPDATE_PROGRESS`
- [ ] Implement variable interpolation `{path}` in action params
- [ ] Add `CompositionDetailModal` for read-only detail view

**Deliverable:** User can write DSL that reads from any feature and acts on Goals/Learning/Notifications. DSL editor is functional.

### Phase 3: Safety + Approval + Polish (Week 3)
**Goal:** Production-ready safety guardrails + approval system + error recovery

**Tasks:**
- [ ] Implement `RateLimiter` with token bucket + DB persistence
- [ ] Implement `ScopeChecker` with full validation
- [ ] Implement approval queue logic for finance/destructive actions
- [ ] Add `compositions:approve` IPC handler
- [ ] Add "Pending" tab to CompositionTabs
- [ ] Add `ApprovalWarning` component to dialog
- [ ] Implement error state handling: card badges, error messages, recovery flow
- [ ] Add `compositions:get-executions`, `compositions:get-logs`, `compositions:get-activity-feed`
- [ ] Implement execution detail view (expandable activity feed items)
- [ ] Add `compositions:kill-switch` + global overlay
- [ ] Add `compositions:update-settings`
- [ ] Implement daily cleanup job for old audit records
- [ ] Add loading skeletons for card grid
- [ ] Add empty states for all tabs
- [ ] Performance: Add async scheduling with `setImmediate` for evaluations
- [ ] Add retry logic with exponential backoff

**Deliverable:** Full safety system operational. Finance actions require approval. Kill switch works. Audit trail is complete.

### Phase 4: AI Integration + Advanced Features (Week 4)
**Goal:** AI can suggest compositions + natural language to DSL + smart templates

**Tasks:**
- [ ] Implement `compositions:suggest` handler using `callProvider` IPC
- [ ] Build prompt template for AI: user intent -> DSL + explanation
- [ ] Add "Ask AI" button to empty state and header
- [ ] Implement suggestion review modal (AI proposal -> user accept/edit/reject)
- [ ] Add smart templates: "Sleep Goal", "Budget Alert", "Learning Milestone", "IDE Streak"
- [ ] Add template gallery to create dialog
- [ ] Implement `compositions:preview` for human-readable translation
- [ ] Add auto-complete to DSL editor (based on registry)
- [ ] Add syntax error underlining in DSL editor
- [ ] Add export/import for compositions (JSON)
- [ ] Add composition duplication
- [ ] Final QA: Test all cross-feature combinations, verify no main thread blocking

**Deliverable:** AI can propose compositions. Users can create complex cross-feature automations via guided templates or natural language. System is fully self-expanding within constraints.

### Phase 5: Optimization (Week 5+)
**Goal:** Worker threads + advanced scheduling + metrics dashboard

**Tasks:**
- [ ] Move DSL evaluation to Node.js `worker_threads`
- [ ] Add metrics dashboard: evaluations/day, success rate, top compositions
- [ ] Add composition performance profiling (execution time trends)
- [ ] Add data source query caching (LRU cache for 30 seconds)
- [ ] Add composition sharing (export as shareable code snippet)
- [ ] Add composition marketplace (curated templates from AI)

---

## Appendix A: Verify Checklist

- [x] DSL grammar is defined (EBNF) and auditable by a human
- [x] Every subsystem (goals, learning, IDE, finance, canvas) has a data source manifest
- [x] Composition storage uses the existing SQLite DB (new tables)
- [x] IPC channels follow the existing naming convention (lowercase, colon-separated)
- [x] Preload bindings follow the existing camelCase pattern
- [x] All new components use the glass pattern and existing shadcn components
- [x] No new npm packages required beyond what's already installed
- [x] The system can be disabled with a single toggle (kill switch)
- [x] Error states are handled gracefully without crashing the app
- [x] The design supports both DSL code editing AND a guided form-based builder

---

## Appendix B: File Inventory

### New Files (Renderer)
```
src/pages/CompositionsPage.tsx
src/components/compositions/CompositionHeader.tsx
src/components/compositions/CompositionTabs.tsx
src/components/compositions/CompositionList.tsx
src/components/compositions/CompositionCard.tsx
src/components/compositions/CompositionEmptyState.tsx
src/components/compositions/CompositionDetailModal.tsx
src/components/compositions/CreateCompositionDialog.tsx
src/components/compositions/ModeToggle.tsx
src/components/compositions/GuidedForm.tsx
src/components/compositions/DSLEditor.tsx
src/components/compositions/PreviewPanel.tsx
src/components/compositions/ApprovalWarning.tsx
src/components/compositions/ActivityFeed.tsx
src/components/compositions/KillSwitch.tsx
src/components/compositions/DataSourceExplorer.tsx
src/components/compositions/CompositionStatusBadge.tsx
src/components/compositions/CompositionActionsBar.tsx
src/hooks/useCompositions.ts
src/context/CompositionContext.tsx
src/lib/composition-utils.ts
```

### New Files (Main Process)
```
src/services/CompositionEngine.ts
src/services/DSLLexer.ts
src/services/DSLParser.ts
src/services/DataSourceRegistry.ts
src/services/EventBus.ts
src/services/Scheduler.ts
src/services/RateLimiter.ts
src/services/ActionExecutor.ts
src/services/AuditLogger.ts
src/services/ScopeChecker.ts
```

### Modified Files
```
src/main.ts                    # Add IPC handlers + instantiate CompositionEngine
src/preload.ts                 # Add preload bindings
src/App.tsx                    # Add /compositions route
package.json                   # No changes (zero new packages)
```

---

*End of Specification*
