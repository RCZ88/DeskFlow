# Context Bundle — Life River Phase Integration

## Problem Summary

The Life River page has phases (chapters of life) but they're disconnected from all other app data. The user wants TWO modes of connecting data to phases:

1. **System mode** (automatic) — the app automatically pulls ALL tracking data from every feature and groups it by phase date range
2. **Manual mode** (user-driven) — for old history before the app, the user manually creates/attaches data to phases

The River should be the SINGLE ORCHESTRATION LAYER that shows how EVERYTHING connects.

---

## ALL App Features That Can Auto-Integrate Into Phases

### 1. Dashboard (Hero Data)
- **Timer/Stopwatch** — productive time tracking
- **Recent Sessions** — app/website activity feed with live timers
- **Heatmap** — hourly activity visualization
- **Weekly Overview** — weekly productivity summary

### 2. Stats (App Usage)
```sql
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT, window_title TEXT,
  start_time TEXT, end_time TEXT,
  duration INTEGER DEFAULT 0,
  category TEXT DEFAULT 'unknown'
)
```
- Per-minute app session tracking
- Category: productive / neutral / distracting / external
- Top apps by duration, time-of-day patterns

### 3. Browser Activity
```sql
CREATE TABLE IF NOT EXISTS browser_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT, url TEXT, title TEXT,
  start_time TEXT, end_time TEXT,
  duration INTEGER DEFAULT 0,
  category TEXT DEFAULT 'unknown'
)
```
- Website visit tracking via extension
- Top domains, browsing patterns

### 4. Productivity
- Focus score computation
- Productive vs distracting time ratios
- Trend analysis over periods

### 5. Focus (Deep Focus Sessions)
```sql
CREATE TABLE IF NOT EXISTS deep_focus_sessions (
  id TEXT PRIMARY KEY, start_time TEXT, end_time TEXT,
  duration_seconds INTEGER, strictness TEXT,
  status TEXT, apps_used TEXT DEFAULT '[]',
  completed_at TEXT
)
CREATE TABLE IF NOT EXISTS focus_groups (
  id TEXT PRIMARY KEY, name TEXT, color TEXT,
  allowed_apps TEXT DEFAULT '[]',
  allowed_domains TEXT DEFAULT '[]',
  allowed_categories TEXT DEFAULT '[]'
)
```
- Deep focus sessions with duration, apps used, strictness mode
- Focus groups: named app sets (e.g., "Coding", "Study")
- Focus goals: daily/strict goals per mode
- Distraction logs, focus history, leaderboard

### 6. Finance
```sql
CREATE TABLE IF NOT EXISTS finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER, wallet_id INTEGER,
  category_id INTEGER, type TEXT,
  amount REAL, description TEXT, note TEXT,
  date TEXT, time TEXT, tags TEXT,
  on_behalf_of INTEGER DEFAULT 0
)
CREATE TABLE IF NOT EXISTS finance_subscriptions (
  id TEXT PRIMARY KEY, name TEXT, amount REAL,
  billing_cycle TEXT, next_billing_date TEXT,
  category TEXT, status TEXT
)
CREATE TABLE IF NOT EXISTS finance_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, type TEXT, balance REAL,
  currency TEXT, icon TEXT, color TEXT
)
```
- Income/expense/transfer tracking
- Wallets with balances
- Subscriptions with billing cycles
- Budgets per category
- Monthly recaps with AI-generated insights
- Follow-through (repayment tracking)

### 7. External (Sleep + Manual Sessions)
```sql
CREATE TABLE IF NOT EXISTS external_sessions (
  id TEXT PRIMARY KEY, type TEXT,
  started_at TEXT, ended_at TEXT,
  duration_seconds INTEGER, note TEXT
)
```
- Sleep tracking (type='sleep')
- Manual activity sessions
- Gap detection (untracked time)

### 8. IDE Projects
```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT, path TEXT UNIQUE,
  detected_at TEXT, last_seen_at TEXT
)
CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY, tool TEXT, model TEXT,
  tokens_in INTEGER, tokens_out INTEGER,
  cost REAL, timestamp TEXT, project_id TEXT
)
CREATE TABLE IF NOT EXISTS code_activity (
  id TEXT PRIMARY KEY, workspace_path TEXT,
  event_type TEXT, file_path TEXT,
  lines_added INTEGER, lines_removed INTEGER,
  timestamp TEXT
)
```
- Project detection and tracking
- AI usage per tool/model with cost
- Code activity (edits, commits) from VS Code extension
- Line stats per file

### 9. AI Usage (Global)
- Per-request tracking: tool, model, tokens in/out, cost
- Timeline of AI usage over time
- Model dominance phases

### 10. Sleep
- Sleep sessions as external_sessions with type='sleep'
- Bedtime, wake time, duration
- Sleep trends over time

### 11. Resume Builder
- Career phases, skills, experiences
- Document uploads, AI feedback
- Version history

### 12. Learn (Lyceum)
- Lessons, curriculum, mastery levels
- Study sessions, progress tracking

### 13. Insights
- Cross-feature analytics
- Activity breakdowns
- Trend comparisons

---

## Data Systems NOT Yet Connected to Phases

| System | Has Date Range | Can Auto-Attach | Currently Connected |
|--------|---------------|-----------------|-------------------|
| App logs | start_time/end_time | YES | NO |
| Browser sessions | start_time/end_time | YES | NO |
| Focus sessions | start_time/end_time | YES | NO |
| Finance transactions | date | YES | NO |
| Subscriptions | next_billing_date | YES | NO |
| Sleep | started_at/ended_at | YES | NO |
| AI usage | timestamp | YES | NO |
| Code activity | timestamp | YES | NO |
| IDE projects | detected_at | YES | NO |
| Memories | date | YES | partially (date filter) |
| Covenants | completions.date | YES | partially (date filter) |
| Goals | date/deadline | YES | partially (date filter) |

---

## LifePage Current Structure

### River Mode
```
┌─────────────────────────────────────────┐
│ Mode Toggle: Pages | River              │
├──────────────┬──────────────────────────┤
│ CoreSample   │ TodayTributary           │
│ (ring)       │ Control Deck             │
│ TimelineView │ - Lens indicator         │
│ RiverMap     │ - Quick-add (redirects)  │
│              │ - Preview cards          │
│              │ PhaseCard list           │
│              │   - Covenant strip       │
│              │   - Gold strip           │
│              │   - Memories strip       │
└──────────────┴──────────────────────────┘
```

### PhaseCard Currently Shows
- Covenant completions (filtered by date range)
- Long-term goals (filtered by date range or phaseId)
- Memories (filtered by date range)
- NO app usage, finance, focus, sleep, browser, AI, or code data

---

## Design Tokens
- Glass: `bg-zinc-900/80 backdrop-blur-xl`
- Dark mode only
- Accents: amber-400, rose-400, emerald-400, sky-400, violet-400
- Fonts: Geist + JetBrains Mono
- Rounded: max `rounded-xl`, padding `p-5`
