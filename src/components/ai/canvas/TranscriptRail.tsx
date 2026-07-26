import { useRef, useEffect, useState } from 'react'
import { TranscriptMessage } from './TranscriptMessage'
import type { ChatMsg } from '../../../hooks/useAiChat'

interface TranscriptRailProps {
  isOpen: boolean
  onClose: () => void
  messages: ChatMsg[]
  onSend: (text: string) => void
  threadTitle?: string
}

export function TranscriptRail({ isOpen, onClose, messages, onSend, threadTitle }: TranscriptRailProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages.length])

  if (!isOpen) return null

  return (
    <div className="dk-rail">
      <div className="dk-rail-header">
        <div className="dk-rail-title">
          <span>{threadTitle || 'Conversation'}</span>
          <span className="dk-rail-count">{messages.length} messages</span>
        </div>
        <button className="dk-rail-close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="dk-rail-body" ref={listRef}>
        {messages.length === 0 ? (
          <div className="dk-rail-empty">No messages yet. Ask something.</div>
        ) : (
          messages.map((msg, i) => (
            <TranscriptMessage key={msg.id || i} message={msg} />
          ))
        )}
      </div>

      <div className="dk-rail-footer">
        <TranscriptInput onSend={onSend} />
      </div>
    </div>
  )
}

function TranscriptInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div className="dk-rail-input-row">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => {
          setText(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = e.target.scrollHeight + 'px'
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Ask a follow-up..."
        rows={1}
        className="dk-rail-textarea"
      />
      <button
        className="dk-rail-send"
        onClick={handleSubmit}
        disabled={!text.trim()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}
