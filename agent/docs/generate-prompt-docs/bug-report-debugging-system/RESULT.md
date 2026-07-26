# RESULT — Collaborative Debugging System Design Specification

> **Consumed by:** opencode (big-pickle)  
> **Generated from:** prompt.md + CONTEXT_BUNDLE.md  
> **Date:** 2026-06-18

---

## 1. Data Model

### 1.1 Bug Reports Table

```sql
CREATE TABLE IF NOT EXISTS bug_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  error_text TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK(status IN ('pending','investigating','identified','not_my_issue','fixed','ignored')),
  agent_responses TEXT DEFAULT '[]',
  linked_problem_id TEXT,
  flow_type TEXT DEFAULT 'manual'
    CHECK(flow_type IN ('manual','auto-consult','research')),
  root_cause_report TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### 1.2 TypeScript Interfaces

```typescript
interface AgentResponse {
  terminalId: string;
  sessionId: string;
  agent: string;                    // agent type name (e.g. "claude-coding")
  response: 'yes' | 'no';
  reason?: string;                  // populated when response === 'yes'
  respondedAt: string;              // ISO timestamp
}

interface BugReport {
  id: string;
  projectId: string;
  title: string;
  errorText: string;
  status: BugReportStatus;
  agentResponses: AgentResponse[];
  linkedProblemId?: string;         // set when an agent claims ownership
  flowType: BugReportFlowType;
  rootCauseReport?: RootCauseReport;
  createdAt: string;
  updatedAt: string;
}

type BugReportStatus =
  | 'pending'              // submitted, awaiting agent responses
  | 'investigating'        // Flow C research mode in progress
  | 'identified'           // at least one agent claimed ownership
  | 'not_my_issue'         // all agents responded 'no'
  | 'fixed'                // the linked problem was resolved
  | 'ignored';             // manually dismissed

type BugReportFlowType =
  | 'manual'               // Flow A: user pasted an error
  | 'auto-consult'          // Flow B: auto-triggered on problem assignment
  | 'research';            // Flow C: full evidence pipeline

interface RootCauseReport {
  suspectSessions: Array<{
    sessionId: string;
    agent: string;
    confidence: 'high' | 'medium' | 'low';
    reasons: string[];              // why this session is suspected
  }>;
  suspiciousFiles: string[];        // files that correlate with the error
  timeline: Array<{
    timestamp: string;
    event: string;
    sessionId?: string;
  }>;
  suggestedApproach: string;        // recommended fix strategy
}
```

### 1.3 Flow-to-Schema Mapping

| Flow | flow_type | Entry trigger | Agent dispatch | Root cause report |
|---|---|---|---|---|
| **A (Manual)** | `manual` | User clicks Submit | All sessions | Optional (manual trigger of Flow C) |
| **B (Auto-consult)** | `auto-consult` | Problem assigned to agent | All OTHER sessions | No (lightweight) |
| **C (Research)** | `research` | User clicks "Investigate" on a report | N/A (programmatic) | Yes — full report |

All three flows use the **same `bug_reports` table**. A Flow B entry has shorter `error_text` (just the problem description) and typically fewer `agent_responses`. A Flow C entry is identified by `flow_type='research'` and has a populated `root_cause_report` column.

### 1.4 Relationship with `problems` Table

- `bug_reports.linked_problem_id` → `problems.id` (nullable FK)
- When an agent responds "yes" with a reason, the system auto-creates a Problem via `ProblemsService.createProblem()` and sets `linked_problem_id`.
- When the linked Problem status changes to `fixed`, the bug report status should also update to `fixed`.
- A `context-changed` event fires on both creation and update of bug reports.

---

## 2. IPC Pipeline

### 2.1 Handler Signatures

Registered in `src/main.ts` via `ipcMain.handle()`:

| Channel | Arguments | Returns | Purpose |
|---|---|---|---|
| `bug-report:submit` | `{ projectId: string, title?: string, errorText: string }` | `{ success: boolean, id: string }` | Save report, dispatch to agents, return ID |
| `bug-report:list` | `{ projectId: string }` | `BugReport[]` | All reports for this project, ordered by created_at DESC |
| `bug-report:get` | `{ id: string }` | `BugReport \| null` | Single report with full agent_responses |
| `bug-report:auto-consult` | `{ problemId: string, problemTitle: string, problemDescription: string }` | `{ success: boolean, bugReportId: string }` | Create lightweight entry, broadcast to all non-owner agents |
| `bug-report:investigate` | `{ bugReportId: string }` | `BugReport` | Run Flow C evidence pipeline, return updated report with rootCauseReport |

### 2.2 Handler Pseudocode

**bug-report:submit**
```
1. Generate id = 'br_' + nanoid(12)
2. Validate projectId exists in terminal_sessions
3. INSERT into bug_reports (id, project_id, title, error_text, status, flow_type)
4. Query all terminal sessions for this project
5. For each active terminal (terminal_id is not null):
   a. Format system message with error details
   b. Call terminalManager.write(terminalId, message)
   c. Register a one-time BUG-OWNER listener on that terminal's onData
6. Set timeout (e.g. 120s) — after timeout, any non-responding terminals are 'no'
7. Fire context-changed event
8. Return { success: true, id }
```

**bug-report:list**
```
1. SELECT * FROM bug_reports WHERE project_id = ? ORDER BY created_at DESC
2. Parse agent_responses JSON for each
3. Return BugReport[]
```

**bug-report:get**
```
1. SELECT * FROM bug_reports WHERE id = ?
2. Parse agent_responses and root_cause_report JSON
3. Return BugReport | null
```

**bug-report:auto-consult**
```
1. Create a lightweight bug report entry:
   - id = 'br_' + nanoid(12)
   - title = "Auto-consult: {problemTitle}"
   - error_text = problemDescription
   - flow_type = 'auto-consult'
   - status = 'pending'
2. Query terminal sessions EXCEPT the one assigned to the problem
3. For each, write consult message + register BUG-OWNER listener
4. Return { success, bugReportId }
```

**bug-report:investigate** (Flow C — comprehensive)
```
1. Load bug report by ID
2. Set status = 'investigating'
3. Phase 1 — Gather evidence:
   a. Query file_locks for this project (recent lock history)
   b. Query cross-session sync logs (edit broadcasts)
   c. Load workspace state snapshots (before/after error time)
   d. Read session summaries from agent/ directory
   e. Scan terminal output buffer for relevant content
   f. Cross-reference stack trace file paths with touched files
4. Phase 2 — Correlate:
   a. For each file mentioned in error stack trace:
      - Find which sessions touched that file (file locks + sync logs)
      - Find when they touched it (timeline)
   b. For each session that touched suspicious files:
      - Read their context (what were they building?)
      - Read their session summary
5. Phase 3 — Build RootCauseReport:
   a. Rank suspect sessions by correlation strength
   b. Build timeline of changes before error
   c. Determine suggested fix approach
6. Update bug report with status='identified', root_cause_report
7. Fire context-changed
8. Return updated BugReport
```

### 2.3 Preload Bridge Signatures

Add to `src/preload.ts` in the `deskflowAPI` object:

```typescript
// Bug Report bridges
submitBugReport: (data: { projectId: string; title?: string; errorText: string }) =>
  ipcRenderer.invoke('bug-report:submit', data),

listBugReports: (data: { projectId: string }) =>
  ipcRenderer.invoke('bug-report:list', data),

getBugReport: (data: { id: string }) =>
  ipcRenderer.invoke('bug-report:get', data),

autoConsultAgents: (data: { problemId: string; problemTitle: string; problemDescription: string }) =>
  ipcRenderer.invoke('bug-report:auto-consult', data),

investigateBugReport: (data: { bugReportId: string }) =>
  ipcRenderer.invoke('bug-report:investigate', data),
```

---

## 3. Component Specification — BugReportPanel

### 3.1 Location: `src/components/BugReportPanel.tsx`

### 3.2 Props

```typescript
interface BugReportPanelProps {
  projectId: string | null;
}
```

### 3.3 Layout

```
┌─────────────────────────────────────────┐
│ 🐛 Bug Report              [Eng Mode]   │ ← header row with mode toggle
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [Title input placeholder]          │ │ ← SectionCard with input
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Paste error logs, console output,   │ │ ← SectionCard with textarea
│ │ stack traces, or any error...       │ │   min-h-[160px] text-xs
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ [Submit Report]                          │ ← primary button
├─────────────────────────────────────────┤
│ ═══ Past Bug Reports ═══                │ ← section label
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ #br_abc  │ 🔍 investigating │ ...│ │ │ ← report row (clickable)
│ │ #br_def  │ ✅ identified     │ ...│ │ │
│ │ #br_ghi  │ ❌ not_my_issue   │ ...│ │ │
│ │ #br_jkl  │ ⏳ pending        │ ...│ │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 3.4 State Variables

```typescript
const [title, setTitle] = useState('');
const [errorText, setErrorText] = useState('');
const [submitting, setSubmitting] = useState(false);
const [bugReports, setBugReports] = useState<BugReport[]>([]);
const [loading, setLoading] = useState(true);
const [expandedId, setExpandedId] = useState<string | null>(null);
const [investigatingId, setInvestigatingId] = useState<string | null>(null);
const [engineeringMode, setEngineeringMode] = useState(false);
```

### 3.5 Effects

**Effect 1 — Load reports on mount:**
```typescript
useEffect(() => {
  if (!projectId) { setLoading(false); return; }
  setLoading(true);
  window.deskflowAPI.listBugReports({ projectId })
    .then(setBugReports)
    .finally(() => setLoading(false));
}, [projectId]);
```

**Effect 2 — Subscribe to context-changed events:**
```typescript
useEffect(() => {
  if (!projectId) return;
  const cleanup = window.deskflowAPI.onContextChanged((_event: any, data: any) => {
    if (data?.type === 'bug_report' || data?.type === 'problem') {
      window.deskflowAPI.listBugReports({ projectId }).then(setBugReports);
    }
  });
  return cleanup();
}, [projectId]);
```

### 3.6 Event Handlers

**handleSubmit:**
```typescript
async function handleSubmit() {
  if (!errorText.trim() || !projectId) return;
  setSubmitting(true);
  try {
    const result = await window.deskflowAPI.submitBugReport({
      projectId,
      title: title.trim() || undefined,
      errorText: errorText.trim(),
    });
    if (result.success) {
      setTitle('');
      setErrorText('');
      // Refresh list
      const reports = await window.deskflowAPI.listBugReports({ projectId });
      setBugReports(reports);
    }
  } finally {
    setSubmitting(false);
  }
}
```

**handleInvestigate:**
```typescript
async function handleInvestigate(reportId: string) {
  setInvestigatingId(reportId);
  try {
    const updated = await window.deskflowAPI.investigateBugReport({ bugReportId: reportId });
    setBugReports(prev => prev.map(r => r.id === reportId ? updated : r));
  } finally {
    setInvestigatingId(null);
  }
}
```

**toggleExpand(id):** `setExpandedId(prev => prev === id ? null : id)`

### 3.7 Detail Expansion (collapsible row)

When `expandedId === report.id`, render below the row:

```
┌─────────────────────────────────────────┐
│ ↑ #br_abc                                │ ← expanded row (same row, collapsed)
├─────────────────────────────────────────┤
│ ── Error ──                             │
│ {full errorText}                         │
│                                          │
│ ── Agent Responses ({n}) ──             │
│ ┌─────────────────────────────────────┐ │
│ │ Terminal 1 — claude-coding          │ │
│ │ ✅ BUG-OWNER: yes                    │ │
│ │ Reason: My edit in src/main.ts:210  │ │
│ │ │                                   │ │
│ │ │ [View Linked Problem #142]        │ │ → button to open problem
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Terminal 2 — research-agent         │ │
│ │ ❌ BUG-OWNER: no                     │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [🔬 Investigate (Research Mode)]         │ → calls handleInvestigate
│                                          │
│ ── Root Cause Report ── (if exists)     │
│ Confidence: High                         │
│ Suspect: Terminal 1 (claude-coding)      │
│ Suspicious files: src/main.ts, ...       │
│ Timeline: See report details...          │
└─────────────────────────────────────────┘
```

### 3.8 Empty / Loading / Error States

**Loading:** Show a centered spinner or skeleton pills matching the report row shape.

**Empty (no reports yet):**
```
┌─────────────────────────────────────────┐
│  No bug reports yet.                     │
│  Paste an error above and submit to      │
│  start investigating.                    │
└─────────────────────────────────────────┘
```

**Error (API failure):** Show a small red alert banner at the top of the panel: "Failed to load bug reports. Check console for details." with a Retry button.

**Engineering mode indicator:** When `engineeringMode === true`, show an amber badge in the header and an "Investigate" button on each report row. The submit button also changes to "Submit & Investigate".

---

## 4. Data Flow

### 4.1 Flow A — Manual Submission

```
User pastes error → clicks Submit
         │
         ▼
renderer: submitBugReport({ projectId, title, errorText })
         │
         ▼
main: bug-report:submit handler
         │
         ├── INSERT INTO bug_reports (status='pending', flow_type='manual')
         │
         ├── Query: SELECT * FROM terminal_sessions WHERE project_id = ? AND status = 'active'
         │
         ├── For each active terminal:
         │     │
         │     ├── Format system message:
         │     │   [System — Collaborative Debug #br_abc]
         │     │   An error was reported in project "{name}". Error details:
         │     │   {error_text}
         │     │
         │     │   Please determine if YOUR PREVIOUS WORK caused this issue.
         │     │   - If YES, respond with exactly: BUG-OWNER: yes - reason: <brief reason> - session: <your session ID>
         │     │   - If NO, respond with exactly: BUG-OWNER: no
         │     │   - If YES, also create a Problem entry via your ## Actions block.
         │     │
         │     ├── terminalManager.write(terminalId, message)
         │     │
         │     └── Register onData listener for BUG-OWNER: pattern
         │
         ├── Set timeout (120s)
         │
         ├── Wait for responses / timeout
         │
         ├── For each BUG-OWNER: yes response:
         │     ├── Parse reason and sessionId
         │     ├── Call ProblemsService.createProblem({
         │     │     title: `Bug from {agent}: {reason}`
         │     │     description: errorText
         │     │     category: 'bug'
         │     │     priority: 'medium'
         │     │   })
         │     ├── Store response in bug_reports.agent_responses JSON
         │     └── Set linked_problem_id
         │
         ├── Update status: 'identified' if any 'yes', else 'not_my_issue'
         │
         └── Fire context-changed event
```

### 4.2 Flow B — Auto-Consult on Problem Assignment

```
Agent is assigned to Problem #142
         │
         ▼
main: assignment handler
         │
         ├── Call bug-report:auto-consult handler
         │     │
         │     ├── INSERT INTO bug_reports (status='pending', flow_type='auto-consult',
         │     │     title='Auto-consult: Build fails on CI',
         │     │     error_text=problem.description, linked_problem_id='prob_142')
         │     │
         │     ├── Query: SELECT * FROM terminal_sessions
         │     │         WHERE project_id = ? AND id != {assigned_agent_session_id}
         │     │
         │     ├── For each other terminal:
         │     │     ├── Write:
         │     │     │   [System — Collaborative Debug #br_def]
         │     │     │   Agent {assigned_agent} has been assigned Problem #142:
         │     │     │   "{problem_title}"
         │     │     │   {problem_description}
         │     │     │
         │     │     │   Did YOUR PREVIOUS WORK contribute to this issue?
         │     │     │   - If YES: BUG-OWNER: yes - reason: <reason> - session: <your session ID>
         │     │     │   - If NO: BUG-OWNER: no
         │     │     │
         │     │     ├── Write to the ASSIGNED agent:
         │     │     │   [System — Collaborative Debug #br_def]
         │     │     │   You have been assigned Problem #142:
         │     │     │   "{problem_title}"
         │     │     │
         │     │     │   Other agents have been consulted for root cause.
         │     │     │   Their responses will be available in the bug report.
         │     │     │   Consider their perspective when solving this problem.
         │     │     │
         │     │     └── Register onData listener
         │     │
         │     └── Return bugReportId
         │
         └── Fire context-changed event
```

### 4.3 Flow C — Research Mode Investigation

```
User clicks "Investigate" on a bug report
         │
         ▼
renderer: investigateBugReport({ bugReportId })
         │
         ▼
main: bug-report:investigate handler
         │
         ├── Set status = 'investigating'
         │
         ├── PHASE 1 — Evidence Gathering
         │     │
         │     ├── 1a. File Lock History
         │     │     SELECT * FROM file_locks
         │     │     WHERE project_id = ?
         │     │     ORDER BY timestamp DESC LIMIT 200
         │     │
         │     ├── 1b. Touched Files per Session
         │     │     For each session in the project:
         │     │     Query edited files from session metadata
         │     │     or parse terminal output for file edit patterns
         │     │
         │     ├── 1c. Cross-Session Sync Logs
         │     │     Read sync log files for recent edit broadcasts
         │     │     and conflict detections
         │     │
         │     ├── 1d. Workspace State Snapshots
         │     │     Load pre-error workspace state
         │     │     Load post-error workspace state
         │     │     Diff to find what changed
         │     │
         │     ├── 1e. Session Summaries
         │     │     Read agent/session-summaries/*.md
         │     │     for each session that was active before the error
         │     │
         │     └── 1f. Terminal Output Buffer
         │         Scan recent terminal output for:
         │         - File paths mentioned in error stack trace
         │         - Error messages or warnings
         │         - Build failures
         │
         ├── PHASE 2 — Correlation
         │     │
         │     ├── Parse error stack trace for file paths
         │     ├── For each file path:
         │     │     ├── Find which sessions touched it
         │     │     └── Find when they touched it
         │     ├── Rank sessions by:
         │     │     - Number of error-correlated files touched
         │     │     - Proximity of last edit to error detection time
         │     │     - Complexity of changes
         │     │     - Agent self-report (BUG-OWNER: yes vs no)
         │     └── Build timeline of changes
         │
         ├── PHASE 3 — Report Generation
         │     │
         │     ├── Build RootCauseReport object
         │     ├── Serialize to JSON
         │     └── UPDATE bug_reports SET status='identified',
         │         root_cause_report=?, updated_at=?
         │
         ├── Fire context-changed event
         └── Return updated BugReport
```

---

## 5. Sub-tab Registration

### 5.1 Add Import in TerminalPage.tsx

```typescript
import Bug from 'lucide-react/dist/esm/icons/bug';
// OR if Bug is already available:
// const Bug = require('lucide-react').Bug;
```

Add the component import at the top of TerminalPage.tsx:
```typescript
import { BugReportPanel } from '../components/BugReportPanel';
```

### 5.2 Modify WorkspaceShell tabs (insights group)

Change from:
```typescript
{activeGroup === 'insights' && (
  <WorkspaceShell tabs={[
    { key: 'analytics', icon: PieChart, label: 'Analytics' },
    { key: 'issues', icon: ListChecks, label: 'Issues' },
  ]} storageKey="insights" render={(sub) => {
    switch (sub) {
      case 'analytics': return (...);
      case 'issues': return (...);
      default: return null;
    }
  }} />
)}
```

To:
```typescript
{activeGroup === 'insights' && (
  <WorkspaceShell tabs={[
    { key: 'analytics', icon: PieChart, label: 'Analytics' },
    { key: 'issues', icon: ListChecks, label: 'Issues' },
    { key: 'bugs', icon: Bug, label: 'Bugs' },
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
          <IssuesWorkspace projectId={selectedProject} ... />
        </GroupPanel>
      );
      case 'bugs': return (
        <GroupPanel accent="purple">
          <BugReportPanel projectId={selectedProject} />
        </GroupPanel>
      );
      default: return null;
    }
  }} />
)}
```

---

## 6. Backend Integration

### 6.1 BUG-OWNER Pattern Monitoring

Add to the existing `onData` callback in `src/main.ts:8405-8480`:

```typescript
// Collaborative Debug — BUG-OWNER pattern detection
const bugOwnerRegex = /BUG-OWNER:\s*(yes|no)\s*(?:-?\s*reason:\s*(.+?))?\s*(?:-?\s*session:\s*(\S+))?/i;
const bugOwnerMatch = data.match(bugOwnerRegex);
if (bugOwnerMatch) {
  handleBugOwnerResponse({
    terminalId,
    sessionId: terminal.sessionId,
    agent: terminal.agentType,
    response: bugOwnerMatch[1].toLowerCase() as 'yes' | 'no',
    reason: bugOwnerMatch[2]?.trim(),
    claimedSessionId: bugOwnerMatch[3]?.trim(),
  });
}
```

### 6.2 Problem Assignment Hook (Flow B Trigger)

In the `handleAssignProblem` function (or wherever problem assignment happens), add:

```typescript
async function onProblemAssigned(problem: Problem, assignedAgent: TerminalSession) {
  // Auto-consult all other agents
  const result = await ipcMain.emit('bug-report:auto-consult', null, {
    problemId: problem.id,
    problemTitle: problem.title,
    problemDescription: problem.description || '',
  });
  // The auto-consult creates a bug report and dispatches to agents
  // Result contains the bugReportId for reference
}
```

### 6.3 Evidence Queries (Flow C)

**File Lock Query** — If `file_locks` table exists:
```typescript
function getFileLockHistory(projectId: string) {
  const stmt = db.prepare('SELECT * FROM file_locks WHERE project_id = ? ORDER BY created_at DESC LIMIT 200');
  return stmt.all(projectId);
}
```

**Touched Files per Session:**
```typescript
function getSessionFileEdits(sessionId: string) {
  // Option A: Parse terminal output for edit patterns
  const stmt = db.prepare(`SELECT data FROM terminal_output WHERE session_id = ? AND data LIKE '%<<<<<<< edit%'`);
  // Option B: Query file_locks by session_id
  const stmt2 = db.prepare('SELECT * FROM file_locks WHERE session_id = ?');
  return stmt2.all(sessionId);
}
```

**Workspace State Snapshots:**
```typescript
function getWorkspaceStateSnapshots(projectId: string) {
  const stmt = db.prepare(`SELECT * FROM workspace_state WHERE project_id = ? ORDER BY created_at DESC LIMIT 10`);
  return stmt.all(projectId);
}
```

**Session Summaries:**
```typescript
function getSessionSummaries(projectId: string, sessions: TerminalSession[]) {
  return sessions.map(s => {
    const summaryPath = path.join(projectPath, 'agent', 'session-summaries', `${s.id}.md`);
    try { return { sessionId: s.id, summary: fs.readFileSync(summaryPath, 'utf-8') }; }
    catch { return { sessionId: s.id, summary: null }; }
  });
}
```

### 6.4 Auto-Create Problem on BUG-OWNER: yes

```typescript
function handleBugOwnerResponse(response: {
  terminalId: string;
  sessionId: string;
  agent: string;
  response: 'yes' | 'no';
  reason?: string;
  claimedSessionId?: string;
}) {
  // Find the pending bug report that this terminal was asked about
  const bugReport = findActiveBugReportForTerminal(response.terminalId);
  if (!bugReport) return;

  // Store response
  addAgentResponse(bugReport.id, response);

  if (response.response === 'yes') {
    // Auto-create a Problem
    const problem = ProblemsService.createProblem({
      title: response.reason
        ? `[Auto] ${response.agent}: ${response.reason}`
        : `[Auto] Bug identified by ${response.agent}`,
      description: bugReport.errorText,
      category: 'bug',
      priority: 'medium',
    });

    // Link the bug report to the problem
    linkBugReportToProblem(bugReport.id, problem.id);

    // Update bug report status
    updateBugReportStatus(bugReport.id, 'identified');

    // Notify the agent that their claim has been registered
    terminalManager.write(response.terminalId,
      `[System] Your BUG-OWNER claim has been registered. ` +
      `Linked Problem: #${problem.id}. You can now view it in the Issues tab.`
    );
  }

  // Check if all terminals have responded
  if (allTerminalsResponded(bugReport.id)) {
    const anyYes = hasAnyYesResponse(bugReport.id);
    updateBugReportStatus(bugReport.id, anyYes ? 'identified' : 'not_my_issue');
  }

  fireContextChanged('bug_report', 'updated', { id: bugReport.id });
}
```

### 6.5 `context-changed` Integration

Bug reports fire the same `context-changed` IPC event:

```typescript
mainWindow?.webContents?.send('context-changed', {
  type: 'bug_report',
  action: 'created' | 'updated',
  entity: { id: bugReport.id, status: bugReport.status, flowType: bugReport.flowType }
});
```

---

## 7. Implementation Order

| Step | File | What to do |
|---|---|---|
| 1 | `src/main.ts` | Add `bug_reports` table creation (next to other CREATE TABLE IF NOT EXISTS statements) |
| 2 | `src/main.ts` | Add 5 IPC handlers (`bug-report:submit`, `list`, `get`, `auto-consult`, `investigate`) |
| 3 | `src/main.ts` | Add `BUG-OWNER:` regex to `onData` callback |
| 4 | `src/main.ts` | Add `handleBugOwnerResponse()` function |
| 5 | `src/preload.ts` | Add 5 bridge methods to `deskflowAPI` |
| 6 | `src/components/BugReportPanel.tsx` | Create the full component |
| 7 | `src/pages/TerminalPage.tsx` | Add import + register `bugs` sub-tab in insights group |
| 8 | Build | Run `npm run build` and verify |

---

## 8. UI Design Notes

- **Accent color:** Purple (matching insights group), consistent with `ACCENT_STRIP.purple`
- **Status badges:**
  - `pending` → `⏳ bg-white/5 text-white/50`
  - `investigating` → `🔍 bg-blue-500/20 text-blue-300`
  - `identified` → `🐛 bg-amber-500/20 text-amber-300`
  - `not_my_issue` → `❌ bg-white/5 text-white/40`
- **Icons:** Use `Bug` from lucide-react for the tab icon; use `Search`, `ListChecks`, `ChevronDown`, `ChevronRight` for UI actions
- **Font:** Code blocks use `text-xs font-mono` for error text display
- **Empty state:** Use `FileSearch` or `BugOff` from lucide-react as a muted centerpiece
- **Engineering Mode toggle:** A small `[Eng Mode]` pill button in the header that enables the "Investigate" buttons and Research Mode features (Flow C)
