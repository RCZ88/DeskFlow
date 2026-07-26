# Design Prompt: Interactive Tutorial System

## Raw Request

"Create a reusable skill for creating tutorials that can apply to all projects. Brief instructions, digestible bullet points (no long paragraphs). Multiple pages if needed. Interactive tutorial with highlights and direction. Use the generate-prompt skill."

## Context

Read `agent/docs/tutorial-system-revamp/CONTEXT_BUNDLE.md` as your codebase reference. It contains:
- The current `TutorialPage.tsx` (static feature catalog, 15 features)
- The existing `TutorialOverlay.tsx` component (unwired, has spotlight + step navigation)
- GlassCard component specs
- Design tokens and page patterns

## Problem

The current `/tutorial` page is a **static feature catalog** — a grid of cards listing all 15 app features with descriptions. There is no interactive walkthrough, no guided tour, no step-by-step introduction. The `TutorialOverlay` component exists but is not connected to the page. Users have no way to be guided through each feature's interface, and the feature descriptions use long paragraphs instead of digestible bullet points.

Additionally, there is **no reusable framework** for creating tutorial content — each future feature would need to build its tutorial from scratch.

## Design Requirements

### A. Reusable Tutorial Skill
Design a **reusable skill/pattern** for creating tutorials that can be applied to any page or component in the project. It should:
- Define a `.tutorial.md` or `tutorial-steps.ts` file format for declaring steps
- Have a `useTutorial(featureId: string, steps: TutorialStep[])` hook
- Be importable and composable across pages
- Separate **step definitions** from **rendering logic**
- Follow the existing `TutorialStep` interface:
  ```tsx
  interface TutorialStep {
    target: string;   // CSS selector for highlighted element
    title: string;    // step title (2-5 words)
    instruction: string; // 1-2 brief bullet points (NOT paragraphs)
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  }
  ```

### B. Interactive Walkthrough Mechanics
The interactive overlay must:
- **Highlight** the target element with a spotlight ring (300px circle, amber glow — already exists in TutorialOverlay)
- **Dim the rest** of the page (backdrop — already exists)
- Show a **progress indicator** (step X of Y) — already exists
- Support **multi-page** navigation with Back/Next/Done buttons — already exists
- Include a **"Try it"** button that navigates to the feature route — already exists
- Close on backdrop click or X button — already exists

### C. Per-Feature Tutorial Steps
For each of the 15 features, define **3-5 brief steps** (bullet points only, no paragraphs). Each step must:
- Target a real element on the feature's page (use CSS selectors like `[data-tutorial="..."]` or existing semantic selectors)
- Have a short title (2-5 words)
- Have 1-2 bullet-point instructions (not paragraphs)
- Use one of the 5 position modes

### D. Tutorial Content Style
All instructional text **MUST** be:
- **Brief bullet points** — max 2 per step
- **No paragraphs** — "No lengthy paragraphs, keep instructions brief and digestible"
- **Action-oriented** — start each bullet with a verb ("Click", "Drag", "Select", "Toggle")
- **Professional tone** — no emojis, no exclamation marks

Yes — this constraint is critical. No paragraphs anywhere in tutorial content.

### E. Integration with Current TutorialPage
The existing `TutorialPage` must be updated to:
1. Import and render `TutorialOverlay` (use default import: `import TutorialOverlay from '../components/TutorialOverlay'`)
2. Add state for: `activeFeature`, `currentStepIndex`, `isOverlayVisible`
3. When user clicks "Open" on a feature card → set active feature → show overlay at step 0
4. When overlay navigates to a different page ("Try it") → close overlay first, then navigate
5. Mark feature as "explored" in localStorage progress only after ALL steps completed

### F. Data Flow
- Tutorial steps stored as a `Record<string, TutorialStep[]>` keyed by feature `id`
- LocalStorage persists: which tutorials have been completed (separate from the existing `guide-progress`)
- Optional per-feature tutorial state: which features have been fully walked through vs just "opened"

## Engineering Task

Design the **complete data processing pipeline**:
1. How tutorial step JSON/TS files are stored and imported
2. How the `useTutorial` hook manages state (current step, visibility, navigation callbacks)
3. How progress (completed tutorials) is persisted in localStorage
4. How steps map to CSS selectors on each feature's target route

## Design Task

Provide **high-fidelity visual specs** for:
1. The tutorial overlay's appearance (existing in TutorialOverlay — can stay as-is or be refined)
2. The spotlight ring behavior (currently static center — should track target element position if possible)
3. The step card layout (already uses bg-zinc-800 rounded-xl — confirm/fine-tune)
4. How "completed tutorial" is visually reflected on feature cards in TutorialPage
5. The new page structure after integrating overlay

## Constraints

- Must work with **existing** TutorialOverlay component (don't rewrite it — extend it if needed)
- All tutorial content **must use bullet points** — zero paragraphs
- Must use **existing** routing (`react-router-dom` in `App.tsx`)
- Must use **existing** PageShell layout system
- Must follow design system tokens (zinc-950 base, pink-500 primary, 8px grid, rounded-xl max)
- Tutorial steps must target **real UI elements** — verify each CSS selector against the actual page
- Max file size: keep the TutorialPage under 600 lines total (including step definitions)

## Output Format

Deliver:
1. **`tutorial-steps.ts`** — complete step definitions for all 15 features (compact, bullet-point style)
2. **`useTutorial.ts`** — the reusable hook
3. **Updated `TutorialPage.tsx`** — with overlay wired in, integration code
4. **.tutorial.md skill format** — the reusable skill template for future tutorials
5. **Backend audit** — does anything need IPC/DB changes or is this 100% frontend?
