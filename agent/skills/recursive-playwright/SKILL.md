

---
id: recursive-playwright
name: Recursive Playwright
category: testing
applicable_to: [testing, frontend, e2e]
version: 1.0.0
created: 2026-04-19
tags: [testing, playwright, e2e, automation]
---

# 🚀 Recursive Playwright: Super Mode + Recursion

## What This Skill Does

Turns the agent into an autonomous loop that:
1. Writes or modifies code for a feature
2. Launches Playwright MCP to test it in a real browser
3. Reads test results, accessibility snapshots, and console logs
4. If tests pass → stops and announces completion
5. If tests fail → analyzes the failure, fixes the code, and loops again

The loop continues until success or a user-defined iteration limit.

## When to Activate

Activate this skill when the user says:
- "Use super mode for this feature"
- "Recursively test this with Playwright"
- "Keep fixing until the e2e test passes"
- "Autonomously build this with browser validation"
- The task involves UI, forms, navigation, API integration testing, or any browser-interactive feature

## Required MCP Setup

Before using this skill, ensure Playwright MCP is installed and configured:

```bash
# Register the Playwright MCP server with Claude Code
claude mcp add playwright npx @playwright/mcp@latest

# Verify it's available (should appear in your MCP list)
claude mcp list
```

The server exposes 34 tools including `browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot`, and `browser_take_screenshot`. Playwright MCP uses the browser's accessibility tree for interactions, making them faster and more token-efficient than screenshot-based approaches.

## The Recursive Loop Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPERVISOR (Main Agent)                      │
│  - Maintains loop state, iteration counter, success criteria    │
│  - Spawns subagents for parallel work where possible            │
│  - Decides when to stop or continue                             │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1: Implementation                      │
│  Subagent: implementer (writes/edits code)                      │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2: Browser Testing                     │
│  Main agent uses Playwright MCP directly                        │
│  - browser_navigate → load the app                              │
│  - browser_snapshot → capture accessibility tree                │
│  - browser_click, browser_type → simulate user actions          │
│  - browser_evaluate → run JS assertions                         │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                        ┌──────────┴──────────┐
                        │                     │
                    Tests Pass            Tests Fail
                        │                     │
                        ▼                     ▼
                   ✅ SUCCESS            🔄 RECURSE
                   Stop loop            Log error, fix, retry
```

## Step-by-Step Workflow

### Step 1: Validate MCP and Define Success Criteria

Before starting the loop, verify Playwright MCP is available:

```bash
# Check if Playwright MCP is registered
claude mcp list | grep playwright
```

If not found, guide the user to install it using the command above.

Define **objectively measurable success criteria**. These MUST be specific and testable:

✅ Good examples:
- "The login button navigates to /dashboard"
- "Form submission shows 'Success' message"
- "Clicking 'Add to Cart' increments the cart badge from X to X+1"
- "All Playwright assertions pass without error"

❌ Bad examples:
- "The UI looks good" (subjective)
- "Works properly" (undefined)

### Step 2: Initialize the Loop State

Create or update a state file to track iteration progress:

```bash
# Create state directory if it doesn't exist
mkdir -p .recursive-state
```

Write state to `.recursive-state/playwright-loop.json`:

```json
{
  "feature": "[description of what's being built]",
  "iteration": 0,
  "max_iterations": 10,
  "success_criteria": "[exact criteria from Step 1]",
  "history": [],
  "current_code_state": "[git commit hash or file snapshot]"
}
```

### Step 3: Implementation Phase (Subagent)

Spawn a focused implementation subagent to write or modify code:

```
Task(
  subagent_type="implementer",
  description="Implement feature code",
  prompt="""Implement the following feature according to the specification.
  Focus ONLY on the code changes needed. Do not test yet.

  Feature: [feature description]
  Success criteria: [from state file]

  Files to modify: [list]
  Expected behavior: [description]

  After writing the code, output FILE_SNAPSHOT with the list of files changed.
  """
)
```

> **Why a subagent?** Subagents run with their own isolated context window, preventing the main agent's context from bloating with implementation details. They also allow parallel execution when multiple independent features need implementation.

### Step 4: Browser Testing Phase (Main Agent)

The main agent uses Playwright MCP directly. For each test:

**4.1 Navigate to the target URL**

```
browser_navigate url="http://localhost:3000/feature-page"
```

**4.2 Capture the accessibility snapshot**

```
browser_snapshot
```

This returns structured data like:
```
- heading "Dashboard" [level=1]
- navigation "Main"
  - link "Settings" [href="/settings"]
  - button "Save Changes" [disabled]
```


**4.3 Perform user actions based on the snapshot**

```
browser_click element="button" ref="Save Changes"
browser_type element="input" ref="email" text="test@example.com"
```

**4.4 Run JavaScript assertions**

```
browser_evaluate script="() => document.querySelector('.success-message') !== null"
```

**4.5 Capture console logs and errors**

```
browser_console_messages
```

**4.6 Take screenshot on failure for debugging (optional)**

```
browser_take_screenshot path=".recursive-state/failure-iteration-N.png"
```

### Step 5: Evaluate Results

Parse the Playwright output:

- **Success**: All assertions pass, no console errors, expected elements appear
- **Failure**: Any assertion fails, unexpected errors appear, page doesn't load

**Log the result** to the state file's `history` array.

### Step 6: Recurse or Terminate

**If success criteria met:**
- Update state with `"status": "complete"`
- Run completion notification: `python complete.py --speak "Recursive Playwright loop succeeded" --project "[PROJECT_NAME]"`
- Output: `✅ LOOP COMPLETE – All tests passed after N iterations`
- **Stop**

**If failure AND iteration < max_iterations:**
- Increment iteration counter
- Extract failure reason from Playwright output
- Log to history
- Go back to Step 3 (Implementation Phase), with an additional prompt:
  ```
  Previous attempt failed because: [failure reason]
  Fix the code to address this specific issue.
  Do not change unrelated functionality.
  ```
- **Loop again**

**If max_iterations reached without success:**
- Update state with `"status": "failed"`
- Output: `❌ LOOP FAILED – Max iterations (N) reached. Last error: [error]`
- Run: `python complete.py --speak "Recursive Playwright loop failed" --project "[PROJECT_NAME]"`
- **Stop**

## Parallel Optimization: Spawn Multiple Test Subagents

For features with multiple independent test scenarios, spawn parallel test subagents:

```
# Spawn 3 test subagents simultaneously
Task(subagent_type="test-runner", prompt="Test scenario 1: Login flow")
Task(subagent_type="test-runner", prompt="Test scenario 2: Registration flow")
Task(subagent_type="test-runner", prompt="Test scenario 3: Password reset flow")

# Wait for all to complete, then aggregate results
```

Each test subagent runs Playwright MCP in its own context, dramatically speeding up validation for complex features.

## Recursion Safety Limits

To prevent infinite loops:

| Setting | Default | Description |
|---------|---------|-------------|
| `max_iterations` | 10 | Maximum loop iterations before giving up |
| `iteration_timeout_seconds` | 300 | Max seconds per iteration (5 minutes) |
| `consecutive_same_error_limit` | 3 | If same error appears 3x in a row, stop and ask user |

## Example: Recursive Loop for a Login Feature

**Initial user request:**
"Use super mode to implement login with email/password validation. Test that wrong password shows an error."

**Loop execution:**

| Iteration | Action | Playwright Result | Action |
|-----------|--------|-------------------|--------|
| 1 | Implement basic login form | `browser_click` on login: "Error: Missing password validation" | Fix: Add required attribute |
| 2 | Add required attributes | `browser_type` submits: "Error: No error message on wrong password" | Fix: Add error display logic |
| 3 | Add error message display | `browser_snapshot` shows "Invalid credentials" → ✅ PASS | **Stop. Feature complete.** |

## Completion Output

When the loop finishes successfully, the agent outputs:

```
✅ RECURSIVE PLAYWRIGHT LOOP COMPLETE

Feature: Login with email/password validation
Iterations: 3
Total time: 47 seconds

Iteration history:
  1: Implemented form – Missing validation → FIXED
  2: Added validation – No error message → FIXED
  3: Added error display – ✅ ALL TESTS PASS

Files modified:
  - src/components/LoginForm.tsx
  - src/styles/login.css

Playwright snapshot captured at each iteration in .recursive-state/
```

## Required Agent Configuration

Ensure `.claude/agents/implementer.md` exists for the implementation subagent:

```yaml
---
name: implementer
description: Focused code implementation agent. Writes and modifies code without testing.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
permissionMode: acceptEdits
---
```

And `.claude/agents/test-runner.md` for parallel test execution:

```yaml
---
name: test-runner
description: Runs Playwright tests and reports results. Spawned in parallel for multiple scenarios.
tools: Read, Bash, Grep
model: haiku
permissionMode: plan
---
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Playwright MCP not found | Run `claude mcp add playwright npx @playwright/mcp@latest` |
| Browser doesn't start | Check that your dev server is running on expected port |
| Accessibility snapshot missing elements | Ensure the page has proper ARIA labels or semantic HTML |
| Loop stops without completing | Check `max_iterations` – increase if needed |
| Subagent fails to spawn | Verify `.claude/agents/` directory exists and has valid YAML |
