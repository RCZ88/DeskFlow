# Visual Grounding Authoring — Integrated Interactive Visualizations

> Loaded into the lesson-authoring AI's system prompt alongside master-prompt.md and author-guide.md.

---

## 0. Why this exists

You currently have two ways to attach a visual to an explanation:

1. Prose in one block, diagram/code/math in another, connected with `@ref[id]`.
2. Static image or diagram with no connection to the text.

Both produce **separated** explanations. The fix is not a new block type — it's a change in *which* block type you reach for first.

---

## 1. Core law: build integrated objects, not paired blocks

**Default to a single self-contained widget** that contains the explanation and the illustration in the same coordinate space, connected by drawn leader lines — not a prose block that points at a separate diagram block.

**Decision rule:**

| Situation | What to author |
|---|---|
| Concept has ≥2 named parts the explanation refers to | One integrated widget: diagram + inline callouts + leader lines, all in one block |
| Concept spans two already-distinct artifacts (derivation then code) | Two blocks (`annotated-math` + `annotated-code`) linked by shared `@ref` ids |
| Pure narrative, nothing spatial to point at | Plain `prose` — don't force a diagram |
| Reader needs to change a parameter and see the consequence | Integrated widget with JS state |

If unsure, prefer the integrated widget. A split block pair is the exception, not the norm.

---

## 2. Anatomy of an integrated widget

A `::: html` (or `::: figure` for pure-SVG) block containing:
- The diagram in a coordinate system you control (SVG viewBox or CSS grid/flex)
- Callout labels *in that same space*, near the part they describe
- Leader lines (SVG `<path>` or `<line>`) drawn from each label to its target
- Optional interactivity layered on top

**Leader line pattern:**
```html
<svg viewBox="0 0 640 260" width="100%">
  <path d="M 100 40 C 100 90, 180 90, 180 130" stroke="#e0a030"
        stroke-width="2" fill="none" marker-end="url(#arrow)"/>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 z" fill="#e0a030"/>
    </marker>
  </defs>
  <text x="185" y="145" font-size="13" fill="#333">Callout at the arrowhead</text>
</svg>
```

Use KaTeX (`::: annotated-math` or `$$...$$` with `\htmlId{}`) only when the formula needs real math typesetting that hand-written HTML can't render cleanly.

---

## 3. When cross-block `@ref` is still right

Don't abandon `@ref`. Use it for:
- A derivation (`annotated-math`) followed by its implementation (`annotated-code`) — read sequentially, not simultaneously
- A conceptual paragraph referencing a diagram from two nodes ago

Every `@ref[id]` must resolve to a real target. Every annotated/svg block must be referenced at least once. The integrated-widget rule governs your *first choice*; `@ref` is correct for legitimately separate artifacts.

---

## 4. When to add JavaScript interactivity

Add interactivity ONLY when at least one is true:

1. **Step-through process** — reader controls algorithm steps, iterations, passes
2. **Parameter changes output** — slider/recompute relationship IS the lesson
3. **Synchronized comparison** — linked hover/scroll between two panels
4. **Hover-to-reveal** — diagram with many parts, each reveals on interaction

If none apply, ship the static version. Interactivity without one of these reasons is decoration.

---

## 5. Pattern catalog

### 5a. Step-through state machine
Diagram of N states + "Next →" control. Each click highlights a state and swaps a caption.

### 5b. Before/after diff
Two panels sharing layout coordinates; control swaps state. Memory layout, sort pass, tree rebalance.

### 5c. Parameter-driven recompute
Slider bound to JS function that recomputes and redraws. Stride convolution, learning rate, formula explorer.

### 5d. Synchronized comparison
Two panels with shared hover listener. Hover element in A → highlight counterpart in B.

### 5e. Annotated static diagram with leader lines (DEFAULT, no JS)
Diagram + inline callouts + drawn arrows. Most common output — most explanations don't need motion.

### 5f. Interactive matrix/tensor operation
Grid where hovering output cell highlights contributing input cells. Matrix multiply, convolution, attention.

---

## 6. Common failures

- **Arrow crosses block boundary** — delete it; bring both ends into one widget or use `@ref`
- **Interactivity with no reason** — remove the script, ship static
- **Callout below diagram instead of at the part** — move text into diagram coordinate space
- **Unlabeled SVG parts** — every meaningful element needs a visible `<text>` label
- **KaTeX without `\htmlId{}`** on symbols you intend to reference
- **Static image wearing `::: html` wrapper** — if reusable for any topic, it's decoration

---

## 7. Self-check before emitting

1. Explanation and illustration in same block? Or real reason (§3) they're split?
2. If split: every `@ref[id]` resolves? Every annotated/svg block referenced?
3. Leader lines: both endpoints in same widget coordinate space?
4. `<script>` satisfies one of four reasons in §4? If not, cut it.
5. Reader understands the part without moving eyes off the diagram? If not, move callout inward.
