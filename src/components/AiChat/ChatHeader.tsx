import { type FC } from 'react'

type Mode = 'morning' | 'in-progress' | 'review'
type Status = 'ready' | 'thinking' | 'error'

type Props = {
  mode: Mode
  dateLabel: string
  status: Status
  toolsUsed?: string
  onReset?: () => void
  className?: string
}

const modeConfig: Record<Mode, { bg: string; text: string; ring: string }> = {
  morning: { bg: 'bg-amber-500/10', text: 'text-amber-300', ring: 'ring-amber-500/20' },
  'in-progress': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', ring: 'ring-emerald-500/20' },
  review: { bg: 'bg-pink-500/10', text: 'text-pink-300', ring: 'ring-pink-500/20' },
}

const statusDot: Record<Status, string> = {
  ready: 'bg-emerald-400',
  thinking: 'bg-amber-400 animate-pulse',
  error: 'bg-red-400',
}

const modeLabel: Record<Mode, string> = {
  morning: 'Morning',
  'in-progress': 'Active',
  review: 'Review',
}

export const ChatHeader: FC<Props> = ({ mode, dateLabel, status, toolsUsed, onReset, className }) => {
  const c = modeConfig[mode]
  return (
    <div className={`flex items-center justify-between px-5 h-11 border-b border-zinc-800/60 bg-zinc-950/90 ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.ring}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${c.text.replace('text-', 'bg-').replace('300', '400')}`} />
          {modeLabel[mode]}
        </span>
        <span className="text-zinc-500 text-xs">{dateLabel}</span>
        {toolsUsed && (
          <span className="text-zinc-400 text-xs ml-2">
            Used: {toolsUsed}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onReset && (
          <button
            onClick={onReset}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            title="Reset conversation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        <span className={`size-2 rounded-full ${statusDot[status]}`} />
      </div>
    </div>
  )
}
