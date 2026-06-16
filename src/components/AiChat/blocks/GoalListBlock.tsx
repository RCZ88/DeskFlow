import { type FC } from 'react'
import type { Block, Item } from '../../../services/parseBlocks'

type Props = { block: Block }

export const GoalListBlock: FC<Props> = ({ block }) => {
  const title = block.fields.title as string | undefined
  const items = block.fields.items as Item[] | undefined
  const summary = block.fields.summary as string | undefined
  const done = items?.filter(i => i.checked).length ?? 0
  const total = items?.length ?? 0

  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-medium text-zinc-200">{title}</p>}
      <div className="space-y-1">
        {items?.map((item, i) => (
          <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={item.checked} readOnly className="accent-emerald-500" />
            <span className={item.checked ? 'line-through text-zinc-500' : 'text-zinc-300'}>{item.label}</span>
            {item.category && <span className="text-[11px] text-zinc-600">{item.category}</span>}
          </label>
        ))}
      </div>
      {total > 0 && (
        <div className="space-y-1">
            <div className="bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          {summary && <p className="text-xs text-zinc-500">{summary}</p>}
        </div>
      )}
    </div>
  )
}
