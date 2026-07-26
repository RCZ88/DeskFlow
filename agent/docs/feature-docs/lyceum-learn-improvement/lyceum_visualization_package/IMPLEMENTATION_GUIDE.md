# Lyceum Visualization & Active Recall Enhancement
## Implementation Guide v1.0 — Warm Wood Edition

> **Scope:** Extend Lyceum's `.lmd` format and React component suite to support rich visualizations, active recall (FSRS), AI-generated concept maps, and interactive learning widgets.
> **Target:** Electron + React + SQLite + Tailwind CSS v4 + Framer Motion
> **Aesthetic:** Warm wood "Scholar's Library" — dark zinc backgrounds, clay/amber/sage accents, Source Serif 4 editorial headers, physical book metaphors

---

## Table of Contents

1. [Architecture Decision](#1-architecture-decision)
2. [New Block Types](#2-new-block-types)
3. [Component Inventory](#3-component-inventory)
4. [FSRS Integration](#4-fsrs-integration)
5. [AI-Generated Visualizations](#5-ai-generated-visualizations)
6. [Database Schema](#6-database-schema)
7. [IPC Endpoints](#7-ipc-endpoints)
8. [Implementation Phases](#8-implementation-phases)
9. [Dependencies](#9-dependencies)
10. [Design Token Reference](#10-design-token-reference)

---

## 1. Architecture Decision

### Block-Based Extensibility

Your existing `BlockRenderer.tsx` switches on `block.type`. We extend this pattern:

```
.lmd document → parseLessonMarkdown.ts → LdocBlock[] → BlockRenderer
                                                    ↓
                                              NEW: viz-* block types
                                                    ↓
                                        React component per type
```

**No new "language" needed.** The `.lmd` parser already supports arbitrary block metadata.

### Two Rendering Tiers

| Tier | Use Case | Tech |
|------|----------|------|
| **Tier 1: React Components** | Heatmaps, graphs, flashcards, timelines | React + library (Cytoscape, Recharts) |
| **Tier 2: Sandboxed Iframe** | Whiteboards, complex simulations | `WidgetHost.tsx` already exists |

---

## 2. New Block Types

Extend `BlockType` in `src/shared/learn/types.ts`:

```typescript
export type BlockType = 
  | 'prose' | 'math' | 'mermaid' | 'code' | 'image' | 'video' | 'widget'
  | 'quiz' | 'callout' | 'layer' | 'chart' | 'table' | 'flow' | 'finchart'
  | 'svg' | 'tutor' | 'proposal' | 'conversation' | 'notes'
  | 'viz_heatmap' | 'viz_graph' | 'viz_timeline' | 'viz_concept_map'
  | 'flashcard' | 'flashcard_occlusion' | 'layer_reveal' | 'whiteboard'
  | 'quiz_mcq_image' | 'comparison' | 'code_playground' | 'formula_explorer';
```

### Block Schema Examples

#### `viz_heatmap`
```json
{
  "type": "viz_heatmap",
  "id": "streak-2026-q3",
  "meta": {
    "data_source": "learn_sessions",
    "date_range": "last_90_days",
    "color_scale": "mastery",
    "cell_size": 12
  }
}
```

#### `viz_graph`
```json
{
  "type": "viz_graph",
  "id": "prereq-dag-p7",
  "meta": {
    "graph_type": "dag",
    "layout": "cose",
    "nodes_source": "curriculum",
    "highlight_mastery": true
  }
}
```

#### `flashcard`
```json
{
  "type": "flashcard",
  "id": "fc-backprop-01",
  "meta": {
    "deck_id": "pytorch-fundamentals",
    "card_type": "basic",
    "front": "What is the chain rule in backpropagation?",
    "back": "∂L/∂w = ∂L/∂a · ∂a/∂z · ∂z/∂w",
    "tags": ["calculus", "backprop"]
  }
}
```

#### `layer_reveal`
```json
{
  "type": "layer_reveal",
  "id": "reveal-transformer-01",
  "meta": {
    "title": "How Transformer Attention Works",
    "steps": [
      { "label": "Input Embeddings", "content": "..." },
      { "label": "Query/Key/Value", "content": "..." }
    ],
    "reveal_mode": "sequential",
    "mastery_unlock": "L2"
  }
}
```

---

## 3. Component Inventory

### 3.1 HeatmapCalendar (`components/blocks/HeatmapBlock.tsx`)
- GitHub-style contribution heatmap
- Sage gradient on zinc-950 background
- Tooltip: date + activity details
- Click cell → jump to study session

### 3.2 KnowledgeGraph (`components/blocks/KnowledgeGraphBlock.tsx`)
- Cytoscape.js force-directed graph
- Mastery-colored nodes (L0-L5 palette)
- Amber highlight on selection
- Zoom/pan, search, path highlighting

### 3.3 FlashcardDeck (`components/blocks/FlashcardBlock.tsx`)
- 3D flip animation (CSS transform, 0.5s cubic-bezier(0.16,1,0.3,1))
- 4 ratings: Again (red) | Hard (amber) | Good (green) | Easy (blue)
- FSRS-5 algorithm via `ts-fsrs`
- Image occlusion mode
- Cloze deletion mode
- Keyboard: Space (flip), 1-4 (rate)

### 3.4 ConceptMap (`components/blocks/ConceptMapBlock.tsx`)
- Collapsible hierarchical tree
- Mastery-colored nodes
- Zoom controls
- Misconception warnings

### 3.5 LayerReveal (`components/blocks/LayerRevealBlock.tsx`)
- Progressive disclosure
- Mastery-gated mode
- Amber active step, zinc inactive
- Animated transitions

### 3.6 MasteryTimeline (`components/blocks/MasteryTimelineBlock.tsx`)
- Recharts area chart
- Amber gradient fill
- Target reference line
- Event annotations
- Brush zoom

### 3.7 Whiteboard (`components/blocks/WhiteboardBlock.tsx`)
- Excalidraw iframe embed
- Warm pen presets
- Export PNG/SVG

---

## 4. FSRS Integration

### Why FSRS over SM-2
- Adaptive: learns from your recall patterns
- 20-30% better retention prediction
- Anki, RemNote, Quizlet all moving to FSRS
- Open source: `ts-fsrs` npm package

### Algorithm
```typescript
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';
const f = fsrs(generatorParameters({ maximum_interval: 365 }));
const scheduling = f.repeat(card, new Date());
const nextCard = scheduling[Rating.Good].card;
```

### Database Schema (Migration 004)
```sql
CREATE TABLE learn_decks (id, lesson_id, title, node_ids, created_at, updated_at);
CREATE TABLE learn_cards (id, deck_id, card_type, front, back, front_media, back_media, tags, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review, created_at);
CREATE TABLE learn_card_reviews (id, card_id, rating, review_date, scheduled_days, elapsed_days, stability, difficulty, state);
CREATE TABLE learn_viz_state (id, user_id, viz_type, viz_id, state_json, updated_at);
CREATE TABLE learn_sessions (id, date, duration, nodes_seen, quizzes_taken, cards_reviewed, mastery_gained);
```

### Service Layer
`services/flashcard.service.ts` — getDueCards, processReview, importGeneratedCards, getDeckStats

---

## 5. AI-Generated Visualizations

### Concept Map Generation
```typescript
// Prompt: Analyze lesson content → generate JSON tree
// Renderer: D3 tree layout or custom SVG tree
```

### Mermaid Diagram Generation
```typescript
// Prompt: Given technical description → generate Mermaid code
// System auto-applies warm wood color theme
```

### Image Occlusion Generation
```typescript
// Prompt: Given diagram → identify 5-8 elements to hide
// Output: { x, y, width, height, label } array
```

---

## 6. Database Schema

See `db/migrations/004_flashcards_and_viz.sql` for complete schema.

Key additions:
- `learn_decks` — flashcard deck metadata
- `learn_cards` — individual cards with FSRS state
- `learn_card_reviews` — review history
- `learn_viz_state` — user visualization preferences
- `learn_sessions` — study session tracking for heatmaps

---

## 7. IPC Endpoints

Add to `src/services/learn/index.ts`:

```typescript
ipcMain.handle('learn:getDueCards', async (_event, args) => 
  flashcardService.getDueCards(db, args.deckId, args.limit));
ipcMain.handle('learn:submitCardReview', async (_event, args) => 
  flashcardService.processReview(db, args.cardId, args.rating));
ipcMain.handle('learn:generateCards', async (_event, args) => { ... });
ipcMain.handle('learn:getStudyHeatmap', async (_event, args) => 
  dashboardService.getHeatmapData(db, args.days));
ipcMain.handle('learn:getConceptMap', async (_event, args) => { ... });
ipcMain.handle('learn:saveVizState', async (_event, args) => { ... });
```

Update `src/preload.ts`:
```typescript
learnGetDueCards: (args) => ipcRenderer.invoke('learn:getDueCards', args),
learnSubmitCardReview: (args) => ipcRenderer.invoke('learn:submitCardReview', args),
learnGetStudyHeatmap: (args) => ipcRenderer.invoke('learn:getStudyHeatmap', args),
learnGetConceptMap: (args) => ipcRenderer.invoke('learn:getConceptMap', args),
learnSaveVizState: (args) => ipcRenderer.invoke('learn:saveVizState', args),
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Extend `BlockType` union
2. Extend parser for new block headers
3. Extend `BlockRenderer` switch cases
4. Run migration `004_flashcards_and_viz.sql`
5. Install dependencies

### Phase 2: Core Visualizations (Week 3-4)
1. HeatmapCalendar — pure SVG, study session data
2. MasteryTimeline — Recharts integration
3. KnowledgeGraph — Cytoscape.js wrapper
4. LayerReveal — progressive disclosure

### Phase 3: Active Recall (Week 5-6)
1. Flashcard service — FSRS algorithm
2. FlashcardBlock — UI with flip animation
3. AI card generation — prompt + import flow
4. Image occlusion — canvas-based hiding

### Phase 4: AI Visualizations (Week 7-8)
1. ConceptMap — AI-generated tree
2. Mermaid AI — auto-generate diagrams
3. Whiteboard — Excalidraw embed
4. Smart annotations

### Phase 5: Polish (Week 9-10)
1. Keyboard shortcuts
2. Mobile responsiveness
3. Export PNG/SVG
4. Performance optimization

---

## 9. Dependencies

```json
{
  "dependencies": {
    "cytoscape": "^3.26.0",
    "cytoscape-dagre": "^2.5.0",
    "recharts": "^2.12.0",
    "ts-fsrs": "^4.0.0",
    "@excalidraw/excalidraw": "^0.17.0",
    "mermaid": "^10.9.0"
  },
  "devDependencies": {
    "@types/cytoscape": "^3.19.0"
  }
}
```

Bundle size: ~430KB incremental (excluding lazy-loaded Excalidraw)

---

## 10. Design Token Reference

### Colors
```css
/* Backgrounds */
--bg-page:      #09090b
--bg-card:      #1c1917
--bg-input:     #141211
--bg-hover:     color-mix(in srgb, #d97706 4%, #1c1917)

/* Text */
--text-primary:   #f5f5f4
--text-secondary: #a8a29e
--text-muted:     #57534e

/* Accents */
--accent-amber: #d97706
--accent-clay:  #c2553a
--accent-sage:  #6fb38f
--accent-sky:   #5ab0c9
--accent-gold:  #f3d9a4
--accent-glow:  #f7f3ee

/* Borders */
--border-default: #292524
--border-hover:   #d97706
--border-focus:   rgba(251,191,36,0.5)

/* Mastery */
--mastery-L0: #5B6472
--mastery-L1: #5B8DEF
--mastery-L2: #23B5B5
--mastery-L3: #3CCB7F
--mastery-L4: #A78BFA
--mastery-L5: #F5C04E
```

### Typography
```css
--font-serif: "Source Serif 4", Georgia, serif
--font-sans:  Inter, system-ui, sans-serif
--font-mono:  "JetBrains Mono", "Fira Code", monospace
```

### Animation
```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
--dur-fast:    120ms
--dur-base:    220ms
--dur-slow:    420ms
```

### Component Patterns
```css
/* Card */
border: 1px solid #292524;
border-radius: 12px;
background: #1c1917;
padding: 18px;
/* hover: */
border-color: #d97706;
background: color-mix(in srgb, #d97706 4%, #1c1917);
transform: translateY(-1px);

/* Primary CTA */
border: 1px solid rgba(240,168,146,0.4);
background: rgba(217,104,70,0.15);
font-family: "Source Serif 4", Georgia, serif;
color: #f7f3ee;
/* hover: */
background: rgba(217,104,70,0.25);
box-shadow: 0 0 20px rgba(194,85,58,0.25);

/* Phase Tab */
border: 1px solid #292524;
border-radius: 9999px;
background: #1c1917;
/* active: */
border-color: #d97706;
background: color-mix(in srgb, #d97706 10%, transparent);
color: #d97706;

/* Input */
background: rgba(24,24,27,0.6);
border: 1px solid rgba(63,63,70,0.5);
color: #e4e4e7;
/* focus: */
border-color: rgba(251,191,36,0.5);

/* Stat Card */
border: 1px solid #292524;
border-radius: 10px;
background: rgba(24,24,27,0.4);
```

---

*End of Implementation Guide. See accompanying code files for complete source.*
