import { type FC } from 'react'
import type { Block } from '../../../services/parseBlocks'

type Props = { block: Block }

export const TextBlock: FC<Props> = ({ block }) => {
  const body = block.fields.body as string
  return <p className="text-sm text-zinc-300 whitespace-pre-wrap">{body}</p>
}
