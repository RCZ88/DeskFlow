# RESULT.md — Lyceum UI Revamp & AI Visualization Style Guide

## Status: Final Implementation Plan

The coding agent has successfully scaffolded the new views, routing, and core components. The remaining work is applying the "Warm Wood / Scholar's Library" design system to the new components, and updating the AI prompt layer (`author-guide.md`) to enforce the "ian-xiaohei" interactive visualization style.

---

## Phase 1: Static UI Polish (Warm Wood Application)

### 1. FlashcardBlock.tsx Refinement
The existing `FlashcardBlock` is functionally perfect (3D flip, cloze, FSRS). We need to align its colors with the Warm Wood tokens.

**Instructions for Coding Agent:**
In `src/components/learn/blocks/FlashcardBlock.tsx`:
1. Update the `RATING_CONFIG` to use the design tokens:
   - `1 (Again)`: `borderColor: 'rgba(217,104,70,0.5)'`, `textColor: '#d96846'` (Clay)
   - `2 (Hard)`: `borderColor: 'rgba(168,162,158,0.5)'`, `textColor: '#a8a29e'` (Stone)
   - `3 (Good)`: `borderColor: 'rgba(251,191,36,0.5)'`, `textColor: '#fbbf24'` (Amber)
   - `4 (Easy)`: `borderColor: 'rgba(111,179,143,0.5)'`, `textColor: '#6fb38f'` (Sage)
2. Update the card backgrounds:
   - Front face: `background: 'rgba(217,104,70,0.06)'` (Faint Clay)
   - Back face: `background: 'rgba(111,179,143,0.06)'` (Faint Sage)
3. Ensure the flip animation uses the `--warmth-ease-spring` token: `transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'`.

### 2. LessonLibrary.tsx & BookSpine.tsx Polish
Ensure the "Bookshelf" aesthetic is fully realized.

**Instructions for Coding Agent:**
In `src/components/learn/LessonLibrary.tsx`:
1. Add the `.lyceum-shelf-rail` div beneath each row of books in both Cover Grid and Spine View.
2. In `BookSpine.tsx`, ensure the text uses the `--gilt` color (`#f3d9a4`) and the background uses the `CLOTHS` array colors.

### 3. ProgressDashboard.tsx Polish
Ensure the "Scholar's Ledger" aesthetic is applied.

**Instructions for Coding Agent:**
In `src/components/learn/ProgressDashboard.tsx`:
1. Stat cards should use `bg-[#1c1917]` with a subtle inner shadow (`shadow-inner`).
2. Apply the `springy` motion preset to the stat cards on hover.

---

## Phase 2: AI Prompt Engineering (The "ian-xiaohei" Style)

To ensure the AI generates cute, interactive, and highly visual lessons (inspired by the GitHub repo), we must update `resources/learn/author-guide.md`. This is the file that dictates how the AI writes `.lmd` content.

**Instructions for Coding Agent:**
Append the following section to the end of `resources/learn/author-guide.md`:

```markdown
## Visual Pedagogy Standard (ian-xiaohei Style)
You must prioritize visual, interactive learning over plain text. Whenever a concept can be explained visually or structurally, you MUST use the corresponding `.lmd` directive block.

### 1. Layer Reveal (`:::layer_reveal`)
Use this for ANY step-by-step process, architecture breakdown, or chronological flow. Do not explain processes in prose.
- **Style:** Keep each step concise (1-2 sentences). The UI will render this as a progressive disclosure stack.
- **Example:**
  :::layer_reveal {"title": "How Backprop Works"}
  Step 1: Forward pass (compute prediction)
  Step 2: Loss calculation (measure error)
  Step 3: Backward pass (chain rule gradients)
  Step 4: Weight update (optimizer step)
  :::

### 2. Concept Map (`:::viz_concept_map`)
Use this for hierarchical relationships, taxonomies, or component breakdowns. Do not use bulleted lists for things that have a parent-child relationship.
- **Style:** Provide clear parent nodes and children. The UI will render this as a collapsible tree.
- **Example:**
  :::viz_concept_map {"title": "Transformer Architecture"}
  - Transformer
    - Encoder
      - Self-Attention
      - Feed-Forward
    - Decoder
      - Cross-Attention
  :::

### 3. Flashcards (`:::flashcard`)
You MUST generate 2-3 flashcards per node to support Active Recall. The UI uses FSRS scheduling.
- **Style:** Front should be a concise question. Back should be a 1-sentence answer.
- **Example:**
  :::flashcard {"deck_id": "transformer-fundamentals", "card_type": "basic"}
  Front: What is the time complexity of self-attention?
  Back: O(n² · d), where n is sequence length and d is embedding dimension.
  :::

### 4. Grounding & Misconceptions
Always use `:::grounding` to cite sources and flag common misunderstandings. The UI renders these as distinct, visually separated callouts.
```

---

## Phase 3: Final Verification

1. Run the app and navigate to the `Progress` view. Verify the heatmap and stat cards render with the warm wood aesthetic.
2. Open a lesson in `ReaderView`. Toggle between `[ Original ]` and `[ Expanded ]`. Verify the sage left-border appears on expanded blocks.
3. Click the `Recall` tab. Verify the flashcards flip with the spring animation and the FSRS buttons use the warm wood colors.
4. Generate a new lesson via the `CreateLessonDialog`. Verify the AI outputs `layer_reveal` and `flashcard` blocks as instructed by the updated `author-guide.md`.

## Conclusion
Once these styling tweaks and prompt updates are applied, the Lyceum Learning Page will be fully revamped, matching the user's vision of a tactile, warm, scholar's desk with highly interactive, AI-generated content.
