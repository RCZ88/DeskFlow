# RESULT — AiPage Full Redesign

> Single authoritative design spec for the DeskFlow AI Assistant page (`/ai`). Written to be implemented by an engineer who has only the `CONTEXT_BUNDLE.md` and this file. No "Option A/B/C" — every line is a concrete component spec, a pixel value, an animation token, or a data path.

---

## 0. Build Parameters (read first)

**Liveliness Level: L2 — Responsive.** An AI assistant / developer-tool surface needs to feel alive and reactive (the app is "listening" and "thinking") without performing. L2 = micro-interactions + smooth state transitions + **exactly one** restrained ambient accent (a breathing status dot on the chat header). No scroll choreography, no parallax, no particle fields, no spring physics.

**Taste knobs (locked):** `DESIGN_VARIANCE = 5` (balanced — professional dev tool with personality), `MOTION_INTENSITY = 6` (moderate, ~L2), `VISUAL_DENSITY = 7` (dense — data-rich dashboard).

**Scope:** Whole surface — the entire `AiPage` route plus its four core areas (Chat, Connectors, Voice, Summary cards). The remaining AiPage sections (Focus / Plan / Reflect) are out of scope for redesign but must keep their existing rhythm; new sections must visually match them.

**Industry style (UI-UX-ProMax):** Dark Glass / dev-tool. Zinc base, single pink accent for AI/chat, monospace for numbers and code. High info density, command-palette affordances, fast (150ms) feedback, no bounce.

**Non-negotiable invariants honored throughout:** Tailwind v4 only · `p-5` max card padding · `rounded-xl` (12px) max · **no box-shadow** (depth via border brightness + glass layers) · animate **transform + opacity only** · easing `cubic-bezier(0.16,1,0.3,1)` · durations 150/250/400ms · no spring · every `localStorage` access in try/catch · CRLF preserved · renderer-first, no new IPC channels unless explicitly specified · React + framer-motion + lucide-react only (shadcn via `npx shadcn@latest add`).

---

## Design System Foundation (shared by every section)

### Token reference (consolidated)

```ts
// src/components/ai/tokens.ts  (NEW — single source of truth, no magic strings)
export const SURFACE = {
  base:     'bg-zinc-950',                 // #09090b page
  card:     'bg-zinc-900/40',              // glass card fill
  cardHi:   'bg-zinc-900/60',              // elevated / hover fill
  inset:    'bg-zinc-950/60',              // wells, code, item rows
} as const

export const RING = {
  base:   'ring-1 ring-zinc-800/60',       // resting border
  hover:  'ring-zinc-700',                 // hover border brighten (NO shadow)
  active: 'ring-zinc-600',
  focus:  'focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none',
} as const

export const TEXT = {
  primary:   'text-zinc-100',
  secondary: 'text-zinc-400',
  muted:     'text-zinc-500',
  disabled:  'text-zinc-600',
} as const

// Accent system — pink owns AI/chat. Reuse page accents; never introduce a new hue.
export const ACCENT = {
  pink:    { dot:'bg-pink-400',    bar:'bg-pink-500',    pill:'bg-pink-500/10 text-pink-300 ring-pink-500/20',    hex:'#f472b6' },
  emerald: { dot:'bg-emerald-400', bar:'bg-emerald-500', pill:'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20', hex:'#10b981' },
  amber:   { dot:'bg-amber-400',   bar:'bg-amber-500',   pill:'bg-amber-500/10 text-amber-300 ring-amber-500/20',   hex:'#f59e0b' },
  violet:  { dot:'bg-violet-400',  bar:'bg-violet-500',  pill:'bg-violet-500/10 text-violet-300 ring-violet-500/20', hex:'#a78bfa' },
  red:     { dot:'bg-red-400',     bar:'bg-red-500',     pill:'bg-red-500/10 text-red-300 ring-red-500/20',       hex:'#f87171' },
} as const

export const MOTION = {
  fast: 0.15, normal: 0.25, slow: 0.40,    // seconds
  ease: [0.16, 1, 0.3, 1] as const,        // standard ease-out
  easeInOut: [0.4, 0, 0.2, 1] as const,    // symmetric crossfades
  stagger: 0.05,                           // children entrance
} as const
```

### Reduced-motion guard (global, ship once)

```css
/* index.css — appended after @import "tailwindcss"; */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Every component additionally reads `const reduce = useReducedMotion()` and collapses entrance/ambient variants to instant opacity (no transform, no count-up, no looping) when `reduce === true`.

### Shared primitives (build these first — everything depends on them)

| Primitive | File | Purpose |
|---|---|---|
| `GlassCard` | `src/components/ai/GlassCard.tsx` | `rounded-xl p-5 bg-zinc-900/40 ring-1 ring-zinc-800/60`; optional `accent` left bar; `as={motion.div}` hover lift. |
| `SectionHead` | `src/components/ai/SectionHead.tsx` | Extract the existing inline `sectionHead` helper into a real component (accent bar + title + desc + right slot). |
| `StatusDot` | `src/components/ai/StatusDot.tsx` | Colored dot with optional `breathe` ambient pulse (the **one** L2 ambient accent). |
| `Skeleton` | shadcn `skeleton` | Shimmer placeholder; shape-matched per component. |
| `StateShell` | `src/components/ai/StateShell.tsx` | Renders `loading \| empty \| error \| ready` — the human-centric 4-state contract (see §6). |
| `IconButton` | `src/components/ai/IconButton.tsx` | 32×32 (visual) / ≥44px (hit-area) icon button with tooltip, hover/active/disabled, focus ring. |

---

## 1. Page Layout & Visual Hierarchy

### 1.1 Primary goal of the surface
> "Talk to my assistant about my day, and see/curate the live context (metrics + connectors) that feeds it." Chat is the focal point; Summary + Connectors are the **context rail** that proves the assistant is grounded in real data.

### 1.2 Structure & re-ordering

Current order buries Summary/Connectors below a 520px chat. New order puts **context above the fold on desktop, chat dominant**, using a two-column shell at `xl`:

```
AiPage
├─ PageHeader            (sticky, h-14)  — title, day label, mode pill, Settings/Features
├─ <main> grid
│   ├─ Left rail (xl: col-span-4, lg: full)
│   │   ├─ SummaryGrid           (4 cards: 4→2→1)
│   │   └─ ConnectorsPanel
│   └─ Right / primary (xl: col-span-8, lg: full)
│       └─ ChatSection           (dominant, min-h-[560px])
└─ Lower sections (unchanged): Focus · Plan · Reflect
```

**Responsive breakpoints** (mobile-first, matches Impeccable scale):

| Width | Layout |
|---|---|
| `< 640` (base) | Single column. Summary cards 1-col. Sections become an **accordion** (collapsible `SectionHead`, chat expanded by default). |
| `sm 640` | Summary cards 2-col. |
| `lg 1024` | Single column, full-width sections stacked; Summary 4-col. Chat fixed `560px`. |
| `xl 1280` | Two-column shell: context rail `col-span-4` + chat `col-span-8`, chat `sticky top-16` so it stays visible while the rail scrolls. |

Grid: `grid grid-cols-1 xl:grid-cols-12 gap-6`. Section vertical rhythm: `space-y-8` between major sections, `gap-4` between cards inside a section (8px-grid compliant: 32px / 16px).

### 1.3 Sticky page header

```tsx
<header className="sticky top-0 z-20 -mx-6 px-6 h-14 flex items-center gap-3
  bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
  <Sparkles className="h-4 w-4 text-pink-400" />
  <div>
    <h1 className="text-sm font-semibold text-zinc-100 leading-none">AI Assistant</h1>
    <p className="text-[11px] text-zinc-500 mt-1">{dayLabel}</p>
  </div>
  <span className="ml-3 rounded-md px-2 py-0.5 text-[11px] font-medium
    bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20">{modeLabel}</span>
  <div className="ml-auto flex items-center gap-2">
    <IconButton icon={Settings}  label="AI settings"  onClick={openSettings} />
    <IconButton icon={BookOpen}  label="Features"     onClick={openFeatures} />
  </div>
</header>
```

- `z-20` = dropdown/tooltip tier per Impeccable z-scale (10 cards / 20 dropdowns / 30 modals / 40 toasts / 50 overlays).
- Section headers inside scroll do **not** stick (only one sticky layer to avoid stacked chrome — Motion anti-pattern: stacked sticky scenes).

### 1.4 Mount choreography (L2)

Sections fade+rise in a single short stagger; **total entrance budget < 400ms**, never blocking input.

```tsx
const container = { hidden:{}, show:{ transition:{ staggerChildren: MOTION.stagger } } }
const block     = { hidden:{ opacity:0, y:8 }, show:{ opacity:1, y:0,
  transition:{ duration: MOTION.normal, ease: MOTION.ease } } }
// <motion.div variants={container} initial="hidden" animate="show">  wrapping each section as variants={block}
```

Reduced-motion: `y` drops to 0, opacity-only, stagger 0.

---

## 2. Chat Interface

### 2.1 Component tree

```
ChatSection
└─ GlassCard accent="pink"  (the chat shell, replaces h-[520px] wireframe)
   ├─ ChatHeader
   │   ├─ StatusDot (breathe when ready)   + state label
   │   ├─ ProviderBadge
   │   └─ actions: IconButton(reset) · IconButton(configure)
   ├─ MessageList            (flex-1, scroll-area, ref for auto-scroll)
   │   ├─ ChatEmptyState     (greeting + suggestion chips)   ← when messages.length===0
   │   ├─ MessageBubble[]    (user | assistant)
   │   │    └─ BlockRenderer (text/code/chart/table)  + TypewriterText (latest assistant only)
   │   ├─ ThinkingIndicator  + AgentProgressBar          ← when isThinking
   │   └─ ChatErrorRow       (inline retry)              ← when error
   └─ ChatInput
        ├─ textarea (auto-resize)
        ├─ CharCountRing
        ├─ VoiceInputButton
        └─ SendButton
```

### 2.2 Chat shell

```tsx
<GlassCard accent="pink" className="flex flex-col h-[560px] xl:h-[calc(100vh-7rem)] xl:sticky xl:top-16 p-0 overflow-hidden">
```
- `p-0` on the shell (header/list/input own their padding) — keeps the `p-5` rule at the child level.
- Fill: `bg-zinc-900/40`, border `ring-1 ring-zinc-800/60`. On the shell only, the left accent bar is a 2px pink inset, not a full border.
- Internal dividers: `border-zinc-800/60` between header/list and list/input.

### 2.3 ChatHeader

```tsx
interface ChatHeaderProps {
  status: 'ready' | 'thinking' | 'error'
  provider: { label: string; model: string; accent: keyof typeof ACCENT } // e.g. violet
  onReset: () => void
  onConfigure: () => void
  messageCount: number
}
```

Layout: `h-12 px-4 flex items-center gap-2 border-b border-zinc-800/60`.

- **Status indicator:** `StatusDot` + label.
  - `ready` → emerald dot **breathing** (the single L2 ambient accent), label "Ready".
  - `thinking` → amber dot, label "Thinking…", dot does a 1.2s opacity pulse.
  - `error` → red dot (static, no pulse — never animate error state per Motion anti-patterns), label "Connection issue".
- **ProviderBadge:** `rounded-md px-2 py-0.5 text-[11px] bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20` showing `{label} · {model}`; truncates with `max-w-[160px] truncate`. Tooltip shows full model id.
- **Actions (right):** `RotateCcw` (reset) + `Settings` (configure) as `IconButton`s. Reset is destructive → confirmation (see flow §U1).

```css
@keyframes breathe { 0%,100%{ opacity:.45; transform:scale(1) } 50%{ opacity:.9; transform:scale(1.18) } }
.dot-breathe { animation: breathe 2.4s ease-in-out infinite; }
```

### 2.4 MessageBubble

```tsx
interface MessageBubbleProps {
  message: ChatMessage            // { id, role, content, parsed, timestamp }
  isLatestAssistant: boolean      // gates typewriter
  onCopy: (text: string) => void
  onRetry?: () => void            // assistant error rows only
}
```

Row: `group flex gap-3 px-4 py-3` — `flex-row-reverse` for user.

- **Avatar** (24×24, `rounded-lg`, shrink-0):
  - User → `bg-pink-500/15 ring-1 ring-pink-500/30` with initials or `User` icon, pink-300.
  - Assistant → `bg-zinc-800 ring-1 ring-zinc-700` with `Bot` icon (lucide), zinc-300.
- **Bubble:**
  - User: `bg-pink-500/12 ring-1 ring-pink-500/20 text-zinc-100`, right-aligned, `rounded-xl rounded-tr-sm`, `max-w-[80%]`.
  - Assistant: `bg-zinc-900/60 ring-1 ring-zinc-800/60 text-zinc-200`, left-aligned, `rounded-xl rounded-tl-sm`, `max-w-[85%]`.
  - Padding `px-3.5 py-2.5`; body text 14px / line-height 1.5; code inside uses JetBrains Mono 13px / 1.6.
- **Timestamp:** `text-[10px] text-zinc-600 mt-1` under bubble, formatted `HH:mm` (locale via `Intl`). Hidden until row `:hover` on desktop (`opacity-0 group-hover:opacity-100 transition-opacity duration-150`); always visible on touch.
- **Copy button:** `IconButton(Copy, 'Copy message')` pinned top-corner of bubble, `opacity-0 group-hover:opacity-100`. On click → copies `message.content`, swaps to `Check` icon emerald for 1.2s, then back. Toast-free (inline feedback).
- **Enter/exit animation** (note spaced braces to keep JSX valid):
```tsx
<motion.div layout
  initial={ { opacity:0, y:8, scale:0.98 } }
  animate={ { opacity:1, y:0, scale:1 } }
  exit={ { opacity:0, y:-4 } }
  transition={ { duration: MOTION.normal, ease: MOTION.ease } } />
```
Wrap the list in `<AnimatePresence>` for exit-on-reset. Scale range stays 0.98–1.0 (Motion: big slides feel cheap).

### 2.5 TypewriterText (streaming reveal)

Replace the abrupt character loop. Two modes, gated by whether the agent is streaming:

- **Streaming mode (preferred):** as `aiAgentService` progress callback delivers `streamedContent`, render the already-received substring directly and only animate a **blinking caret** at the tail. No artificial per-char timer — the network *is* the pacing. This satisfies "smooth content reveal, not abrupt replacement."
- **Replay mode (loaded-from-history):** no typewriter — historical messages render instantly (never re-type old content; Motion: don't animate what didn't just change).

```tsx
interface TypewriterTextProps { text: string; streaming: boolean; reduce: boolean }
// caret element:
<span className="inline-block w-[2px] h-[1em] -mb-[2px] bg-pink-400 ml-0.5 align-baseline animate-caret" />
```
```css
@keyframes caret { 0%,49%{opacity:1} 50%,100%{opacity:0} }   /* 1s step blink */
.animate-caret { animation: caret 1s steps(1) infinite; }
```
Reduced-motion: caret is static (solid), text appears in chunks as received.

### 2.6 AgentProgressBar (round / tool progress)

Replaces the raw progress text. A sleek, single-line track that communicates *round N of M* + current tool.

```tsx
interface AgentProgressBarProps {
  round: number; totalRounds: number
  toolName?: string; status: 'thinking'|'executing'|'completed'|'error'; message?: string
}
```
Visual (lives just above ChatInput while `isThinking`):
```tsx
<div className="px-4 py-2 border-t border-zinc-800/60 bg-zinc-950/40">
  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
    <Loader2 className="h-3 w-3 text-pink-400 animate-spin" />        {/* linear spin only */}
    <span className="font-medium text-zinc-300">{toolLabel(toolName) ?? 'Reasoning'}</span>
    <span className="text-zinc-600">·</span>
    <span>round {round}/{totalRounds}</span>
    <span className="ml-auto tabular-nums text-zinc-500">{Math.round(round/totalRounds*100)}%</span>
  </div>
  {/* track */}
  <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
    <motion.div className="h-full rounded-full bg-pink-500"
      style={ { transformOrigin: 'left' } }
      animate={ { scaleX: round / totalRounds } }
      transition={ { duration: MOTION.normal, ease: MOTION.ease } } />
  </div>
</div>
```
- **Animates `scaleX` (transform), not width** — compliant. `toolLabel()` maps raw tool ids → human copy ("Searching your day", "Reading goals") — never show raw `tool_name` enums (Human-Centric clarity rule).
- `status==='error'` → bar turns red, spinner swaps to `AlertCircle`, message shown in plain language.

### 2.7 ThinkingIndicator

Three dots, staggered opacity (not bouncing — calm, dev-tool). `40ms`-offset opacity pulse, 1.2s loop, pink-400 at 40–90% opacity. Appears as a left-aligned assistant row with the Bot avatar so the layout doesn't jump when the real bubble replaces it (shared `layout` prop for FLIP).

### 2.8 ChatInput

```tsx
interface ChatInputProps {
  onSend: (text: string) => void
  disabled: boolean
  maxLength: number               // from chatSafety.ts
  placeholder?: string            // default below
}
```
Container: `border-t border-zinc-800/60 p-3 flex items-end gap-2 bg-zinc-950/40`.

- **Textarea:** auto-resize 1→5 rows (`field-sizing: content` fallback to scrollHeight measure), `bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none flex-1`. Placeholder: `"Ask about your day, manage goals, or check your inbox…"`. Enter = send, Shift+Enter = newline, ⌘/Ctrl+Enter = force send. `sanitizeInput()` + `MAX_INPUT_LENGTH` retained.
- **CharCountRing:** SVG ring, 20px, appears only when `len > maxLength*0.8`. Tracks `stroke-dashoffset`; turns amber at 90%, red at 100% (input blocked at max). Pairs with a tiny `tabular-nums` count on hover (color ≠ only signal).
- **VoiceInputButton:** see §4.
- **SendButton:** 32px square `rounded-lg`, `bg-pink-500 text-zinc-950 hover:bg-pink-400 disabled:bg-zinc-800 disabled:text-zinc-600`, `Send` icon. `whileTap={ { scale:0.95 } }`. On send: morphs icon to `Check` (emerald) for 600ms (existing just-sent animation, kept). Disabled when empty or `disabled`.
- **Keyboard shortcut hint:** `text-[10px] text-zinc-600` right of input: "⏎ send · ⇧⏎ newline" — fades out on focus to reduce clutter.

### 2.9 ChatEmptyState

Not bare text — greeting + suggestion chips that seed real flows.

```tsx
<div className="flex-1 flex flex-col items-center justify-center text-center px-6">
  <div className="h-12 w-12 rounded-xl bg-pink-500/10 ring-1 ring-pink-500/20 grid place-items-center">
    <Sparkles className="h-6 w-6 text-pink-400" />
  </div>
  <h3 className="mt-4 text-sm font-semibold text-zinc-100">Good {timeOfDay}, ready when you are</h3>
  <p className="mt-1 text-xs text-zinc-500 max-w-[280px]">Ask about your tracked time, goals, projects, or connected inbox & calendar.</p>
  <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-[420px]">
    {SUGGESTIONS.map(s => <SuggestionChip key={s.id} {...s} onPick={prefill} />)}
  </div>
</div>
```
- `SUGGESTIONS` (context-aware — only show inbox/calendar chips when a connector of that type exists):
  - "Summarize my day" · "What should I focus on?" · "What's in my inbox today?" (email connector) · "What meetings do I have?" (calendar connector) · "Review my goals".
- Chip: `rounded-lg px-3 py-1.5 text-xs bg-zinc-900/60 ring-1 ring-zinc-800/60 text-zinc-300 hover:ring-pink-500/40 hover:text-zinc-100 hover:-translate-y-0.5 transition`. Entrance: list stagger (`0.05`).
- Click → fills textarea (does not auto-send �� user keeps control / forgiveness).

### 2.10 Chat states (4-state contract)

| State | Trigger | Render |
|---|---|---|
| **loading** | first mount, thread reading from localStorage | MessageList shows 3 alternating bubble skeletons (avatar circle + 2 lines), header status dot zinc, input disabled. |
| **empty** | `messages.length === 0` after load | `ChatEmptyState`. |
| **error** | `processMessage` throws / provider unreachable | Inline `ChatErrorRow` after last message: `AlertCircle` red, plain-language cause + **Retry** button re-sending last user message. Input stays enabled (forgiveness). Header dot red. |
| **populated** | ≥1 message | Normal list; auto-scroll on new content unless user scrolled up (see §U1). |

### 2.11 Animation summary (chat)

| Element | Property | Duration / easing |
|---|---|---|
| Bubble enter | opacity + y(8→0) + scale(0.98→1) | 250ms ease |
| Bubble exit (reset) | opacity + y(0→-4) | 150ms ease |
| Copy confirm | icon crossfade | 150ms |
| Progress track | scaleX | 250ms ease |
| Caret blink | opacity | 1s steps(1) loop |
| Thinking dots | opacity (40ms stagger) | 1.2s loop |
| Send tap | scale 0.95 | 150ms |
| Suggestion chips | stagger entrance + hover y(-2) | 250ms / 150ms |

---

---

## 3. Connectors Panel

### 3.1 Component tree

```
ConnectorsPanel
├─ SectionHead accent="violet" title="Connectors"
│    └─ right: CountBadge + AddConnectorButton (shadcn button, size sm)
├─ StateShell
│    ├─ loading  → ConnectorCardSkeleton ×2
│    ├─ empty    → ConnectorsEmptyState
│    ├─ error    → PanelErrorState (list-level fetch failure)
│    └─ ready    → <motion.ul stagger>  ConnectorCard[]
└─ (modal) ConnectorSetupModal (portal, controlled by AiPage)

ConnectorCard
├─ row: TypeIcon + name/provider + StatusDot + actions(sync/test/remove)
├─ meta row: "Synced 4m ago" · itemCount · inline error (if status==='error')
└─ ConnectorItemList (collapsible)  — expand chevron toggles
     ├─ ItemFilterBar (All / Email / Event + search)
     ├─ ConnectorItemRow[]
     └─ LoadMoreButton
```

### 3.2 Props interfaces

```ts
interface ConnectorsPanelProps { onSetup: () => void }

interface ConnectorCardProps {
  connector: ConnectorConfig
  onSync: (id: string) => Promise<void>
  onTest: (id: string) => Promise<void>
  onRemove: (id: string) => void
  expanded: boolean
  onToggleExpand: (id: string) => void
}

interface ConnectorItemListProps {
  connectorId: string
  type: 'email' | 'calendar'
}

// connectors.items(id, opts?) — opts EXTENDED (renderer passes; see §3.8 for IPC note)
interface ConnectorItemsOpts {
  limit?: number; offset?: number               // pagination (load more)
  itemType?: 'email' | 'event' | 'reminder'     // type filter
  search?: string                               // subject/summary LIKE
  unreadOnly?: boolean
}
```

### 3.3 ConnectorCard — pixel spec

Container: `GlassCard` variant, `p-4` (tighter than p-5 — list density), `rounded-xl bg-zinc-900/40 ring-1 ring-zinc-800/60 hover:ring-zinc-700 transition`. Left accent inset 2px keyed to type: email = violet, calendar = pink.

Header row (`flex items-center gap-3`):
- **TypeIcon** 32×32 `rounded-lg grid place-items-center`: email → `Mail` on `bg-violet-500/12 ring-1 ring-violet-500/25 text-violet-300`; calendar → `CalendarDays` on `bg-pink-500/12 ring-1 ring-pink-500/25 text-pink-300`.
- **Name block:** `display_name` 13px `font-medium text-zinc-100` truncate; provider label `text-[11px] text-zinc-500` ("IMAP" / "CalDAV").
- **StatusDot** + label: `connected`=emerald "Connected", `disconnected`=zinc "Idle", `error`=red "Error". Dot only breathes (ambient) when actively syncing.
- **Actions** (`ml-auto`, `opacity-70 group-hover:opacity-100`): `IconButton`s — Sync (`RefreshCw`), Test (`Play`), Remove (`Trash2`, hover turns red-400), and Expand (`ChevronDown` rotating 180° when open). All ≥44px hit area, tooltips, focus rings.

Meta row (`mt-2 flex items-center gap-2 text-[11px] text-zinc-500`): `last_sync` rendered via `timeAgo()` ("Synced 4m ago"), `·`, item count ("20 items"). If `status==='error'`: replace with red plain-language message `error_message` + inline **Retry** text-button (re-runs test then sync).

### 3.4 Sync progress (in-card)

While a sync runs for that connector: Sync icon swaps to `Loader2 animate-spin` (linear), status label → "Syncing…" amber, StatusDot breathes amber, and a 1px indeterminate bar slides under the header (CSS `@keyframes indet { from{transform:translateX(-100%)} to{transform:translateX(100%)} }`, `transform` only). On finish: bar fades, dot returns to emerald, meta shows fresh time, and the `+N new items` count chip pops in (`scale 0.9→1`, 150ms) then settles. A `+N new items` toast (shadcn `sonner` if present, else inline aria-live region) confirms at page level.

### 3.5 ConnectorItemList (inline expandable)

Collapsible region (animate via framer `layout` height auto, **not** raw height — use `<motion.div layout>` wrapping content + `AnimatePresence`). When closed, height 0 + opacity 0.

- **ItemFilterBar:** segmented `All / Email / Event` (shadcn `tabs`, only show types present) + a compact search input (`Search` icon, debounced 250ms → re-query with `search` opt). Right: `unreadOnly` toggle.
- **ConnectorItemRow** (`flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-800/40`):
  - Unread indicator: 6px pink dot when `!read` (column reserved so read rows align). `read` rows dim `text-zinc-400`.
  - Type glyph: `Mail` / `CalendarDays` 14px `text-zinc-500`.
  - Subject/summary: 13px `text-zinc-200 truncate` (1 line) + `summary` preview `text-[11px] text-zinc-500 truncate` (1 line).
  - Date: `text-[10px] text-zinc-600 tabular-nums ml-auto shrink-0` via `timeAgo`/`HH:mm`.
  - Row entrance: list stagger 0.04, cap total < 0.4s; virtualize if > 50 rows.
- **LoadMoreButton:** appears when returned `items.length === limit`. Click → fetch next page (`offset += limit`), append; button shows inline spinner; "No more items" when exhausted.

### 3.6 States (4-state contract)

| State | Render |
|---|---|
| **loading** (panel) | 2 `ConnectorCardSkeleton`: icon square + 2 text lines + 3 action squares, shimmer. |
| **empty** (no connectors) | `ConnectorsEmptyState`: 48px `Mail`+`CalendarDays` overlapped glyph in `bg-violet-500/10` tile, heading "No connectors yet", body "Connect an inbox or calendar so your assistant can answer questions about your email and meetings.", primary **Add your first connector** button (pink). |
| **error** (panel fetch) | `AlertCircle` + "Couldn't load connectors" + **Retry**. |
| **populated** | card list. |
| **item-list empty** | inside expanded card: "No items synced yet — run a sync to pull recent {emails\|events}." + small Sync button. |

### 3.7 Responsive

`grid grid-cols-1 gap-3` on mobile; at `md` and inside the xl rail it stays single-column (rail is narrow). On `lg` full-width (no xl shell) connectors render `grid-cols-2`. Item list always single column.

### 3.8 Data layer (engineering task #1) — fetch / cache / refresh

- **Source of truth:** `connector_items` SQLite table; `connectors.items(id, opts)` is the only read path.
- **Renderer cache:** a `useConnectorItems(connectorId, filters)` hook holds `{ items, offset, hasMore, loading, error }` in component state keyed by `connectorId+JSON(filters)`. Cache is per-open-session (Map in a module-scoped ref) so re-expanding a card is instant; invalidated on that connector's sync completion.
- **Pagination:** `offset/limit` (default limit 20). `loadMore` increments offset.
- **Filtering/search:** filter + search are passed to `items(id, opts)` so SQLite does the work (don't filter 20-at-a-time in JS once pagination exists). Search = `WHERE (subject LIKE ? OR summary LIKE ?)`.
- **Read/unread:** `connector_items.is_read` already exists. Marking read is a **future** optional channel `connectors:markRead(id, itemIds[])`; until it lands, render read state read-only from sync.
- **IPC note (constraint compliance):** `connectors:items` already accepts an `opts` arg in preload. The **renderer** can pass `{ limit, offset, itemType, search, unreadOnly }` today; the main-process handler must be extended to honor them. This is the *one* place a handler change is needed — specify it, don't invent a new channel. Read the full `connectors:items` handler before editing; keep CRLF.

### 3.9 Connector data → AI context (engineering task #5)

- Add a renderer helper `buildConnectorContext()` that, when the user message matches inbox/calendar intent (regex on "inbox|email|unread|meeting|calendar|schedule" OR triggered by the suggestion chips), calls `connectors.items(id, { itemType, limit:10 })` for the relevant connector(s) and serializes a compact digest:
```
[Inbox — last 10] • (unread) "Subject" — from, 9:14am …
[Calendar — today] • "Standup" 10:00–10:15 …
```
- This digest is injected into the agent call as an additional context block (same mechanism `aiAgentService` already uses for day context) — **not** a new IPC channel. Cap at ~10 items/connector to protect the token budget. If no matching connector exists, the assistant replies with a CTA to connect one (links to `onSetup`).

---

## 4. Voice Input

### 4.1 Goal & integration pattern (engineering task #3)

Make `VoiceInputButton` a **reusable, context-agnostic control** usable in any text field (chat input now; goal-review / note fields later). Achieve via a headless hook + a presentational button:

```ts
// src/hooks/useVoiceInput.ts  (NEW — headless, no UI)
interface UseVoiceInput {
  supported: boolean
  state: 'idle' | 'listening' | 'processing' | 'error'
  interim: string                     // live partial transcript
  error?: 'no-permission' | 'no-speech' | 'aborted' | 'unknown'
  start: () => void
  stop: () => void
  countdownMs: number                 // silence-timeout remaining (for ring)
}
function useVoiceInput(opts: { onTranscript: (text: string) => void; silenceMs?: number }): UseVoiceInput
```
- Wraps `webkitSpeechRecognition`; `supported=false` hides the button entirely (graceful, no dead control).
- 5s silence auto-stop (configurable `silenceMs`), exposes `countdownMs` for the countdown ring.
- **Reuse pattern:** any input wires `const v = useVoiceInput({ onTranscript: append })` and drops `<VoiceInputButton voice={v} />` beside the field. The button is pure presentation — no Speech API logic inside.

### 4.2 VoiceInputButton — visual states

Base: 32×32 `rounded-lg grid place-items-center` (≥44px hit area via padding), `Mic` icon. Sits inside ChatInput left of Send.

| State | Visual | Motion |
|---|---|---|
| **idle** | `text-zinc-400 bg-zinc-900/60 ring-1 ring-zinc-800/60 hover:text-pink-300 hover:ring-pink-500/30` | hover `y:-1`; subtle resting glow `ring-pink-500/0→/10` only on hover (no always-on ambient — stays within L2 single-accent budget already spent on chat dot). |
| **listening** | pink `Mic`, concentric **pulsing ring** behind button (`bg-pink-500/20`, `scale 1→1.6` + `opacity .6→0`, 1.6s linear loop) + a 3-bar mini **waveform** glyph animating height via `transform: scaleY` (NOT height). | ring pulse + waveform scaleY. |
| **processing** | `Loader2 animate-spin` pink (brief, between stop and transcript dispatch). | linear spin. |
| **error** | one-shot red flash: ring `ring-red-500/50` fades over 600ms, icon `MicOff` red, then returns to idle. | opacity flash only (never loop errors). |

```css
@keyframes vpulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
@keyframes wbar  { 0%,100%{transform:scaleY(.4)} 50%{transform:scaleY(1)} }
.v-ring{ animation:vpulse 1.6s linear infinite }
.v-bar { transform-origin:center; animation:wbar .9s ease-in-out infinite }
.v-bar:nth-child(2){ animation-delay:.15s } .v-bar:nth-child(3){ animation-delay:.3s }
```

### 4.3 Interim transcript + silence countdown

- **Interim transcript:** floating tooltip above the button, `absolute bottom-full mb-2`, `rounded-lg bg-zinc-900/95 ring-1 ring-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 max-w-[240px]`, shows `interim` live. Enters with `opacity + y(4→0)`, 150ms. Simultaneously, interim text is previewed **inline** in the textarea as dimmed `text-zinc-500` (committed text becomes `text-zinc-100` on final).
- **Silence countdown ring:** thin SVG ring around the mic, `stroke-dashoffset` driven by `countdownMs/silenceMs`, pink → amber in last 1.5s. Communicates "about to auto-stop."

### 4.4 Accessibility

- `aria-label` reflects state ("Start voice input" / "Listening, tap to stop"). `aria-pressed={state==='listening'}`. Interim region `aria-live="polite"`.
- Keyboard shortcut: `⌘/Ctrl + Shift + M` toggles voice while the input is focused; tooltip shows the shortcut.
- Focus ring `ring-2 ring-pink-500/60`. Never mouse-only.

---

## 5. Summary Cards (4-card grid)

### 5.1 Grid & shared card anatomy

Container: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` (4→2→1). In the xl rail the grid is `grid-cols-2` (narrow column).

Shared `MetricCard` shell (every card uses it):
```
GlassCard accent={color} p-5
├─ header: 24px icon tile + label (text-[11px] uppercase tracking-wide text-zinc-500) + RefreshButton (ml-auto, hover-only)
├─ metric: big number (28px font-semibold tabular-nums text-zinc-100) + unit/secondary
└─ footer: secondary label / mini-viz / trend
```
Hover (transform+opacity only): `whileHover={ { y:-2 } }` + ring brighten `hover:ring-zinc-700` + fill `hover:bg-zinc-900/60`. 150ms. **Never box-shadow.**

Left accent bar 2px keyed per card. Numbers use `number-ticker` (Magic UI) / `CountUp` (ReactBits) on first reveal and on refresh delta; reduced-motion → set final value instantly.

### 5.2 TodayOverviewCard — accent pink

```ts
interface TodayOverviewCardProps { totalSeconds:number; sessionCount:number; topApp?:string; loading:boolean; updatedAt:number; onRefresh:()=>void }
```
- Icon: `Clock` pink. Metric: `formatDuration(totalSeconds)` (e.g. "4h 12m") with the number-ticker animating minutes. Footer: `{sessionCount} sessions · {topApp ?? '—'}` with top app in a small pill.
- Data: `getDashboardAggregates({ period:'today' })`.

### 5.3 AiUsageCard — accent violet

```ts
interface AiUsageCardProps { totalTokens:number; totalCost:number; toolCount:number; topTool:string; trendPct?:number; loading:boolean; updatedAt:number; onRefresh:()=>void }
```
- Icon: `Zap` violet. Metric: token count (ticker, formatted `12.4k`) + cost `$0.0123` (`tabular-nums`, 4dp — financial discipline, never round currency). Trend chip: `▲ 12%` emerald / `▼` red vs prior day (color + arrow, never color alone).
- Footer: **mini bar chart** of tool usage — 5 bars max, `transform: scaleY` reveal staggered 0.05, heights normalized; `topTool` labeled. Bars pure CSS, pink/violet gradient within tokens.
- Data: `getAIUsageSummary('day')`.

### 5.4 ProjectStatusCard — accent emerald

```ts
interface ProjectStatusCardProps { projectCount:number; recentProjectName?:string; recentProjectLanguage?:string; loading:boolean; updatedAt:number; onRefresh:()=>void }
```
- Icon: `FolderGit2` emerald. Metric: `projectCount` (ticker) + "active". Footer: recent project name truncate + language badge (`rounded px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-300`, dot colored by language).
- Data: `getProjects()` (count + most-recent).

### 5.5 ContextSummaryCard — accent amber

```ts
interface ContextSummaryCardProps { unfinishedCount:number; completedThisWeek:number; weeklyTotal:number; loading:boolean; updatedAt:number; onRefresh:()=>void }
```
- Icon: `Target` amber. Metric: a **completion ring** (SVG donut) showing `completedThisWeek/weeklyTotal`, % in center (`tabular-nums`). Ring draws via `stroke-dashoffset` (transform-safe), 400ms ease, reduced-motion = instant. Footer: `{unfinishedCount} pending · {completedThisWeek} done this week`, pending in amber pill.
- Data: derived from `getGoals(today)` + `getGoalsBatch(weekStart,weekEnd)`.

### 5.6 Card states (4-state contract)

| State | Render |
|---|---|
| **loading** | `MetricCardSkeleton`: icon square + short label bar + big number bar + footer bar, shimmer. |
| **empty** | per-card friendly zero: e.g. ProjectStatus "No projects tracked yet" with muted icon; never a blank "0" without context. |
| **error** | compact inline: `AlertCircle` amber + "Couldn't load" + small **Retry** (re-runs that card's fetch only). |
| **populated** | full metric + viz. |

### 5.7 Refresh cycle (engineering task #4)

- **Periodic:** a single `useInterval(60_000)` at the SummaryGrid level re-fetches all four in parallel (one timer, not four) and diffs values; changed numbers re-run their ticker from old→new. Pauses when `document.hidden` (perf) and resumes on focus.
- **Manual:** each card's hover-revealed `RefreshButton` (`RefreshCw`) re-fetches just that card → brief skeleton swap (≤400ms) → new value fades in.
- **Stale indicator:** each card tracks `updatedAt`. If `now - updatedAt > 120s` (e.g. refresh failed or tab was hidden), show a small amber `Clock` + "Updated {timeAgo}" in the footer; on successful refresh it clears. Stale never blocks reading the last value.

---

## 6. Empty / Loading / Error State Patterns (reusable)

The human-centric contract: **every data-driven component renders one of four states; none may show a blank box or raw error.** Implement once as `StateShell` and reuse.

```tsx
type ViewState<T> = { status:'loading' } | { status:'empty' } | { status:'error'; message:string; retry:()=>void } | { status:'ready'; data:T }

function StateShell<T>({ state, skeleton, empty, children }:{
  state: ViewState<T>
  skeleton: React.ReactNode                 // shape-matched, NOT a spinner
  empty: React.ReactNode                     // icon + line + CTA
  children: (data:T)=>React.ReactNode
}): JSX.Element
```

**Shared visual grammar:**
- **Loading:** skeletons mirror the real layout (bubble shapes, card shapes, row shapes). `Skeleton` = `bg-zinc-800/60 rounded-md` + shimmer sweep (`transform: translateX` only). Never a bare spinner for content areas (spinners are reserved for button-local actions ≤ a few seconds).
- **Empty:** centered, icon tile (`bg-{accent}/10 ring-1 ring-{accent}/20`), one-line plain-language explanation of what *would* be here, one primary CTA. Copy in user language ("No connectors yet", not "connectors[] empty").
- **Error:** `AlertCircle` in accent-red, format `"[Thing] [verb] because [reason]. [Action]."`, a **Retry** button wired to the exact failed call. Never raw JSON/stack/enum. Preserve any user input (don't wipe the textarea).
- **Populated:** the rich view.

Transitions between states: 150ms crossfade (`AnimatePresence mode="wait"`, opacity only) so swaps never snap.

---

## 7. Integration & Data Flow

### 7.1 How the sections connect

```
AiPage (owns top-level state + modal)
 ├─ SummaryGrid    — reads aggregates/usage/projects/goals; 60s timer; feeds nothing back
 ├─ ConnectorsPanel— reads connectors + items; emits sync events
 │     └─ on sync complete → invalidate item cache + (optionally) toast
 ├─ ChatSection   — reads connector digest on demand (§3.9) + day context
 │     └─ buildConnectorContext() pulls from the SAME connectors.items path
 └─ VoiceInput    — useVoiceInput hook → onTranscript appends to whichever input mounts it
```

- **Connector → AI:** inbox/calendar intent in chat triggers `buildConnectorContext()` (§3.9). No new channel; reuses `connectors.items`.
- **Voice → any input:** `useVoiceInput` is mounted by the consuming field; transcript flows via `onTranscript`. Chat input is the first consumer; goal-review/note fields can adopt it with one line.
- **Summary → nothing:** read-only; isolated timer.

### 7.2 Concrete data paths (IPC → state → UI)

| Surface | IPC call(s) | State owner | Refresh |
|---|---|---|---|
| Chat send | `aiAgentService.processMessage` (+ progress callback) | AiChat | on send |
| Chat context | `connectors.items(id,{itemType,limit:10})` | buildConnectorContext (transient) | on matching message |
| Connectors list | `connectors.list()` | ConnectorsPanel | mount + after add/remove/sync |
| Connector items | `connectors.items(id,opts)` | useConnectorItems cache | on expand / filter / loadMore / post-sync |
| Sync/Test | `connectors.sync(id)` / `connectors.test(id)` | ConnectorCard | user action |
| TodayOverview | `getDashboardAggregates({period:'today'})` | SummaryGrid | mount + 60s + manual |
| AiUsage | `getAIUsageSummary('day')` | SummaryGrid | mount + 60s + manual |
| Projects | `getProjects()` | SummaryGrid | mount + 60s + manual |
| Context ring | `getGoals(today)` + `getGoalsBatch(...)` | SummaryGrid | mount + 60s + manual |
| Provider badge | `getAiProviders()` | AiPage | mount + after settings save |

---

## 8. State Management & Persistence

### 8.1 Chat persistence (engineering task #2)

Migrate from per-day key to **per-conversation threads**, all writes try/catch-wrapped.

```ts
// localStorage schema
'aichat:index'            → ThreadMeta[]   // [{ id, title, createdAt, updatedAt, messageCount }]
'aichat:thread:<id>'      → ChatMessage[]  // one key per conversation
'aichat:active'           → string         // active thread id
// MIGRATION: on first load, if legacy 'aichat:thread:<YYYY-MM-DD>' keys exist,
// wrap each into a thread { id:crypto.randomUUID(), title:<date>, ... } and reindex; delete legacy keys.
```
- **Thread per conversation:** "New chat" (the reset control, relabeled) creates a fresh thread; a thread switcher (dropdown in ChatHeader, optional v2) lists recent threads by `title` (first user message, truncated).
- **Auto-save on every message:** debounced 300ms write of the active thread + index `updatedAt`/`messageCount`. Wrapped:
```ts
function safeWrite(key:string, val:unknown){ try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* quota/private-mode: degrade to in-memory */ } }
```
- **Max thread limit / archive:** keep newest `MAX_THREADS = 30`; when exceeded, drop the oldest thread keys (by `updatedAt`). Title-only stubs are cheap; full messages of evicted threads are removed to respect quota.
- **Reset flow:** "Reset" → confirmation → clears the **active** thread's messages (keeps other threads), animates bubbles out via `AnimatePresence`, returns to ChatEmptyState.

### 8.2 Connector item caching

Module-scoped `Map<string, ViewState<ConnectorItem[]>>` keyed `connectorId|filterHash`; populated on expand, reused on re-expand, invalidated on that connector's sync-complete. Pagination appends into the cached array. All reads go through `connectors.items` (single source of truth).

### 8.3 Summary refresh state

SummaryGrid holds `{ today, usage, projects, context }` each as `ViewState<T>` + `updatedAt`. One 60s interval (cleared on unmount, paused on `visibilitychange`). Manual refresh sets just that slice to `loading` then `ready`.

### 8.4 Provider/config state

`getAiProviders()` on mount → `{ aiProviders, aiRouting }`; ChatHeader badge reads `routing.default`. After `saveAiProviders` (via modal) re-fetch. No localStorage (server-owned).

---

## 9. Implementation Order

Dependencies-first; each step independently verifiable in isolation.

1. **Tokens + primitives.** Add `tokens.ts`, reduced-motion CSS guard, extract `GlassCard`, `SectionHead`, `StatusDot`, `IconButton`, `StateShell`, `Skeleton`. *Verify:* render a kitchen-sink story page.
2. **shadcn install.** `npx shadcn@latest add button card badge input textarea tabs tooltip skeleton progress scroll-area dialog avatar separator dropdown-menu`. *Verify:* components import + theme to zinc/pink.
3. **Page shell & layout.** Sticky header, 12-col xl grid, mount stagger, mobile accordion. *Verify:* responsive at 390 / 768 / 1024 / 1440.
4. **Summary cards.** `MetricCard` shell + 4 cards + skeletons/empty/error + number-ticker + 60s refresh + stale indicator. *Verify:* unplug network → error/retry; hide tab → timer pauses.
5. **Connectors panel.** Cards, status, sync/test/remove flows, in-card sync progress, empty/loading/error. *Verify:* add→test→sync→remove full cycle with animations.
6. **Connector item browsing.** Extend `connectors:items` handler for `limit/offset/itemType/search/unreadOnly`; build `useConnectorItems`, filter bar, item rows, load-more. *Verify:* pagination + filter + search hit SQLite, not JS.
7. **Voice input refactor.** `useVoiceInput` headless hook + redesigned `VoiceInputButton` (all 4 states, interim tooltip, countdown ring, a11y, shortcut). *Verify:* mount in a second test input to prove reusability.
8. **Chat interface.** Shell, ChatHeader (breathing dot, provider badge, reset=New chat), MessageBubble (avatars, timestamps, copy), TypewriterText (streaming caret), AgentProgressBar (scaleX), ThinkingIndicator, ChatInput, ChatEmptyState + suggestion chips, 4 states. *Verify:* send→stream→error→retry; auto-scroll + scroll-pause.
9. **Chat persistence migration.** Per-thread schema, legacy migration, debounced auto-save, 30-thread cap, reset flow. *Verify:* reload restores; legacy keys migrate once; quota failure degrades gracefully.
10. **Connector → AI context.** `buildConnectorContext()` + intent detection + suggestion-chip wiring. *Verify:* "What's in my inbox today?" injects digest; no connector → CTA reply.
11. **Polish pass + self-audit.** Run the checklist in §10 across every component.

---

## 10. Pre-Return Self-Audit (must pass before shipping each component)

**Human-Centric / Impeccable / Pro-Max:**
- [ ] Empty + Loading + Error + Populated all implemented (no blank boxes, no raw JSON/enums/stack traces).
- [ ] Primary action obvious in < 1s; one focal point per surface (chat).
- [ ] Every interactive element has hover / focus / active / disabled; focus rings visible; keyboard nav works; hit areas ≥ 44px.
- [ ] Plain-language copy everywhere (`toolLabel()` maps tool enums; "workspace" not internals).
- [ ] Meaning never by color alone (status pairs dot+label; trend pairs arrow+color).
- [ ] Destructive (reset, remove) confirm; user input never wiped on error; submit gives immediate feedback.
- [ ] Contrast ≥ 4.5:1 body; tabular-nums for all numbers; currency shows full decimals.

**Motion (L2 budget) / constraints:**
- [ ] Built at L2; exactly one ambient accent (chat ready dot). No parallax/particles/scroll-jacking.
- [ ] transform + opacity only — no width/height/top/left/box-shadow geometry (progress = scaleX, waveform/bars = scaleY, rings = stroke-dashoffset).
- [ ] Durations 150/250/400ms; easing `cubic-bezier(0.16,1,0.3,1)`; no spring physics.
- [ ] Stagger 0.04–0.06, total entrance < 0.4s; long lists virtualized.
- [ ] `prefers-reduced-motion` global guard + per-component collapse; no looping motion behind body text; errors never animate/loop.
- [ ] `p-5` max padding; `rounded-xl` max radius; CRLF preserved; localStorage in try/catch; no new npm packages; only the one `connectors:items` handler extension touches main.

---

## Appendix A — MCP component mapping (frontend-external-infra)

Use real sourced components; re-skin to tokens and demote to L2 before shipping. Never invent from zero.

| Need | Source → component | Notes |
|---|---|---|
| Number metrics | Magic UI `number-ticker` / ReactBits `CountUp` | reduced-motion = instant set |
| Streaming text | Magic UI `typing-animation` (caret only here) | network paces, not a timer |
| Card hover spotlight | Magic UI `magic-card` / ReactBits `SpotlightCard` | opacity-only glow, keep subtle |
| Summary layout | Magic UI `bento-grid` / ReactBits `MagicBento` | demote motion to L2 |
| List entrances | Magic UI `animated-list` / ReactBits `AnimatedList` | stagger 0.05 |
| Skeletons | shadcn `skeleton` | shape-matched |
| Tabs/filter | shadcn `tabs` | item filter bar |
| Tooltips | shadcn `tooltip` | voice/icon buttons |
| Dialog | shadcn `dialog` | connector setup, confirms |
| Progress | shadcn `progress` (restyle scaleX) | agent progress base |
| Icons | Lucide | Bot, Mic/MicOff, Mail, CalendarDays, RefreshCw, Loader2, AlertCircle, Check, Copy, Trash2, Play, ChevronDown, Zap, Clock, Target, FolderGit2, Sparkles, Settings, RotateCcw, Send, Search |

*Explicitly NOT used (over budget for L2 dev tool):* `particles`, `meteors`, `border-beam` (ambient overload), Aurora/Beams/Waves backgrounds, `orbiting-circles`, BlobCursor/SplashCursor/PixelTrail. Listed so an implementer doesn't reach for them.

## Appendix B — Design decision log (per Impeccable `document`/`teach`)

- **Two-column xl shell** puts grounding context (metrics+connectors) beside the chat so the assistant visibly reflects real data — resolves "feels basic / disconnected."
- **Streaming caret over per-char timer** — perceived speed > technical animation; avoids the ">400ms feels broken" trap.
- **scaleX progress / scaleY bars / dasharray rings** — satisfies "sleek visual bar" + "mini chart" + "donut" while obeying transform-only.
- **Single ambient accent (chat dot)** — honors L2; everything else is reactive/transitional, avoiding AI-slop "everything moves."
- **Headless `useVoiceInput`** — makes voice reusable across inputs (engineering task #3) without duplicating Speech API logic.
- **Per-thread persistence + 30 cap + migration** — satisfies task #2 without unbounded quota growth.
- **One handler extension (`connectors:items`)** — honors "no new IPC channels unless necessary"; pagination/filter/search done in SQLite, not JS.
