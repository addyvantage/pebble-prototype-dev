import { Card } from '../ui/Card'
import { useI18n } from '../../i18n/useI18n'
import type { SqlPreviewTable } from '../../data/problemsBank'
import type { RunFailureDiagnostic } from '../../lib/runDiagnostics'

export type UnitTestCase = {
  input: string
  expected: string
}

export type UnitTestResultItem = {
  input: string
  expected: string
  actual: string
  stderr: string
  diagnostic?: RunFailureDiagnostic | null
  requiredSignature?: string
  detectedSignature?: string
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
  sqlPreview?: SqlPreviewTable | null
  onSelectTest: (index: number) => void
  className?: string
}

function normalizeOutput(value: string, emptyLabel: string) {
  return value.replace(/\r\n/g, '\n').trim() || emptyLabel
}

function resolveDiagnosticTitle(t: ReturnType<typeof useI18n>['t'], status: RunFailureDiagnostic['status']) {
  if (status === 'compile_error') return t('coach.compileErrorTitle')
  if (status === 'runtime_error') return t('coach.runtimeErrorTitle')
  if (status === 'validation_error') return t('coach.signatureMismatchTitle')
  return t('coach.genericFailureTitle')
}

function resolveDiagnosticMessage(t: ReturnType<typeof useI18n>['t'], diagnostic: RunFailureDiagnostic) {
  if (diagnostic.status === 'compile_error') {
    if (diagnostic.locationKind === 'user_code' && diagnostic.editorLine) {
      return t('coach.compileErrorUserLine', { line: diagnostic.editorLine })
    }
    if (diagnostic.locationKind === 'runner_wrapper') {
      return t('coach.compileErrorWrapper')
    }
    return t('coach.compileErrorGeneric')
  }

  if (diagnostic.status === 'runtime_error') {
    return t('coach.runtimeErrorBody')
  }
  if (diagnostic.status === 'toolchain_unavailable') {
    return t('coach.toolchainUnavailableBody')
  }
  if (diagnostic.status === 'timeout') {
    return t('coach.timeoutBody')
  }
  if (diagnostic.status === 'validation_error') {
    return t('coach.validationBody')
  }
  return t('coach.internalBody')
}

function resolveDiagnosticLocation(
  t: ReturnType<typeof useI18n>['t'],
  diagnostic: RunFailureDiagnostic,
) {
  if (diagnostic.locationKind === 'user_code' && diagnostic.editorLine) {
    return t('coach.locationUserCode', { line: diagnostic.editorLine })
  }
  if (diagnostic.locationKind === 'runner_wrapper') {
    return t('coach.locationRunnerWrapper')
  }
  return t('coach.locationUnknown')
}

export function TestResultsPanel({
  tests,
  selectedTestIndex,
  resultsByIndex,
  summaryLabel,
  sqlPreview,
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
      className={`session-surface flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-[26px] ${className ?? ''}`}
      interactive
      dir="ltr"
    >
      <div className="flex items-center justify-between gap-2 border-b border-pebble-border/20 pb-2">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>Execution</p>
          <p className={`text-base font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{t('tests.title')}</p>
        </div>
        <p className={`rounded-full border border-pebble-border/25 bg-pebble-overlay/[0.08] px-3 py-1 text-xs font-medium text-pebble-text-secondary ${isUrdu ? 'ltrSafe' : ''}`}>{summaryLabel}</p>
      </div>

      <div className="shrink-0 flex flex-wrap gap-2">
        {tests.map((_, index) => {
          const result = resultsByIndex[index]
          const isSelected = selectedTestIndex === index
          return (
            <button
              key={`test-select-${index}`}
              type="button"
              onClick={() => onSelectTest(index)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                isSelected
                  ? 'border-pebble-accent/45 bg-pebble-accent/12 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : 'border-pebble-border/24 bg-pebble-overlay/[0.05] text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]'
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

      <div className="session-inset min-h-0 flex-1 overflow-y-auto rounded-[22px] p-4 pebble-scrollbar">
        {!selectedTest ? (
          <p className="text-sm text-pebble-text-secondary">{t('tests.noCases')}</p>
        ) : (
          <div className="grid content-start gap-3">
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

            {selectedResult?.diagnostic ? (
              <section className="space-y-2 rounded-2xl border border-pebble-warning/35 bg-pebble-warning/10 p-3 text-sm text-pebble-warning">
                <p className={`text-xs uppercase tracking-[0.06em] ${isUrdu ? 'rtlText' : ''}`}>
                  {resolveDiagnosticTitle(t, selectedResult.diagnostic.status)}
                </p>
                <p className={`text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                  <span className="font-semibold text-pebble-text-primary">{t('coach.locationLabel')}:</span>{' '}
                  {resolveDiagnosticLocation(t, selectedResult.diagnostic)}
                </p>
                <p className={`${isUrdu ? 'rtlText' : ''}`}>{resolveDiagnosticMessage(t, selectedResult.diagnostic)}</p>

                {selectedResult.requiredSignature ? (
                  <p className={`text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                    <span className="font-semibold text-pebble-text-primary">{t('coach.requiredSignature')}:</span>{' '}
                    <span className="ltrSafe inline-block rounded bg-pebble-canvas/75 px-1.5 py-0.5 font-mono text-[11px] text-pebble-text-primary">
                      {selectedResult.requiredSignature}
                    </span>
                  </p>
                ) : null}
                {selectedResult.detectedSignature ? (
                  <p className={`text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                    <span className="font-semibold text-pebble-text-primary">{t('coach.detectedSignature')}:</span>{' '}
                    <span className="ltrSafe inline-block rounded bg-pebble-canvas/75 px-1.5 py-0.5 font-mono text-[11px] text-pebble-text-primary">
                      {selectedResult.detectedSignature}
                    </span>
                  </p>
                ) : null}

                <details className="rounded-xl border border-pebble-warning/35 bg-pebble-canvas/65 px-3 py-2 text-xs">
                  <summary className="cursor-pointer text-pebble-text-primary">{t('coach.runnerDetails')}</summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words font-mono leading-relaxed text-pebble-warning">
                    {selectedResult.diagnostic.details || selectedResult.stderr || t('common.empty')}
                  </pre>
                </details>
              </section>
            ) : selectedResult?.stderr ? (
              <FieldBlock label={t('tests.stderr')} value={selectedResult.stderr} warning isUrdu={isUrdu} />
            ) : null}

            {sqlPreview && selectedResult ? (
              <div className="space-y-1.5">
                <p className={`text-xs uppercase tracking-[0.06em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{t('sql.resultPreview')}</p>
                <div className="overflow-x-auto rounded-xl border border-pebble-border/24 bg-pebble-canvas/55 p-3" dir="ltr">
                  <table className="min-w-full text-left text-[12px] text-pebble-text-secondary ltrSafe">
                    <thead className="text-pebble-text-primary">
                      <tr>
                        {sqlPreview.columns.map((column) => (
                          <th key={column} className="px-2 py-1 font-medium">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlPreview.rows.map((row, rowIndex) => (
                        <tr key={`preview-row-${rowIndex}`} className="border-t border-pebble-border/20">
                          {row.map((value, valueIndex) => (
                            <td key={`preview-${rowIndex}-${valueIndex}`} className="px-2 py-1.5">{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{label}</p>
        {status && (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
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
        className={`rounded-xl border px-3 py-3 font-mono text-[12.5px] leading-7 ${
          warning
            ? 'border-pebble-warning/35 bg-pebble-warning/10 text-pebble-warning'
            : 'border-pebble-border/24 bg-pebble-canvas/55 text-pebble-text-primary'
        }`}
        dir="ltr"
      >
        <p className={`ltrSafe whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${isUrdu ? 'text-left' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
