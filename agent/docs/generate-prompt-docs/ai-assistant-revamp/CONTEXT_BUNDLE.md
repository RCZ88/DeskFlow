# CONTEXT_BUNDLE.md — AI Assistant Page Full Revamp

> This bundle contains ALL source code the target AI needs to redesign the AI Assistant page.
> Read this FIRST. Do NOT guess at code shapes — every file is included verbatim.

---

## 1. Problem Statement

The AI Assistant page (`/ai`) is broken:
1. **Layout collapse**: The sidebar (3 cards), chat panel, and bottom strip (Focus/Plan/Reflect) fight for space in a fixed 100vh viewport. The chat gets squeezed to 0px and disappears.
2. **Digest card redundancy**: The Digest card appears in the sidebar AND has its own tab — remove it from the main deck view.
3. **User bubble alignment**: User chat bubbles are not properly right-aligned within the chat scroll area.
4. **No chat history management**: `aiChatListThreads` IPC exists in preload but is not wired to any UI. Users cannot browse/load previous conversations.
5. **No memory/RAG system**: Each chat starts fresh with a context bundle but has no per-chat memory or retrieval-augmented generation.
6. **No conversation starters**: The empty state has 3 basic hardcoded suggestions. Needs richer, context-aware suggestions.
7. **Google AI Studio API key**: The provider system supports generic providers but Google AI Studio (Gemini) should be a first-class option with a dedicated API key field.

---

## 2. Architecture Overview

```
AiPage.tsx (route /ai)
  └─ AiPageDeck.tsx (layout shell)
       ├─ dk-sidebar (3-column grid: glance, digest, connectors)
       ├─ dk-grid → ChatPanel (the AI chat)
       ├─ dk-strip (FocusBoard, PlanBoard, ReflectFeed)
       └─ dk-foot

Chat system:
  useAiChat.ts (hook) → IPC: aiChatLoad/Save/Reset/ListThreads, providerChatCall, onProviderChunk
  ChatPanel.tsx → ChatEmptyState, MessageBubble, ChatInput
  aiContextBundle.ts → builds system prompt with live user data
  parsed.ts → structured JSON message parsing (goals, stats, charts, forms, etc.)
```

---

## 3. Current Layout Source Code

### src/components/ai/deck/AiPageDeck.tsx (FULL)
```tsx
import "./deck.css"
import { ChatPanel } from "../chat/ChatPanel"
import type { AgentStep } from "../chat/AgentProgressBar"
import type { ChatSuggestion } from "../chat/ChatEmptyState"
import { QuickCommands } from "../../rail/QuickCommands"
import type { ChatMessage } from "../chat/ChatPanel"
import type { CardAction } from "../chat/parsed"
import type { ReactNode } from "react"

export interface DeckProps {
  messages: ChatMessage[]
  input: string
  onInputChange: (v: string) => void
  onSend: (text: string) => void
  onStop?: () => void
  onReset?: () => void
  onCardAction?: (a: CardAction) => void
  streaming?: boolean
  thinking?: boolean
  provider?: string
  online?: boolean
  suggestions?: ChatSuggestion[]
  agentSteps?: AgentStep[]
  agentStatus?: string
  listening?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
  contextWarnings?: string[]
  dismissError?: (index: number) => void
  onModelChange?: (provider: string, model: string) => void
  modeLabel?: string
  glanceMetrics?: { label: string; value: string }[]
  digestSlot?: ReactNode
  connectorsSlot?: ReactNode
  focusSlot?: ReactNode
  planSlot?: ReactNode
  reflectSlot?: ReactNode
}

export function AiPageDeck(props: DeckProps) {
  return (
    <>
      <div className="dk-main-row">
      <div className="dk-sidebar">
        <div className="dk-col">
          <div className="dk-microlabel">Today at a glance</div>
          <div className="dk-card dk-acc dk-violet dk-sec">
            <div className="dk-glancegrid">
              {(props.glanceMetrics ?? []).map((m, i) => (
                <div className="dk-metric" key={i}>
                  <div className="dk-metric-top"><span className="dk-metric-lab">{m.label}</span></div>
                  <div className="dk-metric-val">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="dk-col">
          {props.digestSlot ? <>{props.digestSlot}</> : null}
        </div>
        <div className="dk-col">
          {props.connectorsSlot ? <>{props.connectorsSlot}</> : null}
          <QuickCommands onAction={props.onCardAction} />
        </div>
      </div>
      <div className="dk-grid">
        <div className="dk-col">
          <div className="dk-microlabel">Assistant · structured command deck</div>
          <ChatPanel
            messages={props.messages}
            streaming={props.streaming}
            thinking={props.thinking}
            provider={props.provider}
            online={props.online}
            input={props.input}
            onInputChange={props.onInputChange}
            onSend={props.onSend}
            onStop={props.onStop}
            onReset={props.onReset}
            onCardAction={props.onCardAction}
            suggestions={props.suggestions}
            agentSteps={props.agentSteps}
            agentStatus={props.agentStatus}
            listening={props.listening}
            onToggleVoice={props.onToggleVoice}
            voiceSupported={props.voiceSupported}
            actionResults={props.actionResults}
            connectorSyncing={props.connectorSyncing}
            contextWarnings={props.contextWarnings}
            dismissError={props.dismissError}
            onModelChange={props.onModelChange}
          />
        </div>
      </div>
      </div>
      <div className="dk-strip">
        {props.focusSlot ? <>{props.focusSlot}</> : null}
        {props.planSlot ? <>{props.planSlot}</> : null}
        {props.reflectSlot ? <>{props.reflectSlot}</> : null}
      </div>
      <div className="dk-foot">DeskFlow AI — Command Deck</div>
    </>
  )
}
```

### src/components/ai/deck/deck.css (KEY LAYOUT RULES — lines 1-50)
```css
.dk-root{
  --canvas:#09090b; --surface:rgba(24,24,27,.72); --surface-2:#151518;
  --raised:rgba(39,39,42,.7); --line:rgba(255,255,255,.07); --line-2:rgba(255,255,255,.12);
  --tp:#fafafa; --ts:rgba(250,250,250,.60); --tm:rgba(250,250,250,.38);
  --pink:#ec4899; --emerald:#34d399; --amber:#fbbf24; --violet:#a78bfa; --cyan:#22d3ee; --red:#f87171;
  --mono:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,sans-serif;
  position:relative; color:var(--tp); font-family:var(--sans); -webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1200px 480px at 78% -8%, rgba(236,72,153,.14), transparent 60%),
    radial-gradient(900px 420px at 8% -4%, rgba(167,139,250,.12), transparent 60%),
    var(--canvas);
  padding:28px 34px 40px; overflow-y:auto;
  display:flex; flex-direction:column;
  min-height:100vh;
}
.dk-wrap{max-width:1372px;margin:0 auto;position:relative;width:100%;display:flex;flex-direction:column;flex:1}
.dk-main-row{display:flex;flex-direction:column;gap:20px;min-height:420px}
.dk-main-row > *{min-width:0}
.dk-grid{display:flex;flex-direction:column;align-items:stretch;min-height:320px}
.dk-sidebar{width:100%;flex:none;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;overflow:hidden;min-height:0;max-height:36vh}
.dk-strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:20px;flex:none;max-height:280px}
```

---

## 4. Chat System Source Code

### src/hooks/useAiChat.ts (FULL — 326 lines)
Key interfaces:
```ts
export interface ChatMsg {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: number
  parsed?: ParsedMessage
}

export interface UseAiChat {
  messages: ChatMsg[]
  input: string
  setInput: (v: string) => void
  streaming: boolean
  thinking: boolean
  error: string | null
  contextWarnings: string[]
  hasProvider: boolean
  send: (text?: string) => Promise<void>
  stop: () => void
  reset: () => Promise<void>
  dismissError: () => void
  setAssistantMessage: (id: string, patch: Partial<ChatMsg>) => void
}
```

Key behaviors:
- Loads today's thread on mount via `aiChatLoad(threadDate)` 
- Persists after each assistant response via `aiChatSave({threadDate, messages})`
- Reset clears messages and calls `aiChatReset(threadDate)`
- Thread date is always today's ISO date — NO multi-day history support
- Uses `buildContextBundleDetailed()` to create system prompt with live user data
- Streams via `onProviderChunk` callback, finishes with `providerChatCall`

### src/components/ai/chat/ChatPanel.tsx (FULL — 164 lines)
Structure:
```tsx
<div className="dk-card dk-acc dk-pink dk-deck">
  <div className="dk-deckhead">...header with provider badge...</div>
  {contextWarnings && ...}
  <div ref={scrollRef} className="dk-stream">
    {empty ? <ChatEmptyState /> : messages.map(<MessageBubble />)}
    {thinking ? <ThinkingIndicator /> : null}
  </div>
  <div className="dk-cmdbar">
    <AgentProgressBar />
    <ChatInput />
  </div>
</div>
```

### src/components/ai/chat/ChatEmptyState.tsx (FULL — 64 lines)
```tsx
const DEFAULTS: ChatSuggestion[] = [
  { id: "plan", label: "Plan my day", prompt: "Help me plan my day based on my goals." },
  { id: "summary", label: "Summarize progress", prompt: "Summarize my progress this week." },
  { id: "focus", label: "What should I focus on?", prompt: "What's the most important thing to focus on right now?" },
]
```
Renders: Bot icon, "How can I help?" greeting, tappable suggestion chips with staggered animation.

### src/components/ai/chat/ChatInput.tsx (FULL — 125 lines)
Terminal-style input: `>_` prefix, auto-resizing textarea, send button, voice toggle, streaming stop button.

### src/components/ai/chat/MessageBubble.tsx (FULL — 77 lines)
```tsx
<div className={"dk-msg" + (isUser ? " dk-user" : " dk-ai")}>
  <div className={"dk-av" + (isUser ? " dk-me" : " dk-ai")}>
    {isUser ? "CZ" : "✦"}
  </div>
  <div className={hasCard ? "dk-aiwrap" : ""}>
    <div className="dk-bubble">
      {streaming && !isUser ? <TypewriterText text={content} /> : <span>{content}</span>}
    </div>
    {hasCard ? <ParsedMessageRouter ... /> : null}
    {timestamp || footer ? <div>...</div> : null}
  </div>
</div>
```

CSS for bubbles (deck.css):
```css
.dk-msg{display:flex;gap:11px;max-width:92%}
.dk-msg.dk-user{align-self:flex-end;flex-direction:row-reverse;max-width:74%}
.dk-av{width:26px;height:26px;border-radius:8px;flex:none;display:grid;place-items:center;font-size:12px;font-weight:700}
.dk-av.dk-ai{background:linear-gradient(140deg,#f472b6,#a78bfa);color:#0b0b0d}
.dk-av.dk-me{background:var(--raised);color:var(--ts);border:1px solid var(--line-2)}
.dk-bubble{font-size:13.5px;line-height:1.55;color:var(--tp)}
.dk-msg.dk-user .dk-bubble{background:var(--raised);border:1px solid var(--line-2);padding:9px 13px;border-radius:13px 13px 4px 13px;color:#f4f4f5}
.dk-msg.dk-ai .dk-bubble{padding-top:3px;color:rgba(250,250,250,.86)}
```

**User bubble bug**: `.dk-msg` has `max-width:92%` but `.dk-msg.dk-user` has `max-width:74%` AND `align-self:flex-end`. The `.dk-stream` container is a flex column. The issue is that `dk-stream` has no explicit width constraint, so the `max-width` percentages are relative to the stream's width which fills the card. The user bubble IS right-aligned via `flex-direction:row-reverse` + `align-self:flex-end`, but the 74% cap makes it narrower than expected. The bubble should be wider and the alignment needs to account for the card padding.

---

## 5. Context Bundle & AI Provider System

### src/services/aiContextBundle.ts (FULL — 151 lines)
Builds system prompt with:
- PAGE_CATALOG (app page descriptions)
- Live user context: today's goals, long-term goals, 7-day trends, app usage, AI usage, projects, planning notes, connectors, active goals
- MAX_CONTEXT_CHARS = 6000 (~1500 tokens)
- Returns `{ content, warnings }` for silent degradation

### IPC Endpoints (from preload.ts):
```ts
// Chat persistence
aiChatLoad: (threadDate: string) => ipcRenderer.invoke('ai-chat:load', threadDate)
aiChatSave: (data: { threadDate: string; messages: Array<{role,content,parsed_json?,timestamp?}> }) => ipcRenderer.invoke('ai-chat:save', data)
aiChatReset: (threadDate: string) => ipcRenderer.invoke('ai-chat:reset', threadDate)
aiChatListThreads: () => ipcRenderer.invoke('ai-chat:list-threads')
aiChatSend: (data: { threadDate, message, providerId? }) => ipcRenderer.invoke('ai-chat:send', data)

// Provider system
getAiProviders: () => ipcRenderer.invoke('get-ai-providers')
saveAiProviders: (state) => ipcRenderer.invoke('save-ai-providers', state)
providerChatCall: (data: { provider, messages, model?, maxTokens?, temperature? }) => ipcRenderer.invoke('provider-chat-call', data)
providerChatBasic: (data: { provider, messages, model?, maxTokens?, temperature? }) => ipcRenderer.invoke('provider-chat-basic', data)
onProviderChunk: (callback) => ipcRenderer.on('provider-chunk', ...)
testAiProvider: (providerId) => ipcRenderer.invoke('test-ai-provider', providerId)
```

### Settings AI Provider State:
```ts
const [aiProviders, setAiProviders] = useState<any[]>([]);
// Each provider: { id, label, models: string[], enabled: boolean, apiKey?, baseUrl?, templateId?, extraConfig? }
const [aiProviderRouting, setAiProviderRouting] = useState<any>({
  default: { providerId: '', model: '' },
  researchDigest: null,
  goalAssistant: null
});
```

Default models reference `google/gemini-2.0-flash-001` via OpenRouter but there is NO dedicated Google AI Studio provider with direct API key.

---

## 6. Parsed Message Types (parsed.ts)
```ts
export type ParsedMessage =
  | { type: "text"; text?: string }
  | { type: "goal_suggestion"; goals: ParsedGoal[]; source?: string }
  | { type: "plan_update"; changes: PlanChange[]; note?: string }
  | { type: "stats_summary"; metrics: StatMetric[]; period?: string }
  | { type: "action_list"; actions: ActionItem[]; note?: string }
  | { type: "digest_item"; topic: string; summary: string; sources?: SourceLink[] }
  | { type: "connector_status"; connectors: ConnectorStatusItem[] }
  | { type: "form_fill"; title?: string; submitLabel?: string; fields: FormField[] }
  | { type: "chart_data"; chartType: "bar"|"line"|"pie"; labels: string[]; datasets: ChartDataset[]; title?: string }
  | { type: "error"; message: string; recovery?: string }

export type CardAction =
  | { kind: "accept-goal"; goal: ParsedGoal }
  | { kind: "dismiss-goal"; goal: ParsedGoal }
  | { kind: "apply-plan"; changes: PlanChange[] }
  | { kind: "run-ipc"; ipc: string; payload?: Record<string, unknown>; label?: string }
  | { kind: "submit-form"; values: Record<string, string | number | boolean> }
  | { kind: "sync-connector"; id?: string; name: string }
  | { kind: "open-url"; url: string }
  | { kind: "retry" }
  | { kind: "send-text"; text: string }
```

---

## 7. Design Tokens (from deck.css)
```css
:root {
  --canvas: #09090b;
  --surface: rgba(24,24,27,.72);
  --surface-2: #151518;
  --raised: rgba(39,39,42,.7);
  --line: rgba(255,255,255,.07);
  --line-2: rgba(255,255,255,.12);
  --tp: #fafafa;
  --ts: rgba(250,250,250,.60);
  --tm: rgba(250,250,250,.38);
  --pink: #ec4899;
  --emerald: #34d399;
  --amber: #fbbf24;
  --violet: #a78bfa;
  --cyan: #22d3ee;
  --red: #f87171;
  --mono: ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
  --sans: -apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,sans-serif;
}
```

Component patterns:
- Cards: `background: var(--surface); border: 1px solid var(--line); border-radius: 16px; backdrop-filter: blur(14px)`
- Accent stripe: `::before { width: 3px; position: absolute; left: 0; top: 0; bottom: 0 }`
- Microlabels: `font-family: var(--mono); font-size: 10.5px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--tm)`
- Buttons: height 30px, border-radius 8px, font-size 12px
- Glass effect: `backdrop-filter: blur(14px)` on surfaces

---

## 8. What Needs to Be Designed

### A. Layout Overhaul
Redesign the page layout so the chat is ALWAYS visible and properly sized. The sidebar (Today at a glance + Connectors) should be compact at the top. The chat fills available space. The bottom strip (Focus/Plan/Reflect) is either:
- Below the chat with its own scroll
- Moved to a separate subtab
- Made collapsible

**Remove the Digest card from the sidebar** — it has its own "Digest" tab already.

### B. Chat History Management
Wire `aiChatListThreads` to a UI element (sidebar list, dropdown, or history panel) that lets users:
- See previous chat threads (by date/title)
- Load a previous thread
- Delete old threads
- Start a new thread

### C. Memory / RAG System
Design a per-chat memory system that:
- Stores key facts/decisions from each conversation
- Retrieves relevant past context when starting a new chat
- Summarizes completed threads
- Surfaces "things the AI remembers about you" in the UI

### D. Conversation Starters
Replace the 3 hardcoded suggestions with context-aware starters that change based on:
- Time of day
- Active goals
- Recent activity
- Current app/project context

### E. User Bubble Alignment Fix
Fix `.dk-msg.dk-user` so user bubbles are properly right-aligned with adequate width inside the chat scroll area.

### F. Google AI Studio Provider
Add Google AI Studio (Gemini) as a first-class provider in Settings with:
- Dedicated API key field (Google AI Studio API key, not OpenRouter)
- Pre-configured model list (gemini-2.0-flash, gemini-2.5-pro, etc.)
- Direct API endpoint (generativelanguage.googleapis.com)

### G. Chat Panel Visual Polish
- Empty state: richer greeting with time-of-day awareness
- Streaming indicator: smoother animation
- Error states: better inline recovery
- Card responses: improved rendering for parsed JSON messages
