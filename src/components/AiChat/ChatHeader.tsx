import { type FC } from 'react'
import { Sparkles, RotateCcw, Settings } from 'lucide-react'

type Mode = 'morning' | 'in-progress' | 'review'
type Status = 'ready' | 'thinking' | 'error'

type Props = {
  mode: Mode
  dateLabel: string
  status: Status
  toolsUsed?: string
  onReset?: () => void
  onConfigure?: () => void
  providerBadge?: { label: string; color: string } | null
  className?: string
}

const statusDot: Record<Status, string> = {
  ready: 'bg-sage-400 animate-[breathe_3s_ease-in-out_infinite]',
  thinking: 'bg-clay-400 animate-pulse',
  error: 'bg-clay-600',
}

export const ChatHeader: FC<Props> = ({ dateLabel, status, onReset, onConfigure, providerBadge, className }) => {
  return (
    <div className={`relative flex items-center justify-between px-4 h-12 bg-stone-950/80 backdrop-blur-md ${className ?? ''}`}>
      <div
        className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(232,134,107,0.4), transparent)',
        }}
      />
      <div className="flex items-center gap-2.5">
        <div className="grid place-items-center w-7 h-7 rounded-lg bg-stone-800/60 border border-stone-700/40">
          <Sparkles className="w-3.5 h-3.5 text-clay-300" />
        </div>
        <div>
          <span className="font-serif text-glow text-[13px] font-semibold">AI Assistant</span>
          <span className="text-[11px] text-stone-400 ml-2">{dateLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {onConfigure && (
          <button
            onClick={onConfigure}
            className="flex items-center gap-1.5 text-[11px] font-mono text-stone-500 hover:text-stone-300 transition-colors px-2 py-1 rounded-md hover:bg-stone-800/50"
            title="Configure AI provider"
          >
            <Settings className="w-3 h-3" />
            {providerBadge ? <span className={`max-w-[100px] truncate ${providerBadge.color}`}>{providerBadge.label}</span> : 'Provider'}
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-[11px] font-mono text-stone-500 hover:text-stone-300 transition-colors px-2 py-1 rounded-md hover:bg-stone-800/50"
            title="Reset conversation"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
        <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
      </div>
    </div>
  )
}
