import { type FC } from 'react'
import type { Block } from '../../../services/parseBlocks'

type Props = { block: Block }

export const GoalCreateBlock: FC<Props> = ({ block }) => {
  const title = block.fields.title as string
  const category = block.fields.category as string | undefined
  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20 px-3 py-2 text-sm">
      <span className="text-emerald-400 text-base leading-none font-medium">+</span>
      <span>
        Created goal <strong>{title}</strong>
        {category ? ` (${category})` : ''}
      </span>
    </div>
  )
}
