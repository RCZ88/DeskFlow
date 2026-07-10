import { type FC } from 'react'
import type { WireBlock } from '../../../services/wireFormat'

type Props = { block: WireBlock; onClick?: () => void }

export const NewsItemBlock: FC<Props> = ({ block, onClick }) => {
  const title = block.fields.title as string
  const summary = block.fields.summary as string
  const detail = block.fields.detail as string | undefined

  return (
    <div
      onClick={onClick}
      className="border-l-2 border-clay-400/50 bg-stone-900/40 hover:bg-stone-900/60 rounded-r-lg px-3 py-2.5 cursor-pointer transition-colors"
      style={{
        backgroundImage: `radial-gradient(circle, rgba(168,162,158,0.03) 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    >
      <p className="text-sm font-medium text-stone-200">{title}</p>
      {summary && <p className="text-xs text-stone-400 mt-0.5">{summary}</p>}
      {detail && <p className="text-xs text-stone-500 mt-1">{detail}</p>}
    </div>
  )
}
