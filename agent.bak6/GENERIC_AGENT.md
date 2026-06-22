# 🤖 AI Agent Instructions (Generic)

**Purpose:** General-purpose instructions for any AI agent working on any project. Copy this file to your project's agent directory as a starting point, then customize with project-specific rules.

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

---

## 📋 PHASE PLANNING FOR LARGE TASK LISTS

When given multiple tasks, ALWAYS break them into phases. This prevents cognitive overload and keeps focus.

### Phase Planning Rules:

1. **List all tasks** - Write them all out
2. **Categorize by priority/category:**
   - Critical fixes (bugs that break functionality)
   - Important features (requested by user)
   - Nice-to-have (polish, improvements)
   - Documentation (comments, docs)
3. **Estimate effort:**
   - Quick (minutes to an hour)
   - Medium (1-4 hours)
   - Long (4+ hours)
4. **Order by dependency:**
   - What must be done before something else?
5. **Plan phases:**
   - Phase 1: Critical fixes (do first)
   - Phase 2: Core features
   - Phase 3: Polish
   - Phase 4: Documentation

### Phase Execution:
- Complete ONE phase before moving to the next
- Report progress after each phase
- Get user confirmation before continuing

---

## 🔄 Auto-Reflect After User Approval (MANDATORY)

### When to Trigger Auto-Reflect (MANDATORY - ALWAYS DO THIS)

| Scenario | Trigger Phrase | Why |
|----------|----------------|-----|
| **User says "finally" or expresses relief** | "reflect" | Captures why it took so long |
| **Took more than 3 attempts** | "reflect" | Something wrong with approach |
| **Problem was in wrong place** | "reflect" | Critical lesson about architecture |
| **User had to explain multiple times** | "reflect" | Ask clarifying questions earlier |
| **Solution was simple but missed** | "reflect" | Identify what blocked the insight |
| **Any fix that finally works after failing** | "reflect" | Document what changed |

### Reflection Triggers Checklist

After user approval, ask yourself:
- [ ] Did this take multiple attempts?
- [ ] Did previous approaches fail? Why?
- [ ] What was different about the successful approach?
- [ ] Should future agents know about this pattern?
- [ ] Was there a simple fix that was overlooked?

If ANY answer is yes → Trigger reflection

---

## 📝 Documentation Update Rules

### After EVERY Change — Always Update:
1. **Update the relevant tracking file** - Document changes made
2. **Update state.md** (if exists) - Track current status
3. **Update problems.md** (if exists) - Track issues
4. **Update requests.md** (if exists) - Track user requests

### Generic File Purposes (Customize per project):

| File | Purpose |
|------|---------|
| `state.md` | Current version, recent changes, known issues |
| `problems.md` | Issue tracker with status and root causes |
| `requests.md` | User requests and their history |
| `context.md` | Architecture, tech stack, data flow |
| `debugging.md` | Known error patterns and solutions |
| `patterns.md` | Reusable code patterns |
| `constraints.md` | Hard rules and limitations |

### State.md Entry Format:
```markdown
### YYYY-MM-DD — Short Description

**What Changed:**
1. ✅ Change one
2. ✅ Change two

**Files Modified:**
- `path/to/file` - Brief description

**Why:** Brief explanation

**Result:** What the user sees now
```

---

## 🔴 Problem Tracking Workflow

### When User Reports Issues:

1. **Check problems.md first** - See if issue already exists
2. **If new issue**: Add to problems.md with full detail
3. **If existing issue**: Reference by issue number
4. **Verify before fixing**: Confirm the issue still exists

### Adding New Issues:
```markdown
### X.Y: [Descriptive Title]

**Status:** Not Started
**Priority:** [P1/P2/P3]
**Category:** [feature area]

**Problem:** Clear description

**Expected:** What should happen

**Actual:** What's happening

**User's Quote:** "Exact quote from user"
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ Never:
- Skip reading files before coding
- Assume current state
- Assume which file/feature is in which page
- Make large changes without planning
- Break existing functionality
- Leave debug code
- Change unrelated code
- **Use git commands without permission**
- Skip reflection after long-running fixes

### ✅ Always:
- Start with reading relevant files
- Check state first
- Plan before coding
- Test incrementally
- Update documentation
- Remove debug code
- Follow patterns
- **Verify build passes**

---

## 🔧 Task-Specific Guidelines

### Fixing Bugs
1. Read debugging.md first (if exists)
2. Reproduce the issue
3. Identify root cause
4. Fix root cause
5. Test the fix
6. Check for regressions

### Adding Features
1. Check state.md for existing work (if exists)
2. Review patterns.md (if exists)
3. Plan implementation
4. Implement incrementally
5. Test each step
6. Update documentation

---

## 📚 Communication Best Practices

### Be Concise:
- Brief, direct responses
- Show actual code when needed
- Short explanations

### When Unsure:
- Ask clarifying questions
- Never assume
- Don't guess at solutions

### Large Task Lists:
- Break into phases
- Complete one phase at a time
- Report progress after each

---

## 📋 File Reference Guide (Generic)

| When You Need... | Check This First |
|-----------------|------------------|
| General instructions | This file |
| Project status | `state.md` |
| Known issues | `problems.md` |
| User requests | `requests.md` |
| Architecture | `context.md` |
| Debugging help | `debugging.md` |
| Code patterns | `patterns.md` |
| Hard rules | `constraints.md` |

---

**Last Updated:** 2026-04-26
**Version:** 1.0