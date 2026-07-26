# IDE Projects Feature - Technical Design

> Synthesized from research conducted on 2026-04-15

---

## Executive Summary

The IDE Projects feature will track developer tools, AI assistant usage, and productivity metrics. Built on privacy-first principles with local-first data storage.

**Key Decisions:**
1. **IDE Support Priority**: VS Code → Cursor → JetBrains (VS Code/Cursor highest value for vibe coding)
2. **AI Tracking Strategy**: Cursor API + Claude Code JSONL parsing + GitHub Copilot API (Enterprise)
3. **Data Storage**: Local SQLite + optional cloud sync
4. **Telemetry**: Anonymous, opt-in, following Supabase CLI model

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        App Tracker Client                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  Detectors  │  │  Collectors │  │   Sync      │                │
│  │             │  │             │  │   Engine    │                │
│  │ • IDE Scan  │  │ • Git Stats │  │             │                │
│  │ • Tool PATH │  │ • AI Usage  │  │ • GitHub    │                │
│  │ • Extensions│  │ • DORA      │  │ • GitLab    │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │                │                │                        │
│         └────────────────┼────────────────┘                        │
│                          ▼                                         │
│              ┌───────────────────────┐                             │
│              │   Local SQLite DB     │                             │
│              │   (app-tracker.db)    │                             │
│              └───────────┬───────────┘                             │
│                          │                                         │
│         ┌────────────────┼────────────────┐                        │
│         ▼                ▼                ▼                        │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  CLI Tool  │  │  GUI View   │  │  API Server │                  │
│  │  stats/    │  │  Dashboard  │  │  (optional) │                  │
│  │  tools     │  │             │  │             │                  │
│  └────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Model

### 2.1 Core Entities

```typescript
// IDE Installation
interface IDE {
  id: string;
  name: 'vscode' | 'cursor' | 'jetbrains';
  version: string;
  installPath: string;
  lastOpened: Date;
}

// Extension
interface Extension {
  id: string;
  ideId: string;
  publisher: string;
  name: string;
  version: string;
  enabled: boolean;
  installDate?: Date;
}

// Detected Tool
interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  version?: string;
  installPath?: string;
  detectedAt: Date;
  detectionMethod: 'path' | 'package-manager' | 'config-file' | 'manual';
}

type ToolCategory = 
  | 'package-manager'
  | 'build-tool'
  | 'linter'
  | 'formatter'
  | 'type-checker'
  | 'test-runner'
  | 'container'
  | 'runtime'
  | 'ide'
  | 'ai-assistant';

// Project
interface Project {
  id: string;
  name: string;
  path: string;
  repositoryUrl?: string;
  vcsType?: 'git' | 'hg' | 'svn';
  primaryLanguage?: string;
  tools: Tool[];
  addedAt: Date;
  lastActivityAt: Date;
}

// AI Usage Session
interface AIUsage {
  id: string;
  projectId?: string;
  tool: 'cursor' | 'copilot' | 'claude-code' | 'continue';
  date: Date;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  costUsd?: number;
  model?: string;
}

// Commit Metric
interface CommitMetric {
  id: string;
  projectId: string;
  sha: string;
  author: string;
  authorEmail: string;
  date: Date;
  message: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  aiAttribution?: {
    tool?: 'cursor' | 'copilot' | 'claude';
    linesAiAdded?: number;
    linesAiDeleted?: number;
    linesHumanAdded?: number;
  };
}

// DORA Metrics
interface DORAMetrics {
  projectId: string;
  period: 'week' | 'month' | 'quarter';
  startDate: Date;
  endDate: Date;
  deploymentFrequency: number;       // deployments per day
  leadTimeHours: number;             // median hours
  changeFailureRate: number;         // percentage
  meanTimeToRecoveryHours: number;
  level: 'elite' | 'high' | 'medium' | 'low';
}
```

### 2.2 Database Schema (SQLite)

```sql
-- IDEs
CREATE TABLE ides (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  install_path TEXT,
  last_opened DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Extensions
CREATE TABLE extensions (
  id TEXT PRIMARY KEY,
  ide_id TEXT REFERENCES ides(id),
  publisher TEXT,
  name TEXT NOT NULL,
  version TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  install_date DATETIME
);

-- Tools
CREATE TABLE tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  version TEXT,
  install_path TEXT,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  detection_method TEXT
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  repository_url TEXT,
  vcs_type TEXT,
  primary_language TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME
);

-- Project-Tool relationship
CREATE TABLE project_tools (
  project_id TEXT REFERENCES projects(id),
  tool_id TEXT REFERENCES tools(id),
  PRIMARY KEY (project_id, tool_id)
);

-- AI Usage
CREATE TABLE ai_usage (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  tool TEXT NOT NULL,
  date DATE NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  model TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_usage_date ON ai_usage(date);
CREATE INDEX idx_ai_usage_tool ON ai_usage(tool);

-- Commits
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
);

CREATE INDEX idx_commits_project ON commits(project_id);
CREATE INDEX idx_commits_date ON commits(date);

-- AI Attribution
CREATE TABLE ai_attribution (
  commit_id TEXT PRIMARY KEY REFERENCES commits(id),
  tool TEXT,
  lines_ai_added INTEGER DEFAULT 0,
  lines_ai_deleted INTEGER DEFAULT 0,
  lines_human_added INTEGER DEFAULT 0
);

-- DORA Metrics
CREATE TABLE dora_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  period TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  deployment_frequency REAL,
  lead_time_hours REAL,
  change_failure_rate REAL,
  mean_time_to_recovery_hours REAL,
  level TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dora_project ON dora_metrics(project_id);
```

---

## 3. Data Collection Strategies

### 3.1 IDE & Extension Detection

| IDE | Detection Method | Data Source |
|-----|------------------|-------------|
| VS Code | CLI: `code --list-extensions` | User-level |
| VS Code | File scan: `%APPDATA%\Code\User\` | SQLite state.vscdb |
| Cursor | File scan: `%APPDATA%\Cursor\User\globalStorage\` | SQLite state.vscdb |
| JetBrains | Toolbox CLI: `jetbrains-toolbox --list` | User-level |

```javascript
// VS Code detection
async function detectVSCode() {
  try {
    const extensions = execSync('code --list-extensions').toString().split('\n');
    return extensions.filter(Boolean).map(ext => ({
      id: ext,
      publisher: ext.split('.')[0],
      name: ext.split('.')[1],
      enabled: true
    }));
  } catch {
    return [];
  }
}

// Cursor state parsing
async function parseCursorState() {
  const dbPath = getCursorPath('globalStorage/state.vscdb');
  const db = await open(dbPath);
  
  const extensions = await db.all(
    "SELECT key, value FROM ItemTable WHERE key LIKE 'extension.%'"
  );
  
  const aiUsage = await db.all(
    "SELECT key, value FROM ItemTable WHERE key LIKE 'aiService.%'"
  );
  
  return { extensions, aiUsage };
}
```

### 3.2 Tool Detection

```javascript
// Priority detection order
const DETECTION_PRIORITY = [
  // 1. Package managers (authoritative for ecosystem)
  'npm', 'yarn', 'pnpm', 'pip', 'cargo', 'brew', 'choco', 'winget',
  
  // 2. PATH-based for common tools
  'git', 'node', 'python', 'python3', 'docker', 'kubectl', 'terraform',
  
  // 3. Project-specific config files
  // package.json, pyproject.toml, Cargo.toml, go.mod, etc.
];

async function detectAllTools() {
  const tools = [];
  
  // Package manager queries
  for (const pm of ['npm', 'pip', 'cargo', 'brew', 'choco']) {
    const detected = await detectPackageManager(pm);
    tools.push(...detected);
  }
  
  // PATH scanning
  for (const cmd of COMMON_TOOLS) {
    const detected = await detectFromPath(cmd);
    if (detected) tools.push(detected);
  }
  
  // Project configs
  const projectTools = await scanProjectConfigs();
  tools.push(...projectTools);
  
  return deduplicate(tools);
}
```

### 3.3 AI Usage Collection

| Tool | Method | Data Available |
|------|--------|----------------|
| Cursor (Enterprise) | Analytics API | Full token tracking, AI code attribution |
| Cursor (Free/Pro) | Local SQLite parse | Basic generation counts |
| GitHub Copilot | Usage Metrics API | Engagement metrics (NOT tokens) |
| Claude Code | JSONL parse | input_tokens, output_tokens from transcripts |

```javascript
// Claude Code transcript parsing
async function parseClaudeCodeTranscripts() {
  const transcriptDir = path.join(os.homedir(), '.claude', 'projects');
  const usage = [];
  
  for (const projectDir of fs.readdirSync(transcriptDir)) {
    const projectPath = path.join(transcriptDir, projectDir);
    
    for (const file of fs.readdirSync(projectPath)) {
      if (file.endsWith('.jsonl')) {
        const lines = fs.readFileSync(path.join(projectPath, file), 'utf8').split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const entry = JSON.parse(line);
          if (entry.type === 'message' && entry.role === 'assistant' && entry.usage) {
            usage.push({
              projectId: projectDir,
              tool: 'claude-code',
              date: new Date(),
              inputTokens: entry.usage.input_tokens || 0,
              outputTokens: entry.usage.output_tokens || 0,
              cacheWriteTokens: entry.usage.cache_creation_input_tokens || 0,
              cacheReadTokens: entry.usage.cache_read_input_tokens || 0,
              model: entry.model || 'unknown'
            });
          }
        }
      }
    }
  }
  
  return usage;
}

// GitHub Copilot API (Enterprise/Organization)
async function fetchCopilotMetrics(org, token) {
  const response = await fetch(
    `https://api.github.com/orgs/${org}/copilot/metrics/reports/organization-1-day`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );
  
  return response.json();
}
```

### 3.4 Git Metrics Collection

```javascript
// Local git analysis
async function analyzeLocalRepo(repoPath) {
  const git = simpleGit(repoPath);
  
  const log = await git.log({ maxCount: 100 });
  const diffSummary = await git.diffSummary(['HEAD~10..HEAD']);
  
  return {
    commits: log.all.map(c => ({
      sha: c.hash,
      author: c.author_name,
      authorEmail: c.author_email,
      date: new Date(c.date),
      message: c.message,
      // Stats require additional query
    })),
    summary: diffSummary,
  };
}

// GitHub API for remote repos
async function fetchGitHubCommits(owner, repo, token) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    }
  );
  
  return response.json();
}
```

---

## 4. API Specifications

### 4.1 Internal API Endpoints

```typescript
// IDE Management
GET    /api/ides                    // List all detected IDEs
POST   /api/ides/scan               // Trigger IDE scan
GET    /api/ides/:id/extensions     // Get extensions for IDE

// Tool Detection
GET    /api/tools                   // List all detected tools
POST   /api/tools/scan              // Trigger tool scan
GET    /api/tools/categories        // Get tool categories

// Projects
GET    /api/projects                // List tracked projects
POST   /api/projects                // Add project to track
DELETE /api/projects/:id            // Remove project
GET    /api/projects/:id/metrics    // Get project metrics

// AI Usage
GET    /api/ai-usage               // Get AI usage (query: ?from=&to=&tool=)
GET    /api/ai-usage/summary        // Aggregated summary
POST   /api/ai-usage/sync           // Sync from IDEs

// Git Metrics
GET    /api/commits                // Get commits (query: ?projectId=&from=&to=)
GET    /api/commits/stats           // Commit statistics
GET    /api/dora                    // Get DORA metrics

// Dashboards
GET    /api/dashboard/overview      // Overview metrics
GET    /api/dashboard/ai-tools      // AI tool breakdown
GET    /api/dashboard/trends        // Trend data
```

### 4.2 External API Integrations

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| GitHub | Commits, Copilot metrics | OAuth / PAT |
| GitLab | Commits (if not GitHub) | OAuth / PAT |
| Cursor Analytics | Token usage, AI attribution | API Key (Team/Enterprise) |
| JetBrains Toolbox | IDE detection | CLI invocation |

---

## 5. UI/UX Design

### 5.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Logo] App Tracker    Overview  AI Tools  Projects  Tools  Trends  [⚙] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 🤖 AI Tokens │ │ 📝 Commits  │ │ 🔧 Setup    │ │ 📁 Projects │   │
│  │   1.2M      │ │    23       │ │   85/100    │ │     3       │   │
│  │ ▲ 23%      │ │ ▲ 15%      │ │ ▲ 5pts     │ │ ─         │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  ┌────────────────────────────────┐  ┌─────────────────────────────┐   │
│  │ AI Usage Over Time              │  │ Tool Distribution           │   │
│  │ [═══════════════════════════]   │  │                             │   │
│  │ 1.2M ┤                    ╭───  │  │ [Donut Chart]               │   │
│  │ 0.9M ┤              ╭──╯       │  │  Cursor: 78%                │   │
│  │ 0.6M ┤        ╭────╯           │  │  Copilot: 22%               │   │
│  │ 0.3M ┤  ╭───╯                 │  │                             │   │
│  └────────────────────────────────┘  └─────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Recent Activity                                                      ││
│  │ • app-tracker: 12 commits, 450K tokens (Cursor)           2h ago  ││
│  │ • api-service: 8 commits, 120K tokens (Copilot)          5h ago  ││
│  │ • docs: 3 commits, 0 tokens                                 1d ago││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Component Specifications

**Metric Card:**
```
┌────────────────────────────────┐
│ [Icon]  Title             [?] │
├────────────────────────────────┤
│                                │
│      Large Value (32px)        │
│      Trend indicator (+23%)     │
│                                │
│ ▁▂▃▅▆▇█▇▆▅▄ (sparkline)       │
└────────────────────────────────┘
```

**AI vs Human Contribution:**
```
┌────────────────────────────────────┐
│ AI vs Human Contribution           │
├────────────────────────────────────┤
│ [████████████████░░░░░░░░] 67%   │
│                                    │
│ Legend:  █ AI (67%)  ░ Human (33%)│
│                                    │
│ Breakdown:                         │
│ ├─ Cursor Tab: 8,200 lines        │
│ ├─ Cursor Composer: 4,250 lines   │
│ ├─ Copilot: 3,200 lines           │
│ └─ Human: 8,150 lines            │
└────────────────────────────────────┘
```

**Tool Setup Score:**
```
┌────────────────────────────────────┐
│ 🔧 Tool Setup Score        85/100  │
├────────────────────────────────────┤
│ ✓ IDE: VS Code + Cursor           │
│ ✓ Linters: ESLint, Ruff           │
│ ✓ Formatters: Prettier, Black     │
│ ✓ AI: Copilot, Claude Code        │
│ ✓ VCS: Git configured             │
│                                    │
│ ○ Missing:                        │
│   • Docker (container detected)   │
│   • CI/CD configuration           │
│                                    │
│ [██████████████░░░░] 85%          │
└────────────────────────────────────┘
```

### 5.3 Color Palette

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| AI Metrics | `#7C3AED` (Purple) | `#A78BFA` (Violet) |
| Human Metrics | `#0D9488` (Teal) | `#34D399` (Emerald) |
| Success | `#10B981` | `#34D399` |
| Warning | `#F59E0B` | `#FBBF24` |
| Error | `#EF4444` | `#F87171` |
| Background | `#F9FAFB` | `#111827` |
| Surface | `#FFFFFF` | `#1F2937` |

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅ COMPLETE

**Goals:**
- [x] Database schema setup (ides, extensions, tools, projects, project_tools, ai_usage, commits, ai_attribution, dora_metrics)
- [x] Basic IDE detection (VS Code via `code --list-extensions` CLI)
- [x] Tool PATH scanning (git, node, docker, npm, etc.)
- [x] Project addition/removal
- [x] GUI dashboard (`IDEProjectsPage.tsx` with Overview, IDEs, Tools, Projects tabs)

**Deliverables:**
- IDE Projects page with tabs: Overview, IDEs, Tools, Projects
- IPC handlers: detect-ides, scan-tools, add-project, get-projects, remove-project

### Phase 2: AI Tracking (Weeks 3-4) ✅ COMPLETE

**Goals:**
- [x] Claude Code JSONL parsing (reads `~/.claude/projects/*/*.jsonl`)
- [x] Cursor local state parsing (reads `state.vscdb` SQLite)
- [x] GitHub Copilot placeholder (Coming Soon card)
- [x] Token aggregation and cost calculation (Claude 3.5 Sonnet pricing)
- [x] AI usage dashboard cards with sync functionality

**Deliverables:**
- AI Tools tab with Claude Code and Cursor AI cards
- IPC handlers: sync-ai-usage, get-ai-usage-summary

### Phase 3: Git Metrics (Weeks 5-6) ✅ COMPLETE (GUI in progress)

**Goals:**
- [x] Local git repository analysis (via simple-git)
- [x] GitHub API integration (via octokit/rest)
- [x] Commit frequency tracking
- [x] Code churn metrics (additions/deletions)
- [x] Basic DORA calculations (deployment frequency, lead time, change failure rate, MTTR)
- [x] Git tab in GUI

**Deliverables:**
- Git tab with DORA metrics cards, commit history, contributor stats
- IPC handlers: sync-commits, sync-github-commits, get-dora-metrics, get-commit-history, get-contributor-stats

### Phase 4: Advanced Features (Weeks 7-8) 🔄 IN PROGRESS

**Goals:**
- [ ] AI attribution (Cursor AI Code Tracking API)
- [ ] Co-Authored-By detection in commits
- [ ] JetBrains IDE detection (Toolbox CLI)
- [ ] Tool setup recommendations
- [ ] Project health scores

**Deliverables:**
```bash
# Future CLI
app-tracker health --project=my-project
app-tracker recommendations --project=my-project
```

### Phase 5: Polish & Scale (Weeks 9-10) ⏳ PENDING

**Goals:**
- [ ] Notification system
- [ ] Weekly summaries
- [ ] Performance optimization
- [ ] Mobile companion view

**Deliverables:**
- Notification preferences
- Weekly digest emails

---

## 7. Privacy & Security

### 7.1 Privacy Principles (Supabase CLI Model)

| Principle | Implementation |
|-----------|---------------|
| Anonymous ID | Random UUID per installation, no PII |
| Opt-in | All tracking disabled by default |
| Local-first | Data stored locally, never transmitted without consent |
| Flag redaction | Sensitive CLI flags filtered by default |
| No paths/code | File paths and code content never collected |
| Transparent | Users can view all collected data |

### 7.2 Consent Flow

```
First Launch:
┌─────────────────────────────────────────┐
│ Welcome to App Tracker!                 │
│                                         │
│ To track your development activity,      │
│ we need your permission.                 │
│                                         │
│ What we collect:                         │
│ ✓ Installed tools (no paths)            │
│ ✓ AI usage tokens (no code)             │
│ ✓ Git commit stats (no content)          │
│ ✓ Project metadata                       │
│                                         │
│ [Enable Tracking]  [Maybe Later]        │
│                                         │
│ You can change this anytime in Settings  │
└─────────────────────────────────────────┘
```

### 7.3 Data Export/Delete

```bash
# Export all data
app-tracker export --format=json

# Delete all data
app-tracker reset --confirm
```

---

## 8. Technical Stack Recommendations

| Component | Recommendation | Rationale |
|-----------|-----------------|-----------|
| Database | SQLite | Local-first, portable, sufficient for this scale |
| ORM | better-sqlite3 | Synchronous, fast, TypeScript support |
| Git analysis | simple-git (Node.js) | Well-maintained, Promise-based |
| HTTP client | Built-in fetch | Modern, sufficient |
| Charts | Chart.js or Recharts | Well-documented, responsive |
| UI Framework | Tauri (existing) or React | If adding GUI |
| State management | Zustand | Lightweight, TypeScript |

---

## 9. Key Decisions & Open Questions

### Decided

1. **VS Code + Cursor first** - Highest relevance for vibe coding
2. **Local SQLite storage** - Privacy-first approach
3. **Anonymous telemetry** - Following Supabase CLI model
4. **CLI-first** - Power users, then GUI
5. **Claude Code JSONL parsing** - No official API available

### Open Questions

1. **Cloud sync?** - If yes, encryption-at-rest needed
2. **Team features?** - Sharing dashboards across team
3. **Budget alerts?** - Define thresholds and notification channels
4. **Auto-detect projects?** - Scan common directories or manual add?
5. **JetBrains priority?** - Lower for vibe coding but requested

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Setup time | < 5 minutes for first project |
| CLI response time | < 500ms for stats commands |
| AI usage accuracy | > 95% vs actual (for parsed sources) |
| Privacy compliance | 100% - no accidental data transmission |
| Tool detection coverage | > 90% of common dev tools |

---

## Appendix: Research Sources

| Topic | Key Sources |
|-------|-------------|
| IDE Detection | VS Code Extension API docs, Cursor state.vscdb analysis |
| AI Tracking | Cursor Analytics API, GitHub Copilot Usage Metrics API (2026) |
| Git Metrics | GitHub REST API, simple-git library |
| Telemetry | Supabase CLI telemetry PR, OTel DevEx conventions |
| Tool Detection | npm/pip/cargo CLI docs, PATH scanning best practices |
| UI/UX | LinearB, Jellyfish, Faros AI dashboard analysis |
