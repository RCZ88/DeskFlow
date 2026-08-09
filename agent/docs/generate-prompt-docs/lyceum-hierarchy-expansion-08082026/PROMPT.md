# PROMPT.md — Lyceum Learn: Hierarchy & Naming Expansion (Branches of Study)

> **Target AI:** Lead Designer and Engineer (Architect)
> **Input to read FIRST:** `CONTEXT_BUNDLE.md` (same folder) — it is your ONLY view of the codebase. It contains real source, real schemas, real IPC. Design against that, not against assumptions.
> **Output:** one comprehensive RESULT.md — no options, no "choose A/B/C". One best design, fully specified.

---

## Raw Request (user's words, as captured this session)

> "Use the generate-prompt skill to find the **best hierarchy and names** for the Learn library.
>
> Right now we have **Part** (0-10) as a predefined topic axis, then **Groups** (customizable names) below it, then lessons. But a **group should sit HIGHER than a topic** — one group can contain many topics. Group names are user-customizable, so the group is the top container the user controls.
>
> The library page — the page where we show the books — should show the **name of the TOPIC**, not just a number.
>
> We should also expand past computer skills into **branches of study** — other disciplines entirely.
>
> And for the example of learning-agent books: there are a lot of prerequisite topics, and inside each topic there are more subtopics, and each subtopic has its own list of topics to learn."

Plus this session's prior context (opencode summary): the user explicitly asked to use the generate-prompt skill to design this, wants the hierarchy + naming decided by you (the Architect), and wants the naming to resolve the long-standing confusion between Part/Group/Topic/Chapter/Node (MEMORY: "Part should be renamed to Topic in UI display… Chapter should be renamed to Group… The hierarchy confusion: Part=Topic (predefined area), Chapter=Group (user-created), Node=sub-chapter (inside lesson), L-level=mastery axis (separate from hierarchy)").

---

## Problem Statement

The Learn module's hierarchy is currently `Part (predefined, numbered 0-10) → Chapter (user-created) → Lesson (.ldoc) → Node (section)`, plus a separate mastery axis (L0-L5). This has three concrete problems:

1. **Inverted priority:** the user's own container (group) is nested UNDER the predefined axis (part), but the user wants groups to be the top-level container they curate, with topics inside them.
2. **The library hides topic names:** the cover-grid view header renders `Topic 02` with NO title (LessonLibrary.tsx ~line 217), while the spine view shows the full title (`Topic 02 — Databases, Deep`, line ~171). The books page should always show the real topic name.
3. **No room for other disciplines:** the curriculum blueprint is 100% CS/AI-engineering. The design must introduce a top-level **branch of study** concept so the library can hold e.g. Language Learning, Music, Math, etc., each with its own curriculum.

The design must also resolve naming once and for all (Part/Chapter/Group/Topic/Node confusion) and handle **nested prerequisite subtopics** (topic → subtopic → its own list of topics → lessons).

---

## The Mandate

Design the complete technical + visual specification for the **new Learn hierarchy**: naming, data model, DB migration, IPC, and the library UI. You are the Lead Designer and Engineer — own it from schema to pixels.

Specifically:

### 1. Hierarchy & Naming Design (decision required)
- Propose the final hierarchy, e.g. candidate shape `Branch of Study → Group (user-curated) → Topic → Subtopic? → Lesson → Node`, and justify it.
- Give EVERY level a definitive name (resolve Part/Topic/Chapter/Group/Node permanently; keep `part` as the internal DB field name only if you keep it — otherwise specify the migration).
- Decide where the **mastery axis (L0-L5)** sits relative to the new tree (today it's per-part; with groups above topics, does mastery attach to Topic, Subtopic, or both?).
- Specify how **branches of study** coexist with the existing AI-engineering blueprint (is the current CURRICULUM_BLUEPRINT one branch? do branches get emoji/color identity like parts have?).

### 2. Data Model & Migration (exact SQL + types)
- New/changed columns or tables (e.g. `learn_branches`, `learn_groups`, or widening `part`/adding `branch`/`subtopic` to `learn_lessons`).
- ⚠️ The existing `CHECK(part BETWEEN 0 AND 10)` blocks parts 11-12 already defined in the blueprint — your migration must fix this (SQLite table-recreate pattern, following the repo's PRAGMA user_version migration mechanism).
- Exact `CREATE TABLE` / `ALTER` statements, matching the repo's migration style (001_learn.sql shows the format).
- Updated TypeScript interfaces (LdocLesson, LessonSummary, LearnerProfile) with every field.
- Where user-created groups live: currently localStorage `customChapters: string[]` (LearnerProfile) + a `chapter` string column. Decide: keep localStorage, or promote groups to a DB table so topics can be assigned to groups durably? Specify the sync story (localStorage list vs DB rows vs both) and the migration for existing lessons' `chapter` values.

### 3. Backend / IPC (real, not stubs)
- Specify exactly which existing handlers change (`learn:listLessons`, `learn:listChapters`, `learn:updateLessonMeta`) and which NEW channels are needed (e.g. `learn:listBranches`, `learn:saveGroup`, `learn:assignLessonToGroup`).
- Follow the repo's conventions verbatim: `ipcMain.handle('learn:xxx', ...)` in `src/services/learn/index.ts`, returning `{ ok: true, data } | { ok: false, error }`; bridge method in `src/preload.ts` (`learnXxx: (args) => ipcRenderer.invoke('learn:xxx', args)`); renderer calls `api.learnXxx()`.
- Remember: `learn:updateLessonMeta` already updates `doc_json.lesson` fields — new fields (branch/group/subtopic) must stay in sync in doc_json too.

### 4. Library UI (the "books" page) — high-fidelity visual spec
- Rework `LessonLibrary.tsx` so shelves are grouped by the NEW hierarchy (group → topic), and **every shelf header shows the real topic title** (fix the cover-view bug where only `Topic 02` renders without the title).
- Show the branch of study as a top-level navigation (tabs? folder tree? shelf row?). The Magic UI `file-tree` component (Tree/Folder/File) exists in the registry as a candidate — use it or justify a better pattern.
- Cover grid AND spine view both need the new grouping + titles.
- Empty/loading states for: no lessons, empty branch, group with no topics.
- Keep the book/shelf aesthetic (BookCard, BookSpine, `lyceum-shelf-rail`, serif titles, clay accent) — this is the module's identity.
- Specify exact JSX structure, Tailwind classes, colors (clay/sage/amber tokens), typography (`font-mono text-[11px] uppercase tracking-[0.28em]` for section headers, `font-serif` for titles), and spacing.

### 5. HierarchyGuide & naming sweep
- Update `HierarchyGuide.tsx` (used in LearnHome + OnboardingPanel step 1) to the new tree — it MUST stay a visual tree with connecting lines (never regress to a text list).
- Sweep every UI surface that shows the old names: LessonLibrary headers, LessonDetailModal (`Topic NN` badge), LearnerSetup Q8 chips (`Part N` fallback → topic titles), ChapterGroupsModal ("Manage Chapter Groups" → new naming), CreateLessonDialog (chapter selector → group selector), MasteryStrip/ProgressDashboard labels.
- List every file + line that must change, with the exact old string → new string.

### 6. Prerequisite subtopics (the nested case)
- The user's example: learning-agent books have many prerequisite topics; each topic has subtopics; each subtopic has its own list of topics. Specify how the model + UI represent this nesting (does a Subtopic contain lessons? does a Topic's checklist become subtopics? does this use the existing `learn_node_prereqs` graph or a new parent_id column?). Make it concrete enough to implement, and honest about which parts are new schema vs. existing graph data.

---

## Requirements Checklist

- [ ] ONE final hierarchy with definitive names for every level; the Part/Group/Topic/Chapter/Node confusion resolved and documented.
- [ ] Group is ABOVE Topic (user-curated top container), proven in the data model, not just in UI copy.
- [ ] Branches of study exist as the top level; existing CS blueprint folds in as one branch (or maps cleanly).
- [ ] Library shows the real topic NAME everywhere (cover + spine), not bare numbers.
- [ ] Exact migration SQL (including the CHECK-constraint fix), exact type diffs, exact IPC list (changed + new) with payload shapes, all matching repo conventions.
- [ ] Full JSX + Tailwind visual spec for the library regrouping + branch navigation + all 4 states (empty/loading/error/populated).
- [ ] File-by-file rename/update sweep (old → new) for every UI surface using old names.
- [ ] Subtopic nesting design (schema + UI) for the "learning-agent books" example.
- [ ] Backend audit table: every feature → IPC channel → handler exists? → service → DB schema → ✅/gap (mirror CONTEXT_BUNDLE §11).

## Constraints (hard)

1. Design must build on the EXISTING structure in CONTEXT_BUNDLE.md — don't invent a parallel system. Where you'd change a shape (e.g. rename `part` column), specify the migration.
2. `part`/`chapter` names may be kept as DB columns for migration safety — but UI display names change. If you rename columns, provide the exact ALTER.
3. All IPC returns `{ ok, data } | { ok, error }`. All localStorage wrapped in try/catch.
4. Dark-mode only. Max `rounded-xl`. Glass: `bg-zinc-900/80 backdrop-blur-xl`. Fonts: serif for titles, mono for labels, Inter for body.
5. HierarchyGuide stays a visual tree — never a plain list.
6. The build chain must keep working: renderer vite build + preload esbuild + main rebuild + per-file learn service compile (see CONTEXT_BUNDLE §12).

## Output Format

Return `RESULT.md` (markdown, this exact section order):

1. **Hierarchy & Naming** — the decision + rationale + a small tree diagram.
2. **Data Model & Migration** — exact SQL + full type diffs.
3. **IPC Changes** — table + payloads + handler sketches.
4. **Library UI Spec** — JSX structure, tokens, all states, branch navigation.
5. **Naming Sweep** — file-by-file old → new table.
6. **Subtopic Nesting** — design + schema + UI.
7. **Backend Audit Table** — feature → IPC → handler → service → schema → status.
8. **Implementation Order** — phased steps with build gates.
