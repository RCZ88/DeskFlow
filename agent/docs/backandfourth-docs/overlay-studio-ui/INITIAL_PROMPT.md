# Collaboration Request: Overlay Studio UI Redesign

## Your Role
You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this UI into an implementable specification.

## The Idea
The user wants a complete UI redesign for the Overlay Studio — a video overlay generation tool in an Electron + React app. The backend (Python, phases 1–2.5) is complete. The frontend exists but is visually poor and doesn't clearly show the features. The user wants:
1. A UI that clearly shows all available features and tools
2. Video preview/playback capability  
3. Timeline with actual video content (not just text segments)
4. Visual preview of overlays on the 9:16 canvas
5. Multiple video support
6. Topic-agnostic (any video, any content)
7. Integration with existing content creation skills

## Current Context (What I Have)
- **Project:** DeskFlow — Electron + React + Tailwind + Framer Motion desktop app
- **Route:** `/studio` (sidebar: Sparkles icon, "Overlay Studio")
- **Backend:** Python scripts in `python/` (contracts, extraction, animation, render, registry, validators, CLI)
- **Frontend:** `src/pages/FeatureStudioPage.tsx` (599 lines, 6 views)
- **Design system:** Glassmorphism dark theme, zinc-950 base, pink-500 accent, cyan-400 info
- **Skills loaded:** Frontend Design, Impeccable, UI UX Pro Max, Motion L2, frontend-external-infra, Human-Centric UX

## Existing Patterns (how other pages look)
- Dashboard: 3D orbit system + heatmap + weekly overview + timer
- Stats: sortable table + 3 charts + sessions list
- IDE Projects: 7 tabs (Overview/IDEs/Tools/Projects/AI/Git/Trash)
- Terminal: 5-group sidebar with sub-tabs
- Finance: tabbed interface with charts + tables
- All pages use: GlassCard pattern, SectionHeader, TabBar, StatusBadge, EmptyState, LoadingState

## What's Missing (UI gaps)
1. No video preview/playback
2. No timeline scrubber with video content
3. No visual preview of overlays on 9:16 canvas
4. No clear "how to use" flow for first-time users
5. No integration with content creation skills
6. Manual Bridge wizard needs better UX

## What I Need From You
1. Design the complete UI architecture for the Overlay Studio
2. Specify exact component hierarchy, layouts, and interactions
3. Define the data flow for each pipeline stage
4. Provide visual specs (colors, spacing, typography) using existing tokens
5. Design the empty/loading/error states for every view
6. Specify the timeline scrubber interaction model
7. Design the 9:16 canvas preview rendering approach

## Expected Output
A RESULT.md with:
1. Complete UI architecture diagram
2. Component hierarchy (what components, where they live)
3. View-by-view visual specs
4. Timeline scrubber interaction model
5. 9:16 canvas preview rendering approach
6. Manual Bridge wizard UX flow
7. Empty/loading/error state specs for every view
8. Integration points with existing content creation skills
