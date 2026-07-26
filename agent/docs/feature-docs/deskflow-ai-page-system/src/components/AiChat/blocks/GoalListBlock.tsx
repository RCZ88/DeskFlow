import { type FC } from 'react'
import type { WireBlock } from '../../../services/wireFormat'

type Props = { block: WireBlock }

export const GoalListBlock: FC<Props> = ({ block }) => {
  const title = block.fields.title as string | undefined
  const summary = block.fields.summary as string | undefined
  const items = block.items ?? []
  const done = items.filter(i => i.checked).length
  const total = items.length

  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-medium text-stone-200">{title}</p>}
      <div className="space-y-1">
        {items.map((item, i) => (
          <label key={i} className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px] px-2 -mx-2 rounded-lg hover:bg-stone-800/40 transition-colors">
            <input
              type="checkbox"
              checked={item.checked}
              readOnly
              className="accent-sage-400 w-4 h-4 rounded border-stone-600"
            />
            <span className={item.checked ? 'line-through text-stone-500' : 'text-stone-300'}>
              {item.label}
            </span>
            {item.category && <span className="text-[11px] text-stone-600 ml-auto">{item.category}</span>}
          </label>
        ))}
      </div>
      {total > 0 && (
        <div className="space-y-1.5">
          <svg className="w-full h-3" viewBox="0 0 100 4">
            <rect x="0" y="0" width="100" height="4" rx="2" className="fill-stone-800/80" />
            <rect x="0" y="0" width={`${(done / total) * 100}`} height="4" rx="2" className="fill-sage-400 transition-all duration-300 ease-out" />
          </svg>
          {summary && <p className="text-xs text-stone-500">{summary}</p>}
        </div>
      )}
    </div>
  )
}
