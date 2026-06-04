import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep this server-loggable; production builds strip stack traces from
    // some error messages, so the componentStack is the best forensic clue.
    console.error("ErrorBoundary caught an error:", error, info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = "/"
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-dark-surface border border-white/10 rounded-xl p-6 text-white">
          <h1 className="text-xl font-semibold mb-3">Something went wrong</h1>
          <p className="text-sm text-gray-300 mb-4">
            An unexpected error occurred. The page can be reloaded, or you can return to the home screen.
          </p>
          {!import.meta.env.PROD && this.state.error?.message ? (
            <pre className="text-xs text-red-300 bg-black/40 p-3 rounded mb-4 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-md py-2 text-sm font-medium"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 bg-white/10 hover:bg-white/20 rounded-md py-2 text-sm font-medium"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
