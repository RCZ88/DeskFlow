# Lyceum — Visuals Engineering Upgrade

**Scope:** Fix the four rendering complaints (broken tables, shrunken Mermaid, overflowing math/wide notation, missing real images) and design a durable, *reliable* path for rich visuals + animation. This is a build-ready spec anchored to the real code in `src/`. Apply top-to-bottom; Part 1 is surgical (ship today), Parts 2–4 are the strategic upgrade.

---

## Part 0 — Root-cause diagnosis (verified against the code)

| # | Symptom | Root cause (file:line) | Fix |
|---|---------|------------------------|-----|
| 1 | "Table parsed from JSON not rendered" — shows raw `\| Role \| ... \|` pipes | The `.lmd` parser only builds a `table` block from a `::: table` directive with a bespoke `- [title\|field]` column syntax (`parseLessonMarkdown.ts` ~L259–274). A **plain GitHub-style Markdown table** authored in prose is never detected, so it lands in a `prose` block. `ProseBlock.renderMarkdown()` (`ProseBlock.tsx`) handles only bold/italic/code/headers/links and turns every `\n` into `<br/>` — so the pipes render as literal text. | Detect pipe tables in the parser → emit real `table` blocks (1A). Also render inline tables in prose as a safety net (1D). |
| 1b | Inline `$a_{\text{rule}}$` shows as raw TeX in prose | `ProseBlock.renderMarkdown()` has no inline `$...$` KaTeX pass. Only standalone `$$...$$` becomes a `math` block. | Add inline KaTeX to ProseBlock (1D). |
| 2 | Mermaid box is big but the diagram is tiny; can't resize | `MermaidBlock.tsx` initializes mermaid with `flowchart:{useMaxWidth:true}`. With `useMaxWidth:true`, mermaid writes an inline `style="max-width:<natural>px"` onto the `<svg>` equal to the diagram's *natural* width. The component then sets `svg.style.width='100%'`, but the inline `max-width` cap wins → a small graph is locked to its small natural width inside a full-width container. There is also no zoom/pan. | Kill the max-width cap + add zoom/pan/fit + fullscreen (1B). Same bug affects `FlowBlock.tsx`. |
| 3 | Wide math / notation overflows the fixed centered column and clips on the right | `MathBlock.tsx` container is `text-center` with **no `overflow-x`**; display math wider than the reader column is clipped. The reader content column is a fixed narrow measure (prose is `max-w-[68ch]`), and visual blocks inherit that width with no "breakout". | Make math horizontally scrollable + left-align when wide (1C); give visual blocks a wider "breakout" width than prose (1E). |
| 4 | "No images at all, only mermaid charts" | `ImageBlock.tsx` works, but an `image` block requires a real `url` (`![alt](url)` in `author-guide.md`). **The model cannot invent working image URLs**, so it never emits usable images — and `master-prompt.md` explicitly tells it to "use a `mermaid` block for ANY structure", so *everything* becomes Mermaid. The sandboxed HTML `widget` path (`WidgetHost.tsx`, `sandbox="allow-scripts"`) exists but is **not exposed** to the author, so custom/animated visuals are never authored. | New model-authorable visual primitives: inline **SVG figures** + **sandboxed HTML/animation widgets**, plus a real asset path for photos, and prompt changes so the model actually uses them (Parts 2–4). |

**Bottom line:** the renderers are mostly fine; the failures are (a) three small CSS/parse bugs and (b) a *content-generation* gap — the model has no reliable way to produce anything except Mermaid, so that's all you see.

---

## Part 1 — Surgical fixes (ship immediately)

### 1A. Detect plain Markdown tables in the parser → real `table` blocks

In `src/services/learn/parseLessonMarkdown.ts`, inside the block-collection loop (the same place that handles `![img]`, fences, `$$`, and `:::` directives), add a GitHub-table detector **before** the line falls through to prose. A pipe table = a header row `| a | b |`, a divider row `| --- | :--: |`, then ≥1 body rows.

```ts
// --- GitHub-style Markdown table:  | h | h |  /  | --- | --- |  /  rows
const isTableRow = (s: string) => /^\s*\|(.+)\|\s*$/.test(s);
const isDivider  = (s: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s);
if (isTableRow(ln.text) && i + 1 < lines.length && isDivider(lines[i + 1].text)) {
  const splitCells = (s: string) =>
    s.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const headers = splitCells(ln.text);
  i += 2; // consume header + divider
  const bodyRows: string[][] = [];
  while (i < lines.length && isTableRow(lines[i].text)) {
    bodyRows.push(splitCells(lines[i].text));
    i++;
  }
  i--; // loop will ++ again
  const columns = headers.map((title, idx) => ({ title, field: `c${idx}` }));
  const rows = bodyRows.map((cells) => {
    const row: Record<string, unknown> = {};
    headers.forEach((_, idx) => { row[`c${idx}`] = cells[idx] ?? ''; });
    return row;
  });
  blocks.push({ id: id(), type: 'table', columns, rows });
  continue;
}
```

Notes:
- Place this check **before** the generic prose accumulation and after the fence check (so `| x |` lines inside code fences are untouched — the existing `fence` guard already protects them).
- Cell contents keep inline Markdown; `TableBlock` renders them as text. If you want bold/links inside cells, run the same `renderInline()` from 1D on each cell and use Tabulator's `formatter:'html'`.
- Keep the existing `::: table` directive working for typed/interactive data; this just also accepts the format the model naturally writes.

### 1B. Fix Mermaid sizing + add zoom / pan / fit / fullscreen

Replace the render/effect body in `src/components/learn/blocks/MermaidBlock.tsx` so the SVG fills width and is interactively zoomable. Key changes: (1) do **not** rely on `useMaxWidth`; strip mermaid's inline `max-width` and `style` width cap; (2) read the intrinsic `viewBox` and let the SVG scale to container width; (3) add a lightweight zoom/pan wrapper.

```ts
mermaid.default.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: { useMaxWidth: false, htmlLabels: true },   // <-- was true
  sequence: { useMaxWidth: false },
});
// ...after render:
const svgEl = containerRef.current.querySelector('svg');
if (svgEl) {
  svgEl.removeAttribute('height');
  svgEl.removeAttribute('width');
  svgEl.style.removeProperty('max-width');   // kill mermaid's natural-width cap
  svgEl.style.width = '100%';
  svgEl.style.height = 'auto';
  svgEl.style.maxWidth = 'none';
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}
```

Add a reusable **`<ZoomPan>`** wrapper (also use it for SVG figures, Part 3) — wheel-to-zoom, drag-to-pan, buttons for `+ / − / fit`, plus the existing expand-to-fullscreen:

```tsx
// src/components/learn/blocks/ZoomPan.tsx
import React, { useRef, useState, useCallback } from 'react';
import { Plus, Minus, Maximize2, Scan } from 'lucide-react';

export function ZoomPan({ children, minH = 220 }: { children: React.ReactNode; minH?: number }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [full, setFull] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const clamp = (v: number) => Math.min(4, Math.max(0.25, v));
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) return; // let page scroll unless zoom-intent
    e.preventDefault();
    setScale((s) => clamp(s * (e.deltaY < 0 ? 1.1 : 0.9)));
  }, []);
  const reset = () => { setScale(1); setTx(0); setTy(0); };
  return (
    <div className={full ? 'fixed inset-4 z-50 bg-zinc-900 rounded-xl border border-zinc-700 flex flex-col' : 'relative'}>
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button onClick={() => setScale((s) => clamp(s * 1.2))} className="p-1 rounded bg-zinc-800/80 text-zinc-300 hover:text-white"><Plus className="w-3.5 h-3.5" /></button>
        <button onClick={() => setScale((s) => clamp(s / 1.2))} className="p-1 rounded bg-zinc-800/80 text-zinc-300 hover:text-white"><Minus className="w-3.5 h-3.5" /></button>
        <button onClick={reset} className="p-1 rounded bg-zinc-800/80 text-zinc-300 hover:text-white" title="Fit"><Scan className="w-3.5 h-3.5" /></button>
        <button onClick={() => setFull((f) => !f)} className="p-1 rounded bg-zinc-800/80 text-zinc-300 hover:text-white"><Maximize2 className="w-3.5 h-3.5" /></button>
      </div>
      <div
        className="overflow-hidden cursor-grab active:cursor-grabbing flex-1"
        style= minHeight: full ? undefined : minH 
        onWheel={onWheel}
        onMouseDown={(e) => { drag.current = { x: e.clientX - tx, y: e.clientY - ty }; }}
        onMouseMove={(e) => { if (drag.current) { setTx(e.clientX - drag.current.x); setTy(e.clientY - drag.current.y); } }}
        onMouseUp={() => { drag.current = null; }}
        onMouseLeave={() => { drag.current = null; }}
      >
        <div style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: 'center top', transition: drag.current ? 'none' : 'transform 0.08s' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

Then wrap the mermaid mount div: `<ZoomPan><div ref={containerRef} /></ZoomPan>`. Apply the identical `useMaxWidth:false` + strip fix to **`FlowBlock.tsx`** (it renders via mermaid too).

### 1C. Fix math overflow (scroll + left-align when wide)

In `src/components/learn/blocks/MathBlock.tsx`, wrap the KaTeX target in a horizontal-scroll container and stop forcing center when the formula is wider than the column:

```tsx
<div className="my-6 py-4 px-6 rounded-xl bg-zinc-800/30 border border-zinc-700/40 group relative" data-block-id={block.id}>
  <div className="overflow-x-auto">
    {/* katex renders here; inline-block so wide content scrolls instead of clipping */}
    <div ref={containerRef} className="katex-scroll inline-block min-w-full text-center text-lg text-zinc-100 min-h-[2rem]" />
  </div>
  ...
</div>
```

Add once to global CSS so long equations never clip and scroll smoothly on trackpads:

```css
.katex-scroll { -webkit-overflow-scrolling: touch; }
.katex-scroll .katex-display { margin: 0; overflow-x: auto; overflow-y: hidden; padding-bottom: 4px; }
.katex-display > .katex { white-space: nowrap; }
```

### 1D. Inline Markdown tables + inline math in ProseBlock (safety net)

In `src/components/learn/blocks/ProseBlock.tsx`, upgrade `renderMarkdown()`:
- Before the `\n → <br/>` step, detect contiguous pipe-table line runs and emit real `<table>` HTML (so any table the parser missed still renders as a table, not raw pipes).
- Add an inline `$...$` → KaTeX pass (render with `katex.renderToString(tex, { throwOnError:false })`), and **skip** `$` inside inline `` `code` `` spans.

```ts
// inline math (after code spans are protected):
text = text.replace(/(?<!\\)\$([^$\n]+?)\$/g, (_m, tex) => {
  try { return katex.renderToString(tex, { throwOnError: false, displayMode: false }); }
  catch { return _m; }
});
```

```html
<!-- table styling -->
<table class="w-full my-4 text-[0.95rem] border-collapse">
  <thead><tr class="border-b border-zinc-600">…<th class="text-left py-2 px-3 font-semibold text-zinc-100">…</th></tr></thead>
  <tbody>…<tr class="border-b border-zinc-800"><td class="py-2 px-3 text-zinc-300">…</td></tr></tbody>
</table>
```

(Import KaTeX at top of ProseBlock; it's already a dependency via MathBlock.)

### 1E. Let visuals be wider than the prose column ("breakout")

The prose measure is intentionally narrow (`max-w-[68ch]`) for readability, but diagrams/tables/math shouldn't inherit it. In the reader, render **prose** inside the narrow measure but **visual blocks** (mermaid, chart, flow, finchart, table, image, widget, svg, math) at a wider container (e.g. `max-w-[min(100%,60rem)]` centered). Simplest implementation: in `BlockRenderer`, tag visual blocks with a `data-wide` wrapper and set the reader's block list to `items-center` with prose constrained via its own `max-w-[68ch]` (already the case) while wide blocks use `w-full max-w-4xl`. This removes the "hardcoded fixed width that clips" feeling.

---

## Part 2 — Strategy: how to do images & animation *reliably*

**The core question you asked — "why not just use HTML? is it too unreliable?"** Answer: **HTML/JS is reliable *if and only if* it's sandboxed and size-contracted.** You already do this correctly in `WidgetHost` (`<iframe sandbox="allow-scripts">` + blob URL, no `allow-same-origin`, so it can't touch your app, cookies, or filesystem). The risk with arbitrary AI HTML isn't security (the sandbox handles that) — it's *layout jank* (unbounded height, off-theme colors, runaway scripts). We fix that with a **contract**, not by banning HTML.

**Why not AI raster image generation as the primary path?** Research consensus (StarVector, AutomaTikZ/DeTikZify, DiagramEval) is clear: for **technical/educational** figures, LLM-authored **vector/code** (SVG, TikZ, diagram-as-code) beats text-to-raster models — raster models hallucinate labels, can't be themed, don't scale crisply, and cost/latency are high. Raster generation is only worth it for *photographic/decorative* imagery, and even then you'd vectorize or cache it. So:

### Recommended visual stack (by intent)

| Need | Primary tool | Why | Reliability |
|------|--------------|-----|-------------|
| Structure / flow / architecture / trees | **Mermaid** (fixed per 1B) | Already wired, deterministic, themed | High |
| Data charts (bar/line/scatter/dist) | **Vega-Lite** (`chart` block, already wired) | Declarative JSON, `width:'container'` responsive | High |
| Custom static illustration / labeled figure / geometry | **Inline SVG figure** (NEW, Part 3) | Model authors SVG code = scalable, themeable, on-brand, no URL needed | High (sanitized) |
| Animation / interactivity / simulation | **Sandboxed HTML widget** (existing `widget kind:'html'`, exposed in Part 4) | CSS/SVG/JS animation in an isolated iframe | High (contracted) |
| Real photographs / textbook plates | **`image` block via an asset pipeline** (Part 3C) | Model can't invent URLs → give it a real image-search/generate tool at author time | Medium |

### Animation: what to actually use (from the research)

- **Default = CSS keyframes + SVG (SMIL/CSS) inside the sandboxed HTML widget.** Zero extra dependency, deterministic, themeable with our tokens, GPU-friendly. Great for "animate the forward pass", "gradient descent stepping", "tokens flowing through attention", etc. This is the workhorse.
- **Optional JS motion = `anime.js` (tiny) or GSAP** bundled *once* and made available inside the widget iframe for path/morph/timeline animation. Add only if CSS/SVG proves limiting.
- **Lottie / Rive:** great for *designer-made* motion, but the model can't reliably hand-author Lottie JSON or Rive state machines — skip for AI authoring; keep as a manual-asset option only.

So: **SVG-first for stills, sandboxed-HTML-with-CSS/SVG-animation for motion.** That directly answers "can we use HTML": yes, it's the animation engine.

---

## Part 3 — New syntax + block types

### 3A. `svg` figure block (model-authored inline SVG)

**Authoring syntax** (add to `.lmd`):

```
::: figure Backprop through one neuron
<svg viewBox="0 0 480 240" role="img" aria-label="...">
  ... paths/text using currentColor & CSS vars ...
</svg>
:::
```

**Type** (`src/shared/learn/types.ts`): add `'svg'` to `BlockType` and

```ts
export interface SvgBlock extends BaseBlock { type: 'svg'; svg: string; caption?: string; }
```

Add `SvgBlock` to the `LdocBlock` union and to `VISUAL_TYPES` in the parser + `validateFull()` visual rule.

**Parser** (`parseLessonMarkdown.ts`): handle `::: figure <caption>` by capturing the inner block until `:::` and emitting `{ type:'svg', svg: inner, caption }`. If the inner content is *not* an `<svg>` (model wrote HTML), route it to a `widget kind:'html'` instead (be forgiving).

**Renderer** `src/components/learn/blocks/SvgBlock.tsx` — **sanitize** with DOMPurify (SVG profile) to strip scripts/handlers, force responsive sizing, wrap in `ZoomPan`:

```tsx
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(block.svg, {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['script', 'foreignObject'], FORBID_ATTR: ['onload', 'onclick'],
});
// inject width:100%;height:auto and themable currentColor
return (
  <figure className="my-6" data-block-id={block.id}>
    <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/30 p-4 text-clay-300">
      <ZoomPan><div className="[&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-none"
        dangerouslySetInnerHTML= __html: clean  /></ZoomPan>
    </div>
    {block.caption && <figcaption className="mt-2 text-sm text-zinc-500 italic text-center">{block.caption}</figcaption>}
  </figure>
);
```

Add `case 'svg': return <SvgBlock .../>` to `BlockRenderer.tsx`. (SVG is static; use the HTML widget for animated SVG so scripts run in the sandbox, not the app.)

> Dependency: add `dompurify` (+ `@types/dompurify`). Small, well-audited.

### 3B. Animated / interactive HTML widget — expose the existing sandbox

No new renderer needed — `WidgetHost` already renders `kind:'html'` in a sandboxed iframe. Two upgrades:

1. **Auto-size the iframe** to content (removes the "big empty box" feeling). Inside `WidgetHost`, listen for a height message and set iframe height:
   ```ts
   // in the injected HTML boilerplate (see 4B), the widget posts its height:
   //   new ResizeObserver(()=>parent.postMessage({t:'h',h:document.body.scrollHeight},'*')).observe(document.body)
   useEffect(() => {
     const onMsg = (e: MessageEvent) => { if (e.data?.t === 'h' && iframeRef.current) iframeRef.current.style.height = Math.min(e.data.h, 720) + 'px'; };
     window.addEventListener('message', onMsg); return () => window.removeEventListener('message', onMsg);
   }, []);
   ```
   (Height messaging works even with `sandbox="allow-scripts"` — `postMessage` to parent is allowed; keep **no** `allow-same-origin`.)
2. **Author syntax** for raw HTML (add to `.lmd`):
   ```
   ::: html Gradient descent stepping downhill
   <style> ... use var(--clay) etc ... </style>
   <div class="stage">...</div>
   <script> /* CSS/SVG/requestAnimationFrame animation */ </script>
   :::
   ```
   Parser maps `::: html <caption>` → `{ type:'widget', kind:'html', html: inner, caption }`.

### 3C. Real images — give the author an asset tool (not hallucinated URLs)

`image` blocks fail because the model invents URLs. Fix at **authoring time** (in the Notion/agent lesson-forge or the desktop compose pipeline), not render time:

- Add an **image-resolution step**: when the model wants a photo, it emits `![alt](asset:describe "a labeled diagram of the eye")`. A post-generation pass resolves each `asset:` request via either (a) a licensed image-search API (Openverse/Wikimedia — free, attributable) or (b) an image-generation API, then downloads the file, stores it locally, and rewrites the block to a real `url` + `source` + `license`. For technical figures prefer generating **SVG** (3A) over raster.
- Until that pipeline exists, **steer the model to SVG/HTML/mermaid** for anything it would otherwise fake with an image (Part 4). This alone removes the "only mermaid" problem because SVG + HTML give it real illustration power without URLs.

---

## Part 4 — Make the model actually use them (prompt/authoring changes)

The renderers are useless if `master-prompt.md` keeps saying "use mermaid for ANY structure." Update the authoring prompts:

**`author-guide.md` — Blocks table:** add rows

```
| SVG figure   | ::: figure <caption> \n <svg viewBox=...>...</svg> \n :::   (scalable custom illustration; use currentColor / theme vars) |
| Animation/Interactive | ::: html <caption> \n <style>..</style><div>..</div><script>..</script> \n :::   (sandboxed; CSS/SVG/JS animation) |
| Table        | Standard Markdown pipe table  \| a \| b \|  /  \| --- \| --- \|  (rendered as a real table) |
```

**`master-prompt.md` — replace the "mermaid for everything" guidance** with a *pick-the-right-visual* rule:

> Choose the visual that fits the idea:
> - **Mermaid** — flows, architectures, trees, state machines, sequence.
> - **Vega-Lite `chart`** — quantitative data (distributions, comparisons, trends).
> - **`::: figure` SVG** — a *custom* labeled illustration, geometry, annotated schematic, or anything that isn't a stock flowchart. Prefer this over Mermaid when you want a bespoke picture. Use `currentColor` and theme variables; include `viewBox` (never fixed px width).
> - **`::: html`** — when *motion or interaction* teaches the point (stepping through an algorithm, animating a forward pass, a draggable demo). Animate with CSS/SVG or a small `requestAnimationFrame` loop. Keep it self-contained; post your height to the parent.
> - **`image`** — only for real photographs; request via `![alt](asset:"description")`, never invent a URL.
> Vary your visuals — a lesson that is 100% Mermaid is under-designed. Aim for a mix across nodes.

**`::: html` boilerplate** the guide should tell the model to include (theming + auto-height):

```html
<style>:root{--clay:#d96846;--sage:#6fb38f;--amber:#fbbf24;--bg:#18181b;--fg:#f4f4f5}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui}</style>
<script>addEventListener('load',()=>new ResizeObserver(()=>parent.postMessage({t:'h',h:document.body.scrollHeight},'*')).observe(document.body))</script>
```

**Validator (`validateFull`)**: add `'svg'` (and keep `'widget'`) to the visual-types set so SVG/HTML figures satisfy the "L2+ node needs a visual" rule, and add a soft lint: warn if a node's only visuals are all `mermaid` across the whole lesson (encourages variety).

---

## Acceptance criteria

1. A plain Markdown pipe table in `.lmd` renders as a real, styled table (no raw pipes) — both when it's a standalone block and when embedded in prose.
2. Inline `$...$` in prose renders as math, not raw TeX.
3. A small Mermaid diagram fills the container width; wheel/buttons zoom, drag pans, fit resets, and fullscreen works. Same for `flow`.
4. A display equation wider than the column scrolls horizontally within its card and never clips.
5. Visual blocks (diagram/chart/table/figure/widget/math) render wider than the 68ch prose measure; prose stays narrow.
6. `::: figure <svg>` renders a sanitized, responsive, zoomable SVG; scripts inside are stripped.
7. `::: html` renders in the sandboxed iframe, auto-sizes to content height, and can animate via CSS/SVG/JS.
8. After the prompt changes, a freshly generated lesson contains a *mix* of visual types (not only Mermaid), and any "photo" request uses `asset:` rather than a fake URL.

## Guardrails

- Keep `sandbox="allow-scripts"` **without** `allow-same-origin` on widget iframes. Never `dangerouslySetInnerHTML` raw model HTML into the app document — only sanitized SVG (DOMPurify, scripts forbidden) goes inline; anything with scripts must go through the iframe.
- Cap widget iframe height (e.g. 720px non-fullscreen) so a runaway widget can't blow up the page.
- Don't touch `CurriculumShowcase.tsx`, `parseLessonMarkdown.ts` frontmatter/heading logic beyond the additive block detectors, or the `.ldoc` compile contract.
- Preserve the existing `::: table` directive; 1A is additive.
- New dependency: `dompurify` only (SVG sanitize). `anime.js`/GSAP optional and only inside the widget bundle.

## Files touched

- `src/services/learn/parseLessonMarkdown.ts` — pipe-table detector (1A), `::: figure` + `::: html` directives (3A/3B), add `svg` to `VISUAL_TYPES`.
- `src/components/learn/blocks/MermaidBlock.tsx`, `FlowBlock.tsx` — `useMaxWidth:false` + strip max-width + `ZoomPan` (1B).
- `src/components/learn/blocks/MathBlock.tsx` + global CSS — overflow scroll (1C).
- `src/components/learn/blocks/ProseBlock.tsx` — inline math + inline tables (1D).
- `src/components/learn/blocks/ZoomPan.tsx` — NEW.
- `src/components/learn/blocks/SvgBlock.tsx` — NEW.
- `src/components/learn/blocks/BlockRenderer.tsx` — `case 'svg'`.
- `src/components/learn/WidgetHost.tsx` — auto-height via postMessage (3B).
- `src/shared/learn/types.ts` — `SvgBlock` + `'svg'` in `BlockType`/union; validator visual set.
- `resources/learn/author-guide.md`, `resources/learn/prompts/master-prompt.md` — syntax + "pick the right visual" (Part 4).
