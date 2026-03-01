import Editor from '@monaco-editor/react'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { IDE_MONACO_LANGUAGE, type IdeRunLanguage } from '../ide/runtimeLanguages'
import type { PlacementCodingQuestion } from '../../data/placementBank'

export type CodingTestResult = {
  stdin: string
  expected: string
  actual: string
  stderr: string
  passed: boolean
  timedOut: boolean
}

type CodingQuestionCardProps = {
  question: PlacementCodingQuestion
  questionNumber: number
  language: IdeRunLanguage
  code: string
  isRunning: boolean
  runState: 'not run' | 'running' | 'pass' | 'fail'
  results: CodingTestResult[]
  onCodeChange: (code: string) => void
  onRun: () => void
}

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trim() || '(empty)'
}

function runStateVariant(runState: CodingQuestionCardProps['runState']) {
  if (runState === 'pass') {
    return 'success' as const
  }
  if (runState === 'fail') {
    return 'warning' as const
  }
  return 'neutral' as const
}

export function CodingQuestionCard({
  question,
  questionNumber,
  language,
  code,
  isRunning,
  runState,
  results,
  onCodeChange,
  onRun,
}: CodingQuestionCardProps) {
  return (
    <Card padding="md" className="space-y-3" interactive>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
            Coding check
          </p>
          <h2 className="text-balance text-lg font-semibold tracking-[-0.01em] text-pebble-text-primary sm:text-xl">
            {questionNumber}. {question.prompt}
          </h2>
        </div>

        <Button
          size="sm"
          onClick={onRun}
          disabled={isRunning}
          className="gap-2"
        >
          <span aria-hidden="true" className="inline-flex">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
              <path d="M5 3.8a1 1 0 0 1 1.53-.85l8.9 5.7a1.6 1.6 0 0 1 0 2.7l-8.9 5.7A1 1 0 0 1 5 16.2V3.8z" />
            </svg>
          </span>
          {isRunning ? 'Running...' : 'Run'}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-pebble-border/28 bg-pebble-canvas/92">
        <Editor
          height="300px"
          language={IDE_MONACO_LANGUAGE[language]}
          theme="vs-dark"
          value={code}
          onChange={(value) => onCodeChange(value ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 22,
            automaticLayout: true,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            overviewRulerLanes: 0,
            scrollbar: {
              horizontal: 'hidden',
            },
            padding: {
              top: 10,
              bottom: 10,
            },
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="neutral" className="text-xs">{question.difficulty}</Badge>
        <Badge variant={runStateVariant(runState)} className="text-xs">{runState}</Badge>
        <span className="rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.07] px-2.5 py-1 text-[12px] text-pebble-text-secondary">
          Timeout: {question.timeoutMs}ms • Tests: {question.tests.length}
        </span>
      </div>

      <div className="space-y-2 rounded-xl border border-pebble-border/25 bg-pebble-canvas/72 p-3">
        {results.length === 0 ? (
          <p className="text-sm text-pebble-text-muted">Run to evaluate testcases.</p>
        ) : (
          results.map((test, index) => (
            <div
              key={`${question.id}-test-${index}`}
              className="rounded-lg border border-pebble-border/25 bg-pebble-overlay/[0.06] p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-pebble-text-primary">Test {index + 1}</p>
                <Badge variant={test.passed ? 'success' : 'warning'}>
                  {test.passed ? 'pass' : 'fail'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-pebble-text-secondary">input: {test.stdin || '(empty)'}</p>
              <p className="text-xs text-pebble-text-secondary">expected: {normalizeOutput(test.expected)}</p>
              <p className="text-xs text-pebble-text-secondary">actual: {normalizeOutput(test.actual)}</p>
              {test.stderr ? (
                <p className="mt-1 text-xs text-pebble-warning">stderr: {test.stderr.slice(0, 220)}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
