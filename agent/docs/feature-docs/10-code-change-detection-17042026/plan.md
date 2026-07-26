# 📊 Code Change Detection - Implementation Plan

**Created:** 2026-04-17
**Status:** 📋 PLANNING - Awaiting User Approval
**Priority:** HIGH - IDE Projects Enhancement

---

## 📋 Executive Summary

This document outlines a phased approach to implementing comprehensive code change detection for the IDE Projects feature. Currently, the system tracks AI usage (tokens, costs) and basic git commits (additions, deletions). This plan extends that to include daily code metrics aggregation, language detection, DORA metrics, and speculative AI attribution.

---

## ✅ Current State (As of 2026-04-17)

### Working Features
| Feature | Table | Status |
|---------|-------|--------|
| AI Usage Tracking | `ai_usage` | ✅ Working |
| Commit Sync | `commits` | ✅ Working |
| Project Management | `projects` | ✅ Working |
| IDE Detection | `ides` | ✅ Working (enhanced) |
| Tool Detection | `tools` | ✅ Working |

### Current Commits Table Schema
```sql
CREATE TABLE commits (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  sha TEXT NOT NULL,
  author TEXT,
  author_email TEXT,
  date DATETIME NOT NULL,
  message TEXT,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### What's Missing
| Metric | Needed For | Status |
|--------|------------|--------|
| Daily aggregates | Trend analysis, weekly/monthly reports | ❌ Not implemented |
| Language breakdown | What languages you write most | ❌ Not implemented |
| DORA metrics | DevOps performance assessment | ❌ Not implemented |
| File change history | Which files get modified most | ❌ Not implemented |
| AI attribution | AI vs human code estimation | ❌ Not implemented |

---

## 🔄 Phase Overview

| Phase | Name | Effort | Dependencies |
|-------|------|--------|--------------|
| **Phase 1** | Daily Code Metrics | Low | None (uses existing data) |
| **Phase 2** | Language Detection | Medium | Phase 1 |
| **Phase 3** | Enhanced Git Metrics & DORA | Medium | Phase 1 |
| **Phase 4** | AI Attribution | High | Phase 1 + AI sync |

---

## 🟢 Phase 1: Daily Code Metrics Aggregation

### Objective
Aggregate existing commit data into daily summaries for trend analysis.

### Features
1. **Daily Metrics Table** - Store daily aggregates
2. **Trend Dashboard Cards** - Show week/month trends
3. **Active Days Chart** - Heatmap of coding activity

### Database Schema
```sql
-- Daily code metrics (aggregated from commits)
CREATE TABLE IF NOT EXISTS code_metrics_daily (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  date DATE NOT NULL,
  commits INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  authors INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, date)
);

-- Create index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_code_metrics_date ON code_metrics_daily(date);
CREATE INDEX IF NOT EXISTS idx_code_metrics_project ON code_metrics_daily(project_id);
```

### IPC Handlers
```typescript
// Aggregate commits into daily metrics
electron.ipcMain.handle('aggregate-code-metrics', async (event, projectId?: string) => {
  // Aggregate commits by date for each project
  // Upsert into code_metrics_daily
});

// Get metrics for date range
electron.ipcMain.handle('get-code-metrics', async (event, { projectId, startDate, endDate }) => {
  // Return daily metrics for chart/table display
});

// Get weekly/monthly summary
electron.ipcMain.handle('get-code-summary', async (event, { projectId, period }) => {
  // Return aggregated stats for week/month
});
```

### UI Changes
**New Section in Git Tab:**
```
┌─────────────────────────────────────────────────────────┐
│  📊 Code Activity This Week                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  This Week          │  Last Week        │  Trend       │
│  ─────────────      │  ─────────────    │  ──────      │
│  1,234 lines        │  987 lines        │  ↑ +25%      │
│  45 commits         │  38 commits       │  ↑ +18%      │
│  12 active days    │  10 active days   │  ↑ +20%      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Weekly Activity Chart (bar/line)               │   │
│  │  Mon Tue Wed Thu Fri Sat Sun                   │   │
│  │  ██  ██  ███  ██  ██  █   █                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Top Languages:  JavaScript 45% | Python 30% | TS 25%  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Overview Tab Updates:**
Add new metric card:
```tsx
{ label: 'Lines Written', value: weeklyStats.lines, icon: Code, color: '#10b981' }
```

### Files to Modify
| File | Changes |
|------|---------|
| `src/main.ts` | Add `code_metrics_daily` table, `aggregate-code-metrics` handler, `get-code-metrics` handler |
| `src/preload.ts` | Add IPC bindings |
| `src/App.tsx` | Add type definitions |
| `src/pages/IDEProjectsPage.tsx` | Add Code Activity section in Git tab, update Overview cards |

### Implementation Steps
1. Create `code_metrics_daily` table in database init
2. Implement `aggregate-code-metrics` handler:
   - Query commits grouped by date
   - Calculate sums (additions, deletions, commits)
   - Count unique authors per day
   - Upsert into daily table
3. Implement `get-code-metrics` handler with date range filtering
4. Add UI cards in Git tab
5. Add trend comparison (this week vs last week)
6. Add activity chart (using Chart.js Line or Bar)

### Success Criteria
- [ ] Daily metrics stored in new table
- [ ] Git tab shows weekly activity summary
- [ ] Trend indicator shows week-over-week change
- [ ] Chart displays daily line counts

---

## 🟡 Phase 2: Language Detection

### Objective
Parse file extensions from git commits to determine programming language distribution.

### Features
1. **File Extension Parsing** - Extract extensions from `git show --name-only`
2. **Language Mapping** - Map extensions to language names
3. **Language Metrics Table** - Store per-day per-language stats
4. **Language Breakdown UI** - Show pie/bar chart of languages

### Database Schema
```sql
-- Language metrics (per project per day)
CREATE TABLE IF NOT EXISTS language_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  date DATE NOT NULL,
  language TEXT NOT NULL,
  files_changed INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, date, language)
);

CREATE INDEX IF NOT EXISTS idx_language_metrics_project ON language_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_language_metrics_date ON language_metrics(date);
```

### Language Extension Mapping
```typescript
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'JavaScript', '.jsx': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.mjs': 'JavaScript', '.cjs': 'JavaScript',

  // Web
  '.html': 'HTML', '.css': 'CSS', '.scss': 'CSS', '.less': 'CSS',
  '.vue': 'Vue', '.svelte': 'Svelte',

  // Backend
  '.py': 'Python', '.java': 'Java', '.kt': 'Kotlin', '.scala': 'Scala',
  '.rb': 'Ruby', '.go': 'Go', '.rs': 'Rust', '.php': 'PHP',
  '.cs': 'C#', '.cpp': 'C++', '.c': 'C', '.h': 'C',

  // Mobile
  '.swift': 'Swift', '.m': 'Objective-C', '.dart': 'Dart',

  // Data/Config
  '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.xml': 'XML',
  '.md': 'Markdown', '.sql': 'SQL', '.sh': 'Shell',

  // Other
  '.txt': 'Text', '.svg': 'SVG', '.png': 'Image', '.jpg': 'Image',
};
```

### IPC Handlers
```typescript
// Sync file changes with language detection
electron.ipcMain.handle('sync-file-changes', async (event, projectId: string, repoPath: string) => {
  // For each commit, run: git show --name-only <sha>
  // Parse file extensions
  // Aggregate by language
  // Upsert into language_metrics
});

// Get language breakdown
electron.ipcMain.handle('get-language-metrics', async (event, { projectId, startDate, endDate }) => {
  // Return language stats grouped by language
});
```

### UI Changes
**New Section in Git Tab:**
```
┌─────────────────────────────────────────────────────────┐
│  💻 Languages Used                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────┐  ┌────────────────────────┐  │
│  │                      │  │  JavaScript    45%      │  │
│  │    [Pie Chart]       │  │  ████████████          │  │
│  │                      │  │  Python       30%      │  │
│  │                      │  │  ██████████            │  │
│  │                      │  │  TypeScript   25%      │  │
│  │                      │  │  ████████              │  │
│  └──────────────────────┘  └────────────────────────┘  │
│                                                         │
│  This Week:  +1,234 JavaScript | +500 Python | +300 TS │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Files to Modify
| File | Changes |
|------|---------|
| `src/main.ts` | Add `language_metrics` table, `sync-file-changes` handler, `get-language-metrics` handler |
| `src/preload.ts` | Add IPC bindings |
| `src/App.tsx` | Add type definitions |
| `src/pages/IDEProjectsPage.tsx` | Add Language section in Git tab |

### Implementation Steps
1. Add `language_metrics` table to database init
2. Implement `sync-file-changes` handler:
   - For each project, iterate through commits
   - Run `git show --name-only <sha>` to get changed files
   - Parse extensions, map to languages
   - Aggregate by day/language
   - Upsert into table
3. Implement `get-language-metrics` handler
4. Add UI with pie/bar chart (Chart.js)
5. Show language breakdown in Git tab

### Success Criteria
- [ ] Language metrics stored per project per day
- [ ] Git tab shows language pie chart
- [ ] Weekly language breakdown displayed
- [ ] Can filter by project

---

## 🟠 Phase 3: Enhanced Git Metrics & DORA

### Objective
Add comprehensive git analytics including DORA metrics and file change frequency.

### Features
1. **DORA Metrics** - Lead time, deployment frequency
2. **File Change Frequency** - Which files get modified most
3. **Commit Time Analysis** - When you code (morning/afternoon/evening)
4. **Branch Metrics** - Merge frequency (if available)

### DORA Metrics Definition

| Metric | Definition | How to Calculate |
|--------|------------|------------------|
| **Lead Time for Changes** | Time from first commit to deployment | First commit to latest commit in period |
| **Deployment Frequency** | How often deployments occur | Count of "deploy" commits or tag pushes |
| **Change Failure Rate** | % of deployments causing failures | Would need integration with CI/CD |
| **Mean Time to Recovery** | Time to recover from failures | Would need integration with CI/CD |

**Note:** Full DORA requires CI/CD integration. We'll implement partial metrics:
- Commits per week (proxy for deployment frequency)
- Code review time (if using GitHub API with PR data)

### Database Schema
```sql
-- File change frequency
CREATE TABLE IF NOT EXISTS file_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  date DATE NOT NULL,
  file_path TEXT NOT NULL,
  change_count INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, date, file_path)
);

CREATE INDEX IF NOT EXISTS idx_file_metrics_project ON file_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_file_metrics_file ON file_metrics(file_path);

-- Daily author stats
CREATE TABLE IF NOT EXISTS author_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  date DATE NOT NULL,
  author TEXT NOT NULL,
  commits INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, date, author)
);

-- DORA metrics (aggregated monthly)
CREATE TABLE IF NOT EXISTS dora_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  lead_time_days REAL DEFAULT 0,
  commit_count INTEGER DEFAULT 0,
  avg_commits_per_day REAL DEFAULT 0,
  active_days INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, period_start)
);
```

### IPC Handlers
```typescript
// Get DORA metrics
electron.ipcMain.handle('get-dora-metrics', async (event, { projectId, period }) => {
  // Return DORA metrics for period (weekly/monthly)
});

// Get file frequency
electron.ipcMain.handle('get-file-frequency', async (event, { projectId, limit }) => {
  // Return most frequently changed files
});

// Get commit time distribution
electron.ipcMain.handle('get-commit-times', async (event, { projectId }) => {
  // Return commits grouped by hour of day
});
```

### UI Changes
**New Sections in Git Tab:**

```
┌─────────────────────────────────────────────────────────┐
│  📈 DORA Metrics (This Month)                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Lead Time   │  │ Deploy Freq │  │ Active Days │    │
│  │   2.3 days  │  │  12/week    │  │    18       │    │
│  │  ↓ Faster   │  │  ↑ Normal   │  │  ↑ Healthy  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│  Rating: Elite  🚀🚀🚀🚀🚀                              │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📁 Most Active Files (This Week)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  src/components/App.tsx          12 changes            │
│  src/pages/Index.tsx              8 changes             │
│  src/utils/helpers.ts             6 changes            │
│  package.json                     4 changes             │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  🕐 Commit Time Distribution                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Morning (6-12):     ████████████ 45%                  │
│  Afternoon (12-18):  ██████████ 38%                   │
│  Evening (18-24):    ███ 12%                           │
│  Night (0-6):        █ 5%                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Files to Modify
| File | Changes |
|------|---------|
| `src/main.ts` | Add tables, handlers for DORA, file frequency, commit times |
| `src/preload.ts` | Add IPC bindings |
| `src/App.tsx` | Add type definitions |
| `src/pages/IDEProjectsPage.tsx` | Add DORA, file frequency, time distribution sections |

### Success Criteria
- [ ] DORA metrics calculated and displayed
- [ ] Most active files shown
- [ ] Commit time distribution chart
- [ ] Monthly/weekly toggle working

---

## 🔴 Phase 4: AI Attribution

### Objective
Estimate AI-generated code based on commit analysis and AI session timestamps.

### Features
1. **Time Correlation** - Match AI sessions with subsequent commits
2. **Commit Message Analysis** - Detect AI-generated commit patterns
3. **AI Contribution Estimation** - Estimate % of code likely AI-generated

### How It Could Work

**Method 1: Time Correlation (Weak Signal)**
```
1. Get all AI session timestamps from ai_usage table
2. For each commit, check if AI was used within:
   - 1 hour before commit
   - During commit (if real-time tracking)
3. If correlated, flag as "likely_ai_assisted"
```

**Method 2: Commit Message Patterns (Moderate Signal)**
```
1. Analyze commit messages for AI patterns:
   - "Generated by Claude"
   - "AI refactor"
   - Very long commit messages (AI tends to write detailed ones)
   - Repetitive patterns (AI sometimes does this)
2. Flag commits matching patterns
```

**Method 3: Diff Size Correlation (Weak Signal)**
```
1. Large changes in short time = likely AI
   - Threshold: >500 lines changed within 5 minutes
2. Small frequent changes = likely human
3. Flag outliers as "likely_ai_generated"
```

**Important Disclaimer:** None of these methods are definitive. AI attribution is inherently uncertain. We should present results as "Estimated" or "Likely".

### Database Schema
```sql
-- AI attribution (speculative)
CREATE TABLE IF NOT EXISTS ai_attribution (
  id TEXT PRIMARY KEY,
  commit_id TEXT REFERENCES commits(id),
  project_id TEXT REFERENCES projects(id),
  likely_ai_assisted BOOLEAN DEFAULT 0,
  confidence REAL DEFAULT 0,
  attribution_method TEXT,
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### IPC Handlers
```typescript
// Analyze commits for AI attribution
electron.ipcMain.handle('analyze-ai-attribution', async (event, projectId: string) => {
  // Analyze commits using time correlation + message patterns
  // Update ai_attribution table
});

// Get AI contribution stats
electron.ipcMain.handle('get-ai-attribution-stats', async (event, { projectId, startDate, endDate }) => {
  // Return estimated AI vs human contribution
});
```

### UI Changes
```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI Contribution Estimate                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  This analysis is approximate based on:                  │
│  • AI usage timestamps correlation                      │
│  • Commit message patterns                              │
│  • Code change velocity                                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │        [Gauge Chart]                            │   │
│  │                                                 │   │
│  │    AI Estimated: 35%                           │   │
│  │    Human Written: 65%                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Confidence: Low (based on limited data)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Files to Modify
| File | Changes |
|------|---------|
| `src/main.ts` | Add `ai_attribution` table, attribution analysis handler |
| `src/preload.ts` | Add IPC bindings |
| `src/App.tsx` | Add type definitions |
| `src/pages/IDEProjectsPage.tsx` | Add AI Attribution section with disclaimer |

### Success Criteria
- [ ] Attribution table populated
- [ ] UI shows estimated AI contribution with disclaimer
- [ ] Confidence level displayed
- [ ] User understands this is approximate

### Ethical Considerations
- Add clear disclaimer that attribution is speculative
- Don't claim certainty
- Focus on helping users understand their workflow
- Allow user to manually override/correct attributions

---

## 📊 Implementation Order & Dependencies

```
Phase 1 (Daily Metrics)
    ↓
Phase 2 (Language Detection) ←───┐
    ↓                           │
Phase 3 (DORA + File Freq) ─────┘
    ↓
Phase 4 (AI Attribution)
```

**Rationale:**
1. Phase 1 uses existing data, minimal changes
2. Phase 2 extends commit sync to parse files
3. Phase 3 builds on daily metrics foundation
4. Phase 4 cross-references AI sessions with commits

---

## 🔧 Technical Considerations

### Performance
- **Batch Processing**: When syncing commits, process in batches of 100
- **Background Jobs**: Use `setTimeout` to not block IPC handlers
- **Indexing**: All new tables have appropriate indexes

### Storage
- **Aggregation vs Raw**: Store aggregates, not raw per-file data
- **Retention**: Consider adding cleanup for old metrics (keep 90 days)
- **Space Estimate**: ~1KB per daily metric row, ~10MB per 10K commits

### Error Handling
- Git commands can fail (not a repo, no commits, etc.)
- API calls can timeout (GitHub rate limits)
- All handlers return `{ success, data, error }` format

### Testing
- Test with known repos with different language mixes
- Test DORA calculations with varying commit patterns
- Test attribution with known AI-assisted commits

---

## 📁 Files Summary

### Backend Changes (main.ts)
| Handler | Phase | Lines Est. |
|---------|-------|------------|
| `aggregate-code-metrics` | 1 | ~50 |
| `get-code-metrics` | 1 | ~30 |
| `sync-file-changes` | 2 | ~80 |
| `get-language-metrics` | 2 | ~30 |
| `get-dora-metrics` | 3 | ~40 |
| `get-file-frequency` | 3 | ~30 |
| `get-commit-times` | 3 | ~30 |
| `analyze-ai-attribution` | 4 | ~100 |

### Frontend Changes (IDEProjectsPage.tsx)
| Component | Phase | Lines Est. |
|-----------|-------|------------|
| Code Activity Card | 1 | ~100 |
| Weekly Trend Chart | 1 | ~80 |
| Language Pie Chart | 2 | ~60 |
| DORA Metrics Section | 3 | ~120 |
| File Frequency Section | 3 | ~60 |
| Commit Time Chart | 3 | ~60 |
| AI Attribution Section | 4 | ~80 |

### Database Tables (4 new)
1. `code_metrics_daily`
2. `language_metrics`
3. `file_metrics`
4. `ai_attribution`

---

## ✅ Success Criteria Summary

### Phase 1
- [ ] Daily aggregates stored
- [ ] Weekly activity shown in UI
- [ ] Trend comparison working

### Phase 2
- [ ] Languages parsed from commits
- [ ] Language pie chart displayed
- [ ] Weekly breakdown shown

### Phase 3
- [ ] DORA metrics calculated
- [ ] Most active files list
- [ ] Commit time distribution

### Phase 4
- [ ] Attribution analysis runs
- [ ] UI shows estimates with disclaimer
- [ ] Confidence level displayed

---

## 🚀 Next Steps

1. **User approves plan** - Select phases to implement
2. **Start Phase 1** - Daily Code Metrics (quick win)
3. **Iterate** - Get feedback after each phase
4. **Prioritize** - Adjust based on user needs

---

**Document Version:** 1.0
**Last Updated:** 2026-04-17
