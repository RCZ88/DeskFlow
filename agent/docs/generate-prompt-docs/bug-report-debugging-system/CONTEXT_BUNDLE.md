# CONTEXT_BUNDLE — Collaborative Debugging System

> Auto-generated context bundle for designing the Collaborative Debugging System.
> Covers workspace sidebar system, terminal dispatch, problems pipeline, and UI component patterns.

---

## 1. Workspace Sidebar System

### Group Registration

The sidebar has 5 top-level groups. `GroupKey` type at `src/pages/TerminalPage.tsx:292`:

```typescript
type GroupKey = 'setup' | 'work' | 'insights' | 'studio' | 'context';
```

`activeGroup` state at `TerminalPage.tsx:293-298`:

```typescript
const [activeGroup, setActiveGroup] = useState<GroupKey>(() => {
  const saved = localStorage.getItem('terminal-activeGroup');
  return (saved as GroupKey) || 'setup';
});
```

Persisted via effect at `TerminalPage.tsx:1390-1391`:
```typescript
useEffect(() => { localStorage.setItem('terminal-activeGroup', activeGroup); }, [activeGroup]);
```

### Group Tab Bar Rendering

`TerminalPage.tsx:2714-2739`:
```typescript
{([
  { key: 'setup' as const, icon: Settings, label: 'Setup', accent: 'orange' },
  { key: 'work' as const, icon: Monitor, label: 'Work', accent: 'green' },
  { key: 'insights' as const, icon: PieChart, label: 'Insights', accent: 'purple' },
  { key: 'studio' as const, icon: Sparkles, label: 'Studio', accent: 'indigo' },
  { key: 'context' as const, icon: Settings2, label: 'Context', accent: 'amber' },
]).map((g) => {
  const active = activeGroup === g.key;
  const Icon = g.icon;
  return (
    <button
      key={g.key}
      onClick={() => { setFileChangedPulse(false); setActiveGroup(g.key); }}
      className={...}
    >
      <Icon size={16} />
      <span>{g.label}</span>
    </button>
  );
})}
```

### Insights Group Sub-Tabs (target location for Bugs tab)

`TerminalPage.tsx:3856-3892`:
```typescript
{activeGroup === 'insights' && (
  <WorkspaceShell tabs={[
    { key: 'analytics', icon: PieChart, label: 'Analytics' },
    { key: 'issues', icon: ListChecks, label: 'Issues' },
  ]} storageKey="insights" render={(sub) => {
    switch (sub) {
      case 'analytics': return (
        <GroupPanel accent="purple">
          <PeriodSelector />
          <AnalyticsDashboard ... />
        </GroupPanel>
      );
      case 'issues': return (
        <GroupPanel accent="emerald">
          <IssuesWorkspace projectId={selectedProject} projectPath={propProjectPath} activeTerminalId={activeTerminalId} sessions={sessions} />
        </GroupPanel>
      );
      default: return null;
    }
  }} />
)}
```

### Key Components

**GroupPanel** — `TerminalPage.tsx:238-247`:
```typescript
function GroupPanel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-3 p-3 h-full ${ACCENT_STRIP[accent as keyof typeof ACCENT_STRIP] || ''}`}>
      {children}
    </div>
  );
}
```

**ACCENT_STRIP** — `TerminalPage.tsx:150-153`:
```typescript
const ACCENT_STRIP: Record<string, string> = {
  purple: 'border-l-2 border-purple-500/30',
  emerald: 'border-l-2 border-emerald-500/30',
  blue: 'border-l-2 border-blue-500/30',
  indigo: 'border-l-2 border-indigo-500/30',
  orange: 'border-l-2 border-orange-500/30',
};
```

**WorkspaceShell** — `src/components/workspace/WorkspaceShell.tsx:1-16`:
```typescript
export function WorkspaceShell({ tabs, storageKey, render }: {
  tabs: SubTabDef[];
  storageKey: string;
  render: (active: string) => React.ReactNode;
}) {
  const [active, setActive] = usePersistentSubTab(storageKey, tabs[0].key);
  return (
    <div className="flex flex-col h-full">
      <SubTabBar tabs={tabs} active={active} onChange={setActive} />
      <div className="flex-1 overflow-y-auto">{render(active)}</div>
    </div>
  );
}
```

**SubTabBar** — `src/components/workspace/SubTabBar.tsx:1-40`: Renders horizontal pill tabs with icons from the `SubTabDef[]` array. Each tab has `key`, `label`, `icon: LucideIcon`, optional `accent`.

**Pill component** — `TerminalPage.tsx:162-175`: Small toggle button with active/inactive styling.
```typescript
function Pill({ active, onClick, children, className }: { ... }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
      active ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/70'
    } ${className || ''}`}>{children}</button>
  );
}
```

**SectionCard** — `TerminalPage.tsx:215-225`: White card wrapper with rounded corners, used for grouping form elements.

---

## 2. Terminal System — Sending Messages to Agents

### Terminal Manager

`src/main.ts:8245` — Simple object:
```typescript
const terminalManager = {
  terminals: new Map<string, { write, resize, kill, onData, onExit, cols, rows, pid }>(),
  // Methods: spawn(terminalId, cwd, cols, rows), write(id, data), resize(id, cols, rows), kill(id)
};
```

### Writing to a Terminal

`src/main.ts:8251-8270` — `write` method:
```typescript
write(id: string, data: string): boolean {
  const term = this.terminals.get(id);
  if (!term) return false;
  try { term.write(data); return true; } catch { return false; }
}
```

IPC handler at `src/main.ts:8672` — `write-terminal`:
```typescript
ipcMain.handle('write-terminal', (_, terminalId: string, data: string) => {
  return terminalManager.write(terminalId, data);
});
```

### Finding Active Terminals / Sessions

Query pattern at `src/main.ts:8858`:
```typescript
const stmt = db.prepare('SELECT * FROM terminal_sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?');
```

`terminal_sessions` table at `src/main.ts:2108-2115`:
```sql
CREATE TABLE IF NOT EXISTS terminal_sessions (
  id TEXT PRIMARY KEY,
  preset_id TEXT,
  project_id TEXT,
  agent TEXT,
  resume_id TEXT,
  topic TEXT,
  working_directory TEXT,
  terminal_id TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### Listening for Terminal Output

Data handler pattern at `src/main.ts:8405-8480`: When a terminal produces output, the `onData` callback is invoked. The system parses the output for:
- **Session Metadata** blocks (`## Session Metadata`)
- **Actions** blocks (`## Actions`)
- Agent signature detection via `AGENT_SIGNATURES` regex
- File edit detection

### Agent Types Detection

`src/main.ts` — `AGENT_SIGNATURES` regex pattern. Agents are identified by their output containing specific signature patterns (bench-ai, claude-engineering, etc.). Each terminal has an `agentType` string stored in `SESSION_CATEGORIES`.

---

## 3. Problems System

### ProblemsService

`src/services/ProblemsService.ts` — File-backed (JSON + markdown sync):

Key methods:
```typescript
class ProblemsService {
  constructor(private baseDir: string, private projectPath?: string)
  getProblems(): Problem[]
  createProblem(data: { title, priority?, category?, description? }): Problem
  updateProblem(id: string, data: Partial<Problem>): Problem
  deleteProblem(id: string): void
  addCheck(parentId: string, description: string, instruction?: string): Check | null
  completeCheck(problemId: string, checkId: string): boolean
}
```

**Problem interface**:
```typescript
interface Problem {
  id: string;
  title: string;
  status: string;        // 'open' | 'in_progress' | 'fixed' | 'wont_fix'
  priority: string;      // 'low' | 'medium' | 'high'
  category: string;      // 'bug' | 'feature' | 'other'
  description: string | null;
  files: string[];
  checks: Check[];
  created_at: string;
  updated_at: string;
}
```

### `context-changed` IPC Event

Fired from main process after any problem/request/check change:
```typescript
mainWindow?.webContents?.send('context-changed', {
  type: 'problem' | 'request' | 'check',
  action: 'created' | 'updated' | 'deleted',
  entity: { id, title?, status? }
});
```

Preload bridge at `src/preload.ts:582-584`:
```typescript
onContextChanged: (handler: (event: any, data: any) => void) => {
  ipcRenderer.on('context-changed', handler);
  return () => { ipcRenderer.removeListener('context-changed', handler); };
},
```

---

## 4. Preload Bridges (IPC Pattern)

`src/preload.ts:480-543` — All workspace & problems bridges:

```typescript
// Workspace bridges
saveWorkspace: (data: { scope, projectId?, name?, sidebarWidth?, activeTab?, terminalTabs?,
  layout?, openFiles?, activeTerminalId?, todos?, presets?, terminalInfo?, configs?,
  contextConfig?, analyticsPeriod?, sessionCategoryFilter?, skillsActiveView?,
  mapListRatio?, theme? }) => ipcRenderer.invoke('workspace:save', data),

loadWorkspace: (data: { scope, projectId?, name? }) => ipcRenderer.invoke('workspace:load', data),

listWorkspaces: (data: { projectId }) => ipcRenderer.invoke('workspace:list', data),
deleteWorkspace: (data: { projectId, name }) => ipcRenderer.invoke('workspace:delete', data),

// Problems bridges
getProblems: (data: { projectId? }) => ipcRenderer.invoke('get-problems', data),
createProblem: (data: { title, priority?, category?, description? }) =>
  ipcRenderer.invoke('create-problem', data),
updateProblemStatus: (data: { id, status }) => ipcRenderer.invoke('update-problem-status', data),
deleteProblem: (data: { id }) => ipcRenderer.invoke('delete-problem', data),

// Terminal bridges
terminalWrite: (terminalId: string, data: string) => ipcRenderer.invoke('write-terminal', terminalId, data),
terminalCreate: (config) => ipcRenderer.invoke('spawn-terminal', config),
```

---

## 5. IssuesWorkspace Component (Template for BugReportPanel)

`src/components/IssuesWorkspace.tsx` — Full-featured problems/requests/checklists workspace:

```typescript
interface Props {
  projectId: string | null;
  projectPath: string;
  activeTerminalId: string | null;
  sessions: Session[];
}
```

Key patterns:
- Loads problems on mount via `window.deskflowAPI.getProblems({ projectId })`
- Renders a split view: problem list on left, detail on right
- Create problem dialog with title, priority, category fields
- Status badges with color coding
- Can link problems to terminals
- Uses `window.deskflowAPI.createProblem()` and `window.deskflowAPI.updateProblemStatus()`

---

## 6. Agent Output — ## Actions Parsing

**Markdown Actions Block** — `src/main.ts:9461-9600`:

The system parses `## Actions` blocks from terminal output:
```typescript
function parseAndExecuteActions(content: string, sessionId: string, actor: string, terminalId?: string) {
  if (!content.includes('## Actions') || !db) return;
  const lines = content.split('\n');
  let inActions = false;
  // Matches:
  // [create-problem] Title - priority: high - category: bug-fix - description: ...
  // [update-problem] ID - status: In Progress
  // [add-check] parent-id - description: ... - instruction: ...
  // [complete-check] check-id
```

**JSON Actions File** — `src/main.ts:9623-9770`:

Alternatively, agents write `agent/actions.json` with:
```json
{
  "actions": [
    { "type": "create_problem", "title": "...", "priority": "high", "category": "bug-fix", "description": "..." },
    { "type": "update_problem", "id": "prob_123", "status": "In Progress" },
    { "type": "complete_check", "id": "chk_789" }
  ]
}
```

---

## 7. Session Categories (Agent Types)

`TerminalPage.tsx:96-105`:
```typescript
const SESSION_CATEGORIES = {
  'bug-fix': 'Bug Fix',
  'feature': 'Feature',
  'refactor': 'Refactor',
  'research': 'Research',
  'review': 'Review',
  'other': 'Other',
};
```

`TerminalPage.tsx:107-115`:
```typescript
const SESSION_STATUS_STYLES = {
  active: 'text-green-400',
  paused: 'text-amber-400',
  completed: 'text-blue-400',
  archived: 'text-white/30',
  action_required: 'text-red-400',
  in_progress: 'text-emerald-400',
  ready: 'text-cyan-400',
};
```

---

## 8. UI Colors & Icons Used in Workspace

**Icon imports** (lucide-react) used in sidebar tabs:
- `PieChart`, `ListChecks`, `Bug`, `Monitor`, `Settings`, `Sparkles`, `Settings2`, `FileText`, `Database`

**Accent color system:**
- purple (insights/analytics), emerald (issues), blue, indigo, orange, amber (context)

**Common class patterns for sidebar panels:**
- `flex flex-col gap-3 p-3 h-full` — panel wrapper
- `flex gap-1.5` — button row
- `px-2.5 py-1 text-xs rounded-md font-medium` — pill buttons
- `bg-{color}-500/20 text-{color}-300` — active state
- `text-white/40 hover:text-white/70` — inactive state
