import { useState, useRef, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { VoiceInputWrapper } from '../../../components/VoiceInputWrapper'
import './canvas.css'

interface CanvasInputProps {
  onSend: (text: string) => void
  onStop?: () => void
  streaming?: boolean
  thinking?: boolean
  onOpenPalette?: () => void
}

export function CanvasInput({ onSend, onStop, streaming, thinking, onOpenPalette }: CanvasInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const canSend = text.trim().length > 0 && !streaming

  const handleSubmit = useCallback(() => {
    if (!canSend) return
    onSend(text.trim())
    setText('')
    inputRef.current?.focus()
  }, [text, canSend, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.startsWith('/') && onOpenPalette) {
        onOpenPalette()
        return
      }
      handleSubmit()
    }
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onOpenPalette?.()
    }
  }, [handleSubmit, text, onOpenPalette])

  return (
    <div className="dk-canvas-input-bar">
      <div className="dk-canvas-input-inner">
        {thinking && (
          <div className="dk-canvas-input-thinking">
            <Loader2 size={14} className="animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        <VoiceInputWrapper>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, or type / for commands..."
            className="dk-canvas-input"
            disabled={streaming}
          />
        </VoiceInputWrapper>
        <div className="dk-canvas-input-actions">
          {streaming ? (
            <button onClick={onStop} className="dk-canvas-input-btn stop" title="Stop generating">
              <span className="dk-canvas-stop-icon">■</span>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!canSend} className="dk-canvas-input-btn send" title="Send">
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="dk-canvas-input-hints">
        <span>Ctrl+K commands</span>
        <span>Enter send</span>
        <span>Esc close palette</span>
      </div>
    </div>
  )
}
