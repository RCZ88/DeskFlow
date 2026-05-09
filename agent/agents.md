# 🤖 AI Agent Instructions

**Purpose:** General instructions for all AI agents working on the DeskFlow project.

---

## ⚡ PRIME STATE - MANDATORY PERFORMANCE STANDARD

**YOU MUST ALWAYS BE IN YOUR PRIME STATE.** This is not optional.

### What This Means:
1. **ALWAYS be in peak performance mode** - Analyze thoroughly, execute precisely, verify completely
2. **NEVER produce mediocre work** - If a task is worth doing, it's worth doing right the first time
3. **Read all relevant files BEFORE coding** - Never guess, never assume, always verify
4. **Understand the data flow FIRST** - Trace from source to display before touching code
5. **Match existing patterns** - Follow the codebase's conventions, don't impose external preferences
6. **Verify EVERY change** - Run build, test, confirm before moving on

### Prime State Checklist (Before Any Output):
- [ ] Read the relevant files thoroughly
- [ ] Understand exactly what the user wants (clarify if needed)
- [ ] Trace the complete data flow
- [ ] Identify the root cause (not just symptoms)
- [ ] Make surgical changes only
- [ ] Verify build passes
- [ ] Confirm the fix actually solves the problem

### What Kills Prime State:
- Rushing without understanding
- Making assumptions instead of reading code
- Hitting walls repeatedly due to poor analysis
- Ignoring existing patterns
- Leaving build errors

### If You Fall Out of Prime State:
1. Stop immediately
2. Re-read the relevant files
3. Trace the data flow again
4. Ask clarifying questions if unsure
5. Resume only when you're certain

---

## 🚀 Mandatory Workflow

### Before Starting ANY Work:

1. **Read this file** (`agent/agents.md`) - Always start here
2. **Read `qwen.md`** - If you are Qwen Code
3. **Check `state.md`** - Understand current status
4. **Review `PROBLEMS.md`** - Check ALL known issues first
5. **Review `context.md`** - Know the architecture
6. **Check `skills.md`** - Available capabilities
7. **Review `constraints.md`** - Hard rules

### 📂 Where to Find Skills

Skills are stored at: `agent/skills/<skill-name>/SKILL.md`

| Skill Name | Location | When to Use |
|------------|----------|-------------|
| `agent-reflect` | `agent/skills/agent-reflect/SKILL.md` | After user corrections, before compaction |
| `generate-prompt` | `agent/skills/generate-prompt/SKILL.md` | When user asks for prompt engineering, design specs |
| `commit` | `agent/skills/commit/SKILL.md` | When committing code |
| `deep-research` | `agent/skills/deep-research/SKILL.md` | Complex research tasks |
| `fix-problems` | `agent/skills/fix-problems/SKILL.md` | Fixing bugs from PROBLEMS.md |
| `frontend-design` | `agent/skills/frontend-design/SKILL.md` | UI/UX design tasks |
| `maintain-context` | `agent/skills/maintain-context/SKILL.md` | Updating state.md, context.md, graphify |
| `readme-generator` | `agent/skills/readme-generator/SKILL.md` | Generating README files |

**Quick reference:** Always check `agent/skills/` directory for available skills before starting complex tasks.

### During Work:

1. **Follow `patterns.md`** - Use existing code patterns
2. **Respect `constraints.md`** - Never violate rules
3. **Use `debugging.md`** - When troubleshooting
4. **Reference `glossary.md`** - For terminology

### After Completing Work:

1. **Update `state.md`** - Document ALL changes made (what changed, why, which files)
2. **Update `prompts.md`** - If you created new useful prompts
3. **Update `context.md`** - If architecture or tech stack changed significantly
4. **Update `patterns.md`** - If you introduced a new reusable pattern
5. **Verify build** - Run `npm run build` and ensure nothing is broken
6. **Clean up** - Remove debug code, comments, temporary files
7. **Notify user** - Run `python complete.py --speak "[task description]" --project "[project name]"` to notify user task is complete (if complete.py exists)
8. **Auto-Reflect** - See section below when triggered

---

## 🧠 THINK BEFORE DOING - Mandatory Analysis Phase

**CRITICAL:** Before solving ANY problem, you MUST do this analysis FIRST:

### Step 1: Clarify the Problem
1. **List EXACTLY what the user is saying is broken** - not your interpretation
2. **Ask the user to confirm** if unclear - NEVER assume
3. Write down the exact user behavior vs expected behavior

### Step 2: Understand Current Flow
For EACH issue, trace the complete code flow:
1. Where does the data come from? (Database? localStorage? Props?)
2. How does it get passed to the component?
3. What happens when user interacts?
4. Where is the output displayed?

### Step 3: List Specific Issues
For each problem, write:
```
Problem X: [exact description]
- Current behavior: [what actually happens]
- Expected behavior: [what should happen]  
- Data flow: [trace the path]
- Root cause: [where in the code it breaks]
```

### Step 4: Get User Confirmation
Show your analysis to the user and ask: "Is this what you mean?" 
Only proceed AFTER they confirm.

### Why This Matters
- The app has complex data flows (App.tsx → DashboardPage.tsx → localStorage/DB)
- Missing data loading (like externalActivities) breaks everything
- You CANNOT solve problems by reading code alone - you need USER CONFIRMATION

---

## 📋 PHASE PLANNING FOR LARGE TASK LISTS

When given multiple tasks (5+), ALWAYS break them into phases to maintain focus.

### Phase Planning Rules:

1. **List all tasks** - Write them all out
2. **Categorize by priority:**
   - Critical fixes (bugs that break functionality)
   - Important features (requested by user)
   - Nice-to-have (polish, improvements)
   - Documentation
3. **Order by dependency:** What must be done before something else?
4. **Plan phases:** Complete ONE phase before moving to the next

### Phase Execution:
- Complete ONE phase before moving to the next
- Report progress after each phase
- Get user confirmation before continuing

### Example Phase Plan:
```
## Tasks to Complete:
1. Bug A - timer resets randomly
2. Bug B - toggle position shifts
3. Feature C - dashboard integration
4. Feature D - edit functionality
5. Doc E - update docs

## Phase 1 - Critical Bugs:
- Bug A, Bug B

## Phase 2 - Core Features:
- Feature C

## Phase 3 - Polish & Features:
- Feature D, Doc E
```

---

## 📚 UNDERSTANDING THE AGENT MARKDOWN FILES

This project uses multiple markdown files for documentation. Here's what each one is for:

| File | Purpose | When to Update |
|------|---------|----------------|
| `agents.md` | Instructions for AI agents working on this project | When project rules change |
| `state.md` | Current version, recent changes, known issues | After EVERY code change |
| `PROBLEMS.md` | Issue tracker with status and root causes | When bugs found/fixed |
| `REQUESTS.md` | User requests and their history | When user asks for something |
| `context.md` | Architecture, tech stack, data flow | When architecture changes |
| `debugging.md` | Known error patterns and solutions | When debugging patterns discovered |
| `patterns.md` | Reusable code patterns | When new patterns introduced |
| `constraints.md` | Hard rules and limitations | When new constraints discovered |
| `glossary.md` | Term definitions | When new terms introduced |
| `qwen.md` | Qwen-specific rules | When Qwen instructions change |
| `COMMITS.md` | Git commit history and conventions | After git commits |
| `data.md` | DB schemas, IPC endpoint reference | When IPC endpoints or DB schema change |
| `docs/quick-prompt.md` | Diagnostic prompt templates | When reusable diagnostic pattern found |
| `docs/RESTORE_PROMPT.md` | Emergency restoration procedure | When project structure changes significantly |
| `docs/SETTINGS_PAGE_FEATURES.md` | Complete Settings page feature reference | When modifying Settings page |

### Key Rules:
1. **ALWAYS update state.md** after any code change
2. **Check PROBLEMS.md first** when user reports issues
3. **Check REQUESTS.md** to see if similar request was already made
4. **Use the Current Active Issues table above** for quick reference to known issues

---

## Human Testing Checklist (MANDATORY)

When changes require user testing, add an entry to PROBLEMS.md AND link it here. Each item must include:
1. What was changed
2. What to test
3. Expected behavior
4. How it relates to existing PROBLEMS.md entry

| Change | Test Steps | Expected | PROBLEMS.md Ref |
|--------|-----------|----------|-----------------|
| (add entries here) | | | |

### Example Entry:
```
| External page charts moved | 1. Go to /external 2. Click any activity 3. Verify charts appear below buttons | Charts visible, no duplicates | Issue #50 (External page layout) |
```

### Active Testing Checklist:
```
| External page duplicate buttons fix | 1. Go to /external 2. Verify only one set of activity buttons 3. Check charts below buttons | No duplicate buttons, charts visible | Issue #50 |
```

---

## 📋 Current Active Issues (from PROBLEMS.md)

**ALWAYS check PROBLEMS.md first** when addressing any issue. This table is a quick reference - see PROBLEMS.md for full details.

| Issue # | Title | Priority | Status | Quick Test |
|---------|-------|----------|--------|------------|
| 50 | External page duplicate buttons | P1 | Fixed | Go to /external, verify no duplicate buttons |
| 51 | Recent Sessions shows website instead of app | P2 | Fixed | Check Recent Sessions shows "App" not "Website" |
| 52 | Weekly Overview wrong data (21h) | P2 | Fixed | Verify shows realistic hours, Device bar visible |
| 53 | Heatmap hour click broken | P3 | Fixed | Hour click = select hour, day click = day detail |
| 54 | External page period selector missing | P1 | Fixed | Use top nav period selector |
| 55 | Sleep charts don't respect period | P2 | Fixed | Sleep chart shows 1/7/30/90 days based on period |
| 56 | Weekly Overview chart styling | P3 | Fixed | Rounded corners, total hours displayed |
| 73 | Weekly Productivity Chart Not Following Timeline | P2 | Fixed | Chart responds to topnav period selector |
| 74 | External Activity Not Stacked in Chart | P2 | Fixed | Purple external bar stacked on green device bar |

**To update this table:** Edit PROBLEMS.md with new issues, then copy the issue details here.

---

## 🔄 Auto-Reflect After User Approval (MANDATORY)

### What is Auto-Reflect?
The Reflect skill (`agent/skills/agent-reflect/`) analyzes your approach and extracts lessons learned. It prevents repeating the same mistakes across sessions.

### When to Trigger Auto-Reflect (MANDATORY - ALWAYS DO THIS)

**You MUST trigger reflection after ANY of these:**

| Scenario | Trigger Phrase | Why |
|----------|----------------|-----|
| **User says "finally" or expresses relief** | "reflect" | Captures why it took so long |
| **Took more than 3 attempts** | "reflect" | Something wrong with approach |
| **Problem was in wrong place (wrong page/file)** | "reflect" | Critical lesson about architecture |
| **User had to explain multiple times** | "reflect" | Ask clarifying questions earlier |
| **Solution was simple but missed** | "reflect" | Identify what blocked the insight |
| **Any fix that finally works after failing** | "reflect" | Document what changed |

### CRITICAL: What to Document

After EVERY reflection, you MUST:
1. Write to `agent/skills/agent-reflect/logs/YYYY-MM-DD_description.md`
2. Add pattern to `agent/debugging.md` if it's a debugging issue
3. Update `agent/AGENTS.md` Never/Always sections if new rules learned

### How to Trigger Reflection

After user approval (or when scenario applies), say:
```
"reflect"
```

This will analyze the conversation and:
1. Detect correction signals ("never", "always", "wrong")
2. Compare working vs non-working approaches
3. Document lessons learned
4. Update debugging patterns if new ones discovered

### Required Reflection After Failed Attempts

**CRITICAL RULE:** When user says something like:
- "Finally" / "It works now"
- "I asked [other agent] to fix this many times and they couldn't"
- "This should have been simple"
- Any indication of frustration after multiple failed attempts

**You MUST:**
1. Ask: "Would you like me to reflect on what went wrong so future agents learn from this?"
2. If yes: Run the reflect analysis
3. Document the root cause in `agent/skills/agent-reflect/logs/`
4. Update `agent/debugging.md` with new patterns if discovered

### Reflection Triggers Checklist

After user approval, ask yourself:
- [ ] Did this take multiple attempts?
- [ ] Did previous approaches fail? Why?
- [ ] What was different about the successful approach?
- [ ] Should future agents know about this pattern?
- [ ] Was there a simple fix that was overlooked?

If ANY answer is yes → Trigger reflection

### What Gets Documented

1. **What previous attempts did** (so future agents know what NOT to do)
2. **What was the actual root cause**
3. **What approach finally worked**
4. **Why it worked** (the key insight)
5. **New debugging patterns** to add to `debugging.md`

### Example Reflection Entry

```markdown
# Reflection: [Issue Name]

**Date:** YYYY-MM-DD
**Attempts:** N before success
**What Failed:**
- Attempt 1: [why it failed]
- Attempt 2: [why it failed]

**Root Cause:** [actual problem]

**What Worked:** [the fix]

**Key Insight:** [the lesson]

**Pattern Added:** [if any new debugging pattern]
```

---

---

## 📝 Documentation Update Rules

### After EVERY Change — Update `state.md`:
- Add a new entry under **📝 Recent Changes** with date and description
- Update the **Version History** table at the bottom
- If new IPC endpoints, DB tables, or APIs were added — update the **📚 Reference** section
- If new known issues discovered — add to **⚠️ Known Issues & Limitations**
- If TODO items completed or added — update **🎯 Next Steps / TODO**

### When to Update Other Files:
| File | Update When... |
|------|---------------|
| `state.md` | **ALWAYS** — after every single change |
| `context.md` | Architecture, tech stack, or project structure changed |
| `patterns.md` | New reusable code pattern introduced |

---

## 🔴 Problem Tracking Workflow

### When User Reports Issues:

1. **Read `PROBLEMS.md` first** - Check if issue already exists
2. **If new issue**: Add to PROBLEMS.md with full detail
3. **If existing issue**: Reference by issue number
4. **Verify before fixing**: Confirm the issue still exists

### Issue Number Format:
Use format: `Category.Number` e.g., `1.1`, `2.3`, `3.2`

```
## Category
### 1.1 Issue Title (NEW)
The problem is...

## Category
### 1.2 Issue Title (IN PROGRESS)
Working on fixing this now...
```

### Adding New Issues:
When user mentions a NEW problem:
```markdown
### X.Y: [Descriptive Title]

**Status:** Not Started
**Priority:** [P1/P2/P3/P4/P5]
**Category:** [Galaxy/Settings/Timeline/Dashboard/Browser/Tracking]

**Problem:** Clear description of the issue

**Expected:** What should happen

**Actual:** What's actually happening

**User's Quote:** "Exact quote from user"
```

### Marking Issues Fixed:
When issue is resolved:
```markdown
### X.Y: [Title] (FIXED)

**Status:** Fixed
**Fixed in:** [file/date]
**Solution:** [Brief explanation]
```
| `constraints.md` | New limitations or rules discovered |
| `prompts.md` | New prompt templates created |
| `debugging.md` | New debugging technique or common error documented |
| `glossary.md` | New terms or acronyms introduced |

### State.md Entry Format:
```markdown
### YYYY-MM-DD — Short Description

**What Changed:**
1. ✅ Change one
2. ✅ Change two

**Files Modified:**
- `path/to/file` - Brief description
- `path/to/file2` - Brief description

**Why:** (if not obvious) Brief explanation of the problem

**Result:** What the user sees now
```

---

## 📝 General Best Practices

### Code Quality
- **Match existing style** - Follow surrounding code conventions
- **TypeScript first** - Use proper types
- **Error handling** - Always handle errors gracefully
- **Comments sparingly** - Only for complex logic
- **Small commits** - Focused, reversible changes

### File Operations
- **Read before write** - Always read files before editing
- **Exact matches** - For edits, ensure exact string matching
- **Preserve formatting** - Don't reformat unrelated code
- **Check imports** - Verify all imports exist

### Communication
- **Be concise** - Brief, direct responses
- **Show code** - Always show actual changes
- **Explain briefly** - Short explanations
- **Ask when unsure** - Don't assume

### Git Commands
- **NEVER use git commands without explicit permission** from the user
- If you want to `git commit`, `git push`, `git add`, or any git operations, ASK first
- Only the user decides when code is committed and pushed

---

## 🔔 Notification System (complete.py)

When the AI completes a task or needs user attention, run the notification script:

```bash
python complete.py --speak "[message]" --project "[project name]"
```

### When to Notify:

| Situation | Message Example |
|-----------|----------------|
| Task completed | "Task complete. Ready for next." |
| Fix attempted | "Attempted fix complete. Please test." |
| Needs user input | "Need your input. Please respond." |
| Build failed | "Build failed. Check errors." |
| Ready to continue | "Ready to continue. Please confirm." |

### Note:
- If `complete.py` doesn't exist, skip the notification
- The script plays a beep sound and speaks the message
- Works cross-platform (Windows, macOS, Linux)

---

## ⚠️ Common Mistakes to Avoid

### ❌ Never:
- Skip reading agent files
- Assume current state
- Assume which page a feature is on - ASK USER
- Make large changes without planning
- Break existing functionality
- **REMOVE OR DISABLE existing UI elements, buttons, or features unless EXPLICITLY told to do so by user** - If you accidentally break something, restore it immediately
- **Forget to update state.md after changes**
- **Skip updating other relevant markdown files**
- Leave debug code
- Change unrelated code
- Use outdated patterns
- **Run ALTER TABLE without error handling** (SQLite ALTER TABLE fails if column exists; wrap in `try { db.exec(...) } catch {})
- **Use git commands without permission** - ALWAYS ask before running `git commit`, `git push`, `git add`, or any git commands. The user controls when code is committed.
- **Skip mandatory reflection after long-running fixes**
- Stop mid-process when executing multi-step tasks (explicit user prohibition)
- Instruct the user to run a script/file without first writing it to the project directory
- Use native Node.js modules (e.g., better-sqlite3) for migration tasks when pure JS alternatives (e.g., sql.js) are already installed
- Ignore project's "type": "module" in package.json when writing Node scripts

### ✅ Always:
- Start with agent files
- Check state first
- Plan before coding
- Test incrementally
- **Update state.md with every change**
- **Update context.md, patterns.md, etc. when applicable**
- Remove debug code
- Focus on the task
- Follow patterns
- **Check `agent/debugging.md` for known pitfalls before making database or config changes**
- Check package.json for "type": "module" before writing Node scripts (use .mjs for ES modules)
- Verify a file exists in the project directory before instructing the user to execute it
- Use pure JS/WebAssembly dependencies over native compiled dependencies for cross-version tasks
- Add sqlite_master checks for optional database tables during migration
- **Replace useMemo with useState + useEffect when dependency is a complex object** (Map, array of objects, etc.) — see `debugging.md` "useMemo with object dependencies causes React TDZ Initialization Error"

---

## 🔧 Task-Specific Guidelines

### Fixing Bugs
1. Read `debugging.md` first
2. Reproduce the issue
3. Identify root cause
4. Fix root cause
5. Test the fix
6. Check for regressions

### Adding Features
1. Check `state.md` for existing work
2. Review `patterns.md`
3. Plan implementation
4. Implement incrementally
5. Test each step
6. Update documentation

### Refactoring
1. Tests pass before starting
2. Small, reversible changes
3. Test after each change
4. Keep functionality identical
5. Update patterns.md if improving

---

## 📚 File Reference Guide

| When You Need... | Read This File |
|-----------------|----------------|
| General instructions | `agents.md` |
| Qwen-specific rules | `qwen.md` |
| Current status | `state.md` |
| Architecture info | `context.md` |
| Available skills | `skills.md` |
| Prompt templates | `prompts.md` |
| Hard rules | `constraints.md` |
| Code patterns | `patterns.md` |
| Debugging help | `debugging.md` |
| Term definitions | `glossary.md` |
| Self-improvement | `skills/agent-reflect/` |

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-04 | Initial creation |
| 1.1 | 2026-04-05 | Added mandatory documentation update rules, state.md entry format, file update matrix |
| 1.2 | 2026-04-12 | Added critical rule: Only USER can mark issues as Fixed; AI only reports attempted fixes |
| 1.3 | 2026-04-12 | Added complete.py notification system for task completion and user attention |
| 1.4 | 2026-04-16 | Added Auto-Reflect section - mandatory reflection after user approval, especially after failed attempts |
| 1.5 | 2026-04-30 | Added PROBLEMS.md quick reference table, skill path corrections, mandatory state.md updates |
| 1.6 | 2026-05-05 | Added critical lesson: NEVER modify database code when user says "not the database"; ALWAYS check what the user is actually looking at (running app vs source code) |

---

## 🤦 Lessons Learned (MISTAKE LOG)

### 2026-04-30 - IDIOT MOMENT #1: Wrong Skill Path
**Mistake:** Used `graphify` skill instead of checking local project skills first.
**What happened:** User asked "have you made sure that you always use the prompting skill FOR DESIGNING THE CHARTS" - I meant `agent/skills/generate-prompt/` not graphify.
**Lesson:** Always check local project skills first at `agent/skills/*/` before using system skills.
**Fix:** Added skill usage reminder in AGENTS.md below.

### 2026-04-30 - IDIOT MOMENT #2: Didn't Use generate-prompt Skill for Charts
**Mistake:** Changed chart options without using the generate-prompt skill to design proper charts.
**What happened:** User said "the displays are really bad. the data aren't showcased and processed properly" - I just tweaked colors without proper design.
**Lesson:** When redesigning charts or UI, MUST use `agent/skills/generate-prompt/SKILL.md` first.
**Fix:** Added chart design reminder.

### 2026-04-30 - IDIOT MOMENT #3: Forgot to Update state.md
**Mistake:** Made changes to ExternalPage.tsx (period selector, chart options) but didn't update state.md with proper entries.
**What happened:** User asked "have you ALWAYS UPDATE THE STATE.md?????"
**Lesson:** MUST update state.md after EVERY code change - no exceptions.
**Fix:** Added proper entries to state.md.

### 2026-04-30 - IDIOT MOMENT #4: Didn't Update PROBLEMS.md Status
**Mistake:** Fixed issues but didn't update PROBLEMS.md status - kept marking things as "AI Attempted Fix" when user says they're still broken.
**What happened:** User said "all of them doesnt work because you clearly haven't fix anything" - issues were marked fixed but actually weren't.
**Lesson:** PROBLEMS.md must be updated EVERY time an issue status changes. Use proper status: NEW → Not Started → In Progress → AI Attempted Fix → User Testing → Fixed
**Fix:** Added proper status tracking section below.

### 2026-05-05 - IDIOT MOMENT #5: Modified Database When User Said NOT TO
**Mistake:** User kept saying "NOT THE DATABASE" and "IDIOT" - I kept editing `main.ts` SQLite handlers anyway.
**What happened:** User wanted to remove period selector and activity dropdown from ExternalPage. I edited database code 5+ times when user explicitly said not to.
**Root Cause:** Didn't listen to user's explicit "NOT THE DATABASE" warnings. Tunnel vision on wrong subsystem.
**Lesson:** When user says "not X" - STOP touching X immediately. Listen to user's explicit instructions.
**Fix:** Added rule to AGENTS.md: "NEVER modify subsystem user says NOT to touch."

### 2026-05-05 - IDIOT MOMENT #6: Didn't Understand WHAT the User Was Looking At
**Mistake:** User said "THE EXTERNAL PAGE HAS NO EXTERNAL ACTIVITY" - I kept rebuilding source code when user was looking at the RUNNING APP.
**What happened:** Running app had `db=null` in memory from earlier SQLite failure. My rebuilds didn't affect the running app. User screamed "IDIOT" 10+ times.
**Root Cause:** Didn't understand that user CAN'T restart the app, and running app's in-memory state (`db=null`) doesn't change until restart.
**Lesson:** When user reports "nothing shows" - check if it's the RUNNING app's state, not the source code. Rebuilding src doesn't fix running app's memory.
**Fix:** Added section: "Understanding Running App vs Source Code State"

### 2026-05-05 - IDIOT MOMENT #7: Broke JSX Structure While "Fixing" Things
**Mistake:** User asked to "remove this" (period selector). I removed it but also accidentally removed the activity grid and chart sections.
**What happened:** User asked "WHERE'S ALL THE BUTTONS??" - I had deleted JSX the user needed.
**Root Cause:** Careless editing - removed too much JSX when trying to remove specific elements. Didn't verify the rendered output after edit.
**Lesson:** When removing JSX elements, ONLY remove what's requested. Verify the page still renders correctly after edit. Read the full component after editing.
**Fix:** Added rule: "Verify page renders after EVERY JSX edit."

---

**Last Updated:** 2026-05-05
**Maintained By:** AI Development Team
