import "./deck.css"
import { ChatPanel } from "./ChatPanel"
import { QuickCommands } from "./QuickCommands"
import type { ChatMessage } from "./MessageBubble"
import type { OnCardAction } from "./deck-types"

/**
 * Layout shell for the AI page. In your real AiPage.tsx, replace the demo
 * `messages` + handlers below with your existing useAiChat() state and the
 * onCardAction dispatcher you already wired in Phase 5. Everything else here
 * (topbar, grid, rail, bottom strip) is the Command Deck chrome.
 */
export function AiPageDeck(props: {
  messages: ChatMessage[]
  input: string
  onInputChange: (v: string) => void
  onSend: () => void
  onCardAction: OnCardAction
  provider?: string
  online?: boolean
  streaming?: boolean
}) {
  const { onCardAction } = props
  return (
    <div className="dk-root">
      <div className="dk-wrap">
        {/* top bar */}
        <div className="dk-topbar">
          <div className="dk-brand">
            <div className="dk-logo">D</div>
            <h1>DeskFlow AI <span className="dk-sub">// command deck</span></h1>
          </div>
          <div className="dk-barR">
            <span className="dk-chip dk-mode"><span className="dk-dot" />In progress</span>
            <span className="dk-chip dk-prov"><span className="dk-dot" />{props.provider ?? "Claude Sonnet"}</span>
            <span className="dk-chip dk-live"><span className="dk-dot" />{props.online ? "Connected" : "Offline"}</span>
          </div>
        </div>

        {/* main grid */}
        <div className="dk-grid">
          <div className="dk-col">
            <div className="dk-microlabel">Assistant · structured command deck</div>
            <ChatPanel {...props} />
          </div>

          <div className="dk-col">
            <div className="dk-microlabel">Today at a glance</div>
            <div className="dk-card dk-acc dk-violet dk-sec">
              <div className="dk-glancegrid">
                <Metric label="Goals done" value="5/8" />
                <Metric label="Focus time" value="6h 12m" />
                <Metric label="Streak" value="4d 🔥" />
                <Metric label="Active goals" value="3" />
              </div>
            </div>

            {/* Reuse your existing DailyDigestBoard + ConnectorsPanel here.
               They just need to live inside <div className="dk-card dk-acc dk-cyan dk-sec"> etc. */}

            <QuickCommands onAction={onCardAction} />
          </div>
        </div>

        {/* bottom strip: mount your existing Focus / Plan / ReflectFeed boards,
            each wrapped in a .dk-card .dk-acc .dk-<accent> .dk-sec container. */}

        <div className="dk-foot">DeskFlow AI — Command Deck</div>
      </div>
    </div>
  )
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="dk-metric">
      <div className="dk-metric-top"><span className="dk-metric-lab">{props.label}</span></div>
      <div className="dk-metric-val">{props.value}</div>
    </div>
  )
}
