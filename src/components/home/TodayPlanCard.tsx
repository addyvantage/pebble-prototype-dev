import { useEffect, useState, useRef } from 'react'
import { Card } from '../ui/Card'
import { useI18n } from '../../i18n/useI18n'
import { Check, Sparkles, ChevronRight, Flame, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { loadDailyPlan, toggleTaskDone, computeStreak, computeEffortScore, type PlanState } from '../../lib/planStore'
import { generatePlan, type PlannerContext } from '../../api/plan'
import { loadSolvedProblems } from '../../lib/solvedProblemsStore'
import { getRecentActivity } from '../../lib/recentStore'
import { PROBLEMS_BANK } from '../../data/problemsBank'
import { Link } from 'react-router-dom'
import { buttonClass } from '../ui/buttonStyles'

function classNames(...values: Array<string | undefined>) {
    return values.filter(Boolean).join(' ')
}

export function TodayPlanCard() {
    const { t, lang, isRTL } = useI18n()
    const [state, setState] = useState<PlanState>(loadDailyPlan)
    const [streak, setStreak] = useState(0)
    const [isGenerating, setIsGenerating] = useState(false)

    // Modal state
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
    const [isAnimating, setIsAnimating] = useState(false)
    const modalRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        const onFocus = () => {
            setState(loadDailyPlan())
            setStreak(computeStreak())
        }
        onFocus()
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [])

    const handleToggleCheck = (taskId: string) => {
        const nextState = toggleTaskDone(taskId)
        setState(nextState)
        setStreak(computeStreak())
    }

    const openModal = (taskId: string) => {
        previousFocusRef.current = document.activeElement as HTMLElement
        setExpandedTaskId(taskId)
        setIsAnimating(true)
        document.body.style.overflow = 'hidden'
        // Delay focus slightly to allow render
        setTimeout(() => {
            modalRef.current?.focus()
        }, 50)
    }

    const closeModal = () => {
        setIsAnimating(false)
        setTimeout(() => {
            setExpandedTaskId(null)
            document.body.style.overflow = ''
            previousFocusRef.current?.focus()
        }, 200) // Match animation duration
    }

    // ESC to close
    useEffect(() => {
        if (!expandedTaskId) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [expandedTaskId])

    const handleGenerate = async () => {
        if (isGenerating) return
        setIsGenerating(true)
        try {
            const solvedMap = loadSolvedProblems()
            const recentAct = getRecentActivity()
            const now = Date.now()
            const sevenDays = 7 * 24 * 60 * 60 * 1000

            const solvedEntries = Object.entries(solvedMap)
                .filter(([_, data]) => data.solvedAt > 0)
                .sort((a, b) => b[1].solvedAt - a[1].solvedAt)

            const solvedLast7Days = solvedEntries.filter(([_, data]) => now - data.solvedAt <= sevenDays).length

            const last20 = solvedEntries.slice(0, 20).map(([id]) => PROBLEMS_BANK.find(p => p.id === id)).filter(Boolean) as typeof PROBLEMS_BANK

            const difficultyBreakdownLast20 = { easy: 0, medium: 0, hard: 0 }
            const topicTally: Record<string, number> = {}

            last20.forEach((p) => {
                if (p.difficulty === 'Easy') difficultyBreakdownLast20.easy++
                if (p.difficulty === 'Medium') difficultyBreakdownLast20.medium++
                if (p.difficulty === 'Hard') difficultyBreakdownLast20.hard++
                p.topics.forEach((t) => {
                    topicTally[t] = (topicTally[t] || 0) + 1
                })
            })

            const recentTopicsTop5 = Object.entries(topicTally)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map((x) => x[0])

            const recentLanguagesTop3 = recentAct ? ['python', 'javascript'] : ['python'] // mocked default

            const context: PlannerContext = {
                lang: lang as any,
                isRTL,
                dateISO: new Date().toISOString().split('T')[0]!,
                userStats: {
                    solvedTotal: solvedEntries.length,
                    solvedLast7Days,
                    difficultyBreakdownLast20,
                    recentTopicsTop5,
                    recentLanguagesTop3
                },
                preferences: {
                    sessionLengthMinutes: 25,
                    focus: 'mixed'
                }
            }

            const newPlan = await generatePlan(context)
            const nextState: PlanState = {
                date: context.dateISO,
                plan: newPlan,
                completedTasks: []
            }
            // using exact same update pattern
            setState(nextState)
            // also we can't completely avoid planStore's internal toggle so we just save it
            localStorage.setItem('pebble.plan.v1', JSON.stringify(nextState))
            setStreak(computeStreak())

        } catch (err) {
            console.error(err)
        } finally {
            setIsGenerating(false)
        }
    }

    const plan = state.plan
    const currentEffort = computeEffortScore(plan, state.completedTasks)
    const expandedTask = plan?.tasks.find(t => t.id === expandedTaskId)
    const portalHost = document.getElementById('pebble-portal') ?? document.body

    return (
        <>
            <Card className="flex flex-col p-3 bg-pebble-overlay/[0.04]">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                        <h2 className={`text-[13.5px] font-semibold text-pebble-text-primary tracking-tight ${isRTL ? 'rtlText' : ''}`}>
                            {plan ? plan.title : t('home.todayPlan.title')}
                        </h2>
                        <p className={`text-xs text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
                            {plan ? plan.subtitle : t('home.todayPlan.subtitle')}
                        </p>
                    </div>
                    {plan && (
                        <div className="flex items-center gap-2">
                            {streak > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
                                    <Flame className="h-3 w-3" />
                                    {t('home.plan.streak', { count: String(streak) })}
                                </span>
                            )}
                            <span className="inline-flex items-center rounded-full border border-pebble-accent/20 bg-pebble-accent/10 px-2 py-0.5 text-xs font-medium text-pebble-accent">
                                {t('home.plan.effortScore', { score: `${currentEffort}/${plan.scoring.targetEffortScore}` })}
                            </span>
                        </div>
                    )}
                </div>

                {!plan ? (
                    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-pebble-border/30 bg-pebble-overlay/[0.02] py-4 px-3 text-center">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={classNames(buttonClass('primary'), "w-full sm:w-auto", isGenerating ? "opacity-50 cursor-not-allowed" : undefined)}
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {isGenerating ? t('home.plan.generating') : t('home.plan.generate')}
                        </button>
                        <p className={`mt-3 text-xs text-pebble-text-muted ${isRTL ? 'rtlText' : ''}`}>
                            Get a personalized plan based on your recent activity
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <ul className="flex flex-col gap-2">
                            {plan.tasks.map((task) => {
                                const checked = state.completedTasks.includes(task.id)
                                return (
                                    <li key={task.id} className="relative overflow-hidden rounded-[10px] border border-pebble-border/20 bg-pebble-canvas/60 transition-all">
                                        {/* Left hit area — toggles completion (~50% width) */}
                                        <button
                                            type="button"
                                            aria-pressed={checked}
                                            aria-label={checked ? `Mark "${task.label}" incomplete` : `Mark "${task.label}" complete`}
                                            onClick={() => handleToggleCheck(task.id)}
                                            className="absolute inset-y-0 left-0 z-10 w-1/2 rounded-l-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pebble-accent/45"
                                        />
                                        {/* Right hit area — opens detail modal (~50% width) */}
                                        <button
                                            type="button"
                                            aria-label={`View details for "${task.label}"`}
                                            onClick={() => openModal(task.id)}
                                            className="absolute inset-y-0 right-0 z-10 w-1/2 rounded-r-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pebble-accent/45"
                                        />
                                        {/* Visual content — pointer-events-none so overlay buttons capture all events */}
                                        <div
                                            className={classNames(
                                                'flex w-full items-start gap-2.5 px-2.5 py-2 pointer-events-none select-none transition',
                                                checked ? 'opacity-60 bg-pebble-overlay/[0.02]' : ''
                                            )}
                                        >
                                            <div
                                                className={classNames(
                                                    'mt-0.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition',
                                                    checked
                                                        ? 'border-pebble-success/40 bg-pebble-success/18 text-pebble-success'
                                                        : 'border-pebble-border/40 bg-pebble-overlay/[0.05] text-transparent'
                                                )}
                                            >
                                                <Check className="h-3 w-3" strokeWidth={3} />
                                            </div>
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className={classNames(
                                                            'text-sm font-semibold truncate transition',
                                                            checked ? 'text-pebble-text-muted line-through' : 'text-pebble-text-primary'
                                                        )}
                                                        dir={isRTL ? 'rtl' : 'ltr'}
                                                    >
                                                        {task.label}
                                                    </span>
                                                    <span className="shrink-0 text-[11px] font-medium text-pebble-text-muted bg-pebble-overlay/[0.06] px-1.5 py-0.5 rounded">
                                                        {t('home.plan.estimatedMinutes', { mins: String(task.estimatedMinutes) })}
                                                    </span>
                                                </div>
                                                <span
                                                    className={classNames(
                                                        'mt-0.5 text-xs line-clamp-1 transition',
                                                        checked ? 'text-pebble-text-muted/60' : 'text-pebble-text-secondary'
                                                    )}
                                                    dir={isRTL ? 'rtl' : 'ltr'}
                                                >
                                                    {task.detail}
                                                </span>
                                            </div>
                                            <div className="mt-1 shrink-0 text-pebble-text-muted">
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                        <div className="flex items-center justify-between border-t border-pebble-border/15 pt-2">
                            <p className={`text-xs italic text-pebble-text-muted ${isRTL ? 'rtlText' : ''}`}>
                                {plan.scoring.note}
                            </p>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="text-xs font-medium text-pebble-accent hover:text-pebble-text-primary transition disabled:opacity-50"
                            >
                                {isGenerating ? t('home.plan.generating') : t('home.plan.regenerate')}
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {expandedTask && createPortal(
                <div
                    className={classNames(
                        "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-pebble-overlay/[0.30] backdrop-blur-sm transition-opacity duration-200 ease-out",
                        isAnimating ? "opacity-100" : "opacity-0"
                    )}
                    onClick={closeModal}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <div
                        ref={modalRef}
                        tabIndex={-1}
                        className={classNames(
                            "w-full max-w-[420px] overflow-hidden rounded-2xl border border-pebble-border/20 bg-pebble-canvas shadow-[0_32px_80px_-20px_rgba(0,0,0,0.35)] dark:shadow-[0_32px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl transform transition-all duration-200 outline-none relative",
                            isAnimating ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Subtle top sheen */}
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-pebble-overlay/[0.08] to-transparent mix-blend-overlay" />

                        <div className="flex items-center justify-between border-b border-pebble-border/10 px-5 py-4 bg-pebble-overlay/[0.02] relative z-10">
                            <h3 id="modal-title" className={`text-base font-semibold text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
                                {expandedTask.label}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="ml-4 shrink-0 rounded-full p-1.5 text-pebble-text-muted hover:bg-pebble-overlay/[0.08] hover:text-pebble-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/50"
                                aria-label="Close dialog"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-5 py-6 space-y-6 relative z-10">
                            <div>
                                <p className={`font-semibold text-[11px] uppercase tracking-[0.08em] text-pebble-accent mb-2.5 ${isRTL ? 'rtlText' : ''}`}>
                                    {t('home.plan.why')}
                                </p>
                                <p className={`text-[14px] leading-relaxed text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
                                    {expandedTask.panel.why}
                                </p>
                            </div>
                            <div>
                                <p className={`font-semibold text-[11px] uppercase tracking-[0.08em] text-pebble-accent mb-2.5 ${isRTL ? 'rtlText' : ''}`}>
                                    {t('home.plan.definitionOfDone')}
                                </p>
                                <ul className="space-y-2.5">
                                    {expandedTask.panel.definitionOfDone.map((bullet, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pebble-text-muted/60" />
                                            <span className={`text-[14px] leading-relaxed text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
                                                {bullet}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="border-t border-pebble-border/10 px-5 py-4 bg-pebble-overlay/[0.02] relative z-10">
                            <Link
                                to={expandedTask.panel.nextAction.href}
                                onClick={closeModal}
                                className={classNames(buttonClass('primary'), "w-full justify-center py-2.5 shadow-sm")}
                            >
                                {expandedTask.panel.nextAction.label}
                            </Link>
                        </div>
                    </div>
                </div>,
                portalHost
            )}
        </>
    )
}
