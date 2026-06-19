# Collaborative Debugging System — Design Prompt

## Raw Request

> "I notice a certain stuff where, if you have a lot of pair of agents working together and there's suddenly ever when you try to start it up and you don't know which AI agent that causes that error, I wanted to have a bug report feature where I can just put on the thing, put on the error logs or a console output that is errored or any sort of error messages, and the system would send that error alongside a system from that is supposed to tell the AI to ask if they are the ones that causes the problem and then they should like update something or they should update something so that we can, the app can parse and can show which chat session causes that error and the system problem should be that, it should ask AI if it's the one causing the problem and where is it causing the problem if they have to succeed and finds where it causes the problem, if their previous work is the ones causing the problem, they should be able to do that to know that. And if they are not the ones that caused the problem, it's not their session, it's not the ones that they were working on, it should ignore it completely, so it shouldn't disturb the context."

> "The feature that I would most select to implement and the idea that I just have in mind is that if I were to have an agent solve a specific problem, and it should always, like by default, should always look through the list, use this process that I told you, to go on to the whole lot of sessions, a lot of agents, go on through all of those and the system should, like, send a prompt with the system from that I mentioned previously, to then ask what might be the cause, and since they have multiple agents that are having different perspectives, it can be easier for them to find the cause of where the problem is, because 90% or 70% of solving the problem is finding the cause of the problem. And sometimes the error logs, especially with this electron parsing, building the thing, the NPM run builds sort of like enumerate the error. Encrypted the errors of the errors doesn't really pinpoint where it is from, right? So we need a design a way that we can solve that, and I'm likely to use the error from, and the error from should be in the engineering mode, in the research and engineering mode, it should research how we can make the debugging system easier with the stuff, context management, every feature that we have in the workspace, it should utilize everything, every feature that we have in the useful workspace, it should also take account the ideas that I've mentioned previously and should be able to create the best system for the debugging system."

> "Yes it should ask all sessions that is on the workspace on that project."

---

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in this directory FIRST. It contains:
- Workspace sidebar system (GroupKey, WorkspaceShell, GroupPanel, SubTabBar)
- Terminal system (terminalManager, writing messages to terminals)
- Problems system (ProblemsService CRUD, Problem interface)
- Preload bridges (workspace, problems, terminal bridges)
- IssuesWorkspace component (existing template for the bugs tab)
- Agent output parsing (## Actions block pattern)
- Session categories and agent types
- UI color system and component patterns

All code references in this prompt refer to the file paths and line numbers in CONTEXT_BUNDLE.md.

---

## The Mandate

Design a comprehensive **Collaborative Debugging System** for the workspace that solves the problem of not knowing which AI agent session caused an error. The system must cover **two separate flows**:

---

### Flow A: Manual Bug Report Submission

The user manually pastes an error and submits it for investigation.

1. **A new "Bugs" sub-tab** under the `insights` group in the workspace sidebar, placed next to "Analytics" and "Issues." The tab should use a `Bug` icon from lucide-react.

2. **Bug Report Submission UI** — A panel where the user can:
   - Paste error logs, console output, or any error message
   - Optionally provide a title/summary for the bug
   - Click "Submit" to dispatch the bug for investigation

3. **Dispatch Logic** (backend, main process):
   - On submission, save the bug report to a new `bug_reports` DB table with status `pending`
   - Query ALL terminal sessions for the current project (both active and recent closed ones)
   - For each active terminal, write a system message formatted as:
     ```
     [System — Collaborative Debug #ID]
     An error was reported. Error details:
     {error_text}

     Please determine if YOUR PREVIOUS WORK caused this issue.
     - If YES, respond with exactly: BUG-OWNER: yes - reason: <brief reason> - session: <your session ID>
     - If NO, respond with exactly: BUG-OWNER: no
     - If YES, also create a Problem entry via your ## Actions block.
     ```
   - Monitor each terminal's output for the `BUG-OWNER:` response pattern
   - Store each agent's response in the bug report record: `{ terminalId, sessionId, agent, response: 'yes'|'no', reason?, respondedAt }`
   - If any agent responds "yes", update the bug report status to `identified`, create a Problem entry in the problems system automatically, and link it
   - If all agents respond "no", update status to `not_my_issue`

4. **Bug Report History Panel** — Below the submission form, show a list of past bug reports with:
   - Status badges (pending, investigating, identified, not_my_issue, fixed)
   - Error preview (truncated)
   - Number of agents consulted
   - Number of "yes" responses
   - Linked problem ID (if identified)
   - Click to expand details showing full error text + agent response breakdown

---

### Flow B: Automatic Default Consultation (When an Agent is Assigned a Problem)

**This is the critical piece.** When an agent is assigned to solve a specific problem (via the existing assign/bind mechanism), the system should **by default**:

1. Automatically broadcast the problem description to ALL other active agent terminals in the project
2. The message asks them: "Did your previous work cause this problem? Do you know where the root cause might be?"
3. Each agent responds with their perspective — since multiple agents have different context about what they built, they can collectively pinpoint the root cause
4. This happens automatically, not just when a user manually submits a bug report
5. Results feed back into the same `bug_reports` system — each consultation creates a lightweight bug report entry

**Why this matters:** 70-90% of solving a problem is finding its cause. Error logs from Electron builds (`npm run build`) don't pinpoint where the problem originated — they show the symptom, not the source. By default, when an agent is tasked with solving a problem, it should first leverage all other agents' context to locate the root cause before attempting a fix.

---

### Flow C: Engineering / Research Mode — Comprehensive Root Cause Analysis Pipeline

In engineering/research mode, the system should not just "ask agents" — it should **actively research** using every workspace feature to build evidence:

1. **Context Assembly Service** — Read what context each agent was given; correlate with the error
2. **File Lock / Touched Files Tracking** — Check which files were modified by each agent session; cross-reference with error stack traces (which files appear in the error?)
3. **Cross-Session Sync Logs** — Review conflict history and edit broadcasts; maybe a cross-session edit caused the break
4. **Workspace State Snapshots** — Load the workspace state from before the error appeared; compare with the state after; identify what changed
5. **Session Summaries** — Read session summaries to understand what each agent was working on
6. **Terminal Message History** — Scan terminal output for relevant file paths, error messages, or warnings that preceded the crash

The research mode should produce a **Root Cause Report** that includes:
- Which agent session(s) are likely responsible (with confidence score)
- Which specific files were changed that correlate with the error
- What the timeline of changes looks like (what was the last change before the error appeared?)
- Suggested fix approach based on which agent has the most relevant context

This means the system needs to gather evidence programmatically, not just rely on agents self-reporting. Combine self-reported agent responses + file tracking data + session history into a single investigation.

### Technical Requirements

**New DB Table: `bug_reports`**
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL
- `title` TEXT DEFAULT ''
- `error_text` TEXT NOT NULL
- `status` TEXT DEFAULT 'pending' — CHECK constraint: pending | investigating | identified | not_my_issue | fixed | ignored
- `agent_responses` TEXT — JSON array of { terminalId, sessionId, agent, response, reason, respondedAt }
- `linked_problem_id` TEXT — if an agent claimed ownership, reference to the created Problem
- `created_at` TEXT DEFAULT CURRENT_TIMESTAMP
- `updated_at` TEXT DEFAULT CURRENT_TIMESTAMP

**New IPC Channels:**
- `bug-report:submit` — Accepts `{ projectId, title?, errorText }`. Returns `{ success, id }`.
- `bug-report:list` — Accepts `{ projectId }`. Returns array of bug reports.
- `bug-report:get` — Accepts `{ id }`. Returns single bug report with full details.

**New Preload Bridges:**
- `submitBugReport(data)` → `ipcRenderer.invoke('bug-report:submit', data)`
- `listBugReports(data)` → `ipcRenderer.invoke('bug-report:list', data)`

### UI Specification

**BugReportPanel component** — Self-contained sidebar page component placed at `src/components/BugReportPanel.tsx`.

Layout (vertical stack):
```
┌─────────────────────────────────┐
│ Bug Report                      │ ← title
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [Title input]               │ │ ← optional title
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Paste error logs here...    │ │ ← textarea, min 6 rows
│ │                             │ │
│ └─────────────────────────────┘ │
│ [Submit Report]                 │ ← button, disabled when empty
├─────────────────────────────────┤
│ ─── Past Reports ───            │ ← section divider
│ ┌─────────────────────────────┐ │
│ │ #ID  │ Status │ Agents │ ...│ │ ← table/list of past reports
│ │ #003 │ 🔍 identified │ 3/2 │ │
│ │ #002 │ ✅ not_my_issue │ 2/0│ │
│ │ #001 │ ⏳ pending │ 1/0 │ │
│ └─────────────────────────────┘ │
│ [click any row → expands]       │
└─────────────────────────────────┘
```

**Expanded detail view** (when clicking a past report):
```
┌─────────────────────────────────┐
│ Bug #003 — "Build fails on CI"  │
│ Status: identified              │
│ Created: 2026-06-18 14:32       │
├─────────────────────────────────┤
│ ## Error                        │
│ {full error text}               │
├─────────────────────────────────┤
│ ## Agent Responses              │
│ ┌─────────────────────────────┐ │
│ │ Terminal 1 (claude-coding) │ │
│ │ ✅ BUG-OWNER: yes           │ │
│ │ Reason: my file X caused... │ │
│ │ Linked Problem: #142        │ │
│ ├─────────────────────────────┤ │
│ │ Terminal 2 (research-agent) │ │
│ │ ❌ BUG-OWNER: no            │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Constraints

- The design must work with the existing workspace save/load system — bug report data should be independent of workspace instances (bug reports are shared across all workspaces for a project)
- Must follow the exact sidebar registration pattern used by IssuesWorkspace today (WorkspaceShell + SubTabBar + GroupPanel)
- Must use the existing preload bridge pattern (ipcRenderer.invoke at src/preload.ts)
- Must fire `context-changed` events when bug reports are created or updated, so the UI auto-refreshes
- Must integrate with the existing problems system when an agent claims ownership (call `createProblem`)
- Must not introduce new npm dependencies — use only lucide-react icons and existing components/patterns

---

## Output Requirements

Return a **complete design specification** covering:

### Data Model
- Exact SQL for `bug_reports` table with all columns
- Exact TypeScript interfaces: `BugReport`, `AgentResponse`, `RootCauseReport`
- How Flow A, B, and C map to the same schema (or different schemas?)
- Relationship between `bug_reports` and existing `problems` table

### IPC Pipeline
- All new IPC handler signatures (bug-report:submit, bug-report:list, bug-report:get)
- Any new IPC needed for Flow B (auto-consult on problem assign) — e.g., `bug-report:auto-consult`
- Any new IPC for Flow C (research mode evidence gathering) — e.g., `bug-report:investigate` that runs the full research pipeline
- Exact preload bridge signatures

### Component Specification
- BugReportPanel component tree with all state variables, effects, and event handlers
- How the same panel handles both manual submission (Flow A) and shows auto-consultation results (Flow B)
- A separate "Root Cause Report" view for Flow C results
- Empty states, loading states, error states

### Data Flow
- Flow A: Manual submit → dispatch → monitor → response → problem creation
- Flow B: Problem assigned → auto-consult broadcast → agent responses → feed into bug_reports
- Flow C: Engineering mode → gather evidence (context, file locks, sessions, snapshots, summaries) → correlation analysis → Root Cause Report

### Sub-tab Registration
- Exact code to add to TerminalPage.tsx (the WorkspaceShell tab definition, the import, and the render case)

### Backend Integration
- How to hook into "agent assigned to problem" event (Flow B trigger)
- How to query file locks, touched files, session history for evidence gathering (Flow C)
- How to monitor terminal output for BUG-OWNER: pattern across any terminal, not just the one that received the message
- How to auto-create problems in the existing ProblemsService when an agent claims ownership
