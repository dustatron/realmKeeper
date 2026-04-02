import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '~/components/ui/button'

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

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[RealmErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <AlertTriangle className="size-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-1 max-w-md">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.stack && (
          <pre className="text-xs text-muted-foreground bg-muted rounded-md p-3 mt-2 mb-6 max-w-xl w-full overflow-x-auto text-left">
            {error.stack.split('\n').slice(0, 6).join('\n')}
          </pre>
        )}
        <div className="flex gap-3">
          <Button onClick={this.handleReset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    )
  }
}
