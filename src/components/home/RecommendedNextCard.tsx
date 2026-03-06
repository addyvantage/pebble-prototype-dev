import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { useI18n } from '../../i18n/useI18n'
import { getRecommendedNext, loadSkippedProblems, saveSkippedProblems } from '../../lib/homeCacheStore'
import { getRecentActivity } from '../../lib/recentStore'
import { isProblemSolved } from '../../lib/solvedStore'
import { PROBLEMS_BANK } from '../../data/problemsBank'
import { getLocalizedProblem } from '../../i18n/problemContent'
import { DifficultyPill } from '../ui/DifficultyPill'
import { Link } from 'react-router-dom'
import { buttonClass } from '../ui/buttonStyles'
import { RefreshCw, Zap, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useTheme } from '../../hooks/useTheme'

interface RecommendedNextCardProps {
    className?: string;
}

export function RecommendedNextCard({ className }: RecommendedNextCardProps) {
    const { t, lang, isRTL } = useI18n()
    const { theme } = useTheme()
    const [problemId, setProblemId] = useState<string>('')
    const [isExpanded, setIsExpanded] = useState(false)
    const recent = getRecentActivity()
    const primaryInsetClass = theme === 'dark'
        ? 'border border-pebble-accent/18 bg-pebble-accent/10'
        : 'border border-pebble-accent/18 bg-[rgba(233,241,255,0.92)]'
    const quietInsetClass = theme === 'dark'
        ? 'border border-pebble-border/16 bg-pebble-overlay/[0.05]'
        : 'border border-pebble-border/18 bg-white/62'
    const darkMetaChipClass = theme === 'dark'
        ? 'pebble-chip text-[hsl(220_16%_84%)]'
        : 'pebble-chip text-pebble-text-secondary'
    const darkReasonLabelClass = theme === 'dark'
        ? 'text-[hsl(220_12%_76%)]'
        : 'text-pebble-text-muted'
    const darkBodyClass = theme === 'dark'
        ? 'text-[hsl(220_14%_80%)]'
        : 'text-pebble-text-secondary'

    useEffect(() => {
        const id = getRecommendedNext(PROBLEMS_BANK, recent?.problemId ?? null, isProblemSolved)
        setProblemId(id || '')
    }, [recent?.problemId])

    const handleShuffle = () => {
        if (!problemId) return
        const recent = getRecentActivity()

        // Add current to skips for today
        const skipped = loadSkippedProblems()
        skipped.problemIds.push(problemId)
        saveSkippedProblems(skipped)

        // Get next
        const id = getRecommendedNext(PROBLEMS_BANK, recent?.problemId ?? null, isProblemSolved, true)
        setProblemId(id || '')
    }

    if (!problemId) {
        return (
            <>
                <Card className={`card-premium flex flex-col rounded-[24px] p-5 ${className || ''}`}>
                    <div className="mb-3 flex items-center gap-2 text-pebble-accent xl:mb-3">
                        <Zap className="h-4 w-4" aria-hidden="true" />
                        <h2 className={`text-sm font-semibold text-pebble-text-primary tracking-[0.04em] ${isRTL ? 'rtlText' : ''}`}>
                            {t('home.recommended.title')}
                        </h2>
                    </div>
                    <div className={`mb-3 flex-1 rounded-[18px] p-5 text-center ${quietInsetClass}`}>
                        <p className="text-sm font-medium text-pebble-text-primary">{t('home.recommended.emptyQueue')}</p>
                        <p className="mt-2 text-[12.5px] leading-[1.7] text-pebble-text-secondary">
                            Open the browser to pick a fresh concept or revisit a topic you want to sharpen next.
                        </p>
                    </div>
                    <Link
                        to="/problems"
                        className={buttonClass('secondary') + " w-full justify-center"}
                    >
                        {t('home.continue.openProblems')}
                    </Link>
                </Card>
            </>
        )
    }

    const baseProblem = PROBLEMS_BANK.find((p) => p.id === problemId)
    if (!baseProblem) return null

    const localizedProblem = getLocalizedProblem(baseProblem, lang)
    const recentProblem = recent ? PROBLEMS_BANK.find((p) => p.id === recent.problemId) : null
    const topicMatch = recentProblem
        ? baseProblem.topics.find((topic) => recentProblem.topics.includes(topic))
        : null
    const recommendationReason = topicMatch
        ? `Keeps your ${topicMatch} momentum going from the last session.`
        : `Balanced next step to keep your practice streak moving without spiking difficulty.`
    const recoveryCue = baseProblem.difficulty === 'Easy'
        ? 'Low-friction warm-up'
        : baseProblem.difficulty === 'Medium'
            ? 'Momentum-building challenge'
            : 'Stretch rep for confidence'

    return (
        <>
            <Card className={`flex flex-col rounded-[24px] p-5 ${className || ''}`}>
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-pebble-accent">
                        <Zap className="h-4 w-4" aria-hidden="true" />
                        <h2 className={`text-sm font-semibold text-pebble-text-primary tracking-[0.04em] ${isRTL ? 'rtlText' : ''}`}>
                            {t('home.recommended.title')}
                        </h2>
                    </div>
                    <button
                        onClick={handleShuffle}
                        className="text-pebble-text-muted hover:text-pebble-text-primary transition focus:outline-none"
                        title={t('home.recommended.ctaShuffle')}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className={`mb-3 flex-1 rounded-[18px] p-5 ${primaryInsetClass}`}>
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <span className="pebble-chip-strong rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-pebble-accent">
                            Best next move
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${darkMetaChipClass}`}>
                            {baseProblem.estimatedMinutes} min
                        </span>
                    </div>

                    <h3 className={`text-[1.05rem] font-semibold text-pebble-text-primary leading-snug ${isRTL ? 'rtlText' : ''}`}>
                        {localizedProblem.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        <DifficultyPill difficulty={baseProblem.difficulty} />
                        {localizedProblem.topics.slice(0, 1).map((topic) => (
                            <span
                                key={topic}
                                className={`rounded-full border px-2 py-[1px] text-[11px] font-medium whitespace-nowrap ${darkMetaChipClass}`}
                            >
                                {topic}
                            </span>
                        ))}
                        <span className={`rounded-full border px-2 py-[1px] text-[11px] font-medium whitespace-nowrap ${darkMetaChipClass}`}>
                            {recoveryCue}
                        </span>
                    </div>

                    <div className={`mt-4 rounded-[14px] px-3 py-3 ${quietInsetClass}`}>
                        <p className={`text-[11px] uppercase tracking-[0.08em] ${darkReasonLabelClass} ${isRTL ? 'rtlText' : ''}`}>
                            Why Pebble picked this
                        </p>
                        <p className={`mt-1.5 text-[12.5px] leading-[1.68] ${darkBodyClass} ${isRTL ? 'rtlText' : ''}`}>
                            {recommendationReason}
                        </p>
                    </div>
                </div>

                <button
                    disabled={isExpanded}
                    onClick={() => setIsExpanded(true)}
                    className={buttonClass('primary') + " w-full justify-center"}
                >
                    {t('home.recommended.ctaStart')}
                </button>
            </Card>

            {isExpanded && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-pebble-surface-900/40 transition-opacity"
                    onClick={() => setIsExpanded(false)}
                >
                    <div
                        className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-pebble-border/30 bg-pebble-surface-50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.06)] dark:bg-pebble-deep dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)] transform transition-transform animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-pebble-border/10 px-5 py-4 bg-pebble-overlay/[0.02]">
                            <h3 className={`text-base font-semibold text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
                                {localizedProblem.title}
                            </h3>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="ml-4 shrink-0 rounded-full p-1.5 text-pebble-text-muted hover:bg-pebble-overlay/[0.08] hover:text-pebble-text-primary transition-colors focus:outline-none"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="px-5 py-5 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <DifficultyPill difficulty={baseProblem.difficulty} />
                                {localizedProblem.topics.map((topic) => (
                                    <span
                                        key={topic}
                                        className="rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.06] px-2 py-[1px] text-[11px] font-medium text-pebble-text-secondary whitespace-nowrap"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                            <p className={`text-[14px] leading-relaxed text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
                                {localizedProblem.statement.summary || t('problem.description')}
                            </p>
                        </div>

                        <div className="border-t border-pebble-border/10 px-5 py-4 bg-pebble-overlay/[0.02]">
                            <Link
                                to={`/session/1?problem=${problemId}`}
                                className={buttonClass('primary') + " w-full justify-center py-2.5"}
                            >
                                {t('home.recommended.ctaStart')}
                            </Link>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
