import { useCallback, useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  IDE_LANGUAGES,
  IDE_LANGUAGE_LABELS,
  IDE_MONACO_LANGUAGE,
  getStarterCodeForLanguage,
  type IdeRunLanguage,
} from './runtimeLanguages'
import { requestRunApi } from '../../lib/runApi'

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
  initialLanguage?: IdeRunLanguage
  readOnly?: boolean
  onCodeChange?: (code: string) => void
  onLanguageChange?: (language: IdeRunLanguage) => void
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

export function PythonIDE({
  initialCode,
  initialLanguage = 'python',
  onCodeChange,
  onLanguageChange,
  onRunComplete,
  readOnly = false,
}: PythonIDEProps) {
  const [language, setLanguage] = useState<IdeRunLanguage>(initialLanguage)
  const [code, setCode] = useState(initialCode || getStarterCodeForLanguage(initialLanguage))
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<PythonRunResponse | null>(null)

  useEffect(() => {
    setCode(initialCode || getStarterCodeForLanguage(language))
  }, [initialCode])

  useEffect(() => {
    setLanguage(initialLanguage)
  }, [initialLanguage])

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
      const result: PythonRunResponse = await requestRunApi({
        language: language === 'c' ? 'cpp' : language,
        code,
        stdin: '',
        timeoutMs: 4000,
      })
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
  }, [code, isRunning, language, onRunComplete, readOnly])

  const onSelectLanguage = useCallback(
    (nextLanguage: IdeRunLanguage) => {
      if (readOnly) {
        return
      }

      const starterCode = getStarterCodeForLanguage(nextLanguage)
      setLanguage(nextLanguage)
      setCode(starterCode)
      setRunResult(null)
      onLanguageChange?.(nextLanguage)
      onCodeChange?.(starterCode)
    },
    [onCodeChange, onLanguageChange, readOnly],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">Code IDE</Badge>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          <label className="inline-flex items-center gap-2 text-xs text-pebble-text-muted">
            Language
            <select
              className="rounded-md border border-pebble-border/35 bg-pebble-canvas/85 px-2 py-1 text-xs text-pebble-text-primary outline-none"
              value={language}
              onChange={(event) => onSelectLanguage(event.target.value as IdeRunLanguage)}
              disabled={readOnly || isRunning}
            >
              {IDE_LANGUAGES.map((item) => (
                <option key={item} value={item}>
                  {IDE_LANGUAGE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
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
          language={IDE_MONACO_LANGUAGE[language]}
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
            <p className="text-xs uppercase tracking-[0.04em] text-pebble-text-muted">stdout</p>
            <pre className="mt-1 whitespace-pre-wrap break-words text-pebble-text-primary">
              {runResult?.stdout || '(empty)'}
            </pre>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.04em] text-pebble-text-muted">stderr</p>
            <pre className="mt-1 whitespace-pre-wrap break-words text-pebble-warning">
              {runResult?.stderr || '(empty)'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
