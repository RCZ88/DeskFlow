import { useState, useMemo } from 'react'
import { MarkdownRenderer } from '../chat/MarkdownRenderer'
import { ThoughtSection, extractThoughts } from '../chat/ThoughtSection'
import { Sparkles, User } from 'lucide-react'

interface ResponseCardContentProps {
  content: string
  isToolOutput?: boolean
  timestamp?: string
  isUserInput?: boolean
  aiResponse?: string
  aiTimestamp?: string
}

export function ResponseCardContent({ content, isToolOutput, timestamp, isUserInput, aiResponse, aiTimestamp }: ResponseCardContentProps) {
  const [expanded, setExpanded] = useState(false)

  const { thoughts, cleanContent } = useMemo(() => {
    if (isToolOutput) return { thoughts: [], cleanContent: content }
    return extractThoughts(content)
  }, [content, isToolOutput])

  // If this is a user input card with an AI response paired
  if (isUserInput && aiResponse) {
    const { thoughts: aiThoughts, cleanContent: aiClean } = extractThoughts(aiResponse)
    const isLong = aiClean.length > 500
    const displayAi = expanded ? aiClean : aiClean.slice(0, 500)

    return (
      <div className="space-y-3">
        {/* User Input */}
        <div className="dk-response-card dk-response-user">
          <div className="dk-response-header">
            <User size={11} className="text-cyan-400" />
            <span className="dk-response-label">You</span>
            {timestamp && <span className="dk-response-time">{timestamp}</span>}
          </div>
          <div className="dk-response-body">
            <MarkdownRenderer content={content} />
          </div>
        </div>

        {/* AI Response */}
        <div className={`dk-response-card ${isToolOutput ? 'dk-response-tool' : ''}`}>
          <div className="dk-response-header">
            <Sparkles size={11} className="text-violet-400" />
            <span className="dk-response-label">AI Response</span>
            {aiTimestamp && <span className="dk-response-time">{aiTimestamp}</span>}
          </div>

          {isToolOutput && (
            <div className="dk-response-tool-badge">Tool Output</div>
          )}

          {aiThoughts.length > 0 && (
            <ThoughtSection thoughts={aiThoughts} />
          )}

          <div className="dk-response-body">
            <MarkdownRenderer content={displayAi} />
          </div>

          {isLong && (
            <button className="dk-response-expand" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Standalone AI response (no user input paired)
  const isLong = cleanContent.length > 500
  const displayContent = expanded ? cleanContent : cleanContent.slice(0, 500)

  return (
    <div className={`dk-response-card ${isToolOutput ? 'dk-response-tool' : ''}`}>
      <div className="dk-response-header">
        <Sparkles size={11} className="text-violet-400" />
        <span className="dk-response-label">AI Response</span>
        {timestamp && <span className="dk-response-time">{timestamp}</span>}
      </div>

      {isToolOutput && (
        <div className="dk-response-tool-badge">Tool Output</div>
      )}

      {thoughts.length > 0 && (
        <ThoughtSection thoughts={thoughts} />
      )}

      <div className="dk-response-body">
        <MarkdownRenderer content={displayContent} />
      </div>

      {isLong && (
        <button className="dk-response-expand" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
