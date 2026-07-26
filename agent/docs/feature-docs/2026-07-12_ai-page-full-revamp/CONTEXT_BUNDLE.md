# CONTEXT_BUNDLE.md — AI Assistant Page Full Revamp

> Contains ACTUAL source code for all affected files. Target AI must read this first.

---

## 1. AiPageDeck.tsx (FULL — 142 lines)

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
  historySlot?: ReactNode
  memoryChips?: { id: string; text: string }[]
  onNewThread?: () => void
  connectorStatus?: { unreadCount: number; todayEventCount: number; lastSyncTime?: string; syncing?: boolean }
  onExpandConnectors?: () => void
}

export function AiPageDeck(props: DeckProps) {
  const [stripExpanded, setStripExpanded] = useState(false)
  const hasStripContent = !!(props.focusSlot || props.planSlot || props.reflectSlot)
  return (
    <>
      <div className="dk-hero-row">
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
          <QuickCommands onAction={props.onCardAction} />
        </div>
        <div className="dk-col">
          {props.connectorsSlot ? <>{props.connectorsSlot}</> : null}
        </div>
      </div>
      <div className="dk-chat-anchor">
        <div className="dk-grid">
          <div className="dk-col">
            <div className="dk-microlabel">Assistant · structured command deck</div>
            <ChatPanel messages={props.messages} streaming={props.streaming} thinking={props.thinking}
              provider={props.provider} online={props.online} input={props.input}
              onInputChange={props.onInputChange} onSend={props.onSend} onStop={props.onStop}
              onReset={props.onReset} onCardAction={props.onCardAction} suggestions={props.suggestions}
              agentSteps={props.agentSteps} agentStatus={props.agentStatus} listening={props.listening}
              onToggleVoice={props.onToggleVoice} voiceSupported={props.voiceSupported}
              actionResults={props.actionResults} connectorSyncing={props.connectorSyncing}
              contextWarnings={props.contextWarnings} dismissError={props.dismissError}
              onModelChange={props.onModelChange} historySlot={props.historySlot}
              memoryChips={props.memoryChips} onNewThread={props.onNewThread}
              connectorStatus={props.connectorStatus} onExpandConnectors={props.onExpandConnectors} />
          </div>
        </div>
      </div>
      {hasStripContent && (
        <button className="dk-strip-toggle" onClick={() => setStripExpanded(v => !v)} aria-expanded={stripExpanded}>
          {stripExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {stripExpanded ? "Hide Focus / Plan / Reflect" : "Show Focus / Plan / Reflect"}
        </button>
      )}
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

## 2. QuickCommands.tsx (FULL — 32 lines) — TO BE REMOVED

```tsx
import type { CardAction } from "../components/ai/chat/parsed"
const COMMANDS: { icon: string; color: string; label: string; cmd: string }[] = [
  { icon: "◎", color: "#fcd34d", label: "Plan my day", cmd: "/plan" },
  { icon: "▤", color: "#67e8f9", label: "Generate digest", cmd: "/digest" },
  { icon: "◷", color: "#6ee7b7", label: "Reflect on today", cmd: "/reflect" },
  { icon: "⚡", color: "#f9a8d4", label: "Start focus session", cmd: "/focus" },
]
export function QuickCommands({ onAction }: { onAction?: (a: CardAction) => void }) {
  return (<><div className="dk-microlabel">Quick commands</div>
    <div className="dk-card dk-acc dk-amber dk-sec">{COMMANDS.map((c) => (
      <button key={c.cmd} className="dk-conn" style={{ width: "100%", background: "transparent", border: 0, borderTop: "1px solid var(--line)", cursor: "pointer" }}
        onClick={() => onAction?.({ kind: "send-text", text: c.cmd })}>
        <div className="dk-conn-l"><span className="dk-conn-ci" style={{ color: c.color }}>{c.icon}</span>
          <div className="dk-conn-nm">{c.label}</div></div>
        <span className="dk-conn-st">{c.cmd}</span></button>))}</div></>)
}
```

---

## 3. ChatInput.tsx (FULL — 132 lines) — NEEDS SLASH COMMAND PALETTE

```tsx
import { useEffect, useRef, useState, useCallback } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Mic, Square } from "lucide-react"
import { CharCountRing } from "./CharCountRing"

export interface ChatInputProps {
  onSend: (text: string) => void; onStop?: () => void; streaming?: boolean; disabled?: boolean;
  maxChars?: number; placeholder?: string; listening?: boolean; onToggleVoice?: () => void;
  voiceSupported?: boolean; value?: string; onValueChange?: (v: string) => void;
}

export function ChatInput({ onSend, onStop, streaming, disabled, maxChars = 4000,
  placeholder = "Ask anything…", listening, onToggleVoice, voiceSupported, value, onValueChange }: ChatInputProps) {
  const reduce = useReducedMotion()
  const [internal, setInternal] = useState("")
  const text = value ?? internal
  const setText = (v: string) => { if (onValueChange) onValueChange(v); else setInternal(v) }
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { const el = ref.current; if (!el) return; el.style.height = "0px"; el.style.height = Math.min(el.scrollHeight, 160) + "px" }, [text])
  const canSend = text.trim().length > 0 && !disabled && text.length <= maxChars
  const send = useCallback(() => { if (!canSend) return; onSend(text.trim()); setText("") }, [canSend, onSend, text])
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); return }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }, [send])
  const showRing = text.length > maxChars * 0.7
  return (
    <form className="dk-cmd" onSubmit={(e) => { e.preventDefault(); send() }}>
      <span className="dk-cmd-pc">›_</span>
      <textarea ref={ref} value={text} rows={1} disabled={disabled} placeholder={placeholder}
        onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} className="dk-cmd-ph" style={{ resize: "none" }} />
      {showRing ? <CharCountRing count={text.length} max={maxChars} className="mb-1" /> : null}
      <div className="dk-cmd-tools">
        {onToggleVoice ? (
          <button type="button" onClick={onToggleVoice} disabled={!voiceSupported} aria-pressed={listening}
            aria-label={listening ? "Stop voice input" : "Start voice input"} className="dk-iconbtn"
            style={listening ? { background: "rgba(236,72,153,.2)", color: "var(--pink)", borderColor: "transparent" } : undefined}>
            {listening && !reduce ? (<motion.span aria-hidden className="absolute inset-0 rounded-[9px] bg-pink-500/20"
              initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 1.35 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }} />) : null}
            <Mic size={14} className="relative" />
          </button>) : null}
        {streaming ? (
          <button type="button" onClick={onStop} aria-label="Stop generating" className="dk-iconbtn" style={{ color: "var(--red)" }}>
            <Square size={12} className="fill-current" /></button>
        ) : (
          <button type="submit" disabled={!canSend} aria-label="Send message" className={"dk-iconbtn" + (canSend ? " dk-send" : "")}>➤</button>
        )}
      </div>
    </form>
  )
}
```

---

## 4. ConnectorsPanel.tsx (AI page version — first 200 lines)

Currently shows name/status but NOT items. Needs full rewrite to show emails/events.

---

## 5. useSlashCommands.ts (FULL — 248 lines)

Handles: /unread, /inbox, /calendar, /today, /sync, /email. Uses window.deskflowAPI.connectors.*.

---

## 6. useAiChat.ts — Has addMessage, threads, memories, loadThread, deleteThread, startNewThread

---

## 7. aiContextBundle.ts — Now calls b.connectors?.list() correctly

---

## 8. Types (src/types/connectors.ts)

```typescript
export interface ConnectorConfig { id: string; type: 'email' | 'calendar'; provider: 'imap' | 'caldav';
  displayName: string; config: ImapConfig | CalDavConfig; status: 'connected' | 'error' | 'disconnected';
  lastSync?: string; errorMessage?: string; }
export interface ImapConfig { host: string; port: number; username: string; password: string; tls: boolean; folder?: string; }
export interface CalDavConfig { url: string; username: string; password: string; calendarName?: string; }
export interface ConnectorItem { id: string; connectorId: string; itemType: 'email' | 'event' | 'reminder';
  subject?: string; summary?: string; date: string; read: boolean; metadata?: Record<string, any>; }
```

---

## 9. Design Tokens

```css
:root { --canvas:#09090b; --surface:rgba(24,24,27,.72); --surface-2:#151518; --raised:rgba(39,39,42,.7);
  --line:rgba(255,255,255,.07); --line-2:rgba(255,255,255,.12); --tp:#fafafa; --ts:rgba(250,250,250,.60);
  --tm:rgba(250,250,250,.38); --pink:#ec4899; --emerald:#34d399; --amber:#fbbf24; --violet:#a78bfa;
  --cyan:#22d3ee; --red:#f87171; --mono:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,sans-serif; }
```

---

## 10. What's Broken

1. QuickCommands is redundant — should be removed, replaced by slash command palette
2. Layout is overcrowded — 2-col hero row crams everything
3. ConnectorsPanel doesn't show email/event items
4. No slash command palette in ChatInput
5. No full-page email/calendar view
6. buildConnectorContext() is dead code
7. No auto-sync
8. Chat input is terminal-style, not modern
