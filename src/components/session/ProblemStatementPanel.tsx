import { useState } from 'react'

type ProblemTest = {
  input: string
  expected: string
}

type ProblemStatementPanelProps = {
  title: string
  concept: string
  prompt: string
  constraints: string[]
  tests: ProblemTest[]
  difficultyLabel: string
  tags: string[]
  className?: string
}

function compactText(value: string) {
  return value.trim() || '(empty)'
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function ProblemStatementPanel({
  title,
  concept,
  prompt,
  constraints,
  tests,
  difficultyLabel,
  tags,
  className,
}: ProblemStatementPanelProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'editorial' | 'solutions' | 'submissions'>('description')
  const examples = tests.slice(0, 2)
  const tabs: Array<{ id: 'description' | 'editorial' | 'solutions' | 'submissions'; label: string }> = [
    { id: 'description', label: 'Description' },
    { id: 'editorial', label: 'Editorial' },
    { id: 'solutions', label: 'Solutions' },
    { id: 'submissions', label: 'Submissions' },
  ]

  return (
    <section
      className={classNames(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03]',
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:bg-white/10 hover:text-white/85'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {activeTab === 'description' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/80">
                  {difficultyLabel}
                </span>
                <span className="rounded-full border border-pebble-accent/35 bg-pebble-accent/12 px-2.5 py-1 text-xs text-pebble-accent">
                  {concept}
                </span>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/65"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-white/75">{prompt}</p>
            </div>

            <Section title="Input">
              Read values from standard input exactly as provided by each testcase.
            </Section>

            <Section title="Output">
              Print only the expected output for the testcase, no extra text.
            </Section>

            <section className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Constraints</h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-white/70">
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
                    <div className="mt-1 grid gap-1 text-xs text-white/70">
                      <p className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                        <span className="font-medium text-white/90">Input:</span> {compactText(example.input)}
                      </p>
                      <p className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                        <span className="font-medium text-white/90">Output:</span> {compactText(example.expected)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/65">
            {activeTab === 'editorial' && 'Editorial will appear here after you submit your own solution.'}
            {activeTab === 'solutions' && 'Community and official solutions will appear here.'}
            {activeTab === 'submissions' && 'Submission history is tracked per run and submit action.'}
          </div>
        )}
      </div>
    </section>
  )
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-sm text-white/70">{children}</p>
    </section>
  )
}
