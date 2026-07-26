# Tutorial Author Skill (v2.0 — matches current code)

## Purpose
Produce a tutorial step set for a feature so users can be walked through it in 3–5 brief steps, with no paragraphs.

## When to use
- A new feature has shipped or a major UI change landed.
- The feature has at least one screen with stable, queryable DOM targets.

## Architecture (actual code)

```
src/
├─ data/
│   └─ tutorial-steps.ts          (step types + TUTORIAL_STEPS record)
├─ contexts/
│   └─ TutorialContext.tsx         (provider: visibility, step index, completion, navigation)
├─ components/
│   └─ TutorialOverlay.tsx         (spotlight, card, dots, auto-advance, keyboard nav)
└─ pages/
    └─ TutorialPage.tsx            (feature catalog, cards, "Open" button → context)
```

## Step data location

**File:** `src/data/tutorial-steps.ts`

```typescript
export interface TutorialStep {
  target: string;        // CSS selector (prefer [data-tutorial="feature.slot"])
  title: string;         // 2–5 words
  instruction: string;   // 1–2 bullet lines, each starting with "• " and a verb
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  type?: 'info' | 'action';  // action = spotlight pulses, click target to advance
}
```

## Authoring rules (enforced)

- `title` → 2–5 words.
- `instruction` → exactly **one or two** bullet lines joined by `\n`. Each bullet starts with `•` followed by a verb. No periods at end. No emojis. No exclamation marks.
- `target` → prefer `[data-tutorial="feature.slot"]` selectors; fall back to existing semantic IDs.
- `position` → card placement relative to the spotlight.
- `type` → `'action'` makes the spotlight pulse and auto-advance on click. `'info'` (default) has a 5-second auto-advance timer.
- Each feature has **3–5 steps**.

## How to add a new tutorial

### Step 1: Pick the 3–5 things a new user MUST grasp

### Step 2: Write the steps

```typescript
// In src/data/tutorial-steps.ts, add to TUTORIAL_STEPS:
'your-feature-id': [
  {
    target: '[data-tutorial="your-feature.step1"]',
    title: 'Step Title',
    instruction: '• Verb what to do\n• Verb second thing',
    position: 'bottom',
    type: 'info',
  },
  // ... 3-5 steps total
],
```

### Step 3: Add data-tutorial attributes to the target page

```tsx
<div data-tutorial="your-feature.step1" className="...">
  {/* existing content */}
</div>
```

### Step 4: Add the feature to the catalog in TutorialPage.tsx

## Overlay behavior

| Feature | How it works |
|---------|-------------|
| **Spotlight tracking** | Queries target, gets getBoundingClientRect, animates via Framer Motion |
| **Action steps** | `type: 'action'` — spotlight pulses, click to advance |
| **Auto-advance** | Info steps: 5s timer with progress bar. Action steps: wait for click |
| **Keyboard nav** | ArrowRight/Enter = next, ArrowLeft = prev, Escape = close |
| **Completion** | Last step "Done" marks feature completed in localStorage |
