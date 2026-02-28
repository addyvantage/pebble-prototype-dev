import { AlertTriangle, RefreshCcw } from 'lucide-react'
import type { ContextType, ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { I18nContext } from '../../i18n/I18nProvider'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
  message: string
}

function clearPebbleLocalData() {
  if (typeof window === 'undefined') {
    return
  }

  const keys = Object.keys(window.localStorage)
  for (const key of keys) {
    if (key.startsWith('pebble.') || key.startsWith('pebble:')) {
      window.localStorage.removeItem(key)
    }
  }
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  static contextType = I18nContext
  declare context: ContextType<typeof I18nContext>

  constructor(props: AppErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      message: '',
    }
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unexpected UI error.',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary] Recoverable UI error', error, info.componentStack)
    }
  }

  handleReset = () => {
    clearPebbleLocalData()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const fallbackText = this.context?.t
    const title = fallbackText ? fallbackText('error.uiRecoverableTitle') : 'Pebble hit a recoverable UI error.'
    const description = fallbackText
      ? fallbackText('error.uiRecoverableDescription')
      : 'The interface encountered an issue. You can reset local data and reload safely.'
    const resetLabel = fallbackText ? fallbackText('error.uiRecoverableReset') : 'Reset local data'

    return (
      <div className="flex min-h-screen items-center justify-center bg-pebble-deep p-4 text-pebble-text-primary">
        <div className="w-full max-w-lg rounded-2xl border border-pebble-border/35 bg-pebble-panel/95 p-6 shadow-[0_20px_60px_rgba(2,8,23,0.35)]">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-pebble-warning/35 bg-pebble-warning/14 text-pebble-warning">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-pebble-text-primary">{title}</h1>
          <p className="mt-2 text-sm text-pebble-text-secondary">{description}</p>
          {this.state.message ? (
            <p className="mt-3 rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.06] px-3 py-2 text-xs text-pebble-text-muted">
              {this.state.message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-pebble-border/35 bg-pebble-overlay/[0.08] px-3 py-2 text-sm text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16]"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            {resetLabel}
          </button>
        </div>
      </div>
    )
  }
}
