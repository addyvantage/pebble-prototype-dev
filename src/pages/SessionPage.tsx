import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import {
  buildFunctionModeRunnable,
  buildSingleCaseFunctionModeRunnable,
  getUnitFunctionMode,
  parseHarnessCasesFromStdout,
} from '../lib/functionMode'
import { ChevronLeft, ChevronRight, Play, RotateCcw, Settings2 } from 'lucide-react'
import {
  loadUnitProgress,
  markUnitCompleted,
  saveUnitProgress,
  type UnitProgressMap,
} from '../lib/progressStore'
import {
  appendSubmission,
  loadSubmissions,
  saveSubmissions,
  type SubmissionsByUnit,
} from '../lib/submissionsStore'
import { useBodyScrollLock } from '../utils/useBodyScrollLock'
import { useTheme } from '../hooks/useTheme'

type RunResponse = {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

const LANGUAGE_RUNTIME_LABEL: Record<PlacementLanguage, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  cpp: 'C++17',
  java: 'Java 17',
  c: 'C (GNU)',
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
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [currentUnitIndex, setCurrentUnitIndex] = useState(0)
  const [draftByUnitId, setDraftByUnitId] = useState<Record<string, string>>({})
  const [unitProgress, setUnitProgress] = useState<UnitProgressMap>(() => {
    const persisted = loadUnitProgress()
    const migrated = { ...persisted }
    for (const unitId of storedState.curriculum?.completedUnitIds ?? []) {
      if (!migrated[unitId]?.completed) {
        migrated[unitId] = {
          completed: true,
          lastPassedAt: Date.now(),
        }
      }
    }
    return migrated
  })
  const [submissionsByUnit, setSubmissionsByUnit] = useState<SubmissionsByUnit>(() => loadSubmissions())

  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [runMessage, setRunMessage] = useState('Run to evaluate all testcases.')
  const [selectedTestIndex, setSelectedTestIndex] = useState(0)
  const [testResultsByIndex, setTestResultsByIndex] = useState<Record<number, UnitTestResultItem>>({})
  const [isRunningAll, setIsRunningAll] = useState(false)
  const [activeAction, setActiveAction] = useState<'run' | 'submit' | null>(null)
  const [totalDurationMs, setTotalDurationMs] = useState(0)
  const [submitAccepted, setSubmitAccepted] = useState(false)
  const [recentChatSummary, setRecentChatSummary] = useState(
    storedState.curriculum?.recentChatSummary ?? '',
  )
  const [editorFontSize, setEditorFontSize] = useState(14)
  const [wordWrapEnabled, setWordWrapEnabled] = useState(true)

  const completedUnitIds = useMemo(
    () =>
      Object.entries(unitProgress)
        .filter(([, entry]) => entry.completed)
        .map(([unitId]) => unitId),
    [unitProgress],
  )

  const languageMeta = useMemo(() => getLanguageMetadata(selectedLanguage), [selectedLanguage])
  const { theme, setTheme } = useTheme()
  const runtimeLanguage: PlacementLanguage = selectedLanguage === 'c' ? 'cpp' : selectedLanguage

  useEffect(() => {
    saveUnitProgress(unitProgress)
  }, [unitProgress])

  useEffect(() => {
    saveSubmissions(submissionsByUnit)
  }, [submissionsByUnit])

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
            const functionConfig = getUnitFunctionMode(selectedLanguage, unit.id)
            next[unit.id] = functionConfig?.starterStub ?? unit.starterCode
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
        setRunStatus('idle')
        setRunMessage('Run to evaluate all testcases.')
        setTotalDurationMs(0)
        setSubmitAccepted(false)
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
  const currentDefaultCode = currentUnit
    ? getUnitFunctionMode(selectedLanguage, currentUnit.id)?.starterStub ?? currentUnit.starterCode
    : ''
  const currentCode = currentUnit ? draftByUnitId[currentUnit.id] ?? currentDefaultCode : ''
  const currentFunctionConfig = useMemo(() => {
    if (!currentUnit) {
      return null
    }
    return getUnitFunctionMode(selectedLanguage, currentUnit.id)
  }, [currentUnit, selectedLanguage])

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
    setSubmitAccepted(false)
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
        durationMs: 0,
        exitCode: null,
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
          language: runtimeLanguage,
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
      durationMs: result.durationMs,
      exitCode: result.exitCode,
    }
  }

  const runAllTests = useCallback(async (mode: 'run' | 'submit') => {
    if (!currentUnit || isRunningAll) {
      return
    }

    setIsRunningAll(true)
    setActiveAction(mode)
    setRunStatus('running')
    setRunMessage(`${mode === 'submit' ? 'Submitting' : 'Running'} ${currentUnit.tests.length} testcases...`)
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    if (mode === 'run') {
      setSubmitAccepted(false)
    }

    try {
      let nextResults: Record<number, UnitTestResultItem> = {}
      let durationTotal = 0

      if (currentFunctionConfig?.evalMode === 'function') {
        const parsedCases = currentUnit.tests.map((test) => currentFunctionConfig.parseTestCase(test))
        if (parsedCases.some((test) => test === null)) {
          nextResults = Object.fromEntries(
            currentUnit.tests.map((test, index) => [index, {
              input: test.input,
              expected: test.expected,
              actual: '',
              stderr: 'Failed to parse testcase into function arguments.',
              passed: false,
              timedOut: false,
              durationMs: 0,
              exitCode: null,
            }]),
          )
          setTestResultsByIndex(nextResults)
          setRunStatus('error')
          setRunMessage('Failed to prepare function-mode testcases.')
          setSubmitAccepted(false)
          return
        }

        const functionCases = parsedCases.filter(
          (test): test is NonNullable<typeof test> => test !== null,
        )

        if (selectedLanguage === 'python') {
          const runnableCode = buildFunctionModeRunnable({
            language: selectedLanguage,
            userCode: currentCode,
            methodName: currentFunctionConfig.methodName,
            cases: functionCases,
          })

          if (!runnableCode) {
            nextResults = Object.fromEntries(
              currentUnit.tests.map((test, index) => [index, {
                input: test.input,
                expected: test.expected,
                actual: '',
                stderr: `Function mode is not supported for ${selectedLanguage}.`,
                passed: false,
                timedOut: false,
                durationMs: 0,
                exitCode: null,
              }]),
            )
            setTestResultsByIndex(nextResults)
            setRunStatus('error')
            setRunMessage(`Function mode unavailable for ${selectedLanguage}.`)
            setSubmitAccepted(false)
            return
          }

          let payload: unknown = null
          try {
            const response = await fetch('/api/run', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                language: runtimeLanguage,
                code: runnableCode,
                stdin: '',
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

          const runResult = normalizeRunResponse(payload)
          durationTotal = runResult.durationMs
          const parsedHarnessCases = parseHarnessCasesFromStdout(runResult.stdout)
          const perCaseDuration = currentUnit.tests.length > 0
            ? Math.max(1, Math.floor(durationTotal / currentUnit.tests.length))
            : 0

          if (parsedHarnessCases && parsedHarnessCases.length > 0) {
            nextResults = Object.fromEntries(
              currentUnit.tests.map((test, index) => {
                const harnessCase = parsedHarnessCases[index]
                if (!harnessCase) {
                  return [index, {
                    input: test.input,
                    expected: test.expected,
                    actual: '',
                    stderr: 'Missing case result from harness output.',
                    passed: false,
                    timedOut: false,
                    durationMs: perCaseDuration,
                    exitCode: runResult.exitCode,
                  }]
                }

                return [index, {
                  input: harnessCase.input || test.input,
                  expected: harnessCase.expected || test.expected,
                  actual: harnessCase.actual,
                  stderr: harnessCase.stderr,
                  passed: harnessCase.passed,
                  timedOut: runResult.timedOut,
                  durationMs: perCaseDuration,
                  exitCode: runResult.exitCode,
                }]
              }),
            )
          } else {
            nextResults = Object.fromEntries(
              currentUnit.tests.map((test, index) => [index, {
                input: test.input,
                expected: test.expected,
                actual: runResult.stdout,
                stderr: runResult.stderr || 'Unable to parse harness output.',
                passed: false,
                timedOut: runResult.timedOut,
                durationMs: perCaseDuration,
                exitCode: runResult.exitCode,
              }]),
            )
          }
        } else {
          for (let index = 0; index < currentUnit.tests.length; index += 1) {
            const currentCase = functionCases[index]
            const test = currentUnit.tests[index]

            const runnableCode = currentCase
              ? buildSingleCaseFunctionModeRunnable({
                language: selectedLanguage,
                userCode: currentCode,
                methodName: currentFunctionConfig.methodName,
                args: currentCase.args,
              })
              : null

            if (!runnableCode) {
              const failedResult: UnitTestResultItem = {
                input: test.input,
                expected: test.expected,
                actual: '',
                stderr: `Function wrapper unavailable for ${selectedLanguage}.`,
                passed: false,
                timedOut: false,
                durationMs: 0,
                exitCode: null,
              }
              nextResults[index] = failedResult
              continue
            }

            let payload: unknown = null
            try {
              const response = await fetch('/api/run', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  language: runtimeLanguage,
                  code: runnableCode,
                  stdin: '',
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

            const runResult = normalizeRunResponse(payload)
            const expectedNormalized = normalizeOutput(test.expected)
            const actualNormalized = normalizeOutput(runResult.stdout)
            const passed = runResult.ok && expectedNormalized === actualNormalized
            const caseResult: UnitTestResultItem = {
              input: test.input,
              expected: test.expected,
              actual: runResult.stdout,
              stderr: runResult.stderr,
              passed,
              timedOut: runResult.timedOut,
              durationMs: runResult.durationMs,
              exitCode: runResult.exitCode,
            }

            nextResults[index] = caseResult
            durationTotal += runResult.durationMs

            setTestResultsByIndex((prev) => ({
              ...prev,
              [index]: caseResult,
            }))
          }
        }
      } else {
        for (let index = 0; index < currentUnit.tests.length; index += 1) {
          const result = await executeTest(index)
          nextResults[index] = result
          durationTotal += result.durationMs

          setTestResultsByIndex((prev) => ({
            ...prev,
            [index]: result,
          }))
        }
      }

      setTestResultsByIndex(nextResults)
      setTotalDurationMs(durationTotal)

      const passedCount = Object.values(nextResults).filter((item) => item.passed).length
      const allPassed = passedCount === currentUnit.tests.length
      const runExitCode =
        Object.values(nextResults)
          .map((item) => item.exitCode)
          .find((exitCode) => exitCode !== null) ?? null

      if (allPassed) {
        setRunStatus('success')
        setRunMessage(`${passedCount}/${currentUnit.tests.length} passed • ${durationTotal}ms`)
        setUnitProgress((prev) => markUnitCompleted(prev, currentUnit.id, durationTotal))

        if (mode === 'submit') {
          setSubmitAccepted(true)
        }
      } else {
        const firstFailed = Object.entries(nextResults)
          .map(([index, result]) => ({ index: Number(index), result }))
          .find(({ result }) => !result.passed)

        const failPreview = firstFailed
          ? `Fail #${firstFailed.index + 1}: expected ${firstFailed.result.expected}, got ${normalizeOutput(firstFailed.result.actual) || '(empty)'}`
          : 'Some tests failed.'

        setRunStatus('error')
        setRunMessage(`${passedCount}/${currentUnit.tests.length} passed • ${durationTotal}ms • ${failPreview}`)
        if (mode === 'submit') {
          setSubmitAccepted(false)
        }
      }

      if (mode === 'submit') {
        setSubmissionsByUnit((prev) =>
          appendSubmission(prev, {
            unitId: currentUnit.id,
            status: allPassed ? 'accepted' : 'failed',
            language: selectedLanguage,
            runtimeMs: durationTotal,
            passCount: passedCount,
            totalCount: currentUnit.tests.length,
            exitCode: runExitCode,
            code: currentCode,
          }),
        )
      }
    } finally {
      setIsRunningAll(false)
      setActiveAction(null)
    }
  }, [currentCode, currentFunctionConfig, currentUnit, executeTest, isRunningAll, runtimeLanguage, selectedLanguage])

  function selectUnit(index: number) {
    setCurrentUnitIndex(index)
    setSelectedTestIndex(0)
    setRunStatus('idle')
    setRunMessage('Run to evaluate all testcases.')
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    setSubmitAccepted(false)
  }

  function moveToNextUnit() {
    if (currentUnitIndex < units.length - 1) {
      selectUnit(currentUnitIndex + 1)
    }
  }

  function moveToPreviousUnit() {
    if (currentUnitIndex > 0) {
      selectUnit(currentUnitIndex - 1)
    }
  }

  function handleResetCode() {
    if (!currentUnit) {
      return
    }

    const confirmed = window.confirm('Reset editor to starter code?')
    if (!confirmed) {
      return
    }

    setDraftByUnitId((prev) => ({
      ...prev,
      [currentUnit.id]: currentFunctionConfig?.starterStub ?? currentUnit.starterCode,
    }))
    setRunStatus('idle')
    setRunMessage('Editor reset to starter code.')
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    setSubmitAccepted(false)
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
  const allTestsPassed = currentUnit.tests.length > 0 && passedCount === currentUnit.tests.length
  const nextEnabled = currentUnitIndex < units.length - 1
  const previousEnabled = currentUnitIndex > 0
  const lastExitCode = Object.values(testResultsByIndex)
    .map((result) => result.exitCode)
    .find((exitCode) => exitCode !== null)
  const levelLabel = `${selectedLevel[0]?.toUpperCase() ?? ''}${selectedLevel.slice(1)}`
  const summaryLabel = `${passedCount}/${currentUnit.tests.length} passed • ${completedCount}/${currentUnit.tests.length} run${totalDurationMs > 0 ? ` • ${totalDurationMs}ms` : ''}${typeof lastExitCode === 'number' ? ` • exit ${lastExitCode}` : ''}`
  const currentUnitSubmissions = submissionsByUnit[currentUnit.id] ?? []

  const constraints = currentFunctionConfig?.evalMode === 'function'
    ? [
        'Implement only the Solution method for this unit.',
        'Input parsing, testcase looping, and output checks are handled automatically.',
        `Pass all ${currentUnit.tests.length} unit tests before submitting.`,
      ]
    : [
        'Read input from stdin exactly as provided.',
        'Write output to stdout in the exact expected format.',
        `Pass all ${currentUnit.tests.length} unit tests before submitting.`,
      ]

  return (
    <section className="h-[100vh] overflow-hidden bg-[#070b14] text-white">
      <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 bg-white/[0.02] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/[0.12] active:bg-white/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/55"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-pebble-accent/20 text-xs">P</span>
            Pebble
          </Link>

          <span className="hidden rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/70 md:inline-flex">
            {languageMeta.label} • {levelLabel}
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2">
          <button
            type="button"
            onClick={moveToPreviousUnit}
            disabled={!previousEnabled}
            title="Previous question"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/85 transition hover:border-white/20 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="max-w-[420px] truncate px-1 text-sm font-semibold text-white">{currentUnit.title}</p>
          <button
            type="button"
            onClick={moveToNextUnit}
            disabled={!nextEnabled}
            title="Next question"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white/[0.05] text-white/85 transition hover:border-white/20 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-45 ${
              allTestsPassed && nextEnabled
                ? 'border-pebble-success/45 shadow-[0_0_0_1px_rgba(74,222,128,0.28),0_0_16px_rgba(74,222,128,0.22)]'
                : 'border-white/10'
            }`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            title="Page settings"
            onClick={() => setSettingsOpen(true)}
            className="h-8 w-8 rounded-lg border-white/20 bg-white/[0.05] p-0 text-white/85 hover:border-white/35 hover:bg-white/[0.12]"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-white/85 transition hover:bg-white/[0.12]"
          >
            ☰ Units
          </button>

          <Badge variant={statusVariant(runStatus)}>{runStatus}</Badge>
        </div>
      </header>

      <main className="h-[calc(100vh-64px)] overflow-hidden p-3">
        <div className="grid h-full min-h-0 grid-cols-[clamp(380px,24vw,420px)_minmax(0,1fr)_clamp(360px,24vw,400px)] gap-3">
          <ProblemStatementPanel
            unitId={currentUnit.id}
            title={currentUnit.title}
            concept={currentUnit.concept}
            prompt={currentUnit.prompt}
            constraints={constraints}
            tests={currentUnit.tests}
            difficultyLabel={difficultyByLevel(selectedLevel)}
            tags={[languageMeta.label, 'Practice', 'Runtime verified']}
            language={selectedLanguage}
            functionMode={currentFunctionConfig?.evalMode === 'function'}
            submissions={currentUnitSubmissions}
            className="min-h-0"
          />

          <div
            className="grid min-h-0 gap-3"
            style={{
              gridTemplateRows: 'minmax(0,1fr) clamp(280px,33vh,360px)',
            }}
          >
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.08em] text-white/55">Code</p>
                  <p className="truncate text-sm font-medium text-white">{currentUnit.title}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/80">
                    {LANGUAGE_RUNTIME_LABEL[selectedLanguage]}
                  </span>
                  {currentFunctionConfig?.evalMode === 'function' && (
                    <span className="rounded-full border border-pebble-accent/35 bg-pebble-accent/12 px-2.5 py-1 text-xs text-pebble-accent">
                      Function mode
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    title="Reset code"
                    onClick={handleResetCode}
                    className="h-9 w-9 rounded-xl border-white/20 bg-white/[0.06] p-0 text-white/90 hover:border-white/35 hover:bg-white/[0.14]"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    title="Editor settings"
                    onClick={() => setSettingsOpen(true)}
                    className="h-9 w-9 rounded-xl border-white/20 bg-white/[0.06] p-0 text-white/90 hover:border-white/35 hover:bg-white/[0.14]"
                  >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => void runAllTests('run')}
                    disabled={isRunningAll}
                    className="gap-2"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    {isRunningAll && activeAction === 'run' ? 'Running...' : 'Run'}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void runAllTests('submit')}
                    disabled={isRunningAll}
                    className={submitAccepted ? '!border-pebble-success/45 !bg-pebble-success/18 !text-pebble-success' : ''}
                  >
                    {isRunningAll && activeAction === 'submit' ? 'Submitting...' : submitAccepted ? 'Accepted' : 'Submit'}
                  </Button>
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
                    fontSize: editorFontSize,
                    lineHeight: 22,
                    automaticLayout: true,
                    wordWrap: wordWrapEnabled ? 'on' : 'off',
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    overviewRulerLanes: 0,
                    scrollbar: {
                      horizontal: 'hidden',
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    },
                    padding: {
                      top: 12,
                      bottom: 12,
                    },
                  }}
                />
              </div>

              {currentFunctionConfig?.evalMode === 'function' && (
                <p className="border-t border-white/10 px-3 py-1.5 text-xs text-white/60">
                  Implement the function only. Input/output and testcase looping are handled automatically.
                </p>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-xs text-white/70">
                <p className="truncate">{runMessage}</p>
                {currentIsCompleted ? (
                  <span className="rounded-full border border-pebble-success/35 bg-pebble-success/15 px-2 py-0.5 text-[11px] text-pebble-success">
                    Completed
                  </span>
                ) : null}
              </div>
            </section>

            <TestResultsPanel
              tests={currentUnit.tests}
              selectedTestIndex={selectedTestIndex}
              onSelectTest={(index) => setSelectedTestIndex(index)}
              resultsByIndex={testResultsByIndex}
              summaryLabel={summaryLabel}
              className="min-h-0"
            />
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
            className="h-full min-h-0"
          />
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

      {settingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1728] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white">Session settings</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-white/75 transition hover:bg-white/[0.12]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-white/80">
              <label className="flex items-center justify-between gap-3">
                <span>Theme</span>
                <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`rounded-md px-2.5 py-1 text-xs transition ${
                      theme === 'dark' ? 'bg-white/14 text-white' : 'text-white/70 hover:bg-white/[0.08]'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`rounded-md px-2.5 py-1 text-xs transition ${
                      theme === 'light' ? 'bg-white/14 text-white' : 'text-white/70 hover:bg-white/[0.08]'
                    }`}
                  >
                    Light
                  </button>
                </div>
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>Font size</span>
                <input
                  type="range"
                  min={14}
                  max={18}
                  step={1}
                  value={editorFontSize}
                  onChange={(event) => setEditorFontSize(Number(event.target.value))}
                  className="w-40"
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>Word wrap</span>
                <button
                  type="button"
                  onClick={() => setWordWrapEnabled((prev) => !prev)}
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/85 transition hover:bg-white/[0.12]"
                >
                  {wordWrapEnabled ? 'On' : 'Off'}
                </button>
              </label>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
