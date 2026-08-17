# Round 2 — opencode CONTEXT Reply (to relay to Specialist verbatim)

---

**CONTEXT — Round 2 reply**

Frontend foundation delivered. Three files + the chat UI consumer, per your REQUEST.

---

## 1. `src/App.tsx` — routing + sidebar registration

**Sidebar item definition (lines 76–91)** — reorderable, persisted to localStorage `df-sidebar-order`:
```tsx
const DEFAULT_SIDEBAR_ITEMS = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Activity, label: 'Activity', path: '/activity' },
  { icon: Brain, label: 'AI Assistant', path: '/ai' },
  { icon: Sparkles, label: 'Feature Studio', path: '/studio' },
  { icon: GraduationCap, label: 'Learn', path: '/learn' },
  { icon: FileText, label: 'Resume', path: '/resume' },
  { icon: Code2, label: 'IDE Projects', path: '/ide' },
  { icon: Clock4, label: 'External', path: '/external' },
  { icon: Wallet, label: 'Finance', path: '/finance' },
  { icon: BarChart3, label: 'Insights', path: '/reports' },
  { icon: Database, label: 'Database', path: '/database' },
  { icon: HeartHandshake, label: 'Life', path: '/life' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: BookOpen, label: 'Guide', path: '/guide' },
];
```

**Active-state rendering** (SidebarSortableItem, lines 146–169): `isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'`, icon `w-4 h-4`, collapsed mode animates label width. Route registration uses `react-router` `<Routes>` — pages added as `<Route path="/x" element={<Page />} />` inside the existing `<Routes>` block (line ~2905). Heavy pages use `lazy()` + ErrorBoundary + Suspense fallback:
```tsx
const LifePage = lazy(() => import('./features/warmth/LifePage'));
<Route path="/life" element={
  <ErrorBoundary>
    <Suspense fallback={<div className="p-5 text-zinc-500 text-sm">Loading Life...</div>}>
      <LifePage />
    </Suspense>
  </ErrorBoundary>
} />
```
Sub-routes with params exist (e.g. `/resume/build`, `/resume/preview` are separate sidebar-less routes). Precedent: "/conductor" is a placeholder div — i.e., routes can exist without sidebar items.

## 2. `src/components/GlassCard.tsx` — complete (50 lines)

```tsx
type Accent = 'pink' | 'amber' | 'emerald' | 'none';

const accentConfig: Record<string, { rail: string; border: string; bg: string; edge: string }> = {
  pink:  { rail: 'bg-pink-500/60',     border: 'border-l-pink-500/20 hover:border-l-pink-500/30',   bg: 'bg-pink-500/[0.02]',  edge: 'border-pink-500/30' },
  amber: { rail: 'bg-amber-500/60',    border: 'border-l-amber-500/20 hover:border-l-amber-500/30', bg: 'bg-amber-500/[0.02]', edge: 'border-amber-500/30' },
  emerald: { rail: 'bg-emerald-500/60',border: 'border-l-emerald-500/20 hover:border-l-emerald-500/30', bg: 'bg-emerald-500/[0.02]', edge: 'border-emerald-500/30' },
};

interface GlassCardProps {
  variant?: 'default' | 'compact' | 'subtle' | 'notebook' | 'bordered' | 'elevated' | 'interactive';
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  default:   'bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50',
  compact:   'bg-zinc-900/50 backdrop-blur-md border border-zinc-800/40 p-3',
  subtle:    'bg-zinc-900/30 border border-zinc-800/30',
  notebook:  'bg-zinc-950/70 backdrop-blur-lg border-l-2',
  bordered:  'bg-transparent border-[1.5px]',
  elevated:  'bg-zinc-800/70 backdrop-blur-2xl border border-zinc-600/40',
  interactive: 'bg-zinc-900/60 backdrop-blur-xl border cursor-pointer hover:-translate-y-0.5 transition-all duration-200',
};

export function GlassCard({ variant = 'default', accent = 'none', className = '', children, onClick }: GlassCardProps) {
  const ac = accent !== 'none' ? accentConfig[accent] : null;
  const borderStyle = ac && (variant === 'notebook' || variant === 'bordered' || variant === 'interactive' || variant === 'elevated')
    ? ac.edge : '';
  return (
    <div onClick={onClick}
      className={`relative rounded-xl p-4 transition-colors duration-200 overflow-hidden ${variantStyles[variant]} ${ac ? `${ac.border}` : ''} ${borderStyle} ${className}`}>
      {ac && variant !== 'notebook' && variant !== 'bordered' && (
        <>
          <div className={`absolute top-0 left-0 bottom-0 w-0.5 ${ac.rail}`} />
          <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${ac.bg}`} />
        </>
      )}
      <div className="relative z-0 flex flex-col min-h-0 flex-1">{children}</div>
    </div>
  );
}
```
Note: accents are only pink/amber/emerald — cyan doesn't exist on GlassCard. The RHEO yellow `#f5c518`/cyan `#00d4ff` are NOT in GlassCard's accent set; you may want a new accent or custom classes.

## 3. `src/hooks/useAiChat.ts` — the existing chat hook (570 lines, key parts)

**Send path — CRITICAL discovery: a streaming seam ALREADY EXISTS at the renderer level.** `providerChatCall` is fire-and-forget; chunks arrive via `onProviderChunk` event subscription. This is exactly the `onToken` seam you proposed — it's already how the AI page streams:

```ts
const send = useCallback(async (textArg?: string) => {
  const text = (textArg ?? input).trim()
  if (!text || streamingRef.current) return
  const b = bridge()
  if (!b || typeof b.getAiProviders !== "function" || typeof b.providerChatCall !== "function") {
    setError("Chat backend unavailable."); return
  }
  setError(null); setInput("")
  const userMsg: ChatMsg = { id: uid(), role: "user", content: text, timestamp: Date.now() }
  const assistantId = uid()
  const assistantMsg: ChatMsg = { id: assistantId, role: "assistant", content: "", timestamp: Date.now() }
  const history = messages.map((m) => ({ role: m.role, content: m.content }))
  setMessages((prev) => [...prev, userMsg, assistantMsg])
  setThinking(true)
  // ...pickTarget() resolves provider/model from getAiProviders
  // ...buildContextBundleDetailed() builds system prompt
  // ...payloadMessages = [{system}, ...history, {user}]

  let full = ""
  streamingRef.current = true
  setStreaming(true)

  if (typeof b.onProviderChunk === "function") {
    cleanupRef.current = (b.onProviderChunk as (cb: (d: AnyRec) => void) => () => void)((d) => {
      if (d.error) { /* render parsed error card, stop() */ return }
      if (typeof d.delta === "string" && d.delta) {
        setThinking(false)
        full += d.delta
        setAssistantMessage(assistantId, { content: full })   // ← live chunk updates
      }
      if (d.done) finish(typeof d.full === "string" && d.full ? d.full : full)
    })
  }

  timeoutRef.current = setTimeout(() => { /* 60s timeout → error card */ stop() }, 60000)

  try {
    await (b.providerChatCall as (a: AnyRec) => Promise<unknown>)({
      provider: target.provider, messages: payloadMessages, model: target.model,
    })
  } catch (e) { /* parsed error card, stop() */ }
  // ...extractMemories, refreshThreads, context signal extraction (best-effort)
}, [input, messages, persist, setAssistantMessage, stop, memories, extractMemories, refreshThreads])
```

Key facts:
- Optimistic UI: user bubble + empty assistant bubble appended BEFORE the call; `thinking` flag shows `ThinkingIndicator`; `streaming` gates `ChatInput` (send→stop button).
- `stop()` = calls cleanup (unsubscribes onProviderChunk), clears timers, resets flags.
- Persist: debounced 500ms `aiChatSave` IPC; threads keyed by `threadDate` (YYYY-MM-DD); `loadThread`/`deleteThread`/`renameThread`/`refreshThreads`/`startNewThread` — **threads are date-based, not arbitrary sessions**.
- Provider resolution: `pickTarget()` → `getAiProviders()` state, uses `routing.default.providerId`/model.
- `onProviderChunk` event payloads: `{ delta?, done?, full?, error? }` — main process pushes chunks (learn/terminal relay pattern). Check `deskflow-api.d.ts` for `onProviderChunk` signature if needed.

## 4. Consumer chat UI — `src/components/ai/chat/ChatPanel.tsx` (215 lines, complete pattern)

Used by `src/pages/AiPage.tsx:1537`. This is your loading/empty/error reference. Structure: header (title + online chip + reset), contextWarnings amber strip, scrollable stream, optional memory chips row, bottom command bar (AgentProgressBar + ChatInput). States:

```tsx
const scrollRef = useRef<HTMLDivElement>(null)
const pinnedRef = useRef(true)
const lastAssistant = [...messages].reverse().find((mm) => mm.role === "assistant")
const [empty, setEmpty] = useState(messages.length === 0)
// onScroll: pinnedRef = scrolled to bottom (48px threshold); autoscroll effect on [messages, thinking, streaming]

{empty ? (
  <ChatEmptyState suggestions={suggestions} onPick={(p) => onInputChange?.(p)} onNewThread={onNewThread} />
) : (
  messages.map((mm) => (
    <MessageBubble
      key={mm.id}
      role={mm.role}
      content={mm.content}
      timestamp={mm.timestamp}
      parsed={mm.parsed}
      onAction={onCardAction}
      actionResults={actionResults}
      connectorSyncing={connectorSyncing}
      streaming={Boolean(streaming) && mm.id === lastAssistant?.id}
      autoApprove={autoApprove}
    />
  ))
)}
{thinking ? <ThinkingIndicator /> : null}
```

Subcomponents: `MessageBubble`, `ThinkingIndicator`, `AgentProgressBar`, `ChatEmptyState` (suggestion chips — good template for your session list empty state), `ChatInput`. All in `src/components/ai/chat/`. General page loading pattern elsewhere: `import { LoadingState } from '../components/LoadingState'; ... if (loading) return <LoadingState variant="spinner" />`.

**Renderer convention note:** the AI chat is date-threaded; your brainstorm sessions need a NEW persistence model (real session rows in `brainstorm_sessions`), so don't mirror the date-key approach — mirror the optimistic-bubble + chunk-seam pattern instead.

**Your Round 3 request (remaining contracts) is queued.** I have §3.4–3.11 DDL, §4.3–4.7 UI definitions, §5.2–5.4 prompts, and the non-brainstorm §6 handlers ready to paste verbatim from the spec. Standing by.