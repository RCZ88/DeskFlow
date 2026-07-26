import { ConnectorsPanel } from '../connectors/ConnectorsPanel'
import type { Connector } from '../connectors/ConnectorsPanel'

interface ConnectorsCardProps {
  state: 'loading' | 'error' | 'empty' | 'ready'
  connectors: Connector[]
  errorMessage?: string
  onRetry?: () => void
  onAdd?: () => void
  onSync?: (id: string) => void | Promise<void>
  onRefresh?: () => void
  syncing?: Record<string, true>
}

export function ConnectorsCard({
  state, connectors, errorMessage, onRetry, onAdd, onSync, onRefresh, syncing,
}: ConnectorsCardProps) {
  return (
    <div className="dk-connectors-card">
      <ConnectorsPanel
        state={state}
        connectors={connectors}
        errorMessage={errorMessage}
        onRetry={onRetry}
        onAdd={onAdd}
        onSync={onSync}
        onRefresh={onRefresh}
        syncing={syncing}
      />
    </div>
  )
}
