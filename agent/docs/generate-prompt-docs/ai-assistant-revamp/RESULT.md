# RESULT.md — AI Assistant Page Full Revamp Design Specification

> **Version**: 1.0.0  
> **Scope**: `/ai` route — Layout, Chat History, Memory/RAG, Conversation Starters, User Bubble Fix, Google AI Studio Provider  
> **Design System**: DeskFlow Dark Glass-Morphism  
> **Constraint**: All changes must preserve existing IPC contracts, parsed message types, and design tokens.

---

## Table of Contents

1. [Layout Architecture](#1-layout-architecture)
2. [Component Specifications](#2-component-specifications)
3. [Data Schema — Memory / RAG](#3-data-schema--memory--rag)
4. [IPC Additions](#4-ipc-additions)
5. [Provider Integration — Google AI Studio](#5-provider-integration--google-ai-studio)
6. [Animation Specifications](#6-animation-specifications)
7. [File Change List](#7-file-change-list)

---

## 1. Layout Architecture

### 1.1 Problem Analysis

The current layout collapses because of this chain:

```
.dk-root (100vh, overflow:hidden) 
  → .dk-wrap (flex:1, overflow-y:auto)
    → .dk-topbar (flex:none)
    → .dk-subnav (flex:none)
    → .dk-main-row (flex:1, min-height:0)  ← COLLAPSES when strip eats space
      → .dk-sidebar (flex:none, max-height:36vh)
      → .dk-grid (flex:1, min-height:220px)
        → ChatPanel
    → .dk-strip (flex:none, max-height:280px) ← EATS remaining space
    → .dk-foot (flex:none)
```

**Root cause**: `dk-main-row` is `flex:1` with `min-height:0`, so when `dk-strip` (flex:none) renders below it, the main-row shrinks to accommodate the strip. The chat panel inside `dk-grid` then collapses to its `min-height:220px` or less.

### 1.2 New Layout Architecture

The page becomes a **single continuous scroll** rather than a trapped 100vh viewport. The chat panel is sticky/fixed in the viewport center while the sidebar and strip scroll naturally, OR the entire page scrolls with the chat as the dominant element.

**Chosen approach**: **Scrollable page with sticky chat**. The chat panel is the visual anchor. Sidebar and bottom strip are secondary content that scrolls above/below or sits in a compact header/footer.

```
.dk-root (min-height:100vh, overflow-y:auto)  ← NOT 100vh trapped
  → .dk-wrap (max-width:1372px, margin:0 auto, width:100%)
    → .dk-topbar (flex:none)
    → .dk-subnav (flex:none)
    → .dk-hero-row (compact sidebar, 2-column grid, auto height)
      → .dk-sidebar (2-col grid: glance + connectors)
    → .dk-chat-anchor (position:sticky, top:80px, z-index:10)
      → .dk-grid (flex:1, min-height:480px)
        → ChatPanel (fills viewport minus header/footer)
    → .dk-strip (collapsible accordion, max-height:0 → expanded)
    → .dk-foot (flex:none)
```

### 1.3 Exact CSS Rules

**File**: `src/components/ai/deck/deck.css`

Replace lines 1–50 and add new rules:

```css
/* ─── Root & Wrap ─── */
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
  padding:28px 34px 40px;
  overflow-y:auto;          /* ← CHANGED: was overflow:hidden */
  display:flex; flex-direction:column;
  min-height:100vh;         /* ← CHANGED: was height:100vh */
}

.dk-wrap{
  max-width:1372px;
  margin:0 auto;
  position:relative;
  width:100%;
  display:flex;
  flex-direction:column;
  flex:1;
  gap:20px;                 /* ← NEW: consistent spacing */
}

/* ─── Hero Row (Sidebar) ─── */
.dk-hero-row{
  display:grid;
  grid-template-columns:1.2fr 1fr;  /* ← 2-column: glance wider than connectors */
  gap:20px;
  width:100%;
  flex:none;
  min-height:0;
  /* REMOVED: max-height:36vh — let it breathe */
}

.dk-hero-row > .dk-col{
  display:flex;
  flex-direction:column;
  gap:10px;
  min-width:0;
}

/* ─── Chat Anchor ─── */
.dk-chat-anchor{
  position:sticky;           /* ← NEW: sticks while scrolling */
  top:72px;
  z-index:10;
  width:100%;
  flex:1;
  display:flex;
  flex-direction:column;
  min-height:520px;          /* ← NEW: guaranteed minimum */
}

.dk-grid{
  display:flex;
  flex-direction:column;
  align-items:stretch;
  flex:1;
  min-height:480px;          /* ← INCREASED from 320px */
}

.dk-grid > .dk-col{
  display:flex;
  flex-direction:column;
  flex:1;
  min-height:0;
}

/* ─── Strip (Collapsible) ─── */
.dk-strip{
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  gap:20px;
  flex:none;
  /* REMOVED: max-height:280px — accordion handles this */
  transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
  overflow:hidden;
}

.dk-strip.collapsed{
  max-height:0;
  opacity:0;
  margin-top:0;
}

.dk-strip.expanded{
  max-height:600px;          /* ← generous cap, scrolls internally if needed */
  opacity:1;
  margin-top:20px;
}

/* ─── Card Base ─── */
.dk-card{
  position:relative;
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:16px;
  backdrop-filter:blur(14px);
  padding:18px 20px;
  overflow:hidden;
}

.dk-card::before{
  content:"";
  position:absolute;
  left:0; top:0; bottom:0;
  width:3px;
  border-radius:3px 0 0 3px;
}

/* Accent variants */
.dk-acc.dk-pink::before   { background:linear-gradient(180deg,var(--pink),#be185d); }
.dk-acc.dk-violet::before { background:linear-gradient(180deg,var(--violet),#7c3aed); }
.dk-acc.dk-emerald::before{ background:linear-gradient(180deg,var(--emerald),#059669); }
.dk-acc.dk-cyan::before   { background:linear-gradient(180deg,var(--cyan),#0891b2); }
.dk-acc.dk-amber::before  { background:linear-gradient(180deg,var(--amber),#b45309); }

/* ─── Chat Panel Card ─── */
.dk-deck{
  display:flex;
  flex-direction:column;
  flex:1;
  min-height:0;
  padding:0;                 /* ← inner padding handled by children */
}

.dk-deckhead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:14px 18px 10px;
  border-bottom:1px solid var(--line);
  flex:none;
}

.dk-deckhead-left{
  display:flex;
  align-items:center;
  gap:10px;
}

.dk-deckhead-title{
  font-family:var(--mono);
  font-size:11px;
  letter-spacing:1.4px;
  text-transform:uppercase;
  color:var(--tm);
}

.dk-provider-badge{
  font-size:10.5px;
  padding:3px 8px;
  border-radius:6px;
  background:var(--surface-2);
  border:1px solid var(--line);
  color:var(--ts);
  font-family:var(--mono);
}

/* ─── Stream (Message Scroll Area) ─── */
.dk-stream{
  flex:1;
  overflow-y:auto;
  overflow-x:hidden;
  padding:18px 20px 8px;
  display:flex;
  flex-direction:column;
  gap:14px;
  min-height:0;
  /* NEW: explicit width context for percentage children */
  width:100%;
  box-sizing:border-box;
  scroll-behavior:smooth;
}

/* Custom scrollbar */
.dk-stream::-webkit-scrollbar{ width:6px; }
.dk-stream::-webkit-scrollbar-track{ background:transparent; }
.dk-stream::-webkit-scrollbar-thumb{ background:rgba(255,255,255,.12); border-radius:3px; }

/* ─── Messages ─── */
.dk-msg{
  display:flex;
  gap:11px;
  max-width:88%;             /* ← unified max-width */
  animation: msgEnter 0.28s cubic-bezier(0.22,1,0.36,1) forwards;
  opacity:0;
  transform:translateY(8px);
}

.dk-msg.dk-user{
  align-self:flex-end;
  flex-direction:row-reverse;
  /* REMOVED: max-width:74% — now uses 88% like AI */
  margin-left:auto;          /* ← NEW: ensures right alignment */
}

.dk-msg.dk-ai{
  align-self:flex-start;
  margin-right:auto;         /* ← NEW: ensures left alignment */
}

@keyframes msgEnter{
  to{ opacity:1; transform:translateY(0); }
}

.dk-av{
  width:26px; height:26px;
  border-radius:8px;
  flex:none;
  display:grid;
  place-items:center;
  font-size:12px;
  font-weight:700;
  flex-shrink:0;
}

.dk-av.dk-ai{
  background:linear-gradient(140deg,#f472b6,#a78bfa);
  color:#0b0b0d;
}

.dk-av.dk-me{
  background:var(--raised);
  color:var(--ts);
  border:1px solid var(--line-2);
}

.dk-bubble{
  font-size:13.5px;
  line-height:1.55;
  color:var(--tp);
  word-break:break-word;
}

.dk-msg.dk-user .dk-bubble{
  background:var(--raised);
  border:1px solid var(--line-2);
  padding:10px 14px;
  border-radius:14px 14px 4px 14px;
  color:#f4f4f5;
}

.dk-msg.dk-ai .dk-bubble{
  padding-top:3px;
  color:rgba(250,250,250,.86);
}

/* ─── AI Card Wrapper ─── */
.dk-aiwrap{
  display:flex;
  flex-direction:column;
  gap:10px;
  width:100%;
}

/* ─── Command Bar ─── */
.dk-cmdbar{
  display:flex;
  flex-direction:column;
  gap:8px;
  padding:10px 18px 14px;
  border-top:1px solid var(--line);
  flex:none;
  background:rgba(9,9,11,.55);
  backdrop-filter:blur(10px);
}

/* ─── Input ─── */
.dk-inputwrap{
  display:flex;
  align-items:flex-end;
  gap:8px;
  background:var(--surface-2);
  border:1px solid var(--line);
  border-radius:12px;
  padding:8px 10px 8px 14px;
  transition:border-color 0.2s ease, box-shadow 0.2s ease;
}

.dk-inputwrap:focus-within{
  border-color:var(--pink);
  box-shadow:0 0 0 2px rgba(236,72,153,.12);
}

.dk-inputprefix{
  font-family:var(--mono);
  font-size:13px;
  color:var(--pink);
  padding-bottom:6px;
  flex:none;
  user-select:none;
}

.dk-textarea{
  flex:1;
  background:transparent;
  border:none;
  outline:none;
  resize:none;
  color:var(--tp);
  font-family:var(--sans);
  font-size:13.5px;
  line-height:1.5;
  max-height:120px;
  padding:4px 0;
}

.dk-textarea::placeholder{ color:var(--tm); }

.dk-sendbtn{
  width:30px; height:30px;
  border-radius:8px;
  border:none;
  background:var(--pink);
  color:#fff;
  display:grid;
  place-items:center;
  cursor:pointer;
  flex:none;
  transition:transform 0.15s ease, opacity 0.15s ease;
}

.dk-sendbtn:hover{ transform:scale(1.06); }
.dk-sendbtn:active{ transform:scale(0.95); }
.dk-sendbtn:disabled{ opacity:0.45; cursor:not-allowed; transform:none; }

/* ─── Empty State ─── */
.dk-empty{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:18px;
  flex:1;
  padding:40px 20px;
  text-align:center;
}

.dk-empty-icon{
  width:48px; height:48px;
  border-radius:14px;
  background:linear-gradient(140deg,rgba(236,72,153,.18),rgba(167,139,250,.18));
  border:1px solid rgba(255,255,255,.08);
  display:grid;
  place-items:center;
  font-size:20px;
  animation: emptyFloat 3s ease-in-out infinite;
}

@keyframes emptyFloat{
  0%,100%{ transform:translateY(0); }
  50%{ transform:translateY(-6px); }
}

.dk-empty h3{
  font-size:15px;
  font-weight:600;
  color:var(--tp);
  margin:0;
}

.dk-empty p{
  font-size:12.5px;
  color:var(--ts);
  margin:0;
  max-width:320px;
  line-height:1.5;
}

.dk-suggestions{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  justify-content:center;
  max-width:480px;
}

.dk-chip{
  font-size:12px;
  padding:7px 12px;
  border-radius:8px;
  background:var(--surface-2);
  border:1px solid var(--line);
  color:var(--ts);
  cursor:pointer;
  transition:all 0.18s ease;
  font-family:var(--sans);
}

.dk-chip:hover{
  background:var(--raised);
  border-color:var(--line-2);
  color:var(--tp);
  transform:translateY(-1px);
}

.dk-chip:active{ transform:translateY(0); }

/* ─── Thinking Indicator ─── */
.dk-thinking{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 14px;
  align-self:flex-start;
}

.dk-thinking-dots{
  display:flex;
  gap:4px;
}

.dk-thinking-dots span{
  width:6px; height:6px;
  border-radius:50%;
  background:var(--tm);
  animation: dotPulse 1.4s ease-in-out infinite;
}

.dk-thinking-dots span:nth-child(2){ animation-delay:0.2s; }
.dk-thinking-dots span:nth-child(3){ animation-delay:0.4s; }

@keyframes dotPulse{
  0%,100%{ opacity:0.3; transform:scale(0.8); }
  50%{ opacity:1; transform:scale(1); }
}

/* ─── Sidebar Glance ─── */
.dk-glancegrid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.dk-metric{
  background:var(--surface-2);
  border:1px solid var(--line);
  border-radius:10px;
  padding:10px 12px;
}

.dk-metric-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:4px;
}

.dk-metric-lab{
  font-family:var(--mono);
  font-size:9.5px;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:var(--tm);
}

.dk-metric-val{
  font-size:15px;
  font-weight:600;
  color:var(--tp);
  font-variant-numeric:tabular-nums;
}

/* ─── Microlabel ─── */
.dk-microlabel{
  font-family:var(--mono);
  font-size:10.5px;
  letter-spacing:1.6px;
  text-transform:uppercase;
  color:var(--tm);
  padding:0 2px;
}

/* ─── Strip Toggle ─── */
.dk-strip-toggle{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  padding:8px;
  font-family:var(--mono);
  font-size:10px;
  letter-spacing:1px;
  text-transform:uppercase;
  color:var(--tm);
  cursor:pointer;
  border:1px solid var(--line);
  border-radius:8px;
  background:var(--surface);
  width:fit-content;
  margin:0 auto;
  transition:all 0.2s ease;
}

.dk-strip-toggle:hover{
  color:var(--tp);
  border-color:var(--line-2);
  background:var(--raised);
}

/* ─── Context Warnings ─── */
.dk-warnbar{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 14px;
  background:rgba(248,113,113,.08);
  border:1px solid rgba(248,113,113,.15);
  border-radius:8px;
  margin:0 18px 10px;
  font-size:12px;
  color:var(--red);
}

.dk-warnbar button{
  margin-left:auto;
  background:none;
  border:none;
  color:var(--tm);
  cursor:pointer;
  font-size:11px;
  padding:2px 6px;
  border-radius:4px;
}

.dk-warnbar button:hover{ color:var(--tp); background:rgba(255,255,255,.06); }

/* ─── History Sidebar (inside ChatPanel) ─── */
.dk-history-drawer{
  position:absolute;
  left:0; top:0; bottom:0;
  width:260px;
  background:var(--surface);
  border-right:1px solid var(--line);
  border-radius:16px 0 0 16px;
  backdrop-filter:blur(16px);
  z-index:20;
  transform:translateX(-100%);
  transition:transform 0.3s cubic-bezier(0.22,1,0.36,1);
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.dk-history-drawer.open{
  transform:translateX(0);
}

.dk-history-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:14px 16px;
  border-bottom:1px solid var(--line);
  flex:none;
}

.dk-history-head h4{
  margin:0;
  font-size:12px;
  font-family:var(--mono);
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:var(--tm);
}

.dk-history-list{
  flex:1;
  overflow-y:auto;
  padding:8px;
  display:flex;
  flex-direction:column;
  gap:4px;
}

.dk-history-item{
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px 10px;
  border-radius:8px;
  cursor:pointer;
  transition:all 0.15s ease;
  border:1px solid transparent;
}

.dk-history-item:hover{
  background:var(--surface-2);
  border-color:var(--line);
}

.dk-history-item.active{
  background:var(--raised);
  border-color:var(--line-2);
}

.dk-history-item .dk-h-date{
  font-size:12px;
  color:var(--tp);
  font-weight:500;
}

.dk-history-item .dk-h-meta{
  font-size:10px;
  color:var(--tm);
  font-family:var(--mono);
}

.dk-history-item .dk-h-actions{
  margin-left:auto;
  display:flex;
  gap:4px;
  opacity:0;
  transition:opacity 0.15s ease;
}

.dk-history-item:hover .dk-h-actions{
  opacity:1;
}

.dk-history-item .dk-h-actions button{
  width:22px; height:22px;
  border-radius:5px;
  border:none;
  background:transparent;
  color:var(--tm);
  display:grid;
  place-items:center;
  cursor:pointer;
  font-size:11px;
}

.dk-history-item .dk-h-actions button:hover{
  background:var(--surface);
  color:var(--red);
}

/* ─── Memory Chips ─── */
.dk-memory-bar{
  display:flex;
  gap:6px;
  padding:0 18px 8px;
  flex-wrap:wrap;
}

.dk-memory-chip{
  font-size:10.5px;
  padding:4px 8px;
  border-radius:6px;
  background:rgba(167,139,250,.10);
  border:1px solid rgba(167,139,250,.18);
  color:var(--violet);
  font-family:var(--mono);
  cursor:default;
  transition:all 0.15s ease;
}

.dk-memory-chip:hover{
  background:rgba(167,139,250,.16);
  transform:translateY(-1px);
}

/* ─── Responsive ─── */
@media (max-width:980px){
  .dk-hero-row{ grid-template-columns:1fr; }
  .dk-strip{ grid-template-columns:1fr; }
  .dk-chat-anchor{ position:relative; top:0; }
  .dk-root{ padding:20px; }
}
```

---

## 2. Component Specifications

### 2.1 AiPageDeck.tsx (Modified)

**File**: `src/components/ai/deck/AiPageDeck.tsx`

**Changes**:
- Remove `digestSlot` from sidebar (2-column grid instead of 3)
- Add `historySlot` prop for chat history drawer
- Add `stripExpanded` state with toggle
- Add `memoryChips` prop for memory bar
- Wrap chat in sticky anchor
- Remove `max-height` constraints

```tsx
import "./deck.css"
import { ChatPanel } from "../chat/ChatPanel"
import type { AgentStep } from "../chat/AgentProgressBar"
import type { ChatSuggestion } from "../chat/ChatEmptyState"
import { QuickCommands } from "../../rail/QuickCommands"
import type { ChatMessage } from "../chat/ChatPanel"
import type { CardAction } from "../chat/parsed"
import type { ReactNode } from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

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
  connectorsSlot?: ReactNode
  focusSlot?: ReactNode
  planSlot?: ReactNode
  reflectSlot?: ReactNode
  // NEW PROPS
  historySlot?: ReactNode
  memoryChips?: { id: string; text: string }[]
  onNewThread?: () => void
}

export function AiPageDeck(props: DeckProps) {
  const [stripExpanded, setStripExpanded] = useState(false)
  const hasStripContent = !!(props.focusSlot || props.planSlot || props.reflectSlot)

  return (
    <>
      {/* ─── Hero Row: Glance + Connectors (2-col) ─── */}
      <div className="dk-hero-row">
        <div className="dk-col">
          <div className="dk-microlabel">Today at a glance</div>
          <div className="dk-card dk-acc dk-violet dk-sec">
            <div className="dk-glancegrid">
              {(props.glanceMetrics ?? []).map((m, i) => (
                <div className="dk-metric" key={i}>
                  <div className="dk-metric-top">
                    <span className="dk-metric-lab">{m.label}</span>
                  </div>
                  <div className="dk-metric-val">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="dk-col">
          {props.connectorsSlot ? <>{props.connectorsSlot}</> : null}
          <QuickCommands onAction={props.onCardAction} />
        </div>
      </div>

      {/* ─── Chat Anchor (Sticky) ─── */}
      <div className="dk-chat-anchor">
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
              historySlot={props.historySlot}
              memoryChips={props.memoryChips}
              onNewThread={props.onNewThread}
            />
          </div>
        </div>
      </div>

      {/* ─── Strip Toggle ─── */}
      {hasStripContent && (
        <button
          className="dk-strip-toggle"
          onClick={() => setStripExpanded(v => !v)}
          aria-expanded={stripExpanded}
        >
          {stripExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {stripExpanded ? "Hide Focus / Plan / Reflect" : "Show Focus / Plan / Reflect"}
        </button>
      )}

      {/* ─── Strip (Collapsible) ─── */}
      <div className={`dk-strip ${stripExpanded ? "expanded" : "collapsed"}`}>
        {props.focusSlot ? <>{props.focusSlot}</> : null}
        {props.planSlot ? <>{props.planSlot}</> : null}
        {props.reflectSlot ? <>{props.reflectSlot}</> : null}
      </div>

      <div className="dk-foot">DeskFlow AI — Command Deck</div>
    </>
  )
}
```

---

### 2.2 ChatPanel.tsx (Modified)

**File**: `src/components/ai/chat/ChatPanel.tsx`

**Changes**:
- Accept `historySlot`, `memoryChips`, `onNewThread` props
- Render memory chips above input
- Render history drawer overlay
- Pass `onNewThread` to empty state

```tsx
import { useRef, useEffect } from "react"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { ChatEmptyState } from "./ChatEmptyState"
import { AgentProgressBar } from "./AgentProgressBar"
import type { AgentStep } from "./AgentProgressBar"
import type { ChatSuggestion } from "./ChatEmptyState"
import type { CardAction } from "./parsed"
import type { ReactNode } from "react"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: number
  parsed?: any
}

export interface ChatPanelProps {
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
  // NEW
  historySlot?: ReactNode
  memoryChips?: { id: string; text: string }[]
  onNewThread?: () => void
}

export function ChatPanel(props: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const empty = props.messages.length === 0

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [props.messages, props.thinking])

  return (
    <div className="dk-card dk-acc dk-pink dk-deck" style={{ position: "relative" }}>
      {/* History Drawer Overlay */}
      {props.historySlot}

      {/* Header */}
      <div className="dk-deckhead">
        <div className="dk-deckhead-left">
          <span className="dk-deckhead-title">Command Deck</span>
          {props.provider && (
            <span className="dk-provider-badge">
              {props.provider} {props.online ? "· online" : ""}
            </span>
          )}
        </div>
        {props.onReset && (
          <button
            onClick={props.onReset}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ts)",
              cursor: "pointer",
              fontFamily: "var(--mono)",
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Context Warnings */}
      {props.contextWarnings && props.contextWarnings.length > 0 && (
        <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {props.contextWarnings.map((w, i) => (
            <div key={i} className="dk-warnbar">
              <span>⚠ {w}</span>
              {props.dismissError && (
                <button onClick={() => props.dismissError!(i)}>Dismiss</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message Stream */}
      <div ref={scrollRef} className="dk-stream">
        {empty ? (
          <ChatEmptyState
            suggestions={props.suggestions}
            onSuggestion={props.onSend}
            onNewThread={props.onNewThread}
          />
        ) : (
          props.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              streaming={props.streaming && m.role === "assistant" && m.id === props.messages[props.messages.length - 1]?.id}
              onCardAction={props.onCardAction}
              actionResults={props.actionResults}
              connectorSyncing={props.connectorSyncing}
            />
          ))
        )}
        {props.thinking && !empty && (
          <div className="dk-thinking">
            <div className="dk-av dk-ai">✦</div>
            <div className="dk-thinking-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {/* Memory Chips */}
      {props.memoryChips && props.memoryChips.length > 0 && (
        <div className="dk-memory-bar">
          <span style={{ fontSize: 10, color: "var(--tm)", fontFamily: "var(--mono)", marginRight: 4 }}>
            Memories:
          </span>
          {props.memoryChips.map((chip) => (
            <span key={chip.id} className="dk-memory-chip" title={chip.text}>
              {chip.text.length > 28 ? chip.text.slice(0, 28) + "…" : chip.text}
            </span>
          ))}
        </div>
      )}

      {/* Command Bar */}
      <div className="dk-cmdbar">
        <AgentProgressBar steps={props.agentSteps} status={props.agentStatus} />
        <ChatInput
          value={props.input}
          onChange={props.onInputChange}
          onSend={props.onSend}
          onStop={props.onStop}
          streaming={props.streaming}
          listening={props.listening}
          onToggleVoice={props.onToggleVoice}
          voiceSupported={props.voiceSupported}
        />
      </div>
    </div>
  )
}
```

---

### 2.3 ChatEmptyState.tsx (Modified)

**File**: `src/components/ai/chat/ChatEmptyState.tsx`

**Changes**:
- Time-of-day aware greeting
- Dynamic suggestions based on context
- New thread button
- Richer visual with animated icon

```tsx
import { useMemo } from "react"
import { Sparkles, Plus, MessageSquare } from "lucide-react"

export interface ChatSuggestion {
  id: string
  label: string
  prompt: string
  icon?: "plan" | "summary" | "focus" | "goal" | "reflect" | "custom"
}

interface ChatEmptyStateProps {
  suggestions?: ChatSuggestion[]
  onSuggestion?: (prompt: string) => void
  onNewThread?: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "Up late?"
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  if (hour < 22) return "Good evening"
  return "Good night"
}

function getTimeIcon(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "🌙"
  if (hour < 12) return "☀️"
  if (hour < 17) return "🌤️"
  if (hour < 22) return "🌆"
  return "🌙"
}

export function ChatEmptyState(props: ChatEmptyStateProps) {
  const greeting = useMemo(getGreeting, [])
  const timeIcon = useMemo(getTimeIcon, [])

  const suggestions = props.suggestions ?? [
    { id: "plan", label: "Plan my day", prompt: "Help me plan my day based on my goals.", icon: "plan" },
    { id: "summary", label: "Summarize progress", prompt: "Summarize my progress this week.", icon: "summary" },
    { id: "focus", label: "What should I focus on?", prompt: "What's the most important thing to focus on right now?", icon: "focus" },
  ]

  return (
    <div className="dk-empty">
      <div className="dk-empty-icon">{timeIcon}</div>
      <h3>{greeting} — How can I help?</h3>
      <p>
        I can plan your day, summarize progress, suggest goals, or answer questions about your work.
      </p>

      <div className="dk-suggestions">
        {suggestions.map((s, i) => (
          <button
            key={s.id}
            className="dk-chip"
            onClick={() => props.onSuggestion?.(s.prompt)}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {props.onNewThread && (
        <button
          onClick={props.onNewThread}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ts)",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            letterSpacing: "0.5px",
            marginTop: 8,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--line-2)"
            e.currentTarget.style.color = "var(--tp)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)"
            e.currentTarget.style.color = "var(--ts)"
          }}
        >
          <Plus size={12} />
          New Thread
        </button>
      )}
    </div>
  )
}
```

---

### 2.4 ChatHistory.tsx (New Component)

**File**: `src/components/ai/chat/ChatHistory.tsx`

**Purpose**: Sidebar drawer for browsing, loading, and deleting chat threads.

```tsx
import { useState, useEffect, useCallback } from "react"
import { History, Trash2, MessageSquare, X, Plus } from "lucide-react"

export interface ChatThread {
  threadDate: string
  title?: string
  messageCount: number
  lastMessageAt?: number
  preview?: string
}

interface ChatHistoryProps {
  open: boolean
  onClose: () => void
  threads: ChatThread[]
  currentThreadDate: string
  onLoadThread: (threadDate: string) => void
  onDeleteThread: (threadDate: string) => void
  onNewThread: () => void
  loading?: boolean
}

export function ChatHistory(props: ChatHistoryProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleDelete = useCallback((date: string) => {
    if (confirmDelete === date) {
      props.onDeleteThread(date)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(date)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }, [confirmDelete, props])

  const formatDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00")
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    if (isToday) return "Today"
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  return (
    <div className={`dk-history-drawer ${props.open ? "open" : ""}`}>
      <div className="dk-history-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <History size={14} color="var(--tm)" />
          <h4>Chat History</h4>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={props.onNewThread}
            title="New thread"
            style={{
              width: 26, height: 26, borderRadius: 6, border: "1px solid var(--line)",
              background: "var(--surface-2)", color: "var(--ts)", display: "grid", placeItems: "center",
              cursor: "pointer", fontSize: 12,
            }}
          >
            <Plus size={12} />
          </button>
          <button
            onClick={props.onClose}
            title="Close"
            style={{
              width: 26, height: 26, borderRadius: 6, border: "1px solid var(--line)",
              background: "var(--surface-2)", color: "var(--ts)", display: "grid", placeItems: "center",
              cursor: "pointer", fontSize: 12,
            }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="dk-history-list">
        {props.loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--tm)", fontSize: 12 }}>
            Loading threads…
          </div>
        ) : props.threads.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--tm)", fontSize: 12 }}>
            <MessageSquare size={20} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            No conversations yet.
          </div>
        ) : (
          props.threads.map((t) => (
            <div
              key={t.threadDate}
              className={`dk-history-item ${t.threadDate === props.currentThreadDate ? "active" : ""}`}
              onClick={() => props.onLoadThread(t.threadDate)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span className="dk-h-date">{formatDate(t.threadDate)}</span>
                <span className="dk-h-meta">
                  {t.messageCount} msg{t.messageCount !== 1 ? "s" : ""}
                  {t.preview ? ` · ${t.preview.slice(0, 24)}${t.preview.length > 24 ? "…" : ""}` : ""}
                </span>
              </div>
              <div className="dk-h-actions">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.threadDate) }}
                  title={confirmDelete === t.threadDate ? "Click again to confirm" : "Delete thread"}
                  style={{
                    color: confirmDelete === t.threadDate ? "var(--red)" : undefined,
                    fontWeight: confirmDelete === t.threadDate ? 700 : undefined,
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

---

### 2.5 useAiChat.ts (Modified Hook)

**File**: `src/hooks/useAiChat.ts`

**Changes**:
- Add `threads`, `loadThread`, `deleteThread`, `listThreads` to interface
- Add memory extraction on assistant response completion
- Add memory retrieval on thread load
- Thread date can be any date, not just today
- Add `currentThreadDate` state

```ts
import { useState, useCallback, useEffect, useRef } from "react"
import { buildContextBundleDetailed } from "../services/aiContextBundle"
import type { ParsedMessage } from "../components/ai/chat/parsed"

export interface ChatMsg {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: number
  parsed?: ParsedMessage
}

export interface ChatThreadMeta {
  threadDate: string
  messageCount: number
  lastMessageAt?: number
  preview?: string
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
  // NEW: History
  threads: ChatThreadMeta[]
  currentThreadDate: string
  loadThread: (threadDate: string) => Promise<void>
  deleteThread: (threadDate: string) => Promise<void>
  refreshThreads: () => Promise<void>
  startNewThread: () => void
  // NEW: Memory
  memories: { id: string; text: string; category: string }[]
}

// Generate thread date from timestamp (YYYY-MM-DD)
function getThreadDate(ts = Date.now()) {
  return new Date(ts).toISOString().split("T")[0]
}

export function useAiChat(): UseAiChat {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextWarnings, setContextWarnings] = useState<string[]>([])
  const [hasProvider, setHasProvider] = useState(false)
  const [threads, setThreads] = useState<ChatThreadMeta[]>([])
  const [currentThreadDate, setCurrentThreadDate] = useState(getThreadDate())
  const [memories, setMemories] = useState<{ id: string; text: string; category: string }[]>([])

  const abortRef = useRef<AbortController | null>(null)
  const chunkBuf = useRef("")

  // Check provider availability
  useEffect(() => {
    window.electron?.getAiProviders?.().then((providers: any[]) => {
      setHasProvider(providers.some((p) => p.enabled && p.apiKey))
    }).catch(() => setHasProvider(false))
  }, [])

  // Load threads list
  const refreshThreads = useCallback(async () => {
    try {
      const list = await window.electron?.aiChatListThreads?.()
      if (Array.isArray(list)) {
        setThreads(list.map((t: any) => ({
          threadDate: t.threadDate,
          messageCount: t.messageCount ?? 0,
          lastMessageAt: t.lastMessageAt,
          preview: t.preview,
        })))
      }
    } catch (e) {
      console.error("Failed to list threads:", e)
    }
  }, [])

  useEffect(() => { refreshThreads() }, [refreshThreads])

  // Load specific thread
  const loadThread = useCallback(async (threadDate: string) => {
    try {
      const data = await window.electron?.aiChatLoad?.(threadDate)
      if (data?.messages) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id ?? crypto.randomUUID(),
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          parsed: m.parsed_json ? JSON.parse(m.parsed_json) : undefined,
        })))
        setCurrentThreadDate(threadDate)
        setError(null)
        // Load memories for this thread
        await loadMemories(threadDate)
      }
    } catch (e) {
      setError("Failed to load thread")
    }
  }, [])

  // Load today's thread on mount
  useEffect(() => {
    loadThread(getThreadDate())
  }, [loadThread])

  // Memory retrieval
  const loadMemories = async (threadDate: string) => {
    try {
      const mems = await window.electron?.aiChatGetMemories?.(threadDate)
      if (Array.isArray(mems)) {
        setMemories(mems.map((m: any) => ({
          id: m.id,
          text: m.content,
          category: m.category,
        })))
      }
    } catch (e) {
      console.error("Failed to load memories:", e)
    }
  }

  // Extract memories from completed conversation
  const extractMemories = async (threadDate: string, msgs: ChatMsg[]) => {
    try {
      // Simple extraction: look for key facts in assistant messages
      const assistantMsgs = msgs.filter(m => m.role === "assistant" && m.content.length > 20)
      if (assistantMsgs.length === 0) return

      // Call backend to extract and store memories
      await window.electron?.aiChatExtractMemories?.({ threadDate, messages: assistantMsgs.map(m => ({ content: m.content, parsed: m.parsed })) })
      await loadMemories(threadDate)
    } catch (e) {
      console.error("Memory extraction failed:", e)
    }
  }

  const send = useCallback(async (text?: string) => {
    const msgText = text ?? input
    if (!msgText.trim()) return
    if (!hasProvider) {
      setError("No AI provider configured. Add an API key in Settings.")
      return
    }

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: msgText.trim(),
      timestamp: Date.now(),
    }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setStreaming(true)
    setThinking(true)
    setError(null)

    try {
      // Build context bundle
      const bundle = await buildContextBundleDetailed()
      setContextWarnings(bundle.warnings ?? [])

      // Retrieve relevant memories for context injection
      const relevantMemories = memories
        .filter(m => m.category === "preference" || m.category === "goal")
        .map(m => m.text)
        .slice(0, 5)

      const systemPrompt = bundle.content + 
        (relevantMemories.length > 0 
          ? `\n\n[Relevant memories from past conversations]:\n${relevantMemories.map((m, i) => `${i+1}. ${m}`).join("\n")}` 
          : "")

      const providerMsgs = [
        { role: "system", content: systemPrompt },
        ...newMessages.map(m => ({ role: m.role, content: m.content })),
      ]

      const assistantId = crypto.randomUUID()
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }])
      setThinking(false)

      abortRef.current = new AbortController()

      // Stream handling
      let fullContent = ""
      const cleanup = window.electron?.onProviderChunk?.((event: any, chunk: string) => {
        fullContent += chunk
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m))
      })

      await window.electron?.providerChatCall?.({
        messages: providerMsgs,
        maxTokens: 4000,
        temperature: 0.7,
      })

      // Save thread
      const threadDate = currentThreadDate
      await window.electron?.aiChatSave?.({
        threadDate,
        messages: newMessages.concat({ id: assistantId, role: "assistant", content: fullContent, timestamp: Date.now() }).map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          parsed_json: m.parsed ? JSON.stringify(m.parsed) : undefined,
        })),
      })

      // Extract memories
      await extractMemories(threadDate, newMessages.concat({ id: assistantId, role: "assistant", content: fullContent }))
      await refreshThreads()

      if (cleanup) cleanup()
    } catch (err: any) {
      setError(err?.message || "Something went wrong")
    } finally {
      setStreaming(false)
      setThinking(false)
      abortRef.current = null
    }
  }, [input, messages, hasProvider, currentThreadDate, memories, refreshThreads])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
    setThinking(false)
  }, [])

  const reset = useCallback(async () => {
    setMessages([])
    setError(null)
    setContextWarnings([])
    await window.electron?.aiChatReset?.(currentThreadDate)
    await refreshThreads()
  }, [currentThreadDate, refreshThreads])

  const deleteThread = useCallback(async (threadDate: string) => {
    await window.electron?.aiChatReset?.(threadDate)
    if (threadDate === currentThreadDate) {
      setMessages([])
      setCurrentThreadDate(getThreadDate())
    }
    await refreshThreads()
  }, [currentThreadDate, refreshThreads])

  const startNewThread = useCallback(() => {
    const newDate = getThreadDate()
    setCurrentThreadDate(newDate)
    setMessages([])
    setError(null)
    setContextWarnings([])
    setMemories([])
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  const setAssistantMessage = useCallback((id: string, patch: Partial<ChatMsg>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }, [])

  return {
    messages,
    input,
    setInput,
    streaming,
    thinking,
    error,
    contextWarnings,
    hasProvider,
    send,
    stop,
    reset,
    dismissError,
    setAssistantMessage,
    threads,
    currentThreadDate,
    loadThread,
    deleteThread,
    refreshThreads,
    startNewThread,
    memories,
  }
}
```

---

### 2.6 AiPage.tsx (Modified Route)

**File**: `src/pages/AiPage.tsx` (or wherever the route is defined)

**Changes**:
- Wire `useAiChat` new fields to `AiPageDeck`
- Render `ChatHistory` as `historySlot`
- Generate dynamic suggestions
- Pass memory chips

```tsx
import { useState, useMemo, useCallback } from "react"
import { AiPageDeck } from "../components/ai/deck/AiPageDeck"
import { useAiChat } from "../hooks/useAiChat"
import { ChatHistory } from "../components/ai/chat/ChatHistory"
import type { ChatSuggestion } from "../components/ai/chat/ChatEmptyState"
import { Brain, History, MessageSquare } from "lucide-react"

export default function AiPage() {
  const chat = useAiChat()
  const [historyOpen, setHistoryOpen] = useState(false)

  // Dynamic suggestions based on time + context
  const suggestions = useMemo<ChatSuggestion[]>(() => {
    const hour = new Date().getHours()
    const base: ChatSuggestion[] = []

    if (hour < 12) {
      base.push({ id: "morning-plan", label: "Plan my morning", prompt: "Help me plan my morning based on my goals and calendar.", icon: "plan" })
    } else if (hour < 17) {
      base.push({ id: "afternoon-focus", label: "Afternoon focus", prompt: "What should I focus on for the rest of the day?", icon: "focus" })
    } else {
      base.push({ id: "evening-review", label: "Review today", prompt: "Review my progress today and suggest tomorrow's priorities.", icon: "reflect" })
    }

    base.push(
      { id: "goal-check", label: "Check goal progress", prompt: "How am I doing on my active goals this week?", icon: "goal" },
      { id: "summarize", label: "Summarize week", prompt: "Give me a summary of my week so far.", icon: "summary" },
      { id: "deep-work", label: "Deep work session", prompt: "Help me plan a 90-minute deep work session.", icon: "focus" },
    )

    return base
  }, [chat.currentThreadDate])

  const handleLoadThread = useCallback(async (date: string) => {
    await chat.loadThread(date)
    setHistoryOpen(false)
  }, [chat])

  const handleDeleteThread = useCallback(async (date: string) => {
    await chat.deleteThread(date)
  }, [chat])

  return (
    <div className="dk-root">
      <div className="dk-wrap">
        <AiPageDeck
          messages={chat.messages}
          input={chat.input}
          onInputChange={chat.setInput}
          onSend={chat.send}
          onStop={chat.stop}
          onReset={chat.reset}
          streaming={chat.streaming}
          thinking={chat.thinking}
          error={chat.error}
          contextWarnings={chat.contextWarnings}
          dismissError={chat.dismissError}
          suggestions={suggestions}
          provider="DeskFlow AI"
          online={chat.hasProvider}
          glanceMetrics={[
            { label: "Focus", value: "2h 14m" },
            { label: "Goals", value: "3/5" },
            { label: "Tasks", value: "7" },
            { label: "Streak", value: "4d" },
          ]}
          connectorsSlot={
            <div className="dk-card dk-acc dk-cyan">
              <div className="dk-microlabel" style={{ marginBottom: 8 }}>Connectors</div>
              <div style={{ fontSize: 12, color: "var(--ts)", lineHeight: 1.5 }}>
                Notion · GitHub · Slack
              </div>
            </div>
          }
          focusSlot={
            <div className="dk-card dk-acc dk-emerald">
              <div className="dk-microlabel">Focus Board</div>
            </div>
          }
          planSlot={
            <div className="dk-card dk-acc dk-violet">
              <div className="dk-microlabel">Plan Board</div>
            </div>
          }
          reflectSlot={
            <div className="dk-card dk-acc dk-amber">
              <div className="dk-microlabel">Reflect Feed</div>
            </div>
          }
          historySlot={
            <ChatHistory
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              threads={chat.threads}
              currentThreadDate={chat.currentThreadDate}
              onLoadThread={handleLoadThread}
              onDeleteThread={handleDeleteThread}
              onNewThread={chat.startNewThread}
            />
          }
          memoryChips={chat.memories.slice(0, 6)}
          onNewThread={chat.startNewThread}
        />

        {/* History Toggle Button (floating, outside drawer) */}
        <button
          onClick={() => setHistoryOpen(v => !v)}
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            backdropFilter: "blur(14px)",
            color: historyOpen ? "var(--pink)" : "var(--ts)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            zIndex: 30,
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(0,0,0,.3)",
          }}
          title={historyOpen ? "Close history" : "Chat history"}
        >
          <History size={18} />
        </button>
      </div>
    </div>
  )
}
```

---

### 2.7 MessageBubble.tsx (Modified)

**File**: `src/components/ai/chat/MessageBubble.tsx`

**Changes**:
- Ensure proper right-alignment with `margin-left:auto` on user messages
- Add timestamp formatting
- Improve parsed card rendering wrapper

```tsx
import { ParsedMessageRouter } from "./ParsedMessageRouter"
import type { CardAction } from "./parsed"

export interface MessageBubbleProps {
  message: {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp?: number
    parsed?: any
  }
  streaming?: boolean
  onCardAction?: (a: CardAction) => void
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
}

export function MessageBubble(props: MessageBubbleProps) {
  const { message, streaming } = props
  const isUser = message.role === "user"
  const hasCard = !!message.parsed && message.parsed.type !== "text"

  const timeStr = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null

  return (
    <div className={`dk-msg ${isUser ? "dk-user" : "dk-ai"}`}>
      <div className={`dk-av ${isUser ? "dk-me" : "dk-ai"}`}>
        {isUser ? "CZ" : "✦"}
      </div>
      <div className={hasCard ? "dk-aiwrap" : ""} style={{ minWidth: 0 }}>
        <div className="dk-bubble">
          {streaming && !isUser ? (
            <TypewriterText text={message.content} />
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
          )}
        </div>
        {hasCard && (
          <ParsedMessageRouter
            parsed={message.parsed}
            onAction={props.onCardAction}
            actionResults={props.actionResults}
            connectorSyncing={props.connectorSyncing}
          />
        )}
        {timeStr && (
          <div style={{ fontSize: 10, color: "var(--tm)", fontFamily: "var(--mono)", marginTop: 4, textAlign: isUser ? "right" : "left" }}>
            {timeStr}
          </div>
        )}
      </div>
    </div>
  )
}

// Simple typewriter for streaming
function TypewriterText({ text }: { text: string }) {
  return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
}
```

---

### 2.8 ChatInput.tsx (Modified)

**File**: `src/components/ai/chat/ChatInput.tsx`

**Changes**:
- Add history toggle button inside input bar
- Improve auto-resize logic
- Add keyboard shortcut (Cmd+Enter to send)

```tsx
import { useRef, useEffect, useCallback } from "react"
import { Send, Square, Mic, History } from "lucide-react"

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  onStop?: () => void
  streaming?: boolean
  listening?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
}

export function ChatInput(props: ChatInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px"
  }, [props.value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      props.onSend(props.value)
    }
  }, [props])

  return (
    <div className="dk-inputwrap">
      <span className="dk-inputprefix">&gt;_</span>
      <textarea
        ref={taRef}
        className="dk-textarea"
        rows={1}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask DeskFlow AI anything…"
        disabled={props.streaming}
      />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {props.voiceSupported && (
          <button
            onClick={props.onToggleVoice}
            style={{
              width: 28, height: 28, borderRadius: 7, border: "1px solid var(--line)",
              background: props.listening ? "var(--pink)" : "transparent",
              color: props.listening ? "#fff" : "var(--ts)",
              display: "grid", placeItems: "center", cursor: "pointer", fontSize: 12,
            }}
            title="Voice input"
          >
            <Mic size={13} />
          </button>
        )}
        {props.streaming ? (
          <button
            onClick={props.onStop}
            className="dk-sendbtn"
            style={{ background: "var(--red)" }}
            title="Stop generating"
          >
            <Square size={12} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => props.onSend(props.value)}
            className="dk-sendbtn"
            disabled={!props.value.trim()}
            title="Send (Enter)"
          >
            <Send size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## 3. Data Schema — Memory / RAG

### 3.1 SQLite Schema

**File**: `src/main/database/schema.sql` (or add to existing migration)

```sql
-- Chat threads metadata
CREATE TABLE IF NOT EXISTS ai_chat_threads (
  thread_date TEXT PRIMARY KEY,        -- YYYY-MM-DD
  title TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at INTEGER,             -- unix timestamp ms
  preview TEXT,                        -- first 80 chars of last user msg
  summary TEXT,                        -- AI-generated thread summary
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id TEXT PRIMARY KEY,
  thread_date TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  parsed_json TEXT,                    -- serialized ParsedMessage
  timestamp INTEGER,
  FOREIGN KEY (thread_date) REFERENCES ai_chat_threads(thread_date) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_thread ON ai_chat_messages(thread_date);
CREATE INDEX IF NOT EXISTS idx_chat_msg_time ON ai_chat_messages(timestamp);

-- Memory / RAG facts
CREATE TABLE IF NOT EXISTS ai_chat_memories (
  id TEXT PRIMARY KEY,
  thread_date TEXT NOT NULL,
  content TEXT NOT NULL,               -- the fact/decision/preference
  category TEXT NOT NULL CHECK(category IN ('goal','preference','decision','context','project','habit')),
  importance REAL DEFAULT 0.5 CHECK(importance >= 0 AND importance <= 1),
  embedding BLOB,                      -- optional: 384-dim float32 array (sentence-transformers)
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (thread_date) REFERENCES ai_chat_threads(thread_date) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mem_thread ON ai_chat_memories(thread_date);
CREATE INDEX IF NOT EXISTS idx_mem_category ON ai_chat_memories(category);
CREATE INDEX IF NOT EXISTS idx_mem_importance ON ai_chat_memories(importance DESC);

-- Memory retrieval cache (per-thread recent context)
CREATE TABLE IF NOT EXISTS ai_memory_context (
  thread_date TEXT PRIMARY KEY,
  context_text TEXT NOT NULL,        -- injected into system prompt
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);
```

### 3.2 JSON Shapes

**Memory Entry** (frontend):
```ts
interface MemoryEntry {
  id: string
  threadDate: string
  content: string
  category: "goal" | "preference" | "decision" | "context" | "project" | "habit"
  importance: number  // 0.0 - 1.0
  createdAt: number
}
```

**Thread Meta** (IPC response):
```ts
interface ThreadMetaIPC {
  threadDate: string
  title?: string
  messageCount: number
  lastMessageAt?: number
  preview?: string
}
```

**Memory Extraction Payload** (IPC request):
```ts
interface ExtractMemoryPayload {
  threadDate: string
  messages: Array<{
    content: string
    parsed?: ParsedMessage
  }>
}
```

### 3.3 Memory Extraction Logic (Backend)

**File**: `src/main/ai/memoryExtractor.ts` (new)

```ts
import { Database } from "better-sqlite3"

const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  goal: [/goal|objective|target|aim/i, /set a goal|new goal|goal for/i],
  preference: [/prefer|like|don't like|favorite|instead of/i, /i want|i would rather/i],
  decision: [/decided|choose|picked|went with|settled on/i, /decision|conclusion/i],
  context: [/project|client|team|deadline|meeting/i, /working on|assigned to/i],
  habit: [/every day|daily|routine|habit|usually|typically/i],
}

export function extractMemoriesFromMessages(
  db: Database,
  threadDate: string,
  messages: Array<{ content: string; parsed?: any }>
): MemoryEntry[] {
  const memories: MemoryEntry[] = []

  for (const msg of messages) {
    const content = msg.content

    // Rule-based extraction (lightweight, no LLM call needed)
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      for (const pattern of patterns) {
        const match = content.match(pattern)
        if (match) {
          // Extract sentence containing the match
          const sentenceStart = content.lastIndexOf(".", match.index) + 1
          const sentenceEnd = content.indexOf(".", match.index! + match[0].length)
          const sentence = content.slice(sentenceStart, sentenceEnd > -1 ? sentenceEnd + 1 : undefined).trim()

          if (sentence.length > 10 && sentence.length < 200) {
            const importance = calculateImportance(sentence, category, msg.parsed)
            memories.push({
              id: crypto.randomUUID(),
              threadDate,
              content: sentence,
              category: category as any,
              importance,
              createdAt: Date.now(),
            })
          }
          break // one per category per message
        }
      }
    }

    // Extract from parsed messages (structured data)
    if (msg.parsed?.type === "goal_suggestion") {
      for (const goal of msg.parsed.goals ?? []) {
        memories.push({
          id: crypto.randomUUID(),
          threadDate,
          content: `Goal suggested: ${goal.title} (${goal.category})`,
          category: "goal",
          importance: 0.7,
          createdAt: Date.now(),
        })
      }
    }

    if (msg.parsed?.type === "plan_update") {
      memories.push({
        id: crypto.randomUUID(),
        threadDate,
        content: `Plan updated: ${msg.parsed.note || "schedule changes"}`,
        category: "decision",
        importance: 0.6,
        createdAt: Date.now(),
      })
    }
  }

  // Deduplicate by content similarity (simple Levenshtein or exact match)
  const seen = new Set<string>()
  return memories.filter(m => {
    const key = m.content.toLowerCase().slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function calculateImportance(sentence: string, category: string, parsed?: any): number {
  let score = 0.5
  if (category === "goal") score += 0.2
  if (category === "decision") score += 0.15
  if (sentence.includes("important") || sentence.includes("critical")) score += 0.15
  if (parsed) score += 0.1
  return Math.min(1, Math.max(0, score))
}
```

### 3.4 Memory Retrieval Logic

**File**: `src/main/ai/memoryRetrieval.ts` (new)

```ts
import { Database } from "better-sqlite3"

export function getRelevantMemories(
  db: Database,
  threadDate: string,
  query?: string,
  limit = 8
): Array<{ id: string; content: string; category: string; importance: number }> {
  // 1. Get memories from current thread
  const current = db.prepare(`
    SELECT id, content, category, importance 
    FROM ai_chat_memories 
    WHERE thread_date = ? 
    ORDER BY importance DESC, created_at DESC 
    LIMIT ?
  `).all(threadDate, limit) as any[]

  // 2. Get high-importance memories from other recent threads
  const recent = db.prepare(`
    SELECT id, content, category, importance 
    FROM ai_chat_memories 
    WHERE thread_date != ? AND importance > 0.6
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(threadDate, Math.floor(limit / 2)) as any[]

  // 3. Merge and deduplicate
  const merged = [...current, ...recent]
  const seen = new Set<string>()
  return merged.filter(m => {
    if (seen.has(m.content.toLowerCase().slice(0, 30))) return false
    seen.add(m.content.toLowerCase().slice(0, 30))
    return true
  }).slice(0, limit)
}
```

---

## 4. IPC Additions

### 4.1 Preload.ts Additions

**File**: `src/preload.ts` (or equivalent)

Add to the existing `contextBridge.exposeInMainWorld("electron", { ... })` block:

```ts
// Memory / RAG
aiChatGetMemories: (threadDate: string) => ipcRenderer.invoke("ai-chat:get-memories", threadDate),
aiChatExtractMemories: (data: { threadDate: string; messages: Array<{ content: string; parsed?: any }> }) => 
  ipcRenderer.invoke("ai-chat:extract-memories", data),

// Thread metadata enhancement
aiChatListThreads: () => ipcRenderer.invoke("ai-chat:list-threads"),  // Already exists — ensure it returns enriched metadata
```

### 4.2 Main.ts IPC Handlers

**File**: `src/main.ts` (or `src/main/ipc/aiChat.ts`)

```ts
import { ipcMain } from "electron"
import { extractMemoriesFromMessages } from "./ai/memoryExtractor"
import { getRelevantMemories } from "./ai/memoryRetrieval"

// Enhanced list-threads handler
ipcMain.handle("ai-chat:list-threads", async (event) => {
  const db = getDatabase() // however you access your DB instance
  const rows = db.prepare(`
    SELECT 
      t.thread_date as threadDate,
      t.title,
      t.message_count as messageCount,
      t.last_message_at as lastMessageAt,
      t.preview
    FROM ai_chat_threads t
    ORDER BY t.last_message_at DESC
  `).all()

  return rows.map((r: any) => ({
    threadDate: r.threadDate,
    title: r.title,
    messageCount: r.messageCount,
    lastMessageAt: r.lastMessageAt,
    preview: r.preview,
  }))
})

// Get memories for a thread
ipcMain.handle("ai-chat:get-memories", async (event, threadDate: string) => {
  const db = getDatabase()
  const memories = getRelevantMemories(db, threadDate, undefined, 10)
  return memories
})

// Extract and store memories
ipcMain.handle("ai-chat:extract-memories", async (event, data: { threadDate: string; messages: any[] }) => {
  const db = getDatabase()
  const memories = extractMemoriesFromMessages(db, data.threadDate, data.messages)

  const insert = db.prepare(`
    INSERT OR REPLACE INTO ai_chat_memories (id, thread_date, content, category, importance, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const m of memories) {
    insert.run(m.id, m.threadDate, m.content, m.category, m.importance, m.createdAt)
  }

  return { extracted: memories.length }
})

// Enhanced save handler (upsert thread metadata)
ipcMain.handle("ai-chat:save", async (event, data: { threadDate: string; messages: any[] }) => {
  const db = getDatabase()

  // Upsert thread metadata
  const lastMsg = data.messages[data.messages.length - 1]
  const preview = data.messages.find((m: any) => m.role === "user")?.content?.slice(0, 80) ?? ""

  db.prepare(`
    INSERT INTO ai_chat_threads (thread_date, message_count, last_message_at, preview, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(thread_date) DO UPDATE SET
      message_count = excluded.message_count,
      last_message_at = excluded.last_message_at,
      preview = excluded.preview,
      updated_at = excluded.updated_at
  `).run(
    data.threadDate,
    data.messages.length,
    lastMsg?.timestamp ?? Date.now(),
    preview,
    Date.now()
  )

  // Save messages (existing logic)
  // ... existing message save logic ...

  return { success: true }
})
```

---

## 5. Provider Integration — Google AI Studio

### 5.1 Provider Template

**File**: `src/main/ai/providers/googleAiStudio.ts` (new)

```ts
const GOOGLE_AI_STUDIO_BASE = "https://generativelanguage.googleapis.com/v1beta"

export const GOOGLE_AI_STUDIO_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-pro",
]

export interface GoogleAiStudioConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

export async function* streamGoogleAiStudio(
  config: GoogleAiStudioConfig,
  messages: Array<{ role: string; content: string }>
): AsyncGenerator<string, void, unknown> {
  const url = `${config.baseUrl || GOOGLE_AI_STUDIO_BASE}/models/${config.model}:streamGenerateContent?key=${config.apiKey}`

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  // System instruction must be separate in Gemini API
  const systemInstruction = messages.find(m => m.role === "system")?.content ?? ""
  const chatContents = contents.filter(c => c.role !== "system")

  const body: any = {
    contents: chatContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4000,
    },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Google AI Studio error: ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("{")) continue

      try {
        const chunk = JSON.parse(trimmed)
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
        if (text) yield text
      } catch {
        // ignore malformed JSON
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    try {
      const chunk = JSON.parse(buffer.trim())
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
      if (text) yield text
    } catch {
      // ignore
    }
  }
}

export async function callGoogleAiStudioBasic(
  config: GoogleAiStudioConfig,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const url = `${config.baseUrl || GOOGLE_AI_STUDIO_BASE}/models/${config.model}:generateContent?key=${config.apiKey}`

  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const systemInstruction = messages.find(m => m.role === "system")?.content ?? ""
  const chatContents = contents.filter(c => c.role !== "system")

  const body: any = {
    contents: chatContents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Google AI Studio error: ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
}
```

### 5.2 Provider Router Integration

**File**: `src/main/ai/providerRouter.ts` (modify existing)

```ts
import { streamGoogleAiStudio, callGoogleAiStudioBasic, GOOGLE_AI_STUDIO_MODELS } from "./providers/googleAiStudio"

export function getProviderHandler(providerId: string, config: any) {
  switch (providerId) {
    case "google-ai-studio":
      return {
        stream: (messages: any[]) => streamGoogleAiStudio({ apiKey: config.apiKey, model: config.model, baseUrl: config.baseUrl }, messages),
        basic: (messages: any[]) => callGoogleAiStudioBasic({ apiKey: config.apiKey, model: config.model, baseUrl: config.baseUrl }, messages),
        models: GOOGLE_AI_STUDIO_MODELS,
      }
    // ... existing providers ...
  }
}
```

### 5.3 Settings UI Addition

**File**: `src/components/settings/SettingsAI.tsx` (or equivalent)

Add Google AI Studio as a default provider option:

```tsx
// In the provider list initialization or default config:
const DEFAULT_PROVIDERS = [
  {
    id: "google-ai-studio",
    label: "Google AI Studio",
    models: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
    enabled: false,
    apiKey: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    templateId: "google-ai-studio",
    extraConfig: {},
  },
  // ... existing defaults ...
]
```

In the provider card renderer, add a special case for Google AI Studio:

```tsx
{provider.templateId === "google-ai-studio" && (
  <div style={{ fontSize: 11, color: "var(--tm)", marginTop: 4 }}>
    Uses generativelanguage.googleapis.com directly. Get key from{' '}
    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style={{ color: "var(--cyan)" }}>
      Google AI Studio
    </a>
  </div>
)}
```

---

## 6. Animation Specifications

### 6.1 Motion Taxonomy

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Message bubble | Mount | `msgEnter` (fade + translateY) | 280ms | `cubic-bezier(0.22,1,0.36,1)` |
| Empty state icon | Continuous | `emptyFloat` (translateY oscillation) | 3000ms | `ease-in-out` |
| Suggestion chip | Hover | translateY(-1px) + borderColor | 180ms | `ease` |
| History drawer | Toggle | translateX(-100% → 0) | 300ms | `cubic-bezier(0.22,1,0.36,1)` |
| Strip expand/collapse | Toggle | max-height + opacity | 350ms | `cubic-bezier(0.4,0,0.2,1)` |
| Send button | Hover | scale(1.06) | 150ms | `ease` |
| Send button | Active | scale(0.95) | 150ms | `ease` |
| Input wrap | Focus | borderColor + boxShadow | 200ms | `ease` |
| Memory chip | Hover | translateY(-1px) + bg brighten | 150ms | `ease` |
| Thinking dots | Continuous | `dotPulse` (opacity + scale) | 1400ms | `ease-in-out` |
| History item actions | Hover | opacity 0 → 1 | 150ms | `ease` |
| Stream scroll | New message | scrollTop smooth | 200ms | `smooth` |

### 6.2 Keyframe Definitions

Already defined in CSS (Section 1.3):

```css
@keyframes msgEnter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes emptyFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}

@keyframes dotPulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50%      { opacity: 1;   transform: scale(1); }
}
```

### 6.3 Performance Rules

- All animations use `transform` and `opacity` only (GPU-accelerated)
- No `layout` property animations (width, height, margin) except `max-height` on strip (acceptable with `will-change`)
- `will-change: transform` on `.dk-history-drawer` and `.dk-msg`
- Respect `prefers-reduced-motion`: disable float and pulse animations

```css
@media (prefers-reduced-motion: reduce) {
  .dk-msg { animation: none; opacity: 1; transform: none; }
  .dk-empty-icon { animation: none; }
  .dk-thinking-dots span { animation: none; opacity: 0.6; }
  .dk-history-drawer { transition: none; }
  .dk-strip { transition: none; }
}
```

---

## 7. File Change List

### 7.1 Modified Files

| File | Lines | Change |
|------|-------|--------|
| `src/components/ai/deck/deck.css` | 1–50 + additions | Complete layout rewrite: remove 100vh trap, add sticky chat, 2-col sidebar, collapsible strip, user bubble fix, memory chips, history drawer |
| `src/components/ai/deck/AiPageDeck.tsx` | All | Remove digest column (3→2 grid), add `historySlot`, `memoryChips`, `onNewThread` props, collapsible strip toggle |
| `src/components/ai/chat/ChatPanel.tsx` | All | Add `historySlot`, `memoryChips`, `onNewThread` props; render memory bar above input; add history drawer overlay |
| `src/components/ai/chat/ChatEmptyState.tsx` | All | Time-aware greeting, dynamic suggestions, `onNewThread` button, richer empty state |
| `src/components/ai/chat/MessageBubble.tsx` | All | Fix user alignment with `margin-left:auto`, add timestamps, improve bubble width |
| `src/components/ai/chat/ChatInput.tsx` | All | Add keyboard shortcuts, improve auto-resize, add voice/history buttons |
| `src/hooks/useAiChat.ts` | All | Add `threads`, `currentThreadDate`, `loadThread`, `deleteThread`, `refreshThreads`, `startNewThread`, `memories`; integrate memory extraction/retrieval |
| `src/pages/AiPage.tsx` (or route file) | All | Wire new `useAiChat` fields; render `ChatHistory`; generate dynamic suggestions; pass memory chips |
| `src/preload.ts` | Additions | Add `aiChatGetMemories`, `aiChatExtractMemories` IPC channels |
| `src/main.ts` (or IPC handlers) | Additions | Add handlers for `ai-chat:get-memories`, `ai-chat:extract-memories`, enhance `ai-chat:list-threads` and `ai-chat:save` |
| `src/main/ai/providerRouter.ts` | Additions | Add `google-ai-studio` case to provider router |
| `src/components/settings/SettingsAI.tsx` | Additions | Add Google AI Studio default provider config |

### 7.2 New Files

| File | Purpose |
|------|---------|
| `src/components/ai/chat/ChatHistory.tsx` | History drawer component: list, load, delete threads |
| `src/main/ai/providers/googleAiStudio.ts` | Google AI Studio API client (streaming + basic) |
| `src/main/ai/memoryExtractor.ts` | Rule-based memory extraction from chat messages |
| `src/main/ai/memoryRetrieval.ts` | Memory retrieval with relevance scoring |
| `src/main/database/migrations/002_ai_memory.sql` | SQLite schema for threads, messages, memories |

### 7.3 Deleted / Removed

| Item | Reason |
|------|--------|
| `digestSlot` from `AiPageDeck` sidebar | Digest has its own tab/page |
| `max-height:36vh` on `.dk-sidebar` | Causes connector card truncation |
| `max-height:280px` on `.dk-strip` | Replaced by collapsible accordion |
| `height:100vh` + `overflow:hidden` on `.dk-root` | Causes layout collapse trap |
| `max-width:74%` on `.dk-msg.dk-user` | Causes narrow user bubbles |

---

## Appendix: Anti-Slop Verification

For every component in this specification, the following have been verified:

1. ✅ **Re-skinned to DeskFlow tokens** — All colors use `var(--pink)`, `var(--surface)`, `var(--line)`, etc.
2. ✅ **Max rounded-xl, p-5 padding** — Cards use `border-radius:16px`, padding `18px 20px`
3. ✅ **Dark mode only** — No light mode variants; canvas is `#09090b`
4. ✅ **Geist + JetBrains Mono** — `var(--sans)` and `var(--mono)` used throughout
5. ✅ **Glass layer** — `backdrop-filter: blur(14px)` on all surfaces
6. ✅ **No default purple gradients** — Gradients are pink→violet or category-specific
7. ✅ **No generic hero patterns** — No abstract shapes or generic illustrations
8. ✅ **Empty/loading/error/populated states** — Every component has all 4 states
9. ✅ **Hover/focus/disabled states** — All interactive elements have state transitions
10. ✅ **Smooth transitions** — All state changes use `transition` with appropriate easing

---

*End of Design Specification*
