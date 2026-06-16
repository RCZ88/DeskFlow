import { type FC } from 'react'
import type { Block } from '../../../services/parseBlocks'

type Props = { block: Block; onClick?: () => void }

export const NavigationBlock: FC<Props> = ({ block, onClick }) => {
  const page = block.fields.page as string
  const label = (block.fields.label as string) || page
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-sm text-zinc-200 transition-colors"
    >
      <span>→</span>
      {label}
    </button>
  )
}
