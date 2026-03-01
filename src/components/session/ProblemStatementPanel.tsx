import { useEffect, useMemo, useState } from 'react'
import type { PlacementLanguage } from '../../data/onboardingData'
import type { ProblemExample, SqlTableSchema } from '../../data/problemsBank'
import { getLocalizedUnitSolution } from '../../data/solutionsBank'
import type { UnitSubmission } from '../../lib/submissionsStore'
import { useI18n } from '../../i18n/useI18n'
import { DifficultyPill } from '../ui/DifficultyPill'

type ProblemTest = {
  input: string
  expected: string
}

type ProblemStatementPanelProps = {
  unitId: string
  title: string
  concept: string
  prompt: string
  description?: string
  constraints: string[]
  tests: ProblemTest[]
  examples?: ProblemExample[]
  inputText?: string
  outputText?: string
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  difficultyLabel: string
  tags: string[]
  language: PlacementLanguage | 'sql'
  functionMode?: boolean
  submissions: UnitSubmission[]
  sqlSchema?: SqlTableSchema[]
  sqlSchemaText?: string
  className?: string
}

function compactText(value: string, fallback: string) {
  return value.trim() || fallback
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

const LANGUAGE_LABELS: Record<PlacementLanguage | 'sql', string> = {
  python: 'Python',
  javascript: 'JavaScript',
  cpp: 'C++',
  java: 'Java',
  c: 'C',
  sql: 'SQL',
}

export function ProblemStatementPanel({
  unitId,
  title,
  concept,
  prompt,
  description,
  constraints,
  tests,
  examples,
  inputText,
  outputText,
  difficulty = 'Easy',
  difficultyLabel,
  tags,
  language,
  functionMode = false,
  submissions,
  sqlSchema,
  sqlSchemaText,
  className,
}: ProblemStatementPanelProps) {
  const { lang, t, isRTL } = useI18n()
  const isUrdu = isRTL
  const proseClass = isUrdu ? 'rtlText' : ''
  const [activeTab, setActiveTab] = useState<'problem' | 'solutions' | 'submissions'>('problem')
  const [solutionLanguage, setSolutionLanguage] = useState<PlacementLanguage>(
    language === 'sql' ? 'python' : language,
  )
  const [copied, setCopied] = useState(false)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')

  const solution = useMemo(() => getLocalizedUnitSolution(unitId, lang), [lang, unitId])
  const resolvedExamples = examples?.map((item) => ({
    input: item.input,
    expected: item.output,
  })) ?? tests.slice(0, 2)

  useEffect(() => {
    setSolutionLanguage(language === 'sql' ? 'python' : language)
    setCopied(false)
    setSelectedSubmissionId('')
  }, [language, unitId])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const availableSolutionLanguages = useMemo(() => {
    if (!solution) {
      return [] as PlacementLanguage[]
    }
    const languages: PlacementLanguage[] = []
    if (language !== 'sql' && solution.implementations[language]) {
      languages.push(language)
    }
    if (!languages.includes('python') && solution.implementations.python) {
      languages.push('python')
    }
    return languages
  }, [language, solution])

  const selectedSolutionCode =
    solution?.implementations[solutionLanguage] ??
    solution?.implementations.python ??
    null

  useEffect(() => {
    if (availableSolutionLanguages.length === 0) {
      return
    }
    if (!availableSolutionLanguages.includes(solutionLanguage)) {
      setSolutionLanguage(availableSolutionLanguages[0])
    }
  }, [availableSolutionLanguages, solutionLanguage])
  const lastAcceptedSubmission = useMemo(
    () => submissions.find((submission) => submission.status === 'accepted') ?? null,
    [submissions],
  )
  const selectedSubmission = useMemo(() => {
    if (!selectedSubmissionId) {
      return submissions[0] ?? null
    }
    return submissions.find((submission) => submission.id === selectedSubmissionId) ?? submissions[0] ?? null
  }, [selectedSubmissionId, submissions])

  async function copySolution() {
    if (!selectedSolutionCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(selectedSolutionCode)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section
      className={classNames(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-pebble-border/30 bg-gradient-to-b from-pebble-overlay/[0.12] to-pebble-overlay/[0.04]',
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-pebble-border/25 px-3 py-2">
        <TabButton
          active={activeTab === 'problem'}
          onClick={() => setActiveTab('problem')}
          label={t('tabs.problem')}
        />
        <TabButton
          active={activeTab === 'solutions'}
          onClick={() => setActiveTab('solutions')}
          label={t('tabs.solutions')}
        />
        <TabButton
          active={activeTab === 'submissions'}
          onClick={() => setActiveTab('submissions')}
          label={t('tabs.submissions')}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {activeTab === 'problem' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className={classNames('text-xl font-semibold text-pebble-text-primary', proseClass)}>{title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <DifficultyPill difficulty={difficulty} label={difficultyLabel} className="px-2.5 py-1 text-xs" />
                <span className="rounded-full border border-pebble-accent/35 bg-pebble-accent/12 px-2.5 py-1 text-xs text-pebble-accent">
                  {concept}
                </span>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.07] px-2.5 py-1 text-xs text-pebble-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className={classNames('text-sm leading-relaxed text-pebble-text-secondary', proseClass)}>{prompt}</p>
            </div>

            <Section title={t('problem.section.description')}>
              {description ?? t('problem.defaultDescription')}
            </Section>

            <Section title={t('problem.section.input')}>
              {inputText ?? (functionMode
                ? t('problem.inputFunctionMode')
                : t('problem.inputScriptMode'))}
            </Section>

            <Section title={t('problem.section.output')}>
              {outputText ?? (functionMode
                ? t('problem.outputFunctionMode')
                : t('problem.outputScriptMode'))}
            </Section>

            {functionMode && (
              <div className="rounded-xl border border-pebble-accent/35 bg-pebble-accent/10 px-3 py-2 text-xs text-pebble-text-primary">
                {t('problem.functionModeBanner')}
              </div>
            )}

            <section className="space-y-1">
              <h3 className={classNames('text-sm font-semibold text-pebble-text-primary', proseClass)}>{t('problem.section.constraints')}</h3>
              <ul className={classNames(
                'list-disc space-y-1 text-sm text-pebble-text-secondary',
                isUrdu ? 'rtlText pr-4 pl-0' : 'pl-4',
              )}>
                {constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className={classNames('text-sm font-semibold text-pebble-text-primary', proseClass)}>{t('problem.section.examples')}</h3>
              <div className="grid gap-2">
                {resolvedExamples.map((example, index) => (
                  <div
                    key={`${title}-example-${index}`}
                    className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-2"
                  >
                    <p className={classNames('text-xs font-medium text-pebble-text-primary', proseClass)}>
                      {t('problem.example')} {index + 1}
                    </p>
                    <div className="mt-1 grid gap-1 text-xs text-pebble-text-secondary">
                      <p className={classNames(
                        'rounded-lg border border-pebble-border/30 bg-pebble-canvas/45 px-2 py-1',
                        proseClass,
                      )}>
                        <span className={classNames('font-medium text-pebble-text-primary', proseClass)}>{t('problem.inputLabel')}:</span>{' '}
                        <span className={isUrdu ? 'ltrSafe inline-block' : ''}>{compactText(example.input, t('common.empty'))}</span>
                      </p>
                      <p className={classNames(
                        'rounded-lg border border-pebble-border/30 bg-pebble-canvas/45 px-2 py-1',
                        proseClass,
                      )}>
                        <span className={classNames('font-medium text-pebble-text-primary', proseClass)}>{t('problem.outputLabel')}:</span>{' '}
                        <span className={isUrdu ? 'ltrSafe inline-block' : ''}>{compactText(example.expected, t('common.empty'))}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {sqlSchema && sqlSchema.length > 0 ? (
              <section className="space-y-2">
                <h3 className={classNames('text-sm font-semibold text-pebble-text-primary', proseClass)}>{t('sql.schema')}</h3>
                {sqlSchemaText ? (
                  <p className={classNames('text-sm text-pebble-text-secondary', proseClass)}>{sqlSchemaText}</p>
                ) : null}
                <div className="space-y-2">
                  {sqlSchema.map((table) => (
                    <div key={table.name} className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-3" dir="ltr">
                      <p className="ltrSafe text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
                        {t('sql.table')}: {table.name}
                      </p>
                      <div className="mt-2 overflow-x-auto rounded-lg border border-pebble-border/24 bg-pebble-canvas/55">
                        <table className="min-w-full text-left text-xs text-pebble-text-secondary ltrSafe">
                          <thead className="bg-pebble-overlay/[0.08] text-pebble-text-primary">
                            <tr>
                              {table.columns.map((column) => (
                                <th key={column.name} className="px-2 py-1.5 font-medium">
                                  {column.name} ({column.type})
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, rowIndex) => (
                              <tr key={`${table.name}-row-${rowIndex}`} className="border-t border-pebble-border/20">
                                {row.map((value, valueIndex) => (
                                  <td key={`${table.name}-${rowIndex}-${valueIndex}`} className="px-2 py-1.5">
                                    {value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}

        {activeTab === 'solutions' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className={classNames('text-lg font-semibold text-pebble-text-primary', proseClass)}>{t('solutions.howToSolve')}</h3>
              <p className={classNames('text-sm text-pebble-text-secondary', proseClass)}>
                {t('solutions.walkthrough')}
              </p>
            </div>

            {!solution || availableSolutionLanguages.length === 0 ? (
              <div className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-3 text-sm text-pebble-text-secondary">
                {t('solutions.notPublished')}
              </div>
            ) : (
              <>
                <section className="space-y-1">
                  <h4 className={classNames('text-sm font-semibold text-pebble-text-primary', proseClass)}>{t('solutions.intuition')}</h4>
                  <p className={classNames('text-sm text-pebble-text-secondary', proseClass)}>{solution.intuition}</p>
                </section>

                <section className="space-y-1">
                  <h4 className={classNames('text-sm font-semibold text-pebble-text-primary', proseClass)}>{t('solutions.approach')}</h4>
                  <ul className={classNames(
                    'list-disc space-y-1 text-sm text-pebble-text-secondary',
                    isUrdu ? 'rtlText pr-4 pl-0' : 'pl-4',
                  )}>
                    {solution.approach.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-1">
                  <h4 className={classNames('text-sm font-semibold text-pebble-text-primary', proseClass)}>{t('solutions.complexity')}</h4>
                  <p className={classNames('text-sm text-pebble-text-secondary', proseClass)}>
                    {t('solutions.time')}:{' '}
                    <span className={isUrdu ? 'inlineLtrToken' : ''}>{solution.complexity.time}</span>
                  </p>
                  <p className={classNames('text-sm text-pebble-text-secondary', proseClass)}>
                    {t('solutions.space')}:{' '}
                    <span className={isUrdu ? 'inlineLtrToken' : ''}>{solution.complexity.space}</span>
                  </p>
                </section>

                <section className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-pebble-text-primary">{t('solutions.implementation')}</h4>
                    <button
                      type="button"
                      onClick={() => void copySolution()}
                      className="rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16]"
                    >
                      {copied ? t('actions.copied') : t('actions.copy')}
                    </button>
                  </div>

                  {language !== 'sql' && !solution?.implementations[language] && solution?.implementations.python ? (
                    <p className={classNames('text-xs text-pebble-text-secondary', proseClass)}>{t('solutions.languageFallback', { language: LANGUAGE_LABELS[language] })}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-1.5">
                    {availableSolutionLanguages.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSolutionLanguage(lang)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                          solutionLanguage === lang
                            ? 'border-pebble-accent/45 bg-pebble-accent/14 text-pebble-text-primary'
                            : 'border-pebble-border/30 bg-pebble-overlay/[0.07] text-pebble-text-secondary hover:bg-pebble-overlay/[0.16]'
                        }`}
                      >
                        {LANGUAGE_LABELS[lang]}
                      </button>
                    ))}
                  </div>

                  <pre
                    dir="ltr"
                    className="max-h-72 overflow-auto rounded-xl border border-pebble-border/30 bg-pebble-canvas/55 p-3 text-[12px] leading-relaxed text-pebble-text-primary"
                  >
                    <code>{selectedSolutionCode}</code>
                  </pre>
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-3 text-sm text-pebble-text-secondary">
                {t('submissions.none')}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-3">
                  <p className={classNames('text-xs uppercase tracking-[0.06em] text-pebble-text-muted', proseClass)}>{t('submissions.lastAccepted')}</p>
                  {lastAcceptedSubmission ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className={classNames('text-sm font-semibold text-pebble-text-primary', isUrdu ? 'inlineLtrToken' : '')}>{LANGUAGE_LABELS[lastAcceptedSubmission.language]}</p>
                        <p className={classNames('text-xs text-pebble-text-secondary', isUrdu ? 'inlineLtrToken' : '')}>
                          {new Date(lastAcceptedSubmission.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full border border-pebble-success/35 bg-pebble-success/15 px-2 py-0.5 text-xs text-pebble-success">
                          {t('submissions.accepted')}
                        </span>
                        <p className={classNames('mt-1 text-xs text-pebble-text-secondary', isUrdu ? 'inlineLtrToken' : '')}>
                          {lastAcceptedSubmission.runtimeMs}ms • {t('summary.exitLabel')}{' '}
                          {lastAcceptedSubmission.exitCode ?? 'null'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className={classNames('mt-2 text-xs text-pebble-text-secondary', proseClass)}>{t('submissions.noAcceptedYet')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className={classNames('text-sm font-semibold text-pebble-text-primary', proseClass)}>{t('submissions.recent')}</h3>
                  <div className="grid gap-1.5">
                    {submissions.map((submission) => {
                      const active = (selectedSubmission?.id ?? submissions[0]?.id) === submission.id
                      return (
                        <button
                          key={submission.id}
                          type="button"
                          onClick={() => setSelectedSubmissionId(submission.id)}
                          className={`rounded-xl border px-3 py-2 text-left transition ${
                            active
                              ? 'border-pebble-accent/45 bg-pebble-accent/12'
                              : 'border-pebble-border/30 bg-pebble-overlay/[0.06] hover:bg-pebble-overlay/[0.12]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                submission.status === 'accepted'
                                  ? 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success'
                                  : 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning'
                              }`}
                            >
                              {submission.status === 'accepted' ? t('submissions.accepted') : t('submissions.failed')}
                            </span>
                            <span className={classNames('text-xs text-pebble-text-secondary', isUrdu ? 'inlineLtrToken' : '')}>{new Date(submission.timestamp).toLocaleString()}</span>
                          </div>
                          <p className={classNames('mt-1 text-xs text-pebble-text-secondary', isUrdu ? 'inlineLtrToken' : '')}>
                            {LANGUAGE_LABELS[submission.language]} • {submission.runtimeMs}ms • {submission.passCount}/{submission.totalCount}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {selectedSubmission && (
                  <SubmissionDetail submission={selectedSubmission} isUrdu={isUrdu} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function SubmissionDetail({ submission, isUrdu }: { submission: UnitSubmission; isUrdu: boolean }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }
    const timeoutId = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(submission.code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className={classNames('text-sm font-semibold text-pebble-text-primary', isUrdu ? 'rtlText' : '')}>{t('submissions.detail')}</h4>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            submission.status === 'accepted'
              ? 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success'
              : 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning'
          }`}
        >
          {submission.status === 'accepted' ? t('submissions.accepted') : t('submissions.failed')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-pebble-border/30 bg-pebble-canvas/45 p-2">
          <p className={classNames('text-xs uppercase tracking-[0.06em] text-pebble-text-muted', isUrdu ? 'rtlText' : '')}>{t('submissions.runtime')}</p>
          <p className={classNames('mt-1 text-sm font-medium text-pebble-text-primary', isUrdu ? 'inlineLtrToken' : '')}>{submission.runtimeMs}ms</p>
          <p className={classNames('text-xs text-pebble-text-secondary', isUrdu ? 'rtlText' : '')}>{t('submissions.beatsPlaceholder')}</p>
        </div>
        <div className="rounded-lg border border-pebble-border/30 bg-pebble-canvas/45 p-2">
          <p className={classNames('text-xs uppercase tracking-[0.06em] text-pebble-text-muted', isUrdu ? 'rtlText' : '')}>{t('submissions.memory')}</p>
          <p className="mt-1 text-sm font-medium text-pebble-text-primary">--</p>
          <p className={classNames('text-xs text-pebble-text-secondary', isUrdu ? 'rtlText' : '')}>{t('submissions.pendingBenchmark')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className={classNames('text-xs text-pebble-text-secondary', isUrdu ? 'inlineLtrToken' : '')}>
          {LANGUAGE_LABELS[submission.language]} • {t('summary.exitLabel')} {submission.exitCode ?? 'null'} •{' '}
          {new Date(submission.timestamp).toLocaleString()}
        </p>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16]"
        >
          {copied ? t('actions.copied') : t('actions.copy')}
        </button>
      </div>

      <pre
        dir="ltr"
        className="max-h-60 overflow-auto rounded-xl border border-pebble-border/30 bg-pebble-canvas/55 p-3 text-[12px] leading-relaxed text-pebble-text-primary"
      >
        <code>{submission.code}</code>
      </pre>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
        active
          ? 'bg-pebble-overlay/[0.16] text-pebble-text-primary'
          : 'text-pebble-text-secondary hover:bg-pebble-overlay/[0.12] hover:text-pebble-text-primary'
      }`}
    >
      {label}
    </button>
  )
}

function Section({ title, children }: { title: string; children: string }) {
  const { isRTL } = useI18n()
  const isUrdu = isRTL
  return (
    <section className="space-y-1">
      <h3 className={classNames('text-sm font-semibold text-pebble-text-primary', isUrdu ? 'rtlText' : '')}>{title}</h3>
      <p className={classNames('text-sm text-pebble-text-secondary', isUrdu ? 'rtlText' : '')}>{children}</p>
    </section>
  )
}
