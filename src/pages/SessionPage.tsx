import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PebbleChatPanel } from '../components/session/PebbleChatPanel'
import { ProblemStatementPanel } from '../components/session/ProblemStatementPanel'
import {
  TestResultsPanel,
  type UnitTestResultItem,
} from '../components/session/TestResultsPanel'
import { UnitsDrawer } from '../components/session/UnitsDrawer'
import {
  getUnitIndexFromStartUnit,
  getLanguageMetadata,
  isPlacementLanguage,
  isPlacementLevel,
  type PlacementLanguage,
  type PlacementLevel,
  type StartUnit,
} from '../data/onboardingData'
import { loadCurriculumPath, type CurriculumUnit } from '../content/pathLoader'
import { IDE_MONACO_LANGUAGE } from '../components/ide/runtimeLanguages'
import {
  getPebbleUserState,
  savePebbleCurriculumProgress,
} from '../utils/pebbleUserState'
import { useBodyScrollLock } from '../utils/useBodyScrollLock'

type RunResponse = {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

const LANGUAGE_RUNTIME_LABEL: Record<PlacementLanguage, string> = {
  python: 'Python3',
  javascript: 'JavaScript',
  cpp: 'C++17',
  java: 'Java',
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

function buildFailingSummary(resultsByIndex: Record<number, UnitTestResultItem>) {
  const failed = Object.entries(resultsByIndex)
    .map(([index, result]) => ({ index: Number(index), result }))
    .filter(({ result }) => !result.passed)
    .sort((a, b) => a.index - b.index)
    .slice(0, 2)

  if (failed.length === 0) {
    return ''
  }

  return failed
    .map(({ index, result }) => {
      const actual = result.stderr.trim()
        ? `stderr: ${result.stderr.slice(0, 120)}`
        : `actual: ${result.actual || '(empty)'}`
      return `#${index + 1} expected: ${result.expected}; ${actual}`
    })
    .join(' | ')
}

function isStartUnit(value: string | null): value is StartUnit {
  return value === '1' || value === 'mid' || value === 'advanced'
}

function difficultyByLevel(level: PlacementLevel) {
  if (level === 'beginner') {
    return 'Easy'
  }
  if (level === 'intermediate') {
    return 'Medium'
  }
  return 'Hard'
}

export function SessionPage() {
  const [searchParams] = useSearchParams()
  const storedState = useMemo(() => getPebbleUserState(), [])
  const queryUnit = searchParams.get('unit')

  useBodyScrollLock(true)

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
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [currentUnitIndex, setCurrentUnitIndex] = useState(0)
  const [draftByUnitId, setDraftByUnitId] = useState<Record<string, string>>({})
  const [completedUnitIds, setCompletedUnitIds] = useState<string[]>(
    storedState.curriculum?.completedUnitIds ?? [],
  )

  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [runMessage, setRunMessage] = useState('Run a testcase or submit all tests.')
  const [selectedTestIndex, setSelectedTestIndex] = useState(0)
  const [testResultsByIndex, setTestResultsByIndex] = useState<Record<number, UnitTestResultItem>>({})
  const [isRunningSingle, setIsRunningSingle] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
        const curriculumIndex = preferredUnitId
          ? nextUnits.findIndex((unit) => unit.id === preferredUnitId)
          : -1

        const placementStart = storedState.placement?.startUnitIndex
        const placementIndex =
          typeof placementStart === 'number' && placementStart > 0
            ? Math.min(placementStart - 1, nextUnits.length - 1)
            : -1

        let nextIndex = 0
        if (placementIndex >= 0) {
          nextIndex = placementIndex
        }
        if (curriculumIndex >= 0) {
          nextIndex = curriculumIndex
        }
        if (isStartUnit(queryUnit)) {
          nextIndex = getUnitIndexFromStartUnit(queryUnit, nextUnits.length)
        } else if (queryUnit && /^\d+$/.test(queryUnit)) {
          const numericUnit = Number.parseInt(queryUnit, 10)
          if (numericUnit >= 1) {
            nextIndex = Math.min(numericUnit - 1, nextUnits.length - 1)
          }
        }

        setCurrentUnitIndex(nextIndex)
        setSelectedTestIndex(0)
        setTestResultsByIndex({})
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
  }, [
    queryUnit,
    selectedLanguage,
    storedState.curriculum?.currentUnitId,
    storedState.placement?.startUnitIndex,
  ])

  const currentUnit = units[currentUnitIndex] ?? null
  const currentCode = currentUnit ? draftByUnitId[currentUnit.id] ?? currentUnit.starterCode : ''

  const failingSummary = useMemo(
    () => buildFailingSummary(testResultsByIndex),
    [testResultsByIndex],
  )

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

  async function executeTest(index: number): Promise<UnitTestResultItem> {
    if (!currentUnit) {
      return {
        input: '',
        expected: '',
        actual: '',
        stderr: 'No active unit.',
        passed: false,
        timedOut: false,
      }
    }

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

    return {
      input: test.input,
      expected: test.expected,
      actual: result.stdout,
      stderr: result.stderr,
      passed,
      timedOut: result.timedOut,
    }
  }

  const runSelectedTest = useCallback(async () => {
    if (!currentUnit || isRunningSingle || isSubmitting) {
      return
    }

    setIsRunningSingle(true)
    setRunStatus('running')
    setRunMessage(`Running testcase #${selectedTestIndex + 1}...`)

    try {
      const result = await executeTest(selectedTestIndex)
      setTestResultsByIndex((prev) => ({
        ...prev,
        [selectedTestIndex]: result,
      }))

      if (result.passed) {
        setRunStatus('success')
        setRunMessage(`Testcase #${selectedTestIndex + 1} passed.`)
      } else {
        setRunStatus('error')
        setRunMessage(`Testcase #${selectedTestIndex + 1} failed.`)
      }
    } finally {
      setIsRunningSingle(false)
    }
  }, [currentUnit, isRunningSingle, isSubmitting, selectedTestIndex])

  const submitAllTests = useCallback(async () => {
    if (!currentUnit || isSubmitting || isRunningSingle) {
      return
    }

    setIsSubmitting(true)
    setRunStatus('running')
    setRunMessage(`Submitting ${currentUnit.tests.length} tests...`)

    const nextResults: Record<number, UnitTestResultItem> = {}

    try {
      for (let index = 0; index < currentUnit.tests.length; index += 1) {
        nextResults[index] = await executeTest(index)
      }

      setTestResultsByIndex(nextResults)

      const passedCount = Object.values(nextResults).filter((item) => item.passed).length
      const allPassed = passedCount === currentUnit.tests.length

      if (allPassed) {
        setRunStatus('success')
        setRunMessage(`All tests passed (${passedCount}/${currentUnit.tests.length}).`)
        setCompletedUnitIds((prev) =>
          prev.includes(currentUnit.id) ? prev : [...prev, currentUnit.id],
        )
      } else {
        setRunStatus('error')
        setRunMessage(`${passedCount}/${currentUnit.tests.length} passed. Keep iterating.`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [currentUnit, isSubmitting, isRunningSingle])

  function selectUnit(index: number) {
    setCurrentUnitIndex(index)
    setSelectedTestIndex(0)
    setRunStatus('idle')
    setRunMessage('Run a testcase or submit all tests.')
    setTestResultsByIndex({})
  }

  function moveToNextUnit() {
    if (currentUnitIndex < units.length - 1) {
      selectUnit(currentUnitIndex + 1)
    }
  }

  if (isLoading) {
    return (
      <section className="h-[100vh] overflow-hidden bg-[#070b14] p-3">
        <Card className="space-y-2" padding="md" interactive>
          <p className="text-sm font-medium text-pebble-text-primary">Loading curriculum...</p>
          <p className="text-sm text-pebble-text-secondary">Preparing {languageMeta.label} path.</p>
        </Card>
      </section>
    )
  }

  if (loadError || !currentUnit) {
    return (
      <section className="h-[100vh] overflow-hidden bg-[#070b14] p-3">
        <Card className="space-y-2" padding="md" interactive>
          <p className="text-sm font-medium text-pebble-warning">Unable to load this session.</p>
          <p className="text-sm text-pebble-text-secondary">{loadError || 'No units found.'}</p>
        </Card>
      </section>
    )
  }

  const completedCount = Object.keys(testResultsByIndex).length
  const passedCount = Object.values(testResultsByIndex).filter((result) => result.passed).length
  const currentIsCompleted = completedUnitIds.includes(currentUnit.id)

  const constraints = [
    'Read input from stdin exactly as provided.',
    'Write output to stdout in the exact expected format.',
    `Pass all ${currentUnit.tests.length} unit tests before submitting.`,
  ]

  return (
    <section className="h-[100vh] overflow-hidden bg-[#070b14] text-white">
      <header className="flex h-16 items-center justify-between border-b border-white/10 bg-white/[0.02] px-4">
        <div className="flex items-center gap-4">
          <p className="text-lg font-semibold tracking-[-0.01em] text-white">Pebble</p>
          <nav className="hidden items-center gap-2 text-sm text-white/55 md:flex">
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-white/85">Session</span>
            <span>{languageMeta.label}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/[0.1]"
          >
            ☰ Units
          </button>
          <Badge variant={statusVariant(runStatus)}>{runStatus}</Badge>
          {currentIsCompleted && currentUnitIndex < units.length - 1 && (
            <Button variant="secondary" size="sm" onClick={moveToNextUnit}>
              Next unit
            </Button>
          )}
        </div>
      </header>

      <main className="h-[calc(100vh-64px)] overflow-hidden p-3">
        <div className="grid h-full min-h-0 grid-cols-[420px_minmax(0,1fr)] gap-3">
          <ProblemStatementPanel
            title={currentUnit.title}
            concept={currentUnit.concept}
            prompt={currentUnit.prompt}
            constraints={constraints}
            tests={currentUnit.tests}
            difficultyLabel={difficultyByLevel(selectedLevel)}
            tags={[languageMeta.label, 'Arrays', 'Simulation']}
            className="min-h-0"
          />

          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_260px] gap-3">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.08em] text-white/45">Code</p>
                  <p className="truncate text-sm font-medium text-white">{currentUnit.title}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/70">
                    {LANGUAGE_RUNTIME_LABEL[selectedLanguage]}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] text-white/65 transition hover:bg-white/[0.1]"
                    aria-label="Format"
                  >
                    ⟲
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] text-white/65 transition hover:bg-white/[0.1]"
                    aria-label="Settings"
                  >
                    ⚙
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1">
                <Editor
                  height="100%"
                  language={IDE_MONACO_LANGUAGE[selectedLanguage]}
                  theme="vs-dark"
                  value={currentCode}
                  onChange={(nextValue) => onCodeChange(nextValue ?? '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 21,
                    automaticLayout: true,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    overviewRulerLanes: 0,
                    padding: {
                      top: 12,
                      bottom: 12,
                    },
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
                <p className="truncate text-xs text-white/60">
                  Case {selectedTestIndex + 1} • {runMessage}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => void runSelectedTest()}
                    disabled={isRunningSingle || isSubmitting}
                    className="gap-2"
                  >
                    <span aria-hidden="true" className="inline-flex">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
                        <path d="M5 3.8a1 1 0 0 1 1.53-.85l8.9 5.7a1.6 1.6 0 0 1 0 2.7l-8.9 5.7A1 1 0 0 1 5 16.2V3.8z" />
                      </svg>
                    </span>
                    {isRunningSingle ? 'Running...' : 'Run'}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void submitAllTests()}
                    disabled={isSubmitting || isRunningSingle}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
              </div>
            </section>

            <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-3">
              <TestResultsPanel
                tests={currentUnit.tests}
                selectedTestIndex={selectedTestIndex}
                onSelectTest={(index) => setSelectedTestIndex(index)}
                resultsByIndex={testResultsByIndex}
                summaryLabel={`${passedCount}/${currentUnit.tests.length} passed • ${completedCount}/${currentUnit.tests.length} run`}
                className="min-h-0"
              />

              <PebbleChatPanel
                unitTitle={currentUnit.title}
                unitConcept={currentUnit.concept}
                codeText={currentCode}
                runStatus={runStatus}
                runMessage={runMessage}
                failingSummary={failingSummary}
                initialSummary={recentChatSummary}
                onSummaryChange={setRecentChatSummary}
                className="min-h-0"
              />
            </div>
          </div>
        </div>
      </main>

      <UnitsDrawer
        open={drawerOpen}
        units={units}
        currentUnitIndex={currentUnitIndex}
        completedUnitIds={completedUnitIds}
        onClose={() => setDrawerOpen(false)}
        onSelectUnit={selectUnit}
      />
    </section>
  )
}
