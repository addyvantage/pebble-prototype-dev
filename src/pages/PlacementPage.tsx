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
import { useI18n } from '../i18n/useI18n'
import { logPlacementSkipEvent } from '../lib/analyticsStore'
import { requestRunApi } from '../lib/runApi'
import { fromLegacyCodeLanguageId } from '../../shared/languageRegistry'

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
  const { t } = useI18n()
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
  const [skippedByQuestionId, setSkippedByQuestionId] = useState<Record<string, boolean>>({})

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
    setSkippedByQuestionId({})
  }, [weeklySet])

  const currentQuestion = questionFlow[currentQuestionIndex]
  const totalQuestions = questionFlow.length
  const progressPercent = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0
  const currentQuestionSkipped = currentQuestion ? skippedByQuestionId[currentQuestion.question.id] === true : false

  function isAnswered(question: PlacementFlowQuestion) {
    if (skippedByQuestionId[question.question.id]) {
      return true
    }
    if (question.kind === 'mcq') {
      return question.question.id in mcqAnswers
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
        const normalized = await requestRunApi({
          language: fromLegacyCodeLanguageId(language),
          code: current.code,
          stdin: test.stdin,
          timeoutMs: question.timeoutMs,
        })
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

  function computeScore(overrides?: {
    mcq?: Record<string, number>
    coding?: Record<string, CodingRunState>
    skipped?: Record<string, boolean>
  }) {
    const mcqMap = overrides?.mcq ?? mcqAnswers
    const codingMap = overrides?.coding ?? codingState
    const skippedMap = overrides?.skipped ?? skippedByQuestionId

    const mcqPoints = weeklySet.mcq.reduce((score, question) => {
      if (skippedMap[question.id]) {
        return score
      }
      const selected = mcqMap[question.id]
      if (typeof selected !== 'number') {
        return score
      }
      return selected === question.correctIndex ? score + 1 : score
    }, 0)

    const codingPoints = weeklySet.coding.reduce((score, question) => {
      if (skippedMap[question.id]) {
        return score
      }
      const state = codingMap[question.id]
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
        ...weeklySet.mcq.map((question) => {
          if (skippedMap[question.id]) {
            return -1
          }
          return mcqMap[question.id] ?? -1
        }),
        ...weeklySet.coding.map((question) => {
          if (skippedMap[question.id]) {
            return 0
          }
          const state = codingMap[question.id]
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
    finishPlacementWithResult(nextResult)
  }

  function finishPlacementWithResult(nextResult: ReturnType<typeof computeScore>) {

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

  function skipCurrentQuestion() {
    if (!currentQuestion) {
      return
    }

    const questionId = currentQuestion.question.id
    const nextSkipped = {
      ...skippedByQuestionId,
      [questionId]: true,
    }

    if (currentQuestion.kind === 'mcq') {
      setMcqAnswers((prev) => ({
        ...prev,
        [questionId]: -1,
      }))
    }
    setSkippedByQuestionId(nextSkipped)

    logPlacementSkipEvent({
      unitId: 'placement',
      trackId: `${language}:${level}`,
      language,
      questionId,
      questionIndex: currentQuestionIndex,
    })

    if (currentQuestionIndex >= totalQuestions - 1) {
      const nextResult = computeScore({
        mcq:
          currentQuestion.kind === 'mcq'
            ? {
                ...mcqAnswers,
                [questionId]: -1,
              }
            : mcqAnswers,
        coding: codingState,
        skipped: nextSkipped,
      })
      finishPlacementWithResult(nextResult)
      return
    }

    setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
  }

  return (
    <section className="min-h-[100dvh] overflow-x-hidden p-3">
      <Card padding="md" className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col space-y-4" interactive>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge>{t('placement.badge')}</Badge>
            <span className="rounded-full border border-pebble-border/35 px-2.5 py-1 text-xs text-pebble-text-muted">
              {t('placement.level')}: {level}
            </span>
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-4xl">
            {t('placement.assessmentTitle', { language: metadata.label })}
          </h1>
          <p className="text-sm text-pebble-text-secondary sm:text-base">
            {t('placement.questionProgress', { current: Math.min(currentQuestionIndex + 1, totalQuestions), total: totalQuestions })}
          </p>
          {currentQuestionSkipped ? (
            <p className="text-xs font-medium text-pebble-warning">{t('placement.skipped')}</p>
          ) : null}
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
            {t('placement.back')}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={skipCurrentQuestion}
              title={t('placement.skipHint')}
            >
              {t('placement.skip')}
            </Button>
            {!canFinish && (
              <Button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                disabled={!canGoNext}
              >
                {t('placement.next')}
              </Button>
            )}
            {canFinish && (
              <Button onClick={finishPlacement}>
                {t('placement.finish')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </section>
  )
}
