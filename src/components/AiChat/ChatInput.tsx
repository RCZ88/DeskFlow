import { type FC, useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { sanitizeInput, MAX_INPUT_LENGTH } from '../../services/chatSafety'

type Props = {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export const ChatInput: FC<Props> = ({ onSend, disabled, placeholder }) => {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = sanitizeInput(text.trim())
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 6 * 24) + 'px'
    }
  }, [])

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-950/90 px-4 py-3.5">
      <div className="flex items-end gap-2.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={placeholder ?? 'Ask about your day, manage goals\u2026'}
          className="flex-1 resize-none bg-zinc-900/80 border border-zinc-800/60 focus:border-pink-500/40 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="bg-pink-500 hover:bg-pink-400 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors shrink-0 min-w-[68px]"
        >
          Send
        </button>
      </div>
      <div className="flex justify-end mt-1.5">
        <span className="text-xs text-zinc-600 tabular-nums">{text.length}/{MAX_INPUT_LENGTH}</span>
      </div>
    </div>
  )
}
