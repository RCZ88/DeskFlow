import { type FC } from 'react'
import type { Block } from '../../../services/parseBlocks'

type Props = { block: Block }

export const DataSummaryBlock: FC<Props> = ({ block }) => {
  const title = block.fields.title as string | undefined
  const metrics = Object.entries(block.fields).filter(([k]) => k !== 'title')

  return (
    <div className="space-y-1.5">
      {title && <p className="text-sm font-medium text-zinc-200">{title}</p>}
      <div className="space-y-1">
        {metrics.map(([key, value]) => {
          const val = String(value)
          const trendUp = val.startsWith('\u25B2') || val.startsWith('+')
          const trendDown = val.startsWith('\u25BC') || val.startsWith('-')
          const trendClass = trendUp ? 'text-emerald-400' : trendDown ? 'text-pink-400' : 'text-zinc-300'
          return (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">{key}</span>
              <span className={`font-medium ${trendClass}`}>{val}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
