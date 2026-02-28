import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { buttonClass } from '../components/ui/buttonStyles'
import { IDE_MONACO_LANGUAGE } from '../components/ide/runtimeLanguages'
import {
  getLanguageMetadata,
  isPlacementLanguage,
  isPlacementLevel,
  scoreToStartUnit,
  type PlacementLanguage,
  type PlacementLevel,
  type StartUnit,
} from '../data/onboardingData'
import {
  buildWeeklyPlacementSet,
  type PlacementCodingQuestion,
} from '../data/placementBank'
import { savePebblePlacement } from '../utils/pebbleUserState'

type RunResponse = {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

type CodingTestResult = {
  stdin: string
  expected: string
  actual: string
  stderr: string
  passed: boolean
  timedOut: boolean
}

type CodingRunState = {
  code: string
  running: boolean
  results: CodingTestResult[]
}

type PlacementResult = {
  score: number
  mcqPoints: number
  codingPoints: number
  startUnit: StartUnit
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

function answerClass(isSelected: boolean) {
  return `w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
    isSelected
      ? 'border-pebble-accent/45 bg-pebble-accent/14 text-pebble-text-primary'
      : 'border-pebble-border/30 bg-pebble-overlay/[0.05] text-pebble-text-secondary hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.1] hover:text-pebble-text-primary'
  }`
}

export function PlacementPage() {
  const [searchParams] = useSearchParams()
  const langParam = searchParams.get('lang')
  const levelParam = searchParams.get('level')

  const language: PlacementLanguage = isPlacementLanguage(langParam) ? langParam : 'python'
  const level: PlacementLevel = isPlacementLevel(levelParam) ? levelParam : 'beginner'

  const metadata = useMemo(() => getLanguageMetadata(language), [language])
  const weeklySet = useMemo(() => buildWeeklyPlacementSet(language, level), [language, level])

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({})
  const [codingState, setCodingState] = useState<Record<string, CodingRunState>>({})
  const [result, setResult] = useState<PlacementResult | null>(null)

  useEffect(() => {
    const nextCoding: Record<string, CodingRunState> = {}
    for (const question of weeklySet.coding) {
      nextCoding[question.id] = {
        code: question.starterCode,
        running: false,
        results: [],
      }
    }

    setMcqAnswers({})
    setCodingState(nextCoding)
    setResult(null)
  }, [weeklySet])

  const answeredMcqCount = weeklySet.mcq.reduce((count, question) => {
    return typeof mcqAnswers[question.id] === 'number' ? count + 1 : count
  }, 0)

  const hasRunAllCoding = weeklySet.coding.every((question) => {
    const state = codingState[question.id]
    return Boolean(state && state.results.length > 0)
  })

  const canSubmit = answeredMcqCount === weeklySet.mcq.length && hasRunAllCoding

  function updateCode(questionId: string, code: string) {
    setCodingState((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? { code: '', running: false, results: [] }),
        code,
      },
    }))
  }

  async function runCodingQuestion(question: PlacementCodingQuestion) {
    const current = codingState[question.id]
    if (!current || current.running) {
      return
    }

    setCodingState((prev) => ({
      ...prev,
      [question.id]: {
        ...prev[question.id],
        running: true,
      },
    }))

    const nextResults: CodingTestResult[] = []

    try {
      for (const test of question.tests) {
        let payload: unknown = null

        try {
          const response = await fetch('/api/run', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              language,
              code: current.code,
              stdin: test.stdin,
              timeoutMs: question.timeoutMs,
            }),
          })

          payload = await response.json().catch(() => null)
        } catch {
          payload = {
            ok: false,
            exitCode: null,
            stdout: '',
            stderr: 'Runner request failed.',
            timedOut: false,
            durationMs: 0,
          }
        }

        const normalized = normalizeRunResponse(payload)
        const expected = normalizeOutput(test.expected)
        const actual = normalizeOutput(normalized.stdout)
        const passed = normalized.ok && expected === actual

        nextResults.push({
          stdin: test.stdin,
          expected: test.expected,
          actual: normalized.stdout,
          stderr: normalized.stderr,
          passed,
          timedOut: normalized.timedOut,
        })
      }
    } finally {
      setCodingState((prev) => ({
        ...prev,
        [question.id]: {
          ...prev[question.id],
          running: false,
          results: nextResults,
        },
      }))
    }
  }

  function computeScore() {
    const mcqPoints = weeklySet.mcq.reduce((score, question) => {
      const selected = mcqAnswers[question.id]
      if (typeof selected !== 'number') {
        return score
      }
      return selected === question.correctIndex ? score + 1 : score
    }, 0)

    const codingPoints = weeklySet.coding.reduce((score, question) => {
      const state = codingState[question.id]
      if (!state || state.results.length === 0) {
        return score
      }

      const passedCount = state.results.filter((test) => test.passed).length
      if (passedCount === state.results.length) {
        return score + 2
      }
      if (passedCount > 0) {
        return score + 1
      }
      return score
    }, 0)

    const total = mcqPoints + codingPoints
    const startUnit = scoreToStartUnit(total)
    return { score: total, mcqPoints, codingPoints, startUnit }
  }

  function finalizePlacement() {
    if (!canSubmit) {
      return
    }

    const nextResult = computeScore()
    setResult(nextResult)

    const answerTrace = [
      ...weeklySet.mcq.map((question) => mcqAnswers[question.id] ?? -1),
      ...weeklySet.coding.map((question) => {
        const state = codingState[question.id]
        if (!state || state.results.length === 0) {
          return 0
        }
        const passedCount = state.results.filter((test) => test.passed).length
        if (passedCount === state.results.length) {
          return 2
        }
        return passedCount > 0 ? 1 : 0
      }),
    ]

    const questionIds = [
      ...weeklySet.mcq.map((question) => question.id),
      ...weeklySet.coding.map((question) => question.id),
    ]

    const startUnitIndex =
      nextResult.startUnit === 'advanced' ? 7 : nextResult.startUnit === 'mid' ? 4 : 1

    savePebblePlacement({
      language,
      level,
      score: nextResult.score,
      startUnit: nextResult.startUnit,
      startUnitIndex,
      answers: answerTrace,
      weekBucket: weeklySet.weekBucket,
      questionIds,
    })
  }

  return (
    <section className="page-enter mx-auto w-full max-w-6xl space-y-5">
      <Card padding="lg" className="space-y-5" interactive>
        <div className="space-y-2">
          <Badge>Placement</Badge>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-4xl">
            {metadata.label} placement set
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-pebble-text-secondary sm:text-base">
            This week you get 7 questions: 4 concept checks + 3 coding checks. Set refreshes weekly,
            but remains deterministic for your language and level profile.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-pebble-text-muted">
            <span className="rounded-full border border-pebble-border/35 px-2.5 py-1">Level: {level}</span>
            <span className="rounded-full border border-pebble-border/35 px-2.5 py-1">Week bucket: {weeklySet.weekBucket}</span>
          </div>
        </div>

        <Divider />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-pebble-text-primary">Part A — Multiple choice (4)</h2>
          {weeklySet.mcq.map((question, index) => (
            <Card key={question.id} padding="sm" className="bg-pebble-overlay/[0.05]" interactive>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-pebble-text-primary">{index + 1}. {question.prompt}</p>
                <Badge variant="neutral">{question.difficulty}</Badge>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={option}
                    type="button"
                    className={answerClass(mcqAnswers[question.id] === optionIndex)}
                    onClick={() => {
                      setMcqAnswers((prev) => ({
                        ...prev,
                        [question.id]: optionIndex,
                      }))
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-pebble-text-primary">Part B — Coding checks (3)</h2>
          {weeklySet.coding.map((question, index) => {
            const state = codingState[question.id]
            const passedCount = state?.results.filter((result) => result.passed).length ?? 0
            const totalTests = question.tests.length
            return (
              <Card key={question.id} padding="sm" className="bg-pebble-overlay/[0.05]" interactive>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-pebble-text-primary">
                    {index + 5}. {question.prompt}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{question.difficulty}</Badge>
                    <Badge variant={passedCount === totalTests && totalTests > 0 ? 'success' : passedCount > 0 ? 'warning' : 'neutral'}>
                      {state?.results.length ? `${passedCount}/${totalTests} tests` : 'not run'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-pebble-border/28 bg-pebble-canvas/92">
                  <Editor
                    height="220px"
                    language={IDE_MONACO_LANGUAGE[language]}
                    theme="vs-dark"
                    value={state?.code ?? question.starterCode}
                    onChange={(value) => updateCode(question.id, value ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineHeight: 21,
                      automaticLayout: true,
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-pebble-text-secondary">
                    Timeout: {question.timeoutMs}ms • Tests: {totalTests}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => void runCodingQuestion(question)}
                    disabled={state?.running === true}
                  >
                    {state?.running ? 'Running...' : 'Run'}
                  </Button>
                </div>

                {state?.results.length ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-pebble-border/25 bg-pebble-canvas/70 p-3">
                    {state.results.map((test, testIndex) => (
                      <div key={`${question.id}-test-${testIndex}`} className="rounded-lg border border-pebble-border/20 bg-pebble-overlay/[0.06] p-2">
                        <p className="text-xs font-medium text-pebble-text-primary">
                          Test {testIndex + 1}: {test.passed ? 'PASS' : 'FAIL'}
                        </p>
                        <p className="mt-1 text-[11px] text-pebble-text-secondary">stdin: {test.stdin || '(empty)'}</p>
                        <p className="text-[11px] text-pebble-text-secondary">expected: {normalizeOutput(test.expected) || '(empty)'}</p>
                        <p className="text-[11px] text-pebble-text-secondary">actual: {normalizeOutput(test.actual) || '(empty)'}</p>
                        {!!test.stderr && (
                          <p className="mt-1 text-[11px] text-pebble-warning">stderr: {test.stderr.slice(0, 180)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pebble-border/24 pt-4">
          <p className="text-sm text-pebble-text-secondary">
            Progress: {answeredMcqCount}/4 MCQ answered • {hasRunAllCoding ? 'coding checks run' : 'run all coding checks'}
          </p>
          <Button onClick={finalizePlacement} disabled={!canSubmit}>
            Finalize placement
          </Button>
        </div>

        {result && (
          <Card padding="md" className="border-pebble-accent/35 bg-pebble-accent/10" interactive>
            <p className="text-sm font-semibold text-pebble-text-primary">Score: {result.score}/10</p>
            <p className="mt-1 text-sm text-pebble-text-secondary">
              MCQ: {result.mcqPoints}/4 • Coding: {result.codingPoints}/6
            </p>
            <p className="mt-1 text-sm text-pebble-text-secondary">
              Suggested start unit: <span className="font-semibold text-pebble-text-primary">{result.startUnit}</span>
            </p>
            <div className="mt-4">
              <Link
                to={`/session/1?lang=${language}&level=${level}&unit=${result.startUnit}`}
                className={buttonClass('primary')}
              >
                Start learning
              </Link>
            </div>
          </Card>
        )}
      </Card>
    </section>
  )
}
