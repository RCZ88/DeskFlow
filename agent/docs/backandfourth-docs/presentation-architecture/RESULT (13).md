# RESULT: Presentation Architecture Refactor

## Status

This specification is based strictly on the current code supplied for Presentation Studio.

The current system is a partially migrated architecture with two output modes:

- HTML mode: raw HTML artifact rendered in an iframe.
- JSON mode: structured JSON parsed into React visual primitives.

Both modes currently share a broken generation IPC path, and JSON mode has significant contract drift between prompt, parser, validator, persistence, and renderer.

The target architecture is to keep both modes, but establish one authoritative generation pipeline and explicit contracts between each stage.

---

# 1. Problem

The current Presentation Studio contains multiple competing implementations and no authoritative end-to-end generation pipeline. `PresentationWorkspace.tsx` builds either an HTML or JSON prompt, but `presentation:generate` in `main.ts` is a stub, so auto-generation never reaches an AI provider. A second generation implementation exists in `src/services/presentation/index.ts`, but it is dead because `registerPresentationHandlers()` is never imported or called. The provider router does not expose `presentation` as a feature. JSON mode is only partially implemented: `parseSlides()` and validation exist but are not used by the live rendering path, the renderer expects `frame` while the prompt emits `type`, motion metadata is ignored, responsive behavior is absent, and the renderer supports only a subset of the primitive contracts documented by the prompt. Persistence stores both HTML and JSON in `html_content` without a format indicator or version. Export only understands HTML and uses a fixed 1080×960 offscreen BrowserWindow. The result is two partially implemented presentation architectures rather than one reliable pipeline.

---

# 2. Solution

Keep both HTML and JSON output modes, but make them explicit rendering strategies under one Presentation Service. The AI generates either one-slide HTML artifacts or structured `PresentationSpec` JSON according to the requested format. The backend owns provider routing, response parsing, validation, normalization, persistence, and error handling. The application owns navigation, playback, aspect ratio, viewport, and export. HTML remains the maximum-freedom visual escape hatch; JSON becomes the deterministic structured rendering path. Both formats use an explicit persisted `format` and `spec_version`, eliminating JSON.parse-based format guessing. JSON uses one canonical shared TypeScript model and runtime schema validation. The renderer implements every schema value it accepts, and responsive 9:16/1:1/9:8 composition becomes a renderer responsibility rather than an AI-generated CSS responsibility.

---

# 3. Ownership Model

## AI owns

- supplied educational/content meaning
- visible text derived from authoritative input
- structured visual data in JSON mode
- HTML/CSS/SVG in HTML mode
- semantic motion intent in JSON mode
- slide-level visual composition intent

## Presentation Service owns

- provider selection
- AI invocation
- format selection
- parsing
- schema validation
- normalization
- retry policy
- partial-failure policy
- persistence
- generation status

## React application owns

- slide selection
- navigation
- playback
- viewport
- aspect ratio container
- responsive composition in JSON mode
- theme application
- semantic motion implementation
- interactive state
- export orchestration

## Renderer owns

- DOM/SVG generation from JSON
- CSS/layout
- typography
- diagram drawing
- equation rendering
- animation implementation
- accessibility

---

# 4. Canonical Persistence Model

The current `html_content` field should not be removed immediately because it contains existing data. It should be supplemented and progressively migrated.

Recommended schema:

```sql
CREATE TABLE presentation_slides (
  id TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL,
  index_order INTEGER NOT NULL,
  frame_type TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'html',
  spec_version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE
);
```

Migration compatibility fields may temporarily remain:

```text
html_content -> legacy compatibility field during migration
content      -> canonical artifact field
format       -> html | json
spec_version -> integer
```

If minimizing migration is important, `html_content` may remain the physical column name while adding:

```text
format
spec_version
```

and treating `html_content` as an opaque artifact payload. The important correction is that the application MUST NOT infer format by attempting `JSON.parse()`.

## Presentation-level metadata

Add or derive:

```text
format_mode: html | json | mixed
spec_version: integer
```

A presentation may be mixed during migration, but newly generated presentations should contain one consistent format unless mixed output is deliberately supported later.

---

# 5. Canonical JSON Contract

Create one shared type definition, for example:

`src/services/presentation/spec.ts`

It must become the single source of truth for:

- prompt documentation
- parser
- validator
- renderer
- persistence
- tests

## PresentationSpec

```ts
export interface PresentationSpec {
  title: string
  slideCount: number
  themeId: string
  specVersion: number
  slides: SlideSpec[]
}
```

## SlideSpec

```ts
export interface SlideSpec {
  index: number
  type: SlideType
  group: string
  headline: string
  subheadline?: string
  body?: string
  equation?: string
  badge?: string
  recap?: string[]
  layout: LayoutType
  visual: VisualSpec
  motion: MotionSpec
}
```

There is NO `frame` field in the canonical JSON contract. `type` is used consistently everywhere.

## Enums

```ts
type SlideType =
  | 'hook'
  | 'value'
  | 'transition'
  | 'call_to_action'
  | 'visual_only'

type LayoutType =
  | 'split-left'
  | 'split-right'
  | 'full-bleed'
  | 'minimal'

type VisualType =
  | 'hero-number'
  | 'code-block'
  | 'diagram'
  | 'chart'
  | 'progress-ring'
  | 'step-through'
  | 'comparison'
  | 'timeline'
  | 'quote'
  | 'icon-grid'
  | 'data-table'
  | 'interactive-demo'
  | 'none'
```

## MotionSpec

```ts
interface MotionSpec {
  entry: 'blur-fade' | 'slide-up' | 'none'
  emphasis: 'glow-pulse' | 'highlight-edge' | 'count-up' | 'none'
  interaction: 'step-through' | 'hover-reveal' | 'slider' | 'none'
}
```

## VisualSpec

```ts
interface VisualSpec {
  type: VisualType
  data: VisualData
}
```

`VisualData` must be a discriminated union keyed by `visual.type`, not `any`.

---

# 6. Visual Data Contracts

## hero-number

```ts
interface HeroNumberData {
  value: number
  label: string
  suffix?: string
  prefix?: string
}
```

## code-block

```ts
interface CodeBlockData {
  code: string
  language: string
  highlightLines?: number[]
}
```

The renderer must visibly support `language` and `highlightLines` or those fields must be removed from the schema.

## diagram

```ts
interface DiagramData {
  nodes: Array<{
    id: string
    label: string
    x: number
    y: number
    kind?: string
    highlighted?: boolean
  }>
  edges: Array<{
    from: string
    to: string
    label?: string
    highlighted?: boolean
  }>
  direction?: 'forward' | 'backward' | 'bidirectional'
}
```

The renderer MUST interpret `direction` and MUST generate unique SVG marker IDs per diagram instance.

## chart

```ts
interface ChartData {
  kind: 'bar' | 'line' | 'area'
  data: Array<{ label: string; value: number }>
  color?: string
}
```

The renderer must implement all three kinds. If line and area are not implemented, they cannot remain valid enum values.

## progress-ring

```ts
interface ProgressRingData {
  value: number
  max: number
  label: string
  suffix?: string
}
```

## step-through

```ts
interface StepThroughData {
  states: Array<{
    label: string
    description: string
    activeNodes?: string[]
  }>
}
```

The interactive controls are local visual state and are NOT presentation navigation.

## comparison

```ts
interface ComparisonData {
  left: { title: string; items: string[] }
  right: { title: string; items: string[] }
}
```

## timeline

```ts
interface TimelineData {
  events: Array<{
    time: string
    title: string
    description?: string
  }>
}
```

## quote

```ts
interface QuoteData {
  text: string
  author: string
  role?: string
}
```

## icon-grid

```ts
interface IconGridData {
  items: Array<{
    icon: string
    label: string
    description?: string
  }>
}
```

Preferred long-term improvement: replace arbitrary icon strings with a controlled icon identifier enum. Do not allow emoji as the intended icon mechanism.

## data-table

```ts
interface DataTableData {
  columns: string[]
  rows: string[][]
}
```

## interactive-demo

```ts
interface InteractiveDemoData {
  description: string
  inputs: Array<{
    label: string
    type: 'slider' | 'toggle' | 'text'
  }>
  outputs: Array<{
    label: string
    formula?: string
  }>
}
```

The renderer must actually render inputs and outputs. Otherwise this primitive must remain unsupported and be removed from the allowed schema.

## none

```ts
interface NoneVisualData {}
```

`none` is an explicit valid visual type, not an undocumented renderer fallback.

---

# 7. Content Fidelity Contract

The supplied content is authoritative.

The prompt must enforce:

```text
CONTENT IS IMMUTABLE.
PRESENTATION IS VARIABLE.
```

The AI MUST NOT:

- invent claims
- introduce new concepts
- invent technical teaching points
- omit required equations
- replace supplied relationships
- reorder the conceptual sequence
- replace supplied visible claims with new claims
- decide independently that a different topic would be better

The AI MAY only change:

- spatial arrangement
- typography hierarchy
- visual encoding
- animation category
- responsive arrangement
- primitive selection when not explicitly specified

## Content precedence

When multiple representations exist:

1. Explicit `On-Screen Text` is authoritative visible copy.
2. Explicit `Audio/Script` is explanatory source material and may be used to construct supporting body content when the SlidePlan requires it.
3. Explicit equations are verbatim.
4. Explicit visual requirements override primitive fallback logic.
5. `headlineHint` is a constraint, not permission to invent.
6. Frame type controls presentation structure, not meaning.

---

# 8. SlidePlan Contract Improvements

`PlannedSlide` currently contains hints but not authoritative content fields. This is insufficient for strict content preservation in topic/external-chat modes.

Extend it to distinguish source content from design hints:

```ts
interface PlannedSlide {
  index: number
  frame: SlideType
  group: string

  // authoritative source material
  sourceHeadline?: string
  sourceOnScreenText?: string
  sourceBody?: string
  sourceEquation?: string
  sourceScript?: string
  sourceVisual?: string

  // design-only hints
  purpose: string
  headlineHint?: string
  layoutHint?: LayoutType
  visualHint?: string
  interactivityHint?: string
}
```

For existing episode content, populate the authoritative fields from the episode frame.

For externally supplied chat, preserve actual extracted source material rather than reducing it to generic phrases.

For topic-only generation, there is no pre-existing authoritative body. This is the one mode where the AI is allowed to author content within the topic boundary. The prompt must explicitly distinguish:

```text
SOURCE-LOCKED MODE
The source content is authoritative. Do not author new content.

TOPIC-AUTHORING MODE
No slide-by-slide source text exists. You may author explanatory copy,
but only within the requested topic and slide purposes.
```

This resolves the current contradiction between `CONTENT IS IMMUTABLE` and topic mode, where the AI necessarily has to create the actual explanation.

---

# 9. Generation API Contract

The frontend must send explicit format information.

```ts
interface PresentationGenerateRequest {
  prompt: string
  outputFormat: 'html' | 'json'
  slideCount: number
  episodeId?: number
  topic?: string
  mode: string
  themeId: string
  aspectRatio: '9:16' | '1:1' | '9:8'
}
```

Do not send theme tokens as an authority from the client if the theme registry is already authoritative. Send `themeId` and resolve tokens in the presentation service.

The backend must know the requested format explicitly.

---

# 10. Authoritative Generation Service

Remove the dead `registerPresentationHandlers()` implementation from `src/services/presentation/index.ts` or make that file the single authoritative service and register it from `main.ts`.

Preferred architecture:

```text
src/services/presentation/index.ts
  PresentationService.generate(request)
  PresentationService.import(...)
  PresentationService.parse(...)
  PresentationService.validate(...)
  PresentationService.persist(...)
```

`main.ts` should register IPC handlers that delegate to the service. It should not contain duplicate presentation business logic.

Example:

```ts
ipcMain.handle('presentation:generate', async (_, request) => {
  return presentationService.generate(request)
})
```

There must be exactly one live implementation of `presentation:generate`.

---

# 11. Provider Integration

Add `presentation` to the provider feature union and routing type.

```ts
feature:
  | 'researchDigest'
  | 'goalAssistant'
  | 'resumeBuilder'
  | 'category'
  | 'colors'
  | 'lifeAssistant'
  | 'monthlyRecap'
  | 'contentEngine'
  | 'vision'
  | 'presentation'
```

Add:

```ts
presentation?: {
  providerId: string
  model: string
} | null
```

Use the existing provider chain/fallback infrastructure.

However, do NOT inherit the generic 4000 → 100 → 50 → 40 token retry behavior blindly.

Presentation generation should use format-aware retry behavior.

For JSON:

- retry after parse/validation failure with a correction prompt
- retain an adequate token budget
- do not retry structured output at 100 or 50 tokens
- do not treat deliberate cancellation as a normal retry

For HTML:

- retry malformed output with a targeted correction prompt
- maintain the required token budget

Provider fallback and format-correction retry are separate concerns:

```text
Provider failure
  → provider fallback

Provider succeeds but output invalid
  → format-specific correction retry
```

---

# 12. JSON Parsing Pipeline

The live backend pipeline must be:

```text
AI response
  ↓
parse raw JSON
  ↓
validate PresentationSpec
  ↓
validate every SlideSpec
  ↓
validate discriminated VisualData
  ↓
normalize defaults only where explicitly allowed
  ↓
persist
```

Never persist invalid JSON and hope the renderer can recover.

Malformed JSON must return a generation error and trigger one or more controlled correction retries before failing.

---

# 13. JSON Validator

Replace the current shallow validator with a real runtime schema validator.

Recommended implementation choices:

- Zod
- JSON Schema + validator library
- equivalent runtime schema system already used by the project

The validator MUST enforce:

- top-level required fields
- exact top-level fields
- slide count
- slide indices
- duplicate indices
- contiguous indices
- type enum
- group
- headline
- body requirements according to frame
- layout enum
- visual enum
- visual-specific data shape
- motion enum
- recap shape
- themeId
- specVersion
- no additional properties at every nested level

`validateSpec()` must call nested slide and visual validation.

`validateSlide()` must operate on the canonical `SlideSpec`, not a legacy `ParsedSlide` abstraction.

---

# 14. Parser Architecture

`htmlParser.ts` should no longer be the canonical parser name for both formats.

Preferred split:

```text
presentationParser.ts
  parsePresentationArtifact()

jsonPresentationParser.ts
  parsePresentationSpec()

legacyHtmlParser.ts
  parseLegacyHtml()
```

The main parser should inspect the persisted `format` rather than guessing.

HTML parsing should only be used for legacy import/migration.

New JSON data should not be routed through an HTML-oriented parser abstraction.

---

# 15. JSON Rendering Architecture

Create a canonical renderer API:

```tsx
<PresentationSlide
  slide={slide}
  theme={theme}
  viewport={viewport}
  isActive={isActive}
/>
```

`SlideRenderer` must receive the canonical `SlideSpec` directly.

Do not transform `type` into `frame`.

Do not create a second internal schema.

## Layout

The renderer must use responsive CSS.

For 9:16:

```text
headline
subheadline/body
primary visual
supporting equation/callout
```

For 9:8:

```text
split or hybrid composition
```

For 1:1:

```text
hybrid composition
```

Use CSS Grid/Flexbox and `clamp()` rather than fixed canvas dimensions.

Do not merely scale the 9:8 layout into 9:16.

---

# 16. Theme Application

The renderer must consume a resolved theme object.

The AI outputs only:

```json
{
  "themeId": "vercel-dark"
}
```

The application resolves:

```text
themeId
  ↓
ThemeRegistry
  ↓
CSS custom properties
```

The renderer should not rely on direct hex values supplied by AI output.

---

# 17. Motion Architecture

The AI outputs semantic motion only:

```json
"motion": {
  "entry": "blur-fade",
  "emphasis": "highlight-edge",
  "interaction": "none"
}
```

The renderer maps this to application-owned implementations.

Example:

```ts
const entryClass = {
  'blur-fade': 'animate-blur-fade',
  'slide-up': 'animate-slide-up',
  none: ''
}[slide.motion.entry]
```

`isActive` must control activation/restart of the slide's entry animation.

Emphasis and interaction must also have actual implementations.

The AI MUST NOT emit CSS, keyframes, durations, or cubic-bezier values.

---

# 18. Diagram Renderer Requirements

For the neural-network use case, diagram data must support:

- nodes
- directed edges
- highlighted edges
- edge labels
- forward/backward/bidirectional direction
- layer grouping if necessary
- readable labels

The backprop slide must be representable directly as:

```json
{
  "visual": {
    "type": "diagram",
    "data": {
      "direction": "backward",
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

The renderer, not the AI, determines how backward direction is visually drawn.

---

# 19. Equation Rendering

The renderer must deliberately support the equation field.

Recommended:

```text
KaTeX / MathJax / equivalent
```

with a plain-text fallback.

The equation string remains authoritative and is not rewritten.

This is particularly important for technical educational presentations.

---

# 20. Presentation Workspace Refactor

`PresentationWorkspace.tsx` should stop doing format detection with `JSON.parse()`.

Current anti-pattern:

```ts
try {
  JSON.parse(html_content)
} catch {
  iframe
}
```

Replace with persisted format:

```ts
switch (slide.format) {
  case 'json':
    return <PresentationSlide ... />
  case 'html':
    return <HtmlSlide ... />
}
```

The workspace should remain responsible for:

- current slide
- navigation
- aspect ratio
- playback
- code/source view
- presentation selection

It should NOT contain parsing or provider-generation business logic.

---

# 21. HTML Mode Contract

Keep HTML mode, but redefine it precisely.

## New contract

```text
AI
 ↓
ONE self-contained HTML slide artifact
 ↓
backend validates artifact
 ↓
presentation_slides(format='html')
 ↓
iframe / isolated HTML renderer
```

The AI MUST NOT generate slideshow navigation.

No:

- `<nav>` for slide navigation
- `show(i)`
- previous/next presentation controls
- slide counters
- global deck state
- keyboard slideshow navigation

The application owns those things.

The HTML prompt should generate exactly one slide, not an entire slideshow.

---

# 22. JSON Mode Contract

```text
AI
 ↓
PresentationSpec JSON
 ↓
parse
 ↓
validate
 ↓
normalize
 ↓
persist per slide
 ↓
React renderer
```

The top-level PresentationSpec can be the generation response, but persistence should store each slide individually with metadata indicating `format=json` and `spec_version`.

The application should retain presentation-level metadata separately.

---

# 23. Generation Atomicity

Generation of a multi-slide presentation must use a transaction for the persistence phase.

Preferred behavior:

```text
create presentation(status='generating')
        ↓
generate/validate all slides
        ↓
BEGIN TRANSACTION
        ↓
insert all slide rows
        ↓
update presentation(status='ready')
        ↓
COMMIT
```

On failure:

```text
ROLLBACK
presentation(status='failed')
```

Do not save fake “Slide Generation Failed” HTML into the presentation as if it were a valid slide.

If partial generation is intentionally supported in the future, use explicit status and partial metadata rather than error slides.

---

# 24. Presentation Status

Make `status` meaningful.

Use:

```text
'draft'
'generating'
'ready'
'failed'
```

The UI should read the status.

Generation should never end with `ready` if required slides failed validation.

Store an error message separately if useful, e.g. `error_message`.

---

# 25. Import Contract

`presentation:import` must become format-aware.

```ts
presentation.import({
  format: 'html' | 'json',
  artifact: string,
  metadata: ...
})
```

For JSON import:

```text
parse → validate → normalize → persist
```

For HTML import:

```text
validate minimal HTML safety/structure → persist opaque artifact
```

Legacy multi-section HTML import may remain as a migration-only compatibility path.

---

# 26. Editing Contract

The current `update-slide(slideId, htmlContent)` is HTML-specific and must be replaced by a format-aware operation.

Example:

```ts
updateSlide({
  slideId,
  format: 'html',
  content: html
})
```

or:

```ts
updateSlide({
  slideId,
  format: 'json',
  content: SlideSpec
})
```

For JSON slides, validate before saving.

For HTML slides, validate before saving.

Do not expose raw database `html_content` semantics through the frontend API.

---

# 27. Export Architecture

Export must render the same representation the user sees.

## HTML

Existing offscreen BrowserWindow approach can remain, but make it responsive and format-aware.

## JSON

Do NOT load the JSON string into BrowserWindow as HTML.

Use one of:

1. dedicated export window running the React renderer, or
2. capture the actual rendered presentation component in a browser context.

The exported viewport must be determined from the requested aspect ratio:

```text
9:16 → 1080×1920
1:1  → 1080×1080
9:8  → 1080×960
```

Before capture:

```text
document.fonts.ready
↓
wait for renderer stable state
↓
disable or complete entry animations
↓
set deterministic interaction state
↓
capture
```

Export must not depend on an arbitrary `800ms` delay.

---

# 28. Export API

```ts
interface ExportSlideRequest {
  slideId: string
  format?: 'png'
  aspectRatio: '9:16' | '1:1' | '9:8'
  transparent?: boolean
}
```

The export service resolves the slide's persisted format and renders appropriately.

---

# 29. Responsive Contract

The following are composition targets:

```text
9:16 → primary mobile/short-form target
1:1  → square target
9:8  → desktop/reference target
```

The AI prompt may describe intended composition, but the React renderer is responsible for actual responsive behavior in JSON mode.

For HTML mode, responsive behavior remains inside the generated slide artifact because HTML is intentionally a freeform visual artifact.

No fixed `body { width:1080px; height:960px }` contract.

No crop-based adaptation.

No microscopic shrink-to-fit behavior.

---

# 30. New System Prompt

The JSON prompt should be replaced with the following contract.

```text
You are a Principal Presentation Architect and Visual Systems Designer.

You generate ONE structured PresentationSpec as valid JSON.

The host application owns navigation, slide selection, playback, viewport,
responsive rendering, theme resolution, animation implementation, and export.
Your responsibility is to describe the supplied slide content and its visual
intent as structured data.

OUTPUT RULES — NON-NEGOTIABLE

- Output ONLY valid JSON.
- No markdown fences.
- No explanation.
- No commentary.
- No HTML.
- No SVG.
- No CSS.
- No JavaScript.
- No navigation code.
- No invented fields.
- Every object must contain only fields defined by the schema.

CONTENT AUTHORITY — HIGHEST PRIORITY

CONTENT IS IMMUTABLE.
PRESENTATION IS VARIABLE.

The supplied SlidePlan is authoritative for all source-locked content.

You MUST NOT:
- invent new claims when source content exists
- introduce new technical concepts
- replace supplied explanations with your own interpretation
- remove required equations
- remove required relationships
- reorder the conceptual sequence
- change the intended meaning
- replace explicitly supplied On-Screen Text with a new claim

You MAY:
- choose spatial arrangement
- choose typography hierarchy
- choose visual encoding
- convert supplied relationships into structured visual data
- choose semantic motion categories
- adapt layout for 9:16, 1:1, and 9:8

TOPIC-AUTHORING EXCEPTION

When the SlidePlan explicitly indicates that no source slide content exists
and the mode is topic-authoring, you may author explanatory content within
the supplied topic and slide purpose. You still may not introduce unrelated
concepts or change the intended educational scope.

CONTENT PRECEDENCE

1. Explicit On-Screen Text is authoritative visible copy.
2. Explicit equations are verbatim.
3. Explicit visual requirements override fallback visual selection.
4. headlineHint is a constraint, not permission to invent.
5. Frame type controls presentation structure, not content authority.

SLIDE COUNT

Output exactly one SlideSpec for every supplied slide plan entry.
slides.length MUST equal slideCount.
Indices MUST be contiguous starting at 0.

VISUAL SELECTION

When visualHint exists, follow it.
Otherwise choose the primitive according to the concept-to-primitive mapping.
Do not choose a visual solely because it is aesthetically convenient.

STRUCTURED VISUALS

Visuals MUST be represented entirely through the typed data models defined in
VisualSpec. Never emit HTML or SVG.

MOTION

Describe motion semantically only:
- entry: blur-fade | slide-up | none
- emphasis: glow-pulse | highlight-edge | count-up | none
- interaction: step-through | hover-reveal | slider | none

Do not output CSS, keyframes, durations, easing functions, or implementation code.

THEME

Output only the themeId. Do not output theme tokens.

RESPONSIVE COMPOSITION

The primary target is 9:16 vertical short-form content.
The composition must remain valid at:
- 1080×1920
- 1080×1080
- 1080×960

Do not solve vertical layouts by merely shrinking the 9:8 design.
Use the requested layout intent while allowing the host renderer to reflow it.

SCHEMA

Output:

{
  "title": string,
  "slideCount": integer,
  "themeId": "vercel-dark" | "cyberpunk" | "minimalist-mono" | "warm-dark",
  "specVersion": 1,
  "slides": SlideSpec[]
}

SlideSpec:
{
  "index": integer,
  "type": "hook" | "value" | "transition" | "call_to_action" | "visual_only",
  "group": string,
  "headline": string,
  "subheadline"?: string,
  "body"?: string,
  "equation"?: string,
  "badge"?: string,
  "recap"?: string[],
  "layout": "split-left" | "split-right" | "full-bleed" | "minimal",
  "visual": VisualSpec,
  "motion": MotionSpec
}

Before emitting JSON, verify every slide against the supplied plan and verify
that every visual data structure matches its primitive contract.

Output ONLY the JSON object.
```

---

# 31. HTML System Prompt

Replace the old slideshow-oriented HTML prompt with a one-slide artifact prompt.

Core contract:

```text
You generate ONE self-contained HTML slide artifact.

The host application provides slideshow navigation and presentation state.
Do NOT generate navigation, deck state, previous/next controls, slide counters,
keyboard slideshow handlers, or show(i).

Your output is a single valid HTML document containing exactly one slide.

The slide must responsively compose for 9:16, 1:1, and 9:8.

The visual content supplied by the SlidePlan is authoritative.

You may use HTML, CSS, SVG, and JavaScript only for the slide's own visual
behavior and interactions. Never implement slideshow-level behavior.

Output ONLY raw HTML.
```

HTML mode is deliberately freeform. This is its advantage.

---

# 32. Parser Changes

Replace the current `htmlParser.ts` dual-purpose behavior.

## New functions

```ts
parsePresentationArtifact(raw, format)
parseJsonPresentation(raw)
parseLegacyHtml(raw)
```

JSON path:

```text
raw string
 ↓
JSON.parse
 ↓
PresentationSpec schema validation
 ↓
canonical PresentationSpec
```

HTML path:

```text
raw string
 ↓
legacy HTML validation
 ↓
opaque HTML artifact
```

Do not map `type → frame`.

Do not create `ParsedSlide` as a second canonical JSON representation.

---

# 33. Renderer Changes

`SlideRenderer.tsx` must be rebuilt against the shared schema.

Required changes:

1. Import canonical `SlideSpec`.
2. Remove local `SlideData` interface.
3. Remove `any` from visual data.
4. Implement all schema-approved visual types.
5. Implement chart `bar`, `line`, and `area`.
6. Implement diagram direction.
7. Implement unique SVG marker IDs.
8. Implement code `language` and `highlightLines`.
9. Implement interactive-demo inputs/outputs.
10. Implement semantic motion.
11. Implement responsive 9:16/1:1/9:8 layouts.
12. Implement equation rendering.
13. Use theme object or resolved CSS variables consistently.
14. Keep interaction state local to the visual primitive.
15. Never own slideshow navigation.

---

# 34. PresentationWorkspace Changes

Remove:

```ts
JSON.parse(slides[currentSlide].html_content)
```

as a format detector.

Use:

```ts
slide.format
```

and render deliberately.

The workspace should receive normalized presentation data from the service/API.

It should not know the internal JSON persistence representation.

---

# 35. Backend IPC Changes

The following channels remain:

```text
presentation:list
presentation:get
presentation:import
presentation:delete
presentation:archive
presentation:unarchive
presentation:update-slide
presentation:generate
presentation:export-slide
```

But all should delegate to one presentation service.

Remove duplicate inline implementations from `main.ts` once service registration exists.

There must not be both:

```text
main.ts implementation
```

and:

```text
services/presentation/index.ts implementation
```

for the same IPC operation.

---

# 36. Migration Plan

## Phase 1 — Consolidate generation

1. Delete/deactivate duplicate generation implementation.
2. Register exactly one presentation service.
3. Add `presentation` provider routing.
4. Add `outputFormat` to generation request.
5. Route both HTML and JSON through the provider system.

## Phase 2 — Establish persistence format

Add:

```text
format
spec_version
```

to `presentation_slides`.

Keep `html_content` temporarily if needed for backward compatibility.

## Phase 3 — Replace JSON prototype contract

1. Create canonical `spec.ts`.
2. Replace local renderer types.
3. Replace shallow validator.
4. Make parser return canonical spec.
5. Add nested visual validation.

## Phase 4 — Fix renderer

Implement every schema-supported primitive and motion value.

Add responsive composition.

Add equation rendering.

## Phase 5 — Fix export

Export based on stored format and requested aspect ratio.

## Phase 6 — Legacy compatibility

Existing rows with no `format` should be treated as legacy HTML by default.

Do NOT infer JSON by `JSON.parse()` for new records.

Optionally provide a migration command that:

```text
legacy JSON row without format
  ↓
validate
  ↓
format='json'
  ↓
spec_version=1
```

## Phase 7 — Remove legacy assumptions

After all old data paths are verified:

- remove HTML-only update APIs
- remove legacy parser from normal generation
- remove `html_content` naming if a database migration is acceptable
- remove dead generation code

---

# 37. Error Handling

Generation errors must be explicit.

Recommended categories:

```text
NO_PROVIDER
PROVIDER_FAILURE
AI_TIMEOUT
AI_ABORTED
INVALID_JSON
SCHEMA_VALIDATION_FAILED
INVALID_HTML
PERSISTENCE_FAILED
EXPORT_FAILED
```

The frontend should receive a stable error code plus human-readable message.

Do not expose raw provider internals unnecessarily to users.

---

# 38. Testing Requirements

## JSON contract tests

Test:

- valid presentation
- missing title
- invalid slide count
- mismatched slide count
- duplicate indices
- non-contiguous indices
- unknown top-level fields
- unknown nested fields
- invalid visual data
- invalid motion
- invalid layout
- invalid theme

## Renderer tests

One test for every visual primitive.

For diagrams, explicitly test:

```text
forward
backward
bidirectional
highlighted edge
```

For charts:

```text
bar
line
area
```

For interactive-demo:

```text
slider
 toggle
text
```

## Responsive tests

Render every visual/layout combination at:

```text
1080×1920
1080×1080
1080×960
```

Verify no clipping and readable text.

## Generation tests

Mock provider responses for:

- successful HTML
- successful JSON
- malformed JSON
- schema-invalid JSON
- provider timeout
- provider fallback
- deliberate abort
- retry after invalid structured output

## Persistence tests

Verify:

- transaction rollback
- failed generation does not become ready
- format persisted correctly
- version persisted correctly
- legacy rows remain readable

---

# 39. Acceptance Criteria

The refactor is complete only when all of the following are true:

- Auto-generation works end to end.
- HTML generation uses the presentation provider route.
- JSON generation uses the presentation provider route.
- Exactly one presentation generation implementation exists.
- `presentation` exists in provider routing.
- The provider router is not bypassed.
- Parser and validator are in the live generation path.
- Invalid JSON cannot be persisted as valid presentation data.
- Format is explicitly persisted.
- JSON renderer consumes the canonical schema.
- No `type`/`frame` translation remains.
- Motion metadata is actually rendered.
- 9:16 is a first-class rendering target.
- 1:1 and 9:8 remain valid.
- HTML mode remains a freeform visual artifact mode.
- HTML mode has no slideshow navigation logic inside generated artifacts.
- JSON mode supports all values its schema permits.
- Export works for HTML and JSON.
- Export supports 9:16, 1:1, and 9:8.
- Export waits for fonts and a stable rendered state.
- Presentation generation is transactional.
- Failed generation does not produce fake error slides.
- Existing legacy HTML presentations remain viewable.
- Existing archive/delete behavior continues to work.

---

# 40. File-by-File Changes

| File | Change | Priority |
|---|---|---|
| `src/services/presentation/spec.ts` | NEW canonical PresentationSpec, SlideSpec, VisualSpec, MotionSpec and discriminated unions | P0 |
| `src/services/presentation/index.ts` | Make this the single authoritative presentation service; remove legacy dead implementation | P0 |
| `src/main.ts` | Replace inline presentation generation/export handlers with service delegation; remove duplicate handlers | P0 |
| `src/preload.ts` | Update generation/import/update/export request types and payloads | P0 |
| `src/services/providers/router.ts` | Add `presentation` feature | P0 |
| `src/services/providers/types.ts` | Add presentation routing type | P0 |
| `src/services/presentation/prompts.ts` | Replace HTML slideshow prompt; finalize JSON prompt against canonical schema | P0 |
| `src/services/presentation/promptComposer.ts` | Separate authoritative source content from design hints; remove ambiguous content generation behavior | P0 |
| `src/services/presentation/slideValidator.ts` | Replace shallow validation with runtime schema validation | P0 |
| `src/services/presentation/htmlParser.ts` | Convert into compatibility parser or replace with presentation parser architecture | P1 |
| `src/services/presentation/legacyHtmlParser.ts` | NEW optional compatibility parser | P1 |
| `src/features/presentation/SlideRenderer.tsx` | Rebuild against canonical schema; full primitive implementation; motion; responsiveness | P0 |
| `src/features/presentation/PresentationWorkspace.tsx` | Explicit format rendering, remove JSON.parse format guessing, simplify responsibilities | P0 |
| `src/services/presentation/export.ts` | Format-aware export, responsive dimensions, font readiness, deterministic state | P0 |
| `src/features/.../AiPage.tsx` | Add presentation routing configuration | P1 |
| DB initialization/migration | Add `format` and `spec_version`; optionally `content`/`updated_at` | P0 |

---

# 41. Recommended Final Architecture

```text
                         USER
                           │
                           ▼
                PresentationWorkspace
                           │
                           ▼
                    PresentationPlan
                           │
                           ▼
                 PresentationService
                           │
                 outputFormat + request
                           │
                           ▼
                    Provider Router
                           │
                    presentation route
                           │
                           ▼
                       AI MODEL
                           │
                    raw AI response
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
          HTML parser              JSON parser
              │                         │
              ▼                         ▼
       HTML validation          Schema validation
              │                         │
              └────────────┬────────────┘
                           ▼
                      normalization
                           │
                           ▼
                    transactional DB
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
           HTML slide              JSON SlideSpec
              │                         │
              ▼                         ▼
          iframe/artifact          React renderer
                                        │
                               ┌────────┼────────┐
                               ▼        ▼        ▼
                            layout   motion   visuals
                                        │
                                        ▼
                                 responsive viewport
                                        │
                                        ▼
                                Presentation UI
                                        │
                         navigation / playback / export
```

---

# 42. Core Principle

The system should preserve this boundary:

```text
HTML MODE
AI controls HOW the slide is rendered.

JSON MODE
AI describes WHAT should be rendered.

APPLICATION
controls WHICH slide is rendered and WHEN.
```

Neither mode should generate slideshow infrastructure.

The architecture should not force HTML to become JSON, and it should not force JSON to reproduce arbitrary HTML. Each mode exists for a different level of rendering freedom while sharing the same presentation lifecycle, persistence model, navigation system, provider infrastructure, and export contract.

That is the intended stable architecture for Presentation Studio.
