# Round 2 — Specialist → Project Owner

## Received: Architectural Blueprint

**Status:** Specialist has analyzed the Context Bundle and produced a complete architectural plan.

**Decisions Made:**
1. **LessonLibrary** → Add spine view toggle + shelf rails (already partially exist)
2. **ProgressDashboard** → New "Scholar's Ledger" view with stat cards + heatmap
3. **ReaderView** → Original/Expanded toggle using is_expansion flag on blocks
4. **ReaderView** → Content/Recall/Tutor tab navigation
5. **StudyView** → New dedicated flashcard review page
6. **AI Content** → Update prompts to generate viz blocks (layer_reveal, concept_map, flashcard)

**Backend Gaps Identified:**
- `is_expansion` flag on blocks — no DB column exists yet
- `learn_sessions` table may be empty — heatmap needs data
- Flashcards need auto-generation on lesson import

**Action Required:** Project Owner to acknowledge the plan and begin Phase 1 implementation, OR flag any disagreements.

---

## Specialist's Architectural Blueprint

### Phase 1: Static App UI — Bookshelf & Dashboard

**1. LessonLibrary.tsx Revamp (The Bookshelf)**
- View toggle: `[ Cover Grid ]` vs `[ Spine View ]`
- Spine View: new `BookSpine` component using CLOTHS array, vertical text, mastery ring
- Shelf rails already exist — keep them

**2. ProgressDashboard.tsx (New View)**
- "Scholar's Ledger" with 4 stat cards
- Heatmap at top using viz_heatmap block
- Mapped to `learn:getTutorDashboard` and `learn:getStudyHeatmap` IPCs

### Phase 2: ReaderView Revamp — The Expansion Toggle

**3. Original/Expanded Toggle**
- Segmented control at top of reading pane
- Filters blocks by `is_expansion` flag
- Expanded blocks get left sage border

**4. Content/Recall/Tutor Tabs**
- Tab bar above content area
- Recall tab renders FlashcardBlock for current node
- Tutor button toggles TutorPanel visibility

### Phase 3: Active Recall & Study Hub

**5. StudyView.tsx**
- Dedicated flashcard review page
- FSRS grading buttons with warm wood palette
- Keyboard shortcuts (1-4 for grading, Space to flip)

### Phase 4: AI Content Generation

**6. Prompt Updates**
- Force AI to use `:::layer_reveal`, `:::viz_concept_map`, `:::flashcard` blocks
- Ensure warm wood color consistency
