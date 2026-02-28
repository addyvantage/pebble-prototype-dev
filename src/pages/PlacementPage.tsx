import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { buttonClass } from '../components/ui/buttonStyles'
import {
  getLanguageMetadata,
  getPlacementQuestions,
  isPlacementLanguage,
  isPlacementLevel,
  scoreToStartUnit,
  type PlacementLanguage,
  type PlacementLevel,
  type StartUnit,
} from '../data/onboardingData'
import { savePebblePlacement } from '../utils/pebbleUserState'

type PlacementResult = {
  score: number
  startUnit: StartUnit
}

function answerClass(isSelected: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
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
  const questions = useMemo(() => getPlacementQuestions(language, level), [language, level])

  const [answers, setAnswers] = useState<Array<number | null>>(() => Array.from({ length: questions.length }, () => null))
  const [result, setResult] = useState<PlacementResult | null>(null)

  useEffect(() => {
    setAnswers(Array.from({ length: questions.length }, () => null))
    setResult(null)
  }, [questions])

  const answeredCount = answers.filter((value) => value !== null).length
  const isComplete = answeredCount === questions.length

  function handleSelect(questionIndex: number, optionIndex: number) {
    setAnswers((prev) => prev.map((value, index) => (index === questionIndex ? optionIndex : value)))
  }

  function handleSubmit() {
    if (!isComplete) {
      return
    }

    const score = answers.reduce<number>((sum, value, index) => {
      if (value === null) {
        return sum
      }
      return value === questions[index].correctIndex ? sum + 1 : sum
    }, 0)

    const startUnit = scoreToStartUnit(score)
    setResult({ score, startUnit })
    savePebblePlacement({
      language,
      level,
      score,
      startUnit,
      answers: answers.map((value) => value ?? -1),
    })
  }

  return (
    <section className="page-enter mx-auto w-full max-w-5xl space-y-5">
      <Card padding="lg" className="space-y-5" interactive>
        <div className="space-y-2">
          <Badge>Placement</Badge>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-4xl">
            Quick {metadata.label} placement
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-pebble-text-secondary sm:text-base">
            Level: <span className="font-semibold text-pebble-text-primary">{level}</span>. Answer five questions to place your starting unit.
          </p>
        </div>

        <Divider />

        <div className="space-y-3">
          {questions.map((question, questionIndex) => (
            <Card key={question.id} padding="sm" className="bg-pebble-overlay/[0.05]" interactive>
              <p className="text-sm font-semibold text-pebble-text-primary">
                {questionIndex + 1}. {question.prompt}
              </p>
              <div className="mt-3 grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={option}
                    type="button"
                    className={answerClass(answers[questionIndex] === optionIndex)}
                    onClick={() => handleSelect(questionIndex, optionIndex)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {!result && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-sm text-pebble-text-secondary">
              Progress: {answeredCount}/{questions.length} answered
            </p>
            <Button onClick={handleSubmit} disabled={!isComplete}>
              Check placement
            </Button>
          </div>
        )}

        {result && (
          <Card padding="md" className="border-pebble-accent/35 bg-pebble-accent/10" interactive>
            <p className="text-sm font-semibold text-pebble-text-primary">
              Score: {result.score}/{questions.length}
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
