import { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children:  ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message:  string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-content-primary">Algo salió mal</p>
            <p className="text-xs text-content-muted mt-1">No pudimos mostrar esta sección.</p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
