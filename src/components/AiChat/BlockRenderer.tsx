import { type FC } from 'react'
import type { Block } from '../../services/parseBlocks'
import { GoalListBlock } from './blocks/GoalListBlock'
import { GoalCreateBlock } from './blocks/GoalCreateBlock'
import { GoalDeleteBlock } from './blocks/GoalDeleteBlock'
import { NewsItemBlock } from './blocks/NewsItemBlock'
import { DataSummaryBlock } from './blocks/DataSummaryBlock'
import { ErrorBlock } from './blocks/ErrorBlock'
import { NavigationBlock } from './blocks/NavigationBlock'
import { TextBlock } from './blocks/TextBlock'

type Props = {
  blocks: Block[]
  onNewsClick?: () => void
  onNavigate?: (page: string) => void
  onRetry?: () => void
}

export const BlockRenderer: FC<Props> = ({ blocks, onNewsClick, onNavigate, onRetry }) => {
  if (!blocks || blocks.length === 0) {
    return <p className="text-sm text-zinc-500">(empty message)</p>
  }
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'goal-list':
            return <GoalListBlock key={i} block={block} />
          case 'goal-create':
            return <GoalCreateBlock key={i} block={block} />
          case 'goal-delete':
            return <GoalDeleteBlock key={i} block={block} />
          case 'news-item':
            return <NewsItemBlock key={i} block={block} onClick={onNewsClick} />
          case 'data-summary':
            return <DataSummaryBlock key={i} block={block} />
          case 'error':
            return <ErrorBlock key={i} block={block} onRetry={onRetry} />
          case 'navigation':
            return <NavigationBlock key={i} block={block} onClick={() => onNavigate?.(String(block.fields.page))} />
          case 'text':
            return <TextBlock key={i} block={block} />
          default:
            return <TextBlock key={i} block={{ type: 'text', fields: { body: String(block.fields.body || '') } }} />
        }
      })}
    </>
  )
}
