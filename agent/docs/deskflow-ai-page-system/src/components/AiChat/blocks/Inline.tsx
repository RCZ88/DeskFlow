import { type FC, Fragment } from 'react'
import type { InlineNode } from '../../../services/wireFormat'

type Props = {
  nodes: InlineNode[]
  accentClass?: string
}

export const InlineRenderer: FC<Props> = ({ nodes, accentClass = 'text-clay-300' }) => {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text':
            return <Fragment key={i}>{n.v}</Fragment>
          case 'bold':
            return <strong key={i} className="font-semibold text-stone-100">{n.v}</strong>
          case 'italic':
            return <em key={i} className="italic text-stone-200">{n.v}</em>
          case 'strike':
            return <del key={i} className="line-through text-stone-500">{n.v}</del>
          case 'code':
            return <code key={i} className="font-mono text-[12.5px] text-clay-300 bg-stone-800/60 rounded px-1">{n.v}</code>
          case 'metric':
            return <span key={i} className={`font-mono text-glow bg-stone-800/50 rounded px-1 ${accentClass}`}>{n.v}</span>
          case 'cite':
            return <sup key={i} className={`font-mono text-[11px] ${accentClass} cursor-help`}>[{n.id}]</sup>
          case 'link':
            return (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className="text-clay-300 hover:text-clay-200 underline underline-offset-2 decoration-clay-400/30">
                {n.v}
              </a>
            )
          default:
            return null
        }
      })}
    </>
  )
}
