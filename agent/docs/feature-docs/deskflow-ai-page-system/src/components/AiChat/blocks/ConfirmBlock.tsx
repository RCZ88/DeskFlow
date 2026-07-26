import { type FC, useState } from 'react'
import type { WireBlock } from '../../../services/wireFormat'
import { Check, X } from 'lucide-react'

type Props = { block: WireBlock }

export const ConfirmBlock: FC<Props> = ({ block }) => {
  const [resolved, setResolved] = useState<'accepted' | 'declined' | null>(null)
  const toolName = block.fields.tool ?? block.fields.label ?? 'this action'

  if (resolved === 'accepted') {
    return (
      <div className="bg-sage-400/10 border border-sage-400/25 rounded-lg px-3 py-2 text-sage-300 text-sm flex items-center gap-2">
        <Check className="w-4 h-4" />
        {toolName} accepted
      </div>
    )
  }

  if (resolved === 'declined') {
    return (
      <div className="bg-stone-800/50 border border-stone-700/40 rounded-lg px-3 py-2 text-stone-400 text-sm flex items-center gap-2">
        <X className="w-4 h-4" />
        {toolName} declined
      </div>
    )
  }

  return (
    <div className="bg-stone-900/80 border border-clay-400/30 rounded-xl p-3 space-y-3">
      <p className="text-sm text-stone-200 font-mono">{toolName}</p>
      <div className="flex gap-2">
        <button
          onClick={() => setResolved('accepted')}
          className="flex-1 rounded-lg bg-sage-400/90 hover:bg-sage-400 text-stone-950 text-sm font-medium px-4 py-2.5 min-h-[44px] transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Accept
        </button>
        <button
          onClick={() => setResolved('declined')}
          className="flex-1 rounded-lg border border-stone-700 hover:bg-stone-800 text-stone-300 text-sm font-medium px-4 py-2.5 min-h-[44px] transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Decline
        </button>
      </div>
    </div>
  )
}
