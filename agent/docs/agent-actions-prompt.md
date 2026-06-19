# Agent Actions System

## Overview

Structured action blocks let agents update problem tracker, requests, and checklists without directly editing markdown files. The system parses `## Actions` blocks from agent responses and executes them against the database.

## Syntax

```
## Actions
- [create-problem] Title - priority: high|medium|low - category: bug-fix|feature|ui-ux|other - description: ...
- [update-problem] ID_OR_TITLE - status: Not Started|In Progress|AI Attempted Fix|User Testing|Fixed
- [add-check] PARENT_ID - description: ... - instruction: ...
- [complete-check] CHECK_ID
- [update-request] ID - status: PENDING|IN_PROGRESS|IMPLEMENTED|DECLINED
```

## Action Types

### create-problem
Creates a new problem entry in the database and PROBLEMS.md.

Fields:
- `title`: Short problem title
- `priority`: `high`, `medium`, or `low`
- `category`: `bug-fix`, `feature`, `ui-ux`, or `other`
- `description`: Detailed description

### update-problem
Updates an existing problem's status.

Parameters:
- `ID_OR_TITLE`: Problem ID (e.g. `1.5`) or exact title
- `status`: `Not Started` | `In Progress` | `AI Attempted Fix` | `User Testing` | `Fixed`

### add-check
Adds a checklist item to a problem.

Parameters:
- `PARENT_ID`: Problem ID to attach to
- `description`: What to check
- `instruction`: How to verify

### complete-check
Marks a checklist item as done.

Parameters:
- `CHECK_ID`: The checklist item ID

### update-request
Updates a user request status.

Parameters:
- `ID`: Request ID number
- `status`: `PENDING` | `IN_PROGRESS` | `IMPLEMENTED` | `DECLINED`

## Execution

Actions run automatically on response. The system:
1. Parses `## Actions` block from agent response
2. Validates each action
3. Executes against database + PROBLEMS.md/REQUESTS.md
4. Reports results

## Legacy JSON Format

Can also use `agent/actions.json`:

```json
{
  "terminal_id": "term-xxx",
  "actions": [
    { "type": "create_problem", "title": "...", "priority": "high", "category": "bug-fix", "description": "..." },
    { "type": "update_problem", "id": "1.5", "status": "FIXED" },
    { "type": "complete_checklist", "id": "problem-1.5-step-1" },
    { "type": "update_request", "id": "1", "status": "IMPLEMENTED" }
  ]
}
```

See `agent/ACTIONS_SCHEMA.md` for full JSON schema reference.
