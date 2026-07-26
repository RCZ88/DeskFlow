import { type FC } from 'react'
import type { WireBlock } from '../../../services/wireFormat'
import { ArrowRight } from 'lucide-react'

type Props = { block: WireBlock; onClick?: () => void }

export const NavigationBlock: FC<Props> = ({ block, onClick }) => {
  const page = block.fields.page ?? block.fields.route ?? ''
  const label = (block.fields.label as string) || page
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/10 border border-sky-400/30 px-3.5 py-2 text-sm text-sky-300 min-h-[44px] transition-colors hover:bg-sky-400/20 active:scale-[0.97] group"
    >
      {label}
      <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
    </button>
  )
}
