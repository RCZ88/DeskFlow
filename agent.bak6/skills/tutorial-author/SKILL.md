---
id: tutorial-author
name: Tutorial Author Skill
version: 1.0.0
created: 2026-06-15
tags: [tutorial, authoring, walkthrough, feature-guide]
description: Produce a tutorial step set for a feature so users can be walked through it in 3–5 brief steps, with no paragraphs.
---

# Tutorial Author Skill (v1.0.0)

## Purpose
Produce a tutorial step set for a feature so users can be walked through it in 3–5 brief steps, with no paragraphs.

## When to use
- A new feature has shipped or a major UI change landed.
- The feature has at least one screen with stable, queryable DOM targets.

## Inputs (the author provides)
- featureId — kebab-case, must be unique in `src/data/tutorial-steps.ts` Record key
- featureName — human label
- route — react-router path to the feature
- 3–5 steps, each with target / title / instruction / position

## Hard rules
- Title is 2–5 words.
- Instruction has 1 or 2 lines; each line starts with `• ` followed by a verb.
- No periods at end of lines. No emojis. No exclamation marks.
- target prefers `[data-tutorial="feature.slot"]`; falls back to existing IDs.
- position is one of: top | bottom | left | right | center.

## Output
- A single block to paste into `src/data/tutorial-steps.ts`:
  `featureId: [ {...}, {...}, ... ],`
- A short PR note listing every new `data-tutorial="..."` attribute that engineers must add on the target page.

## Decision flow
1. Identify the 3–5 things a new user MUST grasp to use the feature.
2. For each, find a DOM anchor on the live page.
3. Pick a position so the card never covers the anchor.
4. Write each instruction as 1–2 verb-led bullets.
5. Add the feature to the `TUTORIAL_STEPS` record.
6. Add `data-tutorial` attributes to the target page components.
7. Add the feature card to `FEATURES` in `TutorialPage.tsx`.

## Anti-patterns
- Paragraph instructions ("This page lets you…").
- More than 2 bullets per step.
- Targets that don't exist at render time (modals, drawers default-closed).
- Position that visually overlaps the spotlight (e.g., center over a top-left button).
- Reusing a featureId for unrelated features.
