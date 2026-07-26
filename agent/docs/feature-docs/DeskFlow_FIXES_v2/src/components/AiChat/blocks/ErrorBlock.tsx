import { type FC } from 'react'
import type { WireBlock } from '../../../services/wireFormat'
import { AlertCircle } from 'lucide-react'

type Props = { block: WireBlock; onRetry?: () => void }

export const ErrorBlock: FC<Props> = ({ block, onRetry }) => {
  const message = block.fields.message as string
  return (
    <div className="bg-clay-500/10 border border-clay-500/30 rounded-lg px-3 py-2.5 space-y-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-clay-400 mt-0.5 shrink-0" />
        <p className="text-sm text-clay-300">{message || 'Something went wrong'}</p>
      </div>
      {onRetry && (
        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="bg-clay-500/80 hover:bg-clay-400 text-stone-950 text-xs font-medium rounded-lg px-3 py-1.5 min-h-[44px] transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
