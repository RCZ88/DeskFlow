# Doc 7 — Learn / "Lyceum" Module Review (NEW in v2)

> **Scope.** The learning module you added: `services/learn/*` (curriculum, tutor, grounding, validator, SQLite migrations) and `components/learn/*` (reader, block renderer, mastery UI, tutor panel). Format is `Symptom -> Fix -> Principle`. **Headline: this is the best-architected part of the codebase. The main risks are "finish it" and "don't let it drift from the app's conventions."**

## A. What's good (this is the model to copy)

- **Clean layering.** `services/learn/` cleanly separates concerns: `db/repo.ts` + `db/migrations/001_learn.sql` (persistence), `services/{content,grounding,import,progress,tutor}.service.ts` (domain logic), `validator/validate.ts` (input integrity), `parseLessonMarkdown.ts` / `lessonInput.ts` (ingestion), `shared/learn/types.ts` (typed contract shared with the renderer). This is textbook domain modularity — exactly what Doc 1 wants `main.ts` to become.
- **Real schema with migrations.** `learn_lessons`, `learn_nodes`, `learn_node_prereqs`, `learn_sources`, `learn_chunks`, `learn_progress` — with foreign keys and `ON DELETE CASCADE`. The `learn_node_prereqs` table means the curriculum is a real **DAG**, enabling prerequisite-aware sequencing (`CurriculumGraph.tsx`).
- **Spaced repetition built in.** `learn_progress` has `level`, `belief_json`, `stability`, `last_seen`, `due_at` — an FSRS/SM-2-style memory model. That's a serious learning-science foundation, not a toggle.
- **Grounding + citations.** `learn_sources` + `learn_chunks` + `grounding.service.ts` + `CitationChip.tsx` mean tutor answers can cite retrieved source chunks. This is the right way to make an AI tutor trustworthy — and it aligns with your local-first, "don't hallucinate" north star.
- **Rich, typed block renderer.** `blocks/BlockRenderer.tsx` dispatches to Quiz/Math/Mermaid/Chart/Code/Svg/Flow/Table/Video/Layer blocks — a proper content model, not raw HTML.

## B. Findings

### L1 — Renderer reaches past the typed bridge `[P2 · LearnPage.tsx:36]`

**Symptom.** `const api = (window as any).deskflowAPI;` — the same untyped-escape-hatch pattern flagged in Doc 1 (DatabasePage). You built a beautifully typed backend and then talk to it through `any`, discarding all the safety at the last inch.

**Fix.** Export a typed `learnApi` surface from `preload.ts` (or a `shared/learn/api.ts` interface) and consume that. Every `api.foo()` call should be checked against `shared/learn/types.ts`.

**Principle.** *A type boundary is only as strong as its weakest crossing.* `(window as any)` at the entry point erases the contract you paid to build.

### L2 — Profile & highlights in localStorage `[P2 · learnerProfile.ts, highlightAnchor.ts]`

**Symptom.** `learnerProfile.ts` and `highlightAnchor.ts` persist to `localStorage`. That's fine for small, non-sensitive, single-device prefs — but localStorage isn't backed up with your DB, isn't queryable, and is wiped if the renderer storage is cleared. Learner profile (goals, level, mastery signals) is arguably part of the learning record.

**Fix.** Keep ephemeral UI state (last-scroll, panel open) in localStorage; move durable learner state (profile, highlights tied to lessons) into the `learn` SQLite DB alongside `learn_progress`. Highlights especially should live with the node they anchor to.

**Principle.** *Persist data at the tier that matches its value.* Durable, meaningful, cross-device data belongs in the real store; only throwaway view state belongs in localStorage.

### L3 — Grounding/tutor: verify the loop is closed end-to-end `[P1 · tutor.service.ts + grounding.service.ts]`

**Symptom.** The pieces exist (`learn_chunks`, `grounding.service.ts`, `TutorPanel.tsx`, `CitationChip.tsx`), but the highest-value correctness property — *the tutor only answers from retrieved chunks and every claim carries a citation* — is exactly the kind of thing that silently degrades. If the tutor can answer without grounding, you get confident hallucinations in an educational tool, which is the worst place for them.

**Fix.** Make grounding a hard contract: (1) tutor prompt includes only retrieved chunks; (2) responses must reference `source_id`s that exist for the node; (3) `validate.ts` (or a runtime guard) rejects/flags answers with no citation; (4) add a dev assertion + a couple of fixture tests ("ask X about node with no relevant chunk -> tutor says 'not covered'"). Since you run local models on a 6GB RTX 4050, also cap context to the top-k chunks to stay within VRAM.

**Principle.** *For AI features, encode the trust property as an enforced invariant, not a hope.* "It usually cites" is not a feature; "it cannot answer without a citation" is.

### L4 — God-file watch on the reader `[P2 · LearnPage.tsx 981 lines]`

**Symptom.** `LearnPage.tsx` already holds ~30 `useState`s and five views (`welcome/showcase/library/reader/import`). It's on the same trajectory as DashboardPage/App.tsx.

**Fix.** Split by view now while it's cheap: `LearnWelcome`, `LearnLibrary`, `LessonReader`, `LessonImport` as sibling components, with a small `useLearnState` hook (or reducer) for shared state. Do it before it crosses ~1,500 lines.

**Principle.** *Refactor at the knee of the curve, not after the cliff.* Splitting a 900-line component is an afternoon; splitting a 5,000-line one (see IDEProjectsPage) is a project.

### L5 — Content integrity on import `[P2 · import.service.ts, validate.ts]`

**Symptom.** Lessons import from pasted markdown / files. `content_hash` exists on `learn_nodes` (good — dedupe/change detection). Ensure `validate.ts` runs on *every* import path (paste, file, example) and that malformed blocks fail loudly with the `ValidationReport` you already built, rather than persisting half-parsed nodes.

**Fix.** Single choke-point: all ingestion goes through `parseLessonMarkdown -> validate -> repo.insert`, and the repo refuses to write nodes that didn't pass validation. Store the validation result so the library can show "needs fixing" lessons.

**Principle.** *Validate once, at the single point of entry, and make invalid states unrepresentable downstream.*

## C. Product note (why this matters for DeskFlow)

Learn is a different *kind* of feature from the rest of DeskFlow (which is passive tracking). It's the one place the app actively *produces value* rather than *measuring* it. That's strategically strong — but it also means it should surface on the Dashboard (Doc 8): "you have N lessons due for review today" ties the memory model back into the daily loop and gives the tracker a reason-to-return beyond self-surveillance.

## D. This doc's mini-backlog

1. `[P1]` Close the tutor grounding loop as an enforced invariant + fixtures (L3).
2. `[P2]` Typed `learnApi`; drop `(window as any)` (L1).
3. `[P2]` Move durable learner profile + highlights into the learn DB (L2).
4. `[P2]` Split `LearnPage.tsx` by view + `useLearnState` (L4).
5. `[P2]` Single validated ingestion choke-point (L5).
6. `[P2]` Surface "lessons due today" on the Dashboard (Doc 8).
