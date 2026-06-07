# Context Bundle — IDE Projects Page Revamp

## Project Overview
DeskFlow — Electron desktop app for tracking app usage, managing AI agent workspaces (Tracker Mind), and visualizing data.

## Tech Stack
- **Electron** ~34.3 — Desktop wrapper
- **React** ^19.2.0 — UI framework
- **TypeScript** ~5.9.3
- **Vite** ^7.3.1
- **Tailwind CSS** 4.2.1 (v4 syntax ONLY — `@import "tailwindcss"`)
- **Framer Motion** ^12.35.0
- **Lucide React** ^0.577.0 (icons)
- **Chart.js** ^4.5.1 + react-chartjs-2
- **date-fns** ^4.1.0

## Sidebar (App.tsx ~L2360-2413)

### Sidebar items array (L2360-2372):
```tsx
const sidebarItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Target, label: 'Productivity', path: '/productivity' },
  { icon: PieChart, label: 'Applications', path: '/stats' },
  { icon: Globe, label: 'Browser Activity', path: '/browser' },
  { icon: Code2, label: 'IDE Projects', path: '/ide' },
  { icon: Clock4, label: 'External', path: '/external' },
  { icon: Bot, label: 'AI Assistant', path: '/ai' },
  { icon: BarChart3, label: 'Insights', path: '/reports' },
  { icon: Database, label: 'Database', path: '/database' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Tutorial', path: '/tutorial' },
];
```

### Sidebar rendering (L2374-2413):
```tsx
<div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-white">
  {/* Sidebar */}
  <div className="w-64 border-r border-zinc-800 flex flex-col h-full glass">
    <div className="p-5 flex items-center gap-3 border-b border-zinc-800 shrink-0">
      {/* Logo: Zap icon + "DeskFlow" + "AI TRACKER" */}
    </div>

    <div className="flex-1 min-h-0 max-h-full">
      <div className="h-full overflow-y-auto px-3 py-4 space-y-1.5">
      {sidebarItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <motion.button key={item.path} onClick={() => handleSidebarNavigation(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors duration-150 ${
              isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </motion.button>
        );
      })}
      </div>
    </div>

    <div className="px-5 py-2 border-t border-zinc-800 flex items-center justify-between shrink-0">
      <span className="text-[10px] text-zinc-500">Local SQLite • Zero Cloud • Privacy-First</span>
      <span className="text-[10px] text-zinc-600">DeskFlow v3.85</span>
    </div>
  </div>
```

## IDE Projects Page (IDEProjectsPage.tsx, ~4059 lines)

### Active tab state (L158):
```tsx
const [activeTab, setActiveTab] = useState<'overview' | 'ides' | 'tools' | 'projects' | 'ai' | 'git' | 'analytics' | 'trash'>(() => {
  const saved = localStorage.getItem('ide-projects-activeTab');
  return (saved as any) || 'overview';
});
```

### Tab bar (L916-935):
```tsx
<div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl w-fit">
  {(['overview', 'ides', 'tools', 'projects', 'ai', 'git', 'analytics', 'trash'] as const).map((tab) => (
    <motion.button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'trash') loadTrashProjects(); }}
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
        activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
      }`}
    >
      {tab === 'ai' ? 'AI Tools' : tab === 'git' ? 'Git' : tab === 'analytics' ? 'Analytics' : tab.charAt(0).toUpperCase() + tab.slice(1)}
    </motion.button>
  ))}
</div>
```

### Tab labels:
| Key | Display Name |
|-----|--------------|
| overview | Overview |
| ides | Ides (capitalized) |
| tools | Tools |
| projects | Projects |
| ai | AI Tools |
| git | Git |
| analytics | Analytics |
| trash | Trash |

### Page header (includes Sync AI button) (L819-888):
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
      <Code2 /> IDE Projects
    </h1>
    <p className="text-zinc-500 mt-1">Track your development environment, AI tools, and project metrics</p>
  </div>
  <div className="flex items-center gap-2 flex-wrap">
    <div className="flex items-center gap-2">
      <button onClick={handleSyncAI} disabled={syncingAI}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg ...">
        <Sparkles /> {syncingAI ? 'Syncing...' : 'Sync AI'}
      </button>
      {aiLastSyncAt && !syncingAI && (
        <span className="text-xs text-zinc-500">Last: Xm ago</span>
      )}
    </div>
    <button onClick={() => setShowSetupModal(true)}
      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg ...">
      <HelpCircle /> Guide
    </button>
    {activeTab === 'tools' && (
      <button onClick={handleScan} disabled={scanning}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg ...">
        <RefreshCw /> {scanning ? 'Scanning...' : 'Scan Tools'}
      </button>
    )}
    {activeTab === 'ides' && (
      <button onClick={handleScan} disabled={scanning}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg ...">
        <RefreshCw /> {scanning ? 'Scanning...' : 'Scan IDEs'}
      </button>
    )}
  </div>
</div>
```

## Current Tab Descriptions

### Overview Tab (L938-1130)
- Dashboard-like view with 4 metric cards: IDEs Detected, Tools Found, AI Tokens, Commits
- AI Usage Overview chart (line chart, last 30 days per AI agent)
- AI Token Distribution doughnut chart
- Recent Git Activity widget

### IDEs Tab (L1132-1187)
- Shows detected IDEs (VS Code, WebStorm, etc.) as cards
- Each card shows: icon, name, version, install path, extension count
- "Scan IDEs" button in header when this tab is active
- **User says:** "redundant with tools tab — just shows a list of IDs on separate page"

### Tools Tab (L1189-1284)
- Shows dev tools grouped by category (version control, runtimes, package managers, containers, build tools, etc.)
- Expandable/collapsible category groups
- "Scan Tools" button, "Reset Tools" button
- **User says:** "it only shows the list of tools that you're using — we can make it better"

### Projects Tab (L1286-1583)
- Main functionality: list projects with ability to add, open, edit, delete
- Add Project modal with custom directory scanning
- Expandable project cards with details (tools, sessions, health, presets)
- This is the core useful tab

### AI Tools Tab (L1584-2257)
- AI agent usage summary (tokens, messages, cost per agent)
- Per-agent charts (line + doughnut)
- Agent comparison, detail drilling, debug panel
- **User says:** Sync AI button should be moved INTO this tab

### Git Tab (L2258-2728)
- Commit history, contributor stats, DORA metrics
- Git sync functionality
- **User says:** useful, keep and improve

### Analytics Tab (L2729-2762)
- Workspace analytics dashboard (AI usage, problems, requests across projects)
- Uses <AnalyticsDashboard> component
- **User says:** somewhat useful, keep

### Trash Tab (L2764-2819)
- Shows deleted projects with "Restore" and "Delete Forever" buttons
- Uses `Trash2` icon
- **User says:** "useless — who deletes projects and wants them stored? Replace with backup place"

## Key Observations

### Current issues with sidebar:
- Condensed padding, doesn't utilize full sidebar height
- `px-3 py-4 space-y-1.5` on the nav inner container
- Items use `px-4 py-2.5` with small gap `gap-3`
- Footer section at bottom with tiny text

### Current issues with IDE page:
- **8 tabs** is too many, several are redundant or low-value
- "IDEs" tab is just a list of detected IDEs — redundant with "Tools" which also shows what's installed
- "Tools" tab is just a categorized list of dev tools — not actionable
- "Trash" tab is rarely used — only shows deleted projects
- "Sync AI" button is in the global header, but it should be specific to the AI Tools tab
- No backup/restore functionality exists for AI coding changes

### Available IPC endpoints (from preload.ts):
- `getIDEProjectsOverview()` — fetch all overview data
- `detectIDEs()` — scan for installed IDEs
- `scanTools()` — scan for dev tools
- `resetTools()` — clear and re-scan tools
- `syncAIUsage()` — import AI usage data from Claude Code, Cursor, OpenCode, etc.
- `getAISyncStatus()` — check when AI data was last synced
- `onAISyncProgress(callback)` — progress events during AI sync
- `addProject(data)` — add project to tracking
- `updateProject(id, data)` — update project
- `deleteProject(id)` — soft delete (mark deleted_at)
- `restoreProject(id)` — restore soft-deleted project
- `removeProject(id)` — permanently delete
- `getAllProjects()` — get all projects including deleted
- `getProjectDetails(id)` — get project details
- `openProject(id, ideId)` — open project in IDE
- `getCommitHistory(id, limit)` — git commit history
- `getContributorStats(id)` — git contributor stats
- `getDORAMetrics(id, period)` — DORA metrics
- `syncCommits(id, path)` — sync git commits
- `syncGitHubCommits(id, owner, repo, token)` — sync GitHub commits
- `getAIUsageSummary(period)` — AI usage summary
- `getProblems()` — get problems
- `getRequests()` — get requests
- `getTerminalSessions(projectId, limit)` — terminal sessions
- `getPromptHistory({limit})` — prompt history
- `debugAIAgents()` — debug info for AI agent detection

## Design Tokens
- Background: `bg-[#0a0a0a]` (near-black)
- Card/panel: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5`
- Tab bar: `bg-zinc-900/50 rounded-xl p-1` with active `bg-zinc-800 text-white`
- Buttons: `bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg`
- Text hierarchy: white (primary), `text-zinc-400` (secondary), `text-zinc-500` (tertiary), `text-zinc-600` (muted)
- Accent colors: indigo-500, emerald-500, violet-400, blue-400
- Button icon colors: matching accent colors
- Layout: `max-w-7xl mx-auto space-y-6`
- Glass effect: `glass` class (defined in index.css with backdrop-blur)
- Transitions: `transition-colors duration-150`

## PageShell Component
The page uses `<PageShell page="ide-projects" className="max-w-7xl mx-auto space-y-6">` wrapper.
