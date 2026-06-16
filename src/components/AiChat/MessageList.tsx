import { type FC, type ReactNode, useEffect, useRef, useState, useCallback } from 'react'

type Props = {
  children: ReactNode
  onScrollChange?: (isPinned: boolean) => void
}

export const MessageList: FC<Props> = ({ children, onScrollChange }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isPinned, setIsPinned] = useState(true)

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const pinned = scrollHeight - scrollTop - clientHeight < 60
    setIsPinned(pinned)
    onScrollChange?.(pinned)
  }, [onScrollChange])

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  useEffect(() => {
    if (isPinned) {
      scrollToBottom()
    }
  }, [children, isPinned, scrollToBottom])

  return (
    <div className="relative flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto px-5 py-3 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      >
        {children}
        <div ref={bottomRef} />
      </div>
      {!isPinned && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-5 rounded-full bg-zinc-800/90 border border-zinc-700/50 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600/50 transition-colors shadow-lg z-10 backdrop-blur-sm"
        >
          Jump to latest ↓
        </button>
      )}
    </div>
  )
}
