# CONTEXT BUNDLE — AI Assistant Page Redesign

## 1. Project Overview
DeskFlow is an Electron + React + better-sqlite3 desktop productivity tracker. The AI Assistant page (`/ai`) is a multi-section surface: Chat, Summary cards, Connectors, Daily Digest, Focus, Plan, Reflect. The user rejected the current UI as "WORSE" and demands a full revamp using all frontend design skills and MCPs.

## 2. Design Tokens (src/index.css)
```
--bg-primary:     #09090b
--bg-secondary:   #18181b
--bg-tertiary:    #27272a
--bg-elevated:    #2d2d31
--bg-glass:       rgba(24, 24, 27, 0.80)
--bg-glass-heavy: rgba(24, 24, 27, 0.92)
--text-primary:   #f4f4f5
--text-secondary: #a1a1aa
--text-muted:     #52525b
--text-disabled:  #3f3f46
--accent-primary:   #ec4899
--accent-hover:     #db2777
--accent-muted:     rgba(236, 72, 153, 0.15)
--accent-secondary: #22d3ee
--success:         #34d399
--warning:         #fbbf24
--error:           #f87171
--info:            #38bdf8
--border-subtle:   #27272a
--border-default:  #3f3f46
--border-active:   #52525b
--border-glass:    rgba(63, 63, 70, 0.50)
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--ease-in:     cubic-bezier(0.4, 0, 1, 1)
--ease-inout:  cubic-bezier(0.4, 0, 0.2, 1)
--fast:        150ms
--normal:      250ms
--slow:        400ms
[data-page="ai"] { --page-accent: #ec4899; }
```
Fonts: Geist/Inter 13px body, JetBrains Mono for code/numbers. Dark mode only.

## 3. Token Constants (src/components/ai/tokens.ts)
```ts
export const SURFACE = {
  base:     'bg-zinc-950',
  card:     'bg-zinc-900/40',
  cardHi:   'bg-zinc-900/60',
  inset:    'bg-zinc-950/60',
} as const
export const RING = {
  base:   'ring-1 ring-zinc-800/60',
  hover:  'ring-zinc-700',
  active: 'ring-zinc-600',
  focus:  'focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none',
} as const
export const TEXT = {
  primary:   'text-zinc-100',
  secondary: 'text-zinc-400',
  muted:     'text-zinc-500',
  disabled:  'text-zinc-600',
} as const
export const ACCENT = {
  pink:    { dot:'bg-pink-400',    bar:'bg-pink-500',    pill:'bg-pink-500/10 text-pink-300 ring-pink-500/20',    hex:'#f472b6' },
  emerald: { dot:'bg-emerald-400', bar:'bg-emerald-500', pill:'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20', hex:'#10b981' },
  amber:   { dot:'bg-amber-400',   bar:'bg-amber-500',   pill:'bg-amber-500/10 text-amber-300 ring-amber-500/20',   hex:'#f59e0b' },
  violet:  { dot:'bg-violet-400',  bar:'bg-violet-500',  pill:'bg-violet-500/10 text-violet-300 ring-violet-500/20', hex:'#a78bfa' },
  red:     { dot:'bg-red-400',     bar:'bg-red-500',     pill:'bg-red-500/10 text-red-300 ring-red-500/20',       hex:'#f87171' },
} as const
export const MOTION = {
  fast: 0.15, normal: 0.25, slow: 0.40,
  ease: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  stagger: 0.05,
} as const
```

## 4. Shared Primitives (src/components/ai/)
- **GlassCard.tsx**: `rounded-xl p-5 bg-zinc-900/40 ring-1 ring-zinc-800/60`; optional accent left bar; `motion.div` with `whileHover={{ y: -2 }}`. Variants: default, elevated, interactive.
- **SectionHead.tsx**: Accent bar + title + desc + right slot. Entrance animation.
- **StatusDot.tsx**: Colored dot with optional breathe pulse.
- **IconButton.tsx**: 32x32 icon button with tooltip, hover/active/disabled, focus ring.
- **StateShell.tsx**: Renders loading/empty/error/ready states. AnimatePresence crossfade.
- **index.ts**: Exports all above + `SURFACE, RING, TEXT, ACCENT, MOTION` from tokens.

## 5. AiPage.tsx (src/pages/AiPage.tsx — 469 lines)
Main page component. Structure:
- Aurora background animation (CSS `@keyframes aurora`)
- Sticky header with Bot icon, title, day label, mode pill, Settings/Features buttons
- `motion.div` with stagger variants wrapping sections:
  1. AI Chat hero (`GlassCard` with `AiChat` inside, h-[520px])
  2. Context rail: grid xl:grid-cols-3 — SummaryGrid (2 cols) + ConnectorsPanel (1 col)
  3. Daily Digest (DailyDigestBoard)
  4. Focus & Plan: grid xl:grid-cols-2 — FocusBoard + PlanBoard
  5. Reflect: ReflectFeed
  6. Diagnostics (toggle)
  7. Footer
- State: goals, digestTopics, aiProviders, aiRouting, mode, suggestions, planGoals, etc.
- IPC calls: getGoals, getTopicDigest, isDigestGenerating, onDigestGenerationComplete, getAiProviders, readPlanningMd, getLongtermGoals, suggestGoals, saveGoal, saveGoalReview, getGoalContext

## 6. AiChat.tsx (src/components/AiChat/AiChat.tsx — 350 lines)
Chat interface. Components: ChatHeader, MessageList, MessageBubble, ChatInput, ChatEmptyState, ChatErrorRow, BlockRenderer, TypewriterText, ThinkingIndicator, AgentProgressBar.
- Uses `aiAgentService.processMessage()` with progress callback
- Voice input via `useVoiceInput` hook
- Thread persistence via `chatPersistence` (localStorage)
- Connector context injection on inbox/calendar intent

## 7. ChatInput.tsx (src/components/AiChat/ChatInput.tsx — 159 lines)
- Auto-resize textarea, Enter to send, Shift+Enter newline
- CharCountRing (SVG) appears at 80% length
- VoiceInputButton integration
- Send button with just-sent Check animation

## 8. SummaryGrid.tsx (src/components/SummaryGrid.tsx — 124 lines)
4-card grid: TodayOverviewCard, AiUsageCard, ProjectStatusCard, ContextSummaryCard.
- Uses `useAiPageData` hook for caching
- 60s refresh interval, pauses on visibilitychange
- IPC: getDashboardAggregates, getAIUsageSummary, getProjects, getGoalsBatch

## 9. ConnectorsPanel.tsx (src/components/ConnectorsPanel.tsx — 463 lines)
- StateShell with loading/empty/error/ready
- ConnectorCard: TypeIcon, name, StatusDot, actions (sync/test/remove/expand)
- Sync progress bar (indeterminate animation)
- Expanded ConnectorItemList with ItemFilterBar (All/Email/Event + search + unread toggle)
- IPC: connectors.list, connectors.sync, connectors.test, connectors.remove, connectors.items

## 10. FocusBoard.tsx (src/components/ai/focus/FocusBoard.tsx — 480 lines)
- 3 metric cards (Done today, In progress, Focus time) with NumberTicker
- Mode indicator (Morning/In-Progress/Review) with accent pill
- Sections: From your plan, AI suggestions, Today's goals
- GoalRow with CheckCircle, category dot, target seconds
- ReviewPanel (evening mode): completion stats, feedback input
- Empty state: "Plan your day" with Suggest goals button
- Loading: skeleton cards + rows
- Error: AlertCircle + Retry

## 11. PlanBoard.tsx (src/components/ai/plan/PlanBoard.tsx — 722 lines)
- Two-pane layout at xl (WeekPane + LongTermPane side by side), tabbed on smaller
- WeekPane: read/write Planning.md with inline editor
- LongTermPane: goal list with add, reorder, delete, bulk import
- BulkImportDialog: AI-powered text-to-goals parsing
- Empty states, skeletons, error states

## 12. ReflectFeed.tsx (src/components/ai/reflect/ReflectFeed.tsx — 423 lines)
- Filter tabs: All, Research, Goals
- Timeline with vertical gradient line
- FeedDigest: collapsible topic cards with sources
- FeedHistory: collapsible day cards with goal status icons
- Empty states per filter
- Loading skeletons
- IPC: getGoals (7 days)

## 13. DailyDigestBoard.tsx (src/components/ai/digest/DailyDigestBoard.tsx — 287 lines)
- Calendar icon, title, AI-curated badge, provider badge
- StateShell with DigestSkeleton, EmptyNoTopics, EmptyReadyToGenerate
- TopicCard: collapsible with summary + sources
- Refresh button, Configure button
- IPC: getTopicDigest, isDigestGenerating, onDigestGenerationComplete

## 14. IPC Endpoints (relevant subset from src/preload.ts)
```
get-goals(date) → GoalDay
get-goals-batch(startDate, endDate) → { days: GoalDay[] }
get-longterm-goals → { success, goals }
save-goal(date, goal) → { success }
delete-goal(goalId) → { success }
save-goal-review(date, reviewSummary) → { success }
get-goal-context → { success, last7dByCategory }
suggest-goals(date, ctx) → { success, suggestions }
parseGoalDump(text) → { success, goals }
read-planning-md → { content }
write-planning-md(content) → { success }
get-topic-digest(opts?) → { success, topics, reason }
is-digest-generating → boolean
onDigestGenerationComplete → event
get-ai-providers → { providers, routing }
save-ai-providers(state) → { success }
get-ai-config → { apiKey, enabled, ... }
save-ai-config(config) → { success }
get-interest-topics → { topics }
add-interest-topic(topic) → { success }
remove-interest-topic(topic) → { success }
get-dashboard-aggregates({ period }) → { overview, appStats }
get-ai-usage-summary(period?) → { totalTokens, totalCost, byTool }
get-projects → Project[]
connectors.list → { success, connectors }
connectors.add(connector) → { success, id }
connectors.remove(id) → { success }
connectors.test(id) → { success, ... }
connectors.sync(id) → { success, newItems }
connectors.items(id, opts?) → { items, hasMore, offset }
provider-chat-call(data) → streaming via provider-chunk event
```

## 15. Backup Location
Pre-redesign backup: `agent/backups/20260701-214701-ai-redesign-pre/`
Current code has been modified by the agent and was rejected by the user.
The prompt should instruct the target AI to redesign from scratch using the backup as the baseline.

## 16. Existing Spec (RESULT_NEW.md)
`agent/docs/ai-page-redesign/RESULT_NEW.md` (773 lines) contains a detailed spec covering:
- Design system tokens (matching tokens.ts)
- Page layout with two-column xl shell
- Sticky header spec
- Chat interface (ChatHeader, MessageBubble, TypewriterText, AgentProgressBar, ThinkingIndicator, ChatInput, ChatEmptyState)
- ConnectorsPanel with item browsing
- Voice input refactor
- Summary cards (4-card grid with MetricCard shell)
- Empty/Loading/Error state patterns (StateShell)
- Integration & data flow
- State management & persistence
- Implementation order (11 steps)
- Self-audit checklist

The target AI should read RESULT_NEW.md as the design spec.
