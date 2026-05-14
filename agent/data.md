# 📊 DeskFlow Data Reference

**Purpose:** Document data storage, schemas, and recent changes to database/information.

**Created:** 2026-04-13
**Last Updated:** 2026-05-10

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
| `get-typical-day` | **REPLACED** — Returns `{ grid, legend, stats, generatedAt, daysCovered }` (7×24 multi-activity grid). Merges external_sessions + device logs, normalizes per-day, supports multi-activity cells with percentages and colors. |
| `link-problem-to-request` | Links a problem ID to a request in REQUESTS.md. Calls RequestsService.linkProblem(). Accepts `{ requestId, problemId }`. |

---

## 🔧 Data Troubleshooting

### Weekly vs Today Inconsistency
- **Issue:** Weekly timeframe shows less time than Today (12h vs 10h)
- **Investigation:** Checking getAppStats query in main.ts
- **Possible causes:** Period filtering logic, aggregation query bugs

---

**Last Updated:** 2026-05-10