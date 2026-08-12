# RESULT.md: The Life River & Ring & Grain Overhaul

## 0. Implementation Strategy
This spec resolves all 6 core problems. OpenCode should implement this in the exact order defined in §11 (Build Order). The architecture relies on lifting state up to `LifePage.tsx` and utilizing the existing `cloneElement` pattern in `VoiceInputWrapper` to avoid refactoring form state management.

---

## 1. Voice Input Integration (`phase-form-dialog.tsx`)

**Goal:** Frictionless capture via voice for long-form text fields.

**Implementation:**
Wrap the existing controlled `<Textarea>` and `<Input>` components in `<VoiceInputWrapper>`. Because `VoiceInputWrapper` uses `cloneElement` and dispatches native input events, it will work perfectly with the existing `useReducer` dispatch pattern.

**Modifications in `src/components/life-river/phase-form-dialog.tsx`:**
1. Import: `import { VoiceInputWrapper } from '@/components/VoiceInputWrapper'`
2. Update the following render functions:

```tsx
// In renderStory()
<VoiceInputWrapper>
  <Textarea id="fp-story" value={draft.description} onChange={e => dispatch({ type: 'set', patch: { description: e.target.value } })}
    placeholder="What was this time actually like?..." rows={6} autoFocus />
</VoiceInputWrapper>

// In renderFeelings()
<VoiceInputWrapper>
  <Textarea id="fp-feelings" value={draft.feelingsNote ?? ''} onChange={e => dispatch({ type: 'set', patch: { feelingsNote: e.target.value } })}
    placeholder="How did this chapter actually feel, day to day?" rows={3} />
</VoiceInputWrapper>

// In renderLessons() — Wrap BOTH textareas
<VoiceInputWrapper>
  <Textarea id="fp-lessons" value={draft.lessonsLearned ?? ''} onChange={e => dispatch({ type: 'set', patch: { lessonsLearned: e.target.value } })}
    placeholder="A line or two that the younger you needed to hear…" rows={3} />
</VoiceInputWrapper>
<VoiceInputWrapper>
  <Textarea id="fp-impact" value={draft.impactNotes} onChange={e => dispatch({ type: 'set', patch: { impactNotes: e.target.value } })}
    placeholder="What did this chapter change about you?" rows={3} />
</VoiceInputWrapper>

// In renderReview()
<VoiceInputWrapper>
  <Textarea id="fp-reflection" value={draft.reflection} onChange={e => dispatch({ type: 'set', patch: { reflection: e.target.value, reflectionSource: draft.reflectionSource === 'ai' ? 'ai-edited' : 'manual' } })}
    placeholder="A reflection will appear here — or write your own." rows={4} />
</VoiceInputWrapper>
```

---

## 2. Draft vs. Complete Status

**Goal:** Allow users to save incomplete phases without them rendering fully in the river.

**Implementation:**
1. **DB Migration:** Add a `status` column to the `life_phases` table.
   ```sql
   ALTER TABLE life_phases ADD COLUMN status TEXT DEFAULT 'complete';
   UPDATE life_phases SET status = 'complete' WHERE status IS NULL;
   ```
2. **Type Update (`src/lib/riverMath.ts`):**
   ```ts
   export interface LifePhase {
     // ... existing fields
     status?: 'draft' | 'complete';
   }
   ```
3. **Form Logic (`phase-form-dialog.tsx`):**
   - Modify the `saveNow` function to accept a status argument.
   ```tsx
   const saveNow = (status: 'draft' | 'complete' = 'complete') => {
     const phase: LifePhase = {
       // ... existing fields
       status,
     }
     onSave(phase)
   }
   ```
   - Update the "Save as draft" button (line 837): `onClick={() => saveNow('draft')}`
   - Update the final "Save this chapter" button: `onClick={() => saveNow('complete')}`
4. **Rendering Logic (`LifePage.tsx` & `CoreSample.tsx`):**
   - Draft phases render with `opacity: 0.4` and a dashed border in `PhaseCard`.
   - Draft rings in `CoreSample` render with a dashed SVG stroke.

---

## 3. Lens State Propagation (`LifePage.tsx` & `CoreSample.tsx`)

**Goal:** Changing the lens in the CoreSample instantly filters/highlights data across the entire River Mode.

**Implementation:**
1. **Lift State in `LifePage.tsx`:**
   ```tsx
   const [lens, setLens] = useState<LensId>('phases')
   ```
   Pass `lens` and `setLens` down to `<CoreSample>`, `<TimelineView>`, and `<PhaseCard>`.

2. **Refactor `CoreSample.tsx`:**
   Remove `const [lens, setLens] = useState<LensId>('phases')`.
   Accept `lens` and `onLensChange` as props.
   ```tsx
   interface CoreSampleProps {
     // ... existing props
     lens: LensId;
     onLensChange: (lens: LensId) => void;
   }
   ```

---

## 4. PhaseCard Lens-Driven Rendering (`PhaseCard.tsx`)

**Goal:** The card dynamically emphasizes sections based on the active lens.

**Implementation:**
In `src/components/life-river/PhaseCard.tsx`, add `lens` to props. Wrap the 8 sections in a helper component or apply conditional opacity classes.

```tsx
interface PhaseCardProps {
  // ... existing props
  lens: LensId;
}

export function PhaseCard({ phase, active, allPhases, memories, longTermGoals, onActiveChange, onSave, onReflect, onKeepReflection, onOpenMemory, onJump, lens }: PhaseCardProps) {
  // ... existing logic

  const sectionOpacity = (sectionLens: LensId) => lens === 'phases' || lens === sectionLens ? 'opacity-100' : 'opacity-30';

  return (
    <motion.div data-lifephase="phase-card" ...>
      {/* Header remains unchanged */}

      <WarmCard className="rounded-t-none border-t-0 relative overflow-hidden p-6 space-y-6">
        {/* 1. Memory Pearls - visible if lens === 'memories' or 'phases' */}
        {phaseMemories.length > 0 && (
          <div className={sectionOpacity('memories')}> ... </div>
        )}

        {/* 2. Story - hide if lens !== 'phases' to reduce noise */}
        {phase.description && lens === 'phases' && ( ... )}

        {/* 3. Key Moments - visible if lens === 'phases' */}
        {milestones.length > 0 && (
          <div className={sectionOpacity('phases')}> ... </div>
        )}

        {/* 4. People - visible if lens === 'phases' */}
        {people.length > 0 && (
          <div className={sectionOpacity('phases')}> ... </div>
        )}

        {/* 5. Mood - visible if lens === 'phases' */}
        {(phase.moodStart != null || phase.moodEnd != null) && (
          <div className={sectionOpacity('phases')}> ... </div>
        )}

        {/* 6. Lessons - visible if lens === 'phases' */}
        {phase.lessonsLearned && (
          <div className={sectionOpacity('phases')}> ... </div>
        )}

        {/* Long-term goals - visible if lens === 'gold' or 'phases' */}
        {phaseLtgs.length > 0 && (
          <div className={sectionOpacity('gold')}> ... </div>
        )}

        {/* Connections & Reflection - always visible */}
        ...
      </WarmCard>
    </motion.div>
  )
}
```

---

## 5. Ring & Grain Visualization (`CoreSample.tsx`)

**Goal:** A core sample of a tree trunk where each ring is a life phase. Clicking opens the edit flow.

**Implementation (`RingCanvas.tsx`):**
- **SVG Canvas:** 256x256px.
- **Rings:** Each phase is an SVG `<circle>`.
  - `cx` = 128, `cy` = 128.
  - `r` = 20 + (index * 12).
  - `strokeWidth` = `Math.max(2, phase.magnitude / 10)`.
  - `stroke` = `phase.color || categoryOf(phase.category).color`.
  - `strokeDasharray` = `phase.status === 'draft' ? '4 4' : 'none'`.
- **Organic Texture:** Apply an SVG `<filter>` to the `<g>` wrapping the rings:
  ```xml
  <filter id="wood-grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" />
  </filter>
  ```
- **Breathing Animation:** Apply Framer Motion to the outermost ring (current/latest phase):
  ```tsx
  <motion.circle
    animate={{ scale: [1, 1.03, 1] }}
    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    // ... other props
  />
  ```
- **Lens Behaviors:**
  - `phases`: All rings full opacity.
  - `covenant`: Rings fade to 0.15 opacity. Rings with `covenantCompletionRate > 0.6` glow (drop-shadow filter).
  - `gold`: Rings fade. Amber dots rendered on rings matching `ltgsByPhase` deadlines.
  - `memories`: Rings fade. Pearl dots rendered on rings matching `memoriesByPhase`.
- **Edit from Visualization (Click Handler):**
  ```tsx
  <circle onClick={() => onPhaseClick(phase.id)} style={{ cursor: 'pointer' }} />
  ```
  In `LifePage.tsx`, `onPhaseClick` sets `activePhaseId` and opens the `PhaseFormDialog`:
  ```tsx
  const [editingPhase, setEditingPhase] = useState<LifePhase | null>(null)
  // ...
  <PhaseFormDialog open={!!editingPhase} onOpenChange={(o) => !o && setEditingPhase(null)} initial={editingPhase} ... />
  ```

---

## 6. AI Reflection & Era Trends

**Goal:** Grounded, poetic AI that helps frame life phases.

**Backend IPC Handlers (Electron Main Process):**
1. `lifePhase:aiReflect` (Already exists, ensure prompt constraint is enforced)
   - **Prompt Constraint:** "You are a gentle biographer. Using ONLY the facts provided in the phase description, milestones, and the user's answers, write a single paragraph reflection. Do not invent events, names, or dates. If facts are missing, speak generally about the emotional theme."
2. `lifePhase:aiAssist` (Already exists, used in Step 6 "Lessons")
3. `lifePhase:getPeriodContext` (New or modified)
   - **Logic:** Queries the database for all memories, covenant completions, and goals within the `startYear` and `endYear` of a phase.
   - **Returns:** `{ memoryCount, covenantCompletionRate, linkedGoals }` (Used to render lens visualizations and data strips).

---

## 11. Build Order (Shippable Increments)

1. **DB & Types:** Add `status` column. Update `LifePhase` type in `riverMath.ts`. (Safe, additive).
2. **Lens State Lift:** Refactor `LifePage.tsx` and `CoreSample.tsx` to share `lens` state. Pass `lens` to `PhaseCard`.
3. **PhaseCard Lens Logic:** Implement the conditional opacity/rendering in `PhaseCard.tsx` based on `lens`.
4. **Ring & Grain SVG:** Build the organic rings, breathing animation, and lens-based dot rendering in `CoreSample.tsx`/`RingCanvas.tsx`.
5. **Voice Input:** Wrap textareas in `phase-form-dialog.tsx` with `VoiceInputWrapper`.
6. **Draft Status:** Wire up the `saveNow('draft')` button and apply dashed styling to draft cards/rings.
7. **Edit Flow:** Wire `CoreSample` ring clicks to open `PhaseFormDialog` from `LifePage.tsx`.
8. **Backend Context:** Ensure `lifePhase:getPeriodContext` returns the correct aggregate data for lenses.

---

## 12. What the Specialist Cannot Do — Agent Setup Required

OpenCode, please note the following:

1. **VoiceInputWrapper Import Path:** Ensure `@/components/VoiceInputWrapper` is the correct alias path. If it's in `src/components/`, the alias is correct.
2. **SVG Filter Performance:** The `feTurbulence` filter can be GPU-intensive. If the river stutters, reduce `numOctaves` to 2 or remove the filter for rings with a small magnitude.
3. **DB Migration:** You must execute the `ALTER TABLE life_phases ADD COLUMN status TEXT DEFAULT 'complete';` migration before implementing the Draft Status UI.
