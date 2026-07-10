# Design Prompt — Learner Profile + Mastery Dashboard Integration

## Raw Request

> "why is the mastery dashboard still not revamped yet???? the pages are disconnected from another. why is the library the main thing and then the dashboard is like another separate page that has to be accessed, it should be like the data page then? or like something. does the markdown files not have the revamp for this? i feel like we can redesign so that it is more intact to the overall other page of the learning page."

> "one thing for sure is that the curriculum view should still be separate. and it should have a better looking ui (ones that is more fitting to the style we have here)"

## Problem Statement

Two problems in the Lyceum Learn module:

**Problem 1: The Mastery Dashboard is a disconnected page.** It's a separate `view === 'dashboard'` in LearnPage.tsx. You navigate to it via a header button, see stats (total nodes, mastered, due reviews, level distribution), then go "Back to Library." It's hidden, disconnected, and feels like an afterthought. The user wants mastery data integrated into the main learn flow — not isolated on its own page.

**Problem 2: Learner Profile doesn't exist.** The spec (`LEARNER_PROFILE_DESIGN.md`) defines a per-user `LearnerProfile` with knobs for density, modality, example stance, math depth, etc. The current `coach-persona.md` has a hard-coded persona. None of the profile infrastructure is implemented yet.

**Constraint:** The Curriculum view (`CurriculumShowcase`) stays as its own separate view. Only the Dashboard gets integrated.

## Context

Read `CONTEXT_BUNDLE.md` first — it has all the relevant code, types, design tokens, IPC endpoints, and file paths.

### Key architectural facts:
- LearnPage.tsx has 6 views: welcome / showcase / library / reader / dashboard / import
- DashboardView (line 831-908) renders stat cards + level distribution + due reviews as a full-page takeover
- LessonLibrary groups lessons into shelves by part, renders BookCard components
- MasteryRing is an existing SVG component for L0-L5 progress rings
- Progress data comes from `learn:getProgress` IPC → `Record<string, NodeProgress>`
- The design language is clay/amber/sage, editorial, cloth-bound book cards, serif headings
- Design tokens: `--color-clay-400: #e8866b`, `--color-sage-400: #6fb38f`, `--color-amber-400: #fbbf24`, `--font-serif: "Source Serif 4"`

## Design Tasks

### Task A: Redesign the Mastery Dashboard — integrate into the library

**Remove the separate `'dashboard'` view.** The mastery data becomes part of the library page itself.

Design a solution where:
1. **Mastery summary** — total nodes, mastered count, due reviews — is visible on the library page without navigating away. Could be a compact strip above the shelves, a sidebar panel, or woven into the header.
2. **Level distribution** (L0-L5 breakdown with MasteryRing indicators) is visible at a glance. Compact, not a full section takeover.
3. **Due reviews** surface inline — as a badge, a small panel, or a floating indicator. The user should see "3 reviews due" without leaving the library.
4. The **"Dashboard" header button** becomes unnecessary (or repurposed).
5. The UI matches the existing design language: clay/amber/sage palette, rounded-xl cards, editorial feel, serif headings where appropriate. NOT the plain zinc-900/40 cards currently in DashboardView.

**Keep the Curriculum view (`CurriculumShowcase`) separate.** Don't touch it.

### Task B: Design the Learner Profile infrastructure

Design the type system, storage, and prompt wiring for the LearnerProfile:

1. **Type definitions** — the `LearnerProfile` interface + knob types + `DEFAULT_PROFILE` constant (see §2 of CONTEXT_BUNDLE.md for the exact schema from LEARNER_PROFILE_DESIGN.md)
2. **Storage layer** — `learnerProfile.ts` with `loadProfile()`, `saveProfile()`, `updateKnob()`, `getPartMastery()`. localStorage for now.
3. **Prompt wiring** — `composeLearnerProfileBlock(profile)` that renders all knobs into authoring directives. Integration into `composeAuthorSystemPrompt`, `composeTopicUserPrompt`, `composeTutorPersona`.
4. **Tutor integration** — pass profile block as personaMd when profile exists.

### Task C: Design the Onboarding flow + Settings panel

1. **LearnerSetup** — 8-question choice-based onboarding:
   - Q1-Q3: A/B sample cards (render real .lmd snippets using existing BlockRenderer)
   - Q4-Q6: Situational single-select
   - Q7: Tone
   - Q8: Prior-knowledge sweep (13 chips, 4 options each)
   - Skippable
   - Output: profile at confidence ~0.3-0.4

2. **LearnerProfilePanel** — settings panel exposing every knob with confidence bars

### Task D: Design the revealed-preference loop

1. **profileSignals.ts** — EMA signal recording for behavioral updates
2. Signal types: layer_expanded, prose_scrolled_fast, prose_dwelled, worked_example_opened, try_it_jumped, quiz_failed, quiz_aced, session_abandoned
3. Each signal maps to knob updates per the LEARNER_PROFILE_DESIGN.md §6 table
4. All updates visible and reversible in LearnerProfilePanel

## Requirements

- **Data processing:** How mastery stats get computed from the existing `progress: Record<string, NodeProgress>` data. How the level distribution counts map to the 6 rings. How due reviews get filtered by `due_at <= now()`.
- **Visual specs:** Exact colors, spacing, typography for the integrated mastery strip. How it sits alongside the book shelves. How the MasteryRing components scale down for inline use.
- **UX flow:** How the onboarding triggers (first visit? settings? forced?). How the profile settings panel opens. How behavioral signals get recorded (what events, what listeners).
- **Knob → prompt mapping:** For each knob, specify exactly what text gets injected into the authoring system prompt. Show the full `composeLearnerProfileBlock` output for a sample profile.

## Constraints

- The Curriculum view stays separate — don't touch CurriculumShowcase.tsx
- No new IPC endpoints — use existing `learn:getProgress`, `learn:listLessons`, localStorage for profile
- No new npm dependencies
- Keep the BookCard editorial design language — clay/amber/sage, cloth-bound aesthetic
- The profile is localStorage for now (no DB migration)
- Don't rewrite parseLessonMarkdown.ts or the validator — only call them
- Preserve existing `coach-persona.md` as fallback when no profile exists
