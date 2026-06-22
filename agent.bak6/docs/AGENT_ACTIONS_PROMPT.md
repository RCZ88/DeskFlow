# Agent Actions Reference

Use these three mechanisms to update problems, checklists, requests, and session metadata in DeskFlow.

---

## Mechanism 1: `## Actions` Block (Easiest)

Put this in your response. The system parses it from terminal output automatically.

```
## Actions
- [create-problem] Login button broken - priority: high - category: bug-fix - description: Clicking login does nothing
- [update-problem] 1.5 - status: In Progress
- [complete-checklist] problem-1.5-step-1
- [complete-checklist] request-3-step-2
```

**Formats:**
- `[create-problem] Title - priority: high|medium|low - category: bug-fix|feature|refactor|research|review - description: ...`
- `[update-problem] ID - status: NEW|IN_PROGRESS|TESTING|FIXED|CLOSED|AI_ATTEMPTED_FIX`
- `[complete-checklist] item-id` (format: `{parentType}-{parentId}-step-{n}`)

Also supports session metadata:

```
## Session Metadata
- Title: Fix login button
- Status: in_progress
- Product Area: Terminal
- Category: bug-fix
```

---

## Mechanism 2: Write to `agent/actions.json` (Most Reliable)

Write this JSON file, the system watches it and executes immediately:

```json
{
  "terminal_id": "term-123",
  "actions": [
    { "type": "create_problem", "title": "Bug found", "priority": "high", "category": "bug-fix", "description": "..." },
    { "type": "update_problem", "id": "1.5", "status": "FIXED" },
    { "type": "complete_checklist", "id": "problem-1.5-step-1" },
    { "type": "update_request", "id": "1", "status": "IMPLEMENTED" }
  ]
}
```

**Action types:**

| Type | Required fields |
|------|----------------|
| `create_problem` | `title`, `priority`, `category`, `description` |
| `update_problem` | `id` (or title), `status` |
| `complete_checklist` | `id` |
| `update_request` | `id` (or title), `status` |

---

## Mechanism 3: Direct File Writes

Write directly to JSON files in `agent/`:

**`agent/problems.json`** — Array of problems:
```json
[
  { "id": "1.5", "title": "Bug", "status": "NEW", "priority": "high", "category": "bug-fix", "description": "...", "root_cause": "", "fix_description": "" }
]
```

**`agent/checklists.json`** — Array of checklist items:
```json
[
  { "id": "problem-1.5-step-1", "parentType": "problem", "parentId": "1.5", "step": 1, "description": "Fix login bug", "status": "pending", "requiresHuman": true, "humanApproved": false, "notes": "", "created_at": "2026-05-31T...", "updated_at": "2026-05-31T..." }
]
```

Status values: `"pending"` | `"in_progress"` | `"completed"`

**`agent/requests.json`** — Array of requests:
```json
[
  { "id": 1, "title": "Add dark mode", "description": "...", "status": "PENDING", "priority": "medium" }
]
```

Status values: `"PENDING"` | `"IN_PROGRESS"` | `"IMPLEMENTED"` | `"DECLINED"`

---

## Quick Reference: Problem Status Lifecycle

```
NEW → IN_PROGRESS → AI_ATTEMPTED_FIX → (human tests) → FIXED → CLOSED
```

When you fix a bug:
1. Create problem → `status: NEW`
2. Start work → `status: IN_PROGRESS`
3. Fill in `root_cause` + `fix_description`
4. Submit fix → `status: AI_ATTEMPTED_FIX`
5. Human confirms → `status: FIXED`
