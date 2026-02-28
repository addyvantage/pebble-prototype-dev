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
  durationMs: number
  exitCode: number | null
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
    <Card padding="sm" className={`flex h-full min-h-0 flex-col gap-2.5 ${className ?? ''}`} interactive>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <p className="text-sm font-semibold text-white">Testcases</p>
        <p className="text-xs text-white/75">{summaryLabel}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tests.map((_, index) => {
          const result = resultsByIndex[index]
          const isSelected = selectedTestIndex === index
          return (
            <button
              key={`test-select-${index}`}
              type="button"
              onClick={() => onSelectTest(index)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                isSelected
                  ? 'border-pebble-accent/45 bg-pebble-accent/12 text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.1]'
              }`}
            >
              Case {index + 1}
              {result ? (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${result.passed ? 'bg-pebble-success' : 'bg-pebble-warning'}`}
                />
              ) : <span className="h-1.5 w-1.5 rounded-full bg-white/35" />}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 rounded-xl border border-white/10 bg-black/20 p-2.5">
        {!selectedTest ? (
          <p className="text-sm text-white/65">No testcases configured.</p>
        ) : (
          <div className="grid h-full content-start gap-2">
            <FieldBlock label="Input" value={selectedTest.input || '(empty)'} />
            <FieldBlock label="Expected" value={normalizeOutput(selectedTest.expected)} />
            <FieldBlock
              label="Actual"
              value={selectedResult ? normalizeOutput(selectedResult.actual) : 'not run'}
              status={selectedResult ? (selectedResult.passed ? 'pass' : 'fail') : 'not run'}
            />

            {selectedResult ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  className={`rounded-full border px-2 py-0.5 ${
                    selectedResult.passed
                      ? 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success'
                      : 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning'
                  }`}
                >
                  {selectedResult.passed ? 'pass' : 'fail'}
                </span>
                <span className="text-white/70">runtime {selectedResult.durationMs}ms</span>
                <span className="text-white/70">exit {selectedResult.exitCode ?? 'null'}</span>
                {selectedResult.timedOut ? (
                  <span className="rounded-full border border-pebble-warning/35 bg-pebble-warning/10 px-2 py-0.5 text-pebble-warning">
                    timed out
                  </span>
                ) : null}
              </div>
            ) : null}

            {selectedResult?.stderr ? (
              <FieldBlock label="stderr" value={selectedResult.stderr} warning />
            ) : null}
          </div>
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
        <p className="text-[11px] uppercase tracking-[0.06em] text-white/55">{label}</p>
        {status && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              status === 'pass'
                ? 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success'
                : status === 'fail'
                  ? 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning'
                  : 'border-white/10 bg-white/[0.04] text-white/65'
            }`}
          >
            {status}
          </span>
        )}
      </div>
      <div
        className={`rounded-lg border px-2 py-1.5 font-mono text-[12px] leading-relaxed ${
          warning
            ? 'border-pebble-warning/35 bg-pebble-warning/10 text-pebble-warning'
            : 'border-white/10 bg-black/30 text-white/85'
        }`}
      >
        <p className="[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:8] overflow-hidden whitespace-pre-wrap break-words">
          {value}
        </p>
      </div>
    </div>
  )
}
