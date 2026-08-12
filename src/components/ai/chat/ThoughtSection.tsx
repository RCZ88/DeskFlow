import { useState, useEffect, useRef } from "react"
import { Brain, ChevronRight, ChevronDown } from "lucide-react"

interface ThoughtSectionProps {
  thoughts: string[]
  forceOpen?: boolean
}

export function ThoughtSection({ thoughts, forceOpen }: ThoughtSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const prevCountRef = useRef(thoughts.length)

  // Auto-expand when new thoughts arrive (streaming or not)
  useEffect(() => {
    if (thoughts.length > prevCountRef.current) {
      setExpanded(true)
    }
    prevCountRef.current = thoughts.length
  }, [thoughts.length])

  // During streaming, force open so user sees thinking text
  useEffect(() => {
    if (forceOpen) setExpanded(true)
  }, [forceOpen])

  // When streaming ends, collapse after a short delay
  useEffect(() => {
    if (!forceOpen && expanded && thoughts.length > 0) {
      const t = setTimeout(() => setExpanded(false), 2000)
      return () => clearTimeout(t)
    }
  }, [forceOpen, expanded, thoughts.length])

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
  if (!content) return { thoughts: [], cleanContent: content }

  const thoughts: string[] = []
  let cleanContent = content

  // Extract complete <thought>...</thought> pairs
  const completeRegex = /<thought>([\s\S]*?)<\/thought>/gi
  let match
  while ((match = completeRegex.exec(content)) !== null) {
    thoughts.push(match[1].trim())
    cleanContent = cleanContent.replace(match[0], '')
  }

  // Handle partial/incomplete <thought> during streaming:
  // If there's an opening <thought> tag without a closing </thought>,
  // extract its content as an in-progress thought and remove the raw tag.
  const partialRegex = /<thought>([\s\S]*?)$/i
  const partialMatch = partialRegex.exec(cleanContent)
  if (partialMatch) {
    // There's an unclosed <thought> — treat everything after it as thinking
    const partialContent = partialMatch[1].trim()
    if (partialContent) {
      thoughts.push(partialContent)
    }
    // Remove the partial tag and everything after it from cleanContent
    cleanContent = cleanContent.slice(0, partialMatch.index).trim()
  }

  return { thoughts, cleanContent: cleanContent.trim() }
}
