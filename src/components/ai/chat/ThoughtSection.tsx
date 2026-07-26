import { useState, useEffect } from "react"
import { Brain, ChevronRight, ChevronDown } from "lucide-react"

interface ThoughtSectionProps {
  thoughts: string[]
  forceOpen?: boolean
}

export function ThoughtSection({ thoughts, forceOpen }: ThoughtSectionProps) {
  const [expanded, setExpanded] = useState(false)

  // During streaming, force open so user sees thinking text
  useEffect(() => {
    if (forceOpen) setExpanded(true)
  }, [forceOpen])

  // When streaming ends, collapse after a short delay
  useEffect(() => {
    if (!forceOpen && expanded) {
      const t = setTimeout(() => setExpanded(false), 1500)
      return () => clearTimeout(t)
    }
  }, [forceOpen, expanded])

  if (!thoughts.length) return null

  return (
    <div className="dk-thought">
      <div
        className="dk-thought-header"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Brain size={12} className="text-zinc-500" />
        <span>Thinking{thoughts.length > 1 ? ` (${thoughts.length})` : ""}</span>
        {forceOpen && (
          <span className="ml-auto flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400/80 animate-pulse" />
            <span className="text-[10px] text-pink-400/60">streaming</span>
          </span>
        )}
      </div>
      {expanded && (
        <div className="dk-thought-content">
          {thoughts.map((t, i) => (
            <div key={i} style={{ marginBottom: i < thoughts.length - 1 ? 8 : 0 }}>
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function extractThoughts(content: string): { thoughts: string[]; cleanContent: string } {
  const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/gi
  const thoughts: string[] = []
  let cleanContent = content
  let match
  while ((match = thoughtRegex.exec(content)) !== null) {
    thoughts.push(match[1].trim())
    cleanContent = cleanContent.replace(match[0], "")
  }
  return { thoughts, cleanContent: cleanContent.trim() }
}
