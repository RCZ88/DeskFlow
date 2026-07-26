# Lyceum Visualization & Active Recall Package
## Warm Wood Edition — v1.0

This package extends the Lyceum learning platform with rich visualizations, active recall (FSRS), and AI-generated concept maps — all styled with your exact warm wood "Scholar's Library" aesthetic.

---

## 📁 Package Structure

```
lyceum_visualization_package/
├── IMPLEMENTATION_GUIDE.md          # Complete architecture & implementation guide
├── AI_STYLE_PROMPT.md               # Prompt for your lesson-generation AI
├── RECONNAISSANCE_PROMPT.md         # Prompt to extract style from codebase (already used)
├── README.md                        # This file
│
├── components/
│   └── blocks/
│       ├── HeatmapBlock.tsx         # Study streak calendar (sage gradient)
│       ├── KnowledgeGraphBlock.tsx  # Force-directed graph (Cytoscape.js)
│       ├── FlashcardBlock.tsx       # FSRS flashcard with 3D flip
│       ├── LayerRevealBlock.tsx     # Progressive step disclosure
│       ├── ConceptMapBlock.tsx      # Collapsible concept tree
│       ├── MasteryTimelineBlock.tsx # Recharts area chart
│       ├── WhiteboardBlock.tsx      # Excalidraw iframe wrapper
│       └── BlockRenderer_EXTENSION.tsx # Switch cases to paste into BlockRenderer
│
├── shared/
│   └── types/
│       └── viz-blocks.ts            # Extended TypeScript types
│
├── services/
│   └── flashcard.service.ts         # FSRS algorithm integration
│
├── db/
│   └── migrations/
│       └── 004_flashcards_and_viz.sql # SQLite schema additions
│
├── ipc/
│   ├── main-handlers.ts           # IPC handlers for main process
│   └── preload-bridge.ts          # Preload bridge additions
│
├── prompts/
│   └── ai-prompts.ts              # AI prompt templates
│
└── package-additions.json         # Dependencies to install
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install cytoscape cytoscape-dagre recharts ts-fsrs mermaid
npm install -D @types/cytoscape
```

### 2. Apply Database Migration
```bash
# Run in your SQLite database:
sqlite3 your-database.db < db/migrations/004_flashcards_and_viz.sql
```

### 3. Extend Types
```typescript
// In src/shared/learn/types.ts
// Add the new BlockType union members from shared/types/viz-blocks.ts
```

### 4. Add IPC Handlers
```typescript
// In src/services/learn/index.ts
// Paste the handlers from ipc/main-handlers.ts
```

### 5. Update Preload Bridge
```typescript
// In src/preload.ts
// Paste the bridge methods from ipc/preload-bridge.ts
```

### 6. Extend BlockRenderer
```typescript
// In src/components/learn/blocks/BlockRenderer.tsx
// Paste the switch cases from BlockRenderer_EXTENSION.tsx
// Import the new block components
```

### 7. Copy Components
```bash
# Copy all block components to your project:
cp components/blocks/*.tsx src/components/learn/blocks/
```

### 8. Add AI Prompts
```typescript
// In src/services/learn/promptLibrary.ts
// Paste the prompts from prompts/ai-prompts.ts
```

---

## 🎨 Design System Applied

All components use your exact tokens:

| Token | Value | Usage |
|-------|-------|-------|
| Page bg | `#09090b` | zinc-950 |
| Card bg | `#1c1917` | warm stone |
| Border | `#292524` | zinc-800 |
| Accent | `#d97706` | amber CTA |
| Clay | `#c2553a` | clay-600 |
| Sage | `#6fb38f` | sage-400 |
| Serif | Source Serif 4 | headings, CTAs |
| Sans | Inter | UI, body |
| Mono | JetBrains Mono | labels, data |

---

## 📋 Implementation Phases

See `IMPLEMENTATION_GUIDE.md` Section 8 for the 10-week phased rollout plan.

---

## 🧪 Testing Checklist

- [ ] Heatmap renders with sage gradient on zinc-950
- [ ] Knowledge graph shows mastery-colored nodes
- [ ] Flashcard flips with 3D animation
- [ ] FSRS intervals update correctly on review
- [ ] Layer reveal steps unlock sequentially
- [ ] Concept map nodes collapse/expand
- [ ] Mastery timeline shows amber area chart
- [ ] Whiteboard loads Excalidraw in iframe
- [ ] All components match warm wood aesthetic
- [ ] Keyboard shortcuts work (Space, 1-4)

---

*Built for the Lyceum "Scholar's Library" — dark, warm, tactile, editorial.*
