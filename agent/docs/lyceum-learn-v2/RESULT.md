# Lyceum Learn — reliable lesson generation + an editorial library

This bundle is **real TypeScript/React source for your project** (it mirrors your
`src/` layout and imports your existing primitives), plus this write-up. Drop the
files in, follow `INTEGRATION.md`, and you get two things:

1. **JSON generation that stops breaking.**
2. **A warm, editorial “booky” library + welcome screen** to replace the current
   empty page.

Everything was checked against your own code: the compiler's output is run
through your real `validateFull()` (AJV + the schema at
`src/schemas/ldoc-1.0.json`) and passes with zero errors.

---

## 1. Why the AI output kept failing — and the actual fix

The errors you hit were all the same shape:

```
Unexpected token '`', "```python ..." is not valid JSON
Expected ',' or '}' after property value in JSON at position 695 (line 21 column 103)
```

This is **not** a sanitiser bug you can patch your way out of. You were asking
Gemini to emit one large, strict JSON object whose string values contain code
(backticks, newlines, quotes) and prose. Models leak a code fence or a trailing
comma *into* a JSON string constantly, and every “clean the JSON harder” trick
(`extractJsonObject`, `stripTrailingCommas`) only covers a few of infinitely many
failure modes.

**The fix is to invert the format.** The model writes **Lesson Markdown (`.lmd`)**
— which it is extremely good at, code fences and all — and the app compiles that
to `.ldoc` deterministically. A ```` ```python ```` fence and a trailing comma
are now *impossible by construction*, because the model never writes JSON.

### What does the compiling

- **`src/services/learn/parseLessonMarkdown.ts`** — the `.lmd` → `LdocDocument`
  compiler. It is fence/math/directive-aware, so a Python `# comment` or a `#`
  inside a code block is never mistaken for a node heading (a real bug a naive
  splitter hits). It produces blocks that match your `shared/learn/types.ts`
  exactly: `code{lang,src,runnable}`, `mermaid{src}`, `math{tex}`, `quiz{format,
  q,level,answer_key|rubric}`, `callout{md,tone}`, `layer{reveal_at,mode,blocks}`,
  and grounding with `must_know[]`, `scope.includes`, `sources[]`.
- **`src/services/learn/lessonInput.ts`** — `toLdoc(raw)`: strips an outer fence,
  routes JSON-looking input to `JSON.parse` (fallback) and everything else to the
  Markdown compiler. This is the single function `learn:generateLdoc` should call.
- **`resources/learn/author-guide.md`** — the new system prompt that tells the
  model to emit `.lmd` and never JSON.

### Bonus: errors become actionable
Instead of `position 4395 (line 107 column 89)`, a bad lesson now fails with
things like:

```
Line 42: Node "Prompt Injection" grounding needs at least one "source: id | Title | url" line.
```

### Proof it works
Compiling the included `resources/learn/sample-security.lmd` and running it
through **your** `validateFull()`:

```
doc: ldoc/1.0
lesson.id: security-attackers-mind | part: 5 | authored_by: ai
nodes: threat-modeling-with-stride[L3], the-owasp-top-10-in-practice[L3], prompt-injection-the-lethal-trifecta[L4]
validateFull.ok: true
✅ Compiled .lmd passes the project validator with zero errors.
```

(During testing the validator even caught a prereq slug typo in my draft — exactly
the kind of mistake that used to surface as an opaque JSON crash.)

---

## 2. The editorial library + welcome screen

You asked for the empty page to feel like “a showcase and a beautiful list of
items, looking like books,” in a **warmer, editorial** direction. These components
use the warm tokens **already in your `index.css` `@theme`** (`font-serif`
Source Serif 4, `clay`, `sage`, `amber`, `glow`) and reuse your real primitives
(`BlurFade`, `ShinyButton`, `BorderBeam`, `Button`, `Badge`, `Skeleton`).

- **`src/components/learn/BookCard.tsx`** — a cloth-bound hardcover. Shows part
  number (gilt foil), serif title, concept count, created date, and status. Each
  part gets a consistent cloth colour; hover lifts the book off the shelf.
- **`src/components/learn/LessonLibrary.tsx`** — groups books onto **shelves by
  part** with a wooden rail under each row; serif header, loading skeletons, and
  Compose / Import actions.
- **`src/components/learn/WelcomeEmptyState.tsx`** — an editorial invitation: a
  serif headline, a hero “book” with a `BorderBeam` gilt edge on a stand, a
  primary **Compose a lesson** action, and three quick-start cards (sample /
  import / paste).
- **`src/styles/lyceum-editorial.css`** — the cloth grain, page edges, shelf
  rails, and ambient glow. Append to `index.css`.

These are presentational and prop-driven, so they slot into `LearnPage.tsx`
without touching your data flow (see `INTEGRATION.md` step 3).

---

## 3. File map

```
src/services/learn/parseLessonMarkdown.ts   # .lmd -> .ldoc compiler
src/services/learn/lessonInput.ts           # toLdoc() entry point
src/components/learn/BookCard.tsx            # cloth-bound book
src/components/learn/LessonLibrary.tsx       # shelves by part
src/components/learn/WelcomeEmptyState.tsx   # editorial welcome
src/styles/lyceum-editorial.css             # textures -> append to index.css
resources/learn/author-guide.md             # new system prompt (.lmd authoring)
resources/learn/sample-security.lmd         # worked example (compiles clean)
INTEGRATION.md                              # exact wiring steps
RESULT.md                                   # this file
```

---

## 4. Acceptance checklist

- [x] Compiler output passes your real `validateFull()` (schema + DAG + grounding
      + visual + quiz-key rules).
- [x] Code/diagrams/quizzes carry through verbatim — no JSON escaping, so the
      backtick/trailing-comma errors cannot occur.
- [x] Components import only existing primitives + tokens; no new dependencies.
- [ ] You: apply `INTEGRATION.md` steps 1–4 and rebuild.

---

## Honest notes

- **No visual self-review.** This sandbox can't run a headless browser, so I could
  not render the components to screenshots. The design choices are reasoned from
  your existing tokens, but please eyeball them once mounted.
- **No external design MCP / dedicated frontend skills** were available in this
  environment, so I did not pull live design references; the editorial direction
  follows your existing palette and your “warmer / booky” steer.
- TypeScript types match `shared/learn/types.ts` as extracted from `src.zip`. If
  your local copy has drifted, reconcile the block field names before building.
