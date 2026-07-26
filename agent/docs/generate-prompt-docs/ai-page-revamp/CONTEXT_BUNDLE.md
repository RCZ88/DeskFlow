# CONTEXT_BUNDLE.md — AI Assistant Page (AiPage) Revamp

> Target: `src/pages/AiPage.tsx` + all `src/components/ai/**/*` sub-components
> Route: `/ai` (defined in `src/App.tsx:2813`)

---

## 1. Architecture Overview

```
AiPage.tsx (state owner, IPC caller)
  ├── ChatPanel (chat/messages/input)
  │   ├── ChatInput (textarea + send/stop buttons)
  │   ├── MessageBubble
  │   ├── ThinkingIndicator
  │   ├── ChatEmptyState
  │   ├── AgentProgressBar
  │   └── CharCountRing
  ├── SummaryGrid (4 metric cards)
  ├── ConnectorsPanel
  ├── DailyDigestBoard (hero section)
  ├── FocusBoard (goals + suggestions + review)
  │   ├── GoalRow
  │   └── MetricCard
  ├── PlanBoard (long-term goals + notes)
  │   ├── BulkImportDialog
  │   └── LongTermRow
  └── ReflectFeed (day timeline)
```

**Data flow:** AiPage owns ALL state. It calls IPC, stores results in useState, passes down as props. Children are presentational.

---

## 2. The BIG problem — TWO SummaryGrids exist

| File | What it is | Imported by |
|------|-----------|-------------|
| `src/components/ai/summary/SummaryGrid.tsx` (99 lines) | NEW — presentational, takes `state`/`stats`/`errorMessage`/`onRetry` as props | AiPage.tsx line 9 |
| `src/components/SummaryGrid.tsx` (124 lines) | OLD — self-loading via useAiPageData hook, has own IPC calls | NOT imported by AiPage (but still exists in repo) |

**AiPage imports the NEW one** from `../components/ai/summary/SummaryGrid`. The OLD one at `src/components/SummaryGrid.tsx` is dead code — remove it.

---

## 3. AiPage.tsx — Key State & What's Broken

### State variables (all at AiPage level):
```tsx
const [goals, setGoals] = useState<Goal[]>([]);
const [review, setReview] = useState<string | null>(null);
const [goalsState, setGoalsState] = useState<DataState>('loading');
const [goalsError, setGoalsError] = useState<string | null>(null);
const [suggesting, setSuggesting] = useState(false);
const [savingGoal, setSavingGoal] = useState(false);
const [suggestions, setSuggestions] = useState<Goal[]>([]);
const [planGoals, setPlanGoals] = useState<Goal[]>([]);
const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
const [planningNotes, setPlanningNotes] = useState('');
const [digestTopics, setDigestTopics] = useState<any[]>([]);
const [digestState, setDigestState] = useState<DataState>('loading');
const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
const [chatStreaming, setChatStreaming] = useState(false);
const [chatThinking, setChatThinking] = useState(false);
const [collapsedMobile, setCollapsedMobile] = useState<Set<string>>(new Set());
```

### BROKEN — ChatPanel input doesn't work:
```tsx
// AiPage.tsx:318 — STUB, doesn't send anywhere
const handleChatSend = useCallback((text: string) => {
  console.log('Chat send:', text);  // ← JUST A LOG
}, []);

// AiPage.tsx:383-389 — no input state wired
<ChatPanel
  messages={chatMessages}
  streaming={chatStreaming}
  thinking={chatThinking}
  input=""         // ← HARDCODED EMPTY, never changes
  onSend={handleChatSend}  // ← STUB
/>
```
**Fix:** Wire `input` state, `onInputChange`, and make `onSend` actually call an IPC to send the message.

### SEMI-BROKEN — FocusBoard:
- `handleToggleGoal` (line 291) calls `window.deskflowAPI!.saveGoal()` then `loadGoals()` — this is correct
- `handleSuggest` (line 256) calls `window.deskflowAPI!.suggestGoals()` — this calls IPC
- But suggestions state is never cleared properly, loading states flash
- Review textarea has its own internal state (FocusBoard.tsx:243) but `onSave` pipes to `handleSaveReview` which calls IPC

### SEMI-BROKEN — PlanBoard:
- Notes textarea uses internal `draft` state (PlanBoard.tsx:39) synced from `notes` prop
- `onSaveNotes` calls `window.deskflowAPI!.writePlanningMd()` — correct
- `onSaveGoals` is a STUB (AiPage.tsx:333-335): `console.log('Save goals:', goals)`
- `handleAnalyzeDump` is a STUB (AiPage.tsx:329-331): `return []`
- BulkImportDialog won't work since both callbacks are stubs

### BROKEN — ReflectFeed:
- Only gets 1 day of data: `days={[{ date: today, goals, reviewSummary: review || undefined }]}`
- Needs MULTIPLE days from `window.deskflowAPI!.getGoalsBatch()`

### SEMI-BROKEN — DailyDigestBoard:
- `loadDigest` calls `window.deskflowAPI!.getTopicDigest()` — correct
- But `onGenerate` prop is never passed from AiPage (DailyDigestBoard.tsx:99 calls `onGenerate` but AiPage doesn't pass it)

---

## 4. IPC Endpoints Used by AiPage

| IPC Channel | What it does | Status |
|-------------|-------------|--------|
| `window.deskflowAPI!.getGoals(date)` | Load goals for a date | ✅ Real |
| `window.deskflowAPI!.saveGoal(date, goal)` | Save a goal | ✅ Real |
| `window.deskflowAPI!.saveGoalReview(date, msg)` | Save evening review | ✅ Real |
| `window.deskflowAPI!.getGoalContext()` | Get context for suggestions | ✅ Real |
| `window.deskflowAPI!.suggestGoals(date, ctx)` | AI-suggest goals | ✅ Real |
| `window.deskflowAPI!.readPlanningMd()` | Read PLANNING.md | ✅ Real |
| `window.deskflowAPI!.writePlanningMd({ content })` | Write PLANNING.md | ✅ Real |
| `window.deskflowAPI!.getLongtermGoals()` | Load long-term goals | ✅ Real |
| `window.deskflowAPI!.getTopicDigest(force?)` | Get daily digest | ✅ Real |
| `window.deskflowAPI!.isDigestGenerating()` | Check if digest is generating | ✅ Real |
| `window.deskflowAPI!.onDigestGenerationComplete(cb)` | Event: digest done | ✅ Real |
| `window.deskflowAPI!.getAiProviders()` | Get AI provider config | ✅ Real |
| `window.deskflowAPI!.saveAiProviders(state)` | Save AI provider config | ✅ Real |
| `window.deskflowAPI!.getGoalsBatch(start, end)` | Get goals for date range | ✅ Real |

**There is NO IPC for:**
- AI chat send/receive → **must be added** (or use existing AI provider)
- Digest generate trigger → `onGenerate` is missing from AiPage

---

## 5. Types & Interfaces

```tsx
// src/components/ai/types.ts
export type DataState = 'loading' | 'empty' | 'ready' | 'error';
export type Mode = 'morning' | 'in-progress' | 'review';

export interface Goal {
  id: string;
  title: string;
  status: 'active' | 'done' | 'missed';
  category: string;
  period: string;
  date: string;
  target: { type: 'completion' | 'duration'; seconds?: number };
  targetSeconds?: number;
  source: 'user' | 'ai' | 'planning';
  links: string[];
  createdAt: string;
  completedAt?: string;
}

export interface LongTermGoal {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: 'active' | 'done' | 'missed';
  priority: number;
}

export interface GoalDay {
  date: string;
  goals: Goal[];
  reviewSummary?: string;
}

export interface TopicDigestItem {
  topic: string;
  summary: string;
  sources?: Array<{ url: string; title: string }>;
}

// Chat types in ChatPanel.tsx
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  streaming?: boolean;
  thinking?: boolean;
  input?: string;
  onInputChange?: (v: string) => void;
  onSend: (text: string) => void;
  onStop?: () => void;
  suggestions?: ChatSuggestion[];
  provider?: string;
  online?: boolean;
  listening?: boolean;
  onToggleVoice?: () => void;
  voiceSupported?: boolean;
}
```

---

## 6. Design Tokens (from Frontend Design skill)

```
Colors:
  Background: zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
  Accent:    pink-500 (brand), pink-400 (hover), pink-600 (active)
  Secondary: cyan-400 (info), emerald-400 (success), amber-400 (warning)
  Text:      zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
  Border:    zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)

Spacing:
  p-5 = 20px (ALL card padding)
  rounded-xl = 12px (max border radius)
  gap-3 = 12px (section gaps), gap-6 = 24px (major divisions)
  gap-1.5 = 6px (inline element gaps)

Typography:
  Page title: 18px/600
  Section h2: 15px/600
  Card title: 13px/600
  Body: 13px/400
  Meta: 12px/400
  Badge: 11px/500

Glass cards:
  Default: bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5
  Elevated: bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5

Animation tokens from MOTION (src/components/ai/tokens.ts):
  fast: 150ms, normal: 250ms, slow: 400ms
  ease: cubic-bezier(0.16, 1, 0.3, 1)
  stagger: 0.05

Per-page accent: For /ai page → pink-500 (brand default)
```

---

## 7. File Inventory (all files that need changes)

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/AiPage.tsx` | 517 | MAIN page component — ALL state, ALL IPC calls |
| `src/components/ai/chat/ChatPanel.tsx` | 115 | Chat surface (presentational) |
| `src/components/ai/chat/ChatInput.tsx` | 149 | Textarea + send/stop/voice buttons |
| `src/components/ai/chat/ChatEmptyState.tsx` | — | Empty state with suggestion chips |
| `src/components/ai/chat/MessageBubble.tsx` | — | Message display |
| `src/components/ai/chat/ThinkingIndicator.tsx` | — | "Thinking..." animation |
| `src/components/ai/chat/AgentProgressBar.tsx` | — | Agent step progress |
| `src/components/ai/chat/CharCountRing.tsx` | — | Character count SVG ring |
| `src/components/ai/chat/TypewriterText.tsx` | — | Typewriter animation for streaming |
| `src/components/ai/focus/FocusBoard.tsx` | 271 | Focus section with goals/suggestions/review |
| `src/components/ai/focus/GoalRow.tsx` | — | Single goal row |
| `src/components/ai/plan/PlanBoard.tsx` | 196 | Plan section with goals/notes |
| `src/components/ai/plan/BulkImportDialog.tsx` | — | Bulk goal import dialog |
| `src/components/ai/reflect/ReflectFeed.tsx` | 143 | History timeline |
| `src/components/ai/digest/DailyDigestBoard.tsx` | 179 | Daily digest hero |
| `src/components/ai/summary/SummaryGrid.tsx` | 99 | 4 metric cards |
| `src/components/ai/connectors/ConnectorsPanel.tsx` | — | External connectors |
| `src/components/SummaryGrid.tsx` | 124 | **DEAD CODE — DELETE** (old self-loading version) |
| `src/components/ai/index.ts` | 45 | Barrel exports |
| `src/components/ai/GlassCard.tsx` | — | Glass card component |
| `src/components/ai/SectionHead.tsx` | — | Section header with icon |
| `src/components/ai/StateShell.tsx` | — | Loading/empty/error state wrapper |
| `src/components/ai/MetricCard.tsx` | — | KPI metric card |
| `src/components/ai/IconButton.tsx` | — | Icon button |
| `src/components/ai/StatusDot.tsx` | — | Status indicator dot |
| `src/components/ai/tokens.ts` | — | Design tokens (ACCENT, TEXT, MOTION) |
| `src/components/ai/types.ts` | — | TypeScript types |

---

## 8. Current Issues Summary

1. **ChatInput**: value prop is empty string, never populated. onInputChange never passed. onSend is a console.log stub.
2. **ChatPanel**: No suggestions passed. No online status. No provider info from AiPage.
3. **FocusBoard**: ReviewPanel has internal state but doesn't sync from props properly. Loading states flicker.
4. **PlanBoard**: saveGoals is stub. analyzeDump is stub. BulkImportDialog useless.
5. **ReflectFeed**: Only gets 1 day. Needs getGoalsBatch() for history.
6. **DailyDigestBoard**: onGenerate prop NOT passed. Generate button does nothing.
7. **SummaryGrid**: Two copies exist. Old one at src/components/SummaryGrid.tsx is dead code.
8. **Design**: No proper animations on state transitions. Cards don't use DeskFlow glass tokens consistently. Mobile collapsible is janky. No empty/loading/error states for chat. Missing micro-interactions on all buttons.
9. **No AI chat backend**: No IPC channel exists for sending chat messages and getting AI responses.
