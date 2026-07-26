# 📝 Checklist Algorithm — High-Fidelity Design Prompt

## Raw Request (Verbatim)

> HVAE YOU INCLUDE THE FEATURE FOR THE CHECCKLIST ALGORITHM THAT SORTS OUT AND FILTERS OUT AND LIKE PROCESS THE LIST OF REQUEST AND PROBLEMS?? do you know the logic for htis? i would like you to generate prompt skill for the following: you're still logic for the checklist thing, right? Then there's many short learnings and stuff. So what I want is that it's not necessarily um pretty new feature. I mean the same features. Nothing needs to be that much separated. It should be a part of the problems that are request. So for each request and problems, there should be like a thing check, right? There's not only that there has a status of the problem or request that there also is like the list of checklists of things for me, for the user to check. Based on what has the, yeah, implemented. Where the checklist should be in the checklist sub page of the sidebar, it should be part of the um part of the problems or the stuff and it should be having some algorithms that sort out of the list of problems and requests that are related to those and in the checklist page it should be that it also still shows the problem or requests which the checklists are to basically check this is just where that show uh list of things to check for the user to check and then you can, user can give you a feedback or there should be options for the user to give feedback and some sort of text or just simply prove better or something like that. It should be some options where it's simple and it's easy to check and stuff and there should be some longer options that look both more optional and if I were to be able to for example send a feedback or check that it should be instantly setting it in the terminal say that it works or something or the feedback or something like that and it should know which session is it belong to because it needs to send it back to the session right and yeah that's it so there's needs to be some session chat saving logic there and to get into those and how would you do that in the stuff and so on and so forth and how would you be able to uh how the list of settings for that and how how would you come up with the tunability of like how we can for example just how much requests can we do and what are the options and so on and so forth. For what are those settings and I don't think we need to do what many settings here but more on maybe the thing that I like is like how the logic for changing our sessions because sessions even though there's compactions after a while after a lot of compactions session will be too much so this is just a maybe show idea but we're going to implement the banner for now just focusing this I would like to make very little making new sessions and replace the old session on the session with the new session being the bringing law of policy to the new session and because any of the rest of the session is better than they can back to all from the project or like for example very kind of a new session

---

## Context

Read `agent/docs/checklist-algorithm-revamp/CONTEXT_BUNDLE.md` first. It contains:
- All relevant data structures (Problem, Request, CheckItem, TerminalSession, CheckItem)
- Full IPC endpoint reference with payload shapes
- Existing UI component code (IssuesWorkspace, CombinedChecklist, TerminalPage)
- Service classes (ProblemsService, RequestsService)
- DB schema for sessions and messages
- AI action parsing system
- Current gaps and integration points

The target codebase is a React + TypeScript + Tailwind v4 + Electron desktop app with SQLite and JSON file storage.

---

## The Mandate

Engineer the **backend logic and algorithms** for a **Checklist Algorithm Revamp**. Visual/UI design is secondary — specify the minimum UI needed to surface the logic, but the core deliverable is the data processing pipeline, sorting algorithms, feedback routing, and session-aware messaging.

The system covers five areas. **Areas 1-3 are the primary logic engineering focus.** Areas 4-5 are secondary.

### Area 1 — Data Model + Sorting/Grouping Algorithm (PRIMARY)

**Backend logic:**
- Extend `ProblemsService.Problem` interface with `checks: CheckItem[]` (currently missing — RequestsService already has it)
- Add `addCheck()`, `updateCheck()`, `completeCheck()` methods to ProblemsService mirroring RequestsService's pattern
- Design the **sorting/grouping algorithm** as a pure function (not bound to React):

```
Input:  CheckItem[] (from all problems + requests)
        Config: { groupByParent: boolean, sortBy: 'priority'|'updated'|'status',
                  filterMode: 'all'|'active'|'completed', maxChecks: number }

Steps:
  1. Filter by status (active = pending + in_progress)
  2. Group by parent type (problem vs request)
  3. Within each group, sort parents by priority order (critical > high > medium > low)
  4. Within each parent, sort checks by check status order (pending > in_progress > completed)
  5. Within same status, sort by updated_at (newest first)
  6. Apply maxChecks limit (pagination offset)

Output: GroupedCheck[]  // tree structure, not flat
```

- Define the output types:
```typescript
interface GroupedCheckGroup {
  parentType: 'problem' | 'request';
  parentId: string;
  parentTitle: string;
  parentPriority: string;
  parentStatus: string;
  parentCategory: string;
  checks: CheckItem[];  // already sorted within this parent
}

interface GroupedCheckResult {
  groups: GroupedCheckGroup[];
  totals: { total: number; done: number; pending: number };
  parentOrder: string[];  // ordered parent IDs as they appear
}
```

- Edge cases the algorithm must handle:
  - Problem/Request with no `checks` field (old data) → treat as empty array
  - Check orphaned (parent deleted) → filter out
  - Same check ID across problem and request → deduplicate by full `parentId-checkId`
  - Empty filtered result → return empty groups with zero totals

### Area 2 — Feedback Routing Logic (PRIMARY)

**Logic, not UI:**
- Design the data flow: user checks a check → where does that signal go?
- Define a `CheckFeedback` record:
```typescript
interface CheckFeedback {
  checkId: string;
  parentId: string;
  parentType: 'problem' | 'request';
  verdict: 'works' | 'fails' | 'needs_clarification';
  text?: string;           // optional user text
  sessionId: string;       // resolved session
  terminalId: string;      // resolved terminal
  timestamp: string;       // ISO
}
```

- Define the IPC channel for feedback submission (`send-check-feedback`):
  - Input: `{ checkId, parentId, parentType, verdict, text? }`
  - Logic:
    1. Persist the feedback (save to check's `feedback[]` or log)
    2. Update check status if verdict is 'works' → 'completed'
    3. Resolve the target session (Area 3 logic)
    4. Compose message string for terminal
    5. Write to terminal via `terminalWrite()`
    6. Save message to session via `saveTerminalMessage()`
    7. Return `{ success, sessionId, terminalId }`

- Message format for terminal:
```
[FEEDBACK] Check "{description}" — verdict: works/fails — {optional text}
```

### Area 3 — Session Resolution Strategy (PRIMARY)

- Define a `resolveSessionForCheck()` function:
```typescript
async function resolveSessionForCheck(
  parent: Problem | Request,
  activeSessionId?: string,
  activeTerminalId?: string
): Promise<{ sessionId: string; terminalId: string } | null>
```

- Resolution order:
  1. If parent has `session_id` + `terminal_id` → use those
  2. If parent has `session_id` but no `terminal_id` → query DB for terminal_id from terminal_sessions table
  3. If no parent session → use activeSessionId/activeTerminalId (the user's current terminal session)
  4. If nothing found → return null (caller handles — queue or show error)

- Error handling:
  - No session at all → show user a toast "No session linked to this check"
  - Terminal disconnected → show "Terminal closed, feedback queued"
  - Both → log to activity log for later retry

### Area 4 — Settings (SECONDARY)
- Storage: localStorage (no backend needed — these are display preferences)
- Schema:
```typescript
interface ChecklistSettings {
  autoSortByPriority: boolean;  // default: true
  groupByParent: boolean;       // default: true
  defaultFilter: 'all' | 'active' | 'completed';  // default: 'active'
  feedbackMode: 'simple' | 'full';  // simple = thumbs only, full = thumbs + text
  maxChecksPerPage: number;     // default: 50
}
```

### Area 5 — Session Compaction (BONUS / LOW PRIORITY)
- Design the compaction trigger as a function that checks message count thresholds
- Archive logic: update terminal_sessions SET status = 'archived' WHERE ...
- New session creation: create a session with `resume_id` pointing to old
- Can be a background scheduled task or triggered on session save

---

## Requirement Checklist

### Logic Engineering (PRIMARY — must be fully specified)
- [ ] `Problem.checks: CheckItem[]` field addition to interface
- [ ] `ProblemsService.addCheck()` — exact CRUD logic with ID generation (`{parentId}-check-{n}`)
- [ ] `ProblemsService.updateCheck()` — partial update on a single check
- [ ] `ProblemsService.completeCheck()` — status → 'completed' + set updated_at
- [ ] `GroupedCheckResult` algorithm — pure function, no React dependency
- [ ] Sort/group/filter pipeline with configurable parameters
- [ ] Edge case handling (no checks, orphaned checks, same IDs)
- [ ] `CheckFeedback` interface and IPC handler logic
- [ ] `resolveSessionForCheck()` — session→terminal resolution
- [ ] Terminal message composition for feedback
- [ ] `saveTerminalMessage()` integration in feedback flow
- [ ] `ChecklistSettings` interface and defaults
- [ ] Session compaction: trigger condition, archive logic, resume_id inheritance

### Visual Spec (SECONDARY — minimal/notes only)
- Show the grouped output visually (parent header → checks list under it)
- Per-check: status circle + description + parent context
- Feedback controls: thumbs up/down + optional text area
- Progress: "3/5 done" per group

### Constraints
- Must work with existing `context-changed` event for real-time sync
- Must preserve backward compatibility with AI `[add-check]` / `[complete-check]` actions
- Must handle missing `checks` field gracefully on old problems
- Must follow existing IssuesWorkspace visual conventions (zinc palette, rounded cards)
- Tailwind v4, Lucide React icons

---

## Output Format

Produce a `RESULT.md`. **Lead with logic. UI last, brief.**

1. **Data Model Changes** — Exact interface diffs, new methods, ID schemes
2. **Sorting/Grouping Algorithm** — Full TypeScript pseudocode, config, edge cases
3. **Feedback Pipeline** — IPC channel design, message routing logic, terminal message format
4. **Session Resolution** — `resolveSessionForCheck()` implementation, error states
5. **Settings** — Interface, defaults, storage mechanism
6. **UI Notes** — Component tree (only what's needed to surface the logic), brief Tailwind notes
7. **Session Compaction (Bonus)** — Trigger, archive, resume_id logic
8. **Data Flow Diagram** — Before/after of check data flow, feedback loop
9. **Backend Audit Table** — Every feature mapped to IPC/Service/DB, with real/stub status

For each item, provide exact file paths, line references from CONTEXT_BUNDLE.md, and actual TypeScript code. The CONTEXT_BUNDLE.md is your source of truth for existing code.
