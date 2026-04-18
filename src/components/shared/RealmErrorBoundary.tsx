import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class RealmErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RealmErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
          <p className="text-sm text-muted-foreground font-mono max-w-prose break-words">
            {this.state.error.message}
          </p>
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
