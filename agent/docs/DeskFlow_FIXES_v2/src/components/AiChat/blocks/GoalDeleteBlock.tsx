import { type FC } from 'react'
import type { WireBlock } from '../../../services/wireFormat'
import { Trash2 } from 'lucide-react'

type Props = { block: WireBlock }

export const GoalDeleteBlock: FC<Props> = ({ block }) => {
  const title = block.fields.title as string
  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg bg-stone-800/50 border border-stone-700/40 px-3 py-2 text-stone-400 text-sm">
      <Trash2 className="w-4 h-4 text-stone-500" />
      <span>
        Deleted goal <span className="line-through text-stone-500">{title}</span>
      </span>
    </div>
  )
}
