import { useState, useEffect, useCallback } from 'react'

interface DiagEntry {
  id: string; ts: number; path: string; provider: string; model: string;
  request: { url: string; method: string; headers: Record<string, string>; body: unknown };
  response?: { status: number; headers: Record<string, string>; body: unknown };
  error?: { status?: number; message: string; raw?: string };
  parse?: { ok: boolean; extracted?: string; discarded?: string };
  durationMs?: number; streamed?: boolean;
}

export function ProviderDiagnostics() {
  const [logs, setLogs] = useState<DiagEntry[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try {
      const data = await (window as any).deskflowAPI?.getProviderDiagnostics?.()
      if (data) setLogs(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { load(); const iv = setInterval(load, 2000); return () => clearInterval(iv) }, [load])

  const clearLogs = async () => {
    await (window as any).deskflowAPI?.clearProviderLogs?.()
    setLogs([])
  }

  const testProvider = async (providerId: string) => {
    try {
      await (window as any).deskflowAPI?.testAiProvider?.(providerId)
      load()
    } catch { /* silent */ }
  }

  const providers = [...new Set(logs.map(l => l.provider))]
  const filtered = filter === 'all' ? logs : logs.filter(l => l.provider === filter)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Provider Logs</span>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200">
          <option value="all">All ({logs.length})</option>
          {providers.map(p => (
            <option key={p} value={p}>{p} ({logs.filter(l => l.provider === p).length})</option>
          ))}
        </select>
        <button onClick={clearLogs}
          className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-300 hover:bg-red-800/60">
          Clear
        </button>
        <button onClick={load}
          className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">
          Refresh
        </button>
      </div>

      {providers.map(p => (
        <button key={'test-' + p} onClick={() => testProvider(p)}
          className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/50 mr-1">
          Test {p}
        </button>
      ))}

      {filtered.length === 0 && (
        <p className="text-xs text-gray-500 italic">No provider calls logged yet. Make an AI request or test a provider.</p>
      )}

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {filtered.map((entry) => (
          <div key={entry.id}
            className="bg-gray-800/60 border border-gray-700 rounded cursor-pointer hover:bg-gray-800"
            onClick={() => setExpanded(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}>
            <div className="flex items-center gap-2 px-2 py-1 text-xs">
              <span className={'w-2 h-2 rounded-full ' + (entry.error ? 'bg-red-500' : entry.parse?.ok ? 'bg-green-500' : 'bg-yellow-500')} />
              <span className="font-mono text-gray-400 w-14 shrink-0">{new Date(entry.ts).toLocaleTimeString()}</span>
              <span className="font-mono text-gray-300 shrink-0">{entry.path}</span>
              <span className="text-gray-200 font-medium">{entry.provider}</span>
              <span className="text-gray-400">{entry.model}</span>
              {entry.durationMs !== undefined && (
                <span className="text-gray-500 ml-auto">{entry.durationMs}ms</span>
              )}
              {entry.streamed && <span className="text-purple-400 text-[10px]">stream</span>}
              {entry.error && <span className="text-red-400 ml-auto truncate max-w-[200px]">{entry.error.message}</span>}
            </div>
            {expanded[entry.id] && (
              <div className="px-3 pb-2 space-y-1 text-xs font-mono text-gray-400">
                <div className="bg-gray-900/60 rounded p-1">
                  <div className="text-gray-500">POST {entry.request.url}</div>
                  <div className="text-gray-500">headers={JSON.stringify(entry.request.headers)}</div>
                </div>
                {entry.response && (
                  <div className="bg-gray-900/60 rounded p-1">
                    <div className="text-gray-500">HTTP {entry.response.status}</div>
                    <div className="text-gray-500">body={JSON.stringify(entry.response.body).slice(0, 800)}</div>
                  </div>
                )}
                {entry.error && (
                  <div className="bg-red-900/30 rounded p-1 text-red-400">
                    {entry.error.message}
                    {entry.error.raw && <div className="text-red-300/60 mt-0.5">{entry.error.raw.slice(0, 500)}</div>}
                  </div>
                )}
                {entry.parse && (
                  <div className={'rounded p-1 ' + (entry.parse.ok ? 'bg-green-900/20 text-green-400' : 'bg-yellow-900/20 text-yellow-400')}>
                    {entry.parse.ok ? 'OK ' + (entry.parse.extracted?.length || 0) + ' chars' : 'FAIL'}
                    {entry.parse.discarded && <div className="text-yellow-300/60 mt-0.5">raw: {entry.parse.discarded}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
