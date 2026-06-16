import { type FC, useState, useEffect, useCallback, useRef } from 'react'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { BlockRenderer } from './BlockRenderer'
import { parseBlocks } from '../../services/parseBlocks'
import { aiAgentService, toolRegistry } from '../../services/ai'
import { useNavigate } from 'react-router-dom'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

type Props = {
  today?: string
}

function getDayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const STORAGE_PREFIX = 'aichat:thread:'

function loadThread(today: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + today)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveThread(today: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + today, JSON.stringify(messages))
  } catch {
    // localStorage full or unavailable
  }
}

let idCounter = 0
function nextId(): string {
  return `msg_${Date.now()}_${++idCounter}`
}

const GREETING = `[type: text]
[body: Hello! I'm your AI assistant. I can access your goals, projects, activities, sleep data, and more.]`

function formatToolUsage(toolsUsed: string[]): string {
  if (toolsUsed.length === 0) return ''
  const counts = toolsUsed.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  return Object.entries(counts)
    .map(([name, count]) => `${name} (${count}x)`)
    .join(', ')
}

export const AiChat: FC<Props> = ({ today: todayProp }) => {
  console.log('[AiChat] Component rendering')
  const today = todayProp ?? new Date().toISOString().slice(0, 10)
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadThread(today)
    console.log('[AiChat] Initial messages from localStorage:', saved.length)
    return saved.length > 0
      ? saved
      : [{ id: nextId(), role: 'assistant', content: GREETING, timestamp: Date.now() }]
  })
  const [isThinking, setIsThinking] = useState(false)
  const [statusLabel, setStatusLabel] = useState('ready')
  const toolsUsedRef = useRef<string[]>([])

  useEffect(() => {
    saveThread(today, messages)
  }, [today, messages])

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const msg: ChatMessage = { id: nextId(), role, content, timestamp: Date.now() }
    console.log('[AiChat] addMessage:', role, content.slice(0, 50))
    setMessages(prev => {
      console.log('[AiChat] setMessages prev length:', prev.length)
      return [...prev, msg]
    })
    return msg
  }, [])

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim()
    console.log('[AiChat] handleSend called:', { trimmed, isThinking })
    if (!trimmed || isThinking) {
      console.log('[AiChat] handleSend early return')
      return
    }

    console.log('[AiChat] Adding user message')
    addMessage('user', trimmed)
    setIsThinking(true)
    setStatusLabel('thinking')

    const pendingConfirm = aiAgentService.getPendingConfirm()
    console.log('[AiChat] pendingConfirm:', pendingConfirm)
    if (pendingConfirm) {
      const confirmed = /^(yes|yeah|confirm|go ahead|do it|sure|ok|okay)$/i.test(trimmed)
      const cancelled = /^(no|nope|cancel|never mind|stop|don't|dont)$/i.test(trimmed)

      if (cancelled) {
        console.log('[AiChat] User cancelled')
        aiAgentService.resolveConfirm(false)
        addMessage('assistant', '[type: text]\n[body: Cancelled.]')
        setIsThinking(false)
        setStatusLabel('ready')
        return
      }

      if (confirmed) {
        console.log('[AiChat] User confirmed, processing')
        aiAgentService.resolveConfirm(true)
        try {
          const response = await aiAgentService.processMessage('')
          console.log('[AiChat] Got response:', response)
          addMessage('assistant', response)
        } catch (err: any) {
          console.error('[AiChat] Error:', err)
          addMessage('assistant', `[type: error]\n[message: ${err?.message || 'Something went wrong.'}]`)
        }
        setIsThinking(false)
        setStatusLabel('ready')
        return
      }
    }

    try {
      console.log('[AiChat] Processing message with agent')
      const response = await aiAgentService.processMessage(trimmed)
      console.log('[AiChat] Got response:', response)
      addMessage('assistant', response)
    } catch (err: any) {
      console.error('[AiChat] Error:', err)
      addMessage('assistant', `[type: error]\n[message: ${err?.message || 'Something went wrong.'}]`)
    }

    setIsThinking(false)
    setStatusLabel('ready')
  }, [isThinking, addMessage])

  const handleReset = useCallback(() => {
    aiAgentService.resetConversation()
    setMessages([{ id: nextId(), role: 'assistant', content: GREETING, timestamp: Date.now() }])
    localStorage.removeItem(STORAGE_PREFIX + today)
    toolsUsedRef.current = []
  }, [today])

  const status = isThinking ? 'thinking' : 'ready'
  const pendingConfirm = aiAgentService.getPendingConfirm()

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        mode="in-progress"
        dateLabel={getDayLabel()}
        status={status}
        toolsUsed={formatToolUsage(toolsUsedRef.current)}
        onReset={handleReset}
      />
      <MessageList>
        {messages.map(msg => (
          <MessageBubble key={msg.id} role={msg.role}>
            <BlockRenderer
              blocks={parseBlocks(msg.content)}
              onNavigate={(page) => navigate(page)}
            />
          </MessageBubble>
        ))}
        {pendingConfirm && (
          <MessageBubble role="assistant">
            <BlockRenderer
              blocks={parseBlocks(`[type: text]\n[body: Do you want to ${pendingConfirm.toolName}? (Reply "yes" to confirm or "no" to cancel)]`)}
              onNavigate={(page) => navigate(page)}
            />
          </MessageBubble>
        )}
      </MessageList>
      <ChatInput
        onSend={handleSend}
        disabled={isThinking}
        placeholder={
          pendingConfirm
            ? 'Reply yes or no...'
            : 'Ask about goals, projects, activities\u2026'
        }
      />
    </div>
  )
}
