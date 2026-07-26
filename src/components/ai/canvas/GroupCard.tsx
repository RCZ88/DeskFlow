import { useState } from 'react'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { MarkdownRenderer } from '../chat/MarkdownRenderer'

interface GroupCardProps {
  items: Array<{ content: string; timestamp?: string; isToolOutput?: boolean }>
}

export function GroupCard({ items }: GroupCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  return (
    <div className="dk-group-card">
      <button
        className="dk-group-header"
        onClick={() => setExpanded(v => !v)}
      >
        <MessageSquare size={12} className="text-violet-400" />
        <span className="dk-group-title">{items.length} responses</span>
        <ChevronDown
          size={12}
          className={`text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="dk-group-body">
          {items.map((item, i) => (
            <div key={i} className="dk-group-item">
              {item.isToolOutput && (
                <div className="dk-response-tool-badge">Tool Output</div>
              )}
              <div className="dk-response-body">
                <MarkdownRenderer content={item.content} />
              </div>
              {item.timestamp && (
                <div className="dk-response-time">{item.timestamp}</div>
              )}
              {i < items.length - 1 && <div className="dk-group-divider" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
