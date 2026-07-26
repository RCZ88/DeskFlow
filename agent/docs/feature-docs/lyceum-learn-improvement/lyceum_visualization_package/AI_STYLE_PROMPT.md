# Lyceum AI Lesson Generation Style Prompt
## For AI Agents Generating .lmd Lesson Content

> **CRITICAL RULE:** The AI outputs ONLY semantic `.lmd` blocks. NEVER CSS, HTML, inline styles, colors, fonts, or layout instructions. The Lyceum renderer applies the warm wood "Scholar's Library" aesthetic automatically.

---

## 1. Visual Identity (Reference Only — Do Not Output)

### Aesthetic: "Scholar's Library"
A private study with amber lamplight on oak desks. Dark warm backgrounds, physical book metaphors, serif editorial headers, tactile cloth-bound volumes with gilt text.

### Exact Design Tokens (The Renderer Uses These — AI Must Never Hardcode)
```
Page bg:        #09090b  (zinc-950)
Card bg:        #1c1917  (warm stone)
Input bg:       #141211
Border:         #292524  (zinc-800)
Border hover:   #d97706  (amber)
Text primary:   #f5f5f4  (parchment)
Text secondary: #a8a29e  (sage)
Text muted:     #57534e  (faded ink)
Accent amber:   #d97706
Accent clay:    #c2553a  (clay-600)
Accent sage:    #6fb38f  (sage-400)
Accent sky:     #5ab0c9  (sky-400)
Gold/gilt:      #f3d9a4
Book ink:       #fbeee6
Glow:           #f7f3ee
```

### Mastery Level Colors (Fixed System)
```
L0 (Untested):    #5B6472  (slate)
L1 (Novice):      #5B8DEF  (blue)
L2 (Beginner):    #23B5B5  (teal/sage)
L3 (Competent):   #3CCB7F  (green)
L4 (Proficient):  #A78BFA  (purple)
L5 (Mastered):    #F5C04E  (gold)
```

### Book Cloth Colors (by curriculum part)
```
Part 0-1:  Clay   (#c2553a → #a8432c, gilt: #f3d9a4)
Part 2-3:  Sage   (#3f7d63 → #2f6650, gilt: #f3d9a4)
Part 4-5:  Amber  (#b8842f → #9c6e20, gilt: #fff4d6)
Part 6-7:  Sky    (#3c7d92 → #2d6175, gilt: #f3d9a4)
Part 8+:   Plum   (#6b4a8a → #553a70, gilt: #f3d9a4)
```

### Typography (The Renderer Handles This)
```
Serif:   "Source Serif 4", Georgia, serif  — for headings, editorial, CTAs
Sans:    Inter, system-ui                  — for UI, body text
Mono:    "JetBrains Mono", "Fira Code"     — for code, labels, data
```

---

## 2. The `.lmd` Block System (CRITICAL)

### Rule #1: AI Outputs ONLY Content Blocks
NEVER output raw HTML, CSS, inline styles, color codes, or font specifications.

### Rule #2: Every Visual Element Must Be a Block
If the AI wants a diagram, chart, concept map, flashcard, or interactive element, it MUST use the corresponding block type. Never write "imagine a diagram showing..." — generate the actual block.

### Rule #3: Block Metadata Is Semantic, Not Stylistic
The AI provides `meta` fields describing WHAT the content is. The renderer decides HOW it looks based on the warm wood design system.

### Available Block Types

#### Text & Content
```
prose        → Rich text paragraphs. Style hints: "lead" | "body" | "compact" | "editorial"
math         → LaTeX formulas (MathJax, warm text on dark)
code         → Syntax-highlighted code (monokai-warm theme)
callout      → Highlighted boxes: tip | warning | note | definition | example | theorem
quote        → Pull quotes with decorative quotation marks
```

#### Visualizations (Use These for Rich Visuals)
```
viz_heatmap         → Study streak calendar (sage gradient on zinc-950)
viz_graph           → Force-directed knowledge graph (mastery-colored nodes, amber highlights)
viz_timeline        → Mastery progression over time (Recharts, amber area)
viz_concept_map     → Hierarchical concept tree (collapsible, mastery-colored)
layer_reveal        → Progressive step disclosure (amber active step, zinc inactive)
whiteboard          → Embedded sketch canvas (Excalidraw, warm pen presets)
comparison          → Side-by-side comparison slider
formula_explorer    → Interactive formula with variable sliders
```

#### Active Recall (Use These Every 3-4 Blocks)
```
flashcard           → Basic flashcard (front/back, 3D flip animation)
flashcard_occlusion → Image with hidden parts (click to reveal, amber mask)
quiz                → MCQ, numeric, or open-ended (styled as warm cards)
quiz_mcq_image      → MCQ with image options (polaroid-style cards)
```

#### Media
```
image        → Figures with warm captions, subtle border, paper texture
video        → Embedded player with warm controls overlay
svg          → Inline SVG (system provides warm stroke colors)
mermaid      → Flowcharts, sequence diagrams (auto-themed warm wood)
chart        → Data charts (auto-colored with mastery palette)
table        → Data tables (warm alternating rows, brass header)
```

#### Interactive
```
widget       → Sandboxed iframe for complex simulations
tutor        → AI tutor inline question (warm chat bubble)
proposal     → AI edit suggestion (warm diff highlighting)
conversation → Threaded discussion (warm message cards)
notes        → User annotation area (warm sticky-note aesthetic)
```

---

## 3. Block Syntax Reference

### Standard Block
```markdown
:::block_type
{"key": "value"}
Content goes here if the block type supports inline content.
:::
```

### prose
```markdown
:::prose
{"style": "lead"}
The transformer architecture revolutionized NLP by introducing self-attention mechanisms.
:::
```

### callout
```markdown
:::callout
{"type": "definition", "title": "Self-Attention"}
A mechanism where each token attends to all positions and weighs their importance dynamically.
:::
```
Callout types: `tip` (amber), `warning` (clay), `note` (sage), `definition` (gold), `example` (teal), `theorem` (purple).

### viz_heatmap
```markdown
:::viz_heatmap
{"data_source": "learn_sessions", "date_range": "last_90_days", "color_scale": "activity"}
:::
```
The AI does NOT provide colors. The renderer uses the sage activity gradient on zinc-950 automatically.

### viz_graph
```markdown
:::viz_graph
{"graph_type": "dag", "layout": "cose", "nodes_source": "curriculum", "highlight_mastery": true}
:::
```
The AI does NOT specify node positions, colors, or sizes. The renderer uses force-directed layout and mastery-based coloring.

### flashcard
```markdown
:::flashcard
{"deck_id": "transformer-fundamentals", "card_type": "basic", "tags": ["attention", "complexity"]}
Front: What is the time complexity of self-attention with sequence length n?
Back: O(n² · d) where d is the head dimension. The n² comes from all pairwise dot products.
:::
```

### flashcard_occlusion
```markdown
:::flashcard_occlusion
{"deck_id": "transformer-fundamentals", "image_url": "https://.../transformer-arch.png"}
Occlude the Multi-Head Attention block and the Feed-Forward block.
:::
```
The AI specifies WHAT to hide. The renderer applies amber mask overlays.

### layer_reveal
```markdown
:::layer_reveal
{"title": "How Backpropagation Works", "reveal_mode": "sequential"}
Step 1: Forward pass computes predictions
Step 2: Loss measures prediction error
Step 3: Gradients flow backward through the chain rule
Step 4: Weights update in the direction of steepest descent
:::
```
Each step reveals with a warm fade-in. The AI does NOT specify animation timing.

### viz_concept_map
```markdown
:::viz_concept_map
{"layout": "tree", "collapsible": true}
Root: Transformer Architecture
├─ Encoder
│  ├─ Self-Attention
│  ├─ Feed-Forward
│  └─ Layer Norm
└─ Decoder
   ├─ Masked Self-Attention
   ├─ Cross-Attention
   └─ Feed-Forward
:::
```

### mermaid
```markdown
:::mermaid
{"type": "flowchart", "direction": "TD"}
flowchart TD
    A[Input Embeddings] --> B[Positional Encoding]
    B --> C[Multi-Head Attention]
    C --> D[Feed-Forward Network]
    D --> E[Output]
:::
```
The system automatically applies the warm wood color theme.

### comparison
```markdown
:::comparison
{"left_label": "RNN", "right_label": "Transformer"}
Left: Sequential processing, hidden state, O(n) per step, vanishing gradients
Right: Parallel processing, self-attention, O(n²) total, long-range dependencies
:::
```

### formula_explorer
```markdown
:::formula_explorer
{"formula": "\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V", "visualize": "line"}
Variable: d_k, min: 8, max: 512, step: 8, default: 64, unit: "dimensions"
:::
```

---

## 4. Content Generation Rules

### Rule A: One Concept Per Block
Break complex explanations into multiple blocks. Do not cram 3 concepts into one `prose` block.

### Rule B: Visual-First for Complex Topics
- **Algorithms** → `layer_reveal` + `mermaid` flowchart + `flashcard`
- **Architectures** → `viz_concept_map` + `image` diagram + `flashcard_occlusion`
- **Math** → `formula_explorer` + `math` block + `quiz` (numeric)
- **Comparisons** → `comparison` + `table` + `viz_graph`
- **Processes** → `mermaid` sequence diagram + `layer_reveal`

### Rule C: Active Recall Every 3-4 Blocks
After every 3-4 content blocks, insert a `flashcard` or `quiz` block. This is core pedagogy.

### Rule D: Grounding Sources
Every factual claim must cite a source. The AI provides source IDs; the renderer formats warm citation chips.

### Rule E: Mastery Targets
Each node specifies `mastery_target` (L1-L5). The renderer styles the difficulty indicator as a subtle warm badge.

---

## 5. What the AI Must NEVER Do

❌ Never output CSS — No `style=`, `<style>`, `.class { }`, or inline colors
❌ Never output HTML — No `<div>`, `<span>`, `<table>` tags in content
❌ Never specify colors — No hex codes, rgb(), or color names in metadata
❌ Never specify fonts — No font-family, font-size, or typography in metadata
❌ Never specify layouts — No "position this on the left", "make this full-width"
❌ Never generate SVG paths manually — Use `mermaid`, `viz_graph`, or `image` blocks
❌ Never write "imagine a diagram" — Generate the actual `viz_*` or `mermaid` block
❌ Never use emojis for icons — The system provides warm Lucide icons

---

## 6. What the AI Must ALWAYS Do

✅ Use semantic block types — Every visual element is a typed block
✅ Provide structured metadata — The `meta` object tells the renderer WHAT to render
✅ Write atomic flashcards — One fact per card, concise front/back
✅ Generate mermaid diagrams — For flows, sequences, class diagrams, ER diagrams
✅ Use layer_reveal for complexity — Break hard concepts into revealable steps
✅ Include concept maps — Show hierarchical relationships between ideas
✅ Add occlusion cards — For diagrams students should memorize visually
✅ Tag everything — Cards, nodes, blocks should have relevant concept tags
✅ Specify mastery targets — Every node has an L1-L5 target

---

## 7. Quality Checklist

Before submitting generated content, verify:

- [ ] No CSS, HTML, or styling in output
- [ ] Every visual concept has a corresponding `viz_*` or `mermaid` block
- [ ] Flashcards exist for every key definition and formula
- [ ] Layer reveals break complex algorithms into ≤5 steps
- [ ] Concept maps show hierarchy for topics with >3 sub-concepts
- [ ] All factual claims have `grounding` sources
- [ ] Mastery targets are realistic (L3 for concepts, L4 for applied, L5 for mastery)
- [ ] Image occlusion cards exist for diagrams students must memorize
- [ ] Quiz blocks test understanding, not just memorization
- [ ] Formula explorers exist for equations with tunable parameters

---

*This prompt ensures all AI-generated content is structurally rich, pedagogically sound, and visually unified under the warm wood "Scholar's Library" aesthetic — without the AI ever touching a stylesheet.*
