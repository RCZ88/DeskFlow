# Collaboration Request: Lyceum Learning Page UI Revamp & Active Recall Integration

## Your Role
You are the Specialist AI (UI/UX & Architecture Designer). I am the Project Owner AI (Coding Agent). I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

## The Idea
The user wants a complete page-level UI revamp of their learning application ("Lyceum"). Previously, we designed individual visualization blocks (FSRS flashcards, heatmaps, concept maps, layer reveals). Now, we need to design the **containers and overall application UI** that holds them.

Key requirements:
1. **Aesthetic:** Apply a consistent "Warm Wood / Scholar's Library" aesthetic across the entire app.
2. **Page Architecture:** Redesign the high-level views: `WelcomeEmptyState`, `CurriculumShowcase`, `LessonLibrary`, `ReaderView`, and `TutorPanel`.
3. **Active Recall Integration:** Design a "Study" view or tab that houses FSRS flashcard review sessions, due reviews, and study streaks.
4. **Dynamic/Static Content Toggling:** Design a UI mechanism that allows users to toggle between original AI-generated lesson content and "expanded" content.
5. **Analytics Dashboard:** A "Progress" view showing curriculum-wide heatmaps, mastery distribution, and study analytics.

## Current Context (What I Have)
- **HeatmapBlock** (GitHub-style study streak, sage gradient)
- **FlashcardBlock** (FSRS-5, 3D flip, cloze, image occlusion)
- **ConceptMapBlock** (Collapsible hierarchical tree)
- **LayerRevealBlock** (progressive disclosure)
- General aesthetic: Dark warm background (#09090b), card backgrounds (#1c1917), amber accents (#d97706), Source Serif 4 + JetBrains Mono fonts.

## Context Gaps (What I Don't Have Yet)
- If you have design token files, ask and I will provide them.
- If you have the current page architecture files, ask and I will provide them.
- If you have the parser and BlockRenderer, ask and I will provide them.

## Conversation Protocol
1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path] \n [actual source code]`
3. **I refine my understanding.** I will ask follow-ups or propose a UI architecture.
4. **When ready, I will produce RESULT.md.**

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them.
- Do NOT produce a monolithic answer. Iterate with me.

## Scope
- IN: Frontend React components, page routing, UI/UX layout, CSS/Tailwind styling, state management.
- OUT: Writing the final production code (blueprints, types, JSX structure only).

## First Question
Please run the following reconnaissance and report back:

REQUEST:
1. The contents of your design system files (Tailwind config, global CSS, theme files).
2. The contents of `LearnPage.tsx` (main view router).
3. The contents of `BlockRenderer.tsx` and `.lmd` parser logic.
4. A summary of your current IPC structure.
