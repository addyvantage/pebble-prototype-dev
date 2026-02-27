import { useCallback, useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export type PythonRunResponse = {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

type PythonIDEProps = {
  initialCode: string
  readOnly?: boolean
  onCodeChange?: (code: string) => void
  onRunComplete?: (result: PythonRunResponse, code: string) => void
}

const DEFAULT_RESPONSE: PythonRunResponse = {
  ok: false,
  exitCode: null,
  stdout: '',
  stderr: '',
  timedOut: false,
  durationMs: 0,
}

function createErrorResult(message: string): PythonRunResponse {
  return {
    ...DEFAULT_RESPONSE,
    stderr: message,
  }
}

export function PythonIDE({ initialCode, onCodeChange, onRunComplete, readOnly = false }: PythonIDEProps) {
  const [code, setCode] = useState(initialCode)
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<PythonRunResponse | null>(null)

  useEffect(() => {
    setCode(initialCode)
  }, [initialCode])

  const statusLabel = useMemo(() => {
    if (isRunning) {
      return 'running'
    }
    if (runResult === null) {
      return 'idle'
    }
    return runResult.ok ? 'success' : 'error'
  }, [isRunning, runResult])

  const statusVariant = statusLabel === 'success' ? 'success' : statusLabel === 'error' ? 'warning' : 'neutral'

  const runCode = useCallback(async () => {
    if (isRunning || readOnly) {
      return
    }

    setIsRunning(true)
    try {
      const response = await fetch('/api/run/python', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          stdin: '',
          timeoutMs: 4000,
        }),
      })

      if (!response.ok) {
        const raw = await response.text().catch(() => '')
        const result = createErrorResult(
          `Runner request failed (${response.status}). ${raw.slice(0, 240) || 'No response body.'}`,
        )
        setRunResult(result)
        onRunComplete?.(result, code)
        return
      }

      const payload = (await response.json()) as Partial<PythonRunResponse>
      const result: PythonRunResponse = {
        ok: payload.ok === true,
        exitCode: typeof payload.exitCode === 'number' || payload.exitCode === null ? payload.exitCode : null,
        stdout: typeof payload.stdout === 'string' ? payload.stdout : '',
        stderr: typeof payload.stderr === 'string' ? payload.stderr : '',
        timedOut: payload.timedOut === true,
        durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : 0,
      }
      setRunResult(result)
      onRunComplete?.(result, code)
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown runner error.'
      const result = createErrorResult(message)
      setRunResult(result)
      onRunComplete?.(result, code)
    } finally {
      setIsRunning(false)
    }
  }, [code, isRunning, onRunComplete, readOnly])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="neutral">Python IDE</Badge>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {runResult && (
            <p className="text-xs text-pebble-text-muted">
              exit={runResult.exitCode ?? 'n/a'} · {runResult.durationMs}ms
            </p>
          )}
        </div>
        <Button size="sm" variant="primary" onClick={runCode} disabled={isRunning || readOnly}>
          {isRunning ? 'Running...' : 'Run'}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-pebble-border/35 bg-pebble-canvas/92">
        <Editor
          height="430px"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(next) => {
            const nextValue = next ?? ''
            setCode(nextValue)
            onCodeChange?.(nextValue)
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 22,
            readOnly,
            wordWrap: 'off',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-4">
        <p className="text-xs text-pebble-text-secondary">Run output</p>
        <div className="mt-2 min-h-[112px] space-y-2 rounded-lg border border-pebble-border/20 bg-pebble-canvas/70 p-3 font-mono text-xs text-pebble-text-secondary">
          <div>
            <p className="text-[11px] uppercase tracking-[0.04em] text-pebble-text-muted">stdout</p>
            <pre className="mt-1 whitespace-pre-wrap break-words text-pebble-text-primary">
              {runResult?.stdout || '(empty)'}
            </pre>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.04em] text-pebble-text-muted">stderr</p>
            <pre className="mt-1 whitespace-pre-wrap break-words text-pebble-warning">
              {runResult?.stderr || '(empty)'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
