# Context Bundle — Lyceum Block Renderers Design Audit

## Current Block Types (29 total)

### Rendered by parser + renderer (working):
1. `prose` — ProseBlock.tsx (119 lines) — ✅ GOOD
2. `math` — MathBlock.tsx (50 lines) — ✅ GOOD
3. `mermaid` — MermaidBlock.tsx (87 lines) — ✅ GOOD
4. `code` — CodeBlock.tsx (92 lines) — ✅ GOOD
5. `image` — ImageBlock.tsx (58 lines) — ✅ GOOD
6. `video` — VideoBlock.tsx — ✅ GOOD
7. `quiz` — QuizBlock.tsx (143 lines) — ✅ GOOD
8. `callout` — CalloutBlock.tsx (51 lines) — ✅ GOOD
9. `layer` — LayerBlock.tsx (83 lines) — ✅ GOOD
10. `chart` — ChartBlock.tsx (86 lines) — ✅ GOOD
11. `table` — TableBlock.tsx (71 lines) — ⚠️ NEEDS WORK
12. `flow` — FlowBlock.tsx (102 lines) — ✅ GOOD
13. `finchart` — FinChartBlock.tsx (127 lines) — ✅ GOOD
14. `svg` — SvgBlock.tsx (42 lines) — ✅ GOOD
15. `viz_heatmap` — HeatmapBlock.tsx (130 lines) — ✅ GOOD
16. `viz_graph` — KnowledgeGraphBlock.tsx (198 lines) — ✅ GOOD
17. `flashcard` — FlashcardBlock.tsx (193 lines) — ✅ GOOD
18. `layer_reveal` — LayerRevealBlock.tsx (179 lines) — ✅ GOOD
19. `viz_concept_map` — ConceptMapBlock.tsx (126 lines) — ✅ GOOD
20. `viz_timeline` — MasteryTimelineBlock.tsx (110 lines) — ✅ GOOD
21. `whiteboard` — WhiteboardBlock.tsx (68 lines) — ⚠️ NEEDS WORK
22. `illustration` — IllustrationBlock.tsx (122 lines) — ✅ GOOD

### MISSING renderer:
23. `widget` — WidgetHost.tsx — ❌ FILE DOES NOT EXIST

### Interaction blocks (renderer exists):
24. `tutor` — TutorBlock.tsx
25. `proposal` — ProposalBlock.tsx
26. `conversation` — ConversationBlock.tsx
27. `notes` — NotesBlock.tsx

## Design System (Lyceum Warm Wood Theme)

### Colors used across blocks:
- Background: `bg-zinc-800/30` (block container), `bg-zinc-900/40` (inner areas)
- Borders: `border-zinc-700/40` (container), `border-zinc-800` (inner)
- Text: `text-zinc-100` (headings), `text-zinc-200` (body), `text-zinc-400/500` (secondary)
- Accent clay: `text-clay-300/400`, `bg-clay-500/10/15/20`
- Accent amber: `text-amber-400`, `bg-amber-500/10`
- Accent sage: `text-sage-400`, `bg-sage-400/10`
- Mastery levels: L0=#5B6472, L1=#5B8DEF, L2=#23B5B5, L3=#3CCB7F, L4=#A78BFA, L5=#F5C04E

### Typography:
- Headings: `font-serif font-semibold`
- Body: `text-sm leading-relaxed` (prose), `text-xs` (UI elements)
- Code: `font-mono` or `JetBrains Mono`
- Captions: `text-sm text-zinc-500 italic text-center`

### Spacing pattern:
- Block container: `my-6 py-4 px-4 rounded-xl`
- Inner sections: `space-y-4` or `space-y-2`
- Between blocks: `my-6`

## Issues to Fix

### HIGH PRIORITY:
1. **WidgetHost.tsx missing** — Widget blocks render nothing
2. **`border-t-clay-400` spinner** — Clay palette may not be defined for borders
3. **No empty states** — Blocks assume valid data always

### MEDIUM PRIORITY:
4. **LEVEL_COLORS duplicated** in 3 files — centralize
5. **Caption alignment** — MathBlock left, others center
6. **No responsive heights** — Fixed 280px/400px

### LOW PRIORITY:
7. **Mixed inline/Tailwind styles** — inconsistent
8. **No lazy loading on images**
9. **Accessibility gaps** — no ARIA labels

## Lyceum Design Principles (from existing UI):
- Warm, tactile feel — book cloth, shelf rails, gilt text
- Dark backgrounds with warm accents (clay, amber, sage)
- Serif headings, mono labels
- Subtle animations (fadeSlideIn, springy)
- Progressive disclosure (layers, collapsibles)
- Interactive elements with hover states
- Consistent outer shell across all blocks
