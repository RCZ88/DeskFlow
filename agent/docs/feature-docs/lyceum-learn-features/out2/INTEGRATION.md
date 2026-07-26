# Integration guide — North Star features for Lyceum Learn

This bundle adds, as real TypeScript/React, the features from **Clement — North Star:
The Unified Path**: the prompt system (persona / teaching style / per-topic prompts /
guardrails), the 13-part curriculum with checklists, a table of contents, an
assessment card, and persistent text highlighting. It mirrors your existing repo
layout (`src.zip`), so files drop into the same paths.

## Files

```
src/services/learn/curriculum.ts          # 13 parts as data (showcase + checklists + scope)
src/services/learn/topicPrompts.ts        # per-topic authoring prompts (Record<part, string>)
src/services/learn/promptLibrary.ts       # composes persona+style+format+subject+guardrails
src/services/learn/highlightAnchor.ts     # durable text-quote anchoring (no DOM positions)
src/components/learn/TableOfContents.tsx  # reader outline + scroll-spy + mastery rings
src/components/learn/CurriculumShowcase.tsx  # the "shelf of books" landing surface
src/components/learn/ChecklistProgress.tsx   # checkable "things to learn" + progress ring
src/components/learn/AssessmentCard.tsx   # renders + parses the L0–L5 assessment block
src/components/learn/useHighlights.ts     # persistent, re-render-safe highlights hook
src/components/learn/SelectionActions.tsx # floating pill: tutor modes + highlight colors
src/styles/lyceum-learn-features.css      # all feature styling (warm editorial tokens)
resources/learn/prompts/coach-persona.md  # WHO: learner profile + objective assessor
resources/learn/prompts/master-prompt.md  # STYLE: depth-to-mastery, visual-first pedagogy
resources/learn/prompts/guardrails.md     # anti-goals + tutor scope + AI-safety rules
```

No new dependencies. Components reuse your existing primitives (`MasteryRing`, `cn`)
and types (`shared/learn/types`).

## 1. Wire the prompt library into the main process

In `src/services/learn/index.ts`, `buildPrompt` currently loads `author-guide.md` as
the system prompt. Replace that with the composed prompt so persona + teaching style +
guardrails always apply, and prepend the per-topic brief when a `part` is given:

```ts
import { existsSync, readFileSync } from 'node:fs';
import {
  loadPromptLibrary,
  composeAuthorSystemPrompt,
  composeTopicUserPrompt,
} from './promptLibrary';

function readResource(rel: string): string | null {
  const fp = resourcePath(rel); // your existing resolver
  return existsSync(fp) ? readFileSync(fp, 'utf-8') : null;
}

// inside buildPrompt(params):
const lib = loadPromptLibrary(readResource);
const systemPrompt = composeAuthorSystemPrompt(lib, { part: params.part });
const userPrompt =
  params.part != null
    ? `${composeTopicUserPrompt(params.part)}\n\n${existingUserPrompt}`
    : existingUserPrompt;
return { systemPrompt, userPrompt };
```

`generateLdoc` already calls `callAi(prompt, systemPrompt, ...)` then `toLdoc(...).doc`
(from the previous bundle) → `validateFull` → `importer.importLdoc`. No change needed
there; it now simply gets a much stronger system prompt.

The same `loadPromptLibrary` + `composeTutorPersona(lib)` can be prepended to
`TUTOR_SYSTEM_PROMPT` in `tutor.service.ts` so the tutor shares the voice and the
assessment format.

## 2. Mount the curriculum showcase as the empty/landing state

In `LearnPage.tsx`, when there is no selected lesson (the previously blank page),
render the showcase instead:

```tsx
import { CurriculumShowcase } from './CurriculumShowcase';
import '../../styles/lyceum-learn-features.css';

<CurriculumShowcase
  lessonsByPart={lessonsByPart}        // group your listLessons() result by lesson.part
  checklistByPart={checklistByPart}    // persisted; see below
  onGenerate={(part) => openCreateDialog({ part: part.part })} // -> generateLdoc
  onOpenLesson={(id) => selectLesson(id)}
  onToggleChecklist={(part, i) => toggleChecklist(part, i)}
/>
```

`onGenerate` should call the existing create/generate flow with the part number; the
prompt library turns that part into the full authoring prompt automatically.

## 3. Add the table of contents to the reader

```tsx
import { TableOfContents } from './TableOfContents';

<TableOfContents
  nodes={lesson.nodes}
  getSectionEl={(id) => sectionRefs.current[id] ?? null} // refs you already keep per node
  onSelect={(id) => onSelectNode(id)}                    // your existing handler
/>
```

Give each rendered node section `ref={el => (sectionRefs.current[node.id] = el)}` so the
scroll-spy can track the active node.

## 4. Selection + highlighting in the reader

Wrap the node content in a ref'd container and mount both the hook and the pill:

```tsx
import { useRef } from 'react';
import { useHighlights } from './useHighlights';
import { SelectionActions } from './SelectionActions';

const contentRef = useRef<HTMLDivElement>(null);
const { addFromRange } = useHighlights(currentNode.id, contentRef);

<div ref={contentRef} className="lyceum-reader-content">
  {/* existing node blocks */}
</div>

<SelectionActions
  rootRef={contentRef}
  onAsk={(text, mode) => askTutor(currentNode.id, text, mode)} // routes to tutor.service ask()
  onHighlight={(range, color) => addFromRange(range, color)}
  onSaveNote={(text, range) => addFromRange(range, 'amber', text)}
/>
```

This **replaces `SelectionFloatingPill`** (it is a superset: same four tutor modes plus
highlight colors + save-to-notes). The hook re-paints highlights after every render,
so they survive streaming answers, revealed `layer` blocks, and reloads.

## 5. Assessment card

After `askTutor`/`submitQuiz` returns, the tutor's answer ends with the assessment
block. Parse + render it, and the parsed object also feeds `recordEvidence`:

```tsx
import { AssessmentCard, parseAssessmentBlock } from './AssessmentCard';

const parsed = parseAssessmentBlock(answer.answer_md);
{parsed && <AssessmentCard assessment={parsed} target={currentNode.mastery_target} assessedAt={Date.now()} />}
```

## 6. Persisting checklist + highlight state

Both default to `localStorage` (zero backend work). To move them into your SQLite
store, keep the same shapes:
- checklist: `{ part: number, index: number, done: boolean }`
- highlight: `StoredHighlight { id, color, anchor, note?, createdAt }` (see `useHighlights.ts`)
and swap the `load`/`save` helpers for IPC calls. The anchor is plain JSON, so it
serializes directly.

See `RESULT.md` for the design rationale — especially how selection and highlighting
actually work, and how to configure pages and highlights to be maximally effective.
