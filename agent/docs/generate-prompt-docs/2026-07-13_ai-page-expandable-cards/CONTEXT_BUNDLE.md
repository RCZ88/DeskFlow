# CONTEXT BUNDLE — AI Assistant Page Expandable Cards Redesign

> This file contains ALL source code the Architect AI needs. The Architect has NO access to the codebase. Everything must be here.

---

## What's Broken

1. The AI Assistant page layout is wrong — features are hidden behind toggles and tabs
2. The Daily Digest is a separate tab instead of a card
3. QuickCommands is redundant with slash commands
4. The strip toggle for Focus/Plan/Reflect is hard to discover
5. Connectors have their own toggle — inconsistent
6. No clear visual hierarchy below the chat

## What the User Wants

- Chat at the top (already works — keep as-is)
- Below chat: a grid of EXPANDABLE CARDS
- Each card: collapsed = icon + title + summary, expanded = full content
- Cards: Daily Digest, Connectors, Focus, Plan, Reflect
- Accordion behavior (one card expanded at a time)
- No tabs, no strips, no QuickCommands
- Chat history stays as slide-in drawer
- Slash commands stay as-is

---

## SOURCE CODE

### AiPageDeck.tsx (169 lines)
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
  onOpenSettings?: () => void
  onOpenHistory?: () => void
}

export function AiPageDeck(props: DeckProps) {
  const [stripExpanded, setStripExpanded] = useState(false)
  const [connectorsExpanded, setConnectorsExpanded] = useState(true)
  const hasStripContent = !!(props.focusSlot || props.planSlot || props.reflectSlot)
  const hasMetrics = !!(props.glanceMetrics && props.glanceMetrics.length > 0)
  const hasConnectorStatus = !!props.connectorStatus

  return (
    <>
      {(hasMetrics || hasConnectorStatus) && (
        <div className="dk-statusbar">
          {(props.glanceMetrics ?? []).map((m, i) => (
            <div key={i} className="dk-statusbar-item">
              <span className="dk-statusbar-label">{m.label}</span>
              <span className="dk-statusbar-value">{m.value}</span>
            </div>
          ))}
          {hasMetrics && hasConnectorStatus && <div className="dk-statusbar-sep" />}
          {props.connectorStatus && (
            <>
              <div className="dk-statusbar-item" onClick={props.onExpandConnectors}>
                <span className={`dk-statusbar-dot ${props.connectorStatus.syncing ? "pulse" : ""}`} />
                <span>{props.connectorStatus.unreadCount} unread</span>
              </div>
              <div className="dk-statusbar-item" onClick={props.onExpandConnectors}>
                <span className="dk-statusbar-dot" style={{ background: "var(--cyan)" }} />
                <span>{props.connectorStatus.todayEventCount} today</span>
              </div>
              {props.connectorStatus.lastSyncTime && (
                <div className="dk-statusbar-item dk-statusbar-synced">
                  Synced {props.connectorStatus.lastSyncTime}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {props.historySlot}

      <div className="dk-chat-card">
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
          memoryChips={props.memoryChips}
          onNewThread={props.onNewThread}
          connectorStatus={props.connectorStatus}
          onExpandConnectors={props.onExpandConnectors}
        />
      </div>

      {props.connectorsSlot && (
        <div className="dk-connectors-section">
          <button
            className="dk-strip-toggle"
            onClick={() => setConnectorsExpanded(v => !v)}
            aria-expanded={connectorsExpanded}
          >
            {connectorsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {connectorsExpanded ? "Hide Connectors" : "Show Connectors"}
          </button>
          <div
            className="dk-conn-collapse"
            style={{
              maxHeight: connectorsExpanded ? "2000px" : "0",
              opacity: connectorsExpanded ? 1 : 0,
            }}
          >
            {props.connectorsSlot}
          </div>
        </div>
      )}

      <QuickCommands onAction={props.onCardAction} />

      {hasStripContent && (
        <button
          className="dk-strip-toggle"
          onClick={() => setStripExpanded(v => !v)}
          aria-expanded={stripExpanded}
        >
          {stripExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {stripExpanded ? "Hide Focus / Plan / Reflect" : "Show Focus / Plan / Reflect"}
        </button>
      )}

      <div className={`dk-strip ${stripExpanded ? "expanded" : "collapsed"}`}>
        {props.focusSlot ? <div className="dk-strip-card">{props.focusSlot}</div> : null}
        {props.planSlot ? <div className="dk-strip-card">{props.planSlot}</div> : null}
        {props.reflectSlot ? <div className="dk-strip-card">{props.reflectSlot}</div> : null}
      </div>
    </>
  )
}
```

### ChatPanel.tsx (191 lines)
```tsx
import { useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import { MessageBubble } from "./MessageBubble"
import { ThinkingIndicator } from "./ThinkingIndicator"
import { AgentProgressBar, type AgentStep } from "./AgentProgressBar"
import { ChatEmptyState, type ChatSuggestion } from "./ChatEmptyState"
import { ChatInput } from "./ChatInput"
import type { CardAction, ParsedMessage } from "./parsed"
import type { ReactNode } from "react"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: string
  parsed?: ParsedMessage
}

export interface ChatPanelProps {
  messages: ChatMessage[]
  streaming?: boolean
  thinking?: boolean
  agentSteps?: AgentStep[]
  agentStatus?: string
  suggestions?: ChatSuggestion[]
  provider?: string
  online?: boolean
  input?: string
  onInputChange?: (v: string) => void
  onSend: (text: string) => void
  onStop?: () => void
  onReset?: () => void
  listening?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
  onCardAction?: (a: CardAction) => void
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
  contextWarnings?: string[]
  dismissError?: (index: number) => void
  onModelChange?: (provider: string, model: string) => void
  historySlot?: ReactNode
  memoryChips?: { id: string; text: string }[]
  onNewThread?: () => void
  connectorStatus?: { unreadCount: number; todayEventCount: number; lastSyncTime?: string; syncing?: boolean }
  onExpandConnectors?: () => void
}

export function ChatPanel({
  messages, streaming, thinking, agentSteps, agentStatus, suggestions,
  provider, online = true, input, onInputChange, onSend, onStop, onReset,
  listening, onToggleVoice, voiceSupported, onCardAction, actionResults,
  connectorSyncing, contextWarnings, dismissError, onModelChange,
  historySlot, memoryChips, onNewThread, connectorStatus, onExpandConnectors,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const lastAssistant = [...messages].reverse().find((mm) => mm.role === "assistant")
  const [empty, setEmpty] = useState(messages.length === 0)

  useEffect(() => { setEmpty(messages.length === 0) }, [messages.length])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight
  }, [messages, thinking, streaming])

  return (
    <div className="dk-chat-inner">
      {historySlot}
      <div className="dk-deckhead">
        <div className="dk-t">
          <span className="dk-deck-ic">✦</span>
          DeskFlow Assistant
          <span className="dk-deck-meta">{provider ? "via " + provider : "copilot"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={"dk-chip" + (online ? " dk-live" : "")} style={{ height: 26, fontSize: 11, padding: "0 10px" }}>
            <span className="dk-dot" />
            {online ? "Online" : "Offline"}
          </span>
          {onReset && !empty ? (
            <button type="button" onClick={onReset} aria-label="Clear conversation"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300">
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>
      {contextWarnings && contextWarnings.length > 0 && (
        <div className="mx-3 mb-1 space-y-1">
          {contextWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300 ring-1 ring-amber-500/15">
              <span className="flex-1">{w}</span>
              {dismissError && <button className="mt-0.5 text-amber-400 hover:text-amber-200" onClick={() => dismissError(i)}>×</button>}
            </div>
          ))}
        </div>
      )}
      <div ref={scrollRef} onScroll={onScroll} className={`dk-stream${empty ? " dk-stream--empty" : ""}`}>
        {empty ? (
          <ChatEmptyState suggestions={suggestions} onPick={(p) => onInputChange?.(p)} onNewThread={onNewThread} />
        ) : (
          messages.map((mm) => (
            <MessageBubble key={mm.id} role={mm.role} content={mm.content} timestamp={mm.timestamp}
              parsed={mm.parsed} onAction={onCardAction} actionResults={actionResults}
              connectorSyncing={connectorSyncing} streaming={Boolean(streaming) && mm.id === lastAssistant?.id} />
          ))
        )}
        {thinking ? <ThinkingIndicator /> : null}
      </div>
      {memoryChips && memoryChips.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "var(--tm)", fontFamily: "var(--mono)" }}>Memories</span>
          {memoryChips.map((chip) => (
            <span key={chip.id} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(167,139,250,.10)", border: "1px solid rgba(167,139,250,.16)", color: "var(--violet)", fontFamily: "var(--mono)" }} title={chip.text}>
              {chip.text.length > 28 ? chip.text.slice(0, 28) + "…" : chip.text}
            </span>
          ))}
        </div>
      )}
      <div className="dk-cmdbar">
        <AgentProgressBar visible={Boolean(agentSteps?.length) || Boolean(agentStatus)} steps={agentSteps} statusText={agentStatus} />
        <ChatInput onSend={onSend} onStop={onStop} streaming={streaming} value={input}
          onChange={onInputChange} listening={listening} onToggleVoice={onToggleVoice} voiceSupported={voiceSupported} />
      </div>
    </div>
  )
}
```

### ChatInput.tsx (163 lines)
```tsx
import { useEffect, useRef, useState, useCallback } from "react"
import { Mic, Square, Send } from "lucide-react"
import { SlashCommandPalette } from "./SlashCommandPalette"

export interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  onStop?: () => void
  streaming?: boolean
  listening?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
}

const SLASH_COMMANDS = [
  { id: "unread", name: "/unread", desc: "Show unread emails", icon: "📧", category: "email" },
  { id: "inbox", name: "/inbox", desc: "Show recent emails", icon: "📥", category: "email" },
  { id: "calendar", name: "/calendar", desc: "Show upcoming events", icon: "📅", category: "calendar" },
  { id: "today", name: "/today", desc: "Today schedule + emails", icon: "📋", category: "combined" },
  { id: "sync", name: "/sync", desc: "Sync all connectors", icon: "🔄", category: "action" },
  { id: "email", name: "/email", desc: "Search emails", icon: "🔍", category: "email" },
  { id: "plan", name: "/plan", desc: "Plan my day", icon: "📝", category: "ai" },
  { id: "digest", name: "/digest", desc: "Generate digest", icon: "📰", category: "ai" },
  { id: "reflect", name: "/reflect", desc: "Reflect on today", icon: "🪞", category: "ai" },
  { id: "focus", name: "/focus", desc: "Start focus session", icon: "🎯", category: "ai" },
]

export function ChatInput(props: ChatInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteIndex, setPaletteIndex] = useState(0)
  const [filteredCommands, setFilteredCommands] = useState(SLASH_COMMANDS)

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 140) + "px"
  }, [props.value])

  const canSend = props.value.trim().length > 0 && !props.streaming

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (paletteOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIndex(i => (i + 1) % filteredCommands.length); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setPaletteIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length); return }
      if (e.key === "Enter") { e.preventDefault(); const cmd = filteredCommands[paletteIndex]; if (cmd) { props.onChange(cmd.name + " "); setPaletteOpen(false); taRef.current?.focus() }; return }
      if (e.key === "Escape") { setPaletteOpen(false); return }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canSend) props.onSend(props.value.trim()) }
  }, [paletteOpen, filteredCommands, paletteIndex, canSend, props])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    props.onChange(val)
    if (val.startsWith("/") && !props.streaming) {
      const query = val.slice(1).toLowerCase()
      const filtered = SLASH_COMMANDS.filter(c => c.name.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query))
      setFilteredCommands(filtered.length > 0 ? filtered : SLASH_COMMANDS)
      setPaletteOpen(true)
      setPaletteIndex(0)
    } else { setPaletteOpen(false) }
  }, [props])

  const handleSelectCommand = useCallback((cmd: typeof SLASH_COMMANDS[0]) => {
    props.onChange(cmd.name + " ")
    setPaletteOpen(false)
    taRef.current?.focus()
  }, [props])

  return (
    <div style={{ position: "relative" }}>
      {paletteOpen && (
        <SlashCommandPalette commands={filteredCommands} activeIndex={paletteIndex} onSelect={handleSelectCommand} onClose={() => setPaletteOpen(false)} />
      )}
      <div className="dk-input-wrap">
        <textarea ref={taRef} className="dk-textarea" rows={1} value={props.value} onChange={handleChange}
          onKeyDown={handleKeyDown} placeholder="Ask anything, type / for commands..." disabled={props.streaming} />
        <div className="dk-input-tools">
          {props.onToggleVoice && (
            <button type="button" onClick={props.onToggleVoice} disabled={!props.voiceSupported} className="dk-iconbtn"
              style={props.listening ? { background: "rgba(236,72,153,.15)", color: "var(--pink)", borderColor: "transparent" } : undefined}
              title={props.listening ? "Stop voice input" : "Start voice input"}>
              <Mic size={14} />
            </button>
          )}
          {props.streaming ? (
            <button type="button" onClick={props.onStop} className="dk-iconbtn" style={{ color: "var(--red)" }} title="Stop generating">
              <Square size={12} className="fill-current" />
            </button>
          ) : (
            <button type="button" onClick={() => canSend && props.onSend(props.value.trim())} disabled={!canSend}
              className="dk-iconbtn dk-send" title="Send message">
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

### MessageBubble.tsx (56 lines)
```tsx
import { ParsedMessageRouter } from "./ParsedMessageRouter"
import { TypewriterText } from "./TypewriterText"
import type { CardAction, ParsedMessage } from "./parsed"

export interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  streaming?: boolean
  timestamp?: string
  parsed?: ParsedMessage
  onAction?: (a: CardAction) => void
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
}

export function MessageBubble(props: MessageBubbleProps) {
  const { role, content, streaming, timestamp, parsed, onAction, actionResults, connectorSyncing } = props
  const isUser = role === "user"
  const hasCard = !!parsed && parsed.type !== "text"
  const timeStr = timestamp ? timestamp : null

  return (
    <div className={`dk-msg ${isUser ? "dk-user" : "dk-ai"}`}>
      <div className={`dk-av ${isUser ? "dk-me" : "dk-ai"}`}>{isUser ? "CZ" : "✦"}</div>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="dk-bubble">
          {streaming && !isUser ? (
            <TypewriterText text={content} />
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
          )}
        </div>
        {hasCard && (
          <div style={{ width: "100%", marginTop: content ? 11 : 0 }}>
            <ParsedMessageRouter parsed={parsed as ParsedMessage} onAction={onAction} actionResults={actionResults} connectorSyncing={connectorSyncing} />
          </div>
        )}
        {timeStr && (
          <div className="dk-msg-time" style={{ textAlign: isUser ? "right" : "left" }}>{timeStr}</div>
        )}
      </div>
    </div>
  )
}
```

### ChatEmptyState.tsx (103 lines)
```tsx
import { useMemo } from "react"
import { Plus } from "lucide-react"

export interface ChatSuggestion { id: string; label: string; prompt: string; icon?: string }

interface ChatEmptyStateProps { suggestions?: ChatSuggestion[]; onPick?: (prompt: string) => void; onNewThread?: () => void }

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
  if (hour < 22) return "🌅"
  return "🌙"
}

const DEFAULTS: ChatSuggestion[] = [
  { id: "plan", label: "Plan my day", prompt: "Help me plan my day based on my goals.", icon: "📝" },
  { id: "summary", label: "Summarize progress", prompt: "Summarize my progress this week.", icon: "📊" },
  { id: "focus", label: "What should I focus on?", prompt: "What is the most important thing to focus on right now?", icon: "🎯" },
]

export function ChatEmptyState(props: ChatEmptyStateProps) {
  const greeting = useMemo(getGreeting, [])
  const timeIcon = useMemo(getTimeIcon, [])
  const suggestions = props.suggestions ?? DEFAULTS

  return (
    <div className="dk-empty">
      <div className="dk-empty-icon">{timeIcon}</div>
      <h3>{greeting} — How can I help?</h3>
      <p>I can plan your day, check your emails, manage your calendar, summarize progress, or answer questions about your work.</p>
      <div className="dk-suggestions">
        {suggestions.map((s, i) => (
          <button key={s.id} className="dk-chip" onClick={() => props.onPick?.(s.prompt)} style={{ animationDelay: `${i * 60}ms` }}>
            {s.icon && <span style={{ marginRight: 4 }}>{s.icon}</span>}{s.label}
          </button>
        ))}
      </div>
      {props.onNewThread && (
        <button onClick={props.onNewThread} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ts)", cursor: "pointer", fontFamily: "var(--mono)", letterSpacing: "0.5px", marginTop: 4, transition: "all 0.2s ease" }}>
          <Plus size={12} /> New Thread
        </button>
      )}
    </div>
  )
}
```

### ConnectorsPanel.tsx (462 lines)
```tsx
import { useState, useEffect, useCallback } from "react"
import { Mail, CalendarDays, RefreshCw, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, Search, X, Plus } from "lucide-react"
import type { ConnectorConfig, ConnectorItem } from "../../../types/connectors"
import { useConnectorItems } from "../../../hooks/useConnectorItems"
import { ConnectorItemModal } from "./ConnectorItemModal"

export interface Connector { id: string; name: string; status: "ready" | "busy" | "error" | "idle"; detail?: string; itemCount?: number; iconUrl?: string; type?: string }

interface ConnectorsPanelProps {
  state?: "loading" | "error" | "empty" | "ready"
  connectors: Connector[]
  errorMessage?: string
  onRetry?: () => void
  onAdd?: () => void
  onSync?: (id: string) => void | Promise<void>
  onToast?: (msg: string, type?: "success" | "error" | "info") => void
  onRefresh?: () => void
  onReply?: (connectorId: string, itemId: string, draft: string) => Promise<void>
  onMarkRead?: (connectorId: string, itemId: string, read: boolean) => Promise<void>
  onDelete?: (connectorId: string) => Promise<void>
  onTest?: (id: string) => Promise<void>
  onSyncAll?: () => Promise<void>
}

export function ConnectorsPanel(props: ConnectorsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "email" | "calendar">("all")
  const [syncingAll, setSyncingAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [modalItem, setModalItem] = useState<{ item: ConnectorItem; type: "email" | "calendar"; connectorId: string } | null>(null)

  const handleSyncAll = useCallback(async () => {
    if (!props.onSync) return
    setSyncingAll(true)
    try {
      for (const c of props.connectors) { if (c.status === "ready" || c.status === "idle") await props.onSync(c.id) }
      props.onRefresh?.()
      props.onToast?.("All connectors synced", "success")
    } catch (e: any) { props.onToast?.(e.message || "Sync failed", "error") }
    finally { setSyncingAll(false) }
  }, [props.onSync, props.connectors, props.onRefresh, props.onToast])

  const filteredConnectors = props.connectors.filter(c => filterType === "all" || c.type === filterType)

  if (props.state === "loading") {
    return (
      <div className="dk-card dk-acc dk-cyan" style={{ minHeight: 180 }}>
        <div className="dk-microlabel" style={{ marginBottom: 12 }}>Connectors</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2].map(i => (<div key={i} style={{ height: 44, borderRadius: 10, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }} />))}
        </div>
      </div>
    )
  }

  if (props.state === "error" || props.errorMessage) {
    return (
      <div className="dk-card dk-acc dk-cyan">
        <div className="dk-microlabel" style={{ marginBottom: 10 }}>Connectors</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--red)", marginBottom: 10 }}>
          <AlertCircle size={14} />{props.errorMessage}
        </div>
        {props.onRetry && <button onClick={props.onRetry} className="dk-topbar-btn">Retry</button>}
      </div>
    )
  }

  if (props.state === "empty" || filteredConnectors.length === 0) {
    return (
      <div className="dk-card dk-acc dk-cyan">
        <div className="dk-microlabel" style={{ marginBottom: 10 }}>Connectors</div>
        <div style={{ textAlign: "center", padding: "20px 10px" }}>
          <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>🔌</div>
          <div style={{ fontSize: 12, color: "var(--tm)", marginBottom: 4 }}>No connectors configured</div>
          <div style={{ fontSize: 11, color: "var(--tm)", opacity: 0.7 }}>Add email or calendar in Settings</div>
          {props.onAdd && (
            <button onClick={props.onAdd} style={{ marginTop: 10, fontSize: 11, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--cyan)", background: "rgba(34,211,238,.12)", color: "var(--cyan)", cursor: "pointer", fontFamily: "var(--mono)" }}>
              <Plus size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Add your first connector
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="dk-card dk-acc dk-cyan">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="dk-microlabel">Connectors</div>
          <div style={{ display: "flex", gap: 6 }}>
            {props.onRefresh && <button onClick={props.onRefresh} className="dk-topbar-btn" style={{ height: 26, padding: "0 10px" }}><RefreshCw size={11} /> Refresh</button>}
            {props.onAdd && <button onClick={props.onAdd} className="dk-topbar-btn" style={{ height: 26, padding: "0 10px" }}><Plus size={11} /> Add</button>}
            {props.onSync && <button onClick={handleSyncAll} disabled={syncingAll} className="dk-topbar-btn" style={{ height: 26, padding: "0 10px" }}>{syncingAll ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />} Sync All</button>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>
            <Search size={12} color="var(--tm)" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--tp)", fontSize: 12, fontFamily: "var(--sans)" }} />
            {searchQuery && <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tm)" }}><X size={12} /></button>}
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)} style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ts)", fontSize: 11, fontFamily: "var(--mono)", padding: "6px 10px", cursor: "pointer" }}>
            <option value="all">All</option><option value="email">Email</option><option value="calendar">Calendar</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredConnectors.map(connector => (
            <ConnectorCard key={connector.id} connector={connector} isExpanded={expandedId === connector.id}
              onToggle={() => setExpandedId(expandedId === connector.id ? null : connector.id)}
              onSync={props.onSync ? () => props.onSync!(connector.id) : undefined}
              onDelete={props.onDelete ? async () => { setDeletingId(connector.id); await props.onDelete!(connector.id); setDeletingId(null) } : undefined}
              onTest={props.onTest ? () => props.onTest!(connector.id) : undefined}
              searchQuery={searchQuery} isDeleting={deletingId === connector.id}
              onItemClick={(item) => setModalItem({ item, type: connector.type === "email" ? "email" : "calendar", connectorId: connector.id })} />
          ))}
        </div>
      </div>
      {modalItem && (
        <ConnectorItemModal item={modalItem.item} connectorType={modalItem.type} onClose={() => setModalItem(null)}
          onReply={props.onReply ? (itemId, draft) => props.onReply!(modalItem.connectorId, itemId, draft) : undefined}
          onMarkRead={props.onMarkRead ? (itemId, read) => props.onMarkRead!(modalItem.connectorId, itemId, read) : undefined}
          onDelete={props.onDelete ? () => props.onDelete!(modalItem.connectorId) : undefined} />
      )}
    </>
  )
}

interface ConnectorCardProps { connector: Connector; isExpanded: boolean; onToggle: () => void; onSync?: () => void | Promise<void>; onDelete?: () => void | Promise<void>; onTest?: () => void | Promise<void>; searchQuery: string; isDeleting: boolean; onItemClick: (item: ConnectorItem) => void }

function ConnectorCard(props: ConnectorCardProps) {
  const { connector, isExpanded } = props
  const [syncing, setSyncing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const itemsHook = useConnectorItems(connector.id)
  const isEmail = connector.type === "email"
  const statusColor = connector.status === "ready" ? "var(--emerald)" : connector.status === "error" ? "var(--red)" : "var(--tm)"

  useEffect(() => { if (isExpanded) itemsHook.load({ search: props.searchQuery || undefined, limit: 10 }) }, [isExpanded, props.searchQuery])

  const handleSync = useCallback(async () => {
    if (!props.onSync) return
    setSyncing(true)
    try { await props.onSync(); if (isExpanded) itemsHook.load({ search: props.searchQuery || undefined, limit: 10 }) }
    finally { setSyncing(false) }
  }, [props.onSync, isExpanded, props.searchQuery])

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface-2)", overflow: "hidden", transition: "border-color 0.2s ease" }}>
      <div onClick={props.onToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", userSelect: "none" }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: isEmail ? "rgba(236,72,153,.12)" : "rgba(34,211,238,.12)", border: `1px solid ${isEmail ? "rgba(236,72,153,.2)" : "rgba(34,211,238,.2)"}`, display: "grid", placeItems: "center" }}>
          {isEmail ? <Mail size={13} color="var(--pink)" /> : <CalendarDays size={13} color="var(--cyan)" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tp)", lineHeight: 1.3 }}>{connector.name}</div>
          <div style={{ fontSize: 10, color: "var(--tm)", fontFamily: "var(--mono)", display: "flex", gap: 8, marginTop: 2 }}>
            <span style={{ color: statusColor }}>● {connector.status}</span>
            {connector.itemCount != null && <span>{connector.itemCount} items</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {props.onSync && <button onClick={(e) => { e.stopPropagation(); handleSync() }} disabled={syncing} className="dk-iconbtn" style={{ width: 24, height: 24 }} title="Sync">{syncing ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}</button>}
          {props.onTest && <button onClick={(e) => { e.stopPropagation(); props.onTest!() }} className="dk-iconbtn" style={{ width: 24, height: 24 }} title="Test connection"><AlertCircle size={11} /></button>}
          {props.onDelete && <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }} disabled={props.isDeleting} className="dk-iconbtn" style={{ width: 24, height: 24 }} title="Delete">{props.isDeleting ? <Loader2 size={11} className="spin" /> : <Trash2 size={11} />}</button>}
          {isExpanded ? <ChevronUp size={14} color="var(--tm)" /> : <ChevronDown size={14} color="var(--tm)" />}
        </div>
      </div>
      {showDeleteConfirm && (
        <div style={{ padding: "8px 12px", background: "rgba(248,113,113,.06)", borderTop: "1px solid rgba(248,113,113,.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--red)" }}>Delete this connector?</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowDeleteConfirm(false)} className="dk-topbar-btn" style={{ height: 26, padding: "0 10px" }}>Cancel</button>
            <button onClick={() => { setShowDeleteConfirm(false); props.onDelete!() }} className="dk-topbar-btn" style={{ height: 26, padding: "0 10px", color: "var(--red)", borderColor: "rgba(248,113,113,.3)" }}>Delete</button>
          </div>
        </div>
      )}
      {isExpanded && (
        <div style={{ borderTop: "1px solid var(--line)", maxHeight: 320, overflowY: "auto", padding: "8px 0" }}>
          {itemsHook.state.status === "loading" ? (
            <div style={{ padding: 16, textAlign: "center" }}><Loader2 size={16} color="var(--tm)" className="spin" /></div>
          ) : itemsHook.state.status === "error" ? (
            <div style={{ padding: 12, fontSize: 11, color: "var(--red)", textAlign: "center" }}>{"message" in itemsHook.state ? itemsHook.state.message : "Error"}</div>
          ) : itemsHook.state.status === "ready" && itemsHook.state.data.items.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: "var(--tm)" }}>No items found. Try syncing.</div>
          ) : itemsHook.state.status === "ready" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {itemsHook.state.data.items.map((item: ConnectorItem) => (
                <ConnectorItemRow key={item.id} item={item} onClick={() => props.onItemClick(item)} />
              ))}
              {itemsHook.state.data.hasMore && (
                <button onClick={() => itemsHook.load({ offset: itemsHook.state.data.offset, limit: 10 })} style={{ margin: "8px auto 4px", fontSize: 10, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--tm)", cursor: "pointer", fontFamily: "var(--mono)" }}>Load more</button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function ConnectorItemRow({ item, onClick }: { item: ConnectorItem; onClick: () => void }) {
  const isEmail = item.itemType === "email"
  const isUnread = item.read === false
  const dateStr = item.date ? timeAgo(new Date(item.date)) : ""
  const fromAddr = item.metadata?.from ? ` — ${item.metadata.from}` : ""
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", borderRadius: 6, transition: "background 0.15s ease", cursor: "pointer" }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--raised)" }} onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 5, background: isUnread ? "var(--pink)" : "transparent", flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: isUnread ? 600 : 400, color: isUnread ? "var(--tp)" : "var(--ts)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.subject || item.summary || "(no subject)"}</div>
        {item.summary && <div style={{ fontSize: 10.5, color: "var(--tm)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.summary.slice(0, 80)}{item.summary.length > 80 ? "..." : ""}{fromAddr}</div>}
      </div>
      <div style={{ fontSize: 9.5, color: "var(--tm)", fontFamily: "var(--mono)", flex: "none", whiteSpace: "nowrap" }}>{dateStr}</div>
    </div>
  )
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
```

### ConnectorItemModal.tsx (237 lines)
```tsx
import { useState } from "react"
import { X, Reply, Trash2, Check, Mail, CalendarDays, Send, Loader2 } from "lucide-react"
import type { ConnectorItem } from "../../../types/connectors"

interface ConnectorItemModalProps { item: ConnectorItem; connectorType: "email" | "calendar"; onClose: () => void; onReply?: (itemId: string, draft: string) => Promise<void>; onMarkRead?: (itemId: string, read: boolean) => Promise<void>; onDelete?: (itemId: string) => Promise<void> }

export function ConnectorItemModal(props: ConnectorItemModalProps) {
  const { item, connectorType } = props
  const [replyMode, setReplyMode] = useState(false)
  const [replyDraft, setReplyDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [marking, setMarking] = useState(false)
  const isEmail = connectorType === "email"
  const isUnread = item.read === false
  const fromAddr = item.metadata?.from || ""
  const dateStr = item.date ? new Date(item.date).toLocaleString() : ""
  const startTime = item.metadata?.startTime
  const endTime = item.metadata?.endTime

  const handleReply = async () => { if (!replyDraft.trim() || !props.onReply) return; setSending(true); try { await props.onReply(item.id, replyDraft); setReplyMode(false); setReplyDraft("") } finally { setSending(false) } }
  const handleMarkRead = async () => { if (!props.onMarkRead) return; setMarking(true); try { await props.onMarkRead(item.id, !isUnread) } finally { setMarking(false) } }

  return (
    <div className="dk-modal-overlay" onClick={props.onClose}>
      <div className="dk-modal" onClick={e => e.stopPropagation()}>
        <div className="dk-modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: isEmail ? "rgba(236,72,153,.12)" : "rgba(34,211,238,.12)", border: `1px solid ${isEmail ? "rgba(236,72,153,.2)" : "rgba(34,211,238,.2)"}`, display: "grid", placeItems: "center" }}>
              {isEmail ? <Mail size={14} color="var(--pink)" /> : <CalendarDays size={14} color="var(--cyan)" />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tp)" }}>{item.subject || item.summary || "(no subject)"}</div>
              <div style={{ fontSize: 11, color: "var(--tm)", fontFamily: "var(--mono)", marginTop: 2 }}>{isEmail ? fromAddr : dateStr}</div>
            </div>
          </div>
          <button onClick={props.onClose} className="dk-iconbtn" style={{ width: 28, height: 28 }}><X size={14} /></button>
        </div>
        <div className="dk-modal-body">
          {isEmail ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "8px 12px", fontSize: 12, color: "var(--ts)", marginBottom: 16, padding: 12, background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>From</span><span>{fromAddr || "—"}</span>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Date</span><span>{dateStr}</span>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Status</span>
                <span style={{ color: isUnread ? "var(--pink)" : "var(--emerald)" }}>{isUnread ? "● Unread" : "✓ Read"}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--tp)", whiteSpace: "pre-wrap", padding: 4 }}>{item.summary || "(no content)"}</div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "8px 12px", fontSize: 12, color: "var(--ts)", marginBottom: 16, padding: 12, background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Start</span><span>{startTime || dateStr}</span>
                {endTime && <><span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>End</span><span>{endTime}</span></>}
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Calendar</span><span>{item.connectorId}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--tp)" }}>{item.summary || "(no description)"}</div>
            </>
          )}
          {replyMode && (
            <div style={{ marginTop: 20, padding: 14, background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
              <div style={{ fontSize: 11, color: "var(--tm)", fontFamily: "var(--mono)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px" }}>Reply</div>
              <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)} placeholder="Type your reply..." style={{ width: "100%", minHeight: 100, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, color: "var(--tp)", fontSize: 13, fontFamily: "var(--sans)", resize: "vertical", outline: "none" }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                <button onClick={() => setReplyMode(false)} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--ts)", cursor: "pointer", fontFamily: "var(--mono)" }}>Cancel</button>
                <button onClick={handleReply} disabled={!replyDraft.trim() || sending} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--emerald)", color: "#0b0b0d", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, opacity: !replyDraft.trim() || sending ? 0.5 : 1 }}>
                  {sending ? <Loader2 size={11} className="spin" /> : <Send size={11} />} Send
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="dk-modal-foot">
          {isEmail && (
            <>
              <button onClick={() => setReplyMode(!replyMode)} className="dk-topbar-btn" style={{ height: 32 }}><Reply size={12} /> Reply</button>
              <button onClick={handleMarkRead} disabled={marking} className="dk-topbar-btn" style={{ height: 32 }}>{marking ? <Loader2 size={12} className="spin" /> : <Check size={12} />} {isUnread ? "Mark Read" : "Mark Unread"}</button>
            </>
          )}
          {props.onDelete && <button onClick={() => props.onDelete?.(item.id)} className="dk-topbar-btn" style={{ height: 32, color: "var(--red)", borderColor: "rgba(248,113,113,.3)" }}><Trash2 size={12} /> Delete</button>}
        </div>
      </div>
    </div>
  )
}
```

### SlashCommandPalette.tsx (89 lines)
```tsx
import { useEffect, useRef } from "react"
import { Command } from "lucide-react"

interface SlashCommand { id: string; name: string; desc: string; icon: string; category: string }
interface SlashCommandPaletteProps { commands: SlashCommand[]; activeIndex: number; onSelect: (cmd: SlashCommand) => void; onClose: () => void }

export function SlashCommandPalette(props: SlashCommandPaletteProps) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => { const el = listRef.current; if (!el) return; const active = el.children[props.activeIndex] as HTMLElement; if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" }) }, [props.activeIndex])

  const grouped = props.commands.reduce((acc, cmd) => { if (!acc[cmd.category]) acc[cmd.category] = []; acc[cmd.category].push(cmd); return acc }, {} as Record<string, SlashCommand[]>)
  const categoryLabels: Record<string, string> = { email: "Email", calendar: "Calendar", combined: "Combined", action: "Actions", ai: "AI Assist" }

  return (
    <div className="dk-cmd-palette">
      <div className="dk-cmd-palette-head"><Command size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} /> Commands - Arrow keys to navigate, Enter to select, Esc to close</div>
      <div ref={listRef} style={{ maxHeight: 280, overflowY: "auto" }}>
        {Object.entries(grouped).map(([category, cmds]) => (
          <div key={category}>
            <div style={{ padding: "6px 14px 2px", fontSize: 9, color: "var(--tm)", fontFamily: "var(--mono)", letterSpacing: "1px", textTransform: "uppercase" }}>{categoryLabels[category] || category}</div>
            {cmds.map((cmd) => {
              const globalIdx = props.commands.indexOf(cmd)
              const isActive = globalIdx === props.activeIndex
              return (
                <div key={cmd.id} className={`dk-cmd-item ${isActive ? "active" : ""}`} onClick={() => props.onSelect(cmd)}>
                  <div className="dk-cmd-item-icon">{cmd.icon}</div>
                  <div className="dk-cmd-item-text"><div className="dk-cmd-item-name">{cmd.name}</div><div className="dk-cmd-item-desc">{cmd.desc}</div></div>
                  {isActive && <span className="dk-cmd-item-shortcut">Enter</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### ChatHistory.tsx (119 lines)
```tsx
import { useState, useCallback, useRef, useEffect } from "react"
import { X, Plus, Trash2, MessageSquare } from "lucide-react"

interface Thread { threadDate: string; title?: string; messageCount: number; lastMessageAt?: string; preview?: string }
interface ChatHistoryProps { open: boolean; onClose: () => void; threads: Thread[]; currentThreadDate?: string; onLoadThread: (date: string) => void; onDeleteThread: (date: string) => void; onNewThread: () => void }

export function ChatHistory(props: ChatHistoryProps) {
  const [deletingDate, setDeletingDate] = useState<string | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDelete = useCallback((date: string) => {
    if (deletingDate === date) {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
      props.onDeleteThread(date)
      setDeletingDate(null)
    } else {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
      setDeletingDate(date)
      deleteTimerRef.current = setTimeout(() => setDeletingDate(null), 3000)
    }
  }, [deletingDate, props.onDeleteThread])

  useEffect(() => { return () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current) } }, [])

  const formatDate = (d: string) => { try { return new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) } catch { return d } }

  return (
    <div className={`dk-history-drawer ${props.open ? "open" : ""}`}>
      <div className="dk-history-head">
        <h4>Chat History</h4>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={props.onNewThread} className="dk-topbar-btn" style={{ height: 28, padding: "0 8px" }}><Plus size={12} /></button>
          <button onClick={props.onClose} className="dk-topbar-btn" style={{ height: 28, padding: "0 8px" }}><X size={12} /></button>
        </div>
      </div>
      <div className="dk-history-list">
        {props.threads.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--tm)" }}>
            <MessageSquare size={20} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            No history yet
          </div>
        ) : props.threads.map(t => (
          <div key={t.threadDate} className={`dk-history-item ${t.threadDate === props.currentThreadDate ? "active" : ""}`}
            onClick={() => props.onLoadThread(t.threadDate)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dk-h-date">{formatDate(t.threadDate)}</div>
              <div className="dk-h-meta">{t.messageCount} messages{t.preview ? ` — ${t.preview.slice(0, 40)}` : ""}</div>
            </div>
            <div className="dk-h-actions">
              <button onClick={(e) => { e.stopPropagation(); handleDelete(t.threadDate) }} className="dk-iconbtn" style={{ width: 24, height: 24, ...(deletingDate === t.threadDate ? { color: "var(--red)", borderColor: "rgba(248,113,113,.3)" } : {}) }}>
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### parsed.ts (242 lines)
```tsx
import type { AccentKey } from "../tokens"

export interface ParsedGoal { title: string; category?: string; reason?: string; priority?: number }
export interface PlanChange { action: "add" | "modify" | "complete"; goal: { title: string; priority?: number; category?: string } }
export interface StatMetric { label: string; value: number; change?: number; icon?: string; format?: "number" | "duration" | "percent" | "hours" }
export interface ActionItem { label: string; description?: string; priority?: number; actionButton?: { label: string; ipc: string; payload?: Record<string, unknown> } }
export interface SourceLink { title: string; url: string }
export interface ConnectorStatusItem { name: string; status: "connected" | "error" | "syncing" | "idle" | string; lastSync?: string; itemsCount?: number; id?: string }
export type FormFieldType = "text" | "number" | "select" | "toggle"
export interface FormField { name: string; label: string; type: FormFieldType; value?: string | number | boolean; options?: Array<{ label: string; value: string }>; placeholder?: string; required?: boolean }
export interface ChartDataset { label: string; data: number[]; color?: string }

export type ParsedMessage =
  | { type: "text"; text?: string }
  | { type: "goal_suggestion"; goals: ParsedGoal[]; source?: string }
  | { type: "plan_update"; changes: PlanChange[]; note?: string }
  | { type: "stats_summary"; metrics: StatMetric[]; period?: string }
  | { type: "action_list"; actions: ActionItem[]; note?: string }
  | { type: "digest_item"; topic: string; summary: string; sources?: SourceLink[] }
  | { type: "connector_status"; connectors: ConnectorStatusItem[] }
  | { type: "form_fill"; title?: string; submitLabel?: string; fields: FormField[] }
  | { type: "chart_data"; chartType: "bar" | "line" | "pie"; labels: string[]; datasets: ChartDataset[]; title?: string }
  | { type: "error"; message: string; recovery?: string }

export type ParsedType = ParsedMessage["type"]

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

export interface CardActionHandlers {
  acceptGoal?: (payload: any) => void
  viewDetail?: (payload: any) => void
  dismiss?: (messageId: string) => void
  retry?: (payload: any) => void
  applyPlan?: (changes: PlanChange[]) => void
  runIpc?: (ipc: string, payload?: Record<string, unknown>) => void
  submitForm?: (values: Record<string, string | number | boolean>) => void
  syncConnector?: (id?: string, name?: string) => void
  openUrl?: (url: string) => void
  sendText?: (text: string) => void
}

export function handleCardAction(action: CardAction, messageId: string, handlers: CardActionHandlers): void {
  switch (action.kind) {
    case 'accept-goal': handlers.acceptGoal?.(action.goal); break
    case 'dismiss-goal': handlers.dismiss?.(messageId); break
    case 'apply-plan': handlers.applyPlan?.(action.changes); break
    case 'run-ipc': handlers.runIpc?.(action.ipc, action.payload); break
    case 'submit-form': handlers.submitForm?.(action.values); break
    case 'sync-connector': handlers.syncConnector?.(action.id, action.name); break
    case 'open-url': handlers.openUrl?.(action.url); break
    case 'retry': handlers.retry?.(undefined); break
    case 'send-text': handlers.sendText?.(action.text); break
    default: break
  }
}

const ACCENT_BY_TYPE: Record<ParsedType, AccentKey> = { text: "pink", goal_suggestion: "emerald", plan_update: "violet", stats_summary: "cyan", action_list: "pink", digest_item: "cyan", connector_status: "cyan", form_fill: "violet", chart_data: "amber", error: "red" }
export function accentForType(t: ParsedType): AccentKey { return ACCENT_BY_TYPE[t] ?? "pink" }

const KNOWN_TYPES: string[] = ["text", "goal_suggestion", "plan_update", "stats_summary", "action_list", "digest_item", "connector_status", "form_fill", "chart_data", "error"]

export function isParsedMessage(v: unknown): v is ParsedMessage {
  return !!v && typeof v === "object" && typeof (v as { type?: unknown }).type === "string" && KNOWN_TYPES.includes((v as { type: string }).type)
}

export function parseAssistantContent(raw: string, storedJson?: string | null): { text: string; parsed?: ParsedMessage } {
  if (storedJson) { try { const obj = JSON.parse(storedJson); if (isParsedMessage(obj)) { const t = obj.type === "text" && obj.text ? String(obj.text) : raw || ""; return { text: obj.type === "text" ? t : "", parsed: obj } } } catch {} }
  const text = raw ?? ""
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) { try { const obj = JSON.parse(fence[1].trim()); if (isParsedMessage(obj)) return { text: text.replace(fence[0], "").trim(), parsed: obj } } catch {} }
  const trimmed = text.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) { try { const obj = JSON.parse(trimmed); if (isParsedMessage(obj)) return { text: "", parsed: obj } } catch {} }
  return { text }
}

export function serializeParsed(parsed?: ParsedMessage): string | undefined { if (!parsed) return undefined; try { return JSON.stringify(parsed) } catch { return undefined } }

export function formatStat(value: number, format?: StatMetric["format"]): string {
  if (format === "duration") { const s = Math.max(0, Math.round(value)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); if (h > 0) return h + "h " + m + "m"; if (m > 0) return m + "m"; return s + "s" }
  if (format === "hours") return (Math.round((value / 3600) * 10) / 10) + "h"
  if (format === "percent") return Math.round(value) + "%"
  return new Intl.NumberFormat().format(Math.round(value))
}
```

### QuickCommands.tsx (32 lines)
```tsx
import { Calendar, Newspaper, RefreshCw, Target } from "lucide-react"
import type { CardAction } from "../ai/chat/parsed"

const COMMANDS = [
  { label: "Plan my day", prompt: "/plan", icon: Calendar, color: "var(--violet)" },
  { label: "Generate digest", prompt: "/digest", icon: Newspaper, color: "var(--cyan)" },
  { label: "Reflect on today", prompt: "/reflect", icon: RefreshCw, color: "var(--amber)" },
  { label: "Start focus session", prompt: "/focus", icon: Target, color: "var(--emerald)" },
]

export function QuickCommands({ onAction }: { onAction?: (a: CardAction) => void }) {
  return (
    <div className="dk-card dk-acc dk-amber dk-sec">{COMMANDS.map((c) => (
      <button key={c.label} className="dk-conn" onClick={() => onAction?.({ kind: "send-text", text: c.prompt })}>
        <div className="dk-conn-l"><div className="dk-conn-ci" style={{ color: c.color }}><c.icon size={14} /></div><span className="dk-conn-nm">{c.label}</span></div>
      </button>
    ))}</div>
  )
}
```

### useSlashCommands.ts (256 lines)
```typescript
import { useCallback } from "react"

interface SlashCommandContext {
  connectors: Array<{ id: string; name: string; type?: string }>
  onSync?: (id: string) => Promise<void>
}

interface SlashCommandResult {
  handled: boolean
  shouldSendToAI?: boolean
  messages?: Array<{ role: "user" | "assistant"; content: string }>
}

export function useSlashCommands() {
  const parseAndExecute = useCallback(async (text: string, ctx: SlashCommandContext): Promise<SlashCommandResult> => {
    const match = text.trim().match(/^\/(\w+)\s*(.*)?$/)
    if (!match) return { handled: false }

    const [, command, args] = match
    const api = window.deskflowAPI

    switch (command) {
      case "unread": {
        try {
          const results = await Promise.all(ctx.connectors.filter(c => c.type === "email").map(async (c) => {
            const items = await (api as any).connectors?.items?.(c.id, { limit: 10, unread: true })
            return { connector: c.name, items: items?.items || [] }
          }))
          return { handled: true, messages: results.flatMap(r => r.items.map((item: any) => ({ role: "assistant" as const, content: `📧 **${r.connector}**: ${item.subject || item.summary || "(no subject)"}` }))) }
        } catch (e) { return { handled: true, messages: [{ role: "assistant", content: `Error fetching unread: ${(e as Error).message}` }] } }
      }
      case "inbox": {
        try {
          const results = await Promise.all(ctx.connectors.filter(c => c.type === "email").map(async (c) => {
            const items = await (api as any).connectors?.items?.(c.id, { limit: 5 })
            return { connector: c.name, items: items?.items || [] }
          }))
          return { handled: true, messages: results.flatMap(r => r.items.map((item: any) => ({ role: "assistant" as const, content: `📥 **${r.connector}**: ${item.subject || item.summary || "(no subject)"}` }))) }
        } catch (e) { return { handled: true, messages: [{ role: "assistant", content: `Error: ${(e as Error).message}` }] } }
      }
      case "calendar": {
        try {
          const results = await Promise.all(ctx.connectors.filter(c => c.type === "calendar").map(async (c) => {
            const items = await (api as any).connectors?.items?.(c.id, { limit: 5 })
            return { connector: c.name, items: items?.items || [] }
          }))
          return { handled: true, messages: results.flatMap(r => r.items.map((item: any) => ({ role: "assistant" as const, content: `📅 **${r.connector}**: ${item.subject || item.summary || "(no event)"}` }))) }
        } catch (e) { return { handled: true, messages: [{ role: "assistant", content: `Error: ${(e as Error).message}` }] } }
      }
      case "today": {
        try {
          const emailResults = await Promise.all(ctx.connectors.filter(c => c.type === "email").map(async (c) => {
            const items = await (api as any).connectors?.items?.(c.id, { limit: 5 })
            return { connector: c.name, items: items?.items || [] }
          }))
          const calResults = await Promise.all(ctx.connectors.filter(c => c.type === "calendar").map(async (c) => {
            const items = await (api as any).connectors?.items?.(c.id, { limit: 5 })
            return { connector: c.name, items: items?.items || [] }
          }))
          const lines = [...emailResults.flatMap(r => r.items.map((item: any) => `📧 **${r.connector}**: ${item.subject || item.summary}`)), ...calResults.flatMap(r => r.items.map((item: any) => `📅 **${r.connector}**: ${item.subject || item.summary}`))]
          return { handled: true, messages: lines.length > 0 ? lines.map(l => ({ role: "assistant" as const, content: l })) : [{ role: "assistant", content: "No items for today." }] }
        } catch (e) { return { handled: true, messages: [{ role: "assistant", content: `Error: ${(e as Error).message}` }] } }
      }
      case "sync": {
        try {
          for (const c of ctx.connectors) { await ctx.onSync?.(c.id) }
          return { handled: true, messages: [{ role: "assistant", content: `✅ Synced ${ctx.connectors.length} connectors.` }] }
        } catch (e) { return { handled: true, messages: [{ role: "assistant", content: `Sync error: ${(e as Error).message}` }] } }
      }
      case "email": {
        const query = args?.toLowerCase() || ""
        try {
          const results = await Promise.all(ctx.connectors.filter(c => c.type === "email").map(async (c) => {
            const items = await (api as any).connectors?.items?.(c.id, { limit: 10, search: query })
            return { connector: c.name, items: items?.items || [] }
          }))
          return { handled: true, messages: results.flatMap(r => r.items.map((item: any) => ({ role: "assistant" as const, content: `🔍 **${r.connector}**: ${item.subject || item.summary || "(no match)"}` }))) }
        } catch (e) { return { handled: true, messages: [{ role: "assistant", content: `Error: ${(e as Error).message}` }] } }
      }
      case "plan": return { handled: true, shouldSendToAI: true }
      case "digest": return { handled: true, shouldSendToAI: true }
      case "reflect": return { handled: true, shouldSendToAI: true }
      case "focus": return { handled: true, shouldSendToAI: true }
      default: return { handled: false }
    }
  }, [])

  return { parseAndExecute }
}
```

### tokens.ts (109 lines)
```typescript
export type AccentKey = "pink" | "emerald" | "amber" | "violet" | "red" | "cyan"

export const SURFACE = {
  bg: "bg-zinc-950",
  card: "bg-zinc-900/40",
  raised: "bg-zinc-900/60",
  muted: "bg-zinc-950/60",
} as const

export const RING = {
  base: "ring-1 ring-zinc-800/60",
  hover: "hover:ring-zinc-700/80",
  active: "ring-zinc-600",
  focus: "focus-visible:ring-2 focus-visible:ring-pink-500/50",
} as const

export const TEXT = {
  primary: "text-zinc-100",
  secondary: "text-zinc-400",
  muted: "text-zinc-500",
  faint: "text-zinc-600",
} as const

export const ACCENT: Record<AccentKey, { dot: string; bar: string; pill: string; text: string; ring: string; hex: string }> = {
  pink: { dot: "bg-pink-500", bar: "bg-pink-500/20", pill: "bg-pink-500/10 text-pink-400", text: "text-pink-400", ring: "ring-pink-500/30", hex: "#ec4899" },
  emerald: { dot: "bg-emerald-500", bar: "bg-emerald-500/20", pill: "bg-emerald-500/10 text-emerald-400", text: "text-emerald-400", ring: "ring-emerald-500/30", hex: "#34d399" },
  amber: { dot: "bg-amber-500", bar: "bg-amber-500/20", pill: "bg-amber-500/10 text-amber-400", text: "text-amber-400", ring: "ring-amber-500/30", hex: "#fbbf24" },
  violet: { dot: "bg-violet-500", bar: "bg-violet-500/20", pill: "bg-violet-500/10 text-violet-400", text: "text-violet-400", ring: "ring-violet-500/30", hex: "#a78bfa" },
  red: { dot: "bg-red-500", bar: "bg-red-500/20", pill: "bg-red-500/10 text-red-400", text: "text-red-400", ring: "ring-red-500/30", hex: "#f87171" },
  cyan: { dot: "bg-cyan-500", bar: "bg-cyan-500/20", pill: "bg-cyan-500/10 text-cyan-400", text: "text-cyan-400", ring: "ring-cyan-500/30", hex: "#22d3ee" },
}

export const MOTION = {
  fast: "150ms",
  normal: "250ms",
  slow: "400ms",
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  stagger: "0.05s",
} as const

export const SECTION_ACCENT: Record<string, AccentKey> = {
  chat: "pink",
  connectors: "cyan",
  focus: "emerald",
  plan: "violet",
  reflect: "amber",
  digest: "cyan",
}
```

### AiPage.tsx — Key Sections (lines 1-100, 490-560, 625-895)

**Lines 1-100 (imports + state):**
```tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, BookOpen, Newspaper, History } from 'lucide-react';
import { AiPageDeck } from '../components/ai/deck/AiPageDeck';
import { FocusBoard } from '../components/ai/focus/FocusBoard';
import { PlanBoard } from '../components/ai/plan/PlanBoard';
import { ReflectFeed } from '../components/ai/reflect/ReflectFeed';
import { SummaryGrid } from '../components/ai/summary/SummaryGrid';
import { parseChecklist } from '../services/planningParser';
import { DailyDigestBoard } from '../components/ai/digest/DailyDigestBoard';
import { ConnectorsPanel } from '../components/ai/connectors/ConnectorsPanel';
import { AIFeaturesModal } from '../components/AIFeaturesModal';
import { AiProviderSelectModal, getProviderBadge } from '../components/AiProviderSelectModal';
import { ConnectorSetupModal } from '../components/ConnectorSetupModal';
import type { DataState, Goal, GoalDay, Mode, LongTermGoal } from '../components/ai/types';
import { useAiChat } from '../hooks/useAiChat';
import { useSlashCommands } from '../hooks/useSlashCommands';
import { useAutoSync } from '../hooks/useAutoSync';
import { useVoiceInput } from '../hooks/useVoiceInput';
import type { CardAction } from '../components/ai/chat/parsed';
import { ChatHistory } from '../components/ai/chat/ChatHistory';
import type { ChatSuggestion } from '../components/ai/chat/ChatEmptyState';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
let toastCounter = 0;
function getToday() { return new Date().toISOString().slice(0, 10); }

type AiTab = "deck" | "digest"

export function AiPage() {
  const today = getToday();
  const [tab, setTab] = useState<AiTab>("deck");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [review, setReview] = useState<string | null>(null);
  const [goalsState, setGoalsState] = useState<DataState>('loading');
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Goal[]>([]);
  const [planGoals, setPlanGoals] = useState<Goal[]>([]);
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
  const [planningNotes, setPlanningNotes] = useState('');
  const [showFeatures, setShowFeatures] = useState(false);
  const navigate = useNavigate();
  const [digestTopics, setDigestTopics] = useState<any[]>([]);
  const [digestState, setDigestState] = useState<DataState>('loading');
  const [digestReason, setDigestReason] = useState<string | null>(null);
  const [aiProviders, setAiProviders] = useState<Array<{ id: string; label: string; models: string[]; enabled: boolean }>>([]);
  const [aiRouting, setAiRouting] = useState<Record<string, { providerId: string; model: string } | null>>({});
  const [configuringFeature, setConfiguringFeature] = useState<'default' | 'researchDigest' | 'goalAssistant' | null>(null);
  const [showConnectorSetup, setShowConnectorSetup] = useState(false);
  const [connectors, setConnectors] = useState<Array<{ id: string; name: string; status: string; detail?: string; itemCount?: number; type?: string }>>([]);
  const chat = useAiChat();
  const slash = useSlashCommands();
  const voice = useVoiceInput({ onTranscript: useCallback((text: string) => { if (text.trim()) chat.send(text.trim()); }, [chat]) });
  const [actionResults, setActionResults] = useState<Record<string, 'running' | 'done' | 'error'>>({});
  const [connectorSyncing, setConnectorSyncing] = useState<Record<string, true>>({});
  const [reflectDays, setReflectDays] = useState<GoalDay[]>([]);
  const [connectorStatus, setConnectorStatus] = useState({ unreadCount: 0, todayEventCount: 0, lastSyncTime: undefined as string | undefined, syncing: false });
  const [toasts, setToasts] = useState<Toast[]>([]);
  // ... more state variables
```

**Lines 490-560 (onCardAction):**
```tsx
  const onCardAction = useCallback(async (action: CardAction) => {
    const api = window.deskflowAPI!;
    switch (action.kind) {
      case 'accept-goal': {
        try {
          await api.saveGoal(today, { id: crypto.randomUUID(), title: action.goal.title, category: (action.goal.category as any) || 'work', target: { type: 'completion' }, status: 'active', period: 'daily', date: today, source: 'ai', links: [], createdAt: new Date().toISOString() });
          await loadGoals();
        } catch (e) { console.error('[AiPage] onCardAction accept-goal:', e); }
        break;
      }
      case 'dismiss-goal': break;
      case 'apply-plan': {
        try {
          const goals = action.changes.filter(c => c.action !== 'complete').map(c => ({ title: c.goal.title, category: c.goal.category, priority: c.goal.priority }));
          if (goals.length) await api.saveGoalsBatch(goals as any);
          await loadLongTermGoals();
        } catch (e) { console.error('[AiPage] onCardAction apply-plan:', e); }
        break;
      }
      case 'run-ipc': {
        const label = action.label || action.ipc;
        setActionResults(prev => ({ ...prev, [label]: 'running' }));
        try {
          const fn = (api as any)[action.ipc];
          if (typeof fn === 'function') await fn(action.payload);
          setActionResults(prev => ({ ...prev, [label]: 'done' }));
          loadGoals(); loadDigest(false);
        } catch (e) {
          console.error('[AiPage] onCardAction run-ipc:', e);
          setActionResults(prev => ({ ...prev, [label]: 'error' }));
        }
        break;
      }
      case 'submit-form': {
        const summary = Object.entries(action.values).map(([k, v]) => k + ': ' + String(v)).join(', ');
        if (chat) chat.send(summary);
        break;
      }
      case 'sync-connector': {
        setConnectorSyncing(prev => ({ ...prev, [action.name]: true }));
        try {
          const connectors: any = (api as any).connectors;
          if (connectors?.sync) await connectors.sync(action.id || action.name);
        } catch (e) { console.error('[AiPage] onCardAction sync-connector:', e); }
        setConnectorSyncing(prev => { const n = { ...prev }; delete n[action.name]; return n; });
        break;
      }
      case 'open-url': { try { window.open(action.url, '_blank'); } catch (e) { console.error('[AiPage] onCardAction open-url:', e); } break; }
      case 'send-text': { if (chat) chat.send(action.text); break; }
      case 'retry': { const last = chat.messages.filter(m => m.role === 'user').at(-1); if (last) chat.send(last.content); break; }
    }
  }, [today, chat, loadGoals, loadDigest, loadConnectors, showToast]);
```

**Lines 625-895 (return JSX):**
```tsx
  return (
    <>
      {bootState === 'loading' ? (
        <div className="dk-root"><div className="dk-wrap flex items-center justify-center min-h-[70vh]"><div className="flex flex-col items-center gap-4"><div className="w-8 h-8 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" /><p className="text-sm text-zinc-500">Loading DeskFlow AI…</p></div></div></div>
      ) : bootState === 'error' ? (
        <div className="dk-root"><div className="dk-wrap flex items-center justify-center min-h-[70vh]"><div className="flex flex-col items-center gap-4 max-w-sm text-center"><div className="rounded-full bg-red-500/10 p-3"><span className="text-xl text-red-400">!</span></div><p className="text-sm text-red-400">{bootError || 'Failed to initialize'}</p><button onClick={loadBoot} className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">Retry</button></div></div></div>
      ) : (
      <div className="dk-root">
        <div className="dk-wrap">
          <div className="dk-topbar">
            <div className="dk-brand"><div className="dk-logo">D</div><h1>DeskFlow AI <span className="dk-sub">// command deck</span></h1></div>
            <div className="dk-barR">
              <span className="dk-chip dk-mode"><span className="dk-dot" />{modeLabelMap[mode]}</span>
              <button className="dk-chip dk-prov hover:bg-zinc-800/40 transition-colors" onClick={() => setConfiguringFeature('default')}><span className="dk-dot" />{defaultBadge?.label ?? "Claude Sonnet"}</button>
              <span className="dk-chip dk-live"><span className="dk-dot" />{chat.hasProvider ? "Connected" : "Offline"}</span>
            </div>
          </div>
          <div className="dk-subnav">
            <button className={`dk-subtab${tab === "deck" ? " dk-on" : ""}`} onClick={() => setTab("deck")}>{"\u25C8"} Command Deck</button>
            <button className={`dk-subtab${tab === "digest" ? " dk-on" : ""}`} onClick={() => setTab("digest")}>{"\uD83D\uDCF0"} Digest{digestTopics.length > 0 ? <span className="dk-subtab-dot" /> : null}</button>
          </div>
          {tab === "deck" ? (
            <AiPageDeck
              messages={chat.messages.map((m): import('../components/ai/chat/ChatPanel').ChatMessage => ({ id: m.id, role: m.role, content: m.content, parsed: m.parsed, timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined }))}
              streaming={chat.streaming} thinking={chat.thinking} provider={defaultBadge?.label} online={chat.hasProvider}
              input={chat.input} onInputChange={chat.setInput} onSend={handleSend} onStop={chat.stop} onReset={chat.reset}
              onCardAction={onCardAction} actionResults={actionResults} connectorSyncing={connectorSyncing}
              contextWarnings={contextWarnings} dismissError={dismissError} modeLabel={modeLabelMap[mode]} glanceMetrics={glanceMetrics}
              connectorsSlot={<ConnectorsPanel state={goalsDataState} connectors={connectors} errorMessage={goalsError || undefined} onRetry={loadGoals} onAdd={() => setShowConnectorSetup(true)} onSync={async (id) => { setConnectorSyncing(prev => ({ ...prev, [id]: true })); try { const r = await window.deskflowAPI!.connectors?.sync?.(id); if (r?.success) showToast(`Synced — ${r.itemsAdded || 0} items`, 'success'); else showToast(r?.error || 'Sync failed', 'error'); await loadConnectors(); } catch (e: any) { showToast(e.message || 'Sync failed', 'error'); } setConnectorSyncing(prev => { const n = { ...prev }; delete n[id]; return n; }); }} onReply={async (connectorId, itemId, draft) => { try { const r = await (window.deskflowAPI!.connectors as any)?.sendEmail?.(connectorId, { to: '', subject: '', body: draft, inReplyTo: itemId }); if (r?.success) showToast('Reply sent', 'success'); else showToast(r?.error || 'Send failed', 'error'); } catch (e: any) { showToast(e.message || 'Send failed', 'error'); } }} onMarkRead={async (connectorId, itemId, read) => { try { await (window.deskflowAPI!.connectors as any)?.markRead?.(itemId, read); await loadConnectors(); } catch (e: any) { showToast(e.message || 'Mark failed', 'error'); } }} onDelete={async (connectorId) => { try { const r = await (window.deskflowAPI!.connectors as any)?.remove?.(connectorId); if (r?.success) { showToast('Connector deleted', 'success'); await loadConnectors(); } else showToast(r?.error || 'Delete failed', 'error'); } catch (e: any) { showToast(e.message || 'Delete failed', 'error'); } }} onToast={showToast} onRefresh={loadConnectors} />}
              focusSlot={<FocusBoard state={goalsDataState} mode={mode} goals={goals} planGoals={planGoals} suggestions={suggestions} metrics={focusMetrics} reviewSummary={review || undefined} onToggleGoal={handleToggleGoal} onAcceptSuggestion={handleAcceptSuggestion} onDismissSuggestion={handleDismissSuggestion} onSuggestGoals={handleSuggest} onSaveReview={handleSaveReview} errorMessage={goalsError || undefined} onRetry={loadGoals} onConfigure={() => setConfiguringFeature('goalAssistant')} reviewError={reviewError} toggleErrors={toggleErrors} acceptErrors={acceptErrors} onRetryReview={() => { setReviewError(null); handleSaveReview(review || ''); }} onDismissReviewError={() => setReviewError(null)} />}
              planSlot={<PlanBoard state={goalsDataState} goals={longTermGoals} notes={planningNotes} savingNotes={savingNotes} onSaveNotes={handleSaveNotes} onAnalyzeDump={handleAnalyzeDump} onSaveGoals={handleSaveGoals} onToggleGoal={handleToggleLongTermGoal} errorMessage={goalsError || undefined} onRetry={loadGoals} />}
              reflectSlot={<ReflectFeed state={goalsDataState} days={reflectDays.length ? reflectDays : [{ date: today, goals, reviewSummary: review || undefined }]} errorMessage={goalsError || undefined} onRetry={loadGoals} dayWindow={dayWindow} onLoadOlder={handleLoadOlder} />}
              historySlot={<ChatHistory open={historyOpen} onClose={() => setHistoryOpen(false)} threads={chat.threads} currentThreadDate={chat.currentThreadDate} onLoadThread={handleLoadThread} onDeleteThread={handleDeleteThread} onNewThread={chat.startNewThread} />}
              memoryChips={chat.memories.slice(0, 6)} onNewThread={chat.startNewThread} connectorStatus={connectorStatus}
              onExpandConnectors={() => {/* scroll to connectors */}}
              listening={voice.state === 'listening'} onToggleVoice={voice.state === 'listening' ? voice.stop : voice.start} voiceSupported={voice.supported}
            />
          ) : (
            <div className="dk-digestpage">
              <DailyDigestBoard state={digestDataState} topics={digestTopics.map(t => ({ topic: t.topic || t.title || '', summary: t.summary || '', sources: t.sources, date: t.date, confidence: t.confidence, source: t.source, stats: t.stats, tags: t.tags, mentions: t.mentions, headline: t.headline }))}
                generating={digestState === 'loading'} provider={digestBadge?.label} readyToGenerate={digestTopics.length === 0}
                errorMessage={digestReason || undefined} onRefresh={() => loadDigest(true, true)} onConfigure={() => setConfiguringFeature('researchDigest')}
                onGenerate={() => loadDigest(true, true)} onDismissError={() => { setDigestState('ready'); setDigestReason(null); }} />
            </div>
          )}
        </div>
      </div>
      )}
      <AIFeaturesModal open={showFeatures} onClose={() => setShowFeatures(false)} />
      <ConnectorSetupModal open={showConnectorSetup} onClose={() => setShowConnectorSetup(false)} onCreated={() => { setShowConnectorSetup(false); loadConnectors(); }} />
      <AiProviderSelectModal open={configuringFeature === 'researchDigest'} onClose={() => setConfiguringFeature(null)} featureKey="researchDigest" featureLabel="Research Digest" accentColor="from-cyan-500 to-blue-500" providers={aiProviders} currentRouting={aiRouting.researchDigest} onSave={(e) => handleRoutingSave('researchDigest', e)} />
      <AiProviderSelectModal open={configuringFeature === 'goalAssistant'} onClose={() => setConfiguringFeature(null)} featureKey="goalAssistant" featureLabel="Daily Plan" accentColor="from-emerald-500 to-teal-500" providers={aiProviders} currentRouting={aiRouting.goalAssistant} onSave={(e) => handleRoutingSave('goalAssistant', e)} />
      <AiProviderSelectModal open={configuringFeature === 'default'} onClose={() => setConfiguringFeature(null)} featureKey="default" featureLabel="AI Chat" accentColor="from-violet-500 to-purple-500" providers={aiProviders} currentRouting={aiRouting.default} onSave={(e) => handleRoutingSave('default', e)} />
      <button onClick={() => setHistoryOpen(v => !v)} style={{ position: "fixed", bottom: 24, left: 24, width: 40, height: 40, borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", backdropFilter: "blur(14px)", color: historyOpen ? "var(--pink)" : "var(--ts)", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 30, transition: "all 0.2s ease", boxShadow: "0 4px 12px rgba(0,0,0,.3)" }} title={historyOpen ? "Close history" : "Chat history"}><History size={18} /></button>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map(t => (<div key={t.id} className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg backdrop-blur-sm transition-all ${t.type === 'success' ? 'border-l-[3px] border-emerald-500 bg-emerald-500/10 text-emerald-200' : t.type === 'error' ? 'border-l-[3px] border-red-500 bg-red-500/10 text-red-200' : 'border-l-[3px] border-indigo-500 bg-indigo-500/10 text-indigo-200'}`} style={{ animation: 'slideIn 0.2s ease-out' }}><span className="text-base">{t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}</span><span className="flex-1">{t.message}</span><button onClick={() => dismissToast(t.id)} className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity" aria-label="Dismiss">×</button></div>))}
      </div>
    </>
  );
}
```

### deck.css (1219 lines)
The full CSS is included in the file. Key classes:
- `.dk-root`, `.dk-wrap` — page layout
- `.dk-topbar`, `.dk-brand`, `.dk-logo`, `.dk-barR` — top bar
- `.dk-statusbar`, `.dk-statusbar-item`, `.dk-statusbar-dot` — status bar
- `.dk-chat-card`, `.dk-chat-inner` — chat card with glass effect
- `.dk-stream`, `.dk-msg`, `.dk-bubble`, `.dk-av` — messages
- `.dk-empty`, `.dk-suggestions`, `.dk-chip` — empty state
- `.dk-thinking`, `.dk-thinking-dots` — thinking indicator
- `.dk-memory-bar`, `.dk-memory-chip` — memory chips
- `.dk-input-wrap`, `.dk-textarea`, `.dk-iconbtn` — input area
- `.dk-cmd-palette`, `.dk-cmd-item` — slash command palette
- `.dk-strip-toggle`, `.dk-strip`, `.dk-strip-card` — strip
- `.dk-card`, `.dk-card::before`, `.dk-acc` — card base
- `.dk-history-drawer`, `.dk-history-item` — history drawer
- `.dk-modal-overlay`, `.dk-modal` — modals
- `.dk-connectors-section`, `.dk-conn-collapse` — connectors
- `.dk-deckhead`, `.dk-cmdbar` — deck head and command bar
- Animations: `msgEnter`, `emptyFloat`, `dotPulse`, `paletteEnter`, `overlayEnter`, `modalEnter`, `slideIn`, `spin`

---

## Backend Logic — How Each Card Connects to AI Chat

### Daily Digest
- **Data:** `digestTopics` state in AiPage.tsx
- **IPC:** `get-digest-topics`
- **AI:** `/digest` slash command → `shouldSendToAI: true` → AI generates `digest_item` parsed type
- **Card expanded:** `<DailyDigestBoard>`

### Connectors
- **Data:** `connectors` state in AiPage.tsx
- **IPC:** `connectors:list`, `connectors:sync(id)`, `connectors:items(id)`, `connectors:sendEmail()`, `connectors:markRead()`, `connectors:remove()`
- **AI:** `/unread /inbox /calendar /today /sync /email` slash commands
- **Card expanded:** `<ConnectorsPanel>` with `<ConnectorItemModal>`

### Focus
- **Data:** `goals`, `suggestions`, `focusMetrics`, `review`
- **IPC:** `get-goals(today)`
- **AI:** `/focus` slash command → AI generates `goal_suggestion` → Accept/Dismiss buttons
- **Card expanded:** `<FocusBoard>`

### Plan
- **Data:** `longTermGoals`, `planningNotes`
- **IPC:** `get-long-term-goals()`
- **AI:** `/plan` slash command → AI generates `plan_update` → Apply button
- **Card expanded:** `<PlanBoard>`

### Reflect
- **Data:** `reflectDays`
- **IPC:** `get-reflect-days(dayWindow)`
- **AI:** `/reflect` slash command
- **Card expanded:** `<ReflectFeed>`
