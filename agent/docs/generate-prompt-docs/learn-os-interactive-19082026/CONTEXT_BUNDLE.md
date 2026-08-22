# Context Bundle: Lyceum Learn OS — Visualization Architecture

> For external AI consumption. Self-contained — no repo access needed.

---

## 1. What Is This System?

**DeskFlow** is an Electron + React + SQLite desktop app. One of its major features is **Lyceum Learn** — a structured lesson system where an external AI (ChatGPT/Claude/Gemini via user's API key) generates `.ldoc` lesson files from natural language prompts.

The core insight: instead of asking the AI to emit JSON (which breaks on code fences, trailing commas, etc.), the system asks the AI to emit **Lesson Markdown (.lmd)** — which it's extremely good at — and a **compiler** (parser) turns it into the exact structured format (`.ldoc`) deterministically.

---

## 2. The Rendering Pipeline

```
User prompt
  → learn:buildPrompt (assembles system prompt from templates + learner profile + context brain)
  → External AI generates .lmd (raw lesson markdown)
  → parseLessonMarkdown() compiles .lmd → LdocDocument (structured blocks)
  → validateFull() checks schema + DAG + visual rules + grounding
  → importRaw() saves to SQLite (learn_nodes, learn_blocks, learn_sources tables)
  → ReaderView renders each node's blocks via BlockRenderer
```

---

## 3. Current Block Types (27+)

The parser recognizes these `:::` directive types and inline syntax:

| Block Type | Syntax | What It Renders |
|---|---|---|
| `prose` | Plain markdown text | Rich text with bold/italic/links/tables |
| `math` | `$$...$$` | KaTeX math (inline or display) |
| `code` | ` ```lang ... ``` ` | Syntax-highlighted code (hand-rolled highlighter) |
| `mermaid` | ` ```mermaid ... ``` ` | Mermaid diagrams (flowcharts, sequence, etc.) |
| `svg` / `figure` | `::: figure ... <svg>...</svg> ... :::` | Inline SVG with zoom/pan |
| `image` | `![alt](url)` | Image with caption |
| `chart` | `::: chart {"spec":...} :::` | Vega-Lite charts |
| `table` | `::: table ... :::` or pipe tables in prose | Data tables |
| `flow` | `::: flow sankey ... :::` | Sankey/waterfall flow diagrams |
| `finchart` | `::: finchart ... :::` | Financial candlestick charts |
| `quiz` | `::: quiz mcq L2 ... :::` | MCQ/numeric/open quizzes |
| `callout` | `::: callout info ... :::` | Info/warning/tip callouts |
| `layer` | `::: layer L3 deeper ... :::` | Mastery-gated content layers |
| `widget` | `::: html ... :::` | Embedded HTML/JS/CSS (sandboxed) |
| `viz_concept_map` | `::: viz_concept_map ... :::` | Interactive concept tree |
| `viz_heatmap` | `::: viz_heatmap ... :::` | GitHub-style heatmap |
| `viz_graph` | `::: viz_graph ... :::` | Knowledge graph (force layout) |
| `viz_timeline` | `::: viz_timeline ... :::` | Mastery timeline chart |
| `flashcard` | `::: flashcard ... :::` | Flip cards |
| `layer_reveal` | `::: layer_reveal ... :::` | Step-by-step reveal |
| `whiteboard` | `::: whiteboard ... :::` | Drawing canvas |
| `illustration` | `::: illustration ... :::` | AI-generated illustrations |
| `tutor` | (system-generated) | AI Q&A tutor block |
| `proposal` | (system-generated) | AI proposal/approval |
| `conversation` | (system-generated) | Multi-turn conversation |
| `notes` | (system-generated) | Learner notes |
| `** NEW: annotated-code**` | `::: annotated-code lang ... :::` | Two-pane code + annotation cards |
| `** NEW: annotated-math**` | `::: annotated-math ... :::` | KaTeX math + annotation cards |

---

## 4. What We're Currently Implementing: Visual Grounding

The user's frustration: **"the visualization is separated from the explanation"** — text on one side, diagram on the other, no connection between them.

### 4a. The Annotation Target + Reference System

Any block can declare **targets** (identifiable elements). Prose points at them with `@ref[id]`. On hover/click, both sides highlight.

**Code lines** (`::: annotated-code c`):
```c
uint8_t *bytes = (uint8_t *)&value;  // @cast
bytes[1] = 0xFF;                     // @write
```
→ Parser extracts `// @id` markers as targets (line number + id), strips them for display.
→ Entries after the fence explain each: `@cast: &value takes the address...`

**Math symbols** (`$$...$$` or `::: annotated-math`):
```tex
$$ S_{\text{stride}} = \htmlId{m-stride}{S} = \lfloor \frac{W - K}{P} \rfloor + 1 $$
```
→ `\htmlId{id}{content}` creates an HTML element with that id (KaTeX `trust: true`).
→ Entries after fence: `@m-stride: The stride parameter...`

**SVG parts** (`::: figure <svg>...</svg>`):
→ Parser scans `id="..."` attributes → targets.
→ Every part must have a visible `<text>` label (validator enforces).

**Prose references** (anywhere in text):
→ `@ref[cast]` renders as an amber-dotted underline chip.
→ Hover: highlights the target (code line / math symbol / SVG element).
→ Click: scrolls target into view + flash animation.

### 4b. Shared Hover Context

One `activeRefId` state per node in ReaderView. All blocks in that node share it via props:
- ProseBlock renders `@ref[id]` chips → hover sets activeRefId
- AnnotatedCodeBlock highlights matching code line (amber bg)
- AnnotatedMathBlock highlights matching KaTeX element (`.anno-hot` CSS)
- SvgBlock highlights matching SVG element (`.anno-hot` CSS)
- MathBlock (regular `$$...$$`) also supports hover on `[id]` elements

### 4c. Anti-Decoration Rule (Validator)

The parser/validator enforces that visual blocks are never decorative:
- Every `@ref[id]` must resolve to an actual block target (error if not).
- Every `annotated-code`, `annotated-math`, or `svg` block must be referenced by at least one `@ref` in the node (error if unreferenced — "decoration is a compile error").

### 4d. Clarification Protocol

When the AI is missing critical constraints (goal depth, prior knowledge, display preference), it emits:
```lmd
::: clarify
- question: Do you want to see the full derivation or just the intuition?
- question: Should I use Python or C for the examples?
:::
```
The dialog intercepts this, shows textareas for each question (with VoiceInputWrapper for speech-to-text), and a "remember these preferences" checkbox. Submit → answers appended to the system prompt as `--- LEARNER'S ANSWERS ---` hard constraints.

---

## 5. The Prompt Assembly System

When a user clicks "Generate", the system:

1. **Compose system prompt** (`promptLibrary.ts`):
   - `master-prompt.md` — core rules (now includes: Step 0 mode classification, visual grounding anti-decoration law, clarification protocol)
   - `author-guide.md` — LMD syntax reference (now includes: annotated-code, annotated-math format)
   - `coach-persona.md` — tone/personality
   - `guardrails.md` — safety rules
   - Learner profile block (density, modality bias, math depth, code staging, etc.)
   - Learner knowledge block (known concepts from progress data)

2. **Compose user prompt** (`learn:buildPrompt` IPC):
   - User's topic/description
   - Reference materials (URLs, uploaded text)
   - Knowledge base entries (what the learner already knows)
   - Context Brain retrieval (related episodes, entities, facts)
   - ** NEW: Learner's answers from clarification step**

3. **Send to AI** (`learn:generateLdoc` IPC):
   - AI returns raw `.lmd` text
   - ** NEW: Backend checks for `::: clarify` block → returns structured `{code:'clarification', questions:[...]}` instead of parsing as lesson**

---

## 6. The Widget/HTML System (Existing but Underused)

`::: html` blocks render arbitrary HTML/JS/CSS in a sandboxed `<WidgetHost>`:
- Uses `srcdoc` iframe sandbox (no network, no storage)
- Can embed `<script>` for interactivity
- Can use `document.querySelector` for DOM manipulation
- Can use inline CSS for styling

**Current limitation**: The AI rarely generates rich interactive widgets because:
1. The prompt doesn't explicitly ask for interactive HTML
2. There's no "visual catalog" of available widget patterns
3. No feedback loop showing the AI what rendered successfully

---

## 7. What's Missing (The Gap the User Wants to Fill)

### 7a. Interactive Visual Explanations
Currently: text block → separate diagram block. No arrows, no hover connections.
Goal: **Inline annotations** where explanation text directly references diagram parts (this is what we're implementing now with @ref[target]).

### 7b. Rich HTML/CSS/JS Visualizations
Currently: `::: html` exists but AI rarely generates interactive content.
Goal: A **skill/protocol** that teaches the AI to generate:
- Interactive HTML visualizations (like Gemini Canvas or Claude Artifacts)
- Annotated diagrams with arrows pointing to explanations
- Hover-to-reveal explanations on diagram parts
- Step-by-step animations showing processes
- Interactive code playgrounds within lessons

### 7c. Visual Catalog / Pattern Library
Currently: no reference for the AI to know WHAT interactive patterns are available.
Goal: A catalog of proven visualization patterns the AI can pull from:
- Code flow diagrams with step-through animation
- Before/after memory layouts
- Interactive matrix operations
- Animated algorithm visualizations
- Side-by-side comparisons with synchronized scrolling

### 7d. Math + Code Visualization
Currently: KaTeX renders math, but no connection to code.
Goal: **Annotated math** where hovering over a formula symbol highlights the corresponding variable in code, and vice versa. This is what `::: annotated-math` + `::: annotated-code` with `@ref` targets achieves.

---

## 8. Architecture Constraints

- **No server-side rendering**: All visualization runs in the Electron renderer (Chromium).
- **No npm installs during conversation**: All UI components must use what's already in `src/components/learn/blocks/`.
- **External AI only**: The system sends prompts to user-configured AI providers (OpenRouter, Ollama, etc.). We can't modify the AI itself — only the prompts and the post-processing.
- **Security**: `::: html` widgets run in sandboxed iframes. No `eval()`, no network, no storage.
- **Line endings**: All source files are CRLF. Preserve them.
- **Lucide icons**: `Loader2` and `Globe2` are runtime aliases but missing from type defs. Prefer `LoaderCircle` and `Globe`/`Earth` in new code.

---

## 9. Key Files Reference

### Parser + Compiler
- `src/services/learn/parseLessonMarkdown.ts` — .lmd → LdocDocument compiler (923 lines)
  - `extractRefs(md)` — extracts @ref[id] tokens from prose
  - `extractMathTargets(tex)` — extracts \htmlId{id} targets from KaTeX
  - `extractSvgTargets(svg)` — extracts id="..." from SVG
  - Directive dispatch at L297 (handles all `:::` types)

### Validator
- `src/services/learn/validator/validate.ts` — schema + semantic checks (275 lines)
  - `checkVisualGrounding(doc)` — NEW: refs-resolve + anti-decoration rules
  - `checkVisual(doc)` — mastery >= L2 requires visual block
  - `checkFactGrounding(doc)` — must_know.source_id must resolve

### Renderer
- `src/components/learn/ReaderView.tsx` — per-node rendering, manages activeRefId state
- `src/components/learn/blocks/BlockRenderer.tsx` — dispatches to typed block components
- `src/components/learn/blocks/ProseBlock.tsx` — renders markdown with @ref chip support
- `src/components/learn/blocks/AnnotatedCodeBlock.tsx` — NEW: two-pane code + annotations
- `src/components/learn/blocks/AnnotatedMathBlock.tsx` — NEW: KaTeX + annotations
- `src/components/learn/blocks/MathBlock.tsx` — KaTeX with trust:true + hover wiring
- `src/components/learn/blocks/SvgBlock.tsx` — SVG with hover wiring
- `src/components/learn/blocks/CodeBlock.tsx` — hand-rolled syntax highlighting

### Prompt Assembly
- `resources/learn/prompts/master-prompt.md` — core AI rules (Step 0 modes, grounding law, clarification)
- `resources/learn/author-guide.md` — LMD syntax reference
- `src/services/learn/promptLibrary.ts` — `composeAuthorSystemPrompt()` assembles system prompt
- `src/services/learn/index.ts` — `learn:buildPrompt` + `learn:generateLdoc` handlers

### Types
- `src/shared/learn/types.ts` — all block types, LdocNode (with refs), LdocDocument, LearnerProfile (with teachMode)

### Profile
- `src/components/learn/LearnerProfilePanel.tsx` — settings UI (density, modality, math depth, etc.)
- `src/services/learn/learnerProfile.ts` — profile CRUD

### Dialog
- `src/components/learn/CreateLessonDialog.tsx` — 3-step flow (Describe → Prompt → Result), now with System Prompt viewer button and clarification step

---

## 10. The User's Vision (From Their Words)

> "I would like you to create a skill which allows the AI to generate visualizations like Gemini's Canvas or Claude's Artifacts — properly transferring input into HTML visualizations with LaTeX parsing. The system relies on external AI, and we can't modify the AI itself, so we need to evolve our prompt + post-processing pipeline.

> The visualization should contain the explanation WITHIN it — arrows pointing from explanation to illustration part, not just text THEN visualization. The interactability of HTML visualizations is one of the most important things.

> Not every explanation needs to be interactive, but the ones that rely on JavaScript should be properly implemented."

**In short**: The visual grounding system we're building (annotated blocks + @ref targets + anti-decoration validator) is the foundation. The next step is teaching the AI to generate rich interactive HTML visualizations with inline annotations — not just static diagrams with separate text.
