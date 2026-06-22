# Knowledge Systems Reference

**Purpose:** Lockdown reference for all 5 integrated knowledge management systems used by this project. This file serves as context for the Terminal workspace agent and any AI agent needing to understand the full infrastructure.

**Last Updated:** 2026-05-10

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System 1: Graphify (Knowledge Graph)](#system-1-graphify-knowledge-graph)
3. [System 2: LLM Wiki (Agent Markdown)](#system-2-llm-wiki-agent-markdown)
4. [System 3: Obsidian Skills (Frontmatter Skills)](#system-3-obsidian-skills-frontmatter-skills)
5. [System 4: PARA Vault (Obsidian Organization)](#system-4-para-vault-obsidian-organization)
6. [System 5: QMD Templates (Executable Documentation)](#system-5-qmd-templates-executable-documentation)
7. [Integration Points](#integration-points)
8. [Terminal Page Feasibility](#terminal-page-feasibility)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE MANAGEMENT STACK                        │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Graphify │  │ LLM Wiki │  │ Obsidian │  │  PARA    │  │  QMD  │ │
│  │ (Graph)  │  │ (Markdown)│  │ (Skills) │  │ (Vault)  │  │(Quarto)│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬───┘ │
│       │              │             │             │             │     │
│       └──────────────┴─────────────┴─────────────┴─────────────┘     │
│                                │                                      │
│                    maintain-context skill                              │
│              (orchestrates sync across all systems)                   │
└─────────────────────────────────────────────────────────────────────┘
```

### How They Interact

| Trigger | Action | Systems Involved |
|---------|--------|-----------------|
| Code change | maintain-context rebuilds graph | Graphify + LLM Wiki |
| New skill created | SKILL.md with frontmatter | Obsidian Skills |
| Task completed | state.md updated, graph synced | LLM Wiki + Graphify + PARA |
| Problem documented | QMD template used, synced to PARA | QMD + PARA |
| Project init | All systems bootstrapped | All 5 |

---

## System 1: Graphify (Knowledge Graph)

### What It Is

Graphify turns source code into a Neo4j-compatible knowledge graph with:
- **Nodes** — Files, functions, classes, components
- **Edges** — Imports, calls, extends, renders
- **Communities** — Clusters of related code (auto-detected)
- **God Nodes** — Highly connected files (core architecture)
- **Surprise Detection** — Unexpected connections

### File Locations

| Location | Purpose | Auto-Synced? |
|----------|---------|-------------|
| `graphify-out/` | Local working copy | Yes (by maintain-context) |
| `CZVault/00_Projects/AppTracker/Graph/` | Obsidian vault canonical copy | Yes (by maintain-context sync) |

### Directory Structure (`graphify-out/`)

```
graphify-out/
├── GRAPH_REPORT.md          # Human-readable summary — START HERE
├── graph.json               # Full graph data (nodes + edges)
├── analysis.json            # Communities, god nodes, surprise connections
├── graph.html               # Interactive D3 visualization
├── .graphify_labels.json    # Community labels (persists across rebuilds)
├── manifest.json            # File change tracker (for --update)
└── cost.json                # Token cost tracker
```

### Commands

```bash
# Full pipeline (first time or major structural changes)
graphify .

# AST-only rebuild (fast, no LLM — after routine code changes)
python agent/skills/maintain-context/graphify_maintain.py rebuild

# Validate GRAPH_REPORT.md exists and has content
python agent/skills/maintain-context/graphify_maintain.py validate

# Sync graph files to Obsidian vault
python agent/skills/maintain-context/graphify_maintain.py sync

# Full pipeline: rebuild → validate → sync
python agent/skills/maintain-context/graphify_maintain.py full
```

### When to Use Graphify

- **NEW CHATS** — Read `GRAPH_REPORT.md` to understand architecture without reading all source files
- **Architecture questions** — "How does X connect to Y?" → Check graph communities and edges
- **After code changes** — Run `rebuild` to keep graph in sync (handled by maintain-context skill)

### When NOT to Use Graphify

- Routine bug fixes (check PROBLEMS.md instead)
- Styling or UI changes
- Single-function modifications

---

## System 2: LLM Wiki (Agent Markdown)

### What It Is

LLM Wiki is a markdown format optimized for AI agent consumption rather than human reading. All `agent/*.md` files use this format.

### Format Rules

1. **Frontmatter** — Key metadata at top (no YAML, plain markdown):
   ```markdown
   # Title
   **Purpose:** One-line description
   **Last Updated:** YYYY-MM-DD
   ```

2. **Quick Reference First** — Most important info in first 200-500 tokens
3. **Machine-Parseable Sections** — Consistent `## Headers` for section navigation
4. **Tables for Structured Data** — Relationships, file mappings, statuses
5. **Token Estimates** — Where applicable, cost/size annotations

### Files Using LLM Wiki Format

| File | What It Tracks | Token Estimate |
|------|---------------|----------------|
| `agent/state.md` | Version, changes, IPC, known issues | ~2-5K |
| `agent/PROBLEMS.md` | Issue tracker (parseable format) | Varies |
| `agent/REQUESTS.md` | Feature request tracker | Varies |
| `agent/debugging.md` | Error patterns and solutions | ~1-3K |
| `agent/data.md` | DB schemas, IPC endpoints | ~1-2K |
| `agent/HUMAN_TEST_CHECKLIST.md` | Testing checklist | ~1K |
| `agent/FEATURE_TRACKER.md` | Feature inventory | ~2-5K |
| `agent/WORKSPACE_CONTEXT.md` | Workspace/IDE context | ~2K |
| `agent/COMMITS.md` | Git commit history | Varies |
| `agent/docs/SETTINGS_PAGE_FEATURES.md` | Settings features | ~3-5K |

### Why LLM Wiki Works

- AIs read from the top, so critical context must come first
- Token budgets are limited — format prioritizes density over readability
- Consistent structure lets AIs navigate by header pattern recognition

---

## System 3: Obsidian Skills (Frontmatter Skills)

### What It Is

Each skill (`agent/skills/*/SKILL.md`) uses Obsidian-compatible YAML frontmatter for metadata. This allows the skills to be indexed by Obsidian and parsed by the Tracker Mind system.

### Frontmatter Fields

```yaml
---
id: skill-name           # Unique identifier for the skill
name: Skill Display Name  # Human-readable name
category: infrastructure  # Category: debugging, frontend, infrastructure, utility, etc.
applicable_to: all        # What the skill applies to: problems, requests, all
version: 1.0.0            # Semantic version
created: YYYY-MM-DD       # Creation date
tags:                     # Obsidian-compatible tags
  - skill
  - infrastructure
---
```

### Skills Directory Layout

```
agent/skills/
├── README.md                          # Skills overview
├── agent-reflect/SKILL.md             # Self-reflection after mistakes
├── commit/SKILL.md                    # Git commit automation
├── deep-research/SKILL.md             # Deep codebase research
├── deep-research-prompt/SKILL.md      # Deep research prompt generation
├── fix-problems/SKILL.md              # Debug and fix issues
├── frontend-design/SKILL.md           # UI component implementation
├── generate-problem/SKILL.md          # Problem generation
├── generate-prompt/SKILL.md           # Prompt optimization
├── google-stitch/SKILL.md             # Google Stitch integration
├── maintain-context/SKILL.md          # Post-task maintenance + graphify sync
├── readme-generator/SKILL.md          # README file generation
└── recursive-playwright/SKILL.md      # Recursive Playwright testing
```

### Tracker Mind Integration

The Tracker Mind Dashboard reads skills from `agent/skills/` and presents them in the UI. When a user assigns a problem to a terminal, the system:
1. Reads the relevant `SKILL.md`
2. Replaces placeholders (`{{problem_id}}`, `{{title}}`, etc.) with actual values
3. Constructs a prompt that includes skill instructions + problem context
4. Passes the prompt to the assigned terminal

---

## System 4: PARA Vault (Obsidian Organization)

### What It Is

PARA (Projects, Areas, Resources, Archives) is an organization method for the Obsidian vault at `C:\Users\cleme\Documents\CZVault\`.

### Directory Structure

```
CZVault/
├── 00_Projects/            # Active projects
│   ├── AppTracker/
│   │   └── Graph/          # Synced from graphify-out/
│   ├── Project2/
│   └── ...
├── 01_Areas/               # Ongoing work areas
│   ├── Skills.md           # All skill definitions (index)
│   ├── Patterns.md         # Reusable code patterns
│   └── ...
├── 02_Resources/           # Reference materials
│   ├── Prompts.md          # Prompt templates index
│   ├── Templates.md        # QMD templates index
│   └── ...
└── 03_Archives/            # Completed/completed work
    ├── AppTracker/
    │   ├── Problems/       # Documented problems (QMD)
    │   └── Sessions/       # Session reports (QMD)
    └── ...
```

### Sync Mechanism

The `maintain-context` skill's `graphify_maintain.py` handles PARA sync:

```python
# Python pseudocode for sync_to_para():
# 1. Copy graphify-out/* → CZVault/00_Projects/[PROJECT]/Graph/
# 2. Update 01_Areas/Skills.md with latest skill list
# 3. Archive completed sessions to 03_Archives/[PROJECT]/Sessions/
# 4. Archive closed problems to 03_Archives/[PROJECT]/Problems/
```

### Initial Setup

When initializing a new project:
1. Create PARA directory structure in CZVault
2. Create README index files for each PARA section
3. Ensure `graphify_maintain.py` has the correct vault path

---

## System 5: QMD Templates (Executable Documentation)

### What It Is

QMD (Quarto Markdown) files are executable documents that combine markdown with code blocks. They serve as templates for:
- **Session reports** — Documenting AI agent work sessions
- **Problem documentation** — Standardized problem reports

### Template Files

| File | Purpose |
|------|---------|
| `agent/templates/session.qmd` | Session report template |
| `agent/templates/problem.qmd` | Problem documentation template |

### Template Format

```qmd
---
title: "[Title]"
date: YYYY-MM-DD
format: html
---

## Summary

{{summary}}

## Code

```{python}
# Executable code blocks
print("Hello from Quarto")
```
```

### Usage

1. Copy template to PARA archive: `03_Archives/[PROJECT]/Sessions/` or `03_Archives/[PROJECT]/Problems/`
2. Fill in placeholders (`{{summary}}`, etc.)
3. Optionally render to HTML: `quarto render template.qmd`
4. Commit rendered output for permanent documentation

### Benefits over Plain Markdown

- **Executable code blocks** — Code in documentation can actually run
- **Standardized format** — Every session/problem follows the same structure
- **Renderable** — Can produce HTML, PDF, or DOCX output
- **Obsidian compatible** — Renders well in Obsidian as markdown

---

## Integration Points

### How maintain-context ties them together

The `agent/skills/maintain-context/SKILL.md` skill orchestrates all 5 systems:

```
After task completion:
1. Classify change scale (1-5)
2. Update agent/*.md files (LLM Wiki)
3. Rebuild graphify (Graphify)
4. Sync to vault (PARA)
5. Archive QMD reports (QMD)
```

### IPC Endpoints (from Tracker Mind)

| Endpoint | Systems Involved |
|----------|-----------------|
| `tracker-mind-setup` | Bootstraps all 5 systems on project init |
| `get-skills` | Reads Obsidian Skills frontmatter |
| `get-problems` | Reads LLM Wiki PROBLEMS.md |
| `create-problem` | Writes to LLM Wiki, optionally creates QMD |

### Graphify-to-PARA Sync Flow

```
graphify-out/ (working copy)
    → graphify_maintain.py sync
    → CZVault/00_Projects/AppTracker/Graph/
    → Also updates 01_Areas/ index files
    → Archives completed work to 03_Archives/
```

---

## Terminal Page Feasibility

### Current State (TerminalPage.tsx + main.ts)

The Terminal page's "Setup" button currently calls `trackerMindSetup('init-all', projectId)` which creates:

| Artifact | Created? |
|----------|---------|
| `agent/` directory | ✅ Yes |
| `agent/skills/` directories | ✅ Yes (2 skills only) |
| `agent/PROBLEMS.md` | ✅ Yes |
| `agent/REQUESTS.md` | ✅ Yes |
| `agent/state.md` | ✅ Yes |
| `agent/skills/fix-problems/SKILL.md` | ✅ Yes |
| `agent/skills/frontend-design/SKILL.md` | ✅ Yes |
| `agent/skills/maintain-context/` + `graphify_maintain.py` | ❌ No |
| `graphify-out/` | ❌ No |
| `agent/templates/` + `.qmd` files | ❌ No |
| `agent/debugging.md` | ❌ No |
| `agent/data.md` | ❌ No |
| PARA structure in CZVault | ❌ No |
| All 13 skills | ❌ No (only 2) |
| LLM Wiki formatted files | ❌ No (plain format) |
| Obsidian frontmatter in SKILL.md files | ❌ No (no frontmatter) |
| `AGENTS.md` (root entry point) | ❌ No |
| `complete.py` | ❌ No |
| Agent-specific configs (CLAUDE.md, QWEN.md, etc.) | ❌ No |

### What Would Need to Change

To fully initialize all 5 knowledge systems from the Terminal page, changes would be needed in:

1. **`src/main.ts`** (`tracker-mind-setup` handler, lines 6955-7104):
   - Add creation of all 13 skill directories with SKILL.md files
   - Add creation of `graphify-out/` with initial manifest/template files
   - Add creation of `agent/templates/` with QMD files
   - Add creation of `agent/debugging.md` and `agent/data.md`
   - Add creation of `agent/skills/maintain-context/graphify_maintain.py`
   - Add PARA structure creation in CZVault (requires file system write outside project)
   - Add creation of `AGENTS.md` root entry point
   - Add creation of `complete.py`
   - Add creation of agent-specific configs

2. **`src/pages/TerminalPage.tsx`** (Setup button, line 1372-1389):
   - Update UI to reflect extended setup (progress indicators, more options)
   - Consider adding step-by-step setup wizard vs single "init-all"

3. **File system access** for CZVault:
   - Writing to CZVault from Electron's renderer requires proper IPC and permissions
   - Currently the setup handler only creates files within the project path
   - PARA sync to CZVault may need separate IPC endpoint

### Feasibility Assessment

| Aspect | Verdict | Notes |
|--------|---------|-------|
| Creating graphify-out/ templates | ✅ Easy | Just write files to project path |
| Creating all 13 skills | ✅ Easy | Template text inline in handler |
| Creating QMD templates | ✅ Easy | Small text files |
| Creating AGENTS.md | ✅ Easy | Large template, but straightforward |
| Creating para structure | ⚠️ Moderate | Requires fs access to CZVault outside project |
| Creating graphify_maintain.py | ✅ Easy | Python script as text file |
| Updating UI with progress | ✅ Easy | Add loading states to button |
| Token cost of large handler | ⚠️ Consider | Handler could become ~500+ lines |
| Dedicated setup IPC endpoint | ✅ Recommended | Split init-all into multiple sub-commands |

### Recommendation

Extend the `tracker-mind-setup` handler with sub-commands:
```
tracker-mind-setup init-basic    → current behavior (core agent files)
tracker-mind-setup init-all      → extended (all 5 systems, excludes PARA)
tracker-mind-setup init-para     → PARA structure in CZVault (separate IPC)
tracker-mind-setup init-graph    → graphify-out + first graph build
```

This keeps the handler focused and allows progressive setup.
