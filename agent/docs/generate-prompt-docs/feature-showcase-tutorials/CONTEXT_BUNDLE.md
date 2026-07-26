# CONTEXT_BUNDLE.md — Feature Showcase & Tutorials

## Task
Ensure every AI assistant feature is properly documented, showcased, and tutorialized in the app. This includes: feature catalog completeness, tutorial step coverage, onboarding experience, and in-app help.

---

## 1. Existing Infrastructure

### Tutorial System
**TutorialPage** (`src/pages/TutorialPage.tsx`, 550 lines): Route `/tutorial`. 16-feature card grid with category filters + progress tracking.
**TutorialOverlay** (`src/components/TutorialOverlay.tsx`, 315 lines): Spotlight overlay targeting `[data-tutorial="..."]` elements.
**TutorialContext** (`src/contexts/TutorialContext.tsx`, 124 lines): Global state for tutorial visibility/completion.
**Tutorial Steps** (`src/data/tutorial-steps.ts`, 443 lines): 17 pages, 55+ steps with data-tutorial selectors.

### Feature Specs Catalog
**FeatureSpecViewer** (`src/components/FeatureSpecViewer.tsx`, 538 lines): Route `/features`. Two-pane spec browser.
**FeatureSpecPanel** (`src/components/FeatureSpecPanel.tsx`, 566 lines): Embedded sidebar panel with AI prompt generation.
**feature-specs.ts** (`src/data/feature-specs.ts`, 1090 lines): 18 FeatureSpec objects + SIDEBAR_NAV + TOP_NAV_FEATURES + GLOBAL_COMPONENTS.

### AI Features Modal
**AIFeaturesModal** (`src/components/AIFeaturesModal.tsx`, 386 lines): 5 capability groups showing AI assistant features. Button exists in AiPage but may not be visible.

### Canvas Demo Cards (AiPage.tsx lines 610-640)
Seeds 8 core card types on canvas: focus, plan, finance, digest, reflect, schedule, deadlines, planner. Each at fixed grid positions with `pinned: true`.

---

## 2. What's Missing

### AI Assistant Features Not in Tutorial Steps
The `ai-assistant` tutorial has only 4 steps targeting generic slots. Missing:
- Canvas mode vs Deck mode toggle
- Card types (response, group, connectors, reflect, schedule, deadlines, planner)
- Command palette (⌘K)
- Auto-arrange, fullscreen, minimap, zoom
- Transcript rail (deck mode)
- Context delta messages
- Bidirectional problem/request linking from cards

### AI Assistant Features Not in Feature Specs
The `ai-assistant` spec exists but may not cover:
- Canvas infinite pan + zoom
- Minimap navigation
- Find cards arrow
- Card drag + snap
- Auto-save with visual feedback
- Card self-fetching data via IPC

### Features Not in TutorialPage FEATURES Array
The TutorialPage has 16 features. Missing from showcase:
- Canvas navigation (pan, zoom, minimap)
- Daily Goals Planner (upcoming)
- Focus integration with goals
- Student Schedule system
- Deadline notifications

### No Global Onboarding
No first-run experience. New users see the app cold with no guidance.

---

## 3. What Needs to Be Built

### A. Update Tutorial Steps for AI Assistant
Add steps for:
1. Canvas vs Deck mode toggle
2. Card types overview (what each card shows)
3. Command palette (⌘K) for quick actions
4. Canvas navigation (pan, zoom, minimap, recenter)
5. Auto-arrange and fullscreen

### B. Update Feature Specs for AI Assistant
Add sections for:
- Canvas navigation system (pan, zoom, minimap, find cards)
- Card lifecycle (spawn, auto-dismiss, pin, drag)
- Data flow (card self-fetches via IPC on mount)

### C. Update TutorialPage FEATURES Array
Add entries for:
- Canvas Navigation (pan, zoom, minimap)
- Daily Goals Planner
- Student Schedule

### D. AI Assistant In-App Help
Add a help button or info panel to the AI page that shows:
- Available card types and what they do
- Keyboard shortcuts (⌘K, Enter, Esc)
- Canvas controls (scroll=zoom, drag=pan, minimap)
- How to use the command palette

### E. Feature Completeness Audit
Verify every feature in `FEATURE_SPECS` has:
- Tutorial steps in `tutorial-steps.ts`
- `data-tutorial` attributes in the actual component
- Entry in TutorialPage FEATURES array
- Correct route and status

---

## 4. Security Considerations
- Tutorial step data is static (no user input) — low risk
- Feature specs are read-only — low risk
- Any AI-generated feature descriptions must be sanitized before rendering
- Onboarding progress stored in localStorage — wrap in try/catch
