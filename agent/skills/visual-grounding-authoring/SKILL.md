---
name: visual-grounding-authoring
version: 1.0.0
description: >
  Authoring skill for the lesson-writing AI. Teaches how to build integrated
  interactive visualizations where explanation and illustration live in the
  same coordinate space, connected by drawn leader lines — not separated
  into text blocks pointing at diagram blocks.
category: learn
load_order: after master-prompt + author-guide
scope: lesson generation, visual block authoring, widget design
triggers:
  - lesson generation
  - visual block authoring
  - widget design
  - interactive visualization
  - HTML widget authoring
  - :: html block authoring
  - diagram with callouts
  - step-through visualization
  - parameter explorer
---

# Visual Grounding Authoring — Integrated Interactive Visualizations

> Prompt module for the external lesson-authoring AI. Intended slot: `composeAuthorSystemPrompt()`,
> loaded alongside `master-prompt.md` and `author-guide.md`. Written in second person addressing the
> authoring model directly.

---

## 0. Why this file exists

You (the authoring model) currently have two ways to attach a visual to an explanation:

1. Put prose in one block and a diagram/code/math in another, and connect them with `@ref[id]`.
   The reader hovers a chip in the text and the target lights up elsewhere on the page.
2. Put a static image or diagram with no connection to the text at all.

Both produce **separated** explanations — text on one side, illustration on the other, correlated
only by the reader's eyes (or a hover event). This is the exact failure mode you must stop
defaulting to. The fix is not a new block type. It's a change in *which* block type you reach for
first, and how you use it.

---

## 1. The core law: build integrated objects, not paired blocks

**Default to a single self-contained widget that contains the explanation and the illustration in
the same coordinate space, connected by drawn leader lines you author yourself** — not a prose
block that points at a separate diagram block.

Why this has to be a single block: you control layout *inside* one `::: html` or `::: figure`
block completely — you know exactly where every label and every diagram part sits, because you
wrote both. You do **not** know where a separate prose block will end up relative to a separate
code block once the reader's window is resized, notes are open, or the sidebar is toggled. An
arrow authored to cross block boundaries will point at nothing. This is why the `@ref` hover system
exists for cross-block cases — it's a fallback for when content is legitimately in different
blocks, not the ideal for a full explanation.

**Decision rule:**

| Situation | What to author |
|---|---|
| Concept has ≥2 named parts that the explanation refers to | One integrated widget: diagram + inline callout text + drawn leader lines, all in one block |
| Concept naturally spans two already-distinct artifacts (e.g. a math derivation *then* its code implementation) | Two blocks (`annotated-math` + `annotated-code`) linked by shared `@ref` ids — this is the correct use of the existing system |
| Pure narrative/conceptual prose, nothing spatial to point at | Plain `prose`. Do not force a diagram onto content that has no parts. |
| Reader needs to change a parameter and see the consequence | Integrated widget with JS state (see §4) |

If you're not sure, prefer the integrated widget. A split block pair is the exception, not the norm.

---

## 2. Anatomy of an integrated widget

An integrated widget is a `::: html` (or `::: figure` for pure-SVG cases) block laid out as:

- The diagram/illustration, positioned in a coordinate system you control (SVG viewBox, or CSS
  grid/flex with explicit positions).
- Callout labels placed *in that same space*, near the part they describe — not below the diagram
  in a separate paragraph.
- A leader line (SVG `<path>` or `<line>`, or a CSS `::before` line via `transform`) drawn from each
  label to its target part.
- Optional interactivity layered on top (hover to emphasize a pair, click to step through states).

### Worked example: "stride in a convolution" — before and after

**Before (what to stop doing):** prose block explaining stride, followed by a separate `math`
block with `$$ S = \lfloor (W-K)/P \rfloor + 1 $$`, followed by a separate `svg` figure of a kernel
sliding across an input grid. Three blocks, zero visual connection between "the P in the formula"
and "the gap between kernel positions in the picture."

**After (what to author instead):** one `::: html` block containing the grid, the formula, and the
callouts, all positioned together:

```html
<div class="viz-stride" style="position:relative; font-family:system-ui; max-width:640px;">
  <svg viewBox="0 0 640 260" width="100%">
    <!-- input grid: 8 cells -->
    <g id="input-grid">
      <!-- ...rects for each cell, id="cell-0".."cell-7"... -->
    </g>
    <!-- kernel outline at position 0 and position 2, i.e. stride 2 -->
    <rect id="kernel-pos-a" x="10" y="10" width="60" height="60"
          fill="none" stroke="#e0a030" stroke-width="3"/>
    <rect id="kernel-pos-b" x="130" y="10" width="60" height="60"
          fill="none" stroke="#e0a030" stroke-width="3" stroke-dasharray="4 3"/>
    <!-- leader line from the gap between kernel-pos-a and kernel-pos-b to the callout -->
    <path d="M 100 40 C 100 90, 180 90, 180 130" stroke="#e0a030"
          stroke-width="2" fill="none" marker-end="url(#arrow)"/>
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 z" fill="#e0a030"/>
      </marker>
    </defs>
    <!-- the callout text sits at the arrowhead, in-canvas, not below -->
    <text x="185" y="145" font-size="13" fill="#333">
      P = 2: kernel jumps 2 cells between positions
    </text>
  </svg>

  <!-- formula lives directly under the diagram it explains, same widget -->
  <div id="stride-formula" style="margin-top:8px; font-size:15px;">
    S = ⌊(W − K)/P⌋ + 1 &nbsp;&mdash;&nbsp;
    <span style="color:#e0a030; cursor:pointer;" id="p-highlight-trigger">P is the gap you just saw above</span>
  </div>

  <script>
    // same-widget interactivity: hovering the formula term re-emphasizes the diagram part
    const trigger = document.getElementById('p-highlight-trigger');
    const kernelB = document.getElementById('kernel-pos-b');
    trigger.addEventListener('mouseenter', () => { kernelB.style.filter = 'drop-shadow(0 0 4px #e0a030)'; });
    trigger.addEventListener('mouseleave', () => { kernelB.style.filter = 'none'; });
  </script>
</div>
```

Notice: the arrow is drawn *by you*, in the same SVG, from a real point to a real point. The
formula and the diagram are in the same `<div>`. Nothing relies on the reader correlating two
places on the page — the correlation is drawn.

Use KaTeX (`::: annotated-math` or inline `$$...$$` with `\htmlId{}`) only when the formula needs
real math typesetting (fractions, sums, matrices) that hand-written HTML can't render cleanly. In
that case, KaTeX output can still be embedded inside an `::: html` widget's coordinate space if you
need the leader-line technique — annotated-math's own block-level hover linking is the fallback for
when the math legitimately lives in its own block.

---

## 3. When cross-block `@ref` is still the right call

Don't abandon `@ref` — use it for genuinely sequential material where forcing everything into one
widget would be worse, e.g.:

- A derivation (`annotated-math`) followed by its implementation (`annotated-code`) where the
  reader is expected to read one, then the other, not see them simultaneously.
- A conceptual paragraph that references a diagram the reader saw two nodes ago.

In these cases, every `@ref[id]` must resolve to a real target, and every annotated/svg block must
be referenced at least once — this rule is unchanged and still enforced by the validator
(`checkVisualGrounding`). The integrated-widget rule in §1 governs your *first choice*; `@ref`
remains correct for legitimately separate artifacts.

---

## 4. When to add JavaScript interactivity

Not every visualization needs to move. Add interactivity only when at least one of these is true —
otherwise you're adding decoration, which the validator should treat the same way it treats
unreferenced visual blocks:

- **The reader needs to see a process unfold in steps** they control (algorithm step-through,
  gradient descent iterations, a sorting pass) — a static final-state image loses the "how."
- **Changing one input visibly changes the output**, and that relationship *is* the lesson
  (stride/padding sliders changing output grid size; learning rate changing convergence path).
- **Comparing two things is easier synchronized** than side by side (linked hover/scroll between
  two panels, e.g. before/after memory layout).
- **The explanation itself is "hover to see why"** — a diagram with 6 parts where showing all 6
  explanations at once would be visual noise, so each reveals on interaction.

If none of these apply, a static integrated widget (diagram + inline callouts + leader lines, no
`<script>`) is correct and preferred. Interactivity you add without one of these reasons is
decoration — remove it.

---

## 5. Pattern catalog

Reach for these by name. Each is a shape for the `::: html` body; adapt variables/labels to the
actual lesson content.

### 5a. Step-through state machine
A diagram of N discrete states with a "Next →" control; each click updates which node/edge is
highlighted and swaps a caption. Good for: algorithm traces, automata, pipeline stages.
```html
<div id="step-viz">
  <svg id="states">...</svg>
  <div id="caption"></div>
  <button id="next">Next →</button>
</div>
<script>
  const steps = [ /* {highlightId, caption} per step */ ];
  let i = 0;
  function render() {
    document.getElementById('caption').textContent = steps[i].caption;
    document.querySelectorAll('.state').forEach(el => el.classList.remove('active'));
    document.getElementById(steps[i].highlightId).classList.add('active');
  }
  document.getElementById('next').onclick = () => { i = (i + 1) % steps.length; render(); };
  render();
</script>
```

### 5b. Before/after diff
Two panels sharing identical layout coordinates; a control (button or slider at 0/1) swaps state.
Good for: memory layout before/after a write, array before/after a sort pass, tree before/after
rebalancing.

### 5c. Parameter-driven recompute
A slider bound to a JS function that recomputes and redraws a derived value live. Good for: stride
convolution, learning-rate effects, any formula with a free parameter worth exploring by feel.

### 5d. Synchronized comparison
Two SVG/HTML panels with a shared hover/scroll listener — hovering an element in panel A highlights
its counterpart in panel B. Good for: two implementations of the same algorithm, spec vs
implementation.

### 5e. Annotated static diagram with leader lines (default, no JS)
See §2's worked example. This should be your most common output — most explanations don't need
motion, they need the callout drawn *at* the part instead of listed below it.

### 5f. Interactive matrix/tensor operation
A grid of cells where hovering a cell in the output highlights the contributing cells in the
input(s) (e.g. matrix multiply, convolution, attention weights). Good for: any operation defined by
"each output cell depends on a specific subset of input cells."

---

## 6. Common failures — check before you emit

- **Arrow crosses a block boundary.** If your `<path>` or leader line's coordinates were computed
  assuming a specific position of *another block*, delete it — it will not point at the right place.
  Either bring both ends into the same widget, or switch to `@ref`.
- **Interactivity with no reason.** If you added a `<script>` and can't name which item in §4 it
  satisfies, remove the script and ship the static version.
- **Callout text below the diagram instead of at the part.** If a reader has to look away from
  the diagram to read the explanation, the explanation isn't grounded yet — move the text into the
  diagram's coordinate space.
- **Unlabeled SVG parts.** Every meaningful SVG element needs a visible `<text>` label or an
  in-canvas callout — an id alone is invisible to the reader and only useful for `@ref` wiring.
- **KaTeX without `\htmlId{}`** on any symbol you intend to reference or highlight. Untagged symbols
  can't be targeted by hover or by a leader line.
- **A widget that's just a static image wearing an `::: html` wrapper.** If nothing in the block
  depends on the specific lesson content (i.e. you could reuse it unchanged for a different topic),
  it's decoration — rebuild it around the actual concept's specific parts.

---

## 7. Self-check before emitting the node

Run this checklist silently before finalizing any node with a visual:

1. Does the explanation and the illustration live in the same block, or is there a real reason
   (§3) they're split?
2. If split, does every `@ref[id]` resolve, and is every annotated/svg block referenced at least
   once?
3. If there's a leader line or arrow, are both endpoints inside the same widget's coordinate
   space?
4. If there's a `<script>`, does it satisfy one of the four reasons in §4? If not, cut it.
5. Could a reader understand the specific part being discussed *without* moving their eyes off
   the diagram? If not, move the callout inward.
