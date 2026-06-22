# Continuation Design Prompt: planning.md Integration, Context Persistence, Checklist Parsing & AI Page UI/UX Revamp

## Introduction

This is a **continuation** of the multi-provider AI connector and daily goal tracking design. The **backend** is fully implemented (provider abstraction layer, GoalStore, IPC handlers, topic digest rewired). Two UI components (DailyPlanCard, GoalHistoryCard) exist but are **stub-quality placeholders** — the AiPage as a whole is described by the user as "absolutely ugly" and needs a **complete UI/UX overhaul**.

The previous session's spec is at:
`agent/docs/multi-provider-ai-design-07062026/RESULT.md` (857 lines — full provider architecture, goal data model, visual specs)

Read `RESULT.md` first. This prompt defines what comes **next**.

---

## Current State (What's Built)

### Backend — ✅ Done
- `src/services/providers/types.ts` — ProviderTemplate, CanonicalRequest/Response, ResolvedProvider
- `src/services/providers/templates.ts` — 5 templates (OpenRouter, CloudFlayer, Invilier, Olamah, Custom)
- `src/services/providers/callProvider.ts` — Universal fetch caller with auth/body/response adapters
- `src/services/providers/router.ts` — buildChain() + runWithFallback()
- `src/services/GoalStore.ts` — localStorage-backed goal persistence
- `src/main.ts` — 6 IPC handlers (compute-goal-progress, get-ai-providers, save-ai-providers, test-provider, suggest-goals, review-goals) + topic digest rewired
- `src/preload.ts` — 6 corresponding bridges
- DB tables: `goals`, `goal_reviews` added to init

### Frontend — 🟡 Stub Quality
- `src/components/DailyPlanCard.tsx` — exists, basic structure, no visual polish
- `src/components/GoalHistoryCard.tsx` — exists, basic structure, no visual polish
- `src/pages/AiPage.tsx` — **still has all the old cruft**: anomaly banner, anomaly alerts card, sleep card, pattern card, weekly review, data chat, brief card. The page is a hodgepodge of unused features and badly-styled new cards. **All of this must be cleaned up and redesigned.**

### What RESULT.md says should be deleted but hasn't been
- [ ] Delete components: `AiBriefCard.tsx`, `WeeklyReviewCard.tsx`, `PatternCard.tsx`, `SleepCard.tsx`
- [ ] Remove from `AiPage.tsx`: anomaly banner, activity alerts, data-chat block, and their state/handlers
- [ ] Delete `AIService` methods: `generateDailyBrief`, `generateWeeklyReview`, `analyzePatterns`, `analyzeSleep`, `dataChatQuery`, `checkAnomalies` + their prompts
- [ ] Remove IPC channels: `get-ai-brief`, `regenerate-ai-brief`, `check-anomalies`, `analyze-patterns`, `analyze-sleep`, `data-chat-query`

---

## The Mandate

Design and implement **4 interconnected features** that complete the AI Assistant:

---

### Part A — planning.md as System Prompt

**Problem:** Currently the AI suggests goals from generic prompts. It has no idea about the user's actual long-term plans, projects, or priorities.

**Solution:** The user maintains a `planning.md` file (stored in the app's user data directory, synced to localStorage for the renderer). Its content becomes the **primary system prompt** for all goal-related AI calls.

**Requirements:**

1. **File location:** `{userData}/DeskFlow/planning.md` (same directory as preferences.json)
2. **IPC endpoint:** `read-planning-md` → returns file content (or empty string if missing). `write-planning-md` → saves content back.
3. **Preload bridge:** `readPlanningMd`, `writePlanningMd`
4. **How it works:**
   - On AiPage mount, read `planning.md` content
   - When calling `suggest-goals`, prepend the planning.md content as a "## User's Plan" section in the system prompt
   - When calling `review-goals`, include the planning.md content so the AI can reference plans in its review
5. **UI for editing:**
   - An inline editor card on the AiPage titled "My Plan" — shows the raw markdown in a textarea
   - "Edit" button toggles between preview (rendered markdown) and edit (textarea)
   - "Save" button persists via `write-planning-md`
   - Empty state: placeholder text "Write your daily/weekly plan here... Use markdown checklists like `- [ ] Task name`"
   - Default template on first open:
     ```markdown
     # Today's Plan

     ## Priorities
     - [ ] 

     ## Notes
     ```
6. **Markdown rendering:** Use `react-markdown` (check if installed; if not, use simple regex-based rendering — just render headings `##`, bold `**`, lists `-`, and checkboxes `- [ ] / - [x]`). DO NOT add a new npm dependency.
7. **Auto-save:** Debounce save (1s after last keystroke) so the user never loses content.

---

### Part B — Context Management Persistence

**Problem:** The AI currently has no memory of what was suggested/accomplished yesterday. Every morning it starts fresh, potentially re-suggesting the same unfinished tasks (wasting tokens) or suggesting things already done.

**Solution:** Track goal history in GoalStore (already built) and feed it into the AI context. The system should:

1. **Load yesterday's unfinished goals** on mount and carry them forward as "unfinished" context
2. **Persist completion state** — once a goal is marked `completed`, never re-suggest it
3. **Goal suggestion prompt** now receives:
   - `unfinished: Array<{title, category, progress}>` — yesterday's slipped/pending goals
   - `recentlyCompleted: string[]` — last 7 days' completed goal titles (so AI doesn't re-suggest)
   - `planningContent: string` — the user's planning.md (Part A)
4. **Update GoalStore architecture:**
   - Currently stored in localStorage under `deskflow_goals`
   - Add a `context` field to `GoalDay`: `{ lastUnfinishedCarriedOver: string[], completedToday: number }` so the UI can show "carried over from yesterday" badges
5. **New IPC helper:** `get-goal-context` → returns `{ unfinished, recentlyCompleted, stats }` assembled from GoalStore + logs. Used by the goal suggestion prompt assembly.
6. **Cache busting:** If the user edits planning.md, invalidate the "goals suggested today" cache so fresh suggestions are fetched.

---

### Part C — Checklist Parsing & User Feedback Loop

**Problem:** The user writes checklists in planning.md (`- [ ] Do X`). The AI ignores them. User feedback ("I finished the report") doesn't update the plan.

**Solution:**

1. **Checklist → Goal mapping:** On AiPage mount or on planning.md save, parse the markdown for `- [ ]` items. Each checkbox becomes a **proposed goal**. Show them in a "From your plan" section in the DailyPlanCard.
2. **Auto-link:** Parse adjacent lines for time estimates like `(2h)`, `(30m)`, `(1.5h)` and auto-set the goal's `targetSeconds`.
3. **User feedback input:** Below the active goals list in DailyPlanCard, add a compact input: "What did you finish?" with a send button. This triggers a lightweight AI call that:
   - Parses the user's natural language ("Finished the report, started on the slides")
   - Maps it to existing goals or creates ad-hoc completion entries
   - Updates GoalStore accordingly
   - Returns a simple confirmation like "✓ Marked 'Finish report' as done. Added 'Work on slides' as a new goal."
4. **Feedback prompt:** Very short, low-token:
   ```
   You are tracking goal progress. Given the user's message and today's goals, respond with JSON:
   { "completed": ["goal titles that are done"], "added": [{ "title": string, "description": string }], "note": string }
   If nothing matches, return empty arrays.
   ```
5. **Status sync:** When a checkbox in planning.md is marked `- [x]`, auto-create a matching completed goal in GoalStore. When a goal is completed in the app, auto-update the planning.md checkbox to `- [x]`.
6. **Drag reorder:** The checklist items in the "From your plan" section should be draggable to reorder priority. Use HTML5 drag API (no new deps).

---

### Part D — Complete AiPage UI/UX Revamp

**This is the highest-priority part.** The page is currently ugly, cluttered, and inconsistent. Redesign the entire page using the project's design skills (frontend-design, impeccable, ui-ux-pro-max).

Design skills reference files:
- `agent/skills/frontend-design/SKILL.md` — Core principles: progressive disclosure, density without clutter, glass as structure, motion as feedback, type as UI. Per-page accent colors (pink-500 for AI page).
- `agent/skills/impeccable/SKILL.md` — 7 domain references (typography, color, spatial, motion, interaction, responsive, UX writing), 23 commands, 27 anti-patterns.
- `agent/skills/ui-ux-pro-max/SKILL.md` — Industry-specific design rules, style library, color palette guide.

**Visual Foundation:**

1. **Color scheme:**
   - Background: `zinc-950` (base), `zinc-900` (elevated cards), `zinc-900/50` (glass)
   - Primary accent: `pink-500` (page accent per frontend-design conventions)
   - Secondary: `amber-400` (goal/progress accent)
   - Semantic: `emerald-400` (completed/success), `red-400` (overdue/error)
   - Text: `zinc-100` (primary), `zinc-400` (secondary), `zinc-600` (disabled)
   - Border: `zinc-800` (subtle), `zinc-700` (active)
   - NEVER use pure black (`#000`), NEVER use more than 3 accent colors in a view, NEVER use `opacity` for text hierarchy

2. **Typography:**
   - Font: Geist (UI), JetBrains Mono (code/data)
   - Scale: 12px (secondary), 13-14px (body), 15-16px (card titles), 18-20px (page title)
   - Line height: 1.5 body, 1.2 headings
   - Weight hierarchy: 400 body, 500 labels, 600 headings
   - NEVER use `font-thin` (100-200) on dark backgrounds

3. **Spacing (8px grid):**
   - xs: 4px (tight inline)
   - sm: 8px (component internal)
   - md: 12px (card padding)
   - lg: 16px (section gaps)
   - xl: 24px (page sections)

4. **Motion:**
   - Fast: 150ms (hover states, toggles)
   - Normal: 250ms (modals, dropdowns)
   - Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (standard)
   - Only animate `transform` and `opacity`. NEVER `width`, `height`, `top`, `left`
   - NEVER use spring physics in developer tools

5. **Glass cards:** `bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4`

**Page Layout (new):**

```
AiPage (max-w-6xl mx-auto space-y-6 p-6)
├─ Page Header
│   ├─ Sparkles icon (pink gradient)
│   ├─ "AI Assistant" title
│   ├─ "Plan with purpose" subtitle
│   └─ Provider status indicator (green dot + "via OpenRouter" chip)
│
├─ Provider Banner (conditional — only if 0 providers enabled)
│   └─ Glass card: "Connect an AI provider to enable goals & digest." + "Open Settings" button
│
├─ Main Grid (grid grid-cols-1 lg:grid-cols-3 gap-5)
│   │
│   ├─ LEFT COLUMN (lg:col-span-2) — main content
│   │   ├─ DailyPlanCard (primary feature)
│   │   │   ├─ Header: "Daily Plan" + date + provider chip
│   │   │   ├─ Mode indicator pill: "Morning" / "In Progress" / "Review"
│   │   │   ├─ Mode: Morning → suggested goals list with Accept/Edit/Dismiss
│   │   │   ├─ Mode: In Progress → live progress bars with timer
│   │   │   ├─ Mode: Review → EOD summary (accomplished/slipped/pattern)
│   │   │   ├─ Feedback input at bottom (Part C)
│   │   │   └─ Empty state: "No goals yet" + Suggest / Add manually buttons
│   │   │
│   │   └─ TopicDigestCard (kept, rewired through provider chain)
│   │       └─ Already exists — just restyle to match new design language
│   │
│   └─ RIGHT COLUMN (lg:col-span-1) — context & history
│       ├─ My Plan card (Part A — planning.md editor)
│       │   ├─ Header: "My Plan" + Edit/Save toggle
│       │   ├─ Preview mode: rendered markdown
│       │   ├─ Edit mode: textarea with monospace font
│       │   └─ Auto-save indicator
│       │
│       ├─ Goal History card
│       │   ├─ Compact list of past days
│       │   ├─ Per-day: date + completion count + mini progress bar
│       │   ├─ Click to expand → shows that day's goals + review
│       │   └─ Empty state: "No goal history yet"
│       │
│       └─ Context Summary card
│           ├─ Shows: unfinished carry-overs, recently completed count
│           ├─ AI status: "Last suggestion used 342 tokens via OpenRouter"
│           └─ Refresh button (with warning about token cost)
```

**Design Requirements for Each Card:**

**DailyPlanCard (PRIMARY, left col, lg:col-span-2):**
- Glass card with pink accent stripe at top (2px, `bg-pink-500`)
- Header: h3 "Daily Plan" + date badge + mode pill
- Mode pill: `text-[11px] px-2 py-0.5 rounded-full` with color per mode (amber=suggestion, emerald=progress, pink=review)
- Morning mode: Each suggestion is a `motion.div` row with staggered entrance (delay: i*0.05), category icon on left, title+description in middle, Accept/Edit/Dismiss buttons on right
- In-progress mode: Each active goal is a progress bar row with title, timer, percentage, and emerald/amber status bar. Use `h-1.5 rounded-full bg-zinc-800 overflow-hidden` with `motion.div` inner bar
- Review mode: Two-column accomplished/slipped grid + pattern callout. Accomplished side in emerald border, slipped in amber border
- Feedback input (Part C): Compact row at bottom with text input + send button, styled to match chat but smaller
- Smooth mode transitions with AnimatePresence

**My Plan card (RIGHT col, Part A):**
- Glass card with amber accent stripe
- Header with "My Plan" + Edit/Save button
- Preview: render markdown headings (purple-400 for `##`), checkboxes (`- [ ]` → styled checkbox, `- [x]` → checked with emerald), bold text
- Edit: full-height textarea with `font-mono text-sm`, `bg-zinc-950/50`, border on focus
- Save indicator: "Saved" / "Unsaved changes" text in zinc-500

**Goal History card (RIGHT col):**
- Glass card with pink accent stripe
- Compact rows: date on left, count + mini bar on right
- Click expands: shows goal list with status badges + review summary
- Status badges: `text-[11px] px-2 py-0.5 rounded-full` with colors per status (emerald=done, amber=slipped, zinc=pending)

**TopicDigestCard:** Restyle to match — glass card with pink stripe, consistent header, keep existing content.

**Context Summary card (RIGHT col):**
- Glass card with subtle zinc border (no accent stripe — secondary)
- Two stat rows: "Unfinished" + count, "Completed this week" + count
- Token usage line at bottom in zinc-400
- Refresh button with amber styling

**States:**

Every card must handle:
1. **Loading:** Skeleton pulse animation (`animate-pulse bg-zinc-800 rounded`) matching card shape
2. **Empty:** Centered icon + message + action button (e.g., "No goals yet. Let's plan your day." + "Suggest Goals" button)
3. **Error:** Red-tinted card body with error message + Retry button
4. **Edge cases:** No providers configured → full-page banner; all providers failed → "AI unavailable" with retry; planning.md missing → default template shown

**Micro-interactions:**
- Checkbox toggle: brief scale bounce (scale-100 → scale-110 → scale-100, 200ms)
- Progress bar fill: smooth width animation (250ms, easeOut)
- Mode switch: cross-fade via AnimatePresence (opacity 0→1, y: -4→0, 250ms)
- Hover on interactive cards: `brightness-110` or `border-zinc-700` transition
- Save feedback on planning.md: brief green flash on the save indicator
- Provider status dot: subtle pulse animation

**Anti-patterns to AVOID (impeccable skill):**
- No transition: all (specify exact properties)
- No spring physics in a developer tool
- No opacity-based text hierarchy (use color tokens)
- No card without clear boundaries (must have border or glass effect)
- No border-radius > 12px for cards (max rounded-xl)
- No arbitrary z-index (use the z-index scale)
- No hidden-on-mobile primary content

---

## Implementation Order

1. **Cleanup first** — Delete unused components, remove old AiPage state/handlers/imports. Remove unused IPC handlers. This is the foundation.
2. **Part D — AiPage UI/UX Revamp** — Redesign the page first so the new cards have a proper home. Restyle DailyPlanCard, GoalHistoryCard, TopicDigestCard to new spec.
3. **Part A — planning.md** — Add IPC handlers, preload bridges, and the My Plan card. Test file read/write.
4. **Part B — Context Management** — Extend GoalStore, add get-goal-context IPC, wire into suggestion prompt assembly.
5. **Part C — Checklist parsing & feedback** — Add the parser, feedback input, drag-reorder, and status sync.

> **Important:** Each part should be independently testable. Part D (UI) can be built and verified without Parts A-C. Parts A-B need their IPC handlers verified. Part C needs Parts A-B working.

## Verification

- `npm run build` (renderer + electron) must pass at each stage
- AiPage loads without errors, shows the new layout
- planning.md can be read, edited, and saved
- Goals can be suggested (via existing `suggest-goals` IPC), accepted, and tracked
- Checkbox sync works both ways (planning.md ↔ goals)
- User feedback updates goal state
- All empty/loading/error states render correctly
- No visual regressions on other pages
