# DeskFlow AI — Revamp Component Kit

Production React + TypeScript components for the DeskFlow AI Assistant page.
Dark-only, Tailwind v4, `framer-motion` + `lucide-react`. Every piece applies the
five frontend skills: **Motion**, **UI-UX-ProMax**, **Human-Centric UX**,
**Impeccable**, and **Anti-Slop**.

This kit is presentational and drop-in: `AiPage` keeps owning all state + IPC.
No new IPC endpoints are required.

## Install

Peer deps (already in your stack):

```bash
npm i framer-motion lucide-react
```

Tailwind v4 — make sure your global stylesheet imports Tailwind and the aurora
background:

```css
/* globals.css */
@import "tailwindcss";
@import "./components/ai/styles/aurora.css";
```

Fonts (Geist / Inter for UI, JetBrains Mono for numbers). Add to your root:

```css
:root { --page-accent: #f472b6; } /* pink; sections override locally */
body { font-family: Geist, Inter, ui-sans-serif, system-ui; font-size: 13px; }
```

Copy `src/components/ai/**` into your app (e.g. `src/components/ai`). If you use
a path alias, imports work as `@/components/ai`.

## Design system

| Concern | Rule |
| --- | --- |
| Radius | `rounded-xl` max |
| Padding | `p-5` max on cards |
| Elevation | ring-based only, **no box-shadow** |
| Motion | transform + opacity only; 150 / 250 / 400ms; ease `[0.16,1,0.3,1]` / `[0.4,0,0.2,1]`; **no spring** |
| Reduced motion | every animation degrades via `useReducedMotion` |
| Type | Geist/Inter 13px + JetBrains Mono for numerals |
| Accent identity | Chat=pink · Focus=emerald · Plan=violet · Reflect=amber · Digest/Connectors=cyan |

All tokens live in `tokens.ts`. Accent is applied only to the section bar, the
primary metric, and the primary CTA — never as a wash.

## Layout wiring

```tsx
import {
  ChatPanel, SummaryGrid, ConnectorsPanel,
  DailyDigestBoard, FocusBoard, PlanBoard, ReflectFeed,
} from "@/components/ai"

function AiPage() {
  // ...existing state + IPC hooks stay here...
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5">
      <ChatPanel messages={messages} streaming={streaming} onSend={sendMessage}
        onStop={stop} input={input} onInputChange={setInput}
        listening={listening} onToggleVoice={toggleVoice} voiceSupported={voiceSupported}
        agentSteps={agentSteps} provider={providerName} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <DailyDigestBoard state={digestState} topics={topics}
          generating={digestGenerating} onRefresh={refreshDigest}
          onConfigure={openTopicSettings} onGenerate={generateDigest} />
        <div className="space-y-6">
          <SummaryGrid state={summaryState} stats={summaryStats} onRefresh={refreshSummary} />
          <ConnectorsPanel state={connState} connectors={connectors}
            onAdd={addConnector} onSync={syncConnector} onOpen={openConnector} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FocusBoard state={focusState} mode={mode} goals={todayGoals}
          planGoals={planGoals} suggestions={suggestions} metrics={focusMetrics}
          onToggleGoal={toggleGoal} onAcceptSuggestion={acceptSuggestion}
          onDismissSuggestion={dismissSuggestion} onSuggestGoals={suggestGoals}
          reviewSummary={reviewSummary} onSaveReview={saveReview} />
        <PlanBoard state={planState} goals={longTermGoals} notes={planningMd}
          onSaveNotes={writePlanningMd} onAnalyzeDump={parseGoalDump}
          onSaveGoals={saveGoalsBatch} onToggleGoal={toggleLongTermGoal} />
      </div>

      <ReflectFeed state={historyState} days={goalDays} />
    </div>
  )
}
```

## IPC map (existing endpoints only)

| Prop | IPC channel |
| --- | --- |
| `DailyDigestBoard.onRefresh` / `topics` | `get-topic-digest`, `is-digest-generating`, `onDigestGenerationComplete` |
| `DailyDigestBoard.onConfigure` | `get-interest-topics` / `add-interest-topic` / `remove-interest-topic` |
| `SummaryGrid.stats` | `get-dashboard-aggregates({period})`, `get-ai-usage-summary` |
| `ConnectorsPanel.*` | `connectors.list/add/remove/test/sync/items` |
| `FocusBoard.goals` | `get-goals(date)`, `save-goal`, `delete-goal` |
| `FocusBoard.suggestions` | `suggest-goals(date, ctx)`, `get-goal-context` |
| `FocusBoard.onSaveReview` | `save-goal-review(date, summary)` |
| `PlanBoard.goals` | `get-longterm-goals` |
| `PlanBoard.onAnalyzeDump` | `parseGoalDump(text)` |
| `PlanBoard.onSaveGoals` | `save-goals-batch` (fallback: sequential `save-goal`) |
| `PlanBoard.notes` | `read-planning-md` / `write-planning-md(content)` |
| `ReflectFeed.days` | `get-goals-batch(start, end)` |
| `ChatPanel.onSend` | `provider-chat-call` (stream via `provider-chunk`) |

> `save-goals-batch` may not exist in your build — if so, map `onSaveGoals` to a
> loop of `save-goal` calls.

## File map

```
src/components/ai/
  tokens.ts            design tokens (SURFACE/RING/TEXT/ACCENT/MOTION)
  types.ts             Goal / LongTermGoal / GoalDay / TopicDigestItem / DataState
  lib/cn.ts            className joiner
  lib/motion.ts        shared variants + useMotionProps (reduced-motion aware)
  styles/aurora.css    ambient background (disabled under reduced-motion)
  GlassCard.tsx        card shell w/ accent bar
  SectionHead.tsx      section header (icon tile + title + right slot)
  StatusDot.tsx        live status dot
  IconButton.tsx       32px icon button + tooltip
  MetricCard.tsx       metric shell (uses CountUp)
  StateShell.tsx       loading/empty/error/ready switch + EmptyState
  primitives/          CountUp, CheckDraw, Segmented, Collapsible, Progress, Dialog, Skeleton
  digest/              DailyDigestBoard (HERO)
  focus/               FocusBoard, GoalRow
  plan/                PlanBoard, BulkImportDialog
  reflect/             ReflectFeed
  summary/             SummaryGrid
  connectors/          ConnectorsPanel
  chat/                ChatPanel, ChatInput, MessageBubble, ThinkingIndicator,
                       TypewriterText, AgentProgressBar, CharCountRing, ChatEmptyState
  index.ts             barrel
```

## Accessibility

- All actionable icons have `aria-label`; focus rings use `--page-accent`.
- `StateShell` guarantees a visible state for every async region (no blank boxes).
- Motion honors `prefers-reduced-motion` everywhere (loops, entries, typewriter).
- Status is never color-only — dots pair with text/labels where it matters.
