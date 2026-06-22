import { type FC } from 'react'
import type { WireNode, ParsedResponse, WireBlock } from '../../services/wireFormat'
import { GoalListBlock } from './blocks/GoalListBlock'
import { GoalCreateBlock } from './blocks/GoalCreateBlock'
import { GoalDeleteBlock } from './blocks/GoalDeleteBlock'
import { NewsItemBlock } from './blocks/NewsItemBlock'
import { DataSummaryBlock } from './blocks/DataSummaryBlock'
import { ErrorBlock } from './blocks/ErrorBlock'
import { NavigationBlock } from './blocks/NavigationBlock'
import { TextBlock } from './blocks/TextBlock'
import { GroupShell } from './blocks/GroupShell'
import { TableBlock } from './blocks/TableBlock'
import { ConfirmBlock } from './blocks/ConfirmBlock'
import { SourcesBlock } from './blocks/SourcesBlock'

type Props = {
  nodes: WireNode[]
  refs: ParsedResponse['refs']
  onNewsClick?: () => void
  onNavigate?: (page: string, section?: string, tab?: string) => void
  onRetry?: () => void
}

function BlockRouter({ block, refs, onNewsClick, onNavigate, onRetry, index }: {
  block: WireBlock
  refs: ParsedResponse['refs']
  onNewsClick?: () => void
  onNavigate?: (page: string, section?: string, tab?: string) => void
  onRetry?: () => void
  index: number
}) {
  const meta = block.meta
  const priorityScale = meta.priority === 'tertiary' ? 'opacity-60 scale-[0.92]' : ''

  switch (block.type) {
    case 'goal-list':
      return <div className={priorityScale}><GoalListBlock block={block} /></div>
    case 'goal-create':
      return <div className={priorityScale}><GoalCreateBlock block={block} /></div>
    case 'goal-delete':
      return <div className={priorityScale}><GoalDeleteBlock block={block} /></div>
    case 'news-item':
      return <div className={priorityScale}><NewsItemBlock block={block} onClick={onNewsClick} /></div>
    case 'data-summary':
      return <div className={priorityScale}><DataSummaryBlock block={block} /></div>
    case 'error':
      return <div className={priorityScale}><ErrorBlock block={block} onRetry={onRetry} /></div>
    case 'navigation':
      return <div className={priorityScale}><NavigationBlock block={block} onClick={() => onNavigate?.(
        block.fields.page ?? block.fields.route ?? '',
        (block.fields.section as string) || undefined,
        (block.fields.tab as string) || undefined,
      )} /></div>
    case 'table':
      return <div className={priorityScale}><TableBlock block={block} /></div>
    case 'confirm':
      return <div className={priorityScale}><ConfirmBlock block={block} /></div>
    case 'sources':
      return <div className={priorityScale}><SourcesBlock block={block} refs={refs} /></div>
    case 'text':
      return <div className={priorityScale}><TextBlock block={block} /></div>
    default:
      return <TextBlock block={block} />
  }
}

export const BlockRenderer: FC<Props> = ({ nodes, refs, onNewsClick, onNavigate, onRetry }) => {
  if (!nodes || nodes.length === 0) {
    return <p className="text-sm text-stone-500">(empty message)</p>
  }
  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === 'group') {
          return <GroupShell key={i} title={node.title} accent={node.accent}>
            {node.children.map((b, j) => (
              <BlockRouter key={j} block={b} refs={refs} onNewsClick={onNewsClick} onNavigate={onNavigate} onRetry={onRetry} index={j} />
            ))}
          </GroupShell>
        }
        return (
          <BlockRouter
            key={i}
            block={node}
            refs={refs}
            onNewsClick={onNewsClick}
            onNavigate={onNavigate}
            onRetry={onRetry}
            index={i}
          />
        )
      })}
    </>
  )
}
