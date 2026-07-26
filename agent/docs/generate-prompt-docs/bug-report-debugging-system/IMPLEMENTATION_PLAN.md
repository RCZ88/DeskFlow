# Implementation Plan — Collaborative Debugging System

> **Stored after Phase 3 check.** Each change is traced to exact file + line numbers from the actual codebase.

---

## Step 1: Add `bug_reports` Table

**File:** `src/main.ts`
**Insert after:** line 2140 (after ALTER TABLE migrations for terminal_sessions)
**Before:** line 2142 (`// Session parsed items`)

```sql
db.exec(`
  CREATE TABLE IF NOT EXISTS bug_reports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    error_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','investigating','identified','not_my_issue','fixed','ignored')),
    agent_responses TEXT DEFAULT '[]',
    linked_problem_id TEXT,
    flow_type TEXT DEFAULT 'manual' CHECK(flow_type IN ('manual','auto-consult','research')),
    root_cause_report TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
```

---

## Step 2: Add IPC Handlers

**File:** `src/main.ts`
**Insert after:** line 8736 (end of `resize-terminal` handler)
**Before:** line 8738 (`getSessionIdForTerminal`)

New handlers: `bug-report:submit`, `bug-report:list`, `bug-report:get`, `bug-report:auto-consult`, `bug-report:investigate`

Each handler:
- Is registered via `ipcMain.handle('bug-report:...', async (_, data) => { ... })`
- Uses `db` for SQL queries (same `db` variable used throughout main.ts)
- Uses `getProjectPath()` / `getProblemsService()` helpers already defined at line 14463
- Uses `terminalManager.write()` for dispatching to agents
- Fires `context-changed` after creation/update

---

## Step 3: Add BUG-OWNER Pattern Detection

**File:** `src/main.ts`  
**Insert inside:** `parseTerminalOutput` function (around line 8216, where `parseAndExecuteActions` is called)  
**Pattern:** Add a regex check for `BUG-OWNER:\s*(yes|no)` before or after the existing `## Actions` parsing.

Pseudo:
```typescript
// In parseTerminalOutput, after extracting output content
const bugOwnerRegex = /BUG-OWNER:\s*(yes|no)\s*(?:-?\s*reason:\s*(.+?))?\s*(?:-?\s*session:\s*(\S+))?/i;
const bugOwnerMatch = content.match(bugOwnerRegex);
if (bugOwnerMatch) {
  handleBugOwnerResponse({
    terminalId, sessionId, agent: actor,
    response: bugOwnerMatch[1].toLowerCase(),
    reason: bugOwnerMatch[2]?.trim(),
    claimedSessionId: bugOwnerMatch[3]?.trim(),
  });
}
```

Helper function `handleBugOwnerResponse` will be defined in the same scope as the IPC handlers.

---

## Step 4: Add Preload Bridges

**File:** `src/preload.ts`
**Insert after:** line 524 (after `assignProblemToTerminal` bridge, within the `// ========= Tracker Mind - Problem Management =========` section)

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

Also add `BugReportFlowType`, `BugReportStatus`, `AgentResponse`, `BugReport`, `RootCauseReport` types to the TypeScript declarations at the top of preload.ts or to a shared types file.

---

## Step 5: Create BugReportPanel Component

**New file:** `src/components/BugReportPanel.tsx`

Full React component with:
- Props: `{ projectId: string | null }`
- State: `title, errorText, submitting, bugReports[], loading, expandedId, investigatingId, engineeringMode`
- Effects: load on mount, context-changed listener
- Handlers: handleSubmit, handleInvestigate, toggleExpand
- Render: title input + textarea + submit button + past reports list with expandable details
- Flow C "Investigate" button per report (visible in engineering mode)

---

## Step 6: Wire Bugs Sub-tab in TerminalPage.tsx

**File:** `src/pages/TerminalPage.tsx`
**Lines 3857–3892** — Add to the insights WorkspaceShell:

1. Add import for BugReportPanel at top of file
2. Add `{ key: 'bugs', icon: Bug, label: 'Bugs' },` after line 3859
3. Add `case 'bugs':` after line 3888, before `default:`

---

## Step 7: Add type declarations for preload

**File:** `src/preload.ts` — add TypeScript interfaces for `BugReport`, `AgentResponse`, `RootCauseReport`, `BugReportStatus`, `BugReportFlowType` in the declarations section so the return types of the bridges are properly typed.

---

## Build & Verify

Run `npm run build`. Fix any type errors or import issues.
