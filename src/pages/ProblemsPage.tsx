import { ChevronDown, Search, Shuffle, SlidersHorizontal, Sparkles, Target } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopicCloud } from '../components/problems/TopicCloud'
import {
  ProblemsFilterPopover,
  type ProblemTopicOption,
  type ProblemsFilterState,
} from '../components/problems/ProblemsFilterPopover'
import { ProblemsTable } from '../components/problems/ProblemsTable'
import { ProblemPreviewPanel } from '../components/problems/ProblemPreviewPanel'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useTheme } from '../hooks/useTheme'
import {
  getDefaultProblemLanguage,
  getProblemTopicIds,
  type ProblemDefinition,
  type ProblemLanguage,
  PROBLEMS_BANK,
} from '../data/problemsBank'
import { useI18n } from '../i18n/useI18n'
import { getLocalizedProblem, resolveProblemTitleBundle } from '../i18n/problemContent'
import { getEnglishTopicLabel, localizeTopicLabel } from '../i18n/topicCatalog'
import { loadSolvedProblems, subscribeSolvedProblems, type SolvedProblemsMap } from '../lib/solvedProblemsStore'
import { assertNoEnglishLeak, localizeProblemText, localizeProblemTitle } from '../i18n/problemLocalize'

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
  const { t, isRTL, lang } = useI18n()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isUrdu = isRTL
  const isDark = theme === 'dark'

  const solvedMap = useSyncExternalStore(subscribeSolvedProblems, loadSolvedProblems, loadSolvedProblems)

  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<ProblemsFilterState>(INITIAL_FILTERS)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [previewProblem, setPreviewProblem] = useState<ProblemDefinition | null>(null)
  const [previewLanguage, setPreviewLanguage] = useState<ProblemLanguage>('python')

  const normalizedSearch = searchValue.trim().toLowerCase()
  const englishProblemsById = useMemo(
    () => new Map(PROBLEMS_BANK.map((problem) => [problem.id, problem] as const)),
    [],
  )
  const localizedProblems = useMemo(
    () => PROBLEMS_BANK.map((problem) => getLocalizedProblem(problem, lang)),
    [lang],
  )
  const topicOptions = useMemo(
    () => {
      const counts = new Map<string, number>()
      for (const problem of PROBLEMS_BANK) {
        for (const topicId of getProblemTopicIds(problem)) {
          counts.set(topicId, (counts.get(topicId) ?? 0) + 1)
        }
      }

      return Array.from(counts.entries())
        .map(([id, count]) => ({
          id,
          count,
          englishLabel: getEnglishTopicLabel(id),
          label: localizeTopicLabel(id, lang),
        }))
        .sort((left, right) => right.count - left.count || left.englishLabel.localeCompare(right.englishLabel))
    },
    [lang],
  )
  const topicLabelById = useMemo(
    () => new Map(topicOptions.map((topic) => [topic.id, topic.label] as const)),
    [topicOptions],
  )

  const filteredProblems = useMemo(() => {
    const rows = localizedProblems.filter((problem) => {
      const englishProblem = englishProblemsById.get(problem.id) ?? problem
      const topicIds = getProblemTopicIds(problem)

      if (normalizedSearch) {
        const localizedTopicLabels = topicIds.map((topicId) => topicLabelById.get(topicId) ?? topicId).join(' ')
        const haystack = [
          problem.title,
          englishProblem.title,
          problem.topics.join(' '),
          englishProblem.topics.join(' '),
          localizedTopicLabels,
          problem.keySkills.join(' '),
          englishProblem.keySkills.join(' '),
        ].join(' ').toLowerCase()
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
        const hasAll = filters.topics.every((topic) => topicIds.includes(topic))
        const hasAny = filters.topics.some((topic) => topicIds.includes(topic))
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
        const leftId = getProblemTopicIds(left)[0] ?? ''
        const rightId = getProblemTopicIds(right)[0] ?? ''
        const leftTopic = topicLabelById.get(leftId) ?? localizeTopicLabel(leftId, lang)
        const rightTopic = topicLabelById.get(rightId) ?? localizeTopicLabel(rightId, lang)
        return leftTopic.localeCompare(rightTopic) || left.title.localeCompare(right.title)
      }

      if (sortMode === 'lastSolved') {
        return getSolvedTimestamp(solvedMap, right.id) - getSolvedTimestamp(solvedMap, left.id)
      }

      return left.createdAtRank - right.createdAtRank
    })
  }, [englishProblemsById, filters, localizedProblems, normalizedSearch, solvedMap, sortMode, topicLabelById])

  const solvedCount = useMemo(
    () => localizedProblems.filter((problem) => solvedMap[problem.id]?.solvedAt).length,
    [localizedProblems, solvedMap],
  )

  const filteredSolved = useMemo(
    () => filteredProblems.filter((problem) => solvedMap[problem.id]?.solvedAt).length,
    [filteredProblems, solvedMap],
  )

  const displayProblems = useMemo(
    () =>
      filteredProblems.map((problem) => {
        const englishProblem = englishProblemsById.get(problem.id) ?? problem
        const bundle = resolveProblemTitleBundle({
          localizedProblem: problem,
          englishProblem,
          lang,
        })
        const localizedTopics = getProblemTopicIds(englishProblem)
          .map((topicId) => topicLabelById.get(topicId) ?? localizeTopicLabel(topicId, lang))

        const nextTitle = localizeProblemTitle(bundle.title, lang)

        if (import.meta.env.DEV) {
          assertNoEnglishLeak(nextTitle, lang, `ProblemsBrowser Title (${problem.id})`)
          localizedTopics.forEach(t => assertNoEnglishLeak(t, lang, `ProblemsBrowser Topic (${problem.id})`))
        }

        return {
          ...problem,
          title: nextTitle,
          topics: localizedTopics,
          statement: {
            ...problem.statement,
            summary: localizeProblemText(bundle.summary, lang),
            description: localizeProblemText(problem.statement.description, lang),
            input: localizeProblemText(problem.statement.input, lang),
            output: localizeProblemText(problem.statement.output, lang),
            constraints: problem.statement.constraints.map(c => localizeProblemText(c, lang)),
          },
        }
      }),
    [englishProblemsById, filteredProblems, lang, topicLabelById],
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
    if (displayProblems.length === 0) {
      return
    }
    const randomIndex = Math.floor(Math.random() * displayProblems.length)
    openPreview(displayProblems[randomIndex])
  }

  function toggleTopicFromCloud(topicId: string) {
    setFilters((prev) => {
      const selected = prev.topics.includes(topicId)
      return {
        ...prev,
        topics: selected ? prev.topics.filter((item) => item !== topicId) : [...prev.topics, topicId],
      }
    })
  }

  const languageLabels: Record<ProblemLanguage, string> = {
    python: t('problems.languagePython'),
    javascript: t('problems.languageJavaScript'),
    java: t('problems.languageJava'),
    cpp: t('problems.languageCpp'),
    c: t('problems.languageC'),
    sql: t('problems.languageSql'),
  }
  const difficultyLabels = {
    Easy: t('difficulty.easy'),
    Medium: t('difficulty.medium'),
    Hard: t('difficulty.hard'),
  } as const
  const eyebrowPillClass = isDark
    ? 'inline-flex items-center gap-1.5 rounded-full border border-[rgba(132,168,255,0.24)] bg-[linear-gradient(180deg,rgba(20,31,62,0.78)_0%,rgba(14,24,49,0.84)_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[hsl(218_85%_92%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_6px_16px_rgba(8,15,35,0.18)] transition-colors duration-150 hover:border-[rgba(144,182,255,0.34)] hover:text-[hsl(220_100%_96%)]'
    : 'inline-flex items-center gap-1.5 rounded-full border border-[rgba(88,122,196,0.16)] bg-[linear-gradient(180deg,rgba(250,252,255,0.96)_0%,rgba(240,246,255,0.9)_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[hsl(222_34%_34%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_6px_16px_rgba(89,109,148,0.06)] transition-colors duration-150 hover:border-[rgba(88,122,196,0.24)] hover:text-[hsl(222_36%_28%)]'
  const eyebrowIconClass = isDark ? 'h-3.5 w-3.5 text-[hsl(216_92%_74%)]' : 'h-3.5 w-3.5 text-[hsl(220_82%_56%)]'

  return (
    <section className="page-enter space-y-2 pb-2">
      <Card padding="sm" interactive className="problems-page-shell overflow-hidden rounded-[28px] px-4 py-3 md:px-5 md:py-3.5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pebble-overlay/72 to-transparent" />
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-pebble-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[48rem] space-y-1">
            <div className={`pebble-section-label ${eyebrowPillClass}`}>
              <Sparkles className={eyebrowIconClass} aria-hidden="true" />
              {t('problems.eyebrow.practice')}
            </div>
            <div className="space-y-0.5">
              <h1 className={`text-[1.52rem] font-semibold tracking-[-0.02em] text-pebble-text-primary md:text-[1.82rem] ${isUrdu ? 'rtlText' : ''}`}>
                {t('problems.title')}
              </h1>
              <p className={`max-w-[46rem] text-[12.5px] leading-[1.55] text-pebble-text-secondary md:text-[13.5px] ${isUrdu ? 'rtlText' : ''}`}>
                {t('problems.subtitle')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 lg:min-w-[390px]">
            <div className="problems-subsection-shell rounded-[16px] px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-pebble-text-muted">{t('problems.stats.library')}</p>
              <p className="mt-0.5 text-[0.98rem] font-semibold tracking-[-0.01em] text-pebble-text-primary">{localizedProblems.length}</p>
            </div>
            <div className="problems-subsection-shell rounded-[16px] px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-pebble-text-muted">{t('problems.filters.solved')}</p>
              <p className="mt-0.5 text-[0.98rem] font-semibold tracking-[-0.01em] text-pebble-text-primary">{solvedCount}</p>
            </div>
            <div className="problems-subsection-shell rounded-[16px] px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-pebble-text-muted">{t('problems.stats.filtered')}</p>
              <p className="mt-0.5 text-[0.98rem] font-semibold tracking-[-0.01em] text-pebble-text-primary">{filteredProblems.length}</p>
            </div>
          </div>
        </div>
      </Card>

      <TopicCloud
        topics={topicOptions}
        selectedTopics={filters.topics}
        onToggleTopic={toggleTopicFromCloud}
        title={t('problems.topicsTitle')}
        subtitle={t('problems.topicsSubtitle')}
        isUrdu={isUrdu}
      />

      <Card
        padding="sm"
        interactive
        className="problems-focus-shell relative z-20 overflow-visible rounded-[26px] px-4 py-2.5 md:px-4.5 md:py-3"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="space-y-0.5">
              <div className={`pebble-section-label ${eyebrowPillClass}`}>
                <SlidersHorizontal className={eyebrowIconClass} aria-hidden="true" />
                {t('problems.eyebrow.command')}
              </div>
              <p className={`text-[12.5px] leading-[1.5] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                {t('problems.eyebrow.searchHint')}
              </p>
            </div>
            <div className={`pebble-chip inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${isUrdu ? 'rtlText' : ''}`}>
              <Target className="h-3.5 w-3.5 text-pebble-accent" aria-hidden="true" />
              {t('problems.solvedCounter', { solved: solvedCount, total: localizedProblems.length })}
              <span className="ltrSafe text-pebble-text-muted">({filteredSolved}/{filteredProblems.length})</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <label className="relative min-w-[280px] flex-[1.4]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble-text-muted" aria-hidden="true" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t('problems.searchPlaceholder')}
                className={`pebble-control h-10 w-full rounded-2xl pl-10 pr-4 text-[13.5px] placeholder:text-pebble-text-muted ${isUrdu ? 'rtlText text-right' : ''
                  }`}
              />
            </label>

            <ProblemsFilterPopover
              value={filters}
              onApply={setFilters}
              onReset={() => setFilters(INITIAL_FILTERS)}
              topicOptions={topicOptions.map((entry): ProblemTopicOption => ({ id: entry.id, label: entry.label }))}
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
                languageC: t('problems.languageC'),
                languageSql: t('problems.languageSql'),
              }}
            />

            <label className="relative inline-flex h-10 min-w-[152px] items-center">
              <select
                value={filters.difficulty}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    difficulty: event.target.value as ProblemsFilterState['difficulty'],
                  }))
                }
                className="h-full w-full appearance-none rounded-2xl border border-pebble-border/28 bg-pebble-chip-surface/82 pl-3 pr-10 text-sm text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
                aria-label={t('problems.filters.difficulty')}
              >
                <option value="any">{t('problems.filters.anyDifficulty')}</option>
                <option value="easy">{t('difficulty.easy')}</option>
                <option value="medium">{t('difficulty.medium')}</option>
                <option value="hard">{t('difficulty.hard')}</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center justify-center text-pebble-text-secondary">
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </span>
            </label>

            <label className="relative inline-flex h-10 min-w-[152px] items-center">
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-full w-full appearance-none rounded-2xl border border-pebble-border/28 bg-pebble-chip-surface/82 pl-3 pr-10 text-sm text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
                aria-label={t('problems.sort.label')}
              >
                <option value="newest">{t('problems.sort.newest')}</option>
                <option value="difficulty">{t('problems.sort.difficulty')}</option>
                <option value="acceptance">{t('problems.sort.acceptance')}</option>
                <option value="topic">{t('problems.sort.topic')}</option>
                <option value="lastSolved">{t('problems.sort.lastSolved')}</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center justify-center text-pebble-text-secondary">
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </span>
            </label>

            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={pickRandomProblem}
                disabled={filteredProblems.length === 0}
                className="h-10 rounded-2xl gap-1.5 border-pebble-accent/22 bg-pebble-accent/10 text-pebble-text-primary hover:bg-pebble-accent/14"
              >
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                {t('problems.random')}
              </Button>
            </div>
          </div>
        </div>

      </Card>

      <Card padding="sm" interactive className="problems-page-shell relative z-0 rounded-[30px] px-4 py-3 md:px-5 md:py-3">
        <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-pebble-text-muted">{t('problems.results.label')}</p>
            <h2 className={`mt-0.5 text-[1.02rem] font-semibold tracking-tight text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
              {t('problems.results.title')}
            </h2>
          </div>
          <p className={`max-w-[42rem] text-[13px] leading-[1.55] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
            {t('problems.results.hint')}
          </p>
        </div>

        <ProblemsTable
          rows={displayProblems}
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
        minuteSuffix={t('problem.minuteSuffix')}
        isUrdu={isUrdu}
      />
    </section>
  )
}
