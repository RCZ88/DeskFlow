import { type FC } from 'react'
import type { Block } from '../../../services/parseBlocks'

type Props = { block: Block; onRetry?: () => void }

export const ErrorBlock: FC<Props> = ({ block, onRetry }) => {
  const message = block.fields.message as string
  return (
    <div className="bg-red-500/10 ring-1 ring-red-500/40 rounded-lg px-3 py-2 space-y-2">
      <p className="text-sm text-red-300">{message || 'Something went wrong'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-500/80 hover:bg-red-400 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
