# 🎯 PROMPT: Workspace Feature Diagnostic — Back-and-Forth Q&A

> **Type:** Full diagnostic workflow prompt
> **Target AI:** Claude/GPT-4/Gemini (choose)
> **Status:** Initial — awaiting first questionnaire
> **Process:** Iterative Q&A cycle → full context → fix implementation

---

## Raw Request (Verbatim)

> "I would like to be able to fix the AI feature once and for all, but not the AI is just the future, but the one's on the IDE projects, the workspace, what it's called, it's called the workspace of the application, and I would like you to fix it because none of those things are working there. I would like you to generate problems for me to fix this, but it won't be easy because there's a lot of context and there's a lot of things that need to be given, a lot of context that needs to be given about the current code and stuff and so on and so forth. So I would like to do it in a phase, what I mean by that is that I would like you to use the generate prompt skill, the generate prompt that I asked this other AI to be able to ask some questions. We need to give the initial context so that it knows what to ask. So the context.md of the generate prompt should clarify what are the list of stuff that you need to do. It needs to ask what are the initial context that you need to know, to be able to ask those stuff. So the context one don't need to show all the features in the workspace and it should ask the AI to decide which one to work on first and then it should then tell the AI to generate a prompt that I can insert to back to you which the prompt should be a form of a question where it should list a bunch of questions related to that part of the culture, like a part of the code where the logic is being, the logic that's being used and basically everything related to that feature and I would like to do this for the entire entirety of the features of the workspace. So I would like you to generate the product using the generate prompt skill to start on and during the context and everything in detail, make sure that it includes every detail everything in the list of features of the workspace that there is a workspace features.md that I will also include in the prompt alongside with your prompt and your context and stuff like that. So make sure that you mentioned the file and we mentioned that the list of files we have and where the logic and stuff like that basically give us much details as possible so that these AI could ask the questions properly and you know, fix it properly. So the first thing is questioning, questioning, questioning, question and answer. We should repeat, we should be repeating this process until the AI has full context where it should be a back and forth system"

---

## Problem Statement

The **workspace feature** of the DeskFlow application (the IDE Projects page and the Terminal/Workspace system) has numerous features that are not working properly. This is a large system spanning ~10,000+ lines of code across multiple files, with ~30+ distinct features ranging from IDE detection to AI agent integration to terminal management to project analytics.

The goal is to systematically diagnose EVERY feature, identify what's broken, and generate fix specifications. Because the codebase is large and complex, this must be done iteratively — one feature at a time — through a back-and-forth Q&A process.

---

## Context Bundle Reference

**YOU MUST READ THIS FIRST:** `CONTEXT_BUNDLE.md` is the self-contained reference for this project. It contains:

- **Section 1:** Architecture overview with file paths and line numbers
- **Section 2:** Complete feature inventory with ~30+ features organized by category
  - §2.1: IDE Projects Page features (5.1 through 5.19)
  - §2.2: Terminal/Workspace features (6.1 through 6.12)
- **Section 3:** Data flow diagrams (3 flows)
- **Section 4:** Database schemas (5 tables)
- **Section 5:** IPC endpoint reference (40+ endpoints)
- **Section 6:** State management (key state variables)
- **Section 7:** Component hierarchy
- **Section 8:** Key implementation details (agent readiness, layout tree, workspace buttons)

**Additional reference files provided alongside this prompt:**
- `agent/FEATURE_TRACKER.md` — Complete inventory of every page and feature in the app
- `agent/WORKSPACE_CONTEXT.md` — Detailed workspace-specific context
- `agent/context.md` — Overall project architecture
- `agent/state.md` — Current project state with recent changes

---

## Process: Iterative Q&A Cycle

This is a **multi-round diagnostic process**. The flow is:

### Round N:
1. **You (the target AI)** review the feature inventory and pick ONE feature to focus on
2. **You generate a questionnaire** — a list of questions about that specific feature's code, logic, IPC calls, data flow, UI components, and known issues
3. **The user feeds this questionnaire back to the workspace AI** (me), who answers with specific code details from the actual codebase
4. **You receive the answers** and can either:
   a. **Ask follow-up questions** if context is still incomplete
   b. **Generate the fix specification** if you have enough context
   c. **Move to the next feature** once this one is fully diagnosed

### Repeat until ALL features in the inventory are fully diagnosed.

---

## Your Task

### Phase 1: Initial Review

1. Read `CONTEXT_BUNDLE.md` fully
2. Read `FEATURE_TRACKER.md` sections 5 (IDE Projects, §5.1-5.19) and 6 (Terminal/Workspace, §6.1-6.12)
3. Identify which features are most likely to be broken based on:
   - Complexity (more complex = more likely to be broken)
   - Recent changes (features touched recently may have regressions)
   - Dependencies on IPC/backend (features relying on multiple IPC calls are fragile)
   - UI complexity (features with many interactive elements have more failure modes)

### Phase 2: Select First Feature

Pick ONE feature to diagnose first. State:
- **Which feature** (by ID from CONTEXT_BUNDLE §2, e.g., "5.12 Initialize Button" or "6.1 Multi-Pane Terminal")
- **Why** you chose this feature (what makes it a priority)
- **What you need to know** to diagnose it

### Phase 3: Generate Questionnaire

For the chosen feature, generate a structured list of questions. The questionnaire must cover:

#### Code Structure
- Which exact files and line ranges contain this feature's logic?
- What are the key functions/handlers involved?
- What state variables control this feature?

#### IPC & Data Flow
- What IPC channels does this feature call?
- What data does it send/receive?
- Is the backend IPC handler properly implemented (real data vs mock)?

#### UI Components
- What components render this feature?
- What props do they receive?
- What are the interactive elements (buttons, inputs, modals)?

#### Error States
- What happens when data is empty/null?
- What happens when IPC calls fail?
- What loading states exist?

#### Known Issues
- Has this feature been touched recently?
- Are there any console errors related to it?
- Are there any PROBLEMS.md entries about it?

### Phase 4: Q&A Loop

After receiving answers:
1. **If context is sufficient** → generate a full fix specification including:
   - Root cause analysis
   - Specific code changes needed (file paths, line numbers)
   - IPC changes needed (if any)
   - DB schema changes needed (if any)
   - UI component changes needed (if any)
2. **If context is insufficient** → ask follow-up questions
3. **Move to next feature** → repeat from Phase 2

---

## Output Format for Each Round

### Questionnaire Output Format:
```markdown
## Round N: [Feature ID] — [Feature Name]

### Selected Feature
- **ID:** 5.12 Initialize Button
- **Priority:** High
- **Risk Level:** Medium

### Questions

#### Q1: [Question title]
What is the exact IPC channel used when the Initialize button is clicked? 
What file and line handles this IPC on the backend?

#### Q2: [Question title]
What state determines whether the Initialize button is enabled/disabled?

#### Q3: [Question title]
...
```

### Fix Specification Output Format:
```markdown
## Fix: [Feature ID] — [Feature Name]

### Root Cause
[1-3 sentences explaining why it's broken]

### Changes Required

#### File: `src/pages/IDEProjectsPage.tsx`
- **Line X-Y:** [description of change]
- **Reason:** [why this change fixes the issue]

#### File: `src/main.ts`
- **Line X-Y:** [description of change]

### Verification
[How to test this fix works]
```

---

## Constraints

1. **ONE FEATURE AT A TIME.** Do not try to diagnose multiple features in one round. Focus yields better results.
2. **Prioritize by impact.** Features that block other features (like Initialize or Setup) should come first.
3. **Be specific with file paths and line numbers.** Generic suggestions like "fix the handler" are useless.
4. **If you don't have enough context, ASK.** Do not guess. The questionnaire exists precisely because the codebase is too large to include everything upfront.
5. **Each round's questionnaire should be 5-10 questions max.** Too many questions = scattered answers.
6. **When you receive answers, explicitly state whether you have enough context.** If not, list what's still missing.
7. **Track progress.** At the start of each round, state which features have been diagnosed and which remain.

---

## Success Criteria

- Every feature in CONTEXT_BUNDLE.md §2 has a corresponding diagnostic entry
- Each diagnostic entry includes: root cause OR confirmed working, required changes, and verification steps
- The complete diagnostic is saved as sequential files in `Q&A/` directory
- After all ~30 features are diagnosed, a summary report lists all fixes needed in priority order
