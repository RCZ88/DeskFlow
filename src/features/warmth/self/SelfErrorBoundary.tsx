import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class SelfErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[SelfOrchestrator] render error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm">
          <div className="font-medium text-rose-300 mb-1">Self tab crashed</div>
          <div className="text-zinc-400 font-mono text-[11px] whitespace-pre-wrap break-words">
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 px-3 py-1.5 rounded-md bg-zinc-800/80 text-zinc-200 text-[12px] hover:bg-zinc-700/80"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
