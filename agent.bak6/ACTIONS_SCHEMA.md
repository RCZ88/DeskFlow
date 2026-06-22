# actions.json Schema

Write structured actions to `agent/actions.json` for batch execution:

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

## Examples

### Example 1: Create a bug problem
```json
{
  "terminal_id": "term-123",
  "actions": [
    { "type": "create_problem", "title": "Login button not working", "priority": "high", "category": "bug-fix", "description": "Clicking the login button does nothing" }
  ]
}
```

### Example 2: Update problem + complete checklist
```json
{
  "terminal_id": "term-456",
  "actions": [
    { "type": "update_problem", "id": "2.1", "status": "FIXED" },
    { "type": "complete_checklist", "id": "problem-2.1-step-1" }
  ]
}
```

### Example 3: Update a request status
```json
{
  "terminal_id": "term-789",
  "actions": [
    { "type": "update_request", "id": "3", "status": "IMPLEMENTED" }
  ]
}
```
