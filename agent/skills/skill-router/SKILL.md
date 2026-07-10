# Skill Router — Universal Skill Dispatcher v1.0.0

> **PURPOSE:** This is the master routing table for ALL skills in `agent/skills/`. It maps every task/scenario to the correct skill(s), enforces load order, and ensures no skill is forgotten. Load this skill FIRST whenever you begin a task.

## 1. How to use this skill

1. Identify the user's task category from the Decision Tree (§2).
2. Read the scenario-to-skill mapping for that category (§3).
3. Load ALL skills listed under "MANDATORY" for that scenario — in the specified order.
4. Load skills listed under "RECOMMENDED" if the task scope warrants it.
5. Respect the activation conditions and load ordering rules (§4).
6. Never skip a MANDATORY skill because you think it doesn't apply — if in doubt, load it.

## 2. Decision Tree — what category is this task?

```
User task enters
│
├─ "fix the problems" / "work through problems.md"
│  └─ FIX PROBLEMS category
│
├─ User wants UI changes / component work / design
│  └─ DESIGN category
│
├─ "commit" / "stage" / "push" / "save changes"
│  └─ COMMIT category
│
├─ Code has been written and needs review before shipping
│  └─ SECURITY REVIEW category
│
├─ User asks for research / investigation / deep analysis
│  └─ RESEARCH category
│
├─ User asks to test / verify / "make sure it works" in browser
│  └─ TESTING category
│
├─ User says "create a prompt" / "write a prompt" / "generate problem"
│  └─ PROMPT GENERATION category
│
├─ Terminal / PTY / agent communication is failing
│  └─ TERMINAL DEBUG category
│
├─ App detection / foreground tracking is wrong
│  └─ APP DETECTION DEBUG category
│
├─ "create a README" / "write docs" / "generate documentation"
│  └─ DOCUMENTATION category
│
├─ After code changes — sync knowledge / update context
│  └─ CONTEXT MAINTENANCE category
│
├─ "add a tutorial" / "walkthrough" / "onboarding steps"
│  └─ TUTORIAL category
│
├─ "generate a license" / "add license" / "choose license"
│  └─ LICENSE category
│
├─ Database migration failing / better-sqlite3 errors
│  └─ SQLITE MIGRATION category
│
├─ User corrects behavior / "never do X" / session boundary
│  └─ AGENT REFLECT category
│
└─ Everything else not covered above
   └─ GENERAL DEVELOPMENT category
```

## 3. Scenario-to-Skill Mapping

### FIX PROBLEMS
**Trigger:** User says "fix the problems", "work through problems.md", "fix issue X.Y", "fix one issue", "fix all the issues"
**Goal:** Read PROBLEMS.md, fix bugs, mark as AI Attempted Fix, report

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `fix-problems` | Core fix loop — autonomous recursive bug fixing with user confirmation gates |
| MANDATORY | `humancentred-UIUX` | Every fix must pass human-comprehension review (check for empty/loading/error states) |
| RECOMMENDED | `max-security` | If the fix touches security-sensitive code (auth, crypto, IPC, DB) |
| RECOMMENDED | `recursive-playwright` | If the fix needs browser-level verification (UI bugs, form handling) |

**Load order:** fix-problems → humancentred-UIUX → max-security (if needed) → recursive-playwright (if needed)

---

### DESIGN
**Trigger:** Any UI change, component work, new page, "make it look better", "polish", "redesign"
**Goal:** Generate production-quality UI that follows DeskFlow design system

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `frontend-external-infra` | Never design from zero — pull from MCP component libraries first. Check Source Routing table. |
| MANDATORY | `humancentred-UIUX` | Mandated by AGENTS.md §5b. Every UI must cover all 4 states (empty/loading/error/populated). |
| MANDATORY | `frontend-design` | DeskFlow design system — colors, spacing, typography, page patterns, component patterns |
| RECOMMENDED | `design-taste` + `taste-skill` | When the user wants to set design direction, variance, or aesthetic |
| RECOMMENDED | `impeccable` | When doing detailed styling, CSS, typography, color work |
| RECOMMENDED | `motion-alive` | When the UI needs micro-interactions, transitions, animations — pick a Liveliness Level first |
| RECOMMENDED | `ui-ux-pro-max` | When choosing industry-specific styles or color palettes |
| RECOMMENDED | `google-stitch` | When the user mentions "mockup", "Stitch", "vibe design", "DESIGN.md" |

**Load order:** frontend-external-infra → frontend-design → humancentred-UIUX → [impeccable → motion-alive → taste-skill depending on scope]

**If this is a page-level redesign** that also changes how data flows, also load `max-security` to review backend changes.

---

### COMMIT
**Trigger:** User says "commit", "stage", "push", "save changes"
**Goal:** Stage all files, write exhaustive commit message, update COMMITS.md

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `commit` | Pre-commit workflow: stage ALL, exhaustive message with sections, COMMITS.md update |
| RECOMMENDED | `maintain-context` | After commit, sync graphify + vault + state.md (if severity warrants) |

**Load order:** commit → maintain-context (if code changed)

---

### SECURITY REVIEW
**Trigger:** "review this code", "is this secure", "harden", "audit", "optimize", "before we ship", or any non-trivial code generation
**Goal:** Find and fix security, performance, and logic issues before code ships

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `max-security` | 4-step security review: Map surface → OWASP scan → Performance scan → Logic scan |
| MANDATORY | `humancentred-UIUX` | If the code includes UI, check human-comprehension of outputs |
| RECOMMENDED | `agent-reflect` | If a vulnerability was caused by a recurring pattern, encode the lesson |

**Load order:** max-security → humancentred-UIUX (if UI) → agent-reflect (if lesson learned)

---

### RESEARCH
**Trigger:** "research X", "investigate Y", "compare technologies", "analyze codebase", "feasibility study"
**Goal:** Structured research with clear findings, sources, and actionable output

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `deep-research` | Structured 5-phase research workflow with DSL inputs and report template |
| RECOMMENDED | `deep-research-prompt` | If you need to delegate research to an external CLI agent (Qwen) |
| RECOMMENDED | `maintain-context` | If research findings should be persisted to vault or graphify |

**Load order:** deep-research → deep-research-prompt (if delegating)

---

### TESTING
**Trigger:** "test this", "verify it works", "make sure the feature is working", "run the tests"
**Goal:** Validate that features work correctly in the real browser/app

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `probe-mcp-testing` (reference) | Read PROBE_MCP_REVIEW.md to understand Probe MCP capabilities and gaps |
| RECOMMENDED | `recursive-playwright` | If you need an autonomous test-and-fix loop (test → fail → fix → retest) |

**Load order:** probe-mcp-testing → recursive-playwright (if loop needed)

**Important:** An IPC probe is NOT proof the UI works. Test the real UI layer. Read `[TERMINAL_DEBUG]` / `[FIT-DBG]` / `[RESUME-DBG]` logs in renderer + main console.

---

### PROMPT GENERATION
**Trigger:** "create a prompt", "write a prompt", "generate a prompt for external AI", "generate problem"
**Goal:** Produce high-fidelity prompts that equip the receiving AI with full context

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `generate-prompt` | High-fidelity prompt generation — copy user words verbatim, create CONTEXT_BUNDLE.md, apply RESULT.md rules |
| MANDATORY | `humancentred-UIUX` | The resulting UI (if any) must be human-comprehensible |
| RECOMMENDED | `generate-problem` | If generating a problem report for external AI (bug report format) |

**Load order:** generate-prompt (+ generate-problem if applicable) → humancentred-UIUX

---

### TERMINAL DEBUG
**Trigger:** "text goes to shell", "agent:ready never fires", "system prompt not received", PTY/terminal/spawn failures
**Goal:** Diagnose and fix terminal-agent communication failures

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `terminal-agent` | Complete PTY data flow reference, 5 failure modes, 5-step debug checklist, fix templates |

**Load order:** terminal-agent only (single-skill scenario)

---

### APP DETECTION DEBUG
**Trigger:** Foreground app shows wrong name, Steam/Epic wrapper instead of real game, null during fullscreen
**Goal:** Fix the 5-layer resolution pipeline

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `app-detection` | 5-layer resolver: TITLE → MAP → INDEX → SCAN → KEEP. Never run layer 4 on normal poll. |

**Load order:** app-detection only (single-skill scenario)

---

### DOCUMENTATION
**Trigger:** "create a README", "improve README", "generate documentation", "write docs"
**Goal:** Professional documentation with badges, diagrams, API reference

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `readme-generator` | 7-step workflow: analysis → badges → diagrams → sections → writing |
| RECOMMENDED | `maintain-context` | If documentation reveals architecture that should be synced to vault |

**Load order:** readme-generator → maintain-context (if needed)

---

### CONTEXT MAINTENANCE
**Trigger:** After ANY code changes. Do NOT activate after read-only exploration.
**Goal:** Keep graphify, agent markdown, and Obsidian vault in sync

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `maintain-context` | Severity assessment (1-5), per-scale action matrix, graphify sync commands |

**Load order:** maintain-context only (single-skill scenario — always last after all other work)

---

### TUTORIAL
**Trigger:** "add a tutorial", "walkthrough", "onboarding", "tutorial steps"
**Goal:** Produce 3-5 step tutorial steps for a feature

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `tutorial-author` | 3-5 brief steps, bullet-only, verb-led, no paragraphs |
| MANDATORY | `add-tutorial` | If building the full tutorial system (hook, overlay, page, badges) |

**Load order:** tutorial-author → add-tutorial (if building full system)

---

### LICENSE
**Trigger:** "create a LICENSE", "add license", "choose a license", "fix GitHub license detection"
**Goal:** Generate or audit license files

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `license-generator` | License selection workflow, SPDX rules, official templates, validation |

**Load order:** license-generator only (single-skill scenario)

---

### SQLITE MIGRATION
**Trigger:** better-sqlite3 version mismatch, native rebuild fails, cross-version Node/Electron compat
**Goal:** Use sql.js fallback for database operations

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `sqlite-js-migration` | 8-step migration to sql.js when native modules fail |

**Load order:** sqlite-js-migration only (single-skill scenario)

---

### AGENT REFLECT
**Trigger:** User corrects behavior ("never do X", "always Y"), session boundary/context compaction, after complex tasks, after discovering non-obvious solutions
**Goal:** Permanently encode learnings into agent definitions and configuration files

| Priority | Skill | Why |
|----------|-------|-----|
| MANDATORY | `agent-reflect` | Signal detection, confidence levels, platform mapping, reflection logs, AGENTS.md updates |

**Load order:** agent-reflect only (single-skill scenario)

---

### GENERAL DEVELOPMENT
**Trigger:** Any development task not covered by the categories above
**Goal:** Ensure all applicable skills are still considered

| Priority | Skill | Why |
|----------|-------|-----|
| RECOMMENDED | `humancentred-UIUX` | If any UI/UX is touched, even tangentially |
| RECOMMENDED | `max-security` | If code touches security-sensitive areas |
| RECOMMENDED | `maintain-context` | After any code change, assess severity |

## 4. Load Ordering Rules

1. **MANDATORY skills in specified order first.**
2. **RECOMMENDED skills after mandatory, in order listed.**
3. **`maintain-context` is ALWAYS last** — it syncs knowledge after all changes are done.
4. **`humancentred-UIUX` is almost NEVER optional** — if the task touches ANY UI (even a console.log or error message that a human reads), load it.
5. **`max-security` loads after design skills** — review the generated code, not the design decisions.
6. **When two categories overlap** (e.g., a fix that also changes UI), load skills from BOTH categories. MANDATORY skills from each apply.

## 5. Anti-Patterns — what NOT to do

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| Start coding a UI without loading any design skills | Load `frontend-external-infra` + `humancentred-UIUX` + `frontend-design` first |
| Fix a bug from PROBLEMS.md without loading `fix-problems` | Always load `fix-problems` for the workflow gates (user confirmation, status updates) |
| Commit code without loading `commit` | `commit` enforces `git add -A`, exhaustive messages, COMMITS.md |
| Ship code without loading `max-security` | Security review catches injection, crypto, auth, config issues |
| Write a prompt for external AI without loading `generate-prompt` | `generate-prompt` enforces verbatim copy, CONTEXT_BUNDLE.md, RESULT.md rules |
| Test UI with only IPC probes | Test the real rendered UI — button clicks, state changes, console logs |
| Make code changes and skip `maintain-context` | Graphify + vault + state.md go out of sync |
| Ignore a user correction without loading `agent-reflect` | The same mistake will repeat across sessions |
| Load ALL skills at once for every task | Only load what the category mandates — overloading wastes context |
| Assume a single skill is enough for a UI task | Design tasks need MULTIPLE skills working together (infra + tokens + UX + motion) |

## 6. Skill activation checklist (run mentally before ANY task)

- [ ] Identify task category from Decision Tree (§2)
- [ ] Read the MANDATORY skills for that category (§3)
- [ ] Load them in the specified order
- [ ] Check if RECOMMENDED skills apply to task scope
- [ ] Is `humancentred-UIUX` loaded if the task touches any user-facing output?
- [ ] Is `maintain-context` queued for after code changes?
- [ ] Is `max-security` loaded if the task touches auth/crypto/DB/IPC?
- [ ] If multiple categories overlap, are MANDATORY skills from EACH category loaded?
