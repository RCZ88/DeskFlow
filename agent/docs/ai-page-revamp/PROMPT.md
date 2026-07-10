# PROMPT.md — AI Assistant Page: Full Interactive System with Structured Output Parsing

---

## RAW REQUEST (verbatim)

> "we need a full system on this that works and that actually has like the proper parsing of the ui and has the user be able to input stuff. and like make sure its the most interactible for the user and the best user experience. meaning it should provide the best experience by having the multiple different parsing and ui for each of the different features and the list of the pages and like the contents of the parsed should be different for each like feature of addition of something or like adjusting of the other. also, for all backend for like the connectors, the planning, the daily digest. all of them should also work brilliantly."

---

## CONTEXT BUNDLE REFERENCE

Read `agent/docs/ai-page-revamp/CONTEXT_BUNDLE.md` FIRST. It contains:
- Complete file inventory with line counts (28 files)
- ALL 32 IPC endpoints with real/stub status
- Full TypeScript types (Goal, LongTermGoal, ChatMessage, TopicDigestItem, etc.)
- Design tokens (colors, spacing, typography, motion)
- Exact broken items per component with line numbers
- Two SummaryGrid files situation
- Architecture diagram: AiPage → 12 sub-components

**The backend already exists and works.** `provider-chat-call` (main.ts:13534) does real streaming AI calls. `ai-chat:load/save/reset` persist to `ai_chat_messages` table with `parsed_json` column for structured output. Goal system, digest system, provider system — ALL real, NOT stubs. The problem is AiPage doesn't USE them.

---

## PROBLEM STATEMENT

The AiPage is disconnected from its own backend:

1. **Chat is a ghost town** — `handleChatSend` is `console.log('Chat send:', text)`. The entire `provider-chat-call` streaming backend (main.ts:13534) exists but is never called. The `ai-chat:load/save/reset` persistence (main.ts:13574-13609) exists but is never used. ChatPanel receives `input=""` hardcoded and `onInputChange` is never passed.

2. **No structured output rendering** — The `ai_chat_messages` table has a `parsed_json` column. `ai-chat:save` accepts it. But MessageBubble.tsx ONLY renders `content` as text/typewriter. AI responses that contain structured data (goals, plans, stats, actions) are rendered as raw text. The user never sees rich UI cards/charts/forms from AI responses.

3. **No app-wide AI context** — When the user sends a chat message, the AI knows NOTHING about the user's app state. No goals, no stats, no projects, no browser activity, no dashboard data. ContextService (src/services/ContextService.ts) reads agent files but is NOT wired into the AiPage chat system prompt.

4. **Goal/focus system partially broken** — `handleSaveGoals` is `console.log` stub, `handleAnalyzeDump` returns `[]`, BulkImportDialog useless. ReflectFeed only gets 1 day of history.

5. **DailyDigestBoard has dead button** — `onGenerate` prop never passed from AiPage.

6. **Design is non-interactive** — No proper animations, no loading skeletons, no error recovery, mobile collapsible hack is janky, empty states are incomplete.

---

## THE MANDATE — Complete System

Design and implement a **fully interactive AI Assistant system** where:

### A. The AI has COMPREHENSIVE context of the entire app
Before every chat interaction, the AI's system prompt must include:
- **Goals** — today's goals, long-term goals, completion stats from `getGoals`, `getLongtermGoals`
- **App usage** — today's tracked apps/sessions from `getDashboardAggregates`
- **AI usage** — tokens spent, tools used from `getAIUsageSummary`
- **Projects** — active projects from `getProjects`
- **Planning notes** — from `readPlanningMd`
- **Context stats** — 7-day trends from `getGoalContext`

Bundle this into a single context payload that gets sent as a system message prepended to every chat conversation. The AI should KNOW what the user has been doing, what goals they're working on, and what their app usage looks like.

### B. AI responses are PARSED into structured UI
The chat system MUST support MULTIPLE RESPONSE TYPES, each rendered as a different UI component:

| AI Response Type | `parsed_json.type` | Rendered As | When |
|---|---|---|---|
| **general_chat** | `null` or `{type: "text"}` | Plain MessageBubble with TypewriterText | Normal conversation |
| **goal_suggestion** | `{type: "goal_suggestion", goals: [{title, category, reason}], source: string}` | Rich goal cards with Accept/Dismiss buttons + category badges + explanation | AI suggests goals for today |
| **plan_update** | `{type: "plan_update", changes: [{action: "add"|"modify"|"complete", goal: {title, priority, category}}]}` | Animated plan diff — green adds, amber modifies, green check completes | AI updates the long-term plan |
| **stats_summary** | `{type: "stats_summary", metrics: [{label, value, change, icon}], period: string}` | MetricCard grid with count-up animation + trend arrows | AI summarizes app usage |
| **action_list** | `{type: "action_list", actions: [{label, description, priority, actionButton: {label, ipc: string, payload: object}}]}` | Interactive checklist with clickable action buttons that trigger IPC calls | AI suggests actions the user can take |
| **digest_item** | `{type: "digest_item", topic: string, summary: string, sources: [{title, url}]}` | Collapsible digest card with source links | AI delivers daily digest in chat |
| **connector_status** | `{type: "connector_status", connectors: [{name, status, lastSync, itemsCount}]}` | Status grid with green/red dots + sync buttons | AI reports connector health |
| **form_fill** | `{type: "form_fill", fields: [{name, label, type: "text"|"number"|"select"|"toggle", value, options}]}` | Inline form that submits back to chat | AI asks for structured input |
| **chart_data** | `{type: "chart_data", chartType: "bar"|"line"|"pie", labels: string[], datasets: [{label, data, color}]}` | Rendered Chart.js chart in the message | AI visualizes data |
| **error** | `{type: "error", message: string, recovery: string}` | Red-tinted error card with retry/dismiss | AI reports a problem |

**Architecture for this:**
```
ChatPanel receives response
  → detect if response has parsed_json
  → if yes: render ParsedMessageRouter which switches on parsed_json.type
  → if no: render normal MessageBubble (fallback for plain text)
```

Create a `ParsedMessageRouter.tsx` component that maps each type to its renderer:
- `GoalSuggestionCard.tsx` — goal cards with Accept/Dismiss
- `PlanUpdateCard.tsx` — animated diff list
- `StatsSummaryCard.tsx` — metric grid with count-up
- `ActionListCard.tsx` — interactive action buttons
- `DigestTopicCard.tsx` — collapsible topic with sources
- `ConnectorStatusCard.tsx` — connector grid
- `FormFillCard.tsx` — inline form that submits back to chat
- `ChartDataCard.tsx` — rendered chart
- `ErrorCard.tsx` — error with recovery

Each of these cards can TRIGGER IPC CALLS. For example:
- GoalSuggestionCard "Accept" button → calls `saveGoal`
- ActionListCard "Run" button → calls the specified IPC
- FormFillCard "Submit" → sends data back through the chat
- ConnectorStatusCard "Sync" → calls connector sync IPC

### C. The AI system prompt includes ALL app pages
The AI must know about every page in the app to answer questions about any of them:

```
You are DeskFlow AI, an assistant integrated into the user's productivity tracker.
You have access to the following app data:

## Dashboard (/)
- Timer: current productive time, active session status
- Recent sessions: last N apps/websites with durations
- Heatmap: 7x24 activity grid
- Weekly overview: stacked bar chart of daily activity

## Stats (/stats)
- App table: all tracked apps with total time
- Sessions list: view/edit/delete past sessions
- Live tracking: current foreground app + category

## IDE Projects (/ide)
- Project grid: all detected IDE projects
- AI Tools subpage: AI usage/cost over time
- Git stats: per-project commit/PR metrics

## Browser (/browser)
- Domain groups: websites by category
- Top sites: most visited
- Browser activity: time per site

## External (/external)
- External activity: non-device activities logged
- Sleep tracking: sleep schedule
- Time audit: comparison of external vs internal time

## Terminal (/terminal)
- Workspace sessions: AI agent conversations
- Terminal tabs: open terminal instances
- Saved workspaces: named config snapshots

## Settings (/settings)
- Categories: app/website tier assignments (productive/neutral/distracting)
- Browser rules: URL-based category overrides
- AI providers: configured AI backends
- Tracking: debounce, sleep detection, filters

## Insights (/reports)
- Day view: hourly breakdown by category
- Weekly view: day-by-day comparison
- Activities view: per-activity analysis

## Finance (/finance)
- Transactions: income/expense records
- Budgets: category budgets with progress
- Net worth: asset/liability tracking
- Crypto: portfolio with live prices
- Subscriptions: recurring payment management
```

The context bundle that gets sent with each chat should include the actual CURRENT VALUES for the most relevant sections (goals, today's stats, active projects, AI usage).

### D. All backend systems work brilliantly, connected end-to-end

**Chat System (HIGHEST PRIORITY):**
1. User types in ChatInput → `onInputChange` updates state → Send calls `handleChatSend`
2. `handleChatSend` builds the context bundle + user message → calls `provider-chat-call` IPC
3. `provider-chat-call` streams chunks via `provider-chunk` events → TypewriterText renders streaming
4. On complete → parse response for `parsed_json` → render appropriate UI card
5. Save conversation thread via `ai-chat:save` for history
6. Load previous thread via `ai-chat:load` when page opens
7. `ai-chat:list-threads` shows conversation history

**Goal System:**
1. `loadGoals` → `getGoals(today)` → shows goals in FocusBoard
2. `handleToggleGoal` → `saveGoal` with toggled status → reload
3. `handleSuggest` → `suggestGoals` with context → shows suggestions in FocusBoard
4. `handleAcceptSuggestion` → `saveGoal` with suggested goal → remove from suggestions
5. `handleSaveReview` → `saveGoalReview` (FIX THE BUG: it updates wrong table)
6. `loadPlanGoals` → `readPlanningMd` → parseChecklist → show as plan goals
7. `loadLongTermGoals` → `getLongtermGoals` → show in PlanBoard
8. `handleSaveGoals` → **REAL IMPLEMENTATION** → save via existing IPC or add `saveLongtermGoal`
9. `handleAnalyzeDump` → **REAL IMPLEMENTATION** → call `parseGoalDump` IPC → return parsed goals

**Daily Digest System:**
1. `loadDigest` → `getTopicDigest` → shows topics in DailyDigestBoard
2. `onGenerate` → pass it from AiPage (currently missing!) → calls `loadDigest(true, true)`
3. Polling: `isDigestGenerating` + interval → auto-display when ready
4. Event: `onDigestGenerationComplete` → auto-update when generation finishes

**Connectors System:**
1. `loadConnectors` → call connector IPC → show in ConnectorsPanel
2. `onAdd` → ConnectorSetupModal → create connector → refresh list
3. Each connector shows status, last sync, item count
4. Sync button calls connector sync IPC

### E. Interactive UX — every component is alive

**ChatPanel Interactions:**
- Textarea auto-grows as user types (field-sizing-content)
- Send button: disabled (gray) → enabled (pink) when text exists
- Streaming: Send button swaps to Square stop button
- Voice: Mic button with pulse animation while listening
- Character count ring appears at 70% of max
- Enter sends, Shift+Enter newlines, Ctrl+Enter also sends
- Suggestion chips in empty state fill the input on click
- Messages enter with stagger animation (0.05s apart)
- Assistant messages render typewriter text while streaming
- Parsed UI cards appear with a dissolve transition after streaming completes
- Scroll area auto-scrolls to bottom, but pauses if user has scrolled up
- Error state: red banner with "Configure provider" button if no provider is set

**FocusBoard Interactions:**
- Goal rows: click to toggle done/active → checkmark animation (CheckDraw)
- Metric cards: count-up on load, hover border-brighten
- AI suggestions: Accept button saves goal, Dismiss button removes
- Suggest goals button: loading spinner → results appear
- Review panel: textarea + save button, shows "Saved" confirmation
- Empty state: big "Plan your day" with Sparkles Suggest button
- Mode badge rotates between Morning/In Progress/Review with WordRotate

**PlanBoard Interactions:**
- Goals pane: segmented toggle between Goals/Notes
- Add button → BulkImportDialog → paste dump → analyze → review parsed goals → save
- LongTermRow: click title to toggle done, shows P1/P2/P3 priority badge
- Notes pane: textarea with dirty indicator ("Unsaved changes" / "All saved")
- Save notes button: disabled when clean, spinner when saving, success toast
- Paste a URL/text into BulkImportDialog → AI parses it into goals

**DailyDigestBoard Interactions:**
- Refresh button: spinning icon while generating
- Configure button → AiProviderSelectModal
- Topic cards: click to expand/collapse with Chevron animation
- Sources: click a URL → opens in browser
- Generating state: skeleton topic cards with pulse
- Empty state 1 (no topics): "Add topics" CTA button
- Empty state 2 (ready): "Generate digest" button with Sparkles
- Provider badge shows which AI model generated it

**ReflectFeed Interactions:**
- 3 filter pills: All / Reviewed / Productive — animated tab switch
- Day node: progress ring + goal completion count + date label
- Review summary: Sparkles icon + quoted text
- Timeline: vertical line with dot nodes, stagger entrance
- Hover on day node: border brightens, subtle lift

**SummaryGrid Interactions:**
- 4 metric cards: Goals done, Focus time, Streak, Active goals
- Count-up animation on value change
- Skeleton grid while loading
- Stale indicator + refresh on visibility change
- 60-second auto-refresh interval

---

## ADDITIONAL: TypeScript Implementation for ParsedMessageRouter

Create these new files:

```tsx
// src/components/ai/chat/ParsedMessageRouter.tsx
// Routes parsed_json.type → specific renderer component
// Types: goal_suggestion | plan_update | stats_summary | action_list | 
//        digest_item | connector_status | form_fill | chart_data | error

// src/components/ai/chat/renderers/GoalSuggestionCard.tsx
// Renders: goal list with category badges + Accept/Dismiss buttons
// IPC: onAccept → saveGoal, onDismiss → dismiss suggestion
// States: default (show goals), accepting (spinner on one button), done

// src/components/ai/chat/renderers/PlanUpdateCard.tsx
// Renders: animated diff list — green for added, amber for modified, green check for completed
// States: default, animating

// src/components/ai/chat/renderers/StatsSummaryCard.tsx
// Renders: 2x2 MetricCard grid with count-up animation
// States: loading (skeleton), populated (count-up), error

// src/components/ai/chat/renderers/ActionListCard.tsx
// Renders: checklist with clickable action buttons
// Each button has: label, icon, ipc channel, payload
// Click → calls IPC → shows result inline
// States: default, executing (spinner on one action), done

// src/components/ai/chat/renderers/FormFillCard.tsx
// Renders: inline form with fields (text, number, select, toggle)
// Submit button → sends structured data back through chat
// States: default, submitting, validation error, submitted

// src/components/ai/chat/renderers/ChartDataCard.tsx
// Renders: Chart.js chart (bar/line/pie) in the message flow
// States: loading (chart skeleton), populated (animated draw), error
```

Modify `MessageBubble.tsx` to detect `parsed_json` and delegate to `ParsedMessageRouter`.

Modify `ChatMessage` interface to include `parsedJson?: Record<string, any>`.

---

## VERIFICATION — Full End-to-End Tests

After implementation, these MUST ALL work:

### Chat Flow:
1. Typing in the input updates the textarea in real time
2. Empty state shows greeting + suggestion chips
3. Clicking a suggestion chip fills the input
4. Pressing Enter sends the message → user bubble appears → thinking indicator → assistant streams in
5. The Stop button stops streaming mid-response
6. AI responses with structured data render as RICH UI CARDS (not raw text)
7. GoalSuggestionCard's Accept button calls saveGoal IPC and removes the card
8. ActionListCard's action buttons call the specified IPC
9. FormFillCard's submit sends data back through the chat
10. Reloading the page restores the conversation from ai-chat:load
11. Multiple threads are listed and switchable

### Goal Flow:
12. Goals load from getGoals → displayed in FocusBoard
13. Clicking a goal toggles done/active with animation
14. "Suggest goals" button calls suggestGoals → suggestions appear
15. Accepting a suggestion saves the goal and removes it from suggestions
16. Dismissing a suggestion removes it
17. Evening review textarea saves to goal_reviews

### Plan Flow:
18. Long-term goals load from getLongtermGoals → displayed in PlanBoard
19. "Add" button opens BulkImportDialog
20. Pasting text into BulkImportDialog → AI parses it → shows preview → save
21. Notes textarea saves to planning.md with dirty indicator
22. Clicking a long-term goal toggles done/active

### Digest Flow:
23. Daily digest loads topics from getTopicDigest
24. "Generate" (or "Refresh") button triggers regeneration
25. Polling detects when generation completes → auto-displays
26. Topic cards expand/collapse with animation
27. Source links open in browser

### Connector Flow:
28. ConnectorsPanel shows configured connectors with status
29. "Add connector" button opens ConnectorSetupModal
30. Connector shows last sync time and item count

### Design Verification:
31. All buttons have hover (lift/glow), focus (ring), active (scale), disabled (opacity)
32. All data-driven components have empty/loading/error/populated states
33. Messages animate in with stagger (0.05s)
34. Metric values count up on load
35. Reduced motion: everything collapses to instant opacity
36. No box-shadow, no spring physics, no rounded-2xl/3xl, no pure black
37. All cards use DeskFlow glass tokens (bg-zinc-900/80 backdrop-blur-xl border-zinc-800/60 rounded-xl p-5)
38. All icons from lucide-react, no emoji as UI icons
39. Build passes with zero errors

---

## CONSTRAINTS

1. **DO NOT modify existing IPC handlers** — only ADD new ones if absolutely necessary. The existing `provider-chat-call`, `ai-chat:load/save/reset`, `getGoals`, `saveGoal`, `suggestGoals`, `getTopicDigest`, etc. are ALL real and working.
2. **The `parsed_json` field** is already in `ai-chat:save` and `ai_chat_messages` table — USE it, don't create a new field.
3. **The chat backend `provider-chat-call`** (main.ts:13534) already does streaming — use it, don't reimplement.
4. **The `handleChatSend` stub** must call `provider-chat-call` IPC.
5. **Build the context bundle** for the AI's system prompt by calling `getGoals`, `getDashboardAggregates`, `getGoalContext`, `getLongtermGoals`, `readPlanningMd`, `getProjects` before each chat send.
6. **Files are CRLF** — preserve line endings.
7. **Dark mode only** — strip any light variants.
8. **All card padding = p-5**, max border-radius = rounded-xl.
9. **No box-shadow** — use border brightness + glass layers.
10. **No spring physics** — use cubic-bezier(0.16, 1, 0.3, 1).
11. **No pure black** — use zinc-950.
12. **Animate only transform + opacity** — never width/height/top/left.
13. **Delete** `src/components/SummaryGrid.tsx` (old dead copy).
14. **Fix** the `save-goal-review` bug (main.ts:13726) — it `UPDATE`s `goals` table but `reviewSummary` column doesn't exist there, should write to `goal_reviews` table.

---

## APPLY ALL 7 FRONTEND DESIGN SKILLS

1. **Frontend Design** — DeskFlow component patterns, tokens, glass cards
2. **Human-Centric UX** — 4 states per component, progressive disclosure, visual hierarchy
3. **Impeccable** — 7 design dimensions, 27 anti-patterns (check ALL)
4. **Motion (L2 Responsive)** — hover/press, AnimatePresence, stagger, count-up, breathing dot
5. **UI UX Pro Max** — Dev tools aesthetic + AI/ML conversation patterns
6. **Design Taste System** — Variance=3, Intensity=5, Density=7, Claude+Linear vibe
7. **frontend-external-infra** — Re-skin rules, anti-slop checklist, MCP inventory

## MCP INVENTORY (use these, don't invent from zero)

**shadcn:** card, dialog, empty, button (6 variants, 8 sizes), tabs (2 variants), tooltip, skeleton, scroll-area, textarea, input, switch, select, badge, separator, collapsible, progress, checkbox, dropdown-menu, hover-card, command, form, sonner

**Magic UI:** Animated Beam, Border Beam, Shine Border, Magic Card, Number Ticker, Blur Fade, Word Rotate, Particles, Ripple, Animated Grid Pattern, Progressive Blur, Confetti

**Lucide:** Bot, Send, Square, Mic, Sparkles, Target, Flag, Brain, History, Calendar, BookOpen, Settings2, RefreshCw, Plus, Save, Check, X, CircleCheck, Activity, Moon, Sunrise, Flame, Clock, FileText, Wand2, Lightbulb, Zap, Trash2, Edit3, MessageSquare, CornerDownLeft, User, AlertCircle, Info, Loader2, ChevronDown, ChevronRight, Hash, PanelRightOpen, GripVertical

**React Bits:** 135+ components for text animations, particles, hover effects

**Iconify:** 200k+ icons (fallback when Lucide lacks what you need)
