import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export type UnitTestCase = {
  input: string
  expected: string
}

export type UnitTestResultItem = {
  input: string
  expected: string
  actual: string
  stderr: string
  passed: boolean
  timedOut: boolean
}

type TestResultsPanelProps = {
  tests: UnitTestCase[]
  selectedTestIndex: number
  resultsByIndex: Record<number, UnitTestResultItem>
  summaryLabel: string
  onSelectTest: (index: number) => void
  className?: string
}

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trim() || '(empty)'
}

export function TestResultsPanel({
  tests,
  selectedTestIndex,
  resultsByIndex,
  summaryLabel,
  onSelectTest,
  className,
}: TestResultsPanelProps) {
  const selectedTest = tests[selectedTestIndex]
  const selectedResult = resultsByIndex[selectedTestIndex]

  return (
    <Card padding="sm" className={`flex h-full min-h-0 flex-col space-y-3 ${className ?? ''}`} interactive>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Testcases</p>
        <p className="text-xs text-white/60">{summaryLabel}</p>
      </div>

      <div className="grid gap-2 grid-cols-3 xl:grid-cols-4">
        {tests.map((_, index) => {
          const result = resultsByIndex[index]
          const isSelected = selectedTestIndex === index
          return (
            <button
              key={`test-select-${index}`}
              type="button"
              onClick={() => onSelectTest(index)}
              className={`rounded-xl border px-2.5 py-1.5 text-left text-xs transition ${
                isSelected
                  ? 'border-pebble-accent/45 bg-pebble-accent/12'
                  : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">Case {index + 1}</span>
                {result ? (
                  <Badge variant={result.passed ? 'success' : 'warning'}>
                    {result.passed ? 'pass' : 'fail'}
                  </Badge>
                ) : (
                  <Badge variant="neutral">not run</Badge>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {selectedTest ? (
          <div className="grid gap-2 text-xs">
            <FieldBlock label="Input" value={selectedTest.input || '(empty)'} />
            <FieldBlock label="Expected" value={normalizeOutput(selectedTest.expected)} />
            <FieldBlock
              label="Actual"
              value={selectedResult ? normalizeOutput(selectedResult.actual) : '(not run)'}
              status={selectedResult ? (selectedResult.passed ? 'pass' : 'fail') : 'not run'}
            />
            {selectedResult?.stderr ? (
              <FieldBlock label="stderr" value={selectedResult.stderr} warning />
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-white/45">No tests configured.</p>
        )}
      </div>
    </Card>
  )
}

function FieldBlock({
  label,
  value,
  status,
  warning,
}: {
  label: string
  value: string
  status?: 'pass' | 'fail' | 'not run'
  warning?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">{label}</p>
        {status && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              status === 'pass'
                ? 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success'
                : status === 'fail'
                  ? 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning'
                  : 'border-white/10 bg-white/[0.04] text-white/60'
            }`}
          >
            {status}
          </span>
        )}
      </div>
      <pre
        className={`max-h-24 overflow-auto rounded-lg border px-2 py-1.5 font-mono text-[11px] ${
          warning
            ? 'border-pebble-warning/35 bg-pebble-warning/10 text-pebble-warning'
            : 'border-white/10 bg-black/25 text-white/75'
        }`}
      >
        {value}
      </pre>
    </div>
  )
}
