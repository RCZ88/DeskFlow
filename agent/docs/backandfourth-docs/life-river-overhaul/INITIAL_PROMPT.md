# Collaboration Request: Life River Feature Overhaul

## Your Role

You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

## The Idea (Verbatim from User)

The Life Page has two modes: "Pages" (full-page tabs for Covenant, Memories, Gold, Notes) and "River" (scrollable timeline with ring visualization + phase cards). The River mode is incomplete:

1. **Speech-to-text not connected**: The phase creation dialog (PhaseFormDialog) has text inputs but none are connected to the speech-to-text system (VoiceInputWrapper). VoiceInputWrapper wraps any input/textarea and adds a mic button — it's used in 25+ other places but NOT in any life-river component.

2. **Drafts inaccessible**: The "Save as draft" button in PhaseFormDialog saves to the DB immediately (same as regular save). There is no draft status column, no draft list UI, no way to resume an incomplete phase. The user wants to save partial work and come back to it later.

3. **Covenant/Gold/Memories not visible in River mode**: The lens switcher (Phases/Covenant/Gold/Memories) only changes the RingCanvas SVG visualization. It does NOT affect the RiverMap, TimelineView, PhaseCards, or TodayTributary. There's no way to ADD memories, covenant commitments, or long-term goals from the River mode.

4. **No edit access from visualization**: Clicking a ring in RingCanvas scrolls to the PhaseCard, but there's no direct "edit" button on the visualization itself.

5. **Lens switching doesn't change the page**: The lens only affects the ring visualization. The user expects that selecting "Gold" lens would show gold-related UI, "Memories" would show memory-related UI, etc.

6. **Life river visualization too small**: The RiverCanvas at the bottom of the page needs to be bigger/more prominent.

## Current Architecture

- **Stack:** Electron + React + TypeScript + Tailwind CSS + Framer Motion + better-sqlite3
- **Page:** `src/features/warmth/LifePage.tsx` (450 lines)
- **Two view modes:** `pages` (4 tabs) and `river` (scrollable timeline)

## Key Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| CoreSample.tsx | 123 | RingCanvas wrapper + lens switcher (LOCAL state only) |
| RingCanvas.tsx | 289 | SVG tree-ring visualization, 4 lens layers |
| RiverCanvas.tsx | 329 | SVG river reaches (colored rectangles per phase) |
| RiverMap.tsx | 282 | SVG river path with phase markers |
| TodayTributary.tsx | 474 | Today's confluence: covenant + goals + memories |
| PhaseCard.tsx | 456 | Full phase card with 8 sections |
| phase-form-dialog.tsx | 1001 | 9-step wizard for creating/editing phases |
| phase-drawer.tsx | 409 | Slide-out quick-edit panel |
| TimelineView.tsx | 179 | Horizontal bar timeline |

## Data Hooks

- `useLifePhases()` — phases CRUD, reflection, era trends, summary
- `useCovenant()` — commitments + completions (separate feature)
- `useMemories()` — IndexedDB blob store (separate feature)
- Goals loaded via `getGoals(todayStr())` and `getLongtermGoals()` IPC

## Speech-to-Text Infrastructure

VoiceInputWrapper.tsx (500 lines) wraps any input/textarea, injects a ref via cloneElement, adds a mic button. Uses 3-engine fallback: Cloud API -> Windows Native -> Browser webkitSpeechRecognition. Used in 25+ places across the app but ZERO in life-river.

## Context Gaps

- We do not have the full VoiceInputWrapper.tsx source in this bundle. If you need to see how it wraps inputs, ask and we will fetch it.
- We do not have the full GoldPage.tsx or CovenantPage.tsx. If you need to see how those pages work, ask.
- We do not have the DB schema for the `goals` table or `covenant` tables. If you need those, ask.
