import { Card } from '../ui/Card'
import { useI18n } from '../../i18n/useI18n'

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

function normalizeOutput(value: string, emptyLabel: string) {
  return value.replace(/\r\n/g, '\n').trim() || emptyLabel
}

export function TestResultsPanel({
  tests,
  selectedTestIndex,
  resultsByIndex,
  summaryLabel,
  onSelectTest,
  className,
}: TestResultsPanelProps) {
  const { t, isRTL } = useI18n()
  const isUrdu = isRTL
  const selectedTest = tests[selectedTestIndex]
  const selectedResult = resultsByIndex[selectedTestIndex]

  return (
    <Card
      padding="sm"
      className={`flex h-full min-h-0 flex-col gap-2.5 ${className ?? ''}`}
      interactive
      dir="ltr"
    >
      <div className="flex items-center justify-between gap-2 border-b border-pebble-border/25 pb-1.5">
        <p className={`text-sm font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{t('tests.title')}</p>
        <p className={`text-xs text-pebble-text-secondary ${isUrdu ? 'ltrSafe' : ''}`}>{summaryLabel}</p>
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
                  ? 'border-pebble-accent/45 bg-pebble-accent/12 text-pebble-text-primary'
                  : 'border-pebble-border/30 bg-pebble-overlay/[0.06] text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]'
              }`}
            >
              {t('problem.example')} {index + 1}
              {result ? (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${result.passed ? 'bg-pebble-success' : 'bg-pebble-warning'}`}
                />
              ) : <span className="h-1.5 w-1.5 rounded-full bg-pebble-text-secondary/55" />}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 rounded-xl border border-pebble-border/30 bg-pebble-canvas/45 p-2.5">
        {!selectedTest ? (
          <p className="text-sm text-pebble-text-secondary">{t('tests.noCases')}</p>
        ) : (
          <div className="grid h-full content-start gap-2">
                <FieldBlock label={t('tests.input')} value={selectedTest.input || t('common.empty')} isUrdu={isUrdu} />
                <FieldBlock
                  label={t('tests.expected')}
                  value={normalizeOutput(selectedTest.expected, t('common.empty'))}
                  isUrdu={isUrdu}
                />
                <FieldBlock
                  label={t('tests.actual')}
              value={
                selectedResult
                  ? normalizeOutput(selectedResult.actual, t('common.empty'))
                  : t('tests.notRun')
              }
              status={selectedResult ? (selectedResult.passed ? 'pass' : 'fail') : 'not run'}
              statusLabel={
                selectedResult
                  ? selectedResult.passed
                    ? t('tests.pass')
                    : t('tests.fail')
                  : t('tests.notRun')
              }
              isUrdu={isUrdu}
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
                  {selectedResult.passed ? t('tests.pass') : t('tests.fail')}
                </span>
                <span className={`text-pebble-text-secondary ${isUrdu ? 'ltrSafe inline-block' : ''}`}>{t('summary.runtimeLabel')} {selectedResult.durationMs}ms</span>
                <span className={`text-pebble-text-secondary ${isUrdu ? 'ltrSafe inline-block' : ''}`}>{t('summary.exitLabel')} {selectedResult.exitCode ?? 'null'}</span>
                {selectedResult.timedOut ? (
                  <span className="rounded-full border border-pebble-warning/35 bg-pebble-warning/10 px-2 py-0.5 text-pebble-warning">
                    {t('tests.timedOut')}
                  </span>
                ) : null}
              </div>
            ) : null}

            {selectedResult?.stderr ? (
              <FieldBlock label={t('tests.stderr')} value={selectedResult.stderr} warning isUrdu={isUrdu} />
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
  statusLabel,
  warning,
  isUrdu,
}: {
  label: string
  value: string
  status?: 'pass' | 'fail' | 'not run'
  statusLabel?: string
  warning?: boolean
  isUrdu: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] uppercase tracking-[0.06em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{label}</p>
        {status && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              status === 'pass'
                ? 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success'
                : status === 'fail'
                  ? 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning'
                  : 'border-pebble-border/30 bg-pebble-overlay/[0.06] text-pebble-text-secondary'
            }`}
          >
            {statusLabel ?? status}
          </span>
        )}
      </div>
      <div
        className={`rounded-lg border px-2 py-1.5 font-mono text-[12px] leading-relaxed ${
          warning
            ? 'border-pebble-warning/35 bg-pebble-warning/10 text-pebble-warning'
            : 'border-pebble-border/30 bg-pebble-canvas/55 text-pebble-text-primary'
        }`}
        dir="ltr"
      >
        <p className={`ltrSafe [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:8] overflow-hidden whitespace-pre-wrap break-words ${isUrdu ? 'text-left' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
