import { Badge } from '../ui/Badge'

type RunStatus = 'idle' | 'error' | 'success'

type SimulatedEditorProps = {
  moduleTitle: string
  stepLabel: string
  codeLines: string[]
  highlightedLines: number[]
  cursorLine: number
  runStatus: RunStatus
  runMessage: string
  runAttempts: number
}

function runBadgeVariant(status: RunStatus): 'neutral' | 'warning' | 'success' {
  if (status === 'success') {
    return 'success'
  }
  if (status === 'error') {
    return 'warning'
  }
  return 'neutral'
}

export function SimulatedEditor({
  moduleTitle,
  stepLabel,
  codeLines,
  highlightedLines,
  cursorLine,
  runStatus,
  runMessage,
  runAttempts,
}: SimulatedEditorProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-pebble-border/35 bg-pebble-canvas/92">
      <div className="grid min-h-[330px] grid-cols-[170px_1fr]">
        <aside className="border-r border-pebble-border/26 bg-pebble-overlay/8 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-pebble-text-muted">
            Module
          </p>
          <p className="mt-2 text-sm font-semibold text-pebble-text-primary">{moduleTitle}</p>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-pebble-text-muted">
              Step
            </p>
            <p className="mt-2 text-sm text-pebble-text-secondary">{stepLabel}</p>
          </div>
        </aside>

        <div className="p-4 font-mono text-sm">
          <div className="space-y-1">
            {codeLines.map((line, index) => {
              const lineNumber = index + 1
              const isHighlighted = highlightedLines.includes(lineNumber)
              const isCursorLine = cursorLine === lineNumber
              return (
                <div
                  key={`${lineNumber}-${line}`}
                  className={`flex items-center gap-3 rounded-md px-2 py-0.5 ${
                    isHighlighted ? 'bg-pebble-accent/12' : ''
                  } ${isCursorLine ? 'bg-pebble-overlay/10' : ''}`}
                >
                  <span
                    className={`h-5 w-[2px] rounded-full ${
                      isHighlighted ? 'bg-pebble-accent/65' : 'bg-transparent'
                    }`}
                  />
                  <span className="w-5 text-right text-pebble-text-muted">{lineNumber}</span>
                  <span className="text-pebble-text-secondary">
                    {line}
                    {isCursorLine && (
                      <span className="editor-cursor ml-0.5 inline-block h-4 w-[1.5px] bg-pebble-text-secondary align-middle" />
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-pebble-border/28 bg-pebble-overlay/7 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={runBadgeVariant(runStatus)}>
              {runStatus === 'success'
                ? 'Run successful'
                : runStatus === 'error'
                  ? 'Run failed'
                  : 'Run pending'}
            </Badge>
            <span className="text-xs text-pebble-text-secondary">
              Attempts: {runAttempts}
            </span>
          </div>
          <p className="text-xs text-pebble-text-secondary">{runMessage}</p>
        </div>
      </div>
    </div>
  )
}
