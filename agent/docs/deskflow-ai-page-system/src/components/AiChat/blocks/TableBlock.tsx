import { type FC } from 'react'
import type { WireBlock } from '../../../services/wireFormat'

type Props = { block: WireBlock }

export const TableBlock: FC<Props> = ({ block }) => {
  const rows = block.rows ?? []
  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] font-mono">
        <thead>
          <tr className="divide-x divide-stone-800/60">
            {rows[0].map((cell, i) => (
              <th key={i} className="text-left px-3 py-1.5 text-stone-400 font-medium">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800/60">
          {rows.slice(1).map((row, i) => (
            <tr key={i} className="odd:bg-stone-900/30 divide-x divide-stone-800/60">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 text-stone-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
