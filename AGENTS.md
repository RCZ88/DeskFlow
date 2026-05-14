## graphify

This project has a graphify knowledge graph. The canonical copy lives in the Obsidian vault:

```
C:\Users\cleme\Documents\CZVault\00_Projects\AppTracker\Graph\
```

A local copy also exists at: `graphify-out/`

### When to use graphify:
- ONLY when answering questions about **architecture, codebase structure, or complex data flows**
- ONLY in NEW CHATS when you don't know the project structure yet
- **DO NOT use graphify for routine bug fixes, styling changes, or small tasks**

### Quick reference (use only when needed):
- Read `C:\Users\cleme\Documents\CZVault\00_Projects\AppTracker\Graph\GRAPH_REPORT.md` for god nodes and community structure
- Run `python agent/skills/maintain-context/graphify_maintain.py rebuild` for AST-only rebuild (fast, no LLM)

### After completing ANY task that modified files:
Run the `maintain-context` skill (`agent/skills/maintain-context/SKILL.md`). The skill is **dynamic** — it assesses the scale of changes and only runs what's needed:

| Scale | What the AI does |
|-------|------------------|
| **1 — Trivial** (typo, color, one-liner) | One-liner in state.md only. No graphify, no vault sync, no build. |
| **2 — Minor** (small bug fix, single function) | Standard state.md entry. Rebuild graphify IF code files changed. |
| **3 — Moderate** (new feature, multi-file fix) | Full state.md. Rebuild graphify. Update PROBLEMS.md + debugging.md if applicable. |
| **4 — Significant** (new module, file add/remove) | Full state.md + arch notes. Rebuild graphify (consider --update). |
| **5 — Major** (restructure, framework change) | Full state.md + version bump. Full graphify pipeline. |

**Do not over-update.** A typo fix does not need a graphify rebuild. A color change does not need PROBLEMS.md. Match the response to the severity.

Graphify covers architecture/context; the .md files below cover state/issues/patterns.

---

# RULE: DO NOT USE ANY GIT COMMANDS UNLESS INSTRUCTED TO DO SO.

## Complete Agent Markdown Files Reference

All markdown files in the `agent/` directory. Organized by category.

### Core Agent Files (Required Reading)

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/state.md` | Version, recent changes, IPC endpoints, known issues | After EVERY code change |
| `agent/context.md` | Architecture, tech stack, data flow | When architecture changes |
| `agent/AGENTS.md` | This file - project instructions for AI agents | When project rules change |
| `agent/agents.md` | General instructions for AI agents | When project rules change |
| `agent/constraints.md` | Hard rules and limitations | When new constraints discovered |
| `agent/patterns.md` | Reusable code patterns | When new patterns introduced |
| `agent/glossary.md` | Term definitions | When new terms introduced |

### Issue & Debugging Files

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/PROBLEMS.md` | Issue tracker with status, priority, root causes | When bugs are found or fixes attempted |
| `agent/debugging.md` | Error patterns and solutions | When a new debugging pattern is discovered |
| `agent/HUMAN_TEST_CHECKLIST.md` | Human testing checklist for changes | When new features need testing |

### User & Request Tracking

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/REQUESTS.md` | User request history | When user asks for something |
| `agent/COMMITS.md` | Git commit history and conventions | After git commits |

### Feature Documentation

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/FEATURE_TRACKER.md` | Complete inventory of all pages and features | When new features added/changed |
| `agent/WORKSPACE_CONTEXT.md` | Workspace/IDE projects/terminal system context | When workspace features change |
| `agent/docs/SETTINGS_PAGE_FEATURES.md` | Complete Settings page feature reference | When modifying Settings page |
| `agent/data.md` | DB schemas, IPC endpoint reference | When IPC endpoints or DB schema change |

### Prompt & Design Files

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/prompt.md` | Prompt templates (legacy) | When new prompts created |
| `agent/prompts.md` | Prompt collection (superseded) | When new prompts created |
| `agent/docs/quick-prompt.md` | Diagnostic prompt templates | When a reusable diagnostic pattern is found |
| `agent/docs/RESTORE_PROMPT.md` | Emergency restoration procedure | When project structure changes significantly |
| `agent/docs/DASHBOARD_DESIGN_PLAN.md` | Dashboard design planning | When dashboard design changes |
| `agent/docs/DESIGN_PROMPT.md` | Design prompt templates | When creating design prompts |
| `agent/docs/external-page-chart-design-prompt.md` | External page chart design | When modifying external charts |
| `agent/docs/terminal-ai-projects-revamp.md` | Terminal/AI projects revamp plan | When revamping terminal |
| `agent/docs/TERMINAL_INTEGRATION_PROMPT.md` | Terminal integration prompts | When working on terminal features |

### Research & Implementation Docs

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/docs/IMPLEMENTATION_TASKS.md` | Implementation task lists | When tasks change |
| `agent/docs/ROOT-CAUSE.md` | Root cause analysis | When analyzing issues |
| `agent/docs/ide-fixes-plan.md` | IDE fixes implementation plan | When fixing IDE features |
| `agent/docs/IDE-pageDetails-specifications-160426/` | IDE page specifications | When IDE page changes |
| `agent/docs/ide-terminal-features-19042026/` | IDE terminal features docs | When terminal features change |
| `agent/docs/ai-agent-data-storage-research-18042026/` | AI agent data storage research | When researching agent storage |
| `agent/docs/externalpage-insights-ideas-27042026/` | External page insights ideas | When planning external page |
| `agent/docs/externalTrackerInsightsData-22042026/` | External tracker insights data | When analyzing external data |
| `agent/docs/research-impl/` | Research implementation docs | When researching features |
| `agent/docs/6-research-prompt-IDEtracker-15042026/` | IDE tracker research prompts | When researching IDE tracking |

### Visual & UI Docs

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/docs/galaxyColorScheme.md` | Galaxy color scheme design | When changing color schemes |
| `agent/docs/enhancingVisualOptimization.md` | Visual optimization plans | When optimizing visuals |
| `agent/docs/particleBackendOpt.md` | Particle backend optimization | When optimizing particles |
| `agent/docs/TEXTURE_DEBUG_PROMPT.md` | Texture debug prompts | When debugging textures |
| `agent/docs/TEXTURE_DEBUG_FINAL.md` | Texture debug final report | When texture work complete |
| `agent/docs/ORBIT_DEBUG_PROMPT.md` | Orbit debug prompts | When debugging orbit system |
| `agent/docs/exact-bug.md` | Exact bug documentation | When documenting specific bugs |
| `agent/docs/discordStyledSave.md` | Discord-styled save design | When changing save UI |
| `agent/docs/stitch-prompts/` | Stitch AI design prompts | When using Stitch for UI design |
| `agent/docs/graphify/` | Graphify-related prompts | When working with graphify |

### Qwen-Specific Files

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/qwen.md` | Qwen-specific rules | When Qwen instructions change |
| `agent/GENERIC_AGENT.md` | Generic agent instructions | When creating reusable agent instructions |

### Skills Documentation

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/skills.md` | Available skills overview | When skills change |
| `agent/skills/README.md` | Skills directory README | When skills structure changes |
| `agent/skills/agent-reflect/` | Agent reflection skill | When reflection patterns change |
| `agent/skills/commit/` | Commit skill | When commit process changes |
| `agent/skills/deep-research/` | Deep research skill | When research methods change |
| `agent/skills/deep-research-prompt/` | Deep research prompt skill | When prompts change |
| `agent/skills/fix-problems/` | Fix problems skill | When fix procedures change |
| `agent/skills/frontend-design/` | Frontend design skill | When design process changes |
| `agent/skills/generate-problem/` | Generate problem skill | When problem generation changes |
| `agent/skills/generate-prompt/` | Generate prompt skill | When prompt generation changes |
| `agent/skills/google-stitch/` | Google Stitch skill | When Stitch integration changes |
| `agent/skills/maintain-context/` | Maintain context skill | When context maintenance changes |
| `agent/skills/readme-generator/` | README generator skill | When generator changes |
| `agent/skills/recursive-playwright/` | Recursive Playwright skill | When testing approach changes |

### Other Files

| File | What It Tracks | When to Update |
|------|---------------|----------------|
| `agent/README.md` | Agent directory README (outdated) | Rarely - being phased out |
| `agent/dictionary.md` | Word dictionary (purpose unclear) | When dictionary changes |

---

## Human Testing Checklist (MANDATORY)

When changes require user testing, add an entry to `agent/PROBLEMS.md` AND link it here. Each item must include:
1. What was changed
2. What to test
3. Expected behavior
4. How it relates to existing PROBLEMS.md entry

| Change | Test Steps | Expected | PROBLEMS.md Ref |
|--------|-----------|----------|-----------------|
| Recent sessions showing websites | 1. Use app (VS Code) 2. Check Recent Sessions in Dashboard | Shows "App" not "Website" for app entries | Issue #51 |
| Weekly Overview data | 1. Check Dashboard Weekly Overview 2. Verify today's hours are realistic | Shows actual hours (not 21h), Device bar visible | Issue #52 |
| Heatmap hour selection | 1. Click hour cell in heatmap 2. Should select hour only | Hour highlighted, no day popup | Issue #53 |
| Day column hover highlight | 1. Hover on day text (Mon, Tue, etc.) | Entire day column highlights purple | Issue #53 |
| Heatmap day click | 1. Click day text (Mon, Tue, etc.) | Shows day detail page | Issue #53 |
| External page period selector | 1. Go to /external 2. Click today/week/month/all | Stats and charts update accordingly | Issue #54 |
| Sleep chart respects period | 1. Select different periods on External 2. Check Sleep Trends chart | Shows correct number of days (1/7/30/90) | Issue #55 |
| Weekly Overview styling | 1. Look at Weekly Overview chart | Rounded bar corners, total hours below chart | Issue #56 |
| Always-visible timer | 1. Go to /external when no activity running | Shows "00:00:00" with "Click to start tracking" | New feature |

### Example Entry:
```
| External page charts moved | 1. Go to /external 2. Click any activity 3. Verify charts appear below buttons | Charts visible, no duplicates | Issue #50 (External page layout) |
```

---

## CRITICAL RULES (NEVER violate)

### NEVER use git to revert/reset/restore files
**NEVER run ANY of these commands:**
- `git checkout -- <file>`
- `git checkout HEAD -- <file>`
- `git restore <file>`
- `git reset --hard`
- `git stash`

**Why:** Using git to "fix" errors destroys ALL the user's work and reverts to old broken code. This is the #1 cause of Settings page features being lost repeatedly.

**What to do instead:**
1. Read the error message carefully
2. Fix the code manually (edit the broken part)
3. Run `npm run build` to test
4. If build passes, user tests functionality

**ONLY the USER can decide to use git commands. NEVER use them yourself.**

### Tailwind v4 CSS — NEVER change to v3 directives
`src/index.css` MUST use `@import "tailwindcss";` (v4 syntax). NEVER change it to `@tailwind base; @tailwind components; @tailwind utilities;` (v3 syntax). The v3 directives silently break v4 — CSS builds successfully but most utility classes are missing. See `agent/debugging.md` "Tailwind v4 CSS Silent Failure" for full details.

### Package versions — NEVER run `npm install tailwindcss@latest`
This project uses `tailwindcss: "4.2.1"` and `@tailwindcss/vite: "4.2.1"` (pinned exact). Running `npm install tailwindcss@latest` may downgrade to v3 and break everything. Do NOT add `autoprefixer` or `postcss` — they are v3 dependencies.

---

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Tradeoff: bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

**The test:** Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 🔄 Auto-Reflect on "idiot" Trigger

**CRITICAL RULE:** When the user says **"idiot"** (or variations like "IDIOT", "idiot", etc.), you MUST:

1. **Stop immediately**
2. **Trigger reflection** by saying: `"reflect"`
3. **Document the mistake** in `agent/skills/agent-reflect/logs/YYYY-MM-DD_idiot_trigger.md`
4. **Add pattern to `agent/debugging.md`** if it's a debugging issue
5. **Learn from it** - Don't repeat the same mistake

This applies to ANY situation where the user calls you "idiot" - it means you made a mistake that should have been avoided.

---

## Current Active Issues (Check PROBLEMS.md First)

| Issue # | Title | Priority | Status |
|---------|-------|----------|--------|
| 50 | External page duplicate buttons | P1 | In Progress |
| ... | (see PROBLEMS.md for full list) | | |

---

## ⚡ Before Starting ANY Task

**ALWAYS check `agent/state.md` first** to understand current project status. This file contains:
- Current version and recent changes
- All implemented features
- Known issues and IPC endpoints
- Project structure overview

If state.md says "See GRAPH_REPORT.md" - use graphify for architecture context.

---

---

## Knowledge Systems

This project uses integrated knowledge management (detailed in `agent/agents.md` → Knowledge Systems section):

| System | Location | Purpose |
|--------|----------|---------|
| **Graphify** | `graphify-out/` + Obsidian vault | Code architecture visualization |
| **LLM Wiki** | `agent/*.md` | AI-optimized markdown format |
| **Obsidian Skills** | `agent/skills/*/SKILL.md` | Frontmatter-tagged skill definitions |
| **PARA Vault** | `CZVault/` | 00_Projects / 01_Areas / 02_Resources / 03_Archives |
| **QMD Templates** | `agent/templates/` | Executable Quarto documentation |

**Full pipeline:** `python agent/skills/maintain-context/graphify_maintain.py full`

---

@agent/agents.md

**Last Updated:** 2026-05-10