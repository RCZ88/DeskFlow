# Hybrid Deck Generation — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Change HTML-mode slide generation from N independent model calls (per-slide) to **ONE deck-level call → deterministic parse → N independently-stored slides**, eliminating CSS duplication while keeping storage and host navigation exactly as they are. Per-slide generation survives as a resilience fallback.

**Architecture:** Separate the three layers that were previously conflated:
- **Generation**: 1 AI call emits 1 parseable `<!DOCTYPE html>` deck document (shared `<style>` once + each slide in `<article data-slide="N">`).
- **Parse**: a new deterministic parser extracts the shared CSS + N slide blocks.
- **Storage**: N rows in `presentation_slides` (unchanged shape) + shared CSS stored once on the `presentations` row.
- **Rendering**: host recombines `sharedStyle + slide markup` into the iframe per `currentSlide` (unchanged host navigation).

**Tech Stack:** TypeScript, Electron IPC (`presentation:generate`/`get`/`import`), existing `promptComposer`/`prompts`/`index.ts` service, `PresentationWorkspace.tsx` renderer.

---

## Assessment — is this proper and is it better?

**Is it the *proper* design?** Yes. The earlier one-invocation-per-slide contract was correct about *storage* and *navigation* but wrong about *generation coupling*. Generation format ≠ storage format ≠ render format. The hybrid cleanly respects all three and keeps the single-slide-per-row storage + host-owned nav that already work.

**Is it *better*?** Mostly yes, with one real tradeoff:
- ✅ **Less duplication**: shared CSS emitted once, not ×6 → smaller model output, less token cost, faster.
- ✅ **Consistency**: one deck context → no `--accent:#2D5BFF` vs `#315EFF` drift between slides.
- ✅ **One model call** for the happy path (cheaper, lower latency) vs N calls.
- ✅ **Single-slide regeneration preserved**: failed/weak slide → targeted re-gen via the per-slide fallback.
- ⚠️ **Truncation risk**: one large deck HTML is more likely to be cut off by weaker local models than 6 small outputs. Mitigated by (a) a `slideCount` threshold that drops back to pure per-slide mode, and (b) per-slide regeneration for any malformed extract.
- ⚠️ **Parse coupling**: prompt and parser MUST agree on the exact slide boundary (`data-slide`). Covered by a contract test.

Net: better for the common case, with the old per-slide path kept as the safety net — not deleted.

---

## UI change impact (explicit)

| Surface | Current | After |
|---------|---------|-------|
| **"Auto Generate"** (`handleAuto`) | builds single-slide prompt, backend loops N calls | builds **deck** prompt, backend makes 1 call + parses. UI call site unchanged in shape (still `api().generate({prompt, slideCount})`). |
| **"Copy Slide Prompt"** (`handleCopySlidePrompt`) | copies a single-slide prompt (with `{{CURRENT_SLIDE}}`) for external AI | copies the **deck** prompt (whole plan, `{{SLIDE_COUNT}}` only) so an external AI can return a full deck. |
| **"Import Slides"** (`handlePasteImport`) | treats pasted HTML as ONE slide | parses pasted HTML as a **deck** → N slides (reuses `deckParser` client-side, then `import`). |
| **Slide rendering** (`slides[currentSlide]` in iframe) | injects `html_content` directly | recombines `presentation.shared_style + html_content` into an html shell before `srcDoc`. |
| **New: "Regenerate slide"** | n/a | optional button on the viewer → `presentation:regenerate-slide` (per-slide fallback path). |
| Dots / prev-next / counter / ArrowLeft-Right | host-owned | **unchanged** — generated HTML still contains zero navigation. |

**No change** to: user input UI (Topic / 6 slides / Aspect / Theme), JSON mode, the slide-count selector, `mkPrompt` inputs.

---

## Files likely to change

- Modify: `src/services/presentation/prompts.ts` — add `PROMPT_GENERATE_DECK`; retain `PROMPT_GENERATE_SLIDE` for fallback.
- Modify: `src/services/presentation/promptComposer.ts` — add `compileDeckPrompt(plan, theme, aspectRatio)` (fills `{{CONTENT}}`, `{{SLIDE_COUNT}}`, `{{MODE}}`; **no** `{{CURRENT_SLIDE}}`).
- Create: `src/services/presentation/deckParser.ts` — `parseDeckHtml(raw): { sharedStyle, slides: {index, html}[], errors }`.
- Modify: `src/services/presentation/index.ts` — `generatePresentation` HTML mode = 1 deck call → `parseDeckHtml` → per-slide validate → fallback re-gen of bad slots → store shared style on `presentations` + markup per `presentation_slides` row; add `presentation:regenerate-slide`.
- Modify: `src/main.ts` — register `regenerate-slide` handler (alongside existing `registerPresentationHandlers`).
- Modify: `src/preload.ts` — expose `presentation.regenerateSlide`.
- Modify: `src/features/presentation/PresentationWorkspace.tsx` — `handleAuto` → deck compile; `handleCopySlidePrompt` → deck prompt; `handlePasteImport` → deck parse→import; render path recombines shared style.
- Modify: DB schema (`ensurePresentationTables`) — `ALTER presentations ADD COLUMN shared_style TEXT` under try/catch (mirrors existing migration style).
- Keep (legacy, untouched): `src/services/presentation/htmlParser.ts`.

---

## Task breakdown

### Task 1: Add deck system prompt
**Objective:** New prompt instructs a single parseable deck document.
**Files:** `src/services/presentation/prompts.ts`
**Step 1:** Append `export const PROMPT_GENERATE_DECK = \`...\`` after `PROMPT_GENERATE_SLIDE`.
**Step 2:** Contract text (exact):
```
ONE INVOCATION GENERATES THE ENTIRE REQUESTED DECK AS ONE HTML DOCUMENT.
THE DOCUMENT MUST CONTAIN ONE <head> WITH A SINGLE <style> (shared deck CSS), AND EACH SLIDE IN ITS OWN <article data-slide="N"> WHERE N STARTS AT 1 AND INCREMENTS BY 1.
THE HOST APPLICATION — NOT THE GENERATED HTML — CONTROLS NAVIGATION (prev/next, counters, arrow keys).
OUTPUT RULES (NON-NEGOTIABLE)
- Output ONE valid raw HTML document. No markdown fences, no explanation.
- Exactly one <!DOCTYPE html>, one <head>, one <style> (shared CSS), one <body>.
- Each slide: <article data-slide="N"> ... </article>. Do NOT wrap slides in <main class="deck">, <nav>, or multiple <section class="slide">. Do NOT add deck navigation, slide counters, or show(i)/ArrowLeft/ArrowRight logic.
- Slide-local <script> ONLY for interaction/animation within a single <article>; NEVER for deck navigation.
```
Reuse the existing content-fidelity, anti-slop, responsive, accessibility rules from `PROMPT_GENERATE_SLIDE` (keep them; only the output-format/architecture section differs).
**Step 3:** Verify build later (Task 9). Commit.

### Task 2: Add deck prompt compiler
**Objective:** Build the deck prompt from a SlidePlan without `{{CURRENT_SLIDE}}`.
**Files:** `src/services/presentation/promptComposer.ts`
**Step 1:** Add:
```ts
export function compileDeckPrompt(plan: SlidePlan, theme: any, aspectRatio: '9:16'|'1:1'|'9:8' = '9:16'): string {
  // reuse the same content/theme/contrast assembly as compilePrompt but
  const sys = PROMPT_GENERATE_DECK
  // ...build contentBlock (same as compilePrompt)...
  return sys
    .replace('{{CONTENT}}', contentBlock)
    .replace('{{SLIDE_COUNT}}', String(plan.slides.length))
    .replace('{{MODE}}', `Structured deck — ${plan.slides.length} slides in ${plan.groups.length} groups`)
}
```
Note: do NOT call `.replace('{{CURRENT_SLIDE}}', …)` — deck prompt has no such placeholder.
**Step 2:** Build/typecheck later. Commit.

### Task 3: Deterministic deck parser + tests (TDD)
**Objective:** Parse one deck HTML into shared style + N slide blocks by `data-slide`.
**Files:** Create `src/services/presentation/deckParser.ts`; test `src/services/presentation/__tests__/deckParser.test.ts` (or a node script run via `node`).
**Step 1 (failing test):**
```ts
import { parseDeckHtml } from '../deckParser'
const deck = `<!DOCTYPE html><html><head><style>.x{color:red}</style></head><body>
<article data-slide="1"><h1>A</h1></article>
<article data-slide="2"><h1>B</h1></article></body></html>`
const r = parseDeckHtml(deck)
assert(r.sharedStyle.includes('.x{color:red}'))
assert(r.slides.length === 2)
assert(r.slides[0].index === 0 && r.slides[0].html.includes('<h1>A</h1>'))
assert(r.slides[1].index === 1)
```
**Step 2:** Run `node`/vitest → FAIL (module missing).
**Step 3 (impl):** in `deckParser.ts`:
- Extract `<style>…</style>` from head → `sharedStyle`.
- `const re = /<article\b[^>]*data-slide="(\d+)"[^>]*>([\s\S]*?)<\/article>/gi` to collect blocks; map to `index = Number(n)-1`.
- Validate exactly one doctype/head/style; if `<article>` count !== expected slide count, push error but still return whatever parsed.
- Return `{ sharedStyle, slides, errors }`.
**Step 4:** Run test → PASS. Commit.

### Task 4: Regenerate-single-slide prompt
**Objective:** A focused prompt to re-gen one slide for fallback/regeneration.
**Files:** `src/services/presentation/prompts.ts`
**Step 1:** Add `PROMPT_REGEN_SLIDE` reusing `PROMPT_GENERATE_SLIDE` content but instructs: "Render ONLY the slide identified by the supplied PlannedSlide. Output a single `<article data-slide="N">…</article>` (or a full minimal HTML doc containing exactly that one article)." (So both deck and single paths agree on `<article data-slide>`.)
**Step 2:** Commit.

### Task 5: Backend — one deck call + parse + fallback
**Objective:** Rewrite `generatePresentation` HTML branch to use the hybrid path.
**Files:** `src/services/presentation/index.ts` (`generatePresentation`, ~line 181) + `ensurePresentationTables`.
**Step 1:** Add DB column: in `ensurePresentationTables`, `if (!cols.includes('shared_style')) db.exec('ALTER TABLE presentations ADD COLUMN shared_style TEXT')` (try/catch).
**Step 2:** HTML branch:
```ts
const promptText = compileDeckPrompt(buildSlidePlan(request), themeTokens, aspectRatio)
const { result } = await _runWithFallback(chain, { systemPrompt: PROMPT_GENERATE_DECK, messages:[{role:'user',content:promptText}], maxTokens: 8000, temperature: 0.7 })
const parsed = parseDeckHtml(result.content)
let slides = parsed.slides
// per-slide validation + fallback re-gen
for (let i=0;i<slides.length;i++){
  if (!validateSlideMarkup(slides[i].html)) {
    const regen = await regenSlide(slides[i], plan, theme) // 1 focused call
    if (regen) slides[i] = regen
  }
}
// store
_db.prepare('UPDATE presentations SET status=\'ready\', title=?, slide_count=?, shared_style=?, updated_at=? ...')
  .run(topic, slides.length, parsed.sharedStyle, now(), presId)
for (const s of slides) _db.prepare('INSERT INTO presentation_slides (..., html_content) VALUES (...,?)').run(..., s.html)
```
- `validateSlideMarkup` = reuse `validateHtmlArtifact` minus the `<style>`/doctype requirement (slides are markup-only now), plus a check that it contains `<article` or substantial content.
- Large-deck guard: if `slideCount > MAX_DECK_SLIDES` (e.g. 10) → fall back to the existing per-slide loop (rename current loop to `generatePerSlide` and call it). This keeps the resilience path.
**Step 3:** Commit.

### Task 6: Regenerate-slide IPC
**Objective:** Expose single-slide regeneration.
**Files:** `src/services/presentation/index.ts` (`registerPresentationHandlers`), `src/main.ts`, `src/preload.ts`.
**Step 1:** Add `ipcMain.handle('presentation:regenerate-slide', …)` calling `regenSlide` for one index, returning updated `html_content`.
**Step 2:** In `src/main.ts` registration block, add `regenerateSlide: (id, index) => ipcRenderer.invoke('presentation:regenerate-slide', {id, index})` to `preload.ts` bridge.
**Step 3:** Commit.

### Task 7: UI — deck compile / copy / import / render
**Objective:** Wire the UI to the hybrid path.
**Files:** `src/features/presentation/PresentationWorkspace.tsx`
**Step 1:** `handleAuto`: change `mkPrompt()` to `compileDeckPrompt(buildSlidePlan({...}), activeTheme.tokens, aspectRatio)` (import `compileDeckPrompt`). Keep `slideCount: resolvedCount`.
**Step 2:** `handleCopySlidePrompt`: copy the **deck** prompt (`compileDeckPrompt(...)`) instead of the single-slide `FIELD_PROMPT`.
**Step 3:** `handlePasteImport`: run `parseDeckHtml(pasteHtml)` client-side; if ≥1 article, call `api().import({ topic, slideCount: slides.length, slides: slides.map(s=>({html: recombine(s.html, ''), frameType:'value'})) })`. (Import path stores raw per slide; shared-style extraction for imported decks is a follow-up — note it.)
**Step 4:** Render recombination: in the HTML branch (~line 1005), build
```ts
const shared = activePres.shared_style || ''
const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${shared}</style></head><body>${slides[currentSlide].html_content}</body></html>`
```
and use `doc` as `srcDoc` (add `shared_style` to the `PD` type / `presentation:get` return).
**Step 5:** Commit.

### Task 8: Optional "Regenerate slide" button
**Objective:** Let user re-gen the current slide.
**Files:** `src/features/presentation/PresentationWorkspace.tsx`
**Step 1:** Add a small button near the nav that calls `api().regenerateSlide(activePres.id, currentSlide)` and updates `slides[currentSlide].html_content`.
**Step 2:** Commit.

### Task 9: Build + verification
**Objective:** Prove the contract holds.
**Files:** whole feature.
**Step 1:** `cd "C:/Users/cleme/Documents/COMPUTAH_SAYENCE/App Tracker" && npx vite build --outDir dist-tmp` → expect `EXIT=0`.
**Step 2:** Grep the feature for stale deck instructions: expect NO active prompt asks for `<main class="deck">`, `<section class="slide">`, `<nav>`, `show(i)`, ArrowLeft/ArrowRight deck handlers. (The only hits should be prohibition text + parser rejection guards + frozen `prompt-versions/v0-original.ts`.)
**Step 3:** Unit: run `deckParser` test (Task 3) → 6-article sample yields 6 slides + shared style.
**Step 4:** Logical checks: (a) 1 deck call → 6 rows; (b) each row renders standalone via recombination; (c) `PresentationWorkspace` remains sole owner of nav (no nav in generated HTML); (d) a 12-slide request takes the per-slide fallback automatically.

---

## Risks / tradeoffs / open questions
- **Truncation**: mitigated by `MAX_DECK_SLIDES` fallback + per-slide re-gen. Tunable.
- **Imported decks**: `handlePasteImport` stores raw per-slide (no shared-style de-dup) in v1; can extract shared style later. Acceptable (import is not the hot path).
- **`shared_style` coupling**: if a slide's markup needs slide-unique CSS, it can include a scoped `<style>` inside its `<article>`; the parser preserves inner styles. Validator should allow one inner `<style>` per article.
- **Backward compat**: existing per-slide rows (with full `<style>` in `html_content`) still render — recombination prepends empty `shared_style` and the row is already self-contained. No migration needed.

## Verification gate (from AGENTS.md M17)
Build MUST use `npx vite build --outDir dist-tmp`. Do not touch `dist/`. After build, run the grep + parser test above before declaring done.
