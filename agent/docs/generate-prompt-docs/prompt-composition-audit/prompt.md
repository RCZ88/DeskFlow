# Prompt Composition Infrastructure Audit

## Raw Request

> "i said to use the @agent/skills/generate-prompt/SKILL.md to ask an ai to evaluate teh system. i didnt ask you to be hte one that evaulates them. it should ask the ai to evaluate, and give the improvements in termso f the exxact prompt and instructions immidately and stuff directly."

> *(Context: The user wants the Architect AI — not the local opencode agent — to evaluate DeskFlow's 3-layer system prompt composition system and produce exact, actionable improvements with concrete prompt text and configuration changes, not just recommendations.)*

---

## Problem Statement

DeskFlow has a system prompt composition infrastructure with 3 layers (Default/General/Project) that controls what instructions AI agents receive when they spawn in terminals. However, the system has structural problems:

1. **Two disjoint prompt paths** — The "New Session" path uses per-agent-type prompts (claude/opencode/custom) while the "Compose Instruction" path uses the 3-layer system. The same agent can get different instructions depending on which path is used.
2. **Missing UI controls** — `generalAdditions` and `projectPrompt` keys exist in the preferences schema and are read by the layer system, but have no Settings UI to set them.
3. **No sync guard** — The DEFAULT_SYSTEM_PROMPT is duplicated in two files (`src/lib/defaults.ts` and `agent/DEFAULT_SYSTEM_PROMPT.md`) with no mechanism to keep them in sync.
4. **Ambiguous terminology** — Settings says "General prompts apply to all projects" but the input fields are per-agent-type (claude/opencode/custom), not truly "general."
5. **No conflict resolution** — If Default/General/Project layers contradict each other, there's no priority system to resolve.

The user wants exact, concrete improvements — actual prompt text, configuration values, UI copy changes, and code changes — not analysis or recommendations.

---

## Context

Read `agent/docs/prompt-composition-audit/CONTEXT_BUNDLE.md` first. It contains the complete code context:
- Full source code with file paths and line numbers for every file involved
- The 3-layer assembly code (TerminalPage.tsx lines 1005-1017)
- The initializeTerminal new-session path (lines 756-884)
- The InstructionPanel compose UI (full 676-line component)
- The Settings UI prompt tab (lines 2819-2882)
- The ContentAssemblyService server-side service (366 lines)
- The opencode.json config
- The DEFAULT_SYSTEM_PROMPT content in both locations
- All preference storage schemas

---

## Mandate

**Evaluate DeskFlow's prompt composition infrastructure and produce a comprehensive audit with exact fixes.**

You are the Lead Architect. Do NOT produce recommendations, analysis, or "options." Produce:

1. **A prioritized list of every issue** you find, ranked by severity (HIGH/MEDIUM/LOW).
2. **For each issue, the exact fix** — actual code changes, UI text changes, file modifications, configuration changes. Not pseudocode. Not "consider doing X." Exact text to add/change/remove.
3. **For any new prompt text** needed (e.g., a deduplicated DEFAULT_SYSTEM_PROMPT, a true generalAdditions prompt, a project-scope prompt template), write the **exact prompt text** inline.
4. **A merged/harmonized prompt architecture** — if the two paths need to be unified into one, design that unified system with exact code.

### ⚠️ CRITICAL FOCUS: Composition Mechanics (not just content)

**This audit is about HOW layers compose, not just WHAT each layer says.**

The current system naively concatenates layers with `---` separators. There is no:
- **Ordering rule** — which layer goes first? Last? Does the order matter?
- **Priority/override semantics** — if General says "use Python" and Project says "use Rust", which wins?
- **Conflict resolution** — no mechanism to detect or resolve contradictions between layers
- **Stacking vs replacing** — are layers additive (stacking, all sent) or selective (one replaces another)?
- **Template slot injection** — can a higher-scope layer inject content into a specific section of a lower layer?
- **Per-section composition** — different rules for different sections (e.g., "Rules sections merge, Tools sections override")
- **Layer inheritance** — does Project inherit from General? Does General inherit from Default?
- **Composition visibility** — does the user see the final merged result, or just the raw layers?

**Your primary job is to design the composition mechanics** — the rules, algorithms, and data model that define how multiple prompt sources combine into a single coherent instruction set. The content of each layer is secondary.

### Requirements Checklist

#### 🔴 Engineering — Composition Mechanics (HIGHEST PRIORITY)

- [ ] **Design the layer ordering model.** What order should layers appear in the final prompt? Define the rule (e.g., "most general first, most specific last" or "most authoritative first"). If order depends on section type, define per-section ordering. Produce the exact ordering algorithm as TypeScript code.

- [ ] **Design the priority/override model.** When two layers say different things about the same topic, which wins? Options:
  - **Last-write-wins** (specific overrides general)
  - **First-write-wins** (general is authoritative)
  - **Explicit priority tiers** (e.g., Default=1, General=2, Project=3 — higher wins)
  - **Per-section priority** (e.g., "Rules" sections merge all, "Tools" sections use highest-priority only, "System" sections use Default-only)
  - **Keyword-tagged override** (user marks a specific instruction as "override")
  - Produce the exact model with TypeScript types and merge logic.

- [ ] **Design the stacking model.** Define for each section type whether layers:
  - **Stack (concatenate)** — all layers' content for this section is included
  - **Replace** — highest-priority layer's content replaces all others
  - **Merge intelligently** — combine instructions without duplication (e.g., "don't repeat the same rule")
  - **Inject into template slots** — a specific section in Default has `{{GENERAL_ADDITIONS}}` and `{{PROJECT_INSTRUCTIONS}}` placeholders where other layers inject content
  - Produce the exact stacking rules as a decision table.

- [ ] **Design the section-level composition model.** A system prompt typically has sections: Who you are, Startup ritual, Terminology, Memory, Tools, Testing rules, Hard invariants, Output format, etc. For each section, define:
  - Does it support layer stacking? (e.g., "Hard invariants" should only come from Default)
  - Does it support per-section toggles? (user can toggle "Memory" section but keep "Tools")
  - Does it support override? (project can override "Who you are" but not "Hard invariants")
  - Produce the exact section-level composition map as TypeScript config.

- [ ] **Design the conflict detection system.** Produce the algorithm that:
  - Detects when two layers contradict each other (e.g., same instruction with different values)
  - Surfaces conflicts to the user in the InstructionPanel UI
  - Provides resolution suggestions
  - Produces a final warning if conflicts remain unresolved

- [ ] **Evaluate the current `---` separator approach.** Is `\n\n---\n\n` the right separator? Should it be:
  - A clear section header like `## General Instructions (app-wide)`?
  - A collapsible boundary that the receiving AI can distinguish?
  - A meta-instruction like "The following section comes from [Layer X]. Priority: Y"?
  - Produce the exact separator format with rationale.

#### Engineering — Prompt Assembly Logic
- [ ] Evaluate whether `initializeTerminal` (new session) and `generatePrompt` (InstructionPanel compose) should be unified or intentionally separate. If separate, specify when each should be used. If unified, produce the unified code.
- [ ] Identify every code path where prompts are assembled, merged, or sent. Map each path end-to-end.
- [ ] Find any dead code, unused preference keys, or unreachable paths.
- [ ] Verify that the `generalAdditions` key is actually used anywhere beyond the `systemPromptLayers` useMemo. If it's unused elsewhere, decide: keep it and add a UI, or remove it.
- [ ] Evaluate the per-agent-type prompt storage (`systemPrompts.claude`, `systemPrompts.opencode`, `systemPrompts.custom`). Should these stack on top of the 3-layer system, or replace it?

#### Engineering — DEFAULT_SYSTEM_PROMPT Sync
- [ ] Design a sync mechanism between `src/lib/defaults.ts` and `agent/DEFAULT_SYSTEM_PROMPT.md`. Options:
  - A build script that copies one to the other
  - A single source of truth with an import/export pattern
  - A CI/commit hook check
  - **Produce the exact script or configuration** — don't just name the approach
- [ ] If you choose a single-source approach, write the exact import/export code.

#### Design — Settings UI
- [ ] Evaluate the Prompts tab in Settings (SettingsPage.tsx lines 2819-2882). For each issue found, write the exact UI changes:
  - Exact label text (e.g., change "General prompts apply to all projects" to what?)
  - Exact input fields needed (for `generalAdditions`, for `projectPrompt`)
  - Exact layout description
  - If the prompt tab needs reorganization, describe the new layout
- [ ] **Crucially: must the Settings UI surface the composition model?** Should users see a "priority" slider per layer? Should they see a preview of how layers merge? Should they be able to reorder layers? Design this.

#### Design — InstructionPanel UI
- [ ] The 3-layer display in InstructionPanel (lines 314-388) shows layers with individual toggles and character counts. Evaluate if this is sufficient:
  - Should the layer origin be clearer? (e.g., "General (app-wide)" vs "Project: my-project")
  - Should the per-agent-type prompt choice be shown here?
  - **Should the merged/stacked result be shown alongside individual layers?**
  - Should there be a conflict warning when two layers contradict?
  - Should users be able to reorder layers in this view?
  - Should the separator between layers be visible/editable?
- [ ] Write exact UI copy changes for any issues.

#### UX — User Flow
- [ ] Trace the user's journey for setting up prompts:
  1. User opens Settings → Prompts tab
  2. User sets agent-type additions
  3. User creates new terminal session → which prompt does the agent see?
  4. User opens compose modal → which layers are shown?
  5. User toggles layers off/on → what does the agent actually receive?
  6. **User sees layers stacking — can they tell WHICH instruction came from WHICH layer?**
  7. **User sees a conflict — how do they resolve it?**
- [ ] Identify any UX gaps (e.g., "I set a prompt in Settings but my session agent doesn't see it").
- [ ] Fill each gap with exact UI/flow changes.

#### Architecture — ContextAssemblyService vs 3-Layer System
- [ ] The 3-layer prompt composition (renderer-side) and ContentAssemblyService (main-process-side) are separate systems. Evaluate:
  - Should they be merged?
  - Should ContextAssemblyService consume the 3-layer output?
  - Should the 3-layer system be moved to the main process?
  - Should they remain separate but with defined responsibilities?
- [ ] **Do not just say "they should be merged."** Produce exact interfaces, class signatures, and code changes to merge or clarify them.

#### Configuration — opencode.json
- [ ] The `opencode.json` instructions array loads `DEFAULT_SYSTEM_PROMPT.md` into the opencode AI's context. The runtime renderer uses `DEFAULT_SYSTEM_PROMPT` from `src/lib/defaults.ts`. Evaluate:
  - Should the opencode AI see the same prompt as terminal agents?
  - If yes, produce the exact mechanism to share them.
  - If no, produce the exact deltas between the two prompts and justify why they differ.

---

## Constraints

1. **HARD INVARIANT: Do not break the existing `initializeTerminal` function signature.** It's called from NewSessionDialog, workspace restore, and resume paths. Any changes to it must be backward-compatible.
2. **HARD INVARIANT: Do not remove or rename `DEFAULT_SYSTEM_PROMPT` from `src/lib/defaults.ts`.** It may be imported by other modules. You can change its value or add an export, but the export name must stay.
3. **Backward compatibility of stored preferences:** Any changes to the `systemPrompts` preference schema must handle existing user data. If keys are renamed or moved, provide a migration path.
4. **Token efficiency:** The combined system prompt sent to agents should be optimized for token usage. If your design adds more content, explain the token cost tradeoff.
5. **No new dependencies.** Use only existing libraries (React, TypeScript, Node builtins).

---

## Output Format

Your output must be a single document with these sections:

### 1. Executive Summary
Brief (3-5 sentences) summary of findings and the most important change.

### 2. Issue Inventory
A table of every issue found, with columns: ID, Severity (HIGH/MEDIUM/LOW), Description, Location (file:line), Proposed Fix Summary.

### 3. Exact Fixes
For each issue, provide:
- **Issue ID** (matching the inventory)
- **Exact change** — code to add/remove/modify with file paths and line references
- **Exact prompt text** — if the change involves prompt content, write the exact text verbatim
- **Exact UI copy** — if the change involves UI labels or descriptions, write the exact text

### 4. Harmonized Architecture
If your design changes the architecture (e.g., merging two prompt paths, creating a single-source mechanism), describe the new architecture with:
- **File map** — which file owns which responsibility
- **Data flow diagram** — text-based flow of prompt assembly
- **Interface definitions** — exact TypeScript types/interfaces for any new abstractions
- **Migration path** — how existing user preferences are migrated

### 5. Implementation Order
Numbered list of the order in which these changes should be made, with dependencies noted. This is the build plan — each step should be independently implementable and testable.

---

**Do NOT produce:**
- Multiple options for the user to choose from
- Vagueries like "consider improving X"
- Analysis without exact fixes
- Recommendations that require further decisions

**Do produce:** Exact, implementable changes. The user should be able to hand this document to a developer and say "implement this."
