import { type FC } from 'react'
import type { Block } from '../../../services/parseBlocks'

type Props = { block: Block }

export const GoalDeleteBlock: FC<Props> = ({ block }) => {
  const title = block.fields.title as string
  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg bg-red-500/10 text-red-300 ring-1 ring-red-500/20 px-3 py-2 text-sm">
      <span className="text-red-400 text-base leading-none">✕</span>
      <span>
        Deleted goal <span className="line-through text-zinc-500">{title}</span>
      </span>
    </div>
  )
}
