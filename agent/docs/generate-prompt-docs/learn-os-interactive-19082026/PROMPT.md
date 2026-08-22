# PROMPT.md — Lyceum Learn OS Interactive Round (19082026)

> **Generated:** 2026-08-19 | **Skill:** generate-prompt v2.0.0 | **Target AI:** Architect (Lead Designer AND Engineer)
> **Context bundle:** `CONTEXT_BUNDLE.md` (same folder — read it fully, it is self-contained: system map, IPC inventory, DB schema, verbatim code, design tokens, invariants)
> **Hands & Eyes agent (opencode):** will apply your RESULT.md, build, and verify in the running app.
> **Deliverable: `RESULT.md` — a complete implementation spec. Write code where you can, exact diffs/locations always. Every directive implemented — NOTHING skipped as "too minor".**

---

## 1. RAW REQUEST (verbatim from the user — do not paraphrase)

> why is it that theres no feautre to edi the links added on the generation of the lesson.
> also i think we can learn more from like other tools and ai miage generateion visualization for like websites and tools that can generate visualziations or illustrations animations or image or anykind of form that is not requiring ai image generation.
> also, we need a full expanded mode on the profile openeron the siede thing so that we have more space to input the stuff, and like make sure the speech to text is there and evertything.
> and for like the context systme where it connects to the main central brain of thapp.
> @agent/skills/generate-prompt\ for the improvement of the leanring os that its more interactive and more engaging like the learning mode in like qwen ai and gemini.
> it should be in like research mode on like what features to add and like maybe some prerequisites shwoing those, and hwo each topic can unlock the others.
> and how like the ai is able to ask for more clarifications and details of the user from the promtp so htat its able to more accurately generate the lesson. meaning htat we adjust the prompt so tha tthe ai can do so.
> and other improvements neccesary.

## 2. PROBLEM STATEMENT

The Lyceum Learn OS generates rich lessons, but the loop around generation is not interactive or
engaging enough (user benchmark: Qwen AI / Gemini learning modes), and several seams are missing:

- **A. Grounding links are not editable.** Lessons generate `source: id | Title | url` grounding
  lines stored in `learn_nodes.grounding_json` + `learn_sources` rows, but there is NO UI to
  add/remove/edit them after generation — only raw JSON editing in LessonDetailModal's Edit tab.
- **B. No non-AI visualization/asset pipeline.** Beyond AI image generation, there is no way to
  pull in visualizations, illustrations, animations, diagrams, or images from real websites and
  tools (mermaid exists as a block, but no discovery/picker/curated catalog of non-AI visual
  asset sources).
- **C. Profile opener is cramped.** The LearnerProfilePanel expands only to `max-w-2xl`; users
  want a FULL expanded mode with generous input space, and speech-to-text (VoiceInputWrapper) on
  the text inputs.
- **D. Learn ↔ Context Brain is one-directional.** `writeLearnEpisode` feeds mastery into the
  Context Brain (done), but lesson generation NEVER reads the Brain back
  (`contextBrain.retrieve()` is not called in `learn:buildPrompt` / `learn:generateLdoc`).
- **E. Generation is a blind shot.** The AI receives a prompt and produces a lesson with zero
  clarifying questions — no prerequisites/unlock map exists at curriculum level
  (`prereqSlugs` declared but never populated), and the prompt library never instructs the AI to
  ask for clarifications first.
- **F. Research mandate.** User explicitly asked for "research mode" — investigate what features
  make learning modes interactive/engaging in Qwen AI & Gemini (clarifying questions, research
  mode, unlock graphs, progress storytelling, spaced repetition visuals, etc.) and propose the
  best additions for THIS system.

## 3. MANDATE — Lead Designer AND Engineer → RESULT.md

You are BOTH the Lead Designer (taste, hierarchy, motion, copy, states) AND the Engineer (full
stack: renderer components + IPC + main-process handlers + DB). Produce ONE `RESULT.md` that
covers every task below with exact file paths, exact code (or precise diffs), and design rules.
No task may be marked "out of scope" or "minor" — the zero-omission rule applies.

## 4. TASKS

### Engineering A — Editable grounding links/sources
- New IPC `learn:updateSources` (`{ nodeId, sources: [{id, url, title, kind?, license?, retrieved?}] }`)
  → replaces `learn_sources` rows for that node AND rewrites `learn_nodes.grounding_json` to match
  (single transaction, repo.ts helpers). Keep `learn_chunks.source_id` intact (do not cascade).
- New renderer UI in ReaderView: per-node "Sources" affordance (opens a sources panel/dialog)
  listing current sources with edit/delete, add-source form (id | Title | url + optional
  kind/license), reorder. Empty state copy. Persist via the new IPC. Must also surface from
  LessonDetailModal (Edit tab) so nodes can be fixed after generation.
- Validation: source URLs must be http(s); ids must match `^[a-z0-9-]{1,32}$`; duplicate ids
  rejected per node.
- Update `learn:validate` report to flag grounding sources with missing titles.

### Engineering B — Non-AI visualization & asset sources
- Design a **"Visual Assets" (non-AI) pipeline**: a curated catalog of real, working
  sources that produce visualizations / illustrations / animations / images WITHOUT AI image
  generation, surfaced as a picker in the authoring flow (CreateLessonDialog advanced mode +
  ReaderView node insertion):
  - Categories: **Diagrams** (Mermaid — already native), **Charts** (vega-lite chart block — already
    native; add chart-type quick presets), **Code-driven visuals** (SVG block, flow block, code
    block with live preview), **Embeddable widgets** (widget block HTML/iframe), **Stock imagery**
    (Unsplash-sourced images with auto-attribution — `unsplash` MCP), **Illustration/animation
    libs** (reactbits, Magic UI components as SVG/CSS animation snippets), **Timelines/maps/
    concept maps** (viz_timeline / viz_graph / viz_concept_map blocks — already native; add
    templates).
  - The picker must show: source name, type, one-line description, sample usage snippet, and
    "Insert" which generates the correct .lmd block snippet into the prompt/doc.
  - ALSO: a prompt-library instruction so the AI author PREFERS these non-AI visual block types
    over AI image generation when a visual can be expressed structurally (mermaid > image etc.).
- Catalog lives in a single new TS module (e.g. `src/services/learn/visualCatalog.ts` for the
  backend copy used in prompts + a renderer copy for the picker — or one shared module; choose
  the least duplicated option and state it).

### Engineering C — Full expanded profile mode + speech-to-text
- `LearnerProfilePanel`: replace the `max-w-2xl` ceiling with a true FULL expanded mode
  (near full-screen, `w-full max-w-none`, maybe `max-w-5xl`/`max-w-6xl` with better grid layout —
  you decide the geometry; must feel deliberate, not stretched). Retain the compact w-80 state.
  Smooth AnimatePresence transition between states. Expanded mode shows the SAME sections in a
  2-column responsive grid.
- Wrap ALL text inputs/textareas in the panel (knowledge base statement, keywords, linked
  lessons, setup answers if reachable) with `VoiceInputWrapper` (src/components/VoiceInputWrapper.tsx,
  STT: cloud API → Windows native fallback). Never break the cloneElement contract.
- Expand/collapse toggle icon states (Maximize2/Minimize2), accessible labels.

### Engineering D — Learn ↔ Context Brain bidirectional
- In `learn:buildPrompt` AND `learn:generateLdoc`: call `contextBrain.retrieve(query, ['keyword','graph'])`
  where query = topic title + userInput + profile knowledge statements, and inject the top
  results as a `## Learner Context (from Context Brain)` block in the system prompt (non-fatal
  try/catch; budget-capped like the assemble-context pattern; skip silently when brain tables
  empty). Guard: brain may not be initialized (check `getBrainStats` / try/catch).
- Keep the existing write-side bridge (writeLearnEpisode) intact.
- Optional stretch (include if cheap): after `learn:importLdoc` success, log one episode
  `lesson_imported` per lesson via `logEpisode('learn', ...)`.

### Engineering E — Interactive generation: clarifying questions + prerequisites/unlock map
- **Clarifying questions (prompt adjustments):** extend `promptLibrary.ts`:
  - New recipe/system-prompt rule (in `composeAuthorSystemPrompt` or a new section):
    *"Before authoring, if the learner's request is underspecified (unclear audience, missing
    depth, ambiguous scope, no stated goal), ASK 1-3 short clarifying questions FIRST instead of
    generating. If you can reasonably infer from the profile/context, generate and state your
    assumptions explicitly."*
  - `learn:buildPrompt` handler: when `userInput` path is used, add a two-phase instruction so
    the AI output may return a short Q&A round (JSON or plain list) that the dialog can show;
    CreateLessonDialog gains a lightweight "Clarifying questions" display step: if the AI asked,
    show questions with an answer input, then regenerate with answers appended
    (`learn:buildPrompt` accepts `answers` and injects them). Keep it simple and robust — if
    questions are absent, the existing paste/import flow is unchanged.
- **Prerequisites / unlock map (curriculum level):**
  - Populate `prereqSlugs` for the 13 topics in `curriculum.ts` (a sensible cs-ai DAG respecting
    phases: foundations → core → mastery; parts 1→2→3→4, 0→5→7, etc. — you design the DAG,
    document it).
  - `getTopicsByBranch` / a new `learn:getCurriculumGraph` returns topics + prereq edges +
    per-topic learner progress; renderer gets a new **Topic Unlock Map** view (LearnHome or
    library): topics as cards/nodes, edges showing "unlocks", locked topics show required
    prerequisites (e.g. "Locked — master <Part 1> to unlock"), unlocked-but-unmastered topics
    show progress. Reuse the CurriculumGraph visual language (LEVEL_COLORS, layered layout).
    Re-skin: shadcn/Magic UI available, dark theme only.

### Research F — "Research mode" on what features to add (interactive/engaging like Qwen AI & Gemini)
- In RESULT.md include a RESEARCH section: analyze Qwen AI / Gemini learning-mode patterns
  (clarifying questions, research/deep-dive mode, unlock progression, progress storytelling,
  spaced repetition, gamified streaks, "teach me" conversations) and map each to a concrete
  recommendation for THIS system (adopt / adapt / reject with reason).
- From that, propose up to 5 high-value ADDITIONAL improvements (must fit the Learn OS, no new
  heavy deps). For each: what, where, effort (S/M/L), value. Then implement the ones you judge
  as clear wins within this round's scope (e.g. learner-facing progress storytelling on the
  unlock map, "research this topic" deep-dive prompt recipe, celebration states on mastery
  events). Explicitly list any deferred with justification.

### UX/Design tasks (applies to ALL UI in A-E)
- Cover all 4 states (empty / loading / error / populated) for every new view.
- Empty states with human copy + suggested next action. Loading = skeletons (shadcn) or pulse.
- Error states with retry. Animated transitions (framer-motion / Magic UI), respect
  `prefers-reduced-motion`. Hover/focus/disabled states everywhere.
- Copy: human, warm, specific — never "Loading..." / "Error occurred".
- Console stamp at component entry: `console.log('%c[ComponentName] vX.Y loaded', 'color: #fbbf24; font-weight: bold')` + state log.

## 5. CONSTRAINTS

- **No new npm dependencies.** Everything must use existing packages (react, framer-motion,
  better-sqlite3, vega-lite, mermaid, lightweight-charts, canvas-confetti, lucide-react, shadcn
  ui primitives, vendored Magic UI components).
- Dark theme ONLY (the Learn page and the whole app are dark; light-mode work is a separate
  tracked effort — do not add light-mode logic).
- Learn service files compile PER-FILE to `dist-electron/services/learn/*.js` (NO bundle).
  `scripts/rebuild-main.mjs` does NOT rebuild them — RESULT.md must include the exact per-file
  esbuild recompile commands for every touched `src/services/learn/**` file
  (`npx esbuild "<src>" --outfile="<dist>" --format=cjs --platform=node --target=node22`).
- Renderer changes require `npx vite build`; main-process changes require
  `node scripts/rebuild-main.mjs`; preload changes require the esbuild preload command.
- CRLF: `src/main.ts`; LF: `src/services/learn/**` and `src/main/ai/**`.
- localStorage access wrapped in try/catch. Prefer renderer-side fixes; read the FULL IPC
  handler before editing it.
- All new IPC channels need preload bridges + `src/types/deskflow-api.d.ts` types.
- Do NOT touch: `learn:importLdoc` validation flow semantics, tutor citation-enforcement rule,
  `node_edit` permission gate, the `.lmd` format.
- Extend the provider-chain feature union in `src/services/providers/router.ts:34` ONLY if you
  add a new AI feature; otherwise reuse 'lyceum'.

## 6. MCP INVENTORY + SKILLS (use these — do not invent UI from scratch)

| Need | Source |
|---|---|
| Standard UI (dialog, tabs, input, textarea, select, switch, badge, skeleton, tooltip, accordion) | shadcn |
| Animated effects (beams, particles, number ticker, magic card, blur fade, shimmer) | Magic UI |
| Icons | lucide-react (search names, never guess) |
| Animated React components (text/particle/hover effects) | reactbits |
| Stock imagery w/ attribution (if used) | Unsplash |

Load order for design: `frontend-external-infra` → `frontend-design` → `impeccable` →
`humancentred-UIUX` (6 pillars: declare scope, 4 states, hierarchy, feedback, motion,
human copy). Anti-slop checklist: type (Inter/Geist), geometry (rounded-xl max), tokens
(--bg-*/--accent-*/--page-accent), no default-font/gradient-cliché hero, labeled sections,
motion with purpose, real empty states, lucide icons, accessibility.

## 7. RESULT.md OUTPUT FORMAT

1. **Title + summary** (one paragraph).
2. **RESEARCH section** (task F).
3. **Per-task spec sections A-F**: exact files to create/edit (path), full code for new files,
   precise diffs for edits, new IPC + preload + type signatures, DB changes (if any) with
   migration guard pattern, design rules for each UI.
4. **Build/verification commands** (exact per-file esbuild list + vite + rebuild-main).
5. **Console stamps** list (component + version).
6. **Known risks / invariants preserved**.
7. **Deferred items** with justification.

Keep it complete — the Hands & Eyes agent will implement from it directly with NO access to you.