import { type FC, useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { sanitizeInput, MAX_INPUT_LENGTH } from '../../services/chatSafety'
import { VoiceInputButton } from '../VoiceInputButton'

type Props = {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export const ChatInput: FC<Props> = ({ onSend, disabled, placeholder, className }) => {
  const [text, setText] = useState('')
  const [justSent, setJustSent] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = sanitizeInput(text.trim())
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    setJustSent(true)
    setTimeout(() => setJustSent(false), 600)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, disabled, onSend])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleInput = useCallback((value: string) => {
    if (value.length > MAX_INPUT_LENGTH) return
    setText(value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 5 * 24) + 'px'
    }
  }, [])

  const isEmpty = !text.trim()
  const canSend = !disabled && !isEmpty
  const progress = text.length / MAX_INPUT_LENGTH
  const circumference = 2 * Math.PI * 7
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1))

  return (
    <div className={`relative bg-stone-950/60 backdrop-blur-md px-4 py-3 ${className ?? ''}`}>
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(232,134,107,0.4), transparent)',
        }}
      />
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            placeholder={placeholder ?? 'Ask about your day, manage goals\u2026'}
            className="w-full resize-none bg-stone-900/70 border border-stone-800/50 focus:border-clay-400/40 focus:bg-stone-900/90 rounded-xl pr-4 pl-4 py-2.5 text-[13px] font-mono text-stone-100 placeholder:text-stone-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-clay-400/20"
          />
        </div>
        <VoiceInputButton
          onTranscript={(t) => {
            setText(prev => prev ? prev + ' ' + t : t)
            textareaRef.current?.focus()
          }}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center ${
            canSend
              ? justSent
                ? 'bg-sage-400 text-stone-950'
                : 'bg-clay-500/90 hover:bg-clay-400 text-stone-950'
              : 'bg-stone-800/60 text-stone-600 cursor-not-allowed'
          }`}
        >
          {justSent ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-stone-600" />
          <span className="text-[10px] font-mono text-stone-600 tracking-wide">AI-POWERED</span>
        </div>
        <svg className="w-4 h-4 -rotate-90" viewBox="0 0 18 18">
          <circle
            cx="9" cy="9" r="7"
            fill="none"
            stroke="#292524"
            strokeWidth="2"
          />
          <circle
            cx="9" cy="9" r="7"
            fill="none"
            stroke={progress > 0.9 ? '#fbbf24' : '#e8866b'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
          />
        </svg>
      </div>
    </div>
  )
}
