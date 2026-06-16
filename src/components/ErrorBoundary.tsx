import { Component } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white p-8">
          <div className="max-w-md text-center">
            <div className="text-red-400 text-6xl mb-6">!</div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <div className="bg-zinc-900 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-mono text-red-300 break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.error?.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">Stack trace</summary>
                  <pre className="text-xs text-zinc-400 mt-2 overflow-auto max-h-60 font-mono">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
