import { type FC } from 'react'
import type { Block } from '../../../services/parseBlocks'

type Props = { block: Block; onClick?: () => void }

export const NewsItemBlock: FC<Props> = ({ block, onClick }) => {
  const title = block.fields.title as string
  const summary = block.fields.summary as string
  const detail = block.fields.detail as string | undefined

  return (
    <div
      onClick={onClick}
      className="border-l-2 border-pink-500/50 bg-zinc-900/40 hover:bg-zinc-900/60 rounded-r-lg px-3 py-2.5 cursor-pointer transition-colors"
    >
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {summary && <p className="text-xs text-zinc-400 mt-0.5">{summary}</p>}
      {detail && <p className="text-xs text-zinc-500 mt-1">{detail}</p>}
    </div>
  )
}
