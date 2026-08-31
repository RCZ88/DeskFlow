# Presentation Feature — Code Map & Architecture (for fixing the HTML prompt)

> Compiled from the current source on disk (session continued from `slideshtml229082026`).
> Project: DeskFlow "App Tracker" — Electron + React + TS.
> Scope: the **presentation** feature (`src/services/presentation/*`, `src/features/presentation/*`).

---

## TL;DR — how slides are generated today

**HTML mode currently makes ONE AI request PER SLIDE**, in a loop on the backend
(`src/services/presentation/index.ts`, `generatePresentation`). The rewritten system
prompt (`PROMPT_GENERATE_SLIDE`) is "ONE invocation = ONE slide" and uses
`{{CURRENT_SLIDE}}` / `{{SLIDE_COUNT}}` placeholders. JSON mode makes ONE request that
returns the whole deck as a `PresentationSpec`.

This is the architecture the previous session was converging on to fix the
"Slides HTML opener malfunction" (decks always had 1 slide). The code now matches the
prompt's intent. What remains to fix is the **prompt copy itself** (some sections still
drift back toward "whole deck" language) and one leftover legacy builder.

---

## 1. Current system prompt (where PROMPT_GENERATE_SLIDE lives)

**File:** `src/services/presentation/prompts.ts`
**Export:** `PROMPT_GENERATE_SLIDE` (line ~42), and `PROMPT_GENERATE_JSON` (line ~563).

The HTML slide prompt currently opens with the correct "one slide" contract:

```ts
export const PROMPT_GENERATE_SLIDE = `ONE INVOCATION GENERATES EXACTLY ONE SLIDE.
THE HTML DOCUMENT MUST CONTAIN ONLY THAT ONE SLIDE.
THE HOST APPLICATION — NOT THE GENERATED HTML — CONTROLS THE DECK (prev/next, counters, arrow keys).

You are a Principal Frontend Architect & Motion Designer. You generate ONE self-contained HTML file that renders EXACTLY ONE slide. ...
```

Key sections that enforce the one-slide / host-owns-deck contract:
- **OUTPUT RULES (NON-NEGOTIABLE)** — "Do NOT include `<nav>`, prev/next buttons, arrow key handlers, slide counters, or `show(i)` logic"; "Do NOT include `<section class="slide">` elements."
- **RENDERING ARCHITECTURE** — "The host renders a deck. It owns the deck ... It does NOT read any of that from your HTML."
- **DECK-LEVEL vs CURRENT-SLIDE** — "Render ONLY the CURRENT slide (identified by `{{CURRENT_SLIDE}}` of `{{SLIDE_COUNT}}`)."
- **TERMINOLOGY** — "`ONE HTML FILE` = ONE SLIDE."
- **SLIDEPLAN SCOPE RULE** — "The host assembles the deck from the per-slide HTML it collects — your file is one cell of that grid."

Placeholders expected by the composer (see §2): `{{CONTENT}}`, `{{SLIDE_COUNT}}`,
`{{CURRENT_SLIDE}}`, `{{MODE}}`.

> ⚠️ **Inconsistency to fix in the prompt:** `compileExternalChatPrompt` in
> `promptComposer.ts` (line ~389) still says *"Generate ONE self-contained HTML file
> containing ALL presentation slides as a navigatable slideshow"* and asks for
> `<main class="deck">`, `<section class="slide">`, `<nav>`, and `show(i)` arrow-key
> logic. That is the OLD whole-deck contract and directly contradicts
> `PROMPT_GENERATE_SLIDE`. Per the user request ("fix the html prompt thing"), this
> legacy builder must be aligned or removed.

---

## 2. Code that calls the AI model for slide generation

### 2a. Backend generation + how placeholders are passed
**File:** `src/services/presentation/index.ts`
**Function:** `generatePresentation(request)` (line ~124)

HTML path (lines ~181–218) — **one request per slide**:

```ts
const total = Math.max(1, slideCount)
for (let i = 0; i < total; i++) {
  const slidePrompt = prompt.replace(/\{\{CURRENT_SLIDE\}\}/g, String(i + 1))   // ← fills {{CURRENT_SLIDE}}
  let html: string | null = null
  for (let attempt = 0; attempt < 2 && !html; attempt++) {
    const { result: r } = await _runWithFallback(chain, {
      systemPrompt: actualSysPrompt,                 // PROMPT_GENERATE_SLIDE
      messages: [{ role: 'user', content: slidePrompt }],
      maxTokens: 4000, temperature: 0.7,
    })
    const candidate = extractHtmlFromResponse(r.content)
    const check = validateHtmlArtifact(candidate)
    if (check.valid) html = candidate
    else lastErr = check.error || 'invalid HTML'
  }
  // persist each slide as its own row: index_order = i, format = 'html'
  _db.prepare('INSERT INTO presentation_slides (...)').run(slideId, presId, i, 'value', 'html', ..., html)
}
_db.prepare("UPDATE presentations SET status='ready', slide_count=? ...").run(topic, total, now(), presId)
```

- `{{SLIDE_COUNT}}` and `{{CONTENT}}` are filled **once** in the UI-side composer
  (`compilePrompt`), into the `prompt` string that gets passed to `generatePresentation`.
- `{{CURRENT_SLIDE}}` is **re-filled per iteration** in the backend loop (line 188).
- The SlidePlan (all slides' content) is embedded in `{{CONTENT}}` and sent on **every**
  per-slide call; the model is told via `{{CURRENT_SLIDE}}` which single slide to render.

JSON path (lines ~164–180): a **single** call returns a `PresentationSpec` with all
slides; each slide is persisted as a `json` row (`JSON.stringify(slide)`).

### 2b. Frontend composer (assembles the prompt text)
**File:** `src/services/presentation/promptComposer.ts`
**Function:** `compilePrompt(plan, systemPrompt, theme, aspectRatio, currentSlide=1)` (line ~466)

```ts
const contentBlock = `Goal: ${plan.goal} ... SLIDE PLAN (${plan.slides.length} slides):\n\n${slideDescriptions} ...`
return systemPrompt
  .replace('{{CONTENT}}', contentBlock)
  .replace('{{SLIDE_COUNT}}', String(plan.slides.length))
  .replace('{{CURRENT_SLIDE}}', String(currentSlide))   // defaults to 1 in the UI preview
  .replace('{{MODE}}', `Structured — ${plan.slides.length} slides in ${plan.groups.length} groups`)
```

`buildSlidePlan(input)` (line ~36) builds the `SlidePlan` (goal/audience/tone/slides[]/groups[])
from topic / episode / external-chat input.

### 2c. Frontend call site
**File:** `src/features/presentation/PresentationWorkspace.tsx`
- `mkPrompt` (line ~380): `buildSlidePlan(...)` → `compilePrompt(plan, sysPrompt, theme, aspectRatio)`
  — note it does **not** pass `currentSlide`, so the **UI preview** prompt has `{{CURRENT_SLIDE}}` = 1.
- `handleAuto` (line ~416): calls `api()?.generate?.({ prompt, slideCount, topic, mode, theme })`.
  `slideCount` is resolved to a concrete number (`aiSlideCount ? MODES[mode].defaultSlideCount : slideCount`)
  so the backend loop has a real `total`.

---

## 3. Multiple-slide handling — one request for whole deck, per slide, or in between?

**Answer: HTML mode = one request per slide (a loop). JSON mode = one request for the whole deck.**

| Mode | Requests | How slides are stored |
|------|----------|------------------------|
| `html` | **N separate calls** in `generatePresentation` (one per `index_order`) | each slide → own `presentation_slides` row, `format='html'`, `index_order=i` |
| `json` | 1 call returning a full `PresentationSpec` | each `spec.slides[]` entry → own row, `format='json'`, `html_content = JSON.stringify(slide)` |

So it is **not** "one request for the whole deck" in HTML mode anymore (that was the old
broken behavior that produced 1-slide decks). It is a genuine per-slide loop.

The deck assembly / navigation is a **pure UI concern** (see §5) — the backend just
collects N independent HTML rows.

---

## 4. HTML parser / validator — what counts as a "valid single slide"

**File:** `src/services/presentation/index.ts` (used by the generation service)

```ts
function validateHtmlArtifact(html: string): { valid: boolean; error?: string } {
  if (!html || typeof html !== 'string') return { valid: false, error: 'Empty or non-string HTML' }
  if (html.length < 50) return { valid: false, error: 'HTML too short to be a valid slide' }
  const lower = html.toLowerCase()
  if (!lower.includes('<!doctype html') && !lower.includes('<html')) return { valid: false, error: 'Missing DOCTYPE or <html> tag' }
  if (!lower.includes('<body')) return { valid: false, error: 'Missing <body> tag' }
  if (!lower.includes('<style')) return { valid: false, error: 'Missing <style> tag — slides must be self-contained' }
  return { valid: true }
}
```

Rules enforced for a single valid slide:
1. Non-empty string.
2. ≥ 50 chars.
3. Has `<!DOCTYPE html>` **or** `<html>`.
4. Has `<body>`.
5. Has `<style>` (self-contained).

There is also `extractHtmlFromResponse(raw)` (line ~83) which strips ```html fences or
extracts the `<!DOCTYPE html>...</html>` span before validation.

**Separate parser file:** `src/services/presentation/htmlParser.ts` — `parseSlides(raw, expectedCount)`
tries JSON first, then legacy HTML. The legacy HTML branch looks for `<section>` blocks,
fenced code blocks, or treats the whole thing as one slide. ⚠️ This parser still assumes
a **multi-`<section>` deck** shape — it is **not** what the one-slide generation path uses
(backend validates raw single-slide HTML directly via `validateHtmlArtifact`). The
`htmlParser.ts` legacy path is mostly for import / backward-compat and should be revisited
when aligning everything to the one-slide contract.

---

## 5. Rendering / navigation code (so we don't re-add nav logic to generated HTML)

**File:** `src/features/presentation/PresentationWorkspace.tsx`

Deck navigation is **host-owned** and lives entirely in React — there is NO navigation in
the generated HTML (by contract). Navigation UI (lines ~960–976):

```tsx
<div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
  <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0}>…</button>
  <span>{currentSlide + 1} / {slides.length}</span>
  <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide >= slides.length - 1}>…</button>
  {/* slide dots */}
  {slides.map((_, i) => <button key={i} onClick={() => setCurrentSlide(i)} … />)}
</div>
```

Slide render (lines ~978–1013):
- `showCode` → `<pre>` raw `html_content`.
- `format === 'json'` → `JSON.parse(html_content)` → `<SlideRenderer slide={jsonSlide} />` (the
  React `SlideRenderer` renders the structured `SlideSpec`; **not** an iframe).
- else (HTML) → `<iframe srcDoc={slides[currentSlide].html_content} />` (the single-slide HTML
  is shown **as-is**, no deck/nav injected).

`SlideRenderer` (`src/features/presentation/SlideRenderer.tsx`) is the canonical React
renderer for the JSON/`SlideSpec` path and implements all visual primitives + motion.

> **Architecture to preserve:** generated HTML = ONE standalone slide, shown in an iframe,
> no `<nav>`/`<section class="slide">`/`show(i)`/arrow-key logic. All prev/next, counters,
> dots, and arrow-key handling stay in `PresentationWorkspace.tsx`. Any fix to the HTML
> prompt must keep enforcement of "host owns the deck" (already in `PROMPT_GENERATE_SLIDE`
> §OUTPUT RULES / RENDERING ARCHITECTURE).

---

## 6. Actionable checklist for "fix the HTML prompt thing"

1. **Align `compileExternalChatPrompt`** (`promptComposer.ts` ~389) with the one-slide
   contract — remove `<main class="deck">`, `<section class="slide">`, `<nav>`, `show(i)`,
   arrow-key instructions; make it one slide per invocation, or delete it if unused.
2. **Verify no other whole-deck language** remains in `PROMPT_GENERATE_SLIDE` (the sections
   read in §1 are already correct; re-grep for `deck`, `<section`, `show(i)`, `ArrowLeft`).
3. **Reconcile `htmlParser.ts`** legacy multi-`<section>` parsing with the one-slide model
   (it currently assumes decks, not single slides) — either scope it to import-only or update
   its assumptions.
4. **Keep navigation out of generated HTML** — already enforced; do not let a prompt rewrite
   re-introduce it (see §5 contract).
5. The generation loop (§2a) and renderer (§5) already match the one-slide architecture, so
   no backend change is required for the prompt fix itself — only prompt/parser text.

---

## File reference

| Concern | File | Key symbol / lines |
|---------|------|--------------------|
| HTML slide system prompt | `src/services/presentation/prompts.ts` | `PROMPT_GENERATE_SLIDE` (~42), `PROMPT_GENERATE_JSON` (~563) |
| Prompt assembly + placeholders | `src/services/presentation/promptComposer.ts` | `compilePrompt` (~466), `buildSlidePlan` (~36), `compileExternalChatPrompt` (~389, legacy) |
| AI call + per-slide loop + validator | `src/services/presentation/index.ts` | `generatePresentation` (~124), `validateHtmlArtifact` (~73), `extractHtmlFromResponse` (~83) |
| Legacy multi-section HTML parser | `src/services/presentation/htmlParser.ts` | `parseSlides` (~199) |
| Frontend call site + deck nav + iframe render | `src/features/presentation/PresentationWorkspace.tsx` | `mkPrompt` (~380), `handleAuto` (~416), nav (~960), render (~978) |
| React renderer for JSON slides | `src/features/presentation/SlideRenderer.tsx` | `SlideRenderer` |
| IPC bridge | `src/preload.ts` | `presentation.generate/get/list/...` (~1765) |
| Handler registration | `src/main.ts` | `registerPresentationHandlers` wiring (~4156) |
