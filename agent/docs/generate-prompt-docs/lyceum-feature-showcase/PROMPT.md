# Lyceum Feature Showcase — Design Prompt

## Raw Request
"make a showcase that demonstrates all the features of .ldoc files — what the AI can generate and what gets parsed and displayed. make it the best looking showcase that shows every single feature properly."

## What is .ldoc?
`.ldoc` is Lyceum's lesson document format. An AI generates `.lmd` (Lesson Markdown) files, which get parsed into `.ldoc` JSON with typed blocks. Each block renders as a rich interactive component. The showcase must demonstrate EVERY block type the AI can produce and the system can parse.

## The Mandate
Design a **Feature Showcase** page/section for Lyceum Learn that:
1. Shows every block type with real example content
2. Lets users see each feature in action (interactive)
3. Explains what each block does and when the AI uses it
4. Fits the warm wood / scholar's library aesthetic
5. Feels like a museum exhibit of the AI's capabilities

## Complete Block Type Inventory (29 types to showcase)

### Text & Content Blocks:
1. **Prose** — Rich text with bold, italic, inline code, links, blockquotes
2. **Code** — Syntax-highlighted code blocks with language labels
3. **Math** — LaTeX math rendering (KaTeX)
4. **Image** — Photos with captions and source attribution
5. **Video** — Embedded video players

### Visual Diagram Blocks:
6. **Mermaid** — Flowcharts, sequence diagrams, class diagrams, Gantt charts
7. **Chart** — Vega-Lite data visualizations (bar, line, scatter, etc.)
8. **Table** — Interactive data tables with sorting/filtering
9. **Flow** — Sankey/Waterfall flow diagrams
10. **SVG** — Custom SVG illustrations
11. **FinChart** — Financial candlestick/area charts

### Interactive Learning Blocks:
12. **Quiz (MCQ)** — Multiple choice questions with feedback
13. **Quiz (Numeric)** — Number input questions
14. **Quiz (Open)** — Free-text answer questions with rubric
15. **Flashcard** — 3D flip cards with FSRS scheduling (Again/Hard/Good/Easy)
16. **Layer Reveal** — Step-by-step progressive disclosure

### Visualization Blocks:
17. **Heatmap** — GitHub-style study activity calendar
18. **Knowledge Graph** — Interactive force-directed node graph
19. **Concept Map** — Collapsible hierarchical tree
20. **Mastery Timeline** — Learning progression chart over time

### AI-Powered Blocks:
21. **Illustration** — AI-generated hand-drawn images (ian-xiaohei style)
22. **Whiteboard** — Excalidraw drawing canvas
23. **Tutor** — AI Q&A panel
24. **Proposal** — AI suggests edits, user approves/rejects
25. **Conversation** — Multi-turn AI dialogue

### Structure Blocks:
26. **Layer** — Mastery-gated content (unlocks at higher levels)
27. **Callout** — Info/warning/tip/caution boxes
28. **Widget** — Custom HTML/JS interactive elements
29. **Notes** — User annotations and highlights

## Showcase Design Requirements

### Layout:
- Grid or card-based gallery, one card per block type
- Each card shows: icon, name, one-line description, live example
- Clicking a card expands it to show the full interactive demo
- Categories: Text, Diagrams, Interactive, Visualization, AI-Powered, Structure

### Visual Style (Lyceum Warm Wood):
- Background: dark zinc with warm undertones
- Cards: `bg-[#1c1917]/60` with `border-white/10` and `backdrop-blur-sm`
- Accent colors: clay (#c2553a), amber (#f59e0b), sage (#6fb38f)
- Typography: serif headings, mono labels, sans-serif body
- Animations: fade-in on scroll, smooth expand/collapse

### Each Card Must Show:
- Block type name (e.g., "Flashcard")
- What it does (one sentence)
- When the AI uses it (one sentence)
- A LIVE interactive example (not a screenshot)
- The .lmd syntax that generates it (code snippet)

### Example Card Structure:
```
┌─────────────────────────────────────┐
│ 🃏 Flashcard                        │
│ 3D flip card with spaced repetition │
│ AI generates 2-3 per node           │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ [LIVE FLASHCARD DEMO]       │     │
│ │ Front: What is backprop?    │     │
│ │ Click to flip →             │     │
│ └─────────────────────────────┘     │
│                                     │
│ Syntax:                             │
│ :::flashcard {"deck_id": "..."}     │
│ Front: Question                     │
│ Back: Answer                        │
│ :::                                 │
└─────────────────────────────────────┘
```

### Navigation:
- Filter by category (All, Text, Diagrams, Interactive, etc.)
- Search by name
- "Show all" button to expand every card
- Counter: "29 features supported"

## What the Showcase Proves
This showcase demonstrates that Lyceum is NOT just a text reader — it's an interactive learning platform where the AI generates rich, multi-modal content including diagrams, quizzes, flashcards, visualizations, and even AI-generated illustrations.
