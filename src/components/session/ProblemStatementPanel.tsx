import { useEffect, useMemo, useState } from 'react'
import type { PlacementLanguage } from '../../data/onboardingData'
import { getUnitSolution } from '../../data/solutionsBank'
import type { UnitSubmission } from '../../lib/submissionsStore'

type ProblemTest = {
  input: string
  expected: string
}

type ProblemStatementPanelProps = {
  unitId: string
  title: string
  concept: string
  prompt: string
  constraints: string[]
  tests: ProblemTest[]
  difficultyLabel: string
  tags: string[]
  language: PlacementLanguage
  functionMode?: boolean
  submissions: UnitSubmission[]
  className?: string
}

function compactText(value: string) {
  return value.trim() || '(empty)'
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

const LANGUAGE_LABELS: Record<PlacementLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  cpp: 'C++',
  java: 'Java',
  c: 'C',
}

export function ProblemStatementPanel({
  unitId,
  title,
  concept,
  prompt,
  constraints,
  tests,
  difficultyLabel,
  tags,
  language,
  functionMode = false,
  submissions,
  className,
}: ProblemStatementPanelProps) {
  const [activeTab, setActiveTab] = useState<'problem' | 'solutions' | 'submissions'>('problem')
  const [solutionLanguage, setSolutionLanguage] = useState<PlacementLanguage>(language)
  const [copied, setCopied] = useState(false)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')

  const solution = useMemo(() => getUnitSolution(unitId), [unitId])
  const examples = tests.slice(0, 2)

  useEffect(() => {
    setSolutionLanguage(language)
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
    if (solution.implementations[language]) {
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
        'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03]',
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        <TabButton
          active={activeTab === 'problem'}
          onClick={() => setActiveTab('problem')}
          label="Problem"
        />
        <TabButton
          active={activeTab === 'solutions'}
          onClick={() => setActiveTab('solutions')}
          label="Solutions"
        />
        <TabButton
          active={activeTab === 'submissions'}
          onClick={() => setActiveTab('submissions')}
          label="Submissions"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {activeTab === 'problem' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/85">
                  {difficultyLabel}
                </span>
                <span className="rounded-full border border-pebble-accent/35 bg-pebble-accent/12 px-2.5 py-1 text-xs text-pebble-accent">
                  {concept}
                </span>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-white/80">{prompt}</p>
            </div>

            <Section title="Description">
              Solve the task for every testcase. Keep output exact and avoid extra logs.
            </Section>

            <Section title="Input">
              {functionMode
                ? 'Input is handled automatically. Implement the function signature only.'
                : 'Read values from standard input exactly as provided by each testcase.'}
            </Section>

            <Section title="Output">
              {functionMode
                ? 'Return the correct value from the function. Output formatting is handled internally.'
                : 'Print only the expected output for the testcase.'}
            </Section>

            {functionMode && (
              <div className="rounded-xl border border-pebble-accent/35 bg-pebble-accent/10 px-3 py-2 text-xs text-white/85">
                Function mode: input parsing and testcase execution are handled for you.
              </div>
            )}

            <section className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Constraints</h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-white/75">
                {constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Examples</h3>
              <div className="grid gap-2">
                {examples.map((example, index) => (
                  <div
                    key={`${title}-example-${index}`}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-2"
                  >
                    <p className="text-xs font-medium text-white/90">Example {index + 1}</p>
                    <div className="mt-1 grid gap-1 text-xs text-white/75">
                      <p className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                        <span className="font-medium text-white/95">Input:</span> {compactText(example.input)}
                      </p>
                      <p className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                        <span className="font-medium text-white/95">Output:</span> {compactText(example.expected)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'solutions' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">How to solve</h3>
              <p className="text-sm text-white/75">
                Pebble curated walkthrough for this unit.
              </p>
            </div>

            {!solution || availableSolutionLanguages.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75">
                Solution not published yet. Try <span className="font-medium text-white">Hint</span> or{' '}
                <span className="font-medium text-white">Ask Pebble</span>.
              </div>
            ) : (
              <>
                <section className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">Intuition</h4>
                  <p className="text-sm text-white/80">{solution.intuition}</p>
                </section>

                <section className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">Approach</h4>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-white/80">
                    {solution.approach.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">Complexity</h4>
                  <p className="text-sm text-white/80">Time: {solution.complexity.time}</p>
                  <p className="text-sm text-white/80">Space: {solution.complexity.space}</p>
                </section>

                <section className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white">Implementation</h4>
                    <button
                      type="button"
                      onClick={() => void copySolution()}
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/[0.12]"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {!solution?.implementations[language] && solution?.implementations.python ? (
                    <p className="text-xs text-white/65">
                      Solution not available in {LANGUAGE_LABELS[language]} yet. Showing Python fallback.
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-1.5">
                    {availableSolutionLanguages.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSolutionLanguage(lang)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                          solutionLanguage === lang
                            ? 'border-pebble-accent/45 bg-pebble-accent/14 text-white'
                            : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.1]'
                        }`}
                      >
                        {LANGUAGE_LABELS[lang]}
                      </button>
                    ))}
                  </div>

                  <pre className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/25 p-3 text-[12px] leading-relaxed text-white/85">
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
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75">
                No submissions yet. Click <span className="font-medium text-white">Submit</span> after a run to save your result.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-[0.06em] text-white/55">Last Accepted</p>
                  {lastAcceptedSubmission ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-white">{LANGUAGE_LABELS[lastAcceptedSubmission.language]}</p>
                        <p className="text-xs text-white/65">
                          {new Date(lastAcceptedSubmission.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full border border-pebble-success/35 bg-pebble-success/15 px-2 py-0.5 text-[11px] text-pebble-success">
                          Accepted
                        </span>
                        <p className="mt-1 text-xs text-white/70">
                          {lastAcceptedSubmission.runtimeMs}ms • exit {lastAcceptedSubmission.exitCode ?? 'null'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-white/70">No accepted submission yet.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Recent submissions</h3>
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
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                submission.status === 'accepted'
                                  ? 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success'
                                  : 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning'
                              }`}
                            >
                              {submission.status === 'accepted' ? 'Accepted' : 'Failed'}
                            </span>
                            <span className="text-xs text-white/65">{new Date(submission.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="mt-1 text-xs text-white/75">
                            {LANGUAGE_LABELS[submission.language]} • {submission.runtimeMs}ms • {submission.passCount}/{submission.totalCount}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {selectedSubmission && (
                  <SubmissionDetail submission={selectedSubmission} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function SubmissionDetail({ submission }: { submission: UnitSubmission }) {
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
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-white">Submission detail</h4>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            submission.status === 'accepted'
              ? 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success'
              : 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning'
          }`}
        >
          {submission.status === 'accepted' ? 'Accepted' : 'Failed'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <p className="text-[11px] uppercase tracking-[0.06em] text-white/55">Runtime</p>
          <p className="mt-1 text-sm font-medium text-white">{submission.runtimeMs}ms</p>
          <p className="text-xs text-white/55">Beats --%</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <p className="text-[11px] uppercase tracking-[0.06em] text-white/55">Memory</p>
          <p className="mt-1 text-sm font-medium text-white">--</p>
          <p className="text-xs text-white/55">Pending benchmark</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/65">
          {LANGUAGE_LABELS[submission.language]} • exit {submission.exitCode ?? 'null'} • {new Date(submission.timestamp).toLocaleString()}
        </p>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/[0.12]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <pre className="max-h-60 overflow-auto rounded-xl border border-white/10 bg-black/25 p-3 text-[12px] leading-relaxed text-white/85">
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
          ? 'bg-white/10 text-white'
          : 'text-white/65 hover:bg-white/10 hover:text-white/90'
      }`}
    >
      {label}
    </button>
  )
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-sm text-white/80">{children}</p>
    </section>
  )
}
