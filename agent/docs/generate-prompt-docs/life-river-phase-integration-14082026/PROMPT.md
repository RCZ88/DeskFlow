# PROMPT: Life River Phase Integration

## Raw Request (Verbatim)

"the river mode is specially made for the fact that you're able to combine all this right and if we were to switch between the faces and make both things right if we were to click on the new memory and it'll create but like it should be that it doesn't create those right maybe we have the properly live rhythm right the proper complete one because currently the ones that we have are complete at all which is it is like compared to the full page which is the proper version which is the only ones that is supposed to be working right other than that it's not working that's not the correct logic right so here's how we transfer the features of stuff into the stuff into the what is it called into the river page or we make the river pages more focused on the connecting how the continent would go and the other stuff is able to connect to the face if not my alternative is to connect it to the full pages of them so if we were to create a new thing it'll just direct us onto them but i think the best solution is to create and make sure that the entry and it's also following the completeness of ones on the pages where it has all the missing inputs for example for the goal you would have the goals right the focus groups and the long term goals and stuff like that and i feel like there's too much to put into this again so it should be that we can direct it to the pages so the pages has actual purpose on it right because the river is just the ones that combine everything right that is the one that orchestrates the entirety and how it combines as a team right how does it combine together and make it beautiful but on the speciality for every single unique one of them features the inputs and the details of those should be on their individual pages mode right so i'd need you to do that"

"one is system based and the other is manually inserted"

"for those that have the data isigned when using the app it should but like for those that are the history and old before using the app the user should be able to set those up"

"so i would like you to include the finance and everything every other data and how can it be orchestrated beautifully"

## Problem Statement

The Life River page currently has phases, covenants, goals, and memories as separate silos. The user wants the River to be the SINGLE ORCHESTRATION LAYER that shows how ALL of a user's life data connects to their life phases. There are two distinct data flows:

1. **System mode** (automatic): The app tracks app usage, browser activity, focus sessions, finance transactions, sleep, AI usage, and code activity. This data should be automatically grouped by phase date range and visualized inside each phase.

2. **Manual mode** (user-driven): For data that exists before the app was installed — old memories, historical commitments, past goals — the user manually creates and attaches them to phases.

The River should be the beautiful visualization of how everything connects. The individual Pages (Covenant, Memories, Gold) remain the specialists for detailed data entry with all fields.

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in this folder for the complete codebase context. It contains:
- ALL 13 app features that can auto-integrate into phases (Dashboard, Stats, Browser, Productivity, Focus, Finance, External/Sleep, IDE Projects, AI Usage, Sleep, Resume, Learn, Insights)
- All data system schemas with actual SQL CREATE TABLE statements
- Current LifePage River mode structure
- PhaseCard current implementation
- Data systems NOT yet connected to phases (with date range availability)
- Design tokens

## Engineering Task

Design a complete phase integration system with two modes:

### System Mode (Automatic)
For each phase (defined by startMonth/startYear → endMonth/endYear), automatically compute and display data from ALL app features:

1. **App Usage** (from `logs` table) — top apps by duration, productive vs distracting ratio, time-of-day patterns
2. **Browser Activity** (from `browser_sessions`) — top domains visited, browsing patterns
3. **Focus Sessions** (from `deep_focus_sessions`) — total focus time, session count, average session length, strictness breakdown, apps used during focus
4. **Finance** (from `finance_transactions` + `finance_wallets`) — total income/expense/net, top spending categories, wallet balance changes, subscription costs during phase
5. **Sleep** (from `external_sessions` type='sleep') — average sleep duration, bedtime consistency, total sleep hours
6. **AI Usage** (from `ai_usage`) — total tokens consumed, cost, most-used tools/models, AI activity timeline
7. **Code Activity** (from `code_activity`) — total edits, most-edited files, coding patterns
8. **IDE Projects** (from `projects` + `ai_usage`) — active projects during phase, AI tool usage per project
9. **Subscriptions** (from `finance_subscriptions`) — active subscriptions during phase, total subscription cost
10. **Dashboard Summary** — productive time, focus score, weekly trends during phase

### Manual Mode (User-Driven)
For each phase, allow the user to:

1. **Attach existing memories** — pick from unattached memories and assign to this phase
2. **Create new memories** — with all fields (title, date, note, image, phase link)
3. **Attach existing goals** — pick from unattached long-term goals and assign to this phase
4. **Create new covenants** — commitments scoped to this phase's time period
5. **Add milestones** — key moments within the phase
6. **Add people** — who was significant during this phase

### Phase Card Expansion
The PhaseCard should have an expandable body that shows:
- **Collapsed state**: covenant/gold/memories strips (current behavior)
- **Expanded state**: full detail view with:
  - **System data section**: visualizations for ALL auto-computed data (app usage pie chart, finance summary, focus stats, sleep patterns, AI usage, code activity)
  - **Manual data section**: attached memories, goals, covenants with edit/add buttons
  - **Timeline mini-view**: data density heatmap showing when activity peaked during the phase
  - **Mode toggle**: switch between system view and manual view within the expanded card

### Data Attachment Model
- Memories: auto-attach by date range (date falls within phase), with manual override option
- Goals: auto-attach by deadline/target date, with explicit phaseId link option
- Covenants: manual only (user creates commitment for a specific phase)
- System data: always auto-computed from date range, no manual attachment needed

## Design Task

Design the HIGH-FIDELITY VISUAL SPECS for:

1. **PhaseCard expanded state** — exact layout, spacing, sections, data visualization hierarchy
2. **System data visualizations**:
   - App usage: donut/bar chart showing top apps by duration
   - Finance: income/expense/net with category breakdown, wallet delta
   - Focus: total hours, session count, streak indicator, strictness pie
   - Sleep: average duration, consistency bar, bedtime pattern
   - AI Usage: token consumption, cost breakdown, tool usage bars
   - Code Activity: edits timeline, most-edited files list
   - Subscriptions: active list with costs, total monthly burn
3. **Manual data section** — memory thumbnails, goal cards, covenant commitments with edit/add buttons
4. **Timeline heatmap** — data density visualization showing activity intensity across the phase duration
5. **Mode toggle** — how the user switches between system view and manual view within a phase
6. **Manual attachment UI** — picker for assigning existing memories/goals to a phase
7. **Empty states** — what shows when no data exists for a category in a phase
8. **Loading states** — skeleton loaders while system data is being computed

Use the design tokens from CONTEXT_BUNDLE.md (glass cards, dark mode, amber/rose/emerald accents, Geist + JetBrains Mono fonts).

## UX Task

Design the INTERACTION FLOW for:

1. **Expanding a phase card** — what triggers expansion, animation, scroll behavior
2. **Switching between system/manual views** within an expanded phase
3. **Attaching a memory to a phase** — click flow, selection UI, confirmation
4. **Creating a covenant for a phase** — form fields, save flow
5. **Editing attached data** — inline edit vs redirect to page
6. **Phase data density** — how to show rich data without overwhelming the card

## Constraints

- Must work with existing IPC endpoints (lifePhase:get, lifePhase:save, get-longterm-goals, etc.)
- System data is COMPUTED from existing tables — no new DB tables needed
- Manual attachments use existing `phaseId` field on MemoryItem and `links` on LongTermGoal
- Covenants are localStorage-only — phase association must be added there
- River mode remains the visualization layer; Pages mode remains the data entry layer
- All new UI must follow the existing design system (glass cards, dark mode, Tailwind)
