# Lyceum Visual System — Implementation Plan (code-anchored)

> Hand this file to the coding agent. It maps the *Visual System Handoff* onto the **actual** Lyceum codebase, with real file paths, function names, and insertion points. It is written as **additive steps** because the hard part — the `:::` container parser — already exists.

**Honesty / scope caveats (read first):**
- This is anchored to the `src_v2` snapshot. Line numbers may have drifted after your last agent run, so every step names the **symbol/function/string to search for**, not just a line.
- Two things I could **not** fully verify and the agent must confirm on the real repo: (a) the exact location of the *authoring* generation call (the `src/services/learn/ai/` folder is empty in the snapshot — see §0), and (b) the app's installed viz dependencies (I could only confirm `katex`; `mermaid` is clearly used). Treat §0 and §8 as "locate then apply."

---

## The good news — what already exists (don't rebuild these)

Grounded in the snapshot:

1. **`:::` directive parser already works.** `src/services/learn/parseLessonMarkdown.ts` → `parseBlocks()` already matches `const dir = ln.text.match(/^:::\s+(\w+)\s*(.*)$/)`, captures `kind` + inline `args`, and collects the block body up to a closing `:::` with **depth tracking**. It currently dispatches `grounding`, `callout`, `quiz`, `layer`. **New blocks = new branches here.** This is exactly the `:::` convention the Handoff §4–5 asks for.
2. **Node splitter is fence/directive aware.** The same file skips headings inside code fences, `$$…$$`, and `:::` blocks (`directiveDepth`), so a JSON chart spec with `#`/braces inside a `::: chart` block will **not** break node splitting.
3. **Block union + renderer dispatch + graceful fallback exist.** `shared/learn/types.ts` (`BlockType`, `LdocBlock`), `components/learn/blocks/BlockRenderer.tsx` (a `switch (block.type)` with a `default → <UnsupportedBlock>`), and `widget` already routes to `WidgetHost`.
4. **Validator with a visual rule exists.** `services/learn/validator/validate.ts` → `checkVisual()` uses `visualTypes = new Set(['mermaid','image','widget','math'])`; the compiler mirrors it in `VISUAL_TYPES` (`parseLessonMarkdown.ts`). Both must be extended (§4).

**Implication:** adding a block type is a fixed 6-touch recipe (§3). The genuinely new work is Phase 0 (transport), the widget sandbox (§5), and the auto-correct/self-heal loop (§6).

---

## §0. Phase 0 — the transport bug (BLOCKER, do first)

Handoff §2 is correct and non-negotiable: a valid `.lmd` can never be valid JSON (`---`, ``` fences, `\`, `#`). Authoring must read model output as a **UTF-8 text blob** and call the compiler, never `JSON.parse`.

**Where to look (confirm on the real repo — the snapshot's `services/learn/ai/` is empty, so the authoring call lives elsewhere):**
- `src/services/AIService.ts` line ~100: `return JSON.parse(cleaned) as T;` — a generic "parse model output as JSON" helper. If the lesson-authoring "Generate Here" path calls this, that is the bug.
- `src/services/learn/index.ts` lines ~42–49: `JSON.parse(candidate)` / `JSON.parse(cleaned)`. Determine whether this is the **paste-`.ldoc`** path (legitimate — user pastes finished JSON) or the **authoring** path (bug). Keep JSON parsing ONLY for the paste-a-finished-`.ldoc` import; remove it from authoring.
- The "Generate Here" button in `components/learn/CreateLessonDialog.tsx` — trace what it does with the model response.

**Fix:**
1. On the authoring model call, remove any `response_format: { type: 'json_object' }` / "JSON mode".
2. Read the response body as raw text; if streaming, concatenate raw text deltas (never parse chunks).
3. Pipe that raw string straight into the compiler: `compileLmdToLdoc(text)` (that's what `parseLessonMarkdown.ts` is — confirm/normalize the exported name; add a `compileLmdToLdoc` alias if the current export differs).
4. If any transport envelope is needed, send `text/plain`, never JSON.

**Acceptance (from Handoff §2):** a `.lmd` starting with `---` frontmatter and containing a Mermaid block, a `$$ \mathbf{x} $$` math block, and `#` headings compiles end-to-end with **zero** JSON errors. Add this as a test in `services/learn/__lmd_verify.ts` (that harness already exists).

---

## §1. The 6-touch recipe for every new block type

For each new block (`chart`, `finchart`, `flow`, `table`), apply the same six edits. Do them as a unit so nothing renders as "unsupported."

1. **Type** — `shared/learn/types.ts`: add the literal to `BlockType` (line ~4) and a matching `interface XBlock extends BaseBlock { type: 'x'; spec: … }` added to the `LdocBlock` union (lines ~36–46). Keep the body as an opaque `spec: string` (raw) **plus** an optional parsed field, so a bad spec still round-trips.
2. **Parser** — `parseLessonMarkdown.ts` → `parseBlocks()`: add an `else if (kind === 'chart') blocks.push({ id: id(), type: 'chart', spec: inner.map(l => l.raw).join('\n').trim() })` branch alongside the existing `grounding/callout/quiz/layer` dispatch. The `:::` capture already gives you `kind`, `args`, and `inner`.
3. **Renderer** — new `components/learn/blocks/ChartBlock.tsx`; register a `case 'chart': return <ChartBlock {...sharedProps} block={block} />;` in `BlockRenderer.tsx`. Unknown types already fall through to `<UnsupportedBlock>` — that IS the graceful-degradation path (Handoff §3.6); make each renderer also catch its own parse/render error and show raw spec + message rather than throwing.
4. **Validator** — `validator/validate.ts`: add a `checkChart()` (etc.) that parses the spec and returns repair-oriented issues (§6). Call it from `validateFull()` next to `checkVisual`/`checkFactGrounding`.
5. **Visual rule** — extend BOTH sets so the block counts (or not) per Handoff §4: add `chart`, `finchart`, `flow`, `diagram` to `visualTypes` in `checkVisual()` **and** `VISUAL_TYPES` in the compiler. **Do NOT add `table`** — Handoff §4 says a table is data, not a visual, and must not satisfy the L2+ rule.
6. **Manifest** — add the block's `:::` grammar + one canonical example to the capabilities manifest (§7) so the authoring model emits correct syntax.

---

## §2. Block taxonomy → concrete engines & specs

Implement in the phase order of §9. Each body is opaque text handed to that block's spec parser (Handoff §5).

| Block | Engine | Spec body | Visual? | Renderer notes |
|---|---|---|---|---|
| `diagram` | **Mermaid (already integrated)** | Mermaid text | Yes | This is the existing ``` `mermaid ` block. Optionally also accept `::: diagram`. Apply the mermaid **width-normalization fix** (see §2a) — diagrams currently render tiny. |
| `chart` | **Vega-Lite** (`vega-embed`) | Vega-Lite JSON | Yes | Parse JSON body; `vegaEmbed(el, spec, { actions:false, renderer:'svg' })`. SVG renderer = deterministic + offline. |
| `table` | **Tabulator** | `columns:` / `rows:` / `options:` (YAML-ish) | **No** | Sortable/filterable grid. Does not satisfy L2+ visual rule. |
| `flow` | **Mermaid sankey / waterfall** | `::: flow sankey` + CSV-ish edges | Yes | Reuse the Mermaid engine; transform the compact edge list into Mermaid `sankey-beta` source. |
| `finchart` | **TradingView Lightweight Charts** (~35KB) | declarative OHLC (`type:`, `indicators:`, `data:`) | Yes | Parse to series objects; never eval JS. Pan/zoom is the reason it earns its own block. |
| `widget` | **template library** (JSXGraph/D3/Lightweight Charts) | `template:` id + `params:` | Yes | Already routes to `WidgetHost`; build out the template registry (§5). |

Keep `math` (KaTeX) and `image` as-is; both still count as visuals.

### §2a. Fix Mermaid rendering while you're here
Diagrams currently render shrunken. In `blocks/MermaidBlock.tsx`, after `containerRef.current.innerHTML = svg`, normalize the injected SVG (mermaid pins its own pixel `max-width`):
```ts
const el = containerRef.current.querySelector('svg');
if (el) { el.removeAttribute('height'); el.style.maxWidth = '100%'; el.style.width = '100%'; el.style.height = 'auto'; el.setAttribute('preserveAspectRatio','xMidYMid meet'); }
```
and set `flowchart:{ useMaxWidth:true }, sequence:{ useMaxWidth:true }` in `mermaid.initialize`. New `chart`/`finchart` renderers should use the same "fill container width" discipline.

---

## §3. Spec parsers — keep them boring and forgiving
- `chart`: `JSON.parse(body)`. On failure → repair error (§6). Do **not** let a bad chart throw past the renderer.
- `table` / `finchart` / `flow` / `widget`: bodies are simple key/list DSLs (Handoff §5). Write tiny hand-rolled line parsers (they already exist in spirit — `parseGrounding`/`parseQuiz` in `parseLessonMarkdown.ts` are the pattern to copy). Avoid pulling in a YAML dep for a 6GB budget; a 30-line `key: value` + `- [..]` reader is enough.
- Store both the raw `spec` string and the parsed object on the block; the renderer prefers parsed, falls back to showing raw + error.

---

## §4. Widget template system (interactivity without eval) — Handoff §6
- `WidgetHost` already exists; give it a **registry**: `Record<templateId, { schema, Component }>`.
- Ship the 6 starter templates as sandboxed offline components: `lbo-return-model`, `break-even`, `supply-demand`, `recipe-scaler`, `ta-playground`, `function-explorer`.
- The authoring model emits only `template:` + `params:` — **never JS**. The compiler/validator checks `template` exists and `params` match its declared JSON schema (reuse the ajv setup already in `validator/validate.ts`, which reads a schema via `JSON.parse(fs.readFileSync(schemaPath))`).
- Render params as **data**, in a locked-down component (no network, no `eval`, no `new Function`). Mastery-tier it: static form at low `@mastery`, interactive widget at L3+.

---

## §5. Validator + auto-correct + self-heal — Handoff §7
Insert a **forgiving pre-parser** before the strict compiler, then repair-oriented validation, then one self-heal retry.

**Forgiving pre-parser (new function, run before `parseLessonMarkdown`):**
- Strip an accidental outer ``` fence if the whole doc is wrapped (you hit this exact `” ```python ” leaked in"` bug before).
- Normalize smart quotes / en-dashes / non-breaking spaces to ASCII.
- Auto-close a `:::` block at the next `#` node heading if the author forgot the closing `:::` (the node-splitter already tracks `directiveDepth`, so you can detect an unclosed block cheaply).
- Fuzzy-match `@prereq` targets to the nearest existing node id (warn, don't fail).

**Strict validator (extend `validateFull`):** per-block spec checks (§1.4) with **repair-oriented** messages, not just diagnostics:
> ❌ `line 42: invalid chart`
> ✅ `line 42: chart spec missing "encoding.x.field". Add e.g. "x": {"field":"yr","type":"quantitative"}.`

Surface these per-block in the existing `ValidationReport` UI (`components/learn/ValidationReport.tsx`) — you already have the component; just feed it the new issues.

**Self-heal loop:** on validation failure, send *only the failing block + its repair-oriented error* back to the authoring model **once**. If it still fails → graceful degrade (render raw spec + inline error). Put this in `services/learn/services/import.service.ts` (renderer-triggered; **no new IPC**, per Handoff constraints).

---

## §6. Capabilities manifest injection — Handoff §8 (highest ROI for accuracy)
- Create `resources/learn/capabilities-manifest.md` (or a `.ts` constant): for **every** block type, its `:::` grammar + exactly **one** canonical few-shot example (copy §5 of the Handoff verbatim).
- Inject it into the authoring model's **system prompt** — extend the existing `composeAuthorSystemPrompt` in `services/learn/promptLibrary.ts` (that composer already exists from the earlier features work).
- Rule: whenever a block is added/changed, update the manifest in the same commit. One source of truth so the prompt never drifts.

---

## §7. Dependencies & offline budget — Handoff §9
Add (all client-side, offline, small): `vega`, `vega-lite`, `vega-embed`; `tabulator-tables`; `lightweight-charts`; and for widgets `jsxgraph` and/or `d3`. `mermaid` and `katex` are **already** in the app. 
**Do not** bundle Manim/Plotly (heavy); for animation, pre-render to video/GIF offline and use the existing `image`/`video` blocks. Defer D2 (needs Go/WASM). Verify the total stays within the ~6GB desktop budget. Render everything to **SVG/canvas with `renderer:'svg'`, `actions:false`, no network at render time**.

---

## §8. Phased rollout & acceptance — Handoff §10
- **Phase 0 (blocker):** §0 transport fix. Acceptance = the mixed `---`/mermaid/`$$`/`#` doc compiles with zero JSON errors.
- **Phase 1:** `:::` parser branches (already 80% there) + `chart` (Vega-Lite) + `table` (Tabulator) + repair-oriented validator + manifest injection + the Mermaid width fix (§2a). Mermaid `diagram` already works.
- **Phase 2:** `flow` (sankey/waterfall) + `finchart` (Lightweight Charts) + graceful degradation + self-heal retry.
- **Phase 3:** `widget` template registry + the 6 starter templates + mastery-tiered interactivity.
- **Acceptance per phase (non-math domain, per Handoff):** author a real lesson e.g. a PE distribution waterfall + a valuation-comps table, or a cooking timeline + a `recipe-scaler` widget, and confirm it compiles and renders **offline with zero manual fixes**.

---

## §9. Guardrails — Handoff §11 (enforce in validator + prompt)
- Authoring AI emits **specs and template params only** — never raw HTML/JS/CSS. Add a validator reject for `<script`, `javascript:`, `onerror=`, etc. in any spec body.
- Never reintroduce JSON as the `.lmd` transport (§0).
- New blocks use `:::`, never nested triple-backtick fences.
- No render-time network. No per-subject block types — keep the taxonomy form-based.

---

## §10. Definition of done
- [ ] Phase 0 acceptance test green in `__lmd_verify.ts`.
- [ ] `chart`, `finchart`, `flow`, `table` each: type + parser branch + renderer + validator + visual-set (except `table`) + manifest entry.
- [ ] Mermaid renders full-width; new visuals fill container.
- [ ] Bad spec → inline raw + repair message, never a crash/blank lesson.
- [ ] Widget registry with 6 templates; params validated against schema; no eval/network.
- [ ] Capabilities manifest injected into `composeAuthorSystemPrompt`; updated alongside any block change.
- [ ] A non-math lesson authored end-to-end, offline, zero manual fixes.
