# PROMPT.md — Dashboard Daily Habits + Momentum System

## Raw Request

> "i thought we're talking about the momentum and stuff? THE MOMENTUM OF THE DASHBOARD. how can we make so that the momentum is connected to the daily goals so that its always the streaks and goals to always have the daily goals for every single day, the consistency program. connected to the schedules and ai assistant. idk how to engineer and like arrange these features and have a proper ui that combine the covenant page with the ai features of the schedules and stuff, and how it should be displayed on the dashboard."

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in this directory first. It contains:
- All current type definitions (Goal, ScheduleEntry, Commitment, StreakStats, DashboardInsights)
- All IPC endpoints and their payloads
- The current momentum formula and how insights are computed
- The Covenant system (localStorage-based habit tracker with streaks, auto-detection, milestones)
- The Goals system (SQLite-based with AI suggestions)
- The Schedule system (SQLite-based weekly time blocks)
- Design tokens and component patterns

## Problem Statement

The dashboard has three disconnected productivity systems:
1. **Goals** — daily goals with AI suggestions, but no auto-generation, no schedule awareness
2. **Covenant/Commitments** — habit tracker with streaks and auto-detection, but hidden on a separate page, uses localStorage (not synced)
3. **Schedule** — weekly time blocks, but not connected to goals or momentum

The user wants a **unified momentum engine** where:
- Daily goals are auto-generated EVERY DAY (consistency program)
- Momentum score reflects goal completion + streak + schedule adherence
- The AI assistant generates context-aware goals from long-term goals + schedule + past performance
- A covenant-like commitment UI is embedded IN the dashboard (not a separate page)
- Everything fits on one screen

## Design Task

Design a comprehensive **Daily Habits + Momentum** system for the DeskFlow dashboard. This includes:

### A. Momentum Engine (Data Processing Pipeline)

Design the scoring algorithm that combines:
- **Goal completion rate** (from daily goals, weighted by category importance)
- **Streak continuity** (consecutive days with ≥1 goal completed)
- **Schedule adherence** (time spent in scheduled blocks vs planned)
- **Consistency score** (from `get-consistency-score` IPC — weekly 30h target)
- **Recent activity** (last 7 days trend)

The momentum score (0-100) should be computed server-side and returned via a new or existing IPC endpoint. It should feel responsive — small changes daily, not jumping wildly.

### B. Daily Goal Auto-Generation

Design how the system auto-generates daily goals:
- **When:** On dashboard mount (if no goals exist for today) or via "Generate" button
- **Context:** Long-term goals (parentId linkage), today's schedule blocks, yesterday's unfinished goals, last 7 days performance data
- **AI Prompt:** Enhance the existing `suggest-goals` handler to also consider schedule blocks (e.g., "You have a 2h study block at 14:00 — suggest a study goal")
- **Integration:** Goals should reference schedule entries when applicable

### C. Dashboard UI Layout

Design how these features appear on the dashboard. The current layout has:
- StatusBand (stopwatch/timer)
- InsightsCard (MomentumOrb hero + streak badge + metric grid)
- AI Insights Strip
- GoalsCard + DeadlinesCard + QuickFocusCard (3-column grid)
- ScheduleCard
- Productivity Chart

Propose a new layout that:
1. **Momentum hero** — prominent momentum score with trend indicator (up/down/stable)
2. **Daily goals** — auto-generated, checkbox-style, with schedule-aware time targets
3. **Streak display** — current streak + milestone progress, compact (not a full card)
4. **Schedule integration** — show today's schedule blocks with goal linkage indicators
5. **AI Assistant** — context-aware suggestions that consider schedule + goals + streaks

The layout must fit on one screen (1920x1080) without scrolling. Use the existing glass card pattern with proper typography (Geist body, JetBrains Mono numbers).

### D. Covenant Integration

The existing Covenant feature (localStorage) has:
- Commitment definitions with auto-detection
- Streak computation with milestones
- Journal entries

Design how to either:
1. **Merge** Covenant into the Goals system (move commitments to SQLite, unify streaks)
2. **Bridge** them (Covenant commitments appear on dashboard as "habits", goals appear on Covenant page)
3. **Replace** Covenant with an enhanced Goals system that has habit-like features

Recommend the best approach and design the data model changes needed.

### E. Schedule-Goal Connection

Design how schedule blocks connect to goals:
- A study block from 14:00-16:00 could auto-suggest "Study for 2h" goal
- Goal completion during a scheduled time increases schedule adherence score
- Visual indicator on ScheduleCard showing which goals are linked to which blocks

## Requirements Checklist

- [ ] Momentum score algorithm (0-100, combining goals + streaks + schedule + consistency)
- [ ] Daily goal auto-generation on dashboard mount
- [ ] AI prompt enhancement for schedule-aware suggestions
- [ ] Dashboard layout that fits one screen (1920x1080)
- [ ] Compact streak display (not a full card)
- [ ] Schedule-goal linkage (visual + data)
- [ ] Covenant integration strategy (merge/bridge/replace)
- [ ] Empty states for all new sections
- [ ] Loading states during AI generation
- [ ] Error states for failed AI calls
- [ ] All IPC endpoints needed (list existing + new)
- [ ] All type/interface changes needed

## Constraints

- Must work with existing SQLite DB schema (add tables/columns if needed, no full rebuild)
- Must use existing IPC patterns (ipcMain.handle / ipcRenderer.invoke)
- Must use existing design tokens (zinc-950 bg, glass cards, rounded-xl, Geist + JetBrains Mono)
- Must use existing MCP components (NumberTicker, BorderBeam, AnimatedShinyText, SpotlightCard)
- Must not break existing features (Goals, Deadlines, Schedule, StatusBand still work)
- The AI suggestion backend already exists (`suggest-goals` handler) — enhance, don't replace
- The consistency score backend already exists (`get-consistency-score`) — use it on dashboard

## MCP Component Inventory

| Component | Source | Use for |
|-----------|--------|---------|
| NumberTicker | Magic UI | Animated momentum score, streak count |
| BorderBeam | Magic UI | Active streak indicator |
| AnimatedShinyText | Magic UI | Momentum label with shimmer |
| SpotlightCard | ReactBits | Card hover glow |
| BlurText | ReactBits | Page title entrance animation |
| GlareHover | shadcn/Aceternity | Card interactive hover effect |
| Card | shadcn | Base card wrapper |
| Badge | shadcn | Category/status pills |
| Input | shadcn | Goal title input |
| Button | shadcn | Action buttons |
| Select | shadcn/base-ui | Category/period dropdowns |
| Progress | shadcn | Streak progress toward milestone |
| Lucide icons | Lucide | Flame, Target, Zap, Calendar, TrendingUp, Bot, Sparkles, Check |

## Anti-Slop Checklist

- [ ] NOT generic purple gradient on everything — use category-specific accents
- [ ] NOT box-shadow elevation — use glass + border
- [ ] NOT missing empty/loading/error states
- [ ] NOT tiny uppercase kicker labels above every heading
- [ ] NOT decoration at cost of usability
- [ ] Geist body + JetBrains Mono numbers (no third font)
- [ ] Dark mode only (strip any light variants)
- [ ] Glass layer (bg-zinc-900/50 backdrop-blur-xl)
- [ ] Touch targets ≥ 44px
- [ ] prefers-reduced-motion respected
