import React, { type FC, Fragment } from 'react'
import type { WireBlock } from '../../../services/wireFormat'
import { InlineRenderer } from './Inline'

type Props = { block: WireBlock }

function mdToReact(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < text.length) {
    const remaining = text.slice(i)

    const codeBlockMatch = remaining.match(/^```(\w*)\n([\s\S]*?)```\n?/)
    if (codeBlockMatch) {
      const [, lang, code] = codeBlockMatch
      nodes.push(
        <pre key={key++} className="my-2 rounded-lg bg-stone-950/80 border border-stone-800/60 overflow-x-auto">
          {lang && <div className="px-3 py-1 text-[10px] text-stone-500 border-b border-stone-800/40 font-mono uppercase tracking-wider">{lang}</div>}
          <code className="block px-3 py-2.5 text-xs text-stone-200 font-mono leading-relaxed">{code.trim()}</code>
        </pre>
      )
      i += codeBlockMatch[0].length
      continue
    }

    const headingMatch = remaining.match(/^#{1,3}\s+(.+)\n?/)
    if (headingMatch) {
      const level = headingMatch[0].trim().startsWith('###') ? 3 : headingMatch[0].trim().startsWith('## ') ? 2 : 1
      const Tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5'
      nodes.push(
        <Tag key={key++} className="text-sm font-semibold text-stone-100 mt-3 mb-1.5">
          {headingMatch[1]}
        </Tag>
      )
      i += headingMatch[0].length
      continue
    }

    const quoteMatch = remaining.match(/^>\s*(.+)\n?/)
    if (quoteMatch) {
      nodes.push(
        <blockquote key={key++} className="border-l-2 border-stone-600/50 pl-3 my-1.5 text-sm text-stone-400 italic">
          {quoteMatch[1]}
        </blockquote>
      )
      i += quoteMatch[0].length
      continue
    }

    const ulMatch = remaining.match(/^[-*]\s+(.+)\n?/)
    if (ulMatch) {
      const items: string[] = [ulMatch[1]]
      let j = i + ulMatch[0].length
      while (j < text.length) {
        const nextItem = text.slice(j).match(/^[-*]\s+(.+)\n?/)
        if (nextItem) { items.push(nextItem[1]); j += nextItem[0].length }
        else break
      }
      nodes.push(
        <ul key={key++} className="list-disc list-inside my-1 space-y-0.5 text-sm text-stone-300">
          {items.map((item, idx) => <li key={idx}>{renderInline(item)}</li>)}
        </ul>
      )
      i = j
      continue
    }

    const olMatch = remaining.match(/^\d+\.\s+(.+)\n?/)
    if (olMatch) {
      const items: string[] = [olMatch[1]]
      let j = i + olMatch[0].length
      while (j < text.length) {
        const nextItem = text.slice(j).match(/^\d+\.\s+(.+)\n?/)
        if (nextItem) { items.push(nextItem[1]); j += nextItem[0].length }
        else break
      }
      nodes.push(
        <ol key={key++} className="list-decimal list-inside my-1 space-y-0.5 text-sm text-stone-300">
          {items.map((item, idx) => <li key={idx}>{renderInline(item)}</li>)}
        </ol>
      )
      i = j
      continue
    }

    const hrMatch = remaining.match(/^---+\n?/)
    if (hrMatch) {
      nodes.push(<hr key={key++} className="my-3 border-stone-800/60" />)
      i += hrMatch[0].length
      continue
    }

    const paraEnd = remaining.search(/\n\n|\n(?=#|\||>|---|[-*]\s|\d+\.\s)/)
    if (paraEnd === 0) {
      i += 1
      continue
    }
    const para = paraEnd === -1 ? remaining.trimEnd() : remaining.slice(0, paraEnd)
    if (para) {
      nodes.push(
        <p key={key++} className="text-sm text-stone-300 leading-relaxed mb-1.5 last:mb-0 font-serif">{renderInline(para)}</p>
      )
      i += paraEnd === -1 ? remaining.length : paraEnd
    } else {
      i += 1
    }
  }

  return nodes
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < text.length) {
    const remaining = text.slice(i)

    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-stone-800/80 text-[13px] text-clay-300 font-mono">{codeMatch[1]}</code>)
      i += codeMatch[0].length
      continue
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      parts.push(<a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-clay-300 hover:text-clay-200 underline underline-offset-2 decoration-clay-400/30">{linkMatch[1]}</a>)
      i += linkMatch[0].length
      continue
    }

    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-semibold text-stone-100">{boldMatch[1]}</strong>)
      i += boldMatch[0].length
      continue
    }

    const italicMatch = remaining.match(/^_([^_]+)_/)
    if (italicMatch) {
      parts.push(<em key={key++} className="italic text-stone-200">{italicMatch[1]}</em>)
      i += italicMatch[0].length
      continue
    }

    const strikethroughMatch = remaining.match(/^~~([^~]+)~~/)
    if (strikethroughMatch) {
      parts.push(<del key={key++} className="line-through text-stone-500">{strikethroughMatch[1]}</del>)
      i += strikethroughMatch[0].length
      continue
    }

    if (remaining[0] === '\n') { i += 1; continue }
    if (remaining[0] === '|' || remaining[0] === '-') {
      const tableLine = remaining.match(/^[|\-:\s]+\n?/)
      if (tableLine) { i += tableLine[0].length; continue }
    }

    const chunkEnd = remaining.search(/[`[*_[~(!]|(?=\n)/)
    if (chunkEnd === 0) { i += 1; continue }
    const chunk = chunkEnd === -1 ? remaining : remaining.slice(0, chunkEnd)
    if (chunk) { parts.push(<Fragment key={key++}>{chunk}</Fragment>) }
    i += chunkEnd === -1 ? remaining.length : chunkEnd
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}

function renderProse(prose: NonNullable<WireBlock['prose']>): React.ReactNode {
  const paragraphs: React.ReactNode[] = []
  let current: React.ReactNode[] = []
  let key = 0

  for (const n of prose) {
    if (n.t === 'text' && n.v === '\n') {
      if (current.length > 0) {
        paragraphs.push(
<p key={key++} className="text-[15px] leading-[1.7] text-stone-300 max-w-[62ch] mb-1.5 last:mb-0 font-serif">
            {current.map((c, i) => <Fragment key={i}>{c}</Fragment>)}
          </p>
        )
        current = []
      }
      continue
    }
    current.push(<InlineRenderer key={`${key}-${current.length}`} nodes={[n]} />)
  }

  if (current.length > 0) {
    paragraphs.push(
      <p key={key++} className="text-[15px] leading-[1.7] text-stone-300 max-w-[62ch] mb-1.5 last:mb-0">
        {current.map((c, i) => <Fragment key={i}>{c}</Fragment>)}
      </p>
    )
  }

  return paragraphs.length > 0 ? <>{paragraphs}</> : null
}

export const TextBlock: FC<Props> = ({ block }) => {
  if (block.prose && block.prose.length > 0) {
    return <div className="space-y-0.5">{renderProse(block.prose)}</div>
  }

  const body = block.fields.body as string
  if (!body) return null
  return <div className="space-y-0.5">{mdToReact(body)}</div>
}
