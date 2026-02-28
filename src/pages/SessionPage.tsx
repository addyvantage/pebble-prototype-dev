import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { StreakPill } from '../components/ui/StreakPill'
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
import { Check, ChevronLeft, ChevronRight, Home, Play, RotateCcw, Settings2 } from 'lucide-react'
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
import { loadPagePrefs, savePagePrefs, type PagePrefs } from '../lib/pagePrefsStore'
import { useI18n } from '../i18n/useI18n'
import { getLocalizedUnitCopy } from '../i18n/unitContent'
import {
  applySqlStarterComment,
  getLocalizedProblem,
  getLocalizedStarter,
} from '../i18n/problemContent'
import {
  dateKeyForTimeZone,
  selectCurrentStreak,
  selectDailyCompletions,
} from '../lib/analyticsDerivers'
import {
  getAnalyticsState,
  subscribeAnalytics,
  classifyErrorType,
  logAssistEvent,
  logRunEvent,
  logSubmitEvent,
} from '../lib/analyticsStore'
import {
  getDefaultProblemLanguage,
  getProblemById,
  getProblemTimeEstimateMinutes,
  getProblemStarterCode,
  getSqlCheckerFailures,
  isProblemLanguage,
  type ProblemDefinition,
  type ProblemLanguage,
  type SqlPreviewTable,
} from '../data/problemsBank'
import { markProblemAttempt } from '../lib/solvedProblemsStore'
import { requestRunApi } from '../lib/runApi'
import { localizeTopicLabel } from '../i18n/topicCatalog'
import type { LanguageCode } from '../i18n/languages'
import {
  createStruggleEngine,
  type StruggleAssistAction,
  type StruggleEvent,
  type StruggleContextSummary,
  type StruggleEngineState,
  type StruggleLevel,
} from '../lib/struggleEngine'

type RunResponse = {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

type StruggleNudgeState = {
  level: StruggleLevel
  visible: boolean
}

type SessionEditorLanguage = PlacementLanguage | 'sql'

const SESSION_MONACO_LANGUAGE: Record<SessionEditorLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  java: 'java',
  c: 'c',
  sql: 'plaintext',
}

const SESSION_RUNTIME_LABEL: Record<SessionEditorLanguage, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  cpp: 'C++17',
  java: 'Java 17',
  c: 'C (GNU)',
  sql: 'SQL (Simulated)',
}

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trim()
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

function localizeProblemChip(
  chip: string,
  lang: LanguageCode,
  t: (key: 'problem.chip.sql' | 'problem.chip.subquery') => string,
) {
  const normalized = chip.trim().toLowerCase()
  if (normalized === 'sql') {
    return t('problem.chip.sql')
  }
  if (normalized === 'subquery') {
    return t('problem.chip.subquery')
  }
  return localizeTopicLabel(chip, lang)
}

function resolveCurriculumDifficulty(level: PlacementLevel, unitId: string): 'Easy' | 'Medium' | 'Hard' {
  if (unitId === 'hello-world') {
    return 'Easy'
  }
  if (level === 'beginner') {
    return 'Easy'
  }
  if (level === 'intermediate') {
    return 'Medium'
  }
  return 'Hard'
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

function buildProblemUnit(problem: ProblemDefinition, starterCode: string): CurriculumUnit {
  return {
    id: problem.id,
    title: problem.title,
    concept: problem.topics[0] ?? 'Practice',
    prompt: problem.statement.summary,
    starterCode,
    tests: problem.tests,
    hints: [],
  }
}

function formatSqlPreviewTable(table: SqlPreviewTable) {
  const header = table.columns.join(' | ')
  const separator = table.columns.map(() => '---').join(' | ')
  const body = table.rows.map((row) => row.join(' | ')).join('\n')
  return `${header}\n${separator}\n${body}`.trim()
}

export function SessionPage() {
  const { lang: uiLanguage, t, format } = useI18n()
  const [searchParams] = useSearchParams()
  const analyticsState = useSyncExternalStore(subscribeAnalytics, getAnalyticsState, getAnalyticsState)
  const storedState = useMemo(() => getPebbleUserState(), [analyticsState.updatedAt])
  const queryUnit = searchParams.get('unit')
  const queryProblemId = searchParams.get('problem')

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

  const activeProblemBase = useMemo(() => getProblemById(queryProblemId), [queryProblemId])
  const activeProblem = useMemo(
    () => (activeProblemBase ? getLocalizedProblem(activeProblemBase, uiLanguage) : null),
    [activeProblemBase, uiLanguage],
  )
  const activeProblemLanguage = useMemo<ProblemLanguage>(() => {
    if (!activeProblemBase) {
      return 'python'
    }

    const queryLanguage = searchParams.get('lang')
    if (isProblemLanguage(queryLanguage) && activeProblemBase.languageSupport.includes(queryLanguage)) {
      return queryLanguage
    }

    return getDefaultProblemLanguage(activeProblemBase)
  }, [activeProblemBase, searchParams, selectedLanguage])
  const sessionLanguage: SessionEditorLanguage = activeProblem ? activeProblemLanguage : selectedLanguage
  const isSqlMode = activeProblemBase?.kind === 'sql' && sessionLanguage === 'sql'
  const activeProblemStarter = useMemo(() => {
    if (!activeProblemBase) {
      return ''
    }
    const starter =
      getLocalizedStarter(activeProblemBase, uiLanguage)
      ?? getProblemStarterCode(activeProblemBase, activeProblemLanguage)
    if (activeProblemBase.kind !== 'sql') {
      return starter
    }
    return applySqlStarterComment(starter, t('session.sqlStarterComment'))
  }, [activeProblemBase, activeProblemLanguage, t, uiLanguage])

  const [units, setUnits] = useState<CurriculumUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false)
  const [sessionSettingsOpen, setSessionSettingsOpen] = useState(false)
  const [pagePrefs, setPagePrefs] = useState<PagePrefs>(() => loadPagePrefs())

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
  const [runMessage, setRunMessage] = useState(t('run.evaluateAll'))
  const [nowTick, setNowTick] = useState(() => Date.now())
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
  const [liveCodeSnapshot, setLiveCodeSnapshot] = useState('')
  const [struggleNudge, setStruggleNudge] = useState<StruggleNudgeState>({
    level: 0,
    visible: false,
  })

  const struggleEngineRef = useRef<ReturnType<typeof createStruggleEngine> | null>(null)
  if (!struggleEngineRef.current) {
    struggleEngineRef.current = createStruggleEngine()
  }
  const struggleStateRef = useRef<StruggleEngineState>(struggleEngineRef.current.getState())
  const previousCodeRef = useRef('')
  const liveCodeRef = useRef('')
  const liveCodeDebounceRef = useRef<number | null>(null)

  const completedUnitIds = useMemo(
    () =>
      Object.entries(unitProgress)
        .filter(([, entry]) => entry.completed)
        .map(([unitId]) => unitId),
    [unitProgress],
  )

  const languageMeta = useMemo(() => getLanguageMetadata(selectedLanguage), [selectedLanguage])
  const { theme, setTheme } = useTheme()
  const runtimeLanguage: PlacementLanguage = sessionLanguage === 'c'
    ? 'cpp'
    : isPlacementLanguage(sessionLanguage)
      ? sessionLanguage
      : selectedLanguage
  const trackId = `${selectedLanguage}:${selectedLevel}`
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const dailyCompletions = useMemo(
    () => selectDailyCompletions(analyticsState.events, timeZone),
    [analyticsState.events, timeZone],
  )
  const todayKey = useMemo(
    () => dateKeyForTimeZone(nowTick, timeZone),
    [nowTick, timeZone],
  )
  const currentStreak = useMemo(
    () => selectCurrentStreak(dailyCompletions, todayKey),
    [dailyCompletions, todayKey],
  )

  useEffect(() => {
    saveUnitProgress(unitProgress)
  }, [unitProgress])

  useEffect(() => {
    savePagePrefs(pagePrefs)
  }, [pagePrefs])

  useEffect(() => {
    saveSubmissions(submissionsByUnit)
  }, [submissionsByUnit])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('reduced-motion', pagePrefs.reduceMotion)
  }, [pagePrefs.reduceMotion])

  useEffect(() => {
    if (runStatus === 'idle') {
      setRunMessage(t('run.evaluateAll'))
    }
  }, [runStatus, t])

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      if (liveCodeDebounceRef.current !== null) {
        window.clearTimeout(liveCodeDebounceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadUnits() {
      setIsLoading(true)
      setLoadError('')
      try {
        if (activeProblem) {
          const problemUnit = buildProblemUnit(activeProblem, activeProblemStarter)
          if (!mounted) {
            return
          }

          setUnits([problemUnit])
          setDraftByUnitId({
            [problemUnit.id]: problemUnit.starterCode,
          })
          setCurrentUnitIndex(0)
          setSelectedTestIndex(0)
          setTestResultsByIndex({})
          setRunStatus('idle')
          setRunMessage(t('run.evaluateAll'))
          setTotalDurationMs(0)
          setSubmitAccepted(false)
          return
        }

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
        setRunMessage(t('run.evaluateAll'))
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
    activeProblem,
    activeProblemStarter,
    queryUnit,
    selectedLanguage,
    storedState.curriculum?.currentUnitId,
    storedState.placement?.startUnitIndex,
    t,
  ])

  const currentUnit = units[currentUnitIndex] ?? null
  const localizedUnits = useMemo(
    () => units.map((unit) => ({ unit, copy: getLocalizedUnitCopy(unit, uiLanguage) })),
    [uiLanguage, units],
  )
  const currentUnitCopy = currentUnit ? getLocalizedUnitCopy(currentUnit, uiLanguage) : null
  const currentDefaultCode = currentUnit
    ? activeProblem
      ? activeProblemStarter
      : getUnitFunctionMode(selectedLanguage, currentUnit.id)?.starterStub ?? currentUnit.starterCode
    : ''
  const currentCode = currentUnit ? draftByUnitId[currentUnit.id] ?? currentDefaultCode : ''
  const currentFunctionConfig = useMemo(() => {
    if (!currentUnit || activeProblemBase) {
      return null
    }
    return getUnitFunctionMode(selectedLanguage, currentUnit.id)
  }, [activeProblemBase, currentUnit, selectedLanguage])

  const syncStruggle = useCallback((nextState: StruggleEngineState) => {
    struggleStateRef.current = nextState
    setStruggleNudge((previous) => {
      const next = {
        level: nextState.level,
        visible: nextState.nudgeVisible && nextState.level > 0,
      }
      if (previous.level === next.level && previous.visible === next.visible) {
        return previous
      }
      return next
    })
  }, [])

  const queueLiveCodeSnapshot = useCallback((nextCode: string, immediate = false) => {
    liveCodeRef.current = nextCode

    if (liveCodeDebounceRef.current !== null) {
      window.clearTimeout(liveCodeDebounceRef.current)
      liveCodeDebounceRef.current = null
    }

    if (immediate) {
      setLiveCodeSnapshot(nextCode)
      return
    }

    liveCodeDebounceRef.current = window.setTimeout(() => {
      setLiveCodeSnapshot(liveCodeRef.current)
      liveCodeDebounceRef.current = null
    }, 200)
  }, [])

  const ingestStruggleEvent = useCallback(
    (event: StruggleEvent) => {
      const nextState = struggleEngineRef.current?.ingest(event)
      if (!nextState) {
        return
      }
      syncStruggle(nextState)
      if (import.meta.env.DEV) {
        const shouldLog =
          event.type === 'RUN_RESULT' ||
          event.type === 'SUBMIT_RESULT' ||
          event.type === 'CHAT_ASSIST_USED' ||
          event.type === 'DISMISS_NUDGE'
        if (shouldLog) {
          console.debug('[struggle-engine]', event.type, {
            level: nextState.level,
            score: nextState.score,
            visible: nextState.nudgeVisible,
            failStreak: nextState.runFailStreak,
            reason: nextState.reason,
          })
        }
      }
    },
    [syncStruggle],
  )

  const ingestRunOutcome = useCallback(
    (mode: 'run' | 'submit', passed: boolean, errorType: string | null) => {
      ingestStruggleEvent({
        type: mode === 'submit' ? 'SUBMIT_RESULT' : 'RUN_RESULT',
        passed,
        errorType,
      })
    },
    [ingestStruggleEvent],
  )

  const getStruggleContextSummary = useCallback((): StruggleContextSummary => {
    return struggleEngineRef.current?.getContextSummary() ?? {
      level: 0,
      runFailStreak: 0,
      timeStuckSeconds: 0,
      lastErrorType: null,
    }
  }, [])
  const getLiveCodeSnapshot = useCallback(() => {
    return liveCodeRef.current
  }, [])

  useEffect(() => {
    if (!currentUnit) {
      return
    }

    const nextCode = draftByUnitId[currentUnit.id] ?? currentDefaultCode
    previousCodeRef.current = nextCode
    queueLiveCodeSnapshot(nextCode, true)
    const resetState = struggleEngineRef.current?.reset()
    if (resetState) {
      syncStruggle(resetState)
    }
  }, [
    activeProblem?.id,
    currentDefaultCode,
    currentUnit?.id,
    queueLiveCodeSnapshot,
    sessionLanguage,
    syncStruggle,
  ])

  useEffect(() => {
    const timer = window.setInterval(() => {
      ingestStruggleEvent({ type: 'TICK' })
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [ingestStruggleEvent])

  const failingSummary = useMemo(
    () => buildFailingSummary(testResultsByIndex),
    [testResultsByIndex],
  )

  useEffect(() => {
    if (!currentUnit || activeProblem) {
      return
    }

    savePebbleCurriculumProgress({
      selectedLanguage,
      selectedLevel,
      currentUnitId: currentUnit.id,
      recentChatSummary,
      completedUnitIds,
    })
  }, [activeProblem, completedUnitIds, currentUnit, recentChatSummary, selectedLanguage, selectedLevel])

  const onCodeChange = useCallback((value: string) => {
    if (!currentUnit) {
      return
    }

    const previousCode = previousCodeRef.current
    previousCodeRef.current = value

    const addedChars = Math.max(0, value.length - previousCode.length)
    const removedChars = Math.max(0, previousCode.length - value.length)
    const isDeletionHeavy = removedChars >= Math.max(2, addedChars + 2)

    queueLiveCodeSnapshot(value)
    if (addedChars > 0 || removedChars > 0) {
      ingestStruggleEvent({
        type: 'EDITOR_CHANGE',
        addedChars,
        removedChars,
        isDeletionHeavy,
      })
    }

    setDraftByUnitId((prev) => ({
      ...prev,
      [currentUnit.id]: value,
    }))
    setSubmitAccepted(false)
  }, [currentUnit, ingestStruggleEvent, queueLiveCodeSnapshot])

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

    const result: RunResponse = await requestRunApi({
      language: runtimeLanguage,
      code: currentCode,
      stdin: test.input,
      timeoutMs: 4000,
    })
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
    setRunMessage(
      t('run.runningAll', {
        mode: mode === 'submit' ? t('run.modeSubmitting') : t('run.modeRunning'),
        count: currentUnit.tests.length,
      }),
    )
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    if (mode === 'run') {
      setSubmitAccepted(false)
    }

    try {
      let nextResults: Record<number, UnitTestResultItem> = {}
      let durationTotal = 0

      if (isSqlMode && activeProblem?.kind === 'sql' && activeProblem.sqlMeta) {
        const checkerMessages: Record<string, string> = {
          missing_select: t('sql.checker.missingSelect'),
          missing_columns: t('sql.checker.missingColumns'),
          missing_from_person: t('sql.checker.missingFromPerson'),
          missing_left_join: t('sql.checker.missingLeftJoin'),
          missing_join_condition: t('sql.checker.missingJoinCondition'),
          missing_distinct: t('sql.checker.missingDistinct'),
          missing_department: t('sql.checker.missingDepartment'),
          missing_query_shape: t('sql.checker.missingQueryShape'),
        }
        const issues = getSqlCheckerFailures(activeProblem, currentCode)
        const passed = issues.length === 0
        const preview = formatSqlPreviewTable(activeProblem.sqlMeta.expectedResult)
        const stderrText = passed
          ? ''
          : issues
            .map((issue) => checkerMessages[issue] ?? issue)
            .join(' ')
        durationTotal = 36 + Math.min(120, Math.floor(currentCode.length / 16))

        nextResults = Object.fromEntries(
          currentUnit.tests.map((test, index) => [index, {
            input: test.input,
            expected: test.expected,
            actual: passed ? preview : '',
            stderr: stderrText,
            passed,
            timedOut: false,
            durationMs: durationTotal,
            exitCode: passed ? 0 : 1,
          }]),
        )
        setTestResultsByIndex(nextResults)
      } else if (currentFunctionConfig?.evalMode === 'function') {
        const parsedCases = currentUnit.tests.map((test) => currentFunctionConfig.parseTestCase(test))
        if (parsedCases.some((test) => test === null)) {
          nextResults = Object.fromEntries(
            currentUnit.tests.map((test, index) => [index, {
              input: test.input,
              expected: test.expected,
              actual: '',
              stderr: t('run.parseFunctionCasesFailed'),
              passed: false,
              timedOut: false,
              durationMs: 0,
              exitCode: null,
            }]),
          )
          setTestResultsByIndex(nextResults)
          setRunStatus('error')
          setRunMessage(t('run.prepareFunctionCasesFailed'))
          setSubmitAccepted(false)
          const errorType = classifyErrorType({
            passed: false,
            stderr: t('run.prepareFunctionCasesFailed'),
            exitCode: null,
          })
          if (mode === 'run') {
            logRunEvent({
              unitId: currentUnit.id,
              trackId,
              language: selectedLanguage,
              passed: false,
              passCount: 0,
              total: currentUnit.tests.length,
              runtimeMs: 0,
              exitCode: null,
              errorType,
            })
          } else {
            logSubmitEvent({
              unitId: currentUnit.id,
              trackId,
              language: selectedLanguage,
              accepted: false,
              passCount: 0,
              total: currentUnit.tests.length,
              runtimeMs: 0,
              exitCode: null,
              errorType,
            })
          }
          ingestRunOutcome(mode, false, errorType ?? null)
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
            setRunMessage(t('run.functionModeUnavailable', { language: selectedLanguage }))
            setSubmitAccepted(false)
            const errorType = classifyErrorType({
              passed: false,
              stderr: t('run.functionModeUnavailable', { language: selectedLanguage }),
              exitCode: null,
            })
            if (mode === 'run') {
              logRunEvent({
                unitId: currentUnit.id,
                trackId,
                language: selectedLanguage,
                passed: false,
                passCount: 0,
                total: currentUnit.tests.length,
                runtimeMs: 0,
                exitCode: null,
                errorType,
              })
            } else {
              logSubmitEvent({
                unitId: currentUnit.id,
                trackId,
                language: selectedLanguage,
                accepted: false,
                passCount: 0,
                total: currentUnit.tests.length,
                runtimeMs: 0,
                exitCode: null,
                errorType,
              })
            }
            ingestRunOutcome(mode, false, errorType ?? null)
            return
          }

          const runResult: RunResponse = await requestRunApi({
            language: runtimeLanguage,
            code: runnableCode,
            stdin: '',
            timeoutMs: 4000,
          })
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

            const runResult: RunResponse = await requestRunApi({
              language: runtimeLanguage,
              code: runnableCode,
              stdin: '',
              timeoutMs: 4000,
            })
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
      const firstFailed = Object.values(nextResults).find((item) => !item.passed)
      const derivedErrorType = classifyErrorType({
        passed: allPassed,
        timedOut: firstFailed?.timedOut ?? false,
        stderr: firstFailed?.stderr ?? '',
        exitCode: firstFailed?.exitCode ?? runExitCode,
      })
      ingestRunOutcome(mode, allPassed, derivedErrorType ?? null)

      if (mode === 'run') {
        logRunEvent({
          unitId: currentUnit.id,
          trackId,
          language: selectedLanguage,
          passed: allPassed,
          passCount: passedCount,
          total: currentUnit.tests.length,
          runtimeMs: durationTotal,
          exitCode: runExitCode,
          errorType: derivedErrorType,
        })
      } else {
        logSubmitEvent({
          unitId: currentUnit.id,
          trackId,
          language: selectedLanguage,
          accepted: allPassed,
          passCount: passedCount,
          total: currentUnit.tests.length,
          runtimeMs: durationTotal,
          exitCode: runExitCode,
          errorType: derivedErrorType,
        })
      }

      if (allPassed) {
        setRunStatus('success')
        setRunMessage(
          isSqlMode
            ? `${t('sql.checker.pass')} • ${t('run.passedSummary', {
              passed: passedCount,
              total: currentUnit.tests.length,
              duration: durationTotal,
            })}`
            : t('run.passedSummary', {
              passed: passedCount,
              total: currentUnit.tests.length,
              duration: durationTotal,
            }),
        )
        if (!activeProblem) {
          setUnitProgress((prev) => markUnitCompleted(prev, currentUnit.id, durationTotal))
        }
        if (activeProblem) {
          markProblemAttempt(activeProblem.id, mode === 'submit')
        }

        if (mode === 'submit') {
          setSubmitAccepted(true)
        }
      } else {
        const firstFailedEntry = Object.entries(nextResults)
          .map(([index, result]) => ({ index: Number(index), result }))
          .find(({ result }) => !result.passed)

        const runnerError = firstFailedEntry?.result.stderr.trim()
        const runnerErrorSnippet = runnerError
          ? runnerError.replace(/\s+/g, ' ').slice(0, 140)
          : ''
        const failPreview = firstFailedEntry
          ? runnerErrorSnippet
            ? t('run.runnerErrorPreview', {
              index: firstFailedEntry.index + 1,
              message: runnerErrorSnippet,
            })
            : t('run.failedPreview', {
              index: firstFailedEntry.index + 1,
              expected: firstFailedEntry.result.expected,
              actual: normalizeOutput(firstFailedEntry.result.actual) || t('common.empty'),
            })
          : t('run.someTestsFailed')

        setRunStatus('error')
        setRunMessage(
          t('run.failedSummary', {
            passed: passedCount,
            total: currentUnit.tests.length,
            duration: durationTotal,
            preview: failPreview,
          }),
        )
        if (mode === 'submit') {
          setSubmitAccepted(false)
        }
        if (activeProblem) {
          markProblemAttempt(activeProblem.id, false)
        }
      }

      if (mode === 'submit') {
        setSubmissionsByUnit((prev) =>
          appendSubmission(prev, {
            unitId: currentUnit.id,
            status: allPassed ? 'accepted' : 'failed',
            language: sessionLanguage,
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
  }, [
    activeProblem,
    currentCode,
    currentFunctionConfig,
    currentUnit,
    executeTest,
    ingestRunOutcome,
    isRunningAll,
    isSqlMode,
    runtimeLanguage,
    selectedLanguage,
    t,
    trackId,
  ])

  function selectUnit(index: number) {
    setCurrentUnitIndex(index)
    setSelectedTestIndex(0)
    setRunStatus('idle')
    setRunMessage(t('run.evaluateAll'))
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

    const confirmed = window.confirm(t('confirm.resetEditor'))
    if (!confirmed) {
      return
    }

    const resetCode = activeProblem
      ? activeProblemStarter
      : currentFunctionConfig?.starterStub ?? currentUnit.starterCode

    previousCodeRef.current = resetCode
    queueLiveCodeSnapshot(resetCode, true)
    setDraftByUnitId((prev) => ({
      ...prev,
      [currentUnit.id]: resetCode,
    }))
    setRunStatus('idle')
    setRunMessage(t('run.editorReset'))
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    setSubmitAccepted(false)
  }

  const handleAssistAction = useCallback((action: StruggleAssistAction) => {
    if (!currentUnit) {
      return
    }
    logAssistEvent({
      unitId: currentUnit.id,
      trackId,
      language: selectedLanguage,
      action,
    })
    ingestStruggleEvent({
      type: 'CHAT_ASSIST_USED',
      action,
    })
  }, [currentUnit, ingestStruggleEvent, selectedLanguage, trackId])

  const handleStruggleDismiss = useCallback(() => {
    ingestStruggleEvent({ type: 'DISMISS_NUDGE' })
  }, [ingestStruggleEvent])

  if (isLoading) {
    return (
      <section className="h-[100vh] overflow-hidden bg-pebble-deep p-3">
        <Card className="space-y-2" padding="md" interactive>
          <p className="text-sm font-medium text-pebble-text-primary">{t('loading.curriculum')}</p>
          <p className="text-sm text-pebble-text-secondary">
            {t('loading.preparePath', { language: languageMeta.label })}
          </p>
        </Card>
      </section>
    )
  }

  if (loadError || !currentUnit) {
    return (
      <section className="h-[100vh] overflow-hidden bg-pebble-deep p-3">
        <Card className="space-y-2" padding="md" interactive>
          <p className="text-sm font-medium text-pebble-warning">{t('error.loadSession')}</p>
          <p className="text-sm text-pebble-text-secondary">{loadError || t('error.noUnits')}</p>
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
  const levelLabelMap: Record<PlacementLevel, string> = {
    beginner: t('level.beginner'),
    intermediate: t('level.intermediate'),
    pro: t('level.pro'),
  }
  const levelLabel = levelLabelMap[selectedLevel]
  const statusLabelMap: Record<typeof runStatus, string> = {
    idle: t('status.idle'),
    running: t('status.running'),
    success: t('status.success'),
    error: t('status.error'),
  }
  const summaryLabel = format.formatTestsSummary({
    passed: passedCount,
    total: currentUnit.tests.length,
    runCount: completedCount,
    durationMs: totalDurationMs,
    exitCode: typeof lastExitCode === 'number' ? lastExitCode : null,
  })
  const currentUnitSubmissions = submissionsByUnit[currentUnit.id] ?? []
  const sqlPreviewTable = isSqlMode && activeProblem?.sqlMeta ? activeProblem.sqlMeta.expectedResult : null

  const constraints = currentFunctionConfig?.evalMode === 'function'
    ? [
      t('constraints.functionMode.1'),
      t('constraints.functionMode.2'),
      t('constraints.functionMode.3', { count: currentUnit.tests.length }),
    ]
    : [
      t('constraints.scriptMode.1'),
      t('constraints.scriptMode.2'),
      t('constraints.scriptMode.3', { count: currentUnit.tests.length }),
    ]
  const resolvedConstraints = activeProblem?.statement.constraints ?? constraints
  const curriculumDifficulty = resolveCurriculumDifficulty(selectedLevel, currentUnit.id)
  const sessionDifficulty = activeProblem?.difficulty ?? curriculumDifficulty
  const sessionDifficultyLabel = sessionDifficulty === 'Easy'
    ? t('difficulty.easy')
    : sessionDifficulty === 'Medium'
      ? t('difficulty.medium')
      : t('difficulty.hard')
  const minuteSuffix = t('problem.minuteSuffix')
  const sessionTags = activeProblem
    ? [
      ...activeProblem.topics.slice(0, 2).map((chip) => localizeProblemChip(chip, uiLanguage, t)),
      `${getProblemTimeEstimateMinutes(activeProblem)} ${minuteSuffix}`,
    ]
    : currentUnit.id === 'hello-world'
      ? [languageMeta.label, 'stdout basics', t('tags.practice')]
      : [languageMeta.label, t('tags.practice'), t('tags.runtimeVerified')]

  return (
    <section className={`session-shell h-[100vh] overflow-hidden ${pagePrefs.compactDensity ? 'text-[13px]' : ''}`}>
      <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2.5 border-b border-pebble-border/25 bg-pebble-overlay/[0.04] px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/"
            aria-label={t('nav.home')}
            title={t('nav.home')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.09] text-pebble-text-primary transition hover:-translate-y-[1px] hover:bg-pebble-overlay/[0.15] active:bg-pebble-overlay/[0.2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/55"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </Link>

          <span className="hidden rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.08] px-2 py-1 text-xs text-pebble-text-secondary md:inline-flex">
            {languageMeta.label} • {levelLabel}
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2">
          <button
            type="button"
            onClick={moveToPreviousUnit}
            disabled={!previousEnabled}
            title={t('topBar.prevUnit')}
            aria-label={t('a11y.prevUnit')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] text-pebble-text-primary transition hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.16] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="max-w-[420px] truncate px-1 text-sm font-semibold text-pebble-text-primary">
            {activeProblem?.title ?? currentUnitCopy?.title ?? currentUnit.title}
          </p>
          <button
            type="button"
            onClick={moveToNextUnit}
            disabled={!nextEnabled}
            title={t('topBar.nextUnit')}
            aria-label={t('a11y.nextUnit')}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-pebble-overlay/[0.08] text-pebble-text-primary transition hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.16] disabled:cursor-not-allowed disabled:opacity-45 ${allTestsPassed && nextEnabled
                ? 'border-pebble-success/45 shadow-[0_0_0_1px_rgba(74,222,128,0.28),0_0_16px_rgba(74,222,128,0.22)]'
                : 'border-pebble-border/30'
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
            title={t('topBar.pageSettings')}
            aria-label={t('a11y.openPageSettings')}
            onClick={() => setPageSettingsOpen(true)}
            className="h-8 w-8 rounded-full border-pebble-border/30 bg-pebble-overlay/[0.08] p-0 text-pebble-text-primary hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.16]"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('a11y.openUnits')}
            className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.08] px-3 py-1.5 text-sm text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16]"
          >
            ☰ {t('topBar.units')}
          </button>

          <StreakPill
            streak={currentStreak.streak}
            isTodayComplete={currentStreak.isTodayComplete}
            compact
          />

          <Badge variant={statusVariant(runStatus)}>{statusLabelMap[runStatus]}</Badge>
        </div>
      </header>

      <main className="h-[calc(100vh-64px)] overflow-hidden p-2.5">
        <div className="grid h-full min-h-0 grid-cols-[clamp(380px,24vw,420px)_minmax(0,1fr)_clamp(360px,24vw,400px)] gap-2.5">
          <ProblemStatementPanel
            unitId={currentUnit.id}
            title={activeProblem?.title ?? currentUnitCopy?.title ?? currentUnit.title}
            concept={activeProblem?.topics[0] ?? currentUnitCopy?.concept ?? currentUnit.concept}
            prompt={activeProblem?.statement.summary ?? currentUnitCopy?.prompt ?? currentUnit.prompt}
            description={activeProblem?.statement.description ?? currentUnitCopy?.description}
            constraints={resolvedConstraints}
            tests={currentUnit.tests}
            examples={activeProblem?.statement.examples}
            inputText={activeProblem?.statement.input}
            outputText={activeProblem?.statement.output}
            difficulty={sessionDifficulty}
            difficultyLabel={sessionDifficultyLabel}
            tags={sessionTags}
            language={sessionLanguage}
            functionMode={currentFunctionConfig?.evalMode === 'function'}
            submissions={currentUnitSubmissions}
            sqlSchema={activeProblem?.sqlMeta?.tables}
            sqlSchemaText={activeProblem?.statement.schemaText}
            className="min-h-0"
          />

          <div
            className="grid min-h-0 gap-2.5"
            style={{
              gridTemplateRows: 'minmax(0,1fr) clamp(280px,33vh,360px)',
            }}
          >
            <section className="session-panel flex min-h-0 flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-pebble-border/25 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.08em] text-pebble-text-muted">{t('editor.code')}</p>
                  <p className="truncate text-sm font-medium text-pebble-text-primary">
                    {activeProblem?.title ?? currentUnitCopy?.title ?? currentUnit.title}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs text-pebble-text-primary">
                    {SESSION_RUNTIME_LABEL[sessionLanguage]}
                  </span>
                  {currentFunctionConfig?.evalMode === 'function' && (
                    <span className="rounded-full border border-pebble-accent/35 bg-pebble-accent/12 px-2.5 py-1 text-xs text-pebble-accent">
                      {t('editor.functionMode')}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    title={t('editor.resetCode')}
                    onClick={handleResetCode}
                    className="h-9 w-9 rounded-xl border-pebble-border/35 bg-pebble-overlay/[0.09] p-0 text-pebble-text-primary hover:border-pebble-border/50 hover:bg-pebble-overlay/[0.16]"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    title={t('topBar.sessionSettings')}
                    aria-label={t('a11y.openSessionSettings')}
                    onClick={() => setSessionSettingsOpen(true)}
                    className="h-9 w-9 rounded-xl border-pebble-border/35 bg-pebble-overlay/[0.09] p-0 text-pebble-text-primary hover:border-pebble-border/50 hover:bg-pebble-overlay/[0.16]"
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
                    {isRunningAll && activeAction === 'run' ? t('actions.running') : t('actions.run')}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void runAllTests('submit')}
                    disabled={isRunningAll}
                    className={submitAccepted ? '!border-pebble-success/45 !bg-pebble-success/18 !text-pebble-success' : ''}
                  >
                    {isRunningAll && activeAction === 'submit'
                      ? t('actions.submitting')
                      : submitAccepted
                        ? t('actions.accepted')
                        : t('actions.submit')}
                  </Button>
                </div>
              </div>

              <div dir="ltr" className="ltrSafe min-h-0 flex-1">
                <Editor
                  height="100%"
                  language={SESSION_MONACO_LANGUAGE[sessionLanguage]}
                  theme={theme === 'light' ? 'vs' : 'vs-dark'}
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
                <p className="border-t border-pebble-border/25 px-3 py-1.5 text-xs text-pebble-text-secondary">
                  {t('editor.functionModeHint')}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-pebble-border/25 px-3 py-2 text-xs text-pebble-text-secondary">
                <p className="truncate">{runMessage}</p>
                {currentIsCompleted ? (
                  <span className="rounded-full border border-pebble-success/35 bg-pebble-success/15 px-2 py-0.5 text-[11px] text-pebble-success">
                    {t('editor.completed')}
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
              sqlPreview={sqlPreviewTable}
              className="min-h-0"
            />
          </div>

          <PebbleChatPanel
            unitId={currentUnit.id}
            problemId={activeProblem?.id ?? null}
            unitTitle={activeProblem?.title ?? currentUnitCopy?.title ?? currentUnit.title}
            unitConcept={activeProblem?.topics[0] ?? currentUnitCopy?.concept ?? currentUnit.concept}
            language={sessionLanguage}
            liveCode={liveCodeSnapshot}
            getLiveCode={getLiveCodeSnapshot}
            runStatus={runStatus}
            runMessage={runMessage}
            failingSummary={failingSummary}
            initialSummary={recentChatSummary}
            onSummaryChange={setRecentChatSummary}
            struggleLevel={struggleNudge.level}
            showStruggleNudge={struggleNudge.visible}
            getStruggleContext={getStruggleContextSummary}
            onAssistAction={handleAssistAction}
            onStruggleDismiss={handleStruggleDismiss}
            className="h-full min-h-0"
          />
        </div>
      </main>

      <UnitsDrawer
        open={drawerOpen}
        units={localizedUnits.map(({ unit, copy }) => ({
          id: unit.id,
          title: copy.title,
          concept: copy.concept,
        }))}
        currentUnitIndex={currentUnitIndex}
        completedUnitIds={completedUnitIds}
        onClose={() => setDrawerOpen(false)}
        onSelectUnit={selectUnit}
      />

      {pageSettingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-pebble-border/35 bg-pebble-panel/95 p-4 shadow-[0_20px_60px_rgba(2,8,23,0.32)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-pebble-text-primary">{t('settings.pageTitle')}</h2>
              <button
                type="button"
                onClick={() => setPageSettingsOpen(false)}
                className="rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2 py-1 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16]"
              >
                {t('actions.close')}
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-pebble-text-secondary">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">{t('settings.theme')}</span>
                <div
                  role="tablist"
                  aria-label={t('settings.theme')}
                  className="grid grid-cols-2 gap-2 rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-1"
                >
                  {(['dark', 'light'] as const).map((mode) => {
                    const selected = theme === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-pressed={selected}
                        onClick={() => setTheme(mode)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/50 ${selected
                            ? 'border border-pebble-accent/50 bg-pebble-accent/18 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                            : 'border border-transparent text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]'
                          }`}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                        {mode === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="flex items-center justify-between gap-3">
                <span>{t('settings.reduceMotion')}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPagePrefs((prev) => ({ ...prev, reduceMotion: !prev.reduceMotion }))
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${pagePrefs.reduceMotion
                      ? 'border-pebble-accent/45 bg-pebble-accent/18 text-pebble-text-primary'
                      : 'border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-secondary hover:bg-pebble-overlay/[0.16]'
                    }`}
                >
                  {pagePrefs.reduceMotion ? t('actions.on') : t('actions.off')}
                </button>
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>{t('settings.density')}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPagePrefs((prev) => ({ ...prev, compactDensity: !prev.compactDensity }))
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${pagePrefs.compactDensity
                      ? 'border-pebble-accent/45 bg-pebble-accent/18 text-pebble-text-primary'
                      : 'border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-secondary hover:bg-pebble-overlay/[0.16]'
                    }`}
                >
                  {pagePrefs.compactDensity ? t('settings.densityCompact') : t('settings.densityComfortable')}
                </button>
              </label>
            </div>
          </div>
        </div>
      )}

      {sessionSettingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-pebble-border/35 bg-pebble-panel/95 p-4 shadow-[0_20px_60px_rgba(2,8,23,0.32)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-pebble-text-primary">{t('settings.sessionTitle')}</h2>
              <button
                type="button"
                onClick={() => setSessionSettingsOpen(false)}
                className="rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2 py-1 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16]"
              >
                {t('actions.close')}
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-pebble-text-secondary">
              <label className="flex items-center justify-between gap-3">
                <span>{t('settings.fontSize')}</span>
                <input
                  type="range"
                  min={14}
                  max={18}
                  step={1}
                  value={editorFontSize}
                  onChange={(event) => setEditorFontSize(Number(event.target.value))}
                  className="w-40 accent-blue-500"
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>{t('settings.wordWrap')}</span>
                <button
                  type="button"
                  onClick={() => setWordWrapEnabled((prev) => !prev)}
                  className="rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16]"
                >
                  {wordWrapEnabled ? t('actions.on') : t('actions.off')}
                </button>
              </label>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
