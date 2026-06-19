import { type FC } from 'react'
import type { WireBlock } from '../../../services/wireFormat'

type Props = { block: WireBlock }

export const DataSummaryBlock: FC<Props> = ({ block }) => {
  const title = block.fields.title as string | undefined
  const metrics = Object.entries(block.fields).filter(([k]) => k !== 'title')

  return (
    <div className="space-y-1.5">
      {title && <p className="text-sm font-medium text-stone-200">{title}</p>}
      <div className="space-y-1">
        {metrics.map(([key, value]) => {
          const val = String(value)
          const trendUp = val.startsWith('\u25B2') || val.startsWith('+')
          const trendDown = val.startsWith('\u25BC') || val.startsWith('-')
          const trendClass = trendUp ? 'text-sage-400' : trendDown ? 'text-clay-400' : 'text-stone-300'
          return (
            <div key={key} className="flex items-center justify-between text-sm gap-3">
              <span className="text-stone-500 font-mono text-[13px]">{key}</span>
              <div className="flex items-center gap-2">
                {trendUp && <div className="w-12 h-1.5 rounded-full bg-stone-800/80 overflow-hidden">
                  <div className="h-full rounded-full bg-sage-400" style={{ width: `${Math.min(parseFloat(val) * 10, 100)}%` }} />
                </div>}
                {trendDown && <div className="w-12 h-1.5 rounded-full bg-stone-800/80 overflow-hidden">
                  <div className="h-full rounded-full bg-clay-400" style={{ width: `${Math.min(parseFloat(val.replace(/[^\d.-]/g, '')) * 10, 100)}%` }} />
                </div>}
                <span className={`font-medium text-[13px] font-mono ${trendClass}`}>{val}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
