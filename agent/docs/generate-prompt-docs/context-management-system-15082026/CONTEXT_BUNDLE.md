# Context Management System — Context Bundle

## Project Overview

DeskFlow is an Electron + React + better-sqlite3 desktop productivity tracker. The user wants a **persistent, always-updating context management system** that:
1. Tracks everything the user says/does across all AI interactions
2. Builds a living "profile" of the user as a person
3. Provides a visual profile page showing user growth
4. Feeds context into ALL AI systems (chat, workspace, life phases)
5. Auto-updates on every interaction

## Existing Systems That Already Do PART of This

### 1. Agent Memory System (Tiered Hot/Warm/Cold)
**File:** `src/main/ai/memoryStore.ts` + `src/main/ai/memoryCapture.ts`
- DB table: `agent_memories` (id, content, category, tier, importance, access_count, dedup_key, decay_rate, stale_after_days)
- Auto-captures from terminal messages via regex patterns (explicit `[save-memory]`, userCorrection, selfReflect)
- Compaction runs every 30 minutes (decay + tier reassignment)
- IPC: `memory:get`, `memory:search`, `memory:add`, `memory:delete`, `memory:stats`, `memory:compact`
- **Gap:** Only captures from terminal messages, NOT from AI chat or other interactions

### 2. AI Chat Memory Extractor (Simple Regex)
**File:** `src/main/ai/memoryExtractor.ts`
- DB table: `ai_chat_memories` (id, thread_date, content, category, importance, created_at)
- Extracts memories from AI chat messages using regex
- IPC: `ai-chat:get-memories`, `ai-chat:extract-memories`
- **Gap:** Per-thread, not persistent across threads. No importance decay.

### 3. Learner Profile (Lyceum Learn)
**File:** `src/services/learn/learnerProfile.ts`
- Dual storage: localStorage `lyceum.learnerProfile.v1` + DB via IPC
- 10 behavioral knobs: density, modalityBias, exampleStance, mathDepth, handsOn, codeStagingDepth, quizAppetite, chunkSize, layerRevealDefault, tone
- Prior knowledge tracking per part (L0-L5 mastery)
- Auto-adapts via UI signals (exponential moving average, ALPHA=0.18)
- **Gap:** Only for Lyceum Learn, not for the overall user profile

### 4. Life Phases System
**File:** `src/hooks/useLifePhases.ts` + `src/components/life-river/`
- DB table: `life_phases` (title, description, category, dates, mood, reflections, milestones, connections)
- `lifePhase:getPeriodContext` aggregates ALL user data for a date range (app usage, browser, focus, finance, sleep, AI usage, code activity, projects, goals, memories)
- AI reflection, era trends, summarization
- **Gap:** No profile aggregation across phases. No "who is this person" view.

### 5. Context Assembly Service
**File:** `src/services/ContextAssemblyService.ts`
- RAG-based context assembly for agent prompts
- Token budget: 7K total (Core 1.5K, Design 0.8K, Codebase 2.4K, Project state 0.6K, Context maintenance 1.3K)
- **Gap:** Not wired to the AI chat system. Only for terminal workspace agents.

### 6. AI Context Bundle (AI Chat)
**File:** `src/services/aiContextBundle.ts`
- Live context for AI chat: goals, long-term goals, finance, sleep, external sessions, canvas cards, connectors
- Token budget: 12K chars
- **Gap:** No user profile data. No memory injection. No behavioral patterns.

## What Needs to Be Built

### A. Unified Context Store (New)
A single persistent store that aggregates ALL user data into a "user context profile":
- **Sources:** memories, goals, life phases, chat history, app usage patterns, preferences, habits
- **Format:** JSON document stored in DB + localStorage
- **Updates:** On every AI interaction, every goal change, every life phase update
- **Access:** IPC endpoint for AI systems to query

### B. Context Profile Page (New)
A page under Life (`/life?tab=profile`) showing:
- Personality traits (derived from behavioral patterns)
- Interests and focus areas
- Growth trajectory over time
- Key milestones and achievements
- Activity patterns (when they work, what they use)
- AI interaction patterns

### C. Auto-Context Engine (New)
A background process that:
- Listens to all user actions (chat messages, goal changes, app usage, life phase updates)
- Extracts context signals (preferences, habits, patterns, corrections)
- Updates the unified context store
- Triggers context re-injection into AI systems

### D. Context-Aware AI Chat
Enhanced AI chat that:
- Reads the unified context profile
- Injects relevant personality/interest/habit data into system prompt
- References past conversations and patterns
- Adapts tone based on user's communication style

## Database Schema

### New Table: `user_context_profile`
```sql
CREATE TABLE user_context_profile (
  id TEXT PRIMARY KEY DEFAULT 'main',
  traits JSON DEFAULT '{}',           -- personality traits, interests, communication style
  habits JSON DEFAULT '{}',           -- daily/weekly patterns, routines
  preferences JSON DEFAULT '{}',      -- UI preferences, content preferences, AI preferences
  goals_pattern JSON DEFAULT '{}',    -- goal completion patterns, category focus
  activity_pattern JSON DEFAULT '{}', -- when they work, what they use, focus patterns
  growth_markers JSON DEFAULT '[]',   -- milestones, achievements, skill progression
  communication_style JSON DEFAULT '{}', -- how they talk to AI, what works
  context_version INTEGER DEFAULT 1,
  last_updated_at INTEGER,
  created_at INTEGER
);
```

### New Table: `user_context_signals`
```sql
CREATE TABLE user_context_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,    -- 'preference', 'habit', 'correction', 'pattern', 'milestone'
  content TEXT NOT NULL,
  source TEXT NOT NULL,         -- 'chat', 'goal', 'life_phase', 'app_usage', 'memory'
  confidence REAL DEFAULT 0.5,
  first_seen_at INTEGER,
  last_seen_at INTEGER,
  occurrence_count INTEGER DEFAULT 1,
  superseded_by TEXT           -- if this signal was replaced by a newer one
);
```

## IPC Endpoints Needed

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `context:get-profile` | renderer → main | Get the unified user context profile |
| `context:update-profile` | renderer → main | Update profile fields |
| `context:add-signal` | renderer → main | Record a new context signal |
| `context:get-signals` | renderer → main | Query signals by type/source |
| `context:rebuild` | renderer → main | Force rebuild profile from all sources |
| `context:get-growth` | renderer → main | Get growth markers timeline |

## Frontend Files Affected

| File | Change |
|------|--------|
| `src/App.tsx` | Add route for profile page |
| `src/pages/LifePage.tsx` | Add profile tab |
| `src/services/aiContextBundle.ts` | Inject user profile into AI chat context |
| `src/hooks/useAiChat.ts` | Load and inject profile memories |
| `src/main.ts` | Add IPC handlers for context endpoints |
| `src/preload.ts` | Add preload methods for context IPC |

## Design Tokens (warm dark theme, already updated)

```css
--dk-bg-deep: #0c0a09;
--dk-bg-base: #1a1614;
--dk-bg-surface: rgba(28, 24, 22, 0.92);
--dk-bg-raised: rgba(38, 32, 28, 0.95);
--dk-accent: #d9a87c;
--dk-accent-dim: rgba(217, 168, 124, 0.12);
--dk-success: #6fb38f;
--dk-warning: #e8a44a;
--dk-danger: #d96846;
--dk-text-primary: #f5f0eb;
--dk-text-secondary: #d6cec6;
--dk-text-muted: #a09589;
```
