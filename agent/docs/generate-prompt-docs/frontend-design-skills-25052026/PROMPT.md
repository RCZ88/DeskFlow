## Raw Request

"i want so that my agent workspace page have the ability to use these frontend skills. i dont think all of them are good and applicable though. can you select, from the 6 skills there, which is applicable, and how we can implement it to the setup or initialize (maybe more towards the setup of which design skills to use). design the system. engineer it."

The user identified 6 Claude Code design tools from their research:
1. **frontend-design** (Anthropic) — Official skill, already in `agent/skills/frontend-design/`
2. **impeccable** (pbakaus) — https://github.com/pbakaus/impeccable
3. **taste-skill** (Leonxlnx) — https://github.com/Leonxlnx/taste-skill
4. **skillui/npxskillui** (amaancoderx) — https://github.com/amaancoderx/npxskillui
5. **ui-ux-pro-max** (nextlevelbuilder) — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
6. **awesome-design-md** (voltagent) — https://github.com/voltagent/awesome-design-md

---

## Context

> **Read `CONTEXT_BUNDLE.md` first** — it contains all relevant source code (file paths, line numbers, exact interfaces), data structures, design tokens, IPC endpoints, and architecture notes needed to understand the codebase. The rest of this prompt assumes you have read that file.

### Project: DeskFlow

Electron desktop app (React 19, TypeScript, Tailwind v4, Vite 7, Framer Motion, Three.js) with an **AI Agent Workspace** (Tracker Mind) that manages:
- Terminal sessions with AI agents (Claude Code, OpenCode, etc.)
- Problem/request/checklist tracking
- Context assembly via `assembleContext()` — reads `agent/skills/*/SKILL.md` files into the system prompt
- Setup dialog (`NewSessionDialog.tsx`) with 6 context system toggles (LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations)
- Skills loaded from `agent/skills/` (currently 14 skills) into agent context during setup

### Current State

- `agent/skills/frontend-design/SKILL.md` — Already exists, contains Anthropic's official frontend-design skill (42 lines)
- Skills are loaded by `ServicesService.ts` scanning `agent/skills/` for SKILL.md files
- `assembleContext()` builds a skill index for the system prompt when "Obsidian Skills" toggle is enabled
- Setup dialog (`NewSessionDialog.tsx`) has toggle cards for 6 context systems
- InstructionPanel has a "Use Skill" dropdown for selecting skills during instruction composition

### The Problem

The AI agent workspace has extensive backend systems (problems, requests, context management) but ZERO design intelligence. When agents generate frontend code, they produce generic "AI slop" — Inter font, purple gradients, rounded cards, no aesthetic direction. The existing `frontend-design` skill helps but is too thin (42 lines) compared to tools like impeccable (7 reference files, 23 commands, 830-line accessibility guide) or ui-ux-pro-max (161 industry rules, 67 styles, 161 color palettes).

There is no **design skills subsystem** in the setup flow — users cannot configure which design skills the AI should use, or tune design parameters.

---

## The Mandate

Design a comprehensive **Design Skills System** for the DeskFlow AI Agent Workspace that:

1. **Selects the right subset** of the 6 tools for integration (not all are applicable)
2. **Creates SKILL.md files** for each selected tool in `agent/skills/`
3. **Adds a "Design Skills" section** to the NewSessionDialog setup flow with toggles and configuration
4. **Integrates with assembleContext()** so design skills are included in the system prompt
5. **Provides an aggregated design reference** (`agent/design-references/`) with real DESIGN.md files
6. **Supports tunable design parameters** (variance, motion intensity, density) that agents can read

---

## Requirement Checklist

### 1. Data & Selection Logic

- Analyze all 6 tools and determine which are **skills** (loadable at runtime via SKILL.md) vs **CLI tools** (external, one-time use)
- For each selected tool, produce a concise SKILL.md file that captures its design philosophy, commands, and anti-patterns
- For **awesome-design-md**, create a curated selection of 5-10 DESIGN.md files from production sites that match DeskFlow's design language

### 2. Context Integration (assembleContext)

- Add a new context builder function: `buildDesignSkillsContext(projectPath, config)` in `ContextService.ts`
- Design skills should be a **separate toggle** from "Obsidian Skills" — they are design-focused, not workflow-focused
- Include taste skill knobs in the context: `DESIGN_VARIANCE: 5`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 6`
- The combined design context should be ~800 tokens max
- Config schema: `systems.design_skills: { enabled, token_budget, levels: { variance, motion, density } }`

### 3. Setup Dialog UI (NewSessionDialog)

- Add a **"Design Skills"** toggle card to the context systems grid (Palette icon, pink accent, sparkle)
- When expanded, show 4 sub-toggles for each selected skill
- Add **3 sliders** for taste skill parameters (1-10): Design Variance, Motion Intensity, Visual Density
- Add a **"Design References"** sub-toggle for including DESIGN.md template files
- Show a preview of which design knowledge will be injected

### 4. Skill File Architecture

For each selected tool, create `agent/skills/<name>/SKILL.md` with:
- Frontmatter (id, name, category: "design", version)
- Core philosophy / what this skill teaches
- Available commands (if any)
- Design rules and anti-patterns
- Examples of when to activate

### 5. Design References Library

- Create `agent/design-references/` directory
- Add 5-10 curated DESIGN.md files from awesome-design-md that match DeskFlow's aesthetic (dark theme, glassmorphism, data-heavy dashboards)
- Include a `README.md` listing available references with thumbnails

### 6. Verification

- All SKILL.md files must be parseable by the existing SkillsService (frontmatter regex)
- `assembleContext()` must correctly read and include the design skills context when toggle is enabled
- The setup dialog must correctly render the design skills section with all controls
- Build must pass with `npm run build`

---

## Constraints

- All skill content must be **self-contained in SKILL.md files** — no external Python scripts, no CLI dependencies
- Design skills must fit within the existing `agent/skills/` directory structure and SkillsService parser
- The DESIGN.md references in `agent/design-references/` must follow the Stitch DESIGN.md format (not custom formats)
- Taste skill knobs must be exposed as settings in the setup dialog AND as constants at the top of the SKILL.md for the agent to read
- Do NOT modify the main `assembleContext()` function signature — extend it with a new builder
- The existing `frontend-design/SKILL.md` should be enhanced, not replaced
- Keep the total design context under 800 tokens (budget 1200 in config, truncate to 800)
