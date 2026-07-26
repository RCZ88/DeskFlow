# Lyceum Feature Showcase — Implementation Spec

> **Document Type:** Frontend Implementation Specification  
> **Target:** Lyceum Learn web application  
> **Scope:** Single-page feature showcase demonstrating all 29 `.ldoc` block types  
> **Aesthetic:** Warm wood / scholar's library (dark zinc + clay/amber/sage accents)  
> **Tech Stack:** React + Tailwind CSS (assumed; adapt if using Vue/Svelte/etc.)

---

## 1. Overview

Build a **Feature Showcase** page that acts as a museum exhibit of every block type the AI can generate and the system can parse. The page must be:
- **Fully interactive** — not static screenshots
- **Filterable & searchable** — by category and name
- **Expandable** — each card can expand to show live demo + syntax
- **Responsive** — mobile → desktop
- **On-brand** — warm wood aesthetic with serif headings, mono labels, sans-serif body

---

## 2. Data Model

### 2.1 Feature Object Schema

```typescript
interface Feature {
  id: string;           // kebab-case identifier
  name: string;         // Display name (e.g., "Flashcard")
  icon: string;         // Emoji or SVG icon
  category: Category;   // see below
  description: string;  // One-line description of what it does
  whenUsed: string;     // One-line: when the AI uses it
  demo: ReactNode;      // LIVE interactive component (NOT a screenshot)
  syntax: string;       // The .lmd syntax that generates this block
}

type Category = 
  | "text" 
  | "diagrams" 
  | "interactive" 
  | "visualization" 
  | "ai" 
  | "structure";
```

### 2.2 Category Metadata

| Category | Label | Color Token |
|----------|-------|-------------|
| `text` | Text | `text-[#a8a29e]` |
| `diagrams` | Diagrams | `text-[#f59e0b]` |
| `interactive` | Interactive | `text-[#6fb38f]` |
| `visualization` | Visualization | `text-[#c2553a]` |
| `ai` | AI-Powered | `text-[#d946ef]` (or clay `#c2553a`) |
| `structure` | Structure | `text-[#78716c]` |

### 2.3 Full Features Array (29 items)

**CRITICAL:** The AI agent must implement ALL 29 features exactly as listed below. Do not skip any.

```typescript
const features: Feature[] = [
  // === TEXT (5) ===
  {
    id: "prose",
    name: "Prose",
    icon: "📝",
    category: "text",
    description: "Rich text with bold, italic, inline code, links, and blockquotes.",
    whenUsed: "Used for explanations, definitions, and narrative content.",
    syntax: `Plain text with **bold**, *italic*, \`inline code\`, and [links](url).
Supports $inline math$ and paragraph breaks.`,
  },
  {
    id: "code",
    name: "Code",
    icon: "💻",
    category: "text",
    description: "Syntax-highlighted code blocks with language labels.",
    whenUsed: "Used for algorithms, implementations, and API examples.",
    syntax: `\`\`\`python
def train(model, data):
    for batch in data:
        loss = model(batch)
        loss.backward()
        optimizer.step()
\`\`\``,
  },
  {
    id: "math",
    name: "Math",
    icon: "∑",
    category: "text",
    description: "LaTeX math rendering with KaTeX for equations and formulas.",
    whenUsed: "Used for derivations, loss functions, and mathematical proofs.",
    syntax: `$$
\mathcal{L} = -\sum_{i=1}^{N} y_i \log(\hat{y}_i) + (1-y_i)\log(1-\hat{y}_i)
$$`,
  },
  {
    id: "image",
    name: "Image",
    icon: "🖼️",
    category: "text",
    description: "Photos with captions and source attribution.",
    whenUsed: "Used for diagrams, screenshots, and visual references.",
    syntax: `![Transformer architecture](https://example.com/transformer.png)
Source: Vaswani et al. 2017 | CC-BY-4.0`,
  },
  {
    id: "video",
    name: "Video",
    icon: "▶️",
    category: "text",
    description: "Embedded video players for lectures and demos.",
    whenUsed: "Used for video lectures, walkthroughs, and demonstrations.",
    syntax: `<video src="lecture.mp4" controls />`,
  },

  // === DIAGRAMS (6) ===
  {
    id: "mermaid",
    name: "Mermaid",
    icon: "🧜",
    category: "diagrams",
    description: "Flowcharts, sequence diagrams, class diagrams, and Gantt charts.",
    whenUsed: "Used for architecture overviews and process flows.",
    syntax: `\`\`\`mermaid
graph TD
    A[Input] --> B[Encoder]
    B --> C[Attention]
    C --> D[Decoder]
    D --> E[Output]
\`\`\``,
  },
  {
    id: "chart",
    name: "Chart",
    icon: "📊",
    category: "diagrams",
    description: "Vega-Lite data visualizations — bar, line, scatter, and more.",
    whenUsed: "Used for training metrics, comparisons, and data storytelling.",
    syntax: `::: chart Training loss
{"mark":"line","encoding":{"x":{"field":"epoch"},"y":{"field":"loss"}}}
:::`,
  },
  {
    id: "table",
    name: "Table",
    icon: "📋",
    category: "diagrams",
    description: "Interactive data tables with sorting and filtering.",
    whenUsed: "Used for comparing concepts, formulas, and properties.",
    syntax: `::: table
- [Concept | concept]
- [Formula | formula]
rows:
{"concept": "Attention", "formula": "Q·K^T/√d"}
:::`,
  },
  {
    id: "flow",
    name: "Flow",
    icon: "🌊",
    category: "diagrams",
    description: "Sankey and waterfall flow diagrams for data movement.",
    whenUsed: "Used for showing data flow, resource allocation, and pipelines.",
    syntax: `::: flow sankey
- Input -> Encoder : 100
- Encoder -> Decoder : 80
- Decoder -> Output : 80
:::`,
  },
  {
    id: "svg",
    name: "SVG",
    icon: "🎨",
    category: "diagrams",
    description: "Custom SVG illustrations and vector graphics.",
    whenUsed: "Used for custom diagrams, icons, and visual explanations.",
    syntax: `::: figure
<svg width="400" height="200"><circle cx="200" cy="100" r="80" fill="#c2553a"/></svg>
:::`,
  },
  {
    id: "finchart",
    name: "FinChart",
    icon: "📈",
    category: "diagrams",
    description: "Financial candlestick and area charts for market data.",
    whenUsed: "Used for trading analysis, price history, and market visualization.",
    syntax: `::: finchart
{"type":"candlestick","data":[{"date":"2024-01","open":100,"high":110,"low":95,"close":105}]}
:::`,
  },

  // === INTERACTIVE (5) ===
  {
    id: "quiz-mcq",
    name: "Quiz (MCQ)",
    icon: "❓",
    category: "interactive",
    description: "Multiple choice questions with instant feedback.",
    whenUsed: "Used for knowledge checks and comprehension validation.",
    syntax: `::: quiz mcq L2
What is the time complexity of self-attention?
- [ ] O(n)
- [ ] O(n log n)
- [x] O(n²)
- [ ] O(2^n)
:::`,
  },
  {
    id: "quiz-numeric",
    name: "Quiz (Numeric)",
    icon: "🔢",
    category: "interactive",
    description: "Number input questions with tolerance checking.",
    whenUsed: "Used for calculations, parameter counts, and quantitative answers.",
    syntax: `::: quiz numeric L3
How many parameters...?
answer: 25.2
:::`,
  },
  {
    id: "quiz-open",
    name: "Quiz (Open)",
    icon: "✍️",
    category: "interactive",
    description: "Free-text answers with AI rubric-based grading.",
    whenUsed: "Used for explanations, essays, and deep reasoning questions.",
    syntax: `::: quiz open L4
Explain why layer normalization...
rubric: Must mention: (1) training stability, (2) gradient flow...
:::`,
  },
  {
    id: "flashcard",
    name: "Flashcard",
    icon: "🃏",
    category: "interactive",
    description: "3D flip cards with FSRS spaced repetition scheduling.",
    whenUsed: "Used for memorization, definitions, and key concepts.",
    syntax: `:::flashcard {"deck_id": "transformers"}
Front: What does softmax do in attention?
Back: Converts scores into probabilities...
:::`,
  },
  {
    id: "layer-reveal",
    name: "Layer Reveal",
    icon: "🧅",
    category: "interactive",
    description: "Step-by-step progressive disclosure of content.",
    whenUsed: "Used for derivations, proofs, and multi-step explanations.",
    syntax: `:::layer_reveal {"title": "How Backprop Works"}
Step 1: Forward pass...
Step 2: Loss calculation...
Step 3: Backward pass...
Step 4: Weight update...
:::`,
  },

  // === VISUALIZATION (4) ===
  {
    id: "heatmap",
    name: "Heatmap",
    icon: "🔥",
    category: "visualization",
    description: "GitHub-style study activity calendar.",
    whenUsed: "Used for tracking learning streaks and study habits.",
    syntax: `:::viz_heatmap {"date_range": "last_90_days"}
:::`,
  },
  {
    id: "knowledge-graph",
    name: "Knowledge Graph",
    icon: "🕸️",
    category: "visualization",
    description: "Interactive force-directed node graph of concepts.",
    whenUsed: "Used for showing relationships between topics and prerequisites.",
    syntax: `:::viz_graph {"layout": "force"}
- node: Transformer (L3)
- node: Attention (L4)
- edge: Transformer -> Attention
:::`,
  },
  {
    id: "concept-map",
    name: "Concept Map",
    icon: "🌳",
    category: "visualization",
    description: "Collapsible hierarchical tree of concepts.",
    whenUsed: "Used for syllabi, topic hierarchies, and curriculum maps.",
    syntax: `:::viz_concept_map {"title": "Neural Network Architecture"}
- Neural Network
  - Layers (L2)
    - Input Layer
    - Hidden Layers
:::`,
  },
  {
    id: "mastery-timeline",
    name: "Mastery Timeline",
    icon: "📅",
    category: "visualization",
    description: "Learning progression chart showing mastery level over time.",
    whenUsed: "Used for tracking skill growth and milestone achievements.",
    syntax: `:::viz_timeline {"target_level": "L3"}
2024-01-15: quiz @80
2024-01-22: mastery @L2
2024-02-01: mastery @L3
:::`,
  },

  // === AI-POWERED (5) ===
  {
    id: "illustration",
    name: "Illustration",
    icon: "🎭",
    category: "ai",
    description: "AI-generated hand-drawn images in ian-xiaohei style.",
    whenUsed: "Used for visual metaphors, chapter openers, and concept art.",
    syntax: `:::illustration {"prompt": "小黑 stands before a giant open book...", "concept": "Opening the first chapter"}
:::`,
  },
  {
    id: "whiteboard",
    name: "Whiteboard",
    icon: "✏️",
    category: "ai",
    description: "Excalidraw-style drawing canvas for sketches and diagrams.",
    whenUsed: "Used for free-form drawing, scratch work, and visual thinking.",
    syntax: `::: whiteboard {"read_only": false}
:::`,
  },
  {
    id: "tutor",
    name: "Tutor",
    icon: "🎓",
    category: "ai",
    description: "AI Q&A panel for asking questions about content.",
    whenUsed: "Triggered when the learner asks a question inline.",
    syntax: `<!-- Rendered via IPC: learn:askTutor -->`,
  },
  {
    id: "proposal",
    name: "Proposal",
    icon: "💡",
    category: "ai",
    description: "AI suggests edits with before/after and approve/reject buttons.",
    whenUsed: "Triggered when the AI suggests improvements to content.",
    syntax: `<!-- Rendered via IPC: learn:createProposal -->`,
  },
  {
    id: "conversation",
    name: "Conversation",
    icon: "💬",
    category: "ai",
    description: "Multi-turn AI dialogue with message history.",
    whenUsed: "Used for Socratic tutoring and extended discussions.",
    syntax: `<!-- Rendered via IPC: learn:startConversation -->`,
  },

  // === STRUCTURE (4) ===
  {
    id: "layer",
    name: "Layer (Mastery)",
    icon: "🔒",
    category: "structure",
    description: "Mastery-gated content that unlocks at higher levels.",
    whenUsed: "Used for advanced topics that require prerequisite mastery.",
    syntax: `::: layer L4 deeper
Advanced content about attention head pruning...
:::`,
  },
  {
    id: "callout",
    name: "Callout",
    icon: "📢",
    category: "structure",
    description: "Info, warning, tip, and caution boxes.",
    whenUsed: "Used for highlighting important notes and common pitfalls.",
    syntax: `::: callout warning
**Common misconception:** Attention replaces recurrence entirely...
:::`,
  },
  {
    id: "widget",
    name: "Widget",
    icon: "🧩",
    category: "structure",
    description: "Custom HTML/JS interactive elements.",
    whenUsed: "Used for bespoke interactions not covered by other blocks.",
    syntax: `::: html
<div id="interactive-demo">
  <button onclick="...">Click me</button>
</div>
:::`,
  },
  {
    id: "notes",
    name: "Notes",
    icon: "📝",
    category: "structure",
    description: "User annotations and highlights on content.",
    whenUsed: "Used for personal notes, bookmarks, and study annotations.",
    syntax: `<!-- Rendered via IPC: learn:addNote -->`,
  },
];
```

---

## 3. Page Architecture

### 3.1 Component Tree

```
FeatureShowcasePage
├── HeroSection
│   └── Title + Subtitle + BadgeRow (29 Features | Interactive | .ldoc Format)
├── ControlBar (sticky top-0)
│   ├── CategoryFilterPills [All, Text, Diagrams, Interactive, Viz, AI, Structure]
│   ├── SearchInput
│   └── ExpandAllButton
├── FeatureGrid
│   └── FeatureCard (×29, filtered)
│       ├── CardHeader (click to toggle)
│       │   ├── Icon + Name + CategoryBadge
│       │   └── ChevronIcon (rotates on expand)
│       ├── CardDescription
│       └── ExpandableContent (animated height)
│           ├── WhenUsedSection
│           ├── LiveDemoSection
│           └── SyntaxSection (preformatted code block)
└── Footer
```

### 3.2 State Management

```typescript
interface ShowcaseState {
  activeCategory: Category | "all";
  searchQuery: string;
  expandedCards: Set<string>;   // by feature.id
  allExpanded: boolean;
}
```

**Derived state:**
```typescript
const filteredFeatures = features.filter(f => {
  const matchCat = activeCategory === "all" || f.category === activeCategory;
  const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) 
                   || f.description.toLowerCase().includes(searchQuery.toLowerCase());
  return matchCat && matchSearch;
});
```

---

## 4. Visual Design System

### 4.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-base` | `#0f0e0d` | Page background |
| `bg-card` | `#1c1917` | Card backgrounds |
| `bg-card-translucent` | `rgba(28, 25, 23, 0.6)` | Card with backdrop blur |
| `text-primary` | `#fafaf9` | Headings, important text |
| `text-body` | `#e7e5e4` | Body text |
| `text-muted` | `#a8a29e` | Secondary text, descriptions |
| `text-dim` | `#78716c` | Labels, captions, timestamps |
| `accent-clay` | `#c2553a` | Primary accent, CTAs, active states |
| `accent-amber` | `#f59e0b` | Secondary accent, warnings, highlights |
| `accent-sage` | `#6fb38f` | Success, tips, positive feedback |
| `border-subtle` | `rgba(255, 255, 255, 0.1)` | Card borders, dividers |
| `border-hover` | `rgba(255, 255, 255, 0.2)` | Hover state borders |

### 4.2 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Page title | Serif (e.g., Georgia, Merriweather) | Bold (700) | `text-5xl` |
| Card title | Serif | Semibold (600) | `text-lg` |
| Body | Sans-serif (system-ui, Inter) | Normal (400) | `text-sm` |
| Labels / badges | Sans-serif | Medium (500) | `text-xs` |
| Code / syntax | Monospace (JetBrains Mono, Fira Code) | Normal | `text-xs` |
| Category badge | Sans-serif | Medium | `text-[10px]` uppercase, tracking-wider |

### 4.3 Spacing & Layout

- **Max width:** `max-w-7xl` (80rem / 1280px)
- **Grid:** `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` with `gap-6`
- **Card padding:** `p-5` (1.25rem)
- **Section padding:** `px-6 py-10`
- **Sticky header:** `sticky top-0 z-40` with `backdrop-blur-md`
- **Card border radius:** `rounded-xl` (0.75rem)
- **Inner border radius:** `rounded-lg` (0.5rem)

### 4.4 Animations

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Card expand/collapse | 500ms | `ease-in-out` | Click card header |
| Chevron rotation | 300ms | `ease-in-out` | Expand state change |
| Card hover | 300ms | `ease-in-out` | `hover:` |
| Filter pill active | 200ms | `ease-out` | Category selection |
| Flashcard flip | 500ms | `ease-in-out` | Click (3D transform) |
| Layer reveal step | 300ms | `ease-out` | "Reveal Next" click |

---

## 5. Interactive Demo Specifications

Each card's expanded view contains a **LIVE** demo. These are NOT screenshots. Implement the following interactivity:

### 5.1 Quiz (MCQ)
- 4 option buttons
- On click: disable all buttons, highlight selected
- If correct: green border + bg, show explanation
- If wrong: red border + bg, show correct answer
- Use local component state; no backend needed for showcase

### 5.2 Quiz (Numeric)
- Number input + "Check" button
- Tolerance: exact match (or ±0.1 if decimal)
- Show ✓/✗ feedback below
- Correct answer for demo: `8` (attention heads)

### 5.3 Quiz (Open)
- Textarea for free-text input
- "Submit" and "Show Rubric" buttons
- Rubric displayed as helper text below
- No actual AI grading in showcase; just UI demo

### 5.4 Flashcard
- 3D flip animation using `perspective`, `transform-style: preserve-3d`, `backface-visibility: hidden`
- Front: question text
- Back: answer text
- Below card: 4 FSRS buttons (Again / Hard / Good / Easy) — visual only for showcase
- Click card to flip

### 5.5 Layer Reveal
- 4 steps, initially blurred + dimmed (except step 1)
- "Reveal Next Step" button unblurs next step
- When all revealed, button text changes to "All Steps Revealed" and disables

### 5.6 Widget (Counter)
- Increment / Decrement / Reset buttons
- Display current count in large mono font
- Demonstrates custom HTML/JS interactivity

### 5.7 Heatmap
- 91 squares (13 weeks × 7 days) in a flex-wrap grid
- Random intensity levels: `bg-white/5`, `bg-[#c2553a]/30`, `bg-[#c2553a]/60`, `bg-[#c2553a]`
- Legend below: Less → More

### 5.8 Knowledge Graph
- Static SVG with 5 nodes (Transformer center, 4 children) and connecting lines
- Nodes are colored circles with text labels
- In production this would be force-directed (D3/vis-network); for showcase, static SVG is acceptable

### 5.9 Concept Map
- Collapsible tree with `▶` / `▼` indicators
- Click to expand/collapse branches
- Indentation shows hierarchy

### 5.10 Mastery Timeline
- Horizontal timeline with 3 milestone dots
- Connected by dashed polyline showing progression
- Dates and level labels below each dot

### 5.11 Whiteboard
- Light background (`#fafaf9`) with dot grid pattern
- Pre-drawn SVG sketch (path, rect, circle, text)
- Toolbar icons (pencil, eraser) — visual only

### 5.12 Tutor Block
- Mock conversation: user question + AI response
- Input field + "Ask" button at bottom
- AI avatar: green circle. User avatar: clay circle.

### 5.13 Proposal Block
- "AI Proposal" badge (amber)
- Before/after comparison: strikethrough red (before) → green (after)
- Accept / Reject buttons

### 5.14 Conversation Block
- Scrollable message list
- Alternating user/AI bubbles
- Compact avatar + text layout

### 5.15 Layer (Mastery-gated)
- Lock icon + "Requires L4 Mastery" label
- Progress bar showing % to next level
- Locked content area with dashed border

### 5.16 Callout
- Two examples: Warning (amber) + Tip (sage)
- Icon + title + description layout
- Colored left border or full border

### 5.17 Notes
- Highlighted text (`<mark>` with amber bg)
- User note card with left accent border
- Action buttons: "Highlight", "Add Note"

---

## 6. IPC Endpoints (Reference)

These blocks connect to backend IPC in production. For the showcase, implement as UI mocks with comments indicating the real endpoint.

| Block | IPC Endpoint | Direction |
|-------|-------------|-----------|
| Tutor | `learn:askTutor` | User → AI |
| Proposal | `learn:createProposal` | AI → User |
| Conversation | `learn:startConversation` | Bidirectional |
| Notes | `learn:addNote` | User → System |
| Illustration | `learn:generateIllustration` | System → AI Image |
| Flashcard scheduling | `learn:getDueCards` | System → FSRS |
| Flashcard review | `learn:submitCardReview` | User → FSRS |
| Heatmap data | `learn:getStudyHeatmap` | System → Analytics |

---

## 7. Responsive Behavior

| Breakpoint | Grid Columns | Header Layout |
|------------|-------------|---------------|
| < 768px (mobile) | 1 column | Stack: filters wrap, search full width |
| 768px – 1280px (tablet) | 2 columns | Row: filters left, search right |
| > 1280px (desktop) | 3 columns | Row: filters left, search right |

---

## 8. Accessibility

- All interactive elements must be keyboard accessible
- Expand/collapse via `Enter` / `Space` on card header
- Proper `aria-expanded` on expandable cards
- Sufficient color contrast (WCAG AA minimum)
- Focus rings on buttons and inputs (`focus:outline-none focus:ring-2 focus:ring-[#c2553a]/50`)

---

## 9. File Structure (Recommended)

```
src/
├── pages/
│   └── FeatureShowcase.tsx          # Main page component
├── components/
│   ├── showcase/
│   │   ├── HeroSection.tsx
│   │   ├── ControlBar.tsx
│   │   ├── FeatureGrid.tsx
│   │   ├── FeatureCard.tsx
│   │   └── demos/                   # All live demo sub-components
│   │       ├── ProseDemo.tsx
│   │       ├── CodeDemo.tsx
│   │       ├── MathDemo.tsx
│   │       ├── ImageDemo.tsx
│   │       ├── VideoDemo.tsx
│   │       ├── MermaidDemo.tsx
│   │       ├── ChartDemo.tsx
│   │       ├── TableDemo.tsx
│   │       ├── FlowDemo.tsx
│   │       ├── SvgDemo.tsx
│   │       ├── FinChartDemo.tsx
│   │       ├── QuizMCQDemo.tsx
│   │       ├── QuizNumericDemo.tsx
│   │       ├── QuizOpenDemo.tsx
│   │       ├── FlashcardDemo.tsx
│   │       ├── LayerRevealDemo.tsx
│   │       ├── HeatmapDemo.tsx
│   │       ├── KnowledgeGraphDemo.tsx
│   │       ├── ConceptMapDemo.tsx
│   │       ├── MasteryTimelineDemo.tsx
│   │       ├── IllustrationDemo.tsx
│   │       ├── WhiteboardDemo.tsx
│   │       ├── TutorDemo.tsx
│   │       ├── ProposalDemo.tsx
│   │       ├── ConversationDemo.tsx
│   │       ├── LayerMasteryDemo.tsx
│   │       ├── CalloutDemo.tsx
│   │       ├── WidgetDemo.tsx
│   │       └── NotesDemo.tsx
│   └── ui/                          # Shared UI primitives
│       ├── Badge.tsx
│       └── SyntaxBlock.tsx
├── data/
│   └── features.ts                  # The 29-item features array
├── types/
│   └── showcase.ts                  # TypeScript interfaces
└── styles/
    └── showcase.css                 # 3D flip animations, custom utilities
```

---

## 10. Implementation Checklist

- [ ] Create `features.ts` with all 29 feature objects
- [ ] Implement `FeatureShowcasePage` with hero, controls, grid, footer
- [ ] Implement category filter pills with active state styling
- [ ] Implement search input with real-time filtering
- [ ] Implement "Expand All / Collapse All" toggle
- [ ] Implement `FeatureCard` with animated expand/collapse
- [ ] Implement ALL 29 live demo components with interactivity
- [ ] Apply warm wood color palette consistently
- [ ] Ensure responsive grid behavior
- [ ] Add keyboard accessibility
- [ ] Test all interactive demos (quizzes, flashcard flip, layer reveal, widget, etc.)
- [ ] Verify syntax blocks render with proper monospace formatting
- [ ] Add smooth scroll and fade-in animations on load

---

## 11. Notes for AI Agent

1. **Do NOT skip any of the 29 features.** The showcase is incomplete if even one block type is missing.
2. **Demos must be interactive, not static images.** The whole point is to prove the platform renders live components.
3. **Use the exact color tokens** specified in §4.1. The warm wood aesthetic depends on these specific values.
4. **The flashcard flip requires 3D CSS transforms.** Do not use a simple opacity fade — it must physically flip.
5. **Category filter pills** should use the clay accent (`#c2553a`) for the active state, white/5 for inactive.
6. **Syntax blocks** should be in a dark container (`bg-black/40`) with the exact `.lmd` syntax string preserved with newlines.
7. **If using a component library** (shadcn, MUI, etc.), map the design tokens to the library's theme system.
8. **Performance:** All 29 cards may be rendered at once. Use `React.memo` on `FeatureCard` if needed.
9. **The whiteboard demo** uses a light background (`#fafaf9`) to contrast with the dark page — this is intentional.
10. **Video block** can be a styled placeholder with a play button overlay if no real video URL is available.

---

*Spec generated by Kimi for OpenCode implementation.*
*Lyceum Learn — Feature Showcase v1.0*
