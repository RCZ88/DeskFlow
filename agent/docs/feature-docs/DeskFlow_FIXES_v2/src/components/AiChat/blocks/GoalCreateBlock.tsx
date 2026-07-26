import { type FC } from 'react'
import type { WireBlock } from '../../../services/wireFormat'
import { Check } from 'lucide-react'

type Props = { block: WireBlock }

export const GoalCreateBlock: FC<Props> = ({ block }) => {
  const title = block.fields.title as string
  const category = block.fields.category as string | undefined
  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg bg-sage-400/10 border border-sage-400/25 px-3 py-2 text-sage-300 text-sm">
      <Check className="w-4 h-4 text-sage-400" />
      <span>
        Created goal <strong>{title}</strong>
        {category ? ` (${category})` : ''}
      </span>
    </div>
  )
}
