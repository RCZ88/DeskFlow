---
id: maintain-context
name: Maintain Context
category: maintenance
applicable_to: [graphify, markdown, obsidian]
version: 2.0.0
created: 2026-04-19
tags: [maintenance, sync, graphify, obsidian]
inputs:
  - name: Session History
    type: text
    description: Recent conversation or session context
    required: true
    source: system
  - name: State File
    type: file
    description: Current agent/state.md content
    required: true
    source: system
outputs:
  - name: Updated State
    type: markdown
    description: Revised state.md with current progress
  - name: Context Summary
    type: text
    description: Compressed context for token efficiency
components:
  - name: State Tracker
    description: Monitors what has changed since last update
    source: system
  - name: Context Compressor
    description: Reduces token count while preserving key info
    source: agent
---

# Maintain-Context - Post-Task Knowledge Sync Skill

Keep graphify, agent markdown, and Obsidian vault in sync after every code change. This skill is **dynamic** — it assesses the scale of changes and only runs the updates that are warranted. A one-line bug fix does not need the same treatment as a new feature.

## Quick Reference

| Command | Action |
|---------|--------|
| `/maintain-context` | Assess changes, run appropriate updates |
| `/maintain-context --full` | Force all updates (graphify + markdown + vault + build) |
| `/maintain-context --graph-only` | Rebuild graph only (skip markdown updates) |
| `/maintain-context --md-only` | Update markdown only (skip graphify) |
| `/maintain-context --validate` | Validate that GRAPH_REPORT.md exists and is non-empty |

## When to Activate

**After completing ANY task that modified files in the project.**

Do NOT activate after:
- Read-only exploration (no files changed)
- Questions that don't modify code

## How It Works: Dynamic Severity Assessment

Not all changes are equal. The skill first assesses what happened, then chooses the right level of response.

---

## STEP 1: Assess Change Severity

Review all files modified during the session AND the nature of the user's request. Determine the **change scale**:

### Scale Levels

| Scale | Label | What It Looks Like | Examples |
|-------|-------|--------------------|----------|
| **1 — Trivial** | `trivial` | One-line fix, typo, single CSS value change | Fixed a margin, changed a color hex, fixed a typo in a label |
| **2 — Minor** | `minor` | Small bug fix, single function change, minor UI tweak | Fixed a null check, added a console.log removal, fixed a conditional branch |
| **3 — Moderate** | `moderate` | New feature, new IPC endpoint, new page/component, multi-file bug fix | Added keyword categorization, new Settings tab, fixed data flow across 3 files |
| **4 — Significant** | `significant` | Architecture change, new module, data flow restructure, file additions/removals | Added browser extension, reorganized routing, changed DB schema, split a component |
| **5 — Major** | `major` | Large refactoring, framework migration, project restructure | Moved from JS to TS, replaced state management, rewrote entire page structure |

### How to Determine Scale

Ask yourself these questions IN ORDER. Stop at the first YES:

1. **Did the project structure change?** (files added/removed, routing changed, build config changed) → **Significant** or **Major**
2. **Is this a new feature or multi-file change?** (new IPC endpoint, new page, new component) → **Moderate**
3. **Did a bug fix affect more than one function?** (cascading fix, data flow change) → **Moderate**
4. **Did a bug fix touch only one function or file?** → **Minor**
5. **Is it a one-line change (typo, color, margin)?** → **Trivial**

### Also Determine Change Type

| Type | Indicators |
|------|------------|
| **bug-fix** | Fixed an error, corrected behavior, resolved a PROBLEMS.md issue |
| **new-feature** | Added new functionality, new page, new IPC endpoint, new UI component |
| **architecture** | Moved files, renamed exports, changed data flow, added/removed modules |
| **refactor** | Reorganized code without behavior change, renamed variables, extracted functions |
| **config** | Changed settings, rules, constraints (no code behavior change) |
| **debugging-pattern** | Discovered a new error pattern, workaround, or root cause analysis |

### Special Flags

Regardless of scale, also check:
- **IPC or DB schema changed?** → Flag for `data.md` update
- **New bug discovered or fixed?** → Flag for `PROBLEMS.md` update
- **New debugging insight?** → Flag for `debugging.md` update

---

## STEP 2: Execute Based on Scale

Based on your scale assessment from Step 1, execute **only the steps that are warranted**:

### Scale 1 — Trivial

```
Actions:
  ✅ state.md: Add brief one-liner entry (no detailed breakdown needed)
  ❌ graphify: Skip
  ❌ PROBLEMS.md: Skip (unless it was bug-related)
  ❌ debugging.md: Skip
  ❌ data.md: Skip
  ❌ vault sync: Skip
  ❌ build verify: Only if the change was in buildable code
```

**state.md entry format for trivial changes:**
```markdown
### YYYY-MM-DD — One-Line Description
**Files:** `path/to/file` — brief description | **Build:** OK
```
That's it. No "What Changed" breakdown, no "Why", no "Result". Just one line.

### Scale 2 — Minor

```
Actions:
  ✅ state.md: Add standard entry (What Changed, Files Modified, Build status)
  ✅ graphify: Run rebuild IF code files (.ts, .tsx, .js, .cjs) were modified
  ❌ graphify: Do NOT run full --update (save tokens)
  ❌ PROBLEMS.md: Only if a bug was fixed or discovered
  ❌ debugging.md: Only if a NEW pattern was discovered (not just a fix)
  ❌ data.md: Only if IPC/DB changed
  ✅ vault sync: Only if graphify was run
  ❌ build verify: Run build check
```

**When to run graphify for Scale 2:** Only if the change modified actual code files (`.ts`, `.tsx`, `.js`, `.cjs`). If you only changed markdown or config, skip graphify.

```bash
# Only if code files changed:
python agent/skills/maintain-context/graphify_maintain.py rebuild
python agent/skills/maintain-context/graphify_maintain.py validate
python agent/skills/maintain-context/graphify_maintain.py sync
```

### Scale 3 — Moderate

```
Actions:
  ✅ state.md: Full entry (What Changed, Files Modified, Why, Result, Build)
  ✅ graphify: Run rebuild
  ✅ PROBLEMS.md: Update if bugs involved
  ✅ debugging.md: Update if new pattern discovered
  ✅ data.md: Update if IPC/DB changed
  ✅ vault sync: Yes
  ✅ build verify: Yes
```

Full entry format:
```markdown
### YYYY-MM-DD — Short Description

**What Changed:**
1. Change one
2. Change two

**Files Modified:**
- `path/to/file` - Brief description

**Why:** Brief explanation (omit if obvious)

**Result:** What the user sees now

**Build:** ✅ / ❌
```

```bash
python agent/skills/maintain-context/graphify_maintain.py rebuild
python agent/skills/maintain-context/graphify_maintain.py validate
python agent/skills/maintain-context/graphify_maintain.py sync
```

### Scale 4 — Significant

```
Actions:
  ✅ state.md: Full entry with architecture notes
  ✅ graphify: Run rebuild
  ✅ graphify: Consider full --update if .md docs or new files were added
  ✅ PROBLEMS.md: Update if bugs involved
  ✅ debugging.md: Update if patterns discovered
  ✅ data.md: Update if IPC/DB changed
  ✅ vault sync: Yes
  ✅ build verify: Yes
```

For architecture changes that added/removed files or modified documentation:
```bash
# Check if new files need semantic extraction:
python -c "from graphify.detect import detect_incremental; from pathlib import Path; import json; result = detect_incremental(Path('.')); print(json.dumps(result))"

# If new non-code files detected, run full update:
graphify . --update

# Otherwise, standard rebuild:
python agent/skills/maintain-context/graphify_maintain.py rebuild
python agent/skills/maintain-context/graphify_maintain.py validate
python agent/skills/maintain-context/graphify_maintain.py sync
```

### Scale 5 — Major

```
Actions:
  ✅ state.md: Full entry with architecture notes + version bump
  ✅ graphify: Full pipeline (rebuild or --update as needed)
  ✅ PROBLEMS.md: Update if bugs involved
  ✅ debugging.md: Update if patterns discovered
  ✅ data.md: Likely needs update (major changes often touch IPC/DB)
  ✅ vault sync: Yes
  ✅ build verify: Yes
  ✅ AGENTS.md: Review if project structure changed significantly
```

```bash
# Full pipeline for major changes:
python agent/skills/maintain-context/graphify_maintain.py full
```

### Special Case: Debugging-Pattern Discovery (No Code Changed)

If you discovered a new debugging pattern but didn't change any code:

```
Actions:
  ❌ state.md: Skip (no code changed)
  ❌ graphify: Skip
  ❌ PROBLEMS.md: Only if a bug was identified
  ✅ debugging.md: Add new pattern entry
  ❌ data.md: Skip
  ❌ vault sync: Skip
  ❌ build verify: Skip
```

### Special Case: Config Change (Only .md Files Changed)

If you only changed markdown files (agents.md, constraints, etc.) and no code:

```
Actions:
  ✅ state.md: Brief entry
  ❌ graphify: Skip
  ❌ PROBLEMS.md: Skip
  ❌ debugging.md: Skip
  ❌ data.md: Skip
  ❌ vault sync: Skip
  ❌ build verify: Skip
```

---

## STEP 3: Run Graphify (If Warranted)

Only run these commands if the scale assessment from Step 2 says to:

### 3a: Standard Rebuild (most cases)

**IMPORTANT:** Do NOT use the raw `_rebuild_code()` function — it has a Windows UTF-8 encoding bug. Use the helper script:

```bash
python agent/skills/maintain-context/graphify_maintain.py rebuild
```

This is FAST (deterministic AST extraction, no LLM needed). Only runs when code files (.ts, .tsx, .js, .cjs, .py) were modified.

### 3b: Skip Graphify Entirely

Skip if:
- Scale is 1 (trivial)
- Only markdown/config files changed, no code files

### 3c: Full Update (rare — only for architecture changes with new files)

```bash
# Only if detect_incremental shows new non-code files:
graphify . --update
```

---

## STEP 4: Validate GRAPH_REPORT.md (If Graphify Was Run)

```bash
python agent/skills/maintain-context/graphify_maintain.py validate
```

If empty or broken, the script regenerates from graph.json and analysis.json.

Community labels are persisted in `graphify-out/.graphify_labels.json`. If they show "Community 0", apply the project-specific mapping. For this project:

| Community ID | Label |
|-------------|-------|
| 0 | App State Management |
| 1 | OrbitSystem Visualization |
| 2 | Electron Main Process |
| 3 | Browser Extension Background |
| 4 | Notification System |
| 5 | Category Management |
| 6 | Browser Activity Page |
| 7 | Settings Page |
| 8 | Data Logging and Aggregation |
| 9 | Database Page |
| 10 | AI Pricing Integration |
| 11 | Graphify Pipeline |
| 12 | Browser Tracking Server |
| 13 | Productivity Scoring |
| 14 | Vite Config |
| 15 | ESLint Config |
| 16 | Build Configuration |
| 17 | Preload Bridge |

---

## STEP 5: Update Agent Markdown (Based on Scale)

Refer to Step 2 for which files to update at each scale level.

### 5a: state.md Formats

**Trivial entry (Scale 1):**
```markdown
### YYYY-MM-DD — One-Line Description
**Files:** `path/to/file` — brief description | **Build:** OK
```

**Standard entry (Scale 2-5):**
```markdown
### YYYY-MM-DD — Short Description

**What Changed:**
1. Change one
2. Change two

**Files Modified:**
- `path/to/file` - Brief description

**Why:** Brief explanation (omit if obvious)

**Result:** What the user sees now

**Build:** ✅ or ❌
```

Always also update:
- Version number (increment for Scale 3+)
- Last Updated date
- Version History table for Scale 3+

### 5b: PROBLEMS.md (Only if bugs involved)

**Fixing a bug:** Change status to `AI Attempted Fix`, add solution line.

**Discovering a bug:** Add new issue with proper format.

**IMPORTANT:** Only the USER can mark an issue as `Fixed`.

### 5c: debugging.md (Only if new pattern discovered)

Add entries only if genuinely new — check existing entries first to avoid duplication.

```markdown
### [Pattern Name]
**Symptoms:** What the user sees
**Cause:** Root cause
**Fix:** Step-by-step
**Prevention:** How to avoid
```

### 5d: data.md (Only if IPC endpoints or DB schema changed)

Add new endpoints to the table, add new tables/columns to the schema section.

---

## STEP 6: Sync to Obsidian Vault (If Graphify Was Run)

```bash
python agent/skills/maintain-context/graphify_maintain.py sync
```

Skip this if graphify was not run (Scale 1, config-only, debugging-pattern only).

---

## STEP 7: Verify Build (If Code Was Changed)

```bash
npm run build
```

Skip for Scale 1 if the change was in a non-buildable file (markdown, config).

---

## Summary: Decision Matrix

Quick reference for what to do at each scale:

| Action | Scale 1 | Scale 2 | Scale 3 | Scale 4 | Scale 5 |
|--------|---------|---------|---------|---------|---------|
| state.md | One-liner | Standard | Standard | Full + arch note | Full + version bump |
| graphify rebuild | ❌ | If code changed | ✅ | ✅ | ✅ |
| graphify --update | ❌ | ❌ | ❌ | If new files | ✅ |
| PROBLEMS.md | ❌ | If bug | If bug | If bug | If bug |
| debugging.md | ❌ | If new pattern | If new pattern | If new pattern | If new pattern |
| data.md | ❌ | If IPC/DB | If IPC/DB | If IPC/DB | Likely |
| vault sync | ❌ | If graphify ran | ✅ | ✅ | ✅ |
| build verify | ❌* | ✅ | ✅ | ✅ | ✅ |

*Skip build verify for Scale 1 unless the change was in buildable code.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `_rebuild_code()` fails with UnicodeEncodeError | Use `graphify_maintain.py rebuild` instead — handles UTF-8 on Windows |
| GRAPH_REPORT.md is empty after rebuild | Run `python agent/skills/maintain-context/graphify_maintain.py validate` |
| graph.json is empty or corrupt | Run `graphify .` (full pipeline) from scratch |
| Community labels are "Community 0"... | `graphify_maintain.py rebuild` loads saved labels from `.graphify_labels.json` |
| Obsidian vault path doesn't exist | Create the Graph/ directory |
| Build fails after updates | Fix code first, then re-run maintain-context |
| Unsure what scale the change is | Round up — it's better to over-update than under-update |

---

## Integration with AGENTS.md

This skill is referenced in AGENTS.md as a mandatory post-task step. After completing any task that modifies files:

1. Assess the change scale (Step 1)
2. Execute the appropriate steps for that scale (Step 2)
3. Report what was updated to the user

**Do not over-update.** A typo fix does not need a graphify rebuild. A color change does not need PROBLEMS.md. Match the response to the severity.

---

**Last Updated:** 2026-04-19
**Maintained By:** AI Development Team