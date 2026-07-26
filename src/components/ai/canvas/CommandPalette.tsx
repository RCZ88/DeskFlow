import { useState, useEffect, useCallback, useRef } from 'react'
import { Command, ArrowRight, Zap } from 'lucide-react'
import { parseIntent, getSuggestions, type Intent } from '../../../services/intentParser'
import './canvas.css'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onIntent: (intent: Intent) => void
}

export function CommandPalette({ open, onClose, onIntent }: CommandPaletteProps) {
  const [input, setInput] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const suggestions = getSuggestions(input)
  const isEmpty = input.trim().length === 0
  const isCommand = input.startsWith('/')

  useEffect(() => {
    if (open) {
      setInput('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [input])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[selectedIndex] as HTMLElement
    if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  const handleSubmit = useCallback(() => {
    const intent = parseIntent(input)
    if (intent.type !== 'noop') {
      onIntent(intent)
      onClose()
    }
  }, [input, onIntent, onClose])

  const handleSelectSuggestion = useCallback((name: string) => {
    const intent = parseIntent(name)
    if (intent.type !== 'noop') {
      onIntent(intent)
      onClose()
    }
  }, [onIntent, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0 && input.startsWith('/')) {
        handleSelectSuggestion(suggestions[selectedIndex].name)
      } else {
        handleSubmit()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
      return
    }
  }, [suggestions, selectedIndex, input, onClose, handleSubmit, handleSelectSuggestion])

  if (!open) return null

  return (
    <div className="dk-cmd-overlay" onClick={onClose}>
      <div className="dk-cmd-palette-new" onClick={e => e.stopPropagation()}>
        <div className="dk-cmd-input-row">
          <Command size={16} className="dk-cmd-input-icon" />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or ask anything..."
            className="dk-cmd-input"
            autoComplete="off"
            spellCheck={false}
          />
          {input && (
            <button className="dk-cmd-clear" onClick={() => setInput('')}>✕</button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div ref={listRef} className="dk-cmd-suggestions">
            {suggestions.map((s, i) => (
              <div
                key={s.name}
                className={`dk-cmd-suggestion ${i === selectedIndex ? 'active' : ''}`}
                onClick={() => handleSelectSuggestion(s.name)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div className="dk-cmd-suggestion-left">
                  {s.name.startsWith('/') ? (
                    <Zap size={14} className="dk-cmd-suggestion-icon" />
                  ) : (
                    <ArrowRight size={14} className="dk-cmd-suggestion-icon" />
                  )}
                  <span className="dk-cmd-suggestion-name">{s.name}</span>
                </div>
                <span className="dk-cmd-suggestion-desc">{s.description}</span>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="dk-cmd-hints">
            <span className="dk-cmd-hint">/ for commands</span>
            <span className="dk-cmd-hint">↑↓ navigate</span>
            <span className="dk-cmd-hint">↵ select</span>
            <span className="dk-cmd-hint">esc close</span>
          </div>
        )}
      </div>
    </div>
  )
}
