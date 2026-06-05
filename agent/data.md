# 📊 DeskFlow Data Reference

**Purpose:** Document data storage, schemas, and recent changes to database/information.

**Created:** 2026-04-13
**Last Updated:** 2026-06-05

---

## 🗄️ Data Storage Architecture

### Storage Strategy (Hybrid with Fallback)

**Primary:** SQLite via `better-sqlite3`
- **Location:** `%APPDATA%/deskflow/deskflow-data.db` (Windows)
- **Tables:**
  - `logs`: id, timestamp, app, category, duration_ms, title, project, keystrokes, clicks, window_switches, url, domain, tab_id, is_browser_tracking
  - `daily_stats`: id, date, app, category, total_sec, sessions, avg_session_sec, keystrokes, clicks, focus_score, productivity_type, total_time_sec, focus_time_sec (UNIQUE date+app)
  - `daily_aggregates`: id, date, category, total_sec, sessions, focus_score
  - `browser_sessions`: id, date, domain, category, title, total_sec, sessions, last_active

**AI Features Tables (added 2026-06-04):**
  - `ai_briefs`: type (daily/weekly), date (YYYY-MM-DD or week key), content (JSON), model_used, tokens_used, created_at
  - `ai_interests`: id, topic (text), enabled (boolean default 1), created_at
  - `ai_feature_usage`: date, feature (briefing/weekly/topic/anomaly), model, input_tokens, output_tokens, cost_usd, success (boolean), created_at

- **Status:** Preferred, requires native module compilation

**Fallback:** JSON File
- **Location:** `%APPDATA%/deskflow/deskflow-data.json`
- **Format:** Array of log entries with same schema as SQLite
- **Status:** Automatically used if SQLite fails to initialize

---

## 📝 Recent Data Changes

### 2026-04-13

| Change | Description |
|--------|-------------|
| Tracking state sync | Removed auto-update from heartbeat to fix manual toggle override |
| Browser sessions aggregation | Added updateAggregates() call after browser data insert |
| ProductivityPage period | Removed local state, uses parent prop directly |

---

## 📚 IPC Endpoints (Data-Related)

| Endpoint | Description |
|----------|-------------|
| `get-logs` | Get all log entries |
| `get-logs-by-period` | Get logs filtered by today/week/month/all |
| `get-app-stats` | Get per-app detailed stats |
| `get-daily-stats` | Get daily aggregation for week/month/all |
| `get-daily-productivity` | Get productivity data for specific date |
| `get-productivity-range` | Get productivity scores for date range |
| `get-browser-logs` | Get browser activity logs |
| `get-browser-domain-stats` | Get browser stats by domain |
| `get-browser-category-stats` | Get browser stats by category |
| `get-daily-aggregates` | Get data from daily_aggregates table |
| `get-browser-sessions` | Get data from browser_sessions table |
| `get-sleep-for-date` | Get existing sleep session for a specific date (YYYY-MM-DD). Returns `{ id, started_at, ended_at, device_off_to_sleep_seconds, wake_up_to_app_seconds }` or null. |
| `update-manual-sleep` | Update an existing sleep session by ID. Accepts `(sessionId, { started_at, ended_at, device_off_to_sleep_seconds?, wake_up_to_app_seconds? })`. Returns `{ success }`. |
| `get-typical-day` | **REPLACED** — Returns `{ grid, legend, stats, generatedAt, daysCovered }` (7x24 multi-activity grid). Merges external_sessions + device logs, normalizes per-day, supports multi-activity cells with percentages and colors. |
| `link-problem-to-request` | Links a problem ID to a request in REQUESTS.md. Calls RequestsService.linkProblem(). Accepts `{ requestId, problemId }`. |
| `unlink-problem-from-request` | Removes a problem ID from a request's linked_problems array. Calls RequestsService.unlinkProblem(). Accepts `{ requestId, problemId }`. |
| `detect-project-language` | Scans project directory by file extension to detect primary language. Accepts `projectPath`. Returns `{ success, language, fileCount, totalFiles }`. |
| `terminal:create` | Creates a terminal PTY with specific dimensions + agent readiness. Accepts `(id, cwd, cols, rows, agentType?)`. Used by `terminalAPI.create` preload bridge. |
| `spawn-terminal` | Creates a terminal PTY with default 80x24 dimensions. Accepts `(terminalId, cwd, agentType?)`. Sets up agent readiness detection via AGENT_SIGNATURES regex patterns. |
| `terminal:write` | Write data to terminal via the new terminal API. Accepts `(id, data)`. |
| `terminal:resize` | Resize terminal via the new terminal API. Accepts `(id, cols, rows)`. |
| `terminal:destroy` | Kill terminal via the new terminal API. Accepts `(id)`. |
| `retry-agent-init` | Retries agent readiness detection for a terminal. Accepts `(terminalId, agentType)`. Re-attaches data handler with new agent signature. |
| `write-terminal` | Write data to terminal stdin. Accepts `(terminalId, data)`. |
| `resize-terminal` | Resize terminal PTY. Accepts `(terminalId, cols, rows)`. |
| `kill-terminal` | Kill terminal PTY process. Accepts `(terminalId)`. |
| `terminal:write-old-format` | Write data to terminal stdin (used by `terminalWrite` preload bridge). Accepts `(terminalId, data)`. Persists to `terminal_messages` table. |
| `terminal:resize-old-format` | Resize terminal PTY (used by `terminalResize` preload bridge). Accepts `(terminalId, cols, rows)`. |
| `terminal:destroy-old-format` | Kill terminal PTY (used by `terminalDestroy` preload bridge). Accepts `(terminalId)`. |
| `get-terminal-session-resume-id` | Get resume_id for a terminal session. Accepts `(sessionId)`. Returns `resume_id` string or null. |
| `save-terminal-session` | Save/update terminal session metadata. Accepts `{ id, projectId, agent, resumeId, terminalId, topic, workingDirectory, ... }`. Auto-generates `resume_id` if missing. Returns `{ success, id, resumeId }`. |
| `electron:execute-command` | Execute an arbitrary shell command on the host. Accepts `{ command, cwd? }`. Returns `{ stdout, stderr, exitCode }`. Used for `deskflowAPI.executeCommand()` preload bridge. |
| `summarize-session` | Generates a summary of a terminal session by reading first/last messages. Accepts `(sessionId: string)`. Saves to `agent/context/session-summaries.json`. Returns `{ summary }` or null. |
| `get-context-systems` | Returns live status for all 7 context system directories. **Extended 2026-06-05:** now returns `lastBuilt` (ISO mtime of newest relevant file) + `error` (null for clean absences, populated on genuine failures). Returns array of `{ id, name, itemCount, itemLabel, available, lastBuilt?, error? }`. |
| `set-recording-mode` | Set recording mode for browser or app tracking. Accepts `{ type: 'browser' | 'app', mode: 'always' | 'on-view' }`. When `on-view`, data only persists while the corresponding page is visible. |
| `get-recording-modes` | Returns current recording modes: `{ browser: 'always' | 'on-view', app: 'always' | 'on-view', browserPageVisible: boolean, dashboardPageVisible: boolean }`. |
| `set-page-visibility` | Notify backend that a page became visible/hidden. Accepts `{ page: 'browser' | 'dashboard', visible: boolean }`. Used by on-view recording mode to gate DB writes. |

### AI Features IPC (added 2026-06-04)

| Endpoint | Description |
|----------|-------------|
| `get-ai-brief` | Generate or retrieve cached daily/weekly AI brief. Accepts `{ type: 'daily' | 'weekly' }`. Checks `ai_briefs` cache first; if stale/missing, queries stats and calls `AIService.generateDailyBrief` or `generateWeeklyReview` via OpenRouter. Caches result. Sends `ai-brief-ready` push event on cache miss. |
| `regenerate-ai-brief` | Force-regenerates an AI brief (bypass cache). Same params as `get-ai-brief`. Deletes existing cache entry, then re-runs generation. |
| `get-topic-digest` | Generate topic research digest. Reads enabled interests from `ai_interests` table, calls `AIService.generateTopicDigest` via OpenRouter. Returns array of `{ topic, summary }`. Caches result in `ai_briefs` with type='topic'. |
| `check-anomalies` | Detect activity anomalies vs baseline. Queries today's stats + 7-day/30-day averages, calls `AIService.checkAnomalies` via OpenRouter. Returns `{ hasAnomaly, anomalies: [{ severity, detail }] }`. |
| `get-ai-config` | Returns current AI config object: `{ briefModel, weeklyModel, digestModel, anomalyModel, autoGenerateBrief }`. |
| `save-ai-config` | Saves AI config. Accepts `{ apiKey?, enabled? }`. Persists via preferences system. |
| `get-interest-topics` | Returns all rows from `ai_interests` table ordered by creation date desc. |
| `add-interest-topic` | Adds a new interest topic. Accepts `(topic: string)`. Inserts into `ai_interests` with `INSERT OR IGNORE`. |
| `remove-interest-topic` | Removes an interest topic by ID. Accepts `(topicId: number)`. Deletes from `ai_interests`. |

---

## 📡 IPC Events (Terminal)

| Event | Direction | Description |
|-------|-----------|-------------|
| `terminal:data` | main → renderer | PTY output data for a terminal. Payload: `(terminalId, data)`. |
| `terminal:exit` | main → renderer | PTY process exited. Payload: `(terminalId, exitCode, signal)`. |
| `terminal:ready` | main → renderer | PTY spawned and ready for I/O. Payload: `(terminalId)`. |
| `agent:ready` | main → renderer | AI agent signature detected in terminal output. Payload: `{ terminalId }`. Triggers system prompt write and message queue flush. |
| `agent:timeout` | main → renderer | Agent initialization timed out (30s). Payload: `{ terminalId, agentType }`. Shows retry overlay. |
| `context-changed` | main → renderer | Problem/request/checklist CRUD event. Payload: `{ type: 'problem'|'request'|'checklist', action: 'created'|'updated'|'deleted', entity: { id, title?, status? } }`. Written to active terminal as `[System: ...]` message. |
| `session-metadata-updated` | main → renderer | Agent output was parsed for ## Session Metadata block. Payload: `{ sessionId, metadata: { title?, description?, status?, productArea?, category? }, autoTags: string[] }`. Triggers session list reload. |
| `ai-brief-ready` | main → renderer | Push event when a brief is freshly generated. Payload: `{ type: 'daily'|'weekly', content: any }`. Frontend subscribes via `onAiBriefReady` preload bridge. |

---

## 🔧 Data Troubleshooting

### Weekly vs Today Inconsistency
- **Issue:** Weekly timeframe shows less time than Today (12h vs 10h)
- **Investigation:** Checking getAppStats query in main.ts
- **Possible causes:** Period filtering logic, aggregation query bugs

---

**Last Updated:** 2026-06-05
