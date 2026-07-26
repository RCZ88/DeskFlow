# CONTEXT_BUNDLE — AI Usage City Visualization

> Gathered from DeskFlow codebase for prompt generation.
> Date: 2026-06-22

---

## 1. Problem Statement (verbatim)

> "Create a prompt for another AI to generate creative visualization ideas for AI coding agent tool usage data (tokens, problems, requests, decisions, messages). The metaphor is a modern city/skyscraper visualization: building height = tokens, building size = cost, colors = agents/tools, switching between 'cities' shows different statistics. The prompt should give the target AI full context of available data and ask it to: (a) filter what data is usable, (b) propose visualization ideas, (c) suggest implementation approaches."

---

## 2. Target Location

- **Route:** `/ide` (IDEProjectsPage)
- **Tab:** "AI Tools" (sub-tab key: `ai`)
- **Component:** `src/pages/IDEProjectsPage.tsx`
- **Current charts already present:** Agent cards, sparklines, per-agent bar charts, distribution doughnut, model timeline stacked bar, multi-agent comparison bar, StatsDashboard KPIs
- **Tech stack:** React 18, TypeScript, Tailwind CSS, Chart.js (react-chartjs-2), Framer Motion, lucide-react, Three.js is available (already used for Dashboard 3D orbit)

---

## 3. Database Tables

### 3.1 `ai_usage` — Core AI usage metrics
```
id              TEXT PRIMARY KEY       # UUID
project_id      TEXT                   # FK → projects(id)
tool            TEXT NOT NULL          # AI agent name (e.g., 'claude', 'opencode')
date            DATE NOT NULL          # YYYY-MM-DD
input_tokens    INTEGER DEFAULT 0
output_tokens   INTEGER DEFAULT 0
cache_write_tokens INTEGER DEFAULT 0
cache_read_tokens  INTEGER DEFAULT 0
cost_usd        REAL DEFAULT 0
model           TEXT                   # Model name (e.g., 'claude-sonnet-4-20250514')
message_count   INTEGER DEFAULT 0
project_path    TEXT
created_at      DATETIME
```
Indexes: date, tool, project_path, (tool, date), (date, tool), (tool, project_path), (tool, model)

### 3.2 `projects` — Tracked projects
```
id                TEXT PRIMARY KEY
name              TEXT NOT NULL
path              TEXT NOT NULL UNIQUE
repository_url    TEXT
vcs_type          TEXT
primary_language  TEXT
default_ide       TEXT
added_at          DATETIME
last_activity_at  DATETIME
deleted_at        DATETIME
```

### 3.3 `terminal_sessions` — AI agent conversation sessions
```
id                  TEXT PRIMARY KEY
preset_id           TEXT
project_id          TEXT
agent               TEXT             # AI agent type
resume_id           TEXT
topic               TEXT
working_directory   TEXT
terminal_id         TEXT
total_tokens        INTEGER DEFAULT 0
total_cost          REAL DEFAULT 0
created_at          DATETIME
updated_at          DATETIME
category            TEXT DEFAULT 'other'   # Session categorization
status              TEXT DEFAULT 'active'  # active/idle/completed/error/cancelled
product_area        TEXT DEFAULT ''
description         TEXT DEFAULT ''
auto_tags           TEXT DEFAULT '[]'
category_confirmed  INTEGER DEFAULT 0
subpage             TEXT DEFAULT 'work/sessions'
```

### 3.4 `terminal_messages` — Individual messages within sessions
```
id                INTEGER PRIMARY KEY AUTOINCREMENT
session_id        TEXT NOT NULL
role              TEXT CHECK(role IN ('user','assistant','system'))
content           TEXT NOT NULL
status            TEXT DEFAULT 'completed'
created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
```
Status: `in_progress` → auto-settled to `completed` after 15 min

### 3.5 `session_parsed_items` — Decisions, actions, references extracted from sessions
```
id                INTEGER PRIMARY KEY AUTOINCREMENT
session_id        TEXT NOT NULL
item_type         TEXT CHECK(item_type IN ('decision','action_item','status_change','reference'))
content           TEXT NOT NULL
source_message_id INTEGER
created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
```

### 3.6 `terminal_bindings` — Terminal → project/agent/problem bindings
```
id                  INTEGER PRIMARY KEY AUTOINCREMENT
terminal_id         TEXT NOT NULL UNIQUE
project_id          TEXT
agent_type          TEXT
session_id          TEXT
active_problem_id   TEXT
active_request_id   TEXT
status              TEXT DEFAULT 'active'
created_at          DATETIME
last_activity_at    DATETIME
```

### 3.7 `workspace_problems` — Bug/issue tracking
```
id              INTEGER PRIMARY KEY AUTOINCREMENT
title           TEXT NOT NULL
status          TEXT DEFAULT 'NEW'    # NEW→Not Started→In Progress→AI Attempted Fix→User Testing→Fixed/Won't Fix
priority        TEXT DEFAULT 'medium'
category        TEXT DEFAULT 'other'
user_notes      TEXT
fix_description TEXT
root_cause      TEXT
files           TEXT DEFAULT '[]'
project_id      TEXT
created_at      TEXT
updated_at      TEXT
```

### 3.8 `workspace_requests` — Feature requests
```
id              INTEGER PRIMARY KEY AUTOINCREMENT
title           TEXT NOT NULL
description     TEXT
status          TEXT DEFAULT 'Pending'    # Pending→In Progress→Completed/Cancelled
priority        TEXT DEFAULT 'Medium'
category        TEXT DEFAULT 'Feature'
linked_problems TEXT DEFAULT '[]'         # JSON array of problem IDs
project_id      TEXT
created_at      TEXT
updated_at      TEXT
```

---

## 4. IPC Endpoints (Data Sources)

### 4.1 `get-ai-usage-summary(period?, dateOffset?, projectId?)`
```
Returns: {
  totalTokens: number,
  totalCost: number,
  byTool: {
    [toolName: string]: {
      tokens: number,
      cost: number,
      sessions: number,
      messageCount: number,
      lastUsed: string|null,
      models: string[]
    }
  },
  period: string
}
```
Period options: `'today' | 'week' | '7day' | 'month' | '30day'`

### 4.2 `get-ide-projects-overview(period?, dateOffset?)`
```
Returns: {
  ides: Array<{ id, name, ... }>,
  tools: Array<{ id, name, category, ... }>,
  projects: Array<{ id, name, path, primary_language, ... }>,
  aiUsage: {
    totalTokens: number,
    totalCost: number,
    totalMessages: number,
    byTool: {
      [tool: string]: {
        tokens, cost, sessions, messageCount, lastUsed, models,
        daily: { [date: string]: { tokens, cost, sessions, messageCount } },
        projects: Array<{ path, tokens, messageCount, sessions }>,
        modelBreakdown: Array<{ model, tokens, messageCount, sessions }>,
        modelDaily: {
          [model: string]: {
            [date: string]: { tokens, messageCount, sessions, cost }
          }
        }
      }
    }
  },
  commits: { totalCommits, totalAdditions, totalDeletions }
}
```

### 4.3 `get-prompt-history({ projectId?, limit? })`
```
Returns: {
  success: boolean,
  data: Array<{
    id, session_id, role, prompt, sent_at,
    session_id_ref, session_topic, agent, category, product_area, session_status,
    active_problem_id, active_request_id, project_id, binding_agent
  }>
}
```

### 4.4 `get-terminal-sessions(projectId?, limit?)`
Returns session array with agent, topic, total_tokens, total_cost, category, status, product_area

### 4.5 `get-problems()` / `get-requests()`
Returns problem/request arrays with title, status, priority, category, timestamps

### 4.6 `get-parsed-session-items(sessionId)`
Returns decisions, action_items, status_changes, references for a session

---

## 5. Existing UI (What's Already Rendered)

The AI Tools tab already contains:
- **Summary bar** — active agent count, sync button, time-lock toggle, export CSV, debug panel
- **Agent cards** — name, model, tokens, messages, cost, avg/msg, sparkline, last-used
- **Per-agent daily bar charts** — tokens/messages/sessions/cost with log scale toggle, outlier filtering, period switching (7d/30d/all)
- **Usage distribution doughnut** — by agent
- **Model usage timeline** — stacked bar per model across agents
- **Multi-agent comparison** — grouped bars with checkbox toggles per agent
- **StatsDashboard** — KPI row (total tokens, total cost, active sessions, tools/models), tokens-by-tool bar, sessions-by-agent bar
- **Debug panel** — agent detection paths, database record counts

Nothing uses Three.js or 3D/city-style rendering yet.

---

## 6. Available Libraries

- **Three.js** (`@react-three/fiber`, `@react-three/drei`) — already in package.json for Dashboard 3D orbit globe
- **Chart.js** — currently used for all charts
- **Framer Motion** — used throughout for animations
- **lucide-react** — icon library
- **Tailwind CSS** — styling with glass morphism patterns (`.glass` class)
- **TypeScript** — strict mode

---

## 7. Data Flow Patterns

```
Component (IDEProjectsPage.tsx)
  ↓ calls window.deskflowAPI.getAIUsageSummary(period, offset, projectId)
  ↓ IPC bridge (preload.ts → ipcRenderer.invoke)
  ↓ main process handler (main.ts)
  ↓ SQLite query
  ↓ Returns JSON
Component receives data → useState → renders charts
```

Cache strategy: 5-minute TTL on all-time data (`analyticsCacheRef`), bypassed on period change.

---

## 8. Key Numbers & Constraints

- DB max: ~100K ai_usage records (from daily AI tool tracking)
- Token values can range from 0 to 100M+
- Cost values range from $0.0001 to $100+
- 5-15 AI agents/tools typically tracked
- 3-30 projects typically tracked
- Typical period: 7, 30, or 90 days
- Window: Electron app, 1920x1080 typical, dark theme
- Performance: data processing should not block UI (use setTimeout chunking pattern)
- Session messages: 100-5000 per session, content is Markdown text
