import { type FC, useState, useEffect } from 'react'
import { TextBlock } from './blocks/TextBlock'
import type { WireNode, WireBlock } from '../../services/wireFormat'

type Props = {
  nodes: WireNode[]
  speed?: number
  onDone?: () => void
}

function extractTextBlocks(nodes: WireNode[]): WireBlock[] {
  const result: WireBlock[] = []
  for (const n of nodes) {
    if (n.kind === 'group') {
      for (const c of n.children) {
        if (c.type === 'text') result.push(c)
      }
    } else if (n.type === 'text') {
      result.push(n)
    }
  }
  return result
}

function estimateChars(textBlocks: WireBlock[]): number {
  let total = 0
  for (const b of textBlocks) {
    if (b.prose) {
      for (const n of b.prose) {
        if (n.t === 'text') total += n.v.length
      }
    }
    const body = b.fields.body ?? b.fields.text ?? ''
    if (typeof body === 'string') total += body.length
  }
  return total
}

export const TypewriterText: FC<Props> = ({ nodes, speed = 12, onDone }) => {
  const textBlocks = extractTextBlocks(nodes)
  const [revealedChars, setRevealedChars] = useState(0)
  const totalChars = estimateChars(textBlocks)

  useEffect(() => {
    if (totalChars === 0) {
      onDone?.()
      return
    }

    const duration = Math.min(totalChars * (1000 / speed), 3000)
    let startedAt: number | null = null
    let done = false

    const animate = (now: number) => {
      if (!startedAt) startedAt = now
      const elapsed = now - startedAt
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const count = Math.floor(eased * totalChars)
      setRevealedChars(count)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setRevealedChars(totalChars)
        if (!done) {
          done = true
          onDone?.()
        }
      }
    }

    const rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [textBlocks, speed, totalChars, onDone])

  if (totalChars === 0) {
    return (
      <>
        {nodes.filter(n => n.kind !== 'group' ? n.type !== 'text' : true).map((n, i) => {
          if (n.kind === 'group') return null
          return <TextBlock key={i} block={n} />
        })}
      </>
    )
  }

  let accumulated = 0
  let revealedAny = false

  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === 'group') return null

        if (node.type !== 'text') {
          return <TextBlock key={i} block={node} />
        }

        const body = (node.prose?.reduce((s, n) => n.t === 'text' ? s + n.v : s, '') ?? node.fields.body ?? '') as string
        const blockLen = typeof body === 'string' ? body.length : 0
        const remaining = revealedChars - accumulated
        accumulated += blockLen

        if (remaining <= 0 && revealedAny) return null
        if (remaining >= blockLen) {
          revealedAny = true
          return <TextBlock key={i} block={node} />
        }

        revealedAny = true
        const truncated = node.prose
          ? [{ ...node, prose: node.prose.slice(0, Math.max(1, Math.floor((remaining / blockLen) * (node.prose?.length ?? 1)))) } as WireBlock]
          : [{ ...node, fields: { ...node.fields, body: body.slice(0, Math.max(0, remaining)) } }]
        return <TextBlock key={i} block={truncated[0]} />
      })}
    </>
  )
}
