import { ChevronDown, Search, Shuffle } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopicCloud } from '../components/problems/TopicCloud'
import {
  ProblemsFilterPopover,
  type ProblemsFilterState,
} from '../components/problems/ProblemsFilterPopover'
import { ProblemsTable } from '../components/problems/ProblemsTable'
import { ProblemPreviewPanel } from '../components/problems/ProblemPreviewPanel'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import {
  getDefaultProblemLanguage,
  type ProblemDefinition,
  type ProblemLanguage,
  PROBLEMS_BANK,
  TOPICS_WITH_COUNTS,
} from '../data/problemsBank'
import { useI18n } from '../i18n/useI18n'
import { loadSolvedProblems, subscribeSolvedProblems, type SolvedProblemsMap } from '../lib/solvedProblemsStore'

type SortMode = 'difficulty' | 'acceptance' | 'newest' | 'topic' | 'lastSolved'

const difficultyWeight: Record<ProblemDefinition['difficulty'], number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
}

const INITIAL_FILTERS: ProblemsFilterState = {
  status: 'all',
  difficulty: 'any',
  language: 'any',
  matchMode: 'any',
  topics: [],
}

function getSolvedTimestamp(solvedMap: SolvedProblemsMap, problemId: string) {
  return solvedMap[problemId]?.solvedAt ?? 0
}

export function ProblemsPage() {
  const { t, isRTL } = useI18n()
  const navigate = useNavigate()
  const isUrdu = isRTL

  const solvedMap = useSyncExternalStore(subscribeSolvedProblems, loadSolvedProblems, loadSolvedProblems)

  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<ProblemsFilterState>(INITIAL_FILTERS)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [previewProblem, setPreviewProblem] = useState<ProblemDefinition | null>(null)
  const [previewLanguage, setPreviewLanguage] = useState<ProblemLanguage>('python')

  const normalizedSearch = searchValue.trim().toLowerCase()

  const filteredProblems = useMemo(() => {
    const rows = PROBLEMS_BANK.filter((problem) => {
      if (normalizedSearch) {
        const haystack = `${problem.title} ${problem.topics.join(' ')} ${problem.keySkills.join(' ')}`.toLowerCase()
        if (!haystack.includes(normalizedSearch)) {
          return false
        }
      }

      if (filters.status === 'solved' && !solvedMap[problem.id]?.solvedAt) {
        return false
      }

      if (filters.status === 'unsolved' && solvedMap[problem.id]?.solvedAt) {
        return false
      }

      if (filters.difficulty !== 'any' && problem.difficulty.toLowerCase() !== filters.difficulty) {
        return false
      }

      if (filters.language !== 'any' && !problem.languageSupport.includes(filters.language)) {
        return false
      }

      if (filters.topics.length > 0) {
        const hasAll = filters.topics.every((topic) => problem.topics.includes(topic))
        const hasAny = filters.topics.some((topic) => problem.topics.includes(topic))
        if (filters.matchMode === 'all' ? !hasAll : !hasAny) {
          return false
        }
      }

      return true
    })

    return [...rows].sort((left, right) => {
      if (sortMode === 'difficulty') {
        return difficultyWeight[left.difficulty] - difficultyWeight[right.difficulty] || left.title.localeCompare(right.title)
      }

      if (sortMode === 'acceptance') {
        return right.acceptanceRate - left.acceptanceRate
      }

      if (sortMode === 'topic') {
        return left.topics[0].localeCompare(right.topics[0]) || left.title.localeCompare(right.title)
      }

      if (sortMode === 'lastSolved') {
        return getSolvedTimestamp(solvedMap, right.id) - getSolvedTimestamp(solvedMap, left.id)
      }

      return left.createdAtRank - right.createdAtRank
    })
  }, [filters, normalizedSearch, solvedMap, sortMode])

  const solvedCount = useMemo(
    () => PROBLEMS_BANK.filter((problem) => solvedMap[problem.id]?.solvedAt).length,
    [solvedMap],
  )

  const filteredSolved = useMemo(
    () => filteredProblems.filter((problem) => solvedMap[problem.id]?.solvedAt).length,
    [filteredProblems, solvedMap],
  )

  function openPreview(problem: ProblemDefinition) {
    setPreviewProblem(problem)
    setPreviewLanguage(getDefaultProblemLanguage(problem))
  }

  function startProblem() {
    if (!previewProblem) {
      return
    }
    navigate(`/session/1?problem=${encodeURIComponent(previewProblem.id)}&lang=${previewLanguage}`)
  }

  function pickRandomProblem() {
    if (filteredProblems.length === 0) {
      return
    }
    const randomIndex = Math.floor(Math.random() * filteredProblems.length)
    openPreview(filteredProblems[randomIndex])
  }

  function toggleTopicFromCloud(topic: string) {
    setFilters((prev) => {
      const selected = prev.topics.includes(topic)
      return {
        ...prev,
        topics: selected ? prev.topics.filter((item) => item !== topic) : [...prev.topics, topic],
      }
    })
  }

  const languageLabels: Record<ProblemLanguage, string> = {
    python: t('problems.languagePython'),
    javascript: t('problems.languageJavaScript'),
    java: t('problems.languageJava'),
    cpp: t('problems.languageCpp'),
    sql: t('problems.languageSql'),
  }
  const difficultyLabels = {
    Easy: t('difficulty.easy'),
    Medium: t('difficulty.medium'),
    Hard: t('difficulty.hard'),
  } as const

  return (
    <section className="page-enter -mt-1 space-y-2 pb-1">
      <Card padding="sm" interactive className="space-y-1">
        <h1 className={`text-3xl font-semibold tracking-[-0.02em] text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
          {t('problems.title')}
        </h1>
        <p className={`max-w-4xl text-sm text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
          {t('problems.subtitle')}
        </p>
      </Card>

      <TopicCloud
        topics={TOPICS_WITH_COUNTS}
        selectedTopics={filters.topics}
        onToggleTopic={toggleTopicFromCloud}
        title={t('problems.topicsTitle')}
        subtitle={t('problems.topicsSubtitle')}
        isUrdu={isUrdu}
      />

      <Card padding="sm" interactive className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[280px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble-text-muted" aria-hidden="true" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t('problems.searchPlaceholder')}
              className={`h-10 w-full rounded-xl border border-pebble-border/32 bg-pebble-overlay/[0.08] pl-9 pr-3 text-sm text-pebble-text-primary placeholder:text-pebble-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
                isUrdu ? 'rtlText text-right' : ''
              }`}
            />
          </label>

          <ProblemsFilterPopover
            value={filters}
            onApply={setFilters}
            onReset={() => setFilters(INITIAL_FILTERS)}
            topicOptions={TOPICS_WITH_COUNTS.map((entry) => entry.topic)}
            labels={{
              filter: t('problems.filters.button'),
              status: t('problems.filters.status'),
              difficulty: t('problems.filters.difficulty'),
              topic: t('problems.filters.topics'),
              language: t('problems.filters.language'),
              matchMode: t('problems.filters.matchMode'),
              all: t('problems.filters.all'),
              solved: t('problems.filters.solved'),
              unsolved: t('problems.filters.unsolved'),
              anyDifficulty: t('problems.filters.anyDifficulty'),
              easy: t('difficulty.easy'),
              medium: t('difficulty.medium'),
              hard: t('difficulty.hard'),
              anyLanguage: t('problems.filters.anyLanguage'),
              apply: t('problems.filters.apply'),
              reset: t('problems.filters.reset'),
              anyMatch: t('problems.filters.matchAny'),
              allMatch: t('problems.filters.matchAll'),
              languagePython: t('problems.languagePython'),
              languageJavaScript: t('problems.languageJavaScript'),
              languageJava: t('problems.languageJava'),
              languageCpp: t('problems.languageCpp'),
              languageSql: t('problems.languageSql'),
            }}
          />

          <label className="relative">
            <select
              value={filters.difficulty}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  difficulty: event.target.value as ProblemsFilterState['difficulty'],
                }))
              }
              className="h-10 appearance-none rounded-xl border border-pebble-border/32 bg-pebble-overlay/[0.08] pl-3 pr-9 text-sm text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
              aria-label={t('problems.filters.difficulty')}
            >
              <option value="any">{t('problems.filters.anyDifficulty')}</option>
              <option value="easy">{t('difficulty.easy')}</option>
              <option value="medium">{t('difficulty.medium')}</option>
              <option value="hard">{t('difficulty.hard')}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble-text-secondary" aria-hidden="true" />
          </label>

          <label className="relative">
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="h-10 appearance-none rounded-xl border border-pebble-border/32 bg-pebble-overlay/[0.08] pl-3 pr-9 text-sm text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
              aria-label={t('problems.sort.label')}
            >
              <option value="newest">{t('problems.sort.newest')}</option>
              <option value="difficulty">{t('problems.sort.difficulty')}</option>
              <option value="acceptance">{t('problems.sort.acceptance')}</option>
              <option value="topic">{t('problems.sort.topic')}</option>
              <option value="lastSolved">{t('problems.sort.lastSolved')}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble-text-secondary" aria-hidden="true" />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <span className={`rounded-xl border border-pebble-border/32 bg-pebble-overlay/[0.08] px-3 py-2 text-sm text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
              {t('problems.solvedCounter', { solved: solvedCount, total: PROBLEMS_BANK.length })}
              <span className="ltrSafe text-pebble-text-muted"> ({filteredSolved}/{filteredProblems.length})</span>
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={pickRandomProblem}
              disabled={filteredProblems.length === 0}
              className="gap-1.5"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
              {t('problems.random')}
            </Button>
          </div>
        </div>

        <ProblemsTable
          rows={filteredProblems}
          solvedMap={solvedMap}
          emptyLabel={t('problems.empty')}
          openLabel={t('problems.openProblem')}
          headings={{
            index: t('problems.table.index'),
            title: t('problems.table.title'),
            difficulty: t('problems.table.difficulty'),
            acceptance: t('problems.table.acceptance'),
            action: t('problems.table.action'),
          }}
          difficultyLabels={difficultyLabels}
          onOpenProblem={openPreview}
          isUrdu={isUrdu}
        />
      </Card>

      <ProblemPreviewPanel
        open={Boolean(previewProblem)}
        problem={previewProblem}
        selectedLanguage={previewLanguage}
        onLanguageChange={setPreviewLanguage}
        onClose={() => setPreviewProblem(null)}
        onStart={startProblem}
        labels={{
          preview: t('problems.preview'),
          start: t('problems.start'),
          language: t('problems.filters.language'),
          time: t('problems.timeLabel'),
          skills: t('problems.skillsLabel'),
          close: t('actions.close'),
        }}
        difficultyLabels={difficultyLabels}
        languageLabels={languageLabels}
        isUrdu={isUrdu}
      />
    </section>
  )
}
