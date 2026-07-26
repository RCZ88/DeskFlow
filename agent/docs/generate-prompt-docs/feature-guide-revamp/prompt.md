# PROMPT: Feature Guide Page Redesign

## Raw Request (verbatim from user)

> "i want you to focus on the tutorial/guide section. the current one d=is kind of weird becasue the tutorial itself is simmilar to the try feature. the try also uses tha tcicrcle thing , while ilike trying does th esame thing. the something htat is missing is the actual guide manual. its supposed to be static. its like a page jsut showing the ljist of features, with text and stuff. fofr each feature. how would be designg so that the text is not too logn and really hard to read, have some visualization, and stuff. includign the buttons and stuff. maybe."
>
> "how did you manage to make all teh guides so quickly? all the features have its guide? how about the circle feature it doenst owrk at all. ti only gives like circle iwthou actually directing the usinr to the appropariate page. hwoa bout the dialog on the circle tu torial? its not that simple bro. cna you plan out  the text and stuff first. or just use gneerate prompt skill or something"

---

## Problem Statement

The current Tutorial/Guide page has two problems:

1. **The old interactive tutorial was broken** — it had a "spotlight" overlay with a decorative circle that floated in the middle of the screen, but it didn't actually highlight any real UI elements (no `data-tutorial` attributes exist on any page). The step-by-step walkthrough targeted CSS selectors that don't exist. Users saw a circle pointing at nothing.

2. **The rushed replacement was shallow** — the bullet points and icon clusters were just reformatted descriptions, not actual guide content. Each feature entry needs well-planned, meaningful text that tells you what the page contains and what you can do there, not just "feature X does Y."

---

## Context Bundle

Read `agent/docs/feature-guide-revamp/CONTEXT_BUNDLE.md` — it contains:
- Full current source code of TutorialPage.tsx (353 lines)
- The orphaned TutorialOverlay.tsx component
- Design tokens, color palette, UI patterns
- Complete list of all 15 features with their real page contents
- Route mappings and navigation details
- Architecture notes and constraints

---

## The Mandate

Design a **Feature Guide page** that replaces the current `/tutorial` page. This is a static reference manual — no interactive walkthroughs, no spotlight overlays. Each feature entry must be thoughtfully planned with content that's useful as a reference, not just descriptive blurbs.

### Engineering Task

Design the **data structure and content organization**:

1. **Feature data shape** — Design the interface for feature entries. Must include at minimum: unique id, display name, icon (Lucide React component), category (Core/Tracker Mind/Data), status (released/beta/planned), route path, and TWO separate content fields:
   - "What you'll find" — the actual UI widgets and elements on that page (tells the user what to look for)
   - "What you can do" — the actions and controls available (tells the user how to use it)

2. **Content planning** — For each of the 15 features, write REAL content based on what the page actually contains (see CONTEXT_BUNDLE.md section "What Each Page Actually Contains"). Do not make up features. Do not use generic descriptions. Each entry must accurately reflect the actual UI.

3. **Category filtering** — Keep the All/Core/Tracker Mind/Data filter pills. This is useful for browsing.

4. **Progress tracking** — Keep localStorage-based progress (which features the user has opened/explored). This is useful.

### Design Task

Design the **visual layout** of each guide entry card:

1. **Layout** — Cards in a 2-column responsive grid (same as current). Each card must have clear visual hierarchy.

2. **Content sections** — Each card should separate "What you'll find" from "What you can do" visually (different icons, different background tint, or a dividing line with section label).

3. **Visual elements** — Include the feature icon (larger, more prominent), category-colored accents, status badge, and small icon cluster in the footer. Make it visually interesting without being distracting.

4. **Typography** — Text must be scannable. Use short phrases, not paragraphs. Aim for 3-5 bullet points per section. No walls of text.

5. **Header** — Clean header with guide icon, page title "Feature Guide", feature count/subtitle, and a reset button for progress. Category filter pills below.

6. **Animations** — Use framer-motion for card entrance animations (0.2s staggered delay).

7. **Colors** — Match the app's dark glass theme:
   - Background: `bg-black`
   - Cards: `glass` class with `rounded-2xl`, `border-zinc-700/30`
   - Category accents: Emerald for Core, Purple for Tracker Mind, Blue for Data
   - Text: `text-white` for headings, `text-zinc-400` for body, `text-zinc-500` for secondary

### UX Task

Design the **interaction flow**:

1. **Opening a feature** — Single "Open" button per card. On click: mark feature as explored in localStorage, navigate to the feature's route.

2. **Explored state** — When a feature has been opened, show a subtle visual indicator (checkmark badge, or reduced opacity, or a "visited" label).

3. **All-explored state** — When all features have been visited, show a congratulations banner at the top of the grid.

4. **Reset** — Button to clear exploration progress.

5. **Empty state** — If no features match the selected category filter, show a "No features in this category" message.

### Constraints

1. Modify ONLY `src/pages/TutorialPage.tsx` (the file already has the basic structure)
2. Remove the TutorialOverlay import and overlay state management (the overlay is broken and orphaned)
3. All feature content must be accurate to the actual pages (verified in CONTEXT_BUNDLE.md)
4. Use only Lucide React icons (already imported in current file)
5. Use framer-motion for animations (`import { motion } from 'framer-motion'`)
6. Match the dark glass aesthetic (Tailwind v4, zinc tones)
7. No IPC calls — this is a pure frontend page, localStorage only
8. Do NOT create any new files
9. All 15 features must be covered

## Requirement Checklist

- [ ] Feature data interface includes: `whatYoullFind: string[]` and `whatYouCanDo: string[]` (or equivalent meaningful separation)
- [ ] Each of the 15 features has accurate, well-written content based on real page contents
- [ ] Cards show clear visual separation between "what you'll find" and "what you can do"
- [ ] Text is scannable (short bullets, no paragraphs)
- [ ] Feature icon is prominent, category-colored, with status badge
- [ ] Single "Open" button navigates to the feature page
- [ ] Explored state is visually indicated (subtle checkmark or badge)
- [ ] Category filter pills (All/Core/Tracker Mind/Data)
- [ ] All-explored congratulations banner
- [ ] Reset progress button
- [ ] Empty state for no-matching-features
- [ ] Framer motion entrance animations
- [ ] No TutorialOverlay dependency
