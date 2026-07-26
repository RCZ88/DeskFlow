# Context Bundle: Database Page Analytics Overhaul

## File: `src/pages/DatabasePage.tsx` (520 lines)

Current state: Raw SQLite table browser. Lists 31 tables, lets user select one, shows rows with search/pagination/export. No charts, no aggregations, no insights.

### Key imports currently used:
```tsx
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Database, Download, Search, Table, Table2, Layers, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
```

The page component is `export default function DatabasePage()` — no props.

### Glass card pattern (consistent across app):
```tsx
<div className="glass rounded-2xl p-4">...</div>
```

### App color scheme: Dark zinc/emerald theme
- Background: `bg-black`, `bg-zinc-900`, `bg-zinc-800`
- Text: `text-white`, `text-zinc-200`, `text-zinc-400`, `text-zinc-500`
- Accents: `text-emerald-400` (primary), `text-purple-400`, `text-amber-400`, `text-blue-400`
- Cards: `glass` class (translucent dark card), `bg-zinc-800/50`
- Borders: `border-zinc-800`, `border-zinc-700/50`

---

## Available Data Sources (IPC endpoints)

All accessible via `window.deskflowAPI.*` in the renderer.

### AI Usage
```
getAIUsageSummary(period?: 'day'|'week'|'month')
  → { totalTokens, totalCost, byTool: { [tool]: { tokens, cost, sessions } }, period }
```
Source table: `ai_usage` (columns: id, project_id, tool, date, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd, model, message_count, project_path)

### Terminal Sessions
```
getTerminalSessions(projectId?, limit?)
  → { success, data: Session[] }
```
Source table: `terminal_sessions` (columns: id, preset_id, project_id, agent, resume_id, topic, working_directory, terminal_id, total_tokens, total_cost, created_at, updated_at, category, status, product_area, description, auto_tags, category_confirmed)

### Terminal Messages
```
getSessionMessages(sessionId, agentType?)
  → Message[] (columns: id, session_id, role, content, status, created_at)
```
Roles: 'user', 'assistant', 'system'. Can compute response times between user prompts and assistant responses.

### Prompt History
```
getPromptHistory({ projectId?, limit? })
  → Array of { session_id, role, content, created_at, agent, topic, ... }
```
JOINs terminal_messages + terminal_sessions + terminal_bindings.

### Problems
```
getProblems({ projectId?, projectPath? })
  → { success, data: Problem[] }
```
Source table: `workspace_problems` (columns: id, title, status ['NEW','Not Started','In Progress','AI Attempted Fix','User Testing','Fixed','Irrelevant'], priority ['critical','high','medium','low'], category, user_notes, fix_description, root_cause, files, project_id, created_at, updated_at)
New: also accepts session_id.

### Requests
```
getRequests({ projectId? })
  → { success, data: Request[] }
```
Source table: `workspace_requests` (columns: id, title, description, status ['Pending','In Progress','Completed','Cancelled'], priority, category ['Feature','Bug Fix','Improvement','Other'], linked_problems[], project_id, created_at, updated_at)

### Daily Stats
```
getDailyStats(period: 'week'|'month'|'all')
  → Array of { day, app, category, total_sec, sessions, avg_session_sec, ... }
```
Source table: `daily_stats` (columns: date, app, category, total_sec, sessions, avg_session_sec, keystrokes, clicks, focus_score, productivity_type, total_time_sec, focus_time_sec)

### App Stats
```
getAppStats(period?: 'today'|'week'|'month'|'all')
  → Array of { app, category, total_ms, sessions, avg_session_ms, first_seen, last_seen }
```
Filters out browser entries. Per-app aggregated stats.

### Dashboard Data
```
getDashboardData({ period, dateOffset? })
  → { hourly, daily, topApps, topDomains, recentSessions }
```
Uses `stats_hourly` and `stats_daily` pre-aggregated tables.

### Activity Log
```
getActivityLog({ entityType?, entityId?, limit? })
  → entries from activity_log table
```
Tracks changes to problems, requests, sessions, checklists, skills.

### Database Exploration
```
getDatabaseTables() → { tables: string[], type: 'sqlite' }
getTableSchema(tableName) → ColumnInfo[]
getTableData(tableName, limit?) → Row[]
```

---

## Chart.js Setup (already in project dependencies)

```
chart.js: ^4.5.1
react-chartjs-2: ^5.3.1
```

### Standard import pattern (from StatsPage.tsx):
```tsx
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement,
                  PointElement, ArcElement, Tooltip, Legend, Filler);
```

Also used elsewhere: `Doughnut` from react-chartjs-2.

### Chart options pattern:
```tsx
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#a1a1aa', font: { size: 10 } } },
  },
  scales: {
    x: { ticks: { color: '#71717a', font: { size: 9 } }, grid: { color: 'rgba(113,113,122,0.1)' } },
    y: { ticks: { color: '#71717a', font: { size: 9 } }, grid: { color: 'rgba(113,113,122,0.1)' } },
  },
};
```

---

## Existing Page Tab Pattern (for adding view toggle)

TerminalPage uses `activeTab` state with a tab bar. DatabasePage can use a simpler pattern:
```tsx
const [activeView, setActiveView] = useState<'tables' | 'analytics'>('tables');
```

With toggle buttons:
```tsx
<div className="flex gap-1 bg-zinc-900 rounded-xl p-1 w-fit border border-zinc-800">
  <button onClick={() => setActiveView('analytics')} className="...">Analytics</button>
  <button onClick={() => setActiveView('tables')} className="...">Tables</button>
</div>
```

---

## User's Raw Request (verbatim)

"the data page doesnt have any data at all. THERES NO CHARTS THERES NO NOTHING. ONLY SIMPLE LINE STUFF IDK. ITS SUPPOSED TO BE DETAIL IDIOT. SHOWING EACH MODE, AND OTHER THIGNS, AND LIKE THE E SESSIONS< the TIME GAP BETWEE NRESPONSE AND SENDING THE PROMPT AGAIN, THE AMOUNT OF REQUEST/ PROBLEMS COMPLETED ON THE TIME FRAME, AND MANY MORE. use the generate promtp skill to get more ideas on whta to put. maybe somthing related to cost, tokens per request for example, or anything else."

Interpreted requirements:
1. Charts showing detailed data, not just simple line charts
2. Each mode breakdown (tracking modes per category)
3. Session timing data (time gap between response and sending the prompt again)
4. Problems/requests completed in a time frame
5. Cost data
6. Tokens per request
7. Any other relevant metrics
