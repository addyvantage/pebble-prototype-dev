import { useEffect, useState, useRef } from 'react'
import { Card } from '../ui/Card'
import { useI18n } from '../../i18n/useI18n'
import { Check, Sparkles, Flame, X, RefreshCw, Gauge } from 'lucide-react'
import { createPortal } from 'react-dom'
import { loadDailyPlan, saveDailyPlan, toggleTaskDone, computeStreak, type PlanState } from '../../lib/planStore'
import { generatePlan, type PlannerContext } from '../../api/plan'
import { loadSolvedProblems } from '../../lib/solvedProblemsStore'
import { getRecentActivity } from '../../lib/recentStore'
import { PROBLEMS_BANK } from '../../data/problemsBank'
import { Link } from 'react-router-dom'
import { buttonClass } from '../ui/buttonStyles'
import { useTheme } from '../../hooks/useTheme'

function classNames(...values: Array<string | undefined>) {
    return values.filter(Boolean).join(' ')
}

const FOCUS_TARGET_MINUTES = 25

type FocusLoadState = 'neutral' | 'balanced' | 'stretch' | 'heavy'

function getPlannedMinutes(tasks: Array<{ estimatedMinutes: number }>) {
    return tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)
}

function getFocusLoadState(plannedMinutes: number, targetMinutes: number): FocusLoadState {
    if (plannedMinutes <= 0) return 'neutral'
    if (plannedMinutes <= targetMinutes) return 'balanced'
    if (plannedMinutes <= targetMinutes * 1.35) return 'stretch'
    return 'heavy'
}

function getFocusLoadLabel(state: FocusLoadState) {
    if (state === 'balanced') return 'Balanced'
    if (state === 'stretch') return 'Stretch'
    if (state === 'heavy') return 'Heavy'
    return 'Neutral'
}

function buildExpectedOutcome(params: {
    tasks: Array<{ label: string; detail: string; estimatedMinutes: number }>
    streak: number
    plannedMinutes: number
    loadState: FocusLoadState
}) {
    const { tasks, streak, plannedMinutes, loadState } = params
    const labels = tasks.map((task) => `${task.label} ${task.detail}`.toLowerCase()).join(' ')

    const mentionsReview = /review|mistake|incorrect|rerun|recovery/.test(labels)
    const mentionsWarmup = /warm|win|start|fresh|first/.test(labels)
    const mentionsDrill = /drill|specific|syntax|api|focus|practice/.test(labels)

    if (streak === 0 && mentionsWarmup) {
        return 'Today should leave you back in rhythm with one clean win and a clearer next step.'
    }

    if (mentionsReview && mentionsWarmup) {
        return 'By the end of this session, you should have one clean win, one reviewed mistake, and better recovery flow.'
    }

    if (loadState === 'heavy') {
        return 'A short focused session should rebuild momentum without letting the workload sprawl.'
    }

    if (mentionsDrill && plannedMinutes <= FOCUS_TARGET_MINUTES) {
        return 'You should finish with one solved rep, one review insight, and a cleaner recovery loop.'
    }

    if (plannedMinutes <= 20) {
        return 'This session should help you leave with momentum restored, not mentally drained.'
    }

    return 'You should finish today with steady momentum, one completed focus loop, and stronger confidence for the next session.'
}

export function TodayPlanCard() {
    const { t, lang, isRTL } = useI18n()
    const { theme } = useTheme()
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
            setState(nextState)
            saveDailyPlan(nextState)
            setStreak(computeStreak())

        } catch (err) {
            console.error(err)
        } finally {
            setIsGenerating(false)
        }
    }

    const plan = state.plan
    const plannedMinutes = plan ? getPlannedMinutes(plan.tasks.slice(0, 3)) : 0
    const focusLoadState = getFocusLoadState(plannedMinutes, FOCUS_TARGET_MINUTES)
    const loadRatio = plannedMinutes > 0 ? plannedMinutes / FOCUS_TARGET_MINUTES : 0
    const pacingBarWidth = Math.max(12, Math.min(100, Math.round(loadRatio * 100)))
    const expandedTask = plan?.tasks.find(t => t.id === expandedTaskId)
    const portalHost = document.getElementById('pebble-portal') ?? document.body
    const planSurfaceClass = theme === 'dark'
        ? 'landing-primary-card border-pebble-accent/20'
        : 'landing-primary-card border-pebble-accent/18'
    const taskRowClass = theme === 'dark'
        ? 'border border-pebble-border/18 bg-pebble-canvas/38 hover:bg-pebble-canvas/50'
        : 'border border-pebble-border/22 bg-[rgba(240,245,253,0.92)] hover:bg-[rgba(233,240,251,1)]'
    const insetPanelClass = 'landing-inset'
    const darkMetaChipClass = theme === 'dark'
        ? 'pebble-chip text-[hsl(220_16%_84%)]'
        : 'pebble-chip text-pebble-text-muted'
    const darkSubtitleClass = theme === 'dark'
        ? 'text-[hsl(220_14%_80%)]'
        : 'text-pebble-text-secondary'
    const darkLabelClass = theme === 'dark'
        ? 'text-[hsl(220_12%_76%)]'
        : 'text-pebble-text-muted'
    const streakChipClass = theme === 'dark'
        ? 'border-orange-300/38 bg-orange-400/16 text-[hsl(33_100%_76%)]'
        : 'border-orange-500/20 bg-orange-500/10 text-orange-500'
    const loadChipClass = focusLoadState === 'balanced'
        ? theme === 'dark'
            ? 'border-emerald-300/26 bg-emerald-400/14 text-[hsl(156_78%_76%)]'
            : 'border-emerald-500/18 bg-emerald-500/10 text-emerald-700'
        : focusLoadState === 'stretch'
            ? theme === 'dark'
                ? 'border-amber-300/30 bg-amber-400/14 text-[hsl(40_100%_78%)]'
                : 'border-amber-500/18 bg-amber-500/10 text-amber-700'
            : focusLoadState === 'heavy'
                ? theme === 'dark'
                    ? 'border-orange-300/30 bg-orange-400/15 text-[hsl(26_100%_79%)]'
                    : 'border-orange-500/18 bg-orange-500/10 text-orange-700'
                : theme === 'dark'
                    ? 'border-pebble-border/26 bg-pebble-overlay/[0.08] text-[hsl(220_16%_82%)]'
                    : 'border-pebble-border/18 bg-pebble-overlay/[0.06] text-pebble-text-secondary'
    const loadStateDotClass = focusLoadState === 'balanced'
        ? 'bg-emerald-500'
        : focusLoadState === 'stretch'
            ? 'bg-amber-500'
            : focusLoadState === 'heavy'
                ? 'bg-orange-500'
                : 'bg-pebble-text-muted/65'
    const outcomeLabelClass = theme === 'dark'
        ? 'text-[hsl(220_12%_76%)]'
        : 'text-pebble-text-muted'
    const outcomeBodyClass = theme === 'dark'
        ? 'text-[hsl(220_18%_88%)]'
        : 'text-[hsl(223_28%_24%)]'
    const outcomeStripClass = 'landing-inset-strong shadow-none'
    const pacingBarClass = focusLoadState === 'balanced'
        ? 'bg-emerald-500/82 shadow-[0_0_18px_rgba(16,185,129,0.22)]'
        : focusLoadState === 'stretch'
            ? 'bg-amber-500/82 shadow-[0_0_18px_rgba(245,158,11,0.24)]'
            : focusLoadState === 'heavy'
                ? 'bg-orange-500/84 shadow-[0_0_18px_rgba(249,115,22,0.22)]'
                : 'bg-pebble-accent/70 shadow-[0_0_18px_rgba(59,130,246,0.18)]'
    const expectedOutcome = plan
        ? buildExpectedOutcome({
            tasks: plan.tasks.slice(0, 3),
            streak,
            plannedMinutes,
            loadState: focusLoadState,
        })
        : null

    return (
        <>
            <Card className={`flex flex-col rounded-[24px] p-5 lg:p-6 ${planSurfaceClass}`}>
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="pebble-chip-strong rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-pebble-accent">
                                Daily loop
                            </span>
                            <span className={`landing-chip-muted rounded-full px-2 py-0.5 text-[10px] ${darkMetaChipClass}`}>
                                25 min focus
                            </span>
                        </div>
                        <h2 className={`text-[15px] font-semibold text-pebble-text-primary tracking-tight ${isRTL ? 'rtlText' : ''}`}>
                            {plan ? plan.title : t('home.todayPlan.title')}
                        </h2>
                        <p className={`max-w-[42ch] text-[13px] leading-[1.68] ${darkSubtitleClass} ${isRTL ? 'rtlText' : ''}`}>
                            {plan ? plan.subtitle : t('home.todayPlan.subtitle')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {plan && streak > 0 && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${streakChipClass}`}>
                                <Flame className="h-3 w-3" />
                                {t('home.plan.streak', { count: String(streak) })}
                            </span>
                        )}
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${loadChipClass}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${loadStateDotClass}`} />
                            <span>{`Focus load ${plannedMinutes}/${FOCUS_TARGET_MINUTES}m`}</span>
                            {plan ? (
                                <span className="text-[10px] font-semibold tracking-[0.02em] opacity-80">
                                    {getFocusLoadLabel(focusLoadState)}
                                </span>
                            ) : null}
                        </span>
                    </div>
                </div>

                {!plan ? (
                    <div className={`rounded-[18px] border border-dashed px-4 py-6 ${insetPanelClass}`}>
                        <div className="mx-auto max-w-[36rem] text-center">
                            <p className={`text-[13px] font-medium text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
                                Generate a focused set of small wins from your recent momentum.
                            </p>
                            <p className={`mt-2 text-[12.5px] leading-[1.7] text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
                                Pebble will shape one warm-up, one recovery task, and one review step so the session starts with clear intent.
                            </p>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={classNames(buttonClass('primary'), "mt-4 w-full sm:mx-auto sm:w-auto min-w-[182px] px-6 text-[14px]", isGenerating ? "opacity-50 cursor-not-allowed" : undefined)}
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {isGenerating ? t('home.plan.generating') : t('home.plan.generate')}
                        </button>
                        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                            {[t('home.todayPlan.item1'), t('home.todayPlan.item2'), t('home.todayPlan.item3')].map((item) => (
                                <div key={item} className={`rounded-[14px] px-3 py-3 text-left ${insetPanelClass}`}>
                                    <p className={`text-[12px] font-medium leading-[1.5] text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
                                        {item}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        <div className={`flex items-center justify-between rounded-[14px] px-3.5 py-3 ${insetPanelClass}`}>
                            <div className="min-w-0">
                                <p className={`text-[11px] uppercase tracking-[0.08em] ${darkLabelClass} ${isRTL ? 'rtlText' : ''}`}>
                                    Session pacing
                                </p>
                                <p className={`text-[12.5px] ${darkSubtitleClass} ${isRTL ? 'rtlText' : ''}`}>
                                    Three deliberate tasks tuned for consistency over thrash.
                                </p>
                            </div>
                            <div className="ml-3 hidden min-w-[110px] sm:block">
                                <div className="h-3 overflow-hidden rounded-full border border-pebble-border/18 bg-pebble-overlay/[0.04]">
                                    <div
                                        className={`h-full rounded-full ${pacingBarClass}`}
                                        style={{ width: `${pacingBarWidth}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        <ul className="flex flex-col gap-2.5">
                            {plan.tasks.slice(0, 3).map((task) => {
                                const checked = state.completedTasks.includes(task.id)
                                return (
                                    <li key={task.id} className={`relative flex items-center justify-between rounded-[14px] px-4 py-3.5 transition-colors ${taskRowClass}`}>

                                        <div className="flex min-w-0 items-center gap-3">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={checked}
                                                onClick={() => handleToggleCheck(task.id)}
                                                className={classNames(
                                                    'flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/50',
                                                    checked
                                                        ? 'border-pebble-success/40 bg-pebble-success/18 text-pebble-success'
                                                        : 'border-pebble-border/40 bg-pebble-overlay/[0.05] text-transparent hover:border-pebble-border/80'
                                                )}
                                            >
                                                <Check className="h-3 w-3" strokeWidth={3} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => openModal(task.id)}
                                                className="flex flex-col items-start min-w-0 text-left focus-visible:outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-pebble-accent/50"
                                            >
                                                <span
                                                    className={classNames(
                                                        'text-[13px] font-medium truncate transition-colors max-w-full',
                                                        checked ? 'text-pebble-text-muted line-through' : 'text-pebble-text-primary'
                                                    )}
                                                    dir={isRTL ? 'rtl' : 'ltr'}
                                                >
                                                    {task.label}
                                                </span>
                                                <span
                                                    className={classNames(
                                                        'text-[11px] truncate w-full transition-colors',
                                                        checked ? 'text-pebble-text-muted/60' : 'text-pebble-text-secondary'
                                                    )}
                                                >
                                                    {task.detail}
                                                </span>
                                            </button>
                                        </div>

                                        <span className="landing-chip-muted shrink-0 ml-3 rounded-full px-2 py-0.5 text-[10.5px] font-medium">
                                            {task.estimatedMinutes}m
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                        <div className="flex items-center justify-between px-1 pt-1">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="text-[12px] font-medium text-pebble-text-muted hover:text-pebble-text-primary transition disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                <RefreshCw className={classNames("h-3 w-3", isGenerating ? "animate-spin" : "")} />
                                {isGenerating ? t('home.plan.generating') : t('home.plan.regenerate')}
                            </button>
                        </div>
                        {expectedOutcome ? (
                            <div className={`mx-1 flex items-start gap-2.5 rounded-[15px] px-3.5 py-3 ${outcomeStripClass}`}>
                                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pebble-accent/12 text-pebble-accent">
                                    <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${outcomeLabelClass} ${isRTL ? 'rtlText' : ''}`}>
                                        Expected by end of session
                                    </p>
                                    <p className={`mt-1 text-[12.75px] leading-[1.58] ${outcomeBodyClass} ${isRTL ? 'rtlText' : ''}`}>
                                        {expectedOutcome}
                                    </p>
                                </div>
                            </div>
                        ) : null}
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
