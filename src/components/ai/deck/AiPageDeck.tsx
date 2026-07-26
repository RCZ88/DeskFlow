import "./deck.css"
import { ChatPanel } from "../chat/ChatPanel"
import type { AgentStep } from "../chat/AgentProgressBar"
import type { ChatSuggestion } from "../chat/ChatEmptyState"
import type { ChatMessage } from "../chat/ChatPanel"
import type { CardAction } from "../chat/parsed"
import type { ReactNode } from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { Newspaper, Plug, Target, Calendar, RefreshCw, ChevronDown, Inbox, Maximize2, Minimize2, X, Clock, AlertTriangle } from "lucide-react"
import type { AccentKey } from "../tokens"
import { motion } from "framer-motion"

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
  onOpenCommands?: () => void
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
  digestSlot?: ReactNode
  historySlot?: ReactNode
  dailyPlannerSlot?: ReactNode
  scheduleSlot?: ReactNode
  deadlineSlot?: ReactNode
  memoryChips?: { id: string; text: string }[]
  onNewThread?: () => void
  connectorStatus?: { unreadCount: number; todayEventCount: number; lastSyncTime?: string; syncing?: boolean }
  onExpandConnectors?: () => void
  onOpenSettings?: () => void
  onOpenHistory?: () => void
  expandedCardIds?: Set<string>
  onExpandedCardChange?: (ids: Set<string>) => void
  autoApprove?: boolean
  onToggleAutoApprove?: () => void
}

interface ExpandableCardProps {
  id: string
  icon: ReactNode
  title: string
  summary: string
  accent: AccentKey
  isExpanded: boolean
  onToggle: () => void
  children: ReactNode
  loading?: boolean
  empty?: boolean
}

const accentMap: Record<string, { strip: string; icon: string; glow: string }> = {
  cyan: { strip: "#22d3ee", icon: "text-cyan-400", glow: "rgba(34,211,238,0.08)" },
  emerald: { strip: "#34d399", icon: "text-emerald-400", glow: "rgba(52,211,153,0.08)" },
  violet: { strip: "#a78bfa", icon: "text-violet-400", glow: "rgba(167,139,250,0.08)" },
  amber: { strip: "#fbbf24", icon: "text-amber-400", glow: "rgba(251,191,36,0.08)" },
  pink: { strip: "#ec4899", icon: "text-pink-400", glow: "rgba(236,72,153,0.08)" },
  rose: { strip: "#f43f5e", icon: "text-rose-400", glow: "rgba(244,63,94,0.08)" },
  red: { strip: "#f87171", icon: "text-red-400", glow: "rgba(248,113,113,0.08)" },
}

function ExpandableCard({ id, icon, title, summary, accent, isExpanded, onToggle, children, loading, empty }: ExpandableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [spotlight, setSpotlight] = useState({ x: 50, y: 0, opacity: 0 })
  const [fullPageOpen, setFullPageOpen] = useState(false)

  useEffect(() => {
    if (!fullPageOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullPageOpen(false) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [fullPageOpen])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setSpotlight({ x, y, opacity: 1 })
  }, [])

  const handlePointerLeave = useCallback(() => {
    setSpotlight(s => ({ ...s, opacity: 0 }))
  }, [])

  const ac = accentMap[accent] || accentMap.cyan
  const showEmptyState = empty && !isExpanded

  return (
    <>
      <div
        ref={cardRef}
        id={`deck-card-${id}`}
        className={`relative overflow-hidden rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group
          ${isExpanded
            ? "border-zinc-600/60 bg-zinc-900/30 backdrop-blur-sm shadow-[0_0_60px_rgba(0,0,0,0.4)]"
            : "border-zinc-800/60 bg-zinc-900/80 backdrop-blur-xl hover:border-zinc-700/60 hover:bg-zinc-900/70"}
        `}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(500px circle at ${spotlight.x}% ${spotlight.y}%, ${ac.glow}, transparent 60%)`,
            opacity: spotlight.opacity * 0.6,
          }}
        />
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] z-10 rounded-l-[inherit]"
          style={{ background: `linear-gradient(180deg, ${ac.strip}, ${ac.strip}cc)` }}
        />
        <div className="relative z-20 flex items-center gap-3 w-full p-5 text-left bg-transparent border-none">
          <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center ${ac.icon} transition-colors duration-150`}>
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-zinc-100 leading-tight">{title}</div>
            {!isExpanded && (
              <div className="text-[11px] text-zinc-500 leading-tight truncate mt-0.5">
                {showEmptyState ? "No data yet" : summary}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFullPageOpen(true)}
            className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-800/60 text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
            title="Full page"
          >
            <Maximize2 size={12} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={`${id}-body`}
            className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500/50"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <ChevronDown size={14} />
            </motion.div>
          </button>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden min-h-0">
            <div ref={bodyRef} className="p-6 lg:p-8 pt-0">
              {loading ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-3 h-3 border-2 border-zinc-600/40 border-t-zinc-400 rounded-full animate-spin" />
                  <span className="text-xs text-zinc-500">Loading...</span>
                </div>
              ) : empty ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Inbox size={20} className="text-zinc-600" />
                  <p className="text-xs text-zinc-500">Nothing here yet. Start a conversation or add data to see results.</p>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-page overlay — absolute so it doesn't cover the app sidebar */}
      {fullPageOpen && (
        <div className="absolute inset-0 z-[200] flex flex-col bg-zinc-950/92 backdrop-blur-xl">
          {/* Richer header with summary + actions */}
          <div className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-zinc-800/60 flex-none">
            <div className="flex items-center gap-4">
              <span className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800/80 ${ac.icon}`}>
                {icon}
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-zinc-100">{title}</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">{summary || "Full view"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {id === "digest" && (
                <button
                  type="button"
                  onClick={() => { document.querySelector('[data-refresh-digest]')?.click(); }}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/80 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
                >
                  <RefreshCw size={11} />
                  Refresh
                </button>
              )}
              <button
                type="button"
                onClick={() => setFullPageOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/80 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
              >
                <Minimize2 size={11} />
                <span className="hidden sm:inline">Close</span>
                <kbd className="hidden sm:inline text-[9px] text-zinc-600 border border-zinc-700/60 rounded px-1 py-0.5 ml-0.5">Esc</kbd>
              </button>
            </div>
          </div>

          {/* Spacious, full-width content area with better typography */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="max-w-5xl mx-auto">
              {empty ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <Inbox size={32} className="text-zinc-600" />
                  <p className="text-sm text-zinc-500 max-w-md">
                    {id === "digest" ? "No digest topics yet. Configure your interests to get started." :
                     id === "connectors" ? "No connectors configured. Add email or calendar to see items here." :
                     "Nothing here yet."}
                  </p>
                </div>
              ) : (
                <div className="text-[14px] leading-relaxed text-zinc-200 space-y-6
                  [&_.dk-card]:border-zinc-700/60 [&_.dk-card]:bg-zinc-900/60
                  [&_.dk-microlabel]:text-[10px] [&_.dk-microlabel]:text-zinc-400
                  [&_.dk-news-grid]:grid [&_.dk-news-grid]:grid-cols-1 [&_.dk-news-grid]:md:grid-cols-2 [&_.dk-news-grid]:gap-4
                  [&_.dk-empty]:py-12
                ">
                  {children}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </>
  )
}

export function AiPageDeck(props: DeckProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Sync expanded cards from parent
  useEffect(() => {
    if (props.expandedCardIds) {
      setExpandedCards(props.expandedCardIds)
    }
  }, [props.expandedCardIds])

  const toggleCard = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      props.onExpandedCardChange?.(next)
      return next
    })
  }, [props.onExpandedCardChange])

  const handleExpandConnectors = useCallback(() => {
    setExpandedCards(new Set(["connectors"]))
    props.onExpandConnectors?.()
    requestAnimationFrame(() => {
      const el = document.getElementById("deck-card-connectors")
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    })
  }, [props.onExpandConnectors])

  const hasMetrics = !!(props.glanceMetrics && props.glanceMetrics.length > 0)
  const hasConnectorStatus = !!props.connectorStatus

  const digestSummary = props.glanceMetrics?.length
    ? `${props.glanceMetrics.length} topics`
    : "No digest yet"

  const connectorsSummary = props.connectorStatus
    ? `${props.connectorStatus.unreadCount} unread, ${props.connectorStatus.todayEventCount} today`
    : "No connectors"

  const focusSummary = props.focusSlot ? "Active goals" : "No active goals"
  const planSummary = props.planSlot ? "Long-term goals" : "No long-term goals"
  const reflectSummary = props.reflectSlot ? "Daily reflections" : "No reflections"
  const dailyPlannerSummary = props.dailyPlannerSlot ? "Today's schedule & goals" : "No planner data"
  const scheduleSummary = props.scheduleSlot ? "Weekly schedule" : "No schedule"
  const deadlineSummary = props.deadlineSlot ? "Upcoming deadlines" : "No deadlines"

  const cardDefs = [
    {
      id: "digest",
      icon: <Newspaper size={18} />,
      title: "Daily Digest",
      summary: digestSummary,
      accent: "cyan" as AccentKey,
      slot: props.digestSlot,
      loading: false,
      empty: !props.glanceMetrics?.length,
    },
    {
      id: "connectors",
      icon: <Plug size={18} />,
      title: "Connectors",
      summary: connectorsSummary,
      accent: "cyan" as AccentKey,
      slot: props.connectorsSlot,
      loading: false,
      empty: !props.connectorStatus,
    },
    {
      id: "focus",
      icon: <Target size={18} />,
      title: "Focus",
      summary: focusSummary,
      accent: "emerald" as AccentKey,
      slot: props.focusSlot,
      loading: false,
      empty: !props.focusSlot,
    },
    {
      id: "plan",
      icon: <Calendar size={18} />,
      title: "Plan",
      summary: planSummary,
      accent: "violet" as AccentKey,
      slot: props.planSlot,
      loading: false,
      empty: !props.planSlot,
    },
    {
      id: "reflect",
      icon: <RefreshCw size={18} />,
      title: "Reflect",
      summary: reflectSummary,
      accent: "amber" as AccentKey,
      slot: props.reflectSlot,
      loading: false,
      empty: !props.reflectSlot,
    },
    {
      id: "daily-planner",
      icon: <Calendar size={18} />,
      title: "Daily Planner",
      summary: props.dailyPlannerSlot ? "Today's goals & timeline" : "No planner data",
      accent: "cyan" as AccentKey,
      slot: props.dailyPlannerSlot,
      loading: false,
      empty: !props.dailyPlannerSlot,
    },
    {
      id: "schedule",
      icon: <Clock size={18} />,
      title: "Schedule",
      summary: scheduleSummary,
      accent: "emerald" as AccentKey,
      slot: props.scheduleSlot,
      loading: false,
      empty: !props.scheduleSlot,
    },
    {
      id: "deadlines",
      icon: <AlertTriangle size={18} />,
      title: "Deadlines",
      summary: deadlineSummary,
      accent: "rose" as AccentKey,
      slot: props.deadlineSlot,
      loading: false,
      empty: !props.deadlineSlot,
    },
  ]

  const visibleCards = cardDefs.filter(c => c.slot).sort((a, b) => {
    const aExp = expandedCards.has(a.id)
    const bExp = expandedCards.has(b.id)
    if (aExp && !bExp) return -1
    if (!aExp && bExp) return 1
    return 0
  })

  return (
    <>
      {(hasMetrics || hasConnectorStatus) && (
        <div className="flex items-center gap-4 p-[6px_14px] mb-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-[11px] text-zinc-400 flex-none overflow-x-auto scrollbar-none">
          {(props.glanceMetrics ?? []).map((m, i) => (
            <div key={i} className="flex items-center gap-[5px] whitespace-nowrap cursor-pointer px-[6px] py-[2px] rounded-[5px] transition-colors duration-150 hover:bg-zinc-800/50">
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.5px]">{m.label}</span>
              <span className="font-semibold text-zinc-100 ml-1 tabular-nums">{m.value}</span>
            </div>
          ))}
          {hasMetrics && hasConnectorStatus && <div className="w-px h-[14px] bg-zinc-800 flex-none" />}
          {props.connectorStatus && (
            <>
              <div className="flex items-center gap-[5px] whitespace-nowrap cursor-pointer px-[6px] py-[2px] rounded-[5px] transition-colors duration-150 hover:bg-zinc-800/50" onClick={handleExpandConnectors}>
                <span className={`w-[5px] h-[5px] rounded-full bg-emerald-400 flex-none ${props.connectorStatus.syncing ? "animate-pulse" : ""}`} />
                <span>{props.connectorStatus.unreadCount} unread</span>
              </div>
              <div className="flex items-center gap-[5px] whitespace-nowrap cursor-pointer px-[6px] py-[2px] rounded-[5px] transition-colors duration-150 hover:bg-zinc-800/50" onClick={handleExpandConnectors}>
                <span className="w-[5px] h-[5px] rounded-full bg-cyan-400 flex-none" />
                <span>{props.connectorStatus.todayEventCount} today</span>
              </div>
              {props.connectorStatus.lastSyncTime && (
                <div className="font-mono text-[10px] text-zinc-500">{props.connectorStatus.lastSyncTime}</div>
              )}
            </>
          )}
        </div>
      )}

      {props.historySlot}

      <div className="relative bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/60 rounded-xl flex flex-col overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.25)]" style={{ flex: 1, minHeight: 400 }}>
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[3px] z-[2] bg-gradient-to-b from-pink-500 to-pink-700" />
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
          onOpenCommands={props.onOpenCommands}
          connectorStatus={props.connectorStatus}
          onExpandConnectors={props.onExpandConnectors}
          autoApprove={props.autoApprove}
          onToggleAutoApprove={props.onToggleAutoApprove}
        />
      </div>

      {visibleCards.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {visibleCards.map((card) => {
            const open = expandedCards.has(card.id)
            return (
              <motion.div
                key={card.id}
                className={open ? "col-span-full" : ""}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.97 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                <ExpandableCard
                  id={card.id}
                  icon={card.icon}
                  title={card.title}
                  summary={card.summary}
                  accent={card.accent}
                  isExpanded={open}
                  onToggle={() => toggleCard(card.id)}
                  loading={card.loading}
                  empty={card.empty}
                >
                  {card.slot}
                </ExpandableCard>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </>
  )
}
