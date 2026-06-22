import { type FC, useState, useEffect, useCallback, useRef } from 'react'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { BlockRenderer } from './BlockRenderer'
import { TypewriterText } from './TypewriterText'
import { ThinkingIndicator } from './ThinkingIndicator'
import { parseStructuredResponse } from '../../services/parseBlocks'
import type { ParsedResponse } from '../../services/wireFormat'
import { aiAgentService } from '../../services/ai'
import { useNavigate } from 'react-router-dom'
import { navigateTo } from '../../lib/deepNav'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  parsed: ParsedResponse
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
    if (!raw) return []
    const msgs: ChatMessage[] = JSON.parse(raw)
    return msgs.map(m => ({
      ...m,
      parsed: m.parsed ?? parseStructuredResponse(m.content),
    }))
  } catch {
    return []
  }
}

function saveThread(today: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + today, JSON.stringify(messages))
  } catch {
  }
}

let idCounter = 0
function nextId(): string {
  return `msg_${Date.now()}_${++idCounter}`
}

const GREETING = `Hello! I'm your AI assistant. I can access your goals, projects, activities, sleep data, and more.

**Try asking me:**
- *What did I work on today?*
- *Show me my active projects*
- *How many goals did I complete this week?*
- *What's my sleep trend?*`

export const AiChat: FC<Props> = ({ today: todayProp }) => {
  const today = todayProp ?? new Date().toISOString().slice(0, 10)
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadThread(today)
    return saved.length > 0
      ? saved
      : [{ id: nextId(), role: 'assistant', content: GREETING, parsed: parseStructuredResponse(GREETING), timestamp: Date.now() }]
  })
  const [isThinking, setIsThinking] = useState(false)
  const [typingId, setTypingId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ round: number; totalRounds: number; toolName?: string; toolArgs?: Record<string, any>; status: 'thinking' | 'executing' | 'completed' | 'error'; message?: string; streamedContent?: string } | null>(null)
  const [streamedContent, setStreamedContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const toolsUsedRef = useRef<string[]>([])

  const handleTypingDone = useCallback(() => setTypingId(null), [])

  useEffect(() => {
    saveThread(today, messages)
  }, [today, messages])

  useEffect(() => {
    aiAgentService.setProgressCallback((progressData) => {
      setProgress(progressData)
      if (progressData.streamedContent) {
        setStreamedContent(progressData.streamedContent)
      }
    })

    return () => {
      aiAgentService.clearProgressCallback()
    }
  }, [])

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const parsed = parseStructuredResponse(content)
    const msg: ChatMessage = { id: nextId(), role, content, parsed, timestamp: Date.now() }
    setMessages(prev => [...prev, msg])
    return msg
  }, [])

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    // Check for confirmation/cancellation response even while thinking
    const pendingConfirm = aiAgentService.getPendingConfirm()
    console.log(`[AiChat] handleSend text="${trimmed.slice(0, 50)}", isThinking=${isThinking}, pendingConfirm=${!!pendingConfirm}`)

    if (pendingConfirm) {
      const confirmed = /^(yes|yeah|confirm|go ahead|do it|sure|ok|okay)$/i.test(trimmed)
      const cancelled = /^(no|nope|cancel|never mind|stop|don't|dont)$/i.test(trimmed)

      if (cancelled) {
        console.log('[AiChat] User cancelled confirm')
        aiAgentService.resolveConfirm(false)
        addMessage('assistant', 'Cancelled.')
        setIsThinking(false)
        setProgress(null)
        setStreamedContent('')
        return
      }

      if (confirmed) {
        console.log('[AiChat] User confirmed, resolving confirm promise')
        addMessage('user', trimmed)
        aiAgentService.resolveConfirm(true)
        // Original processMessage will resume when confirm promise resolves
        return
      }
    }

    if (isThinking) {
      console.log('[AiChat] isThinking=true and no pendingConfirm, ignoring message')
      return
    }

    addMessage('user', trimmed)
    setIsThinking(true)
    setProgress({ round: 0, totalRounds: aiAgentService.getConfig().maxRounds, status: 'thinking', message: 'Starting AI response...' })

    try {
      const response = await aiAgentService.processMessage(trimmed)
      setStreamedContent('')
      const msg = addMessage('assistant', response)
      setTypingId(msg.id)
    } catch (err: unknown) {
      setStreamedContent('')
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      addMessage('assistant', `[type: error]\n[message: ${msg}]`)
    }

    setIsThinking(false)
    setProgress(null)
  }, [isThinking, addMessage])

  const handleReset = useCallback(() => {
    aiAgentService.resetConversation()
    setMessages([{ id: nextId(), role: 'assistant', content: GREETING, parsed: parseStructuredResponse(GREETING), timestamp: Date.now() }])
    localStorage.removeItem(STORAGE_PREFIX + today)
    toolsUsedRef.current = []
    setStreamedContent('')
  }, [today])

  const status = isThinking ? 'thinking' : 'ready'
  const pendingConfirm = aiAgentService.getPendingConfirm()

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        mode="in-progress"
        dateLabel={getDayLabel()}
        status={status}
        toolsUsed=""
        onReset={handleReset}
        className="flex-shrink-0"
      />
      <MessageList>
        {messages.map(msg => {
          const isTyping = msg.id === typingId

          return (
            <MessageBubble key={msg.id} role={msg.role}>
              {msg.role === 'assistant' && isTyping ? (
<TypewriterText
  nodes={msg.parsed.nodes}
  onDone={handleTypingDone}
/>
              ) : (
                <BlockRenderer
                  nodes={msg.parsed.nodes}
                  refs={msg.parsed.refs}
                  onNavigate={(page, section, tab) => navigateTo({ route: page, section, tab }, navigate)}
                />
              )}
            </MessageBubble>
          )
        })}
        {isThinking && (
          <MessageBubble role="assistant">
            {streamedContent ? (
              <div className="text-sm text-zinc-100 whitespace-pre-wrap">
                <BlockRenderer
                  nodes={parseStructuredResponse(streamedContent).nodes}
                  refs={{}}
                  onNavigate={(page, section, tab) => navigateTo({ route: page, section, tab }, navigate)}
                />
                <span className="inline-block w-2 h-4 bg-amber-400/70 ml-0.5 animate-pulse" />
              </div>
            ) : (
              <ThinkingIndicator />
            )}
          </MessageBubble>
        )}
        {pendingConfirm && !isThinking && (
          <MessageBubble role="assistant">
            <BlockRenderer
              nodes={parseStructuredResponse(`[type: text]\n[body: Do you want to ${pendingConfirm.toolName}? (Reply "yes" to confirm or "no" to cancel)]`).nodes}
              refs={{}}
              onNavigate={(page) => navigate(page)}
            />
          </MessageBubble>
        )}
      </MessageList>

      {progress && (
        <div className="px-4 py-2 bg-zinc-950/80 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${progress.status === 'thinking' ? 'bg-amber-500 animate-pulse' : progress.status === 'executing' ? 'bg-emerald-500 animate-pulse' : progress.status === 'completed' ? 'bg-emerald-400' : 'bg-red-500'}`} />
            <span className="text-zinc-400">
              {progress.status === 'thinking' && `Thinking... ${progress.message}`}
              {progress.status === 'executing' && `Executing ${progress.toolName}...`}
              {progress.status === 'completed' && `Completed ${progress.toolName}`}
              {progress.status === 'error' && `Error: ${progress.message}`}
            </span>
            {progress.round > 0 && progress.totalRounds > 0 && (
              <span className="text-zinc-600 ml-auto">
                Round {progress.round} of {progress.totalRounds}
              </span>
            )}
          </div>
          {progress.status === 'executing' && progress.toolArgs && (
            <div className="mt-2 text-xs text-zinc-500 bg-zinc-900/50 p-2 rounded border border-zinc-800/30">
              <pre className="whitespace-pre-wrap font-mono">
                {JSON.stringify(progress.toolArgs, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        disabled={isThinking || typingId !== null}
        placeholder={
          pendingConfirm
            ? 'Reply yes or no...'
            : 'Ask about goals, projects, activities\u2026'
        }
        className="flex-shrink-0"
      />
    </div>
  )
}
