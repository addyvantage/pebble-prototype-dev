import { useCallback, useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import { loadStopwatch, makeStopwatchKey, saveStopwatch, type StopwatchState } from '../../lib/stopwatchStore'

interface StopwatchControlProps {
    sessionKey: string
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function StopwatchControl({ sessionKey }: StopwatchControlProps) {
    const storageKey = makeStopwatchKey(sessionKey)

    const [isExpanded, setIsExpanded] = useState(false)
    const [sw, setSw] = useState<StopwatchState>(() => loadStopwatch(storageKey))
    const [displayMs, setDisplayMs] = useState<number>(() => loadStopwatch(storageKey).elapsedMs)

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Tick every 250ms when running
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (sw.isRunning && sw.lastStartEpochMs) {
            const base = sw.elapsedMs
            const start = sw.lastStartEpochMs
            intervalRef.current = setInterval(() => {
                setDisplayMs(base + (Date.now() - start))
            }, 250)
        } else {
            setDisplayMs(sw.elapsedMs)
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [sw.isRunning, sw.elapsedMs, sw.lastStartEpochMs])

    // Persist on change
    useEffect(() => {
        saveStopwatch(storageKey, sw)
    }, [sw, storageKey])

    // Reload when problem changes
    useEffect(() => {
        const loaded = loadStopwatch(storageKey)
        setSw(loaded)
        setDisplayMs(loaded.elapsedMs)
    }, [storageKey])

    const handleStartPause = useCallback(() => {
        setSw((prev) => {
            if (prev.isRunning) {
                const elapsed = prev.elapsedMs + (Date.now() - (prev.lastStartEpochMs ?? Date.now()))
                return { ...prev, isRunning: false, elapsedMs: elapsed, lastStartEpochMs: null, updatedAt: Date.now() }
            }
            return { ...prev, isRunning: true, lastStartEpochMs: Date.now(), updatedAt: Date.now() }
        })
    }, [])

    const handleReset = useCallback(() => {
        setSw({ elapsedMs: 0, isRunning: false, lastStartEpochMs: null, updatedAt: Date.now() })
        setDisplayMs(0)
    }, [])

    const isRunning = sw.isRunning
    const hasElapsed = displayMs > 0 || isRunning

    const startPauseLabel = isRunning ? 'Pause' : displayMs > 0 ? 'Resume' : 'Start'

    return (
        <div className="relative inline-flex items-center gap-1.5">
            {/* Icon button — always visible, toggles expand */}
            <div className="group relative">
                <button
                    type="button"
                    aria-label="Stopwatch"
                    aria-expanded={isExpanded}
                    aria-pressed={isRunning}
                    onClick={() => setIsExpanded((v) => !v)}
                    className={[
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/50',
                        isRunning
                            ? 'border-pebble-accent/40 bg-pebble-accent/12 text-pebble-accent'
                            : 'border-pebble-border/35 bg-pebble-overlay/[0.09] text-pebble-text-primary hover:border-pebble-border/50 hover:bg-pebble-overlay/[0.16]',
                    ].join(' ')}
                >
                    <Timer
                        className={['h-4 w-4', isRunning ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''].join(' ')}
                        aria-hidden="true"
                    />
                </button>

                {/* Hover tooltip — only when collapsed */}
                {!isExpanded && (
                    <div
                        aria-hidden="true"
                        className={[
                            'pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 z-30',
                            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                            'rounded-2xl border border-pebble-border/30 bg-pebble-panel/95 backdrop-blur-xl',
                            'px-2.5 py-1.5 shadow-[0_8px_24px_rgba(2,8,23,0.18)]',
                            'whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-pebble-text-primary',
                        ].join(' ')}
                    >
                        {formatTime(displayMs)}
                    </div>
                )}
            </div>

            {/* Inline expanded widget */}
            {isExpanded && (
                <div
                    className={[
                        'inline-flex h-10 items-center gap-2',
                        'rounded-2xl border border-pebble-border/30 bg-pebble-panel/70 backdrop-blur-xl',
                        'shadow-[0_8px_20px_rgba(2,8,23,0.16)] px-3.5',
                    ].join(' ')}
                >
                    {/* Time digits */}
                    <span
                        className="min-w-[58px] text-center font-mono text-sm font-semibold tabular-nums text-pebble-text-primary"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {formatTime(displayMs)}
                    </span>

                    {/* Divider */}
                    <span className="h-4 w-px bg-pebble-border/30" aria-hidden="true" />

                    {/* Start / Pause / Resume */}
                    <button
                        type="button"
                        onClick={handleStartPause}
                        className={[
                            'inline-flex h-7 items-center justify-center rounded-xl px-3 text-xs font-semibold transition',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45',
                            isRunning
                                ? 'border border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-primary hover:bg-pebble-overlay/[0.16]'
                                : 'bg-pebble-accent text-white hover:opacity-90',
                        ].join(' ')}
                    >
                        {startPauseLabel}
                    </button>

                    {/* Reset */}
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={!hasElapsed}
                        className={[
                            'inline-flex h-7 items-center justify-center rounded-xl px-2.5 text-xs font-medium transition',
                            'border border-pebble-border/30 bg-pebble-overlay/[0.06]',
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pebble-border/40',
                            hasElapsed
                                ? 'text-pebble-text-secondary hover:bg-pebble-overlay/[0.14] hover:text-pebble-text-primary cursor-pointer'
                                : 'text-pebble-text-muted opacity-40 cursor-not-allowed',
                        ].join(' ')}
                    >
                        ↺
                    </button>

                    {/* Divider */}
                    <span className="h-4 w-px bg-pebble-border/30" aria-hidden="true" />

                    {/* Hide */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className={[
                            'inline-flex h-7 items-center justify-center rounded-xl px-2.5 text-xs font-medium transition',
                            'text-pebble-text-muted hover:text-pebble-text-primary',
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pebble-border/40',
                        ].join(' ')}
                    >
                        Hide
                    </button>
                </div>
            )}
        </div>
    )
}
