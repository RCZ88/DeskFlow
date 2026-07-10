import { type FC } from 'react'
import type { WireBlock, ParsedResponse } from '../../../services/wireFormat'
import { useNavigate } from 'react-router-dom'

type Props = { block: WireBlock; refs: ParsedResponse['refs'] }

export const SourcesBlock: FC<Props> = ({ refs }) => {
  const navigate = useNavigate()
  const entries = Object.entries(refs)
  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([id, ref]) => (
        <button
          key={id}
          onClick={() => ref.href ? navigate(ref.href) : undefined}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-stone-500 bg-stone-800/40 hover:bg-stone-800/70 rounded-full px-2.5 py-1 transition-colors"
        >
          <span className="text-clay-300">[{id}]</span>
          {ref.label}
        </button>
      ))}
    </div>
  )
}
