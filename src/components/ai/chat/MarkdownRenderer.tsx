import { useMemo, type ReactNode } from "react"

interface MarkdownRendererProps {
  content: string
  className?: string
}

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={parts.length} className="font-semibold text-zinc-200">{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<em key={parts.length} className="italic text-zinc-400">{match[3]}</em>)
    } else if (match[4]) {
      parts.push(
        <code key={parts.length} className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-pink-300 text-[13px] font-mono">
          {match[4]}
        </code>
      )
    } else if (match[5] && match[6]) {
      parts.push(
        <a
          key={parts.length}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors"
        >
          {match[5]}
        </a>
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length === 0 ? text : parts
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const nodes = useMemo(() => {
    if (!content) return null
    const lines = content.split("\n")
    const result: ReactNode[] = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Fenced code block
      if (line.trimStart().startsWith("```")) {
        const lang = line.trimStart().slice(3).trim()
        const codeLines: string[] = []
        i++
        while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
          codeLines.push(lines[i])
          i++
        }
        i++ // skip closing ```
        result.push(
          <div key={result.length} className="dk-code-block">
            {lang && <div className="dk-code-lang">{lang}</div>}
            <code>{codeLines.join("\n")}</code>
          </div>
        )
        continue
      }

      // Headings
      const h3Match = line.match(/^### (.+)/)
      const h2Match = line.match(/^## (.+)/)
      const h1Match = line.match(/^# (.+)/)
      if (h3Match) {
        result.push(<h3 key={result.length} className="text-sm font-semibold text-zinc-200 mt-4 mb-1">{renderInline(h3Match[1])}</h3>)
        i++; continue
      }
      if (h2Match) {
        result.push(<h2 key={result.length} className="text-base font-semibold text-zinc-100 mt-5 mb-2">{renderInline(h2Match[1])}</h2>)
        i++; continue
      }
      if (h1Match) {
        result.push(<h1 key={result.length} className="text-lg font-bold text-zinc-100 mt-6 mb-2">{renderInline(h1Match[1])}</h1>)
        i++; continue
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
        result.push(<hr key={result.length} className="my-4 border-t border-zinc-800/60" />)
        i++; continue
      }

      // Unordered list
      const ulMatch = line.match(/^[\s]*[-*+] (.+)/)
      if (ulMatch) {
        const items: string[] = [ulMatch[1]]
        i++
        while (i < lines.length) {
          const next = lines[i].match(/^[\s]*[-*+] (.+)/)
          if (next) { items.push(next[1]); i++ } else break
        }
        result.push(
          <ul key={result.length} className="my-1 ml-5 list-disc text-[13px] text-zinc-300 space-y-1">
            {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
          </ul>
        )
        continue
      }

      // Ordered list
      const olMatch = line.match(/^[\s]*\d+\. (.+)/)
      if (olMatch) {
        const items: string[] = [olMatch[1]]
        i++
        while (i < lines.length) {
          const next = lines[i].match(/^[\s]*\d+\. (.+)/)
          if (next) { items.push(next[1]); i++ } else break
        }
        result.push(
          <ol key={result.length} className="my-1 ml-5 list-decimal text-[13px] text-zinc-300 space-y-1">
            {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
          </ol>
        )
        continue
      }

      // Blockquote
      if (line.startsWith("> ")) {
        result.push(
          <blockquote key={result.length} className="my-3 pl-3 border-l-2 border-pink-500/40 text-[13px] text-zinc-400 italic">
            {renderInline(line.slice(2))}
          </blockquote>
        )
        i++; continue
      }

      // Empty line
      if (line.trim() === "") {
        i++; continue
      }

      // Paragraph
      const paraLines: string[] = [line]
      i++
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !lines[i].match(/^#{1,3} /) &&
        !lines[i].startsWith("```") &&
        !lines[i].startsWith("> ") &&
        !lines[i].match(/^[\s]*[-*+] /) &&
        !lines[i].match(/^[\s]*\d+\. /) &&
        !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i].trim())
      ) {
        paraLines.push(lines[i])
        i++
      }
      result.push(
        <p key={result.length} className="my-1 text-[13px] text-zinc-300 leading-relaxed">
          {renderInline(paraLines.join("\n"))}
        </p>
      )
    }

    return result
  }, [content])

  return <div className={className}>{nodes}</div>
}
