import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { McqQuestionCard } from '../components/placement/McqQuestionCard'
import {
  CodingQuestionCard,
  type CodingTestResult,
} from '../components/placement/CodingQuestionCard'
import {
  getLanguageMetadata,
  isPlacementLanguage,
  isPlacementLevel,
  scoreToStartUnit,
  type PlacementLanguage,
  type PlacementLevel,
} from '../data/onboardingData'
import {
  buildWeeklyPlacementSet,
  type PlacementCodingQuestion,
  type PlacementMcqQuestion,
} from '../data/placementBank'
import { savePebblePlacement } from '../utils/pebbleUserState'
import { useBodyScrollLock } from '../utils/useBodyScrollLock'

type RunResponse = {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

type CodingRunState = {
  code: string
  running: boolean
  results: CodingTestResult[]
}

type PlacementFlowQuestion =
  | { kind: 'mcq'; question: PlacementMcqQuestion }
  | { kind: 'coding'; question: PlacementCodingQuestion }

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

function buildQuestionFlow(mcq: PlacementMcqQuestion[], coding: PlacementCodingQuestion[]): PlacementFlowQuestion[] {
  const sequence: PlacementFlowQuestion[] = []

  if (mcq[0]) sequence.push({ kind: 'mcq', question: mcq[0] })
  if (coding[0]) sequence.push({ kind: 'coding', question: coding[0] })
  if (mcq[1]) sequence.push({ kind: 'mcq', question: mcq[1] })
  if (mcq[2]) sequence.push({ kind: 'mcq', question: mcq[2] })
  if (coding[1]) sequence.push({ kind: 'coding', question: coding[1] })
  if (mcq[3]) sequence.push({ kind: 'mcq', question: mcq[3] })
  if (coding[2]) sequence.push({ kind: 'coding', question: coding[2] })

  return sequence
}

function getCodingRunStateLabel(state: CodingRunState | undefined): 'not run' | 'running' | 'pass' | 'fail' {
  if (state?.running) {
    return 'running'
  }
  if (!state || state.results.length === 0) {
    return 'not run'
  }

  const passedCount = state.results.filter((result) => result.passed).length
  return passedCount === state.results.length ? 'pass' : 'fail'
}

export function PlacementPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  useBodyScrollLock(true)

  const langParam = searchParams.get('lang')
  const levelParam = searchParams.get('level')

  const language: PlacementLanguage = isPlacementLanguage(langParam) ? langParam : 'python'
  const level: PlacementLevel = isPlacementLevel(levelParam) ? levelParam : 'beginner'

  const metadata = useMemo(() => getLanguageMetadata(language), [language])
  const weeklySet = useMemo(() => buildWeeklyPlacementSet(language, level), [language, level])
  const questionFlow = useMemo(
    () => buildQuestionFlow(weeklySet.mcq, weeklySet.coding),
    [weeklySet.coding, weeklySet.mcq],
  )

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({})
  const [codingState, setCodingState] = useState<Record<string, CodingRunState>>({})

  useEffect(() => {
    const nextCoding: Record<string, CodingRunState> = {}
    for (const question of weeklySet.coding) {
      nextCoding[question.id] = {
        code: question.starterCode,
        running: false,
        results: [],
      }
    }

    setCurrentQuestionIndex(0)
    setMcqAnswers({})
    setCodingState(nextCoding)
  }, [weeklySet])

  const currentQuestion = questionFlow[currentQuestionIndex]
  const totalQuestions = questionFlow.length
  const progressPercent = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0

  function isAnswered(question: PlacementFlowQuestion) {
    if (question.kind === 'mcq') {
      return typeof mcqAnswers[question.question.id] === 'number'
    }
    const state = codingState[question.question.id]
    return Boolean(state && !state.running && state.results.length > 0)
  }

  const canGoBack = currentQuestionIndex > 0
  const canGoNext = Boolean(currentQuestion && isAnswered(currentQuestion) && currentQuestionIndex < totalQuestions - 1)
  const canFinish = Boolean(currentQuestion && isAnswered(currentQuestion) && currentQuestionIndex === totalQuestions - 1)

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
          const runtimeLanguage = language === 'c' ? 'cpp' : language
          const response = await fetch('/api/run', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              language: runtimeLanguage,
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

    return {
      score: total,
      startUnit,
      answerTrace: [
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
      ],
      questionIds: [
        ...weeklySet.mcq.map((question) => question.id),
        ...weeklySet.coding.map((question) => question.id),
      ],
    }
  }

  function finishPlacement() {
    const nextResult = computeScore()

    const startUnitIndex =
      nextResult.startUnit === 'advanced' ? 7 : nextResult.startUnit === 'mid' ? 4 : 1

    savePebblePlacement({
      language,
      level,
      score: nextResult.score,
      startUnit: nextResult.startUnit,
      startUnitIndex,
      answers: nextResult.answerTrace,
      weekBucket: weeklySet.weekBucket,
      questionIds: nextResult.questionIds,
    })

    navigate(`/session/1?lang=${language}&level=${level}&unit=${nextResult.startUnit}`)
  }

  return (
    <section className="h-[100vh] overflow-hidden p-3">
      <Card padding="md" className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col space-y-4" interactive>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge>Placement</Badge>
            <span className="rounded-full border border-pebble-border/35 px-2.5 py-1 text-xs text-pebble-text-muted">
              Level: {level}
            </span>
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-4xl">
            {metadata.label} placement assessment
          </h1>
          <p className="text-sm text-pebble-text-secondary sm:text-base">
            Question {Math.min(currentQuestionIndex + 1, totalQuestions)} / {totalQuestions}
          </p>
          <div className="h-2 overflow-hidden rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pebble-accent/85 to-sky-300/75 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <Divider />

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {currentQuestion ? (
            currentQuestion.kind === 'mcq' ? (
              <McqQuestionCard
                question={currentQuestion.question}
                questionNumber={currentQuestionIndex + 1}
                selectedIndex={mcqAnswers[currentQuestion.question.id] ?? null}
                onSelect={(optionIndex) => {
                  setMcqAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.question.id]: optionIndex,
                  }))
                }}
              />
            ) : (
              <CodingQuestionCard
                question={currentQuestion.question}
                questionNumber={currentQuestionIndex + 1}
                language={language}
                code={codingState[currentQuestion.question.id]?.code ?? currentQuestion.question.starterCode}
                isRunning={codingState[currentQuestion.question.id]?.running === true}
                runState={getCodingRunStateLabel(codingState[currentQuestion.question.id])}
                results={codingState[currentQuestion.question.id]?.results ?? []}
                onCodeChange={(code) => updateCode(currentQuestion.question.id, code)}
                onRun={() => void runCodingQuestion(currentQuestion.question)}
              />
            )
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pebble-border/24 pt-3">
          <Button
            variant="secondary"
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={!canGoBack}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            {!canFinish && (
              <Button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                disabled={!canGoNext}
              >
                Next
              </Button>
            )}
            {canFinish && (
              <Button onClick={finishPlacement}>
                Finish
              </Button>
            )}
          </div>
        </div>
      </Card>
    </section>
  )
}
