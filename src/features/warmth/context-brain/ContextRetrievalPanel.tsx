import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Copy, Check, Send, X, ChevronDown, ChevronRight, Brain, Clock, Tag, Zap } from 'lucide-react'

console.log('%c[ContextRetrievalPanel] v1.0 loaded', 'color: #06b6d4; font-weight: bold')

interface RetrievalResult {
  type: string
  id: string
  name?: string
  content?: string
  score: number
}

interface ConversationMsg {
  role: 'user' | 'assistant'
  content: string
}

export function ContextRetrievalPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RetrievalResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [chatMessages, setChatMessages] = useState<ConversationMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [mode, setMode] = useState<'search' | 'chat'>('search')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const api = () => (window as any).deskflowAPI

  // Smart search — searches entities, facts, episodes
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const apiObj = api()
      if (!apiObj) return

      const result = await apiObj.brainSearch(query, ['keyword', 'graph'])
      const combined: RetrievalResult[] = []

      if (result?.entities) {
        for (const e of result.entities) {
          combined.push({ type: 'entity', id: e.id, name: e.name, score: 0.9 })
        }
      }
      if (result?.facts) {
        for (const f of result.facts) {
          combined.push({
            type: 'fact',
            id: f.id,
            name: `${f.predicate}: ${f.objectLiteral || f.objectId || ''}`,
            score: f.confidence || 0.7,
          })
        }
      }
      if (result?.episodes) {
        for (const ep of result.episodes) {
          combined.push({
            type: 'episode',
            id: ep.id,
            name: `[${ep.source}] ${ep.content?.slice(0, 80) || ''}`,
            content: ep.content,
            score: 0.6,
          })
        }
      }

      setResults(combined.sort((a, b) => b.score - a.score))
    } catch (e) {
      console.error('[ContextRetrieval] Search failed:', e)
    } finally {
      setSearching(false)
    }
  }, [query])

  // Toggle selection
  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Copy selected as context block
  const handleCopySelected = useCallback(async () => {
    const selectedItems = results.filter(r => selected.has(r.id))
    if (selectedItems.length === 0) return

    const block = selectedItems.map(r => {
      if (r.type === 'entity') return `[Entity] ${r.name}`
      if (r.type === 'fact') return `[Fact] ${r.name}`
      if (r.type === 'episode') return `[Episode ${r.id}] ${r.content || r.name}`
      return `[${r.type}] ${r.name || r.id}`
    }).join('\n')

    try {
      await navigator.clipboard.writeText(block)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [results, selected])

  // Brain chat — AI-powered context retrieval
  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const apiObj = api()
      if (!apiObj?.brainChat) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Brain chat not available.' }])
        return
      }

      const response = await apiObj.brainChat({
        query: userMsg,
        history: chatMessages.map(m => ({ role: m.role, content: m.content })),
      })

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response?.answer || response?.message || 'No response from brain.',
      }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error querying the brain.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, chatMessages])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const filteredResults = typeFilter === 'all'
    ? results
    : results.filter(r => r.type === typeFilter)

  const typeCounts: Record<string, number> = {}
  for (const r of results) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(24,24,27,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <Search size={14} style={{ color: '#06b6d4' }} />
          <span className="text-xs font-medium" style={{ color: '#d4d4d8' }}>Context Retrieval</span>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['search', 'chat'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
              style={{
                background: mode === m ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: mode === m ? '#06b6d4' : '#71717a',
              }}
            >
              {m === 'search' ? 'Search' : 'Chat'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'search' ? (
        <div className="p-4 space-y-3">
          {/* Search input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#52525b' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search context — entities, facts, episodes..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#fafafa' }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-3 py-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors"
              style={{
                background: query.trim() ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
                color: query.trim() ? '#06b6d4' : '#52525b',
                border: `1px solid ${query.trim() ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.04)'}`,
              }}
            >
              <Zap size={11} /> {searching ? '...' : 'Search'}
            </button>
          </div>

          {/* Type filter chips */}
          {results.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTypeFilter('all')}
                className="px-2 py-0.5 rounded-full text-[10px] transition-colors"
                style={{
                  background: typeFilter === 'all' ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                  color: typeFilter === 'all' ? '#06b6d4' : '#71717a',
                  border: `1px solid ${typeFilter === 'all' ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                All ({results.length})
              </button>
              {Object.entries(typeCounts).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className="px-2 py-0.5 rounded-full text-[10px] capitalize transition-colors"
                  style={{
                    background: typeFilter === type ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                    color: typeFilter === type ? '#06b6d4' : '#71717a',
                    border: `1px solid ${typeFilter === type ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {type} ({count})
                </button>
              ))}
            </div>
          )}

          {/* Selected actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <span className="text-[10px]" style={{ color: '#06b6d4' }}>{selected.size} selected</span>
              <div className="flex-1" />
              <button
                onClick={handleCopySelected}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors"
                style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'Copied!' : 'Copy as Context'}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="p-1 rounded transition-colors"
                style={{ color: '#71717a' }}
              >
                <X size={10} />
              </button>
            </div>
          )}

          {/* Results list */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {filteredResults.length === 0 && !searching && results.length > 0 && (
              <div className="text-[11px] py-4 text-center" style={{ color: '#52525b' }}>
                No {typeFilter} results
              </div>
            )}
            {filteredResults.map((r) => (
              <button
                key={r.id}
                onClick={() => toggleSelect(r.id)}
                className="w-full text-left p-2.5 rounded-lg transition-all"
                style={{
                  background: selected.has(r.id) ? 'rgba(6,182,212,0.1)' : 'rgba(24,24,27,0.4)',
                  border: `1px solid ${selected.has(r.id) ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.04)'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                    style={{
                      borderColor: selected.has(r.id) ? '#06b6d4' : 'rgba(255,255,255,0.1)',
                      background: selected.has(r.id) ? 'rgba(6,182,212,0.2)' : 'transparent',
                    }}
                  >
                    {selected.has(r.id) && <Check size={9} style={{ color: '#06b6d4' }} />}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 capitalize" style={{ background: 'rgba(255,255,255,0.06)', color: '#71717a' }}>
                    {r.type}
                  </span>
                  <span className="text-xs flex-1 truncate" style={{ color: '#d4d4d8' }}>
                    {r.name || r.id}
                  </span>
                  <span className="text-[9px] font-mono shrink-0" style={{ color: '#52525b' }}>
                    {Math.round(r.score * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>

          {results.length === 0 && !searching && (
            <div className="text-center py-8">
              <Brain size={22} style={{ color: '#3f3f46', margin: '0 auto 6px' }} />
              <div className="text-[11px]" style={{ color: '#52525b' }}>
                Type a query to search your context brain
              </div>
              <div className="text-[10px] mt-1" style={{ color: '#3f3f46' }}>
                Try: "fitness goals", "project deadline", "what did I discuss yesterday"
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Chat mode */
        <div className="flex flex-col" style={{ height: 400 }}>
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <Brain size={24} style={{ color: '#3f3f46', margin: '0 auto 8px' }} />
                <div className="text-xs font-medium" style={{ color: '#71717a' }}>Brain Chat</div>
                <div className="text-[11px] mt-1" style={{ color: '#52525b' }}>
                  Ask your context brain anything — it searches episodes, entities, facts, and knowledge to answer.
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-xs"
                  style={{
                    background: msg.role === 'user' ? 'rgba(6,182,212,0.12)' : 'rgba(24,24,27,0.6)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    color: '#d4d4d8',
                    lineHeight: 1.6,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.06)', color: '#52525b' }}>
                  Searching brain...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask about your context..."
                className="flex-1 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#fafafa' }}
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                style={{
                  background: chatInput.trim() ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
                  color: chatInput.trim() ? '#06b6d4' : '#52525b',
                }}
              >
                <Send size={11} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
