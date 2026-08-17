# Context Management System — Design Prompt

## Raw Request

"In all of the features that I would like is a context management system where there's the AI that always updates the context rate. It always updates the context. So whatever thing that I infer or whatever text that I said or whatever things that I've mentioned into an AI should always update the context. We need a context management system where it always updates the context. And there's this document they can store all of the contents that I can use. And any of my chats are there anywhere that has the proper context. And everything is always up to date with the context. So it's read more towards the person. Not really as a chat. I want to have this cell phone text brain system that constantly improves stuff and constantly have a system where it continues to be again they usually improve. Not only is it supposed to be on the AI system, but also on the workspace. It's supposed to be implemented using some complex context systems. But at the same time having ability to get those profiles and get a page where apart where we can see like the profile and what have developed as a person and like a visualization of that. I think under life pages something good. Having the profile, the context profile of the person, that's something to actually also have on the life page. How you can collaborate those with the AI system pages and so on and so forth. And the workspace page as well, how does the AI system is able to determine what the UI tools are able to do."

## Context Bundle

Reference `CONTEXT_BUNDLE.md` (same directory) for all code structures, schemas, IPC endpoints, and architecture notes. Read it first.

## Problem Statement

The user's data is scattered across 6+ disconnected systems (agent_memories, ai_chat_memories, learner_profile, life_phases, context_assembly, ai_context_bundle). There is NO unified "who is this person" view. The AI chat doesn't know the user's personality, habits, or growth trajectory. Every interaction starts fresh instead of building on past context. The user wants a living, breathing context system that makes the AI feel like it KNOWS them — not just a chat tool.

## Engineering Task

Design a **Unified Context Management System** with these components:

### 1. Unified Context Store
- Single DB table `user_context_profile` aggregating ALL user data sources
- Real-time update engine that listens to: chat messages, goal changes, life phase updates, app usage patterns, memory extractions, preference changes
- Confidence scoring for each context signal (occurrence count, recency decay, source reliability)
- Conflict resolution when signals contradict (newer overrides older, user-stated overrides inferred)

### 2. Auto-Context Engine
- Background process that runs on EVERY user interaction
- Extracts context signals from:
  - Chat messages → communication style, interests, questions asked
  - Goal completions → achievement patterns, category focus
  - Life phase updates → growth markers, mood patterns
  - App usage → work habits, tool preferences, schedule patterns
  - Memory corrections → explicit preferences, "don't do X" rules
- Merges signals into the unified profile with deduplication
- Triggers context re-injection when profile changes significantly

### 3. Context Profile Page (under Life)
- Route: `/life?tab=profile`
- Visual sections:
  - **Personality Radar** — derived traits (analytical vs creative, detail vs big-picture, etc.)
  - **Interest Map** — topics they care about, ranked by engagement
  - **Growth Timeline** — milestones, achievements, skill progression over time
  - **Activity Heatmap** — when they work, what they use, focus patterns
  - **Communication Style** — how they talk to AI, what responses work best
  - **Memory Highlights** — key memories, corrections, preferences
- All data derived from existing systems, NOT manually entered

### 4. Context-Aware AI Chat
- Enhanced system prompt that includes:
  - User personality traits
  - Communication style preferences
  - Interest areas
  - Recent activity patterns
  - Key memories and preferences
- The AI should feel like it knows the user personally

### 5. Workspace Integration
- Terminal workspace agents also receive user context
- Context flows into the `assemble-context` IPC for terminal sessions

## Design Task

### Profile Page Layout
- Dark warm theme (tokens already defined in design-tokens.css)
- Glassmorphism cards with warm amber accent (#d9a87c)
- Radar chart for personality traits (canvas-based or SVG)
- Timeline visualization for growth markers
- Heatmap grid for activity patterns
- Interest cloud/tags for topic mapping
- All data is READ-DERIVED — user doesn't edit it manually

### Profile Page UX
- Page loads with a skeleton → fetches profile → animates in
- Each section is an expandable card
- Clicking a growth marker shows the source (which life phase, which chat)
- Activity heatmap has hour-of-day × day-of-week grid
- Interest map shows top 10 interests with engagement scores

## Constraints

1. Must use existing DB (better-sqlite3 at `%APPDATA%/RHEO/deskflow-data.db`)
2. Must use existing IPC pattern (ipcMain.handle in main.ts, ipcRenderer.invoke in preload.ts)
3. Must integrate with existing memory systems (agent_memories, ai_chat_memories) — read from them, don't replace them
4. Must use warm dark theme tokens already defined
5. Must not break existing AI chat flow (aiContextBundle.ts)
6. Profile data must be auto-derived, never manually entered
7. Context must update in real-time on every interaction
8. Token budget for AI chat context: keep under 12K chars total

## Backend Verification

| Feature | IPC Channel | Handler Exists? | Service Class | DB Schema | Status |
|---------|-------------|-----------------|---------------|-----------|--------|
| Get profile | context:get-profile | ❌ No | ❌ No | ❌ No | 🔴 Must build |
| Update profile | context:update-profile | ❌ No | ❌ No | ❌ No | 🔴 Must build |
| Add signal | context:add-signal | ❌ No | ❌ No | ❌ No | 🔴 Must build |
| Get signals | context:get-signals | ❌ No | ❌ No | ❌ No | 🔴 Must build |
| Rebuild profile | context:rebuild | ❌ No | ❌ No | ❌ No | 🔴 Must build |
| Get growth | context:get-growth | ❌ No | ❌ No | ❌ No | 🔴 Must build |
| Read agent memories | memory:get | ✅ Yes | ✅ memoryStore | ✅ agent_memories | ✅ Real |
| Read chat memories | ai-chat:get-memories | ✅ Yes | ✅ main.ts | ✅ ai_chat_memories | ✅ Real |
| Read life phases | lifePhase:get | ✅ Yes | ✅ main.ts | ✅ life_phases | ✅ Real |
| Read goals | get-goals | ✅ Yes | ✅ main.ts | ✅ goals | ✅ Real |
| Read app usage | getDashboardAggregates | ✅ Yes | ✅ main.ts | ✅ logs | ✅ Real |

**All context SOURCE endpoints exist. The profile store and update engine must be built from scratch.**
