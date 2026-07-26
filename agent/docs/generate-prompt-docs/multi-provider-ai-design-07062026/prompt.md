# Design Prompt: Multi-Provider AI Connector & Daily Goal Tracking

## Raw Request

> "So I would like to be able to connect to other providers, for example, CloudFlayer or Invilier or, um, or, um, they call, uh, Olamah, right? Those are the connectors I would like to be able to connect my AI to, but if I'm like, they could state up the things that they, a lot of the stuff like the activity pattern analysts and sleep and jeopardize her to, and daily please, just all I can make, I don't really like that. The one that I really just focus on is the research I just am, like, being able to, um, receive certain information, um, receive information, maybe we don't need the AI to be able to do so, to be able to do research, but like the stuff that is actually important, like, for example, if I were to have a set of goal, and there's the gate plan goal, and there's the AI can help keep track of like the plan needs of what should I do today, and check links and so on and so forth. That is the feature that I would like to have that is actually really useful, is something that is related to, um, the use of the application, considering that there's a lot of data that's here, and you can, I don't know, and pull stuff, you know, I don't know how, I think to implement the data into this stupid, I think the application is a lot stupid, but like, um, it is just basically tracking off the usage of stuff like that, how am I able to realize those data, and to be able to turn them and use them for the AI system, worry the future, that really, make it better, really, utilize the stuff properly, and so on and so forth. I think that's basically, I would like you to think and have, and generate a prompt based on that. I would probably be able to generate, use the generate prompt skill to be able to do so."

---

**You are the Lead Designer and Engineer.** Design a comprehensive solution covering data-processing logic, visual specifications, and interaction design.

Read `CONTEXT_BUNDLE.md` (co-located in this directory) first — it is the source of truth for all existing code structure, IPC endpoints, data shapes, and design tokens.

---

## Context

The application is a desktop productivity tracker (Electron + React) that logs app usage, browser activity, sleep patterns, and productivity metrics. It currently has an AI page with many features: daily briefs, weekly reviews, pattern analysis, sleep analysis, anomaly detection, research topic digest, and data chat. **The user does not want most of these.** They find the activity pattern analysis, sleep analysis, daily brief, and similar features uninteresting.

**What the user wants to keep from existing features:**
- The **research topic digest** — they want to receive relevant information on their interest topics.

**What the user wants to build new:**
1. **Multi-provider AI connectors** — abstract away the current OpenRouter-only dependency so they can plug in different providers like CloudFlayer, Invilier, and Olamah.
2. **Daily goal/plan tracking** — an AI-assisted daily plan feature that uses the app's rich activity data. This is the **primary feature** the user cares about.

**What the user cares about deeply:** The app collects a lot of usage data, but it feels underutilized. The goal tracking feature is the way to finally make that data useful — having the AI turn tracked activity into actionable daily plans, check progress, and help the user stay on track.

---

## The Mandate

Design a complete, production-ready solution for both features. Focus on what the user actually wants. **The goal tracking feature is the star — the existing daily brief, weekly review, pattern analysis, sleep analysis, and anomaly detection are not needed and should not be preserved.**

---

### Engineering Task

1. **Provider Abstraction Layer** — Design a connector interface that abstracts away provider-specific API details (base URL, auth header format, request/response shapes). Must support:
   - OpenRouter (existing, must keep working as the default)
   - CloudFlayer
   - Invilier
   - Olamah
   - A generic "custom OpenAI-compatible" fallback
   - Future providers should be addable by configuration (not code)

2. **Provider Config Persistence** — Design storage for per-provider credentials (API keys, base URLs, custom model lists). Each provider independently enabled/disabled. Existing OpenRouter key must migrate cleanly.

3. **Provider Routing Logic** — The research digest and goal assistant should each be assignable to a specific provider+model combination, or use a global default. Design fallback chain: if primary provider fails, try next.

4. **Goal Data Model** — Design a goals system:
   - Goals have: id, title, description, category (work/personal/health/learning), target type (time-based like "3h of coding", completion-based like "finish report"), period (daily/weekly/monthly), status (pending/in-progress/completed/overdue), progress tracking
   - Goals stored persistently (localStorage for v1, or preferences table)
   - Goal history queryable alongside activity data

5. **AI Goal Assistant Pipeline** — Design how the AI uses available tracking data to:
   - **Morning suggestion:** At start of day, AI suggests 2-3 prioritized goals based on past patterns, unfinished work, user's stated priorities, and any linked resources
   - **Progress checks:** During the day, check actual usage against goals ("you've done 1.5h of coding toward your 3h goal")
   - **End-of-day review:** Generate a goal review (what was accomplished, what slipped, patterns)
   - **Links/context:** The user mentions "check links" — the AI should be able to reference linked resources (URLs, documents, tickets) associated with goals
   - Every claim must reference real app usage data, not generic advice

6. **Token Budget per Provider** — Different providers have different cost structures. Design how token budgets are managed per provider.

---

### Design Task

1. **Provider Settings UI** — Design a section in Settings > AI Assistant that shows:
   - List of configured providers with status indicators (connected/disconnected/error)
   - "Add Provider" button → select from list (CloudFlayer, Invilier, Olamah) or enter custom endpoint
   - Per-provider credential fields (API key, endpoint URL, model list) with test-connection button
   - Drag-to-reorder providers (priority/fallback order)
   - Per-feature provider assignment (research digest vs goal assistant)
   - Visual style: dark theme (zinc-900/60 cards, amber accent, backdrop-blur, rounded-2xl)

2. **Goal Management UI** — Design the main feature on the AI page:
   - A prominent "Daily Plan" card at the top of the page
   - Morning mode: AI-suggested goals with "Accept all" / "Edit" / "Dismiss" actions
   - In-progress mode: live progress bars showing tracked time vs goal target
   - End-of-day mode: goal review summary (what was done, what slipped)
   - Manual "Add Goal" button for custom goals
   - Goal history view (past days/weeks)

3. **Research Digest UI** — Keep the existing TopicDigestCard but wire it through the new provider abstraction.

4. **Removal of unused features** — The daily brief, weekly review, pattern analysis, sleep analysis, anomaly detection, and data chat sections should be removed from the AiPage. The page should be simplified to only show:
   - Research Digest (kept)
   - Daily Goal Plan (new, primary)
   - Goal History (new)

---

### UX Task

1. **Provider Configuration Flow:**
   - Settings > AI Assistant → sees OpenRouter already configured
   - "Add Provider" → pick from list → enter credentials → test → save
   - Drag to reorder for fallback priority
   - Assign which provider handles research digest vs goal assistant
   - Save → all AI features use the configured chain

2. **Goal Tracking Flow:**
   - Open AI page → see "Daily Plan" card at top
   - Morning: AI suggests goals based on patterns, unfinished work, linked resources
   - Accept/edit/dismiss each suggestion
   - Throughout day: real-time progress ("2h of 3h coding done")
   - Manually add goals anytime
   - EOD: card shows review mode
   - Goal states: suggested → accepted → in-progress → completed / slipped

3. **Empty States:**
   - No providers → setup prompt guiding to Settings
   - No goals → "Set your first goal" CTA
   - AI unavailable → graceful error with link to provider config

4. **Error Handling:**
   - Provider fails → error + retry button
   - Fallback to next provider → indicator of which provider was used
   - All providers fail → "AI unavailable" with troubleshooting

---

## Requirements Checklist

### Data Processing Pipeline
- [ ] Provider connector interface + implementations for OpenRouter, CloudFlayer, Invilier, Olamah, custom
- [ ] Provider configuration storage schema
- [ ] Provider routing and fallback logic (per-feature assignment)
- [ ] Goal data model + persistence
- [ ] AI goal suggestion pipeline (morning prompt, progress checks, EOD review)
- [ ] Goal progress computation from logs/stats
- [ ] Token budget management per provider
- [ ] Token tier fallback (existing 200→100→50→40 pattern preserved)

### Visual Specifications
- [ ] Provider settings UI layout
- [ ] Daily Plan card (morning/in-progress/review modes)
- [ ] Goal list with progress bars, status badges
- [ ] Colors, spacing, border radius matching existing dark theme
- [ ] Framer-motion animations consistent with existing patterns

### Interaction Flow
- [ ] Provider add → configure → test → save flow
- [ ] Goal suggestion → accept → track → complete lifecycle
- [ ] Error and empty states
- [ ] Fallback chain behavior
- [ ] Removal of unused AI features (daily brief, weekly, pattern, sleep, anomaly, chat)

---

## Constraints

- Must work with existing IPC architecture (`preload.ts` bridge pattern)
- Must not introduce new npm dependencies unless necessary
- Provider config must survive app restarts
- Goals can use localStorage for v1 (no DB migration needed initially)
- All new UI must use existing components (`GlassCard`, etc.) where possible
- Must respect the existing token budget retry logic (token tiers)
- Tailwind v4 (`@import "tailwindcss"` in `index.css`) — no v3 directives
- The unused AI features should be **removed** from the codebase, not just hidden

---

## Output Format

Return your solution as a single markdown document with three sections:
1. **Data Processing Pipeline** — architecture, interfaces, data flow, prompt templates for goal assistant
2. **Visual Specifications** — component tree, layout, exact Tailwind classes
3. **Interaction & UX Flow** — user flows, state machines

Include TypeScript interface definitions. Include goal assistant system prompts. Include exact Tailwind classes for every new UI element.
