---
id: fix-problems-recursive
name: Fix Problems Recursively
category: debugging
applicable_to: [problems, bugs]
version: 1.0.0
created: 2026-04-19
tags: [debug, fix, problems, testing]
---

# 🔧 Fix Problems Recursively

## What This Skill Does

An autonomous loop that:
1. Reads PROBLEMS.md to get issues with "Not Started" status
2. Analyzes the relevant code for each issue
3. Implements a fix
4. Tests the fix using Playwright MCP (for UI fixes)
5. Marks the issue as "AI Attempted Fix" in PROBLEMS.md
6. Reports to user and WAITS for user to confirm it's fixed
7. Only after USER confirms → marks as "Fixed"

**CRITICAL:** AI should NEVER claim an issue is fixed. Only the USER can confirm.

## When to Activate

Activate this skill when user says:
- "fix the problems"
- "work through the problems.md"
- "fix issue X.Y"
- "fix one issue"
- "fix the galaxy view"
- "fix all the issues"
- Any task involving fixing known bugs from PROBLEMS.md

**IMPORTANT:** This skill will ask how much you want to fix - it won't auto-fix everything.

## Prerequisite Check

Before starting, MUST check:

### 1. PROBLEMS.md exists?

Check if PROBLEMS.md exists in the project root:

```bash
ls PROBLEMS.md
```

**If PROBLEMS.md DOES NOT EXIST:**

Create a new PROBLEMS.md with the proper template:

```markdown
# 📋 [Project Name] - Comprehensive Known Problems List

**Purpose:** This file contains ALL known issues, bugs, and missing features in the [Project Name] application. Every problem mentioned by the user should be documented here with full detail.

**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD

---

## 📝 CRITICAL STATUS RULE

**Only the USER can mark an issue as "Fixed". The AI should NEVER claim an issue is fixed because the AI cannot verify if the fix actually works - the user must test and confirm.**

| Status | Meaning | Who Can Set |
|--------|---------|------------|
| Not Started | Has not been addressed yet | - |
| In Progress | AI actively working on a fix | AI |
| AI Attempted Fix | AI made changes, waiting for user to test | AI |
| Fixed | User confirmed the issue is resolved | **USER ONLY** |

---

## Table of Contents

1. [Bug Issues](#1-bug-issues)
2. [Feature Requests](#2-feature-requests)
3. [UI Issues](#3-ui-issues)
4. [Data Issues](#4-data-issues)
5. [Other Issues](#5-other-issues)

---

## 1. Bug Issues

### 1.1 [Bug Title]

**Problem:** [Clear description of the bug]

**Expected:** [What should happen]

**Actual:** [What's actually happening]

**Status:** Not Started

---

## 📊 Summary of Issue Counts

| Category | Issue Count | Status |
|----------|-----------|--------|
| Bug Issues | 0 | All Not Started |
| Feature Requests | 0 | All Not Started |
| UI Issues | 0 | All Not Started |
| Data Issues | 0 | All Not Started |
| **TOTAL** | **0** | **All Not Started** |

---

**Last Updated:** YYYY-MM-DD
**Maintained By:** [User/Team Name]
```

Then notify the user:

```bash
python complete.py --speak "Created new PROBLEMS.md. Please add issues to track." --project "ProjectName"
```

### 2. complete.py exists (for notifications)

```bash
ls complete.py
```

If not found → Continue without notifications (optional).

## The Recursive Loop Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPERVISOR (Main Agent)                      │
│  - Reads PROBLEMS.md, extracts "Not Started" issues              │
│  - Maintains iteration state                                    │
│  - Reports to user and waits for confirmation                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1: Analyze Problem                    │
│  - Read PROBLEMS.md for specific issue                        │
│  - Read relevant code files                                  │
│  - Understand the problem and expected behavior            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2: Implement Fix                     │
│  - Write/Edit code to fix the issue                            │
│  - Follow existing patterns in the codebase                  │
└─────────────────────────────��───────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 3: Test (If UI Fix)                 │
│  - playwright_browser_navigate → load the app                  │
│  - playwright_browser_snapshot → check UI                    │
│  - Optional: Run Playwright tests                            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 4: Report & Wait                     │
│  - Mark as "AI Attempted Fix" in PROBLEMS.md                │
│  - Report to user: "Attempted fix for [issue X.Y]"           │
│  - WAIT for user to test and confirm                         │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                User Says:                            User Says:
                "Fixed!"                             "Not Fixed"
                    │                                     │
                    ▼                                     ▼
            Mark as "Fixed"              Go back to PHASE 1
            in PROBLEMS.md                Fix + test again
```

## Step-by-Step Workflow

### Step 1: Validate Prerequisites

```bash
# Check PROBLEMS.md exists
ls PROBLEMS.md
```

If not found → STOP with error message.

### Step 2: Read PROBLEMS.md

Read the full PROBLEMS.md file and extract all issues with status "Not Started".

### Step 3: Ask User How They Want to Proceed ⚠️ CRITICAL

**ALWAYS ask the user how much they want to fix - do NOT automatically fix everything.**

Present options:

```
📋 Available issues to fix ([X] total):

Galaxy View Issues:
1. [1.1] Galaxy Not Displaying - No Solar Systems Visible
2. [1.2] Cannot Switch Between Today/Week Timeline
...

Settings Page Issues:
...

Timeline and Data Issues:
...

How would you like to proceed?

Options:
- "fix [issue number]" - Fix only this specific issue (e.g., "fix 1.1")
- "fix [category]" - Fix all issues in a category (e.g., "fix galaxy view")
- "fix [X] issue(s)" - Fix first X issues in order
- "fix all" - Fix everything (NOT recommended - context gets cluttered)
- "show details" - Show full details of a specific issue
```

**Notify user with complete.py to get their attention:**
```bash
python complete.py --speak "Ready to fix problems. Please respond." --project "DeskFlow"
```

**WAIT for user response** - Do NOT proceed until user specifies what they want to fix.

### Step 3b: Confirm Scope

After user selects, confirm back:

```
I'll fix: [issue(s) description]
This is [X] issue(s) to fix.

Ready? Say "yes" to proceed or "change" to modify.
```

**Notify user with complete.py:**
```bash
python complete.py --speak "Ready to confirm scope. Please respond." --project "DeskFlow"
```

Only proceed after user confirms.

```
📋 Available issues to fix:

1. [1.1] Galaxy Not Displaying - No Solar Systems Visible
2. [1.2] Cannot Switch Between Today/Week Timeline
3. [2.1] Color Customization Missing
...

Which would you like me to fix first? (or say "fix all")
```

### Step 4: Fix ONE Issue at a Time ⚠️ CRITICAL

**Focus on ONE issue at a time. Do NOT try to fix multiple issues before user confirms each one.**

#### 4a. Analyze the Problem

- Read the issue details from PROBLEMS.md
- Read relevant code files (check "Affected Code" section if noted)
- Understand expected vs actual behavior

#### 4b. Implement the Fix

Write or edit code to address the specific issue. Follow existing patterns.

#### 4c. Test the Fix (If UI Issue)

Use Playwright MCP to verify:

```javascript
// Navigate to the relevant page
await playwright_browser_navigate(url: "http://localhost:5173/")

// Take snapshot to verify UI state
await playwright_browser_snapshot()

// If applicable, click/interact to test functionality
await playwright_browser_click(element: "button", ref: "Submit")

// Verify the fix worked
await playwright_browser_evaluate(script: "() => { /* assertion */ }")
```

#### 4d. Update PROBLEMS.md

Find the issue and change status from "Not Started" to "AI Attempted Fix":

```markdown
### X.Y: [Issue Title]

**Problem:** [description]

**Status:** AI Attempted Fix - [Brief description of what was attempted]
```

#### 4e. Report to User

Output:
```
🔧 Attempted Fix for Issue [X.Y]: [Title]

**What I did:**
- [Description of changes]

**Files modified:**
- [list of files]

**Please test and confirm if this is fixed.**
When you confirm, I'll mark it as "Fixed" in PROBLEMS.md.
```

**Notify user with complete.py to get their attention:**
```bash
python complete.py --speak "Attempted fix complete. Please test and confirm." --project "DeskFlow"
```

**WAIT** - Do not continue until user confirms.

### Step 5: User Confirmation Loop

For EACH issue, follow this loop:

```
[AI attempts fix for issue X.Y]
        ↓
[Report to user]
        ↓
WAIT for user response
        ↓
    ┌───────────────────┴───────────────────┐
    │                                         │
User says:                              User says:
"Fixed!" / "Yes"                         "Not Fixed"
    │                                         │
    ▼                                         ▼
Mark as "Fixed"              Re-analyze + try again (Step 4a)
    │                       After 3 failed attempts,
    │                           ask user for more details
    ▼
NEXT ISSUE?
Ask: "Ready to fix the next issue?"
```

### Step 6: After Each Fix Confirmed

Before moving to the next issue:

```
✅ Issue [X.Y] confirmed as Fixed!

Next issue: [Y.Z] - [Title]

Ready to fix this one? Say "yes" or "skip" or "stop".
```

**Notify user with complete.py:**
```bash
python complete.py --speak "Issue fixed! Ready for next?" --project "DeskFlow"
```

User can:
- "yes" → proceed to next issue
- "skip" → move to next without fixing
- "stop" → end session here

## PROBLEMS.md Status Update Format

### When Attempting Fix

```markdown
### 1.1: Galaxy Not Displaying

**Problem:** The galaxy view shows nothing.

**Status:** AI Attempted Fix - Added render logic for solar systems. Need user to test.
```

### After User Confirms

```markdown
### 1.1: Galaxy Not Displaying

**Problem:** The galaxy view shows nothing.

**Status:** Fixed (Confirmed by user on 2026-04-12)
```

## Recursion Safety Limits

| Setting | Default | Description |
|---------|---------|-------------|
| `max_attempts_per_issue` | 3 | Maximum re-attempts before asking user |
| `require_user_confirm` | true | Always wait for user confirmation |

## Important Rules

1. **NEVER claim an issue is fixed** - Only "AI Attempted Fix"
2. **ALWAYS wait for user confirmation** - Don't auto-mark as Fixed
3. **PROBLEMS.md required** - Reject if not found
4. **Use Playwright for UI fixes** - Test that the fix actually works
5. **Follow existing code patterns** - Don't break existing functionality

## Example: Fixing Timeline Selection Issue

**User says:** "fix issue 3.1"

**Execution:**

```
1. Read PROBLEMS.md → Issue 3.1: Timeline Selection Does Not Update Applications Page
2. Read App.tsx, StatsPage.tsx → Understand timeline state
3. Find: appStats has [] dependency, doesn't reload when selectedPeriod changes
4. Fix: Add selectedPeriod to dependency array
5. Test: Navigate to Applications page, click "Week", verify data changes
6. Update PROBLEMS.md: "AI Attempted Fix - Added selectedPeriod dependency"
7. Report: "I fixed the timeline issue. Please test by selecting different timelines."
8. Wait for user confirmation
9. User says: "Fixed!"
10. Update PROBLEMS.md: "Fixed (Confirmed by user)"
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| PROBLEMS.md not found | Stop and ask user to create it or confirm path |
| Playwright MCP not available | Skip browser testing, inform user to test manually |
| User says "Not Fixed" | Re-analyze and try different approach |
| Same issue keeps failing | Ask user for more details after 3 attempts |

---

**Last Updated:** 2026-04-12