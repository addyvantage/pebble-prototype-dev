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

interface RecommendedNextCardProps {
    className?: string;
}

export function RecommendedNextCard({ className }: RecommendedNextCardProps) {
    const { t, lang, isRTL } = useI18n()
    const [problemId, setProblemId] = useState<string>('')
    const [isExpanded, setIsExpanded] = useState(false)

    useEffect(() => {
        const recent = getRecentActivity()
        const id = getRecommendedNext(PROBLEMS_BANK, recent?.problemId ?? null, isProblemSolved)
        setProblemId(id || '')
    }, [])

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
                <Card className={`flex flex-col p-3 bg-pebble-overlay/[0.04] ${className || ''}`}>
                    <div className="flex items-center gap-2 text-pebble-accent mb-2 xl:mb-2.5">
                        <Zap className="h-4 w-4" aria-hidden="true" />
                        <h2 className={`text-sm font-semibold text-pebble-text-primary tracking-[0.04em] ${isRTL ? 'rtlText' : ''}`}>
                            {t('home.recommended.title')}
                        </h2>
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center rounded-xl border border-pebble-border/25 bg-pebble-canvas/50 p-2.5 mb-2 text-center">
                        <p className="text-sm text-pebble-text-secondary">{t('home.recommended.emptyQueue')}</p>
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

    return (
        <>
            <Card className={`flex flex-col p-3 bg-pebble-overlay/[0.04] ${className || ''}`}>
                <div className="flex items-center justify-between mb-2 xl:mb-2.5">
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

                <div className="flex-1 flex flex-col justify-center rounded-xl border border-pebble-border/25 bg-pebble-canvas/50 p-2.5 mb-2">
                    <h3 className={`text-base font-medium text-pebble-text-primary leading-snug mb-1.5 ${isRTL ? 'rtlText' : ''}`}>
                        {localizedProblem.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2">
                        <DifficultyPill difficulty={baseProblem.difficulty} />
                        {localizedProblem.topics.slice(0, 1).map((topic) => (
                            <span
                                key={topic}
                                className="rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.06] px-2 py-[1px] text-[11px] font-medium text-pebble-text-secondary whitespace-nowrap"
                            >
                                {topic}
                            </span>
                        ))}
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
                        className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-pebble-border/30 bg-pebble-surface-50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.06)] dark:bg-[#0B0E14] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)] transform transition-transform animate-in zoom-in-95 duration-200"
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
