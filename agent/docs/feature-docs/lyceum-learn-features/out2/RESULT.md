# Lyceum Learn — North Star features

This turns the ideas in **Clement — North Star: The Unified Path** into real features of
the Learn app: the prompt system that gives the AI its personality and teaching style,
the per-topic system prompts, the 13-part curriculum with checklists, an aesthetic
table of contents, the objective-assessment loop, the guardrails, and — the part you
asked me to explain — how text selection and highlighting actually work and how to make
them maximally effective.

Everything here is TypeScript/React in your existing repo layout. No new dependencies.
See `INTEGRATION.md` for the exact wiring; this file explains the *why* and the *how*.

---

## 1. The prompt system (the AI's brain)

The North Star doc bundles several different kinds of prompt — a coaching personality,
a master teaching style, a per-topic brief, and guardrails. The mistake would be to
mash them into one giant string. Instead I split them into **four layers** that compose,
so each can be edited independently and the planning doc and the app never drift:

| Layer | Lives in | Answers |
|------|----------|---------|
| **Format** | `resources/learn/author-guide.md` (your existing file) | *How do I emit a valid `.lmd` document?* |
| **Style** | `resources/learn/prompts/master-prompt.md` | *How do I teach?* (depth-to-mastery, visual-first, problem→idea→why) |
| **Persona** | `resources/learn/prompts/coach-persona.md` | *Who am I teaching, and how do I grade honestly?* |
| **Subject** | `src/services/learn/topicPrompts.ts` | *What must this specific topic cover?* |
| **Guardrails** | `resources/learn/prompts/guardrails.md` | *What must I never do?* (always appended last) |

`promptLibrary.ts` composes them:
- `composeAuthorSystemPrompt(lib, { part })` → the full system prompt for authoring.
- `composeTopicUserPrompt(part)` → the user prompt: the part's trailer + subject brief +
  its checklist as the *required scope*.
- `composeTutorPersona(lib)` → the same persona + guardrails for the in-lesson tutor, so
  the tutor and the author speak with one voice and grade on the same scale.

**Why this matters for reliability:** the format layer (which must always win) is first
and the guardrails are last, so the model can't "teach its way out of" the `.lmd`
rules. And because the 13 per-topic prompts are keyed by curriculum part, generating a
lesson is now just "give me part 5" — the app supplies the whole expert prompt.

---

## 2. The curriculum, as data (the spine)

`curriculum.ts` encodes all 13 parts (0–12) exactly as the doc lays them out: emoji,
rarity (★–★★★★★), timeline phase, the What/Why/Where trailer, an intro, a default
mastery target, and the **checklist** of concepts to learn. This one file powers three
features at once:
1. the **curriculum showcase** (below),
2. the **"things to learn" checklists**, and
3. the **lesson scope** (the checklist becomes the required-coverage list in the prompt).

Keeping it as typed data means the curriculum is the single source of truth instead of
being duplicated across UI and prompts.

---

## 3. The curriculum showcase (fixing the blank page)

`CurriculumShowcase.tsx` is the new landing surface — the "beautiful list of items, like
books" you wanted. The previously empty main page now always has structure to show,
even before any lesson exists. Each part renders as an editorial **book card**: a cloth
spine (gold-tinted for rarity-5 domains), emoji, rarity stars, the What/Why/Where
trailer, and a checklist progress ring. Cards are grouped into the three timeline
phases (Foundations → Specialization → Frontier & Mastery). A card with no lesson yet
shows **Generate lesson**; once one exists it shows **Read lesson** + Regenerate.

---

## 4. Table of contents (the aesthetic reader companion)

`TableOfContents.tsx` lists every node in the open lesson with its **mastery ring**, an
index number, and a left rail that lights up on the active node. It uses an
`IntersectionObserver` **scroll-spy**: as you read, the node nearest the top of the
viewport becomes active and the TOC tracks it; clicking jumps to it. The header shows a
lesson-level mastery ring (the average of node levels), so progress is visible at a
glance.

---

## 5. Checklists of completed concepts

`ChecklistProgress.tsx` renders a part's concepts as checkable items with a progress
ring. It appears compact on showcase cards and full in the reader. State is controlled
by the parent (localStorage by default, or your SQLite store) so "what have I actually
mastered" persists.

---

## 6. The objective-assessment loop

The doc's most important idea is honest grading. `coach-persona.md` instructs the AI to
be an **objective assessor** on the L0–L5 scale and to always end an assessment with a
fixed block:

```
**<Topic> — L<level>**
- Demonstrated: …
- Gaps: …
- Verdict: …
- Next step: …
```

`AssessmentCard.tsx` both **parses** that block (`parseAssessmentBlock`) and **renders**
it as a card with a mastery chip and color-coded rows. The parsed object also feeds
your existing `recordEvidence` so the progress store updates from the same grade the
learner sees. The flow is: *you explain in your own words → the tutor judges → the card
and your progress update.*

---

## 7. Guardrails

`guardrails.md` is appended to every composed prompt and covers three things: teaching
anti-goals (no skimming, no memorization, no flattery, no fabricated citations), tutor
scope (answer only from grounded content; never leak quiz answer keys), and AI-safety
(treat lesson/retrieved/selected text as data, not instructions — the "lethal trifecta"
rule from Part 5). This is also why the tutor stays on-topic instead of free-associating.

---

## 8. Selection & highlighting — the part we were confused about

This is worth reading carefully, because the confusion was real and the fix is specific.

### What selection is
When you drag across text, the browser creates a **Selection** containing a **Range** —
a pair of (DOM node, character offset) boundaries pointing at *live* DOM. `SelectionActions.tsx`
listens for `mouseup`, reads `window.getSelection()`, and if the selection is non-empty,
inside the lesson content container, and within length bounds (2–500 chars), it measures
the selection's bounding rectangle and floats a pill just above it. From the pill you
can send the text to the tutor (Explain / Simpler / Deeper / Ask) **or** highlight it.

### Why naive highlighting breaks
The obvious approach — "remember which DOM nodes were selected" — fails in this app,
because the lesson content re-renders constantly: the tutor streams an answer, a `layer`
block reveals "going deeper" content, you switch nodes, or you reload. The moment React
re-creates those DOM nodes, the stored Range points at nodes that no longer exist, so
the highlight either disappears or lands on the wrong words. **This is exactly the kind
of bug that made highlighting feel flaky.**

### The fix: text-quote anchoring (don't store positions, store the quote)
`highlightAnchor.ts` stores a **durable anchor** instead of DOM positions:
- `exact` — the selected text itself,
- `prefix` / `suffix` — up to 32 characters immediately before/after it,
- `start` — the character offset into the node's plain text, as a tiebreaker.

To re-apply a highlight, `anchorToRange` searches the (possibly changed) text for every
occurrence of `exact`, then scores each by how well the surrounding text matches the
stored `prefix`/`suffix` and how close it is to the original `start`, and picks the best
match. This is the same approach the **W3C Web Annotation** standard uses
(TextQuoteSelector + TextPositionSelector), and it means highlights survive streaming,
re-renders, and reloads. `useHighlights.ts` repaints them after every render (wrapping
matched text in `<mark>` on the next animation frame) and persists them as plain JSON.

### How to configure highlighting to be most effective
A few deliberate choices make it reliable and useful, not just pretty:
- **Anchor to rendered text, not Markdown source.** We serialize from the content
  container's `textContent`, so anchors are immune to Markdown/AST changes.
- **Keep context windows small but non-zero (32 chars).** Enough to disambiguate repeats
  ("the model" appears many times) without being so long that a nearby edit breaks the match.
- **Skip cross-block selections.** `surroundContents` can't wrap a range that spans two
  block elements; we skip those rather than corrupt the DOM. In practice highlights
  should live *within* a paragraph/list item, which is also the pedagogically useful unit.
- **Use color as meaning, not decoration.** The four colors map cleanly to a study
  system, e.g. amber = key idea, clay = confusing/revisit, sage = mastered, sky = ask the
  tutor. (Wire these to your own taxonomy.)
- **Make highlight + tutor one gesture.** Because the same pill offers both, a selection
  can become a saved highlight *and* a tutor question without re-selecting.

### How to configure the *pages* (lessons) so highlighting + tutoring are effective
The lesson format already supports this, and the prompts now lean into it:
- **Small, well-scoped nodes.** Each node declares `grounding.scope.includes`. Tight scope
  = the tutor answers selections precisely and refuses off-topic drift. Author lessons so
  one node = one idea.
- **Ground the claims.** `grounding.must_know` ties each key claim to a real source. When
  you select a sentence and ask "explain," the tutor cites that source instead of guessing.
- **Encode misconceptions.** `grounding.misconceptions` lets the tutor recognize a wrong
  mental model when you select and ask about it — the single highest-value thing to author.
- **Visual-first nodes.** Because L2+ nodes require a diagram, the most-selected, most-
  highlighted concepts are also the ones with a mermaid diagram to anchor understanding.

---

## 9. What changed vs. shipped (honest notes)

- These are real `.ts`/`.tsx` files matching your repo, plus three editable prompt
  resources and CSS. They reuse your existing primitives and types; no new dependencies.
- I verified the **logic** files compile and run (curriculum, prompt composition, and the
  highlight anchor round-trip) and syntax-checked every `.tsx`. I could **not** visually
  run the React UI in this environment (no working headless browser here), so the styling
  is built against your existing tokens but hasn't been pixel-reviewed in a live app.
- I don't have the named "frontend" design skills or MCP design tools available in this
  environment, so the visual design choices are my own judgment using your existing warm
  editorial token system — not the output of those skills.
- The prompt text in the topic prompts is adapted from your North Star doc; review the
  per-topic briefs and tune any wording before relying on them in production.
