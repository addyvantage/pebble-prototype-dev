import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PebbleChatPanel } from '../components/session/PebbleChatPanel'
import {
  getLanguageMetadata,
  isPlacementLanguage,
  isPlacementLevel,
  type PlacementLanguage,
  type PlacementLevel,
} from '../data/onboardingData'
import { loadCurriculumPath, type CurriculumUnit } from '../content/pathLoader'
import { IDE_MONACO_LANGUAGE } from '../components/ide/runtimeLanguages'
import {
  getPebbleUserState,
  savePebbleCurriculumProgress,
} from '../utils/pebbleUserState'

type RunResponse = {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

type UnitTestResult = {
  index: number
  input: string
  expected: string
  actual: string
  stderr: string
  passed: boolean
  timedOut: boolean
}

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeRunResponse(payload: unknown): RunResponse {
  if (!isRecord(payload)) {
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: 'Runner returned an invalid response.',
      timedOut: false,
      durationMs: 0,
    }
  }

  return {
    ok: payload.ok === true,
    exitCode: typeof payload.exitCode === 'number' || payload.exitCode === null ? payload.exitCode : null,
    stdout: typeof payload.stdout === 'string' ? payload.stdout : '',
    stderr: typeof payload.stderr === 'string' ? payload.stderr : '',
    timedOut: payload.timedOut === true,
    durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : 0,
  }
}

function statusVariant(status: string): 'neutral' | 'success' | 'warning' {
  if (status === 'success') {
    return 'success'
  }
  if (status === 'error') {
    return 'warning'
  }
  return 'neutral'
}

function buildFailingSummary(results: UnitTestResult[]) {
  const failed = results.filter((result) => !result.passed).slice(0, 2)
  if (failed.length === 0) {
    return ''
  }

  return failed
    .map((result) => {
      const actual = result.stderr.trim() ? `stderr: ${result.stderr.slice(0, 120)}` : `actual: ${result.actual || '(empty)'}`
      return `#${result.index + 1} expected: ${result.expected}; ${actual}`
    })
    .join(' | ')
}

export function SessionPage() {
  const [searchParams] = useSearchParams()
  const storedState = useMemo(() => getPebbleUserState(), [])

  const selectedLanguage: PlacementLanguage = useMemo(() => {
    const queryLanguage = searchParams.get('lang')
    if (isPlacementLanguage(queryLanguage)) {
      return queryLanguage
    }
    return (
      storedState.curriculum?.selectedLanguage ??
      storedState.placement?.language ??
      storedState.onboarding?.language ??
      'python'
    )
  }, [searchParams, storedState])

  const selectedLevel: PlacementLevel = useMemo(() => {
    const queryLevel = searchParams.get('level')
    if (isPlacementLevel(queryLevel)) {
      return queryLevel
    }
    return (
      storedState.curriculum?.selectedLevel ??
      storedState.placement?.level ??
      storedState.onboarding?.level ??
      'beginner'
    )
  }, [searchParams, storedState])

  const [units, setUnits] = useState<CurriculumUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [currentUnitIndex, setCurrentUnitIndex] = useState(0)
  const [draftByUnitId, setDraftByUnitId] = useState<Record<string, string>>({})
  const [completedUnitIds, setCompletedUnitIds] = useState<string[]>(
    storedState.curriculum?.completedUnitIds ?? [],
  )

  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [runMessage, setRunMessage] = useState('Run tests to validate your solution.')
  const [testResults, setTestResults] = useState<UnitTestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [recentChatSummary, setRecentChatSummary] = useState(
    storedState.curriculum?.recentChatSummary ?? '',
  )

  const languageMeta = useMemo(() => getLanguageMetadata(selectedLanguage), [selectedLanguage])

  useEffect(() => {
    let mounted = true

    async function loadUnits() {
      setIsLoading(true)
      setLoadError('')
      try {
        const nextUnits = await loadCurriculumPath(selectedLanguage)
        if (!mounted) {
          return
        }

        setUnits(nextUnits)
        setDraftByUnitId(() => {
          const next: Record<string, string> = {}
          for (const unit of nextUnits) {
            next[unit.id] = unit.starterCode
          }
          return next
        })

        const preferredUnitId = storedState.curriculum?.currentUnitId
        const preferredIndex = preferredUnitId
          ? nextUnits.findIndex((unit) => unit.id === preferredUnitId)
          : -1
        setCurrentUnitIndex(preferredIndex >= 0 ? preferredIndex : 0)
      } catch (error) {
        if (!mounted) {
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load curriculum.'
        setLoadError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadUnits()

    return () => {
      mounted = false
    }
  }, [selectedLanguage, storedState.curriculum?.currentUnitId])

  const currentUnit = units[currentUnitIndex] ?? null
  const currentCode = currentUnit ? draftByUnitId[currentUnit.id] ?? currentUnit.starterCode : ''

  const failingSummary = useMemo(() => buildFailingSummary(testResults), [testResults])

  useEffect(() => {
    if (!currentUnit) {
      return
    }

    savePebbleCurriculumProgress({
      selectedLanguage,
      selectedLevel,
      currentUnitId: currentUnit.id,
      recentChatSummary,
      completedUnitIds,
    })
  }, [completedUnitIds, currentUnit, recentChatSummary, selectedLanguage, selectedLevel])

  const onCodeChange = useCallback((value: string) => {
    if (!currentUnit) {
      return
    }

    setDraftByUnitId((prev) => ({
      ...prev,
      [currentUnit.id]: value,
    }))
  }, [currentUnit])

  const runUnitTests = useCallback(async () => {
    if (!currentUnit || isRunning) {
      return
    }

    setIsRunning(true)
    setRunStatus('running')
    setRunMessage(`Running ${currentUnit.tests.length} tests...`)
    setTestResults([])

    const nextResults: UnitTestResult[] = []

    try {
      for (let index = 0; index < currentUnit.tests.length; index += 1) {
        const test = currentUnit.tests[index]

        let payload: unknown = null
        try {
          const response = await fetch('/api/run', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              language: selectedLanguage,
              code: currentCode,
              stdin: test.input,
              timeoutMs: 4000,
            }),
          })
          payload = await response.json().catch(() => null)
        } catch {
          payload = {
            ok: false,
            exitCode: null,
            stdout: '',
            stderr: 'Failed to reach /api/run.',
            timedOut: false,
            durationMs: 0,
          }
        }

        const result = normalizeRunResponse(payload)
        const expectedNormalized = normalizeOutput(test.expected)
        const actualNormalized = normalizeOutput(result.stdout)
        const passed = result.ok && expectedNormalized === actualNormalized

        nextResults.push({
          index,
          input: test.input,
          expected: test.expected,
          actual: result.stdout,
          stderr: result.stderr,
          passed,
          timedOut: result.timedOut,
        })
      }

      const passedCount = nextResults.filter((item) => item.passed).length
      const allPassed = passedCount === nextResults.length
      setTestResults(nextResults)

      if (allPassed) {
        setRunStatus('success')
        setRunMessage(`All tests passed (${passedCount}/${nextResults.length}). Great work.`)
        setCompletedUnitIds((prev) =>
          prev.includes(currentUnit.id) ? prev : [...prev, currentUnit.id],
        )
      } else {
        const firstFailed = nextResults.find((item) => !item.passed)
        const failedMessage = firstFailed
          ? `Fail #${firstFailed.index + 1}: expected ${firstFailed.expected}, got ${normalizeOutput(firstFailed.actual) || '(empty)'}`
          : 'Some tests failed.'
        setRunStatus('error')
        setRunMessage(`${passedCount}/${nextResults.length} passed. ${failedMessage}`)
      }
    } finally {
      setIsRunning(false)
    }
  }, [currentCode, currentUnit, isRunning, selectedLanguage])

  function selectUnit(index: number) {
    setCurrentUnitIndex(index)
    setRunStatus('idle')
    setRunMessage('Run tests to validate your solution.')
    setTestResults([])
  }

  function moveToNextUnit() {
    if (currentUnitIndex < units.length - 1) {
      selectUnit(currentUnitIndex + 1)
    }
  }

  if (isLoading) {
    return (
      <section className="page-enter">
        <Card className="space-y-2" padding="md" interactive>
          <p className="text-sm font-medium text-pebble-text-primary">Loading curriculum...</p>
          <p className="text-sm text-pebble-text-secondary">Preparing {languageMeta.label} path.</p>
        </Card>
      </section>
    )
  }

  if (loadError || !currentUnit) {
    return (
      <section className="page-enter">
        <Card className="space-y-2" padding="md" interactive>
          <p className="text-sm font-medium text-pebble-warning">Unable to load this session.</p>
          <p className="text-sm text-pebble-text-secondary">{loadError || 'No units found.'}</p>
        </Card>
      </section>
    )
  }

  const passedTests = testResults.filter((result) => result.passed).length
  const currentIsCompleted = completedUnitIds.includes(currentUnit.id)

  return (
    <section className="page-enter space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3" padding="sm" interactive>
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-pebble-text-muted">Curriculum Session</p>
          <h1 className="text-xl font-semibold text-pebble-text-primary">
            {languageMeta.label} • {selectedLevel}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">Unit {currentUnitIndex + 1}/{units.length}</Badge>
          <Badge variant={statusVariant(runStatus)}>{runStatus}</Badge>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="glass-panel soft-ring h-fit p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Units</p>
          <div className="mt-3 space-y-2">
            {units.map((unit, index) => {
              const isCurrent = index === currentUnitIndex
              const isDone = completedUnitIds.includes(unit.id)
              return (
                <button
                  key={unit.id}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isCurrent
                      ? 'border-pebble-accent/40 bg-pebble-accent/12'
                      : 'border-pebble-border/25 bg-pebble-overlay/[0.04] hover:bg-pebble-overlay/[0.1]'
                  }`}
                  onClick={() => selectUnit(index)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isDone
                          ? 'bg-pebble-success/25 text-pebble-success'
                          : isCurrent
                            ? 'bg-pebble-accent/30 text-pebble-text-primary'
                            : 'bg-pebble-overlay/[0.15] text-pebble-text-muted'
                      }`}
                    >
                      {isDone ? '✓' : index + 1}
                    </span>
                    <p className="text-xs font-medium text-pebble-text-primary">{unit.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-pebble-text-secondary">{unit.concept}</p>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="space-y-4">
          <Card className="space-y-3" padding="md" interactive>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.08em] text-pebble-text-muted">Current Unit</p>
              <h2 className="text-lg font-semibold text-pebble-text-primary">{currentUnit.title}</h2>
              <p className="text-sm text-pebble-text-secondary">{currentUnit.prompt}</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-pebble-border/28 bg-pebble-canvas/92">
              <Editor
                height="420px"
                language={IDE_MONACO_LANGUAGE[selectedLanguage]}
                theme="vs-dark"
                value={currentCode}
                onChange={(nextValue) => onCodeChange(nextValue ?? '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineHeight: 22,
                  automaticLayout: true,
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => void runUnitTests()} disabled={isRunning}>
                  {isRunning ? 'Running...' : 'Run tests'}
                </Button>
                <Badge variant={statusVariant(runStatus)}>{runMessage}</Badge>
              </div>

              {currentIsCompleted && currentUnitIndex < units.length - 1 && (
                <Button variant="secondary" size="sm" onClick={moveToNextUnit}>
                  Next unit
                </Button>
              )}
            </div>
          </Card>

          <Card className="space-y-3" padding="md" interactive>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-pebble-text-primary">Output & Tests</p>
              <p className="text-xs text-pebble-text-secondary">
                {testResults.length > 0 ? `${passedTests}/${testResults.length} passed` : 'No run yet'}
              </p>
            </div>

            <div className="max-h-[220px] space-y-2 overflow-y-auto rounded-xl border border-pebble-border/25 bg-pebble-canvas/65 p-3">
              {testResults.length === 0 && (
                <p className="text-xs text-pebble-text-muted">Run tests to see detailed results.</p>
              )}
              {testResults.map((result) => (
                <div key={result.index} className="rounded-lg border border-pebble-border/25 bg-pebble-overlay/[0.05] p-2">
                  <p className="text-xs font-medium text-pebble-text-primary">
                    Test #{result.index + 1} {result.passed ? '✓' : '✕'}
                  </p>
                  <p className="mt-1 text-[11px] text-pebble-text-secondary">input: {result.input || '(empty)'}</p>
                  <p className="text-[11px] text-pebble-text-secondary">expected: {result.expected}</p>
                  <p className="text-[11px] text-pebble-text-secondary">actual: {normalizeOutput(result.actual) || '(empty)'}</p>
                  {result.stderr && (
                    <p className="mt-1 text-[11px] text-pebble-warning">stderr: {result.stderr.slice(0, 180)}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-pebble-border/25 bg-pebble-overlay/[0.05] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Hints</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-pebble-text-secondary">
                {currentUnit.hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <PebbleChatPanel
          unitTitle={currentUnit.title}
          unitConcept={currentUnit.concept}
          codeText={currentCode}
          runStatus={runStatus}
          runMessage={runMessage}
          failingSummary={failingSummary}
          initialSummary={recentChatSummary}
          onSummaryChange={setRecentChatSummary}
        />
      </div>
    </section>
  )
}
