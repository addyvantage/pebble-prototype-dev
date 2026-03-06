import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { Bot, CheckCircle2, Code2, Languages, ListFilter, Search } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

type TileTone = 'blue' | 'indigo' | 'slate'

type FeatureTile = {
  id: string
  title: string
  detail: string
  tag: string
  tone: TileTone
  preview: 'runtime' | 'coach' | 'browser' | 'languages'
  icon: typeof Code2
}

const tiles: FeatureTile[] = [
  {
    id: 'runtime',
    title: 'Run code with real feedback',
    detail: 'Run against examples and hidden checks, isolate the failing case fast, and rerun with cleaner intent.',
    tag: 'Runtime',
    tone: 'blue',
    preview: 'runtime',
    icon: Code2,
  },
  {
    id: 'coach',
    title: 'Pebble Coach',
    detail: 'Hint, Explain, and next-step guidance stay anchored to your current code, latest run output, and recovery state.',
    tag: 'Coach',
    tone: 'indigo',
    preview: 'coach',
    icon: Bot,
  },
  {
    id: 'languages',
    title: 'Multilingual mentor',
    detail: 'Switch guidance across English and Indian languages without losing technical precision or the coding context.',
    tag: 'Language',
    tone: 'blue',
    preview: 'languages',
    icon: Languages,
  },
  {
    id: 'browser',
    title: 'LeetCode-style problems browser',
    detail: 'Browse by topic, difficulty, and readiness so the next rep feels selected, not random.',
    tag: 'Browser',
    tone: 'slate',
    preview: 'browser',
    icon: ListFilter,
  },
]

function tilePlacementClass(id: FeatureTile['id']) {
  if (id === 'runtime') return 'md:col-span-2 xl:col-span-7 xl:col-start-1 xl:row-start-1'
  if (id === 'coach') return 'md:col-span-1 xl:col-span-5 xl:col-start-8 xl:row-start-1'
  if (id === 'languages') return 'md:col-span-1 xl:col-span-7 xl:col-start-1 xl:row-start-2'
  return 'md:col-span-1 xl:col-span-5 xl:col-start-8 xl:row-start-2'
}

function toneClass(tone: TileTone, isDark: boolean) {
  if (tone === 'blue') {
    return isDark
      ? 'border-pebble-accent/42 bg-pebble-accent/18 text-pebble-text-primary shadow-[0_10px_20px_rgba(0,0,0,0.14)]'
      : 'border-pebble-accent/46 bg-pebble-accent/12 text-pebble-accent shadow-[0_8px_16px_rgba(55,72,110,0.06)]'
  }
  if (tone === 'indigo') {
    return isDark
      ? 'border-pebble-border/30 bg-pebble-overlay/[0.10] text-pebble-text-primary shadow-[0_10px_20px_rgba(0,0,0,0.12)]'
      : 'border-pebble-border/34 bg-pebble-overlay/[0.10] text-pebble-text-secondary shadow-[0_8px_16px_rgba(55,72,110,0.05)]'
  }
  return isDark
    ? 'border-pebble-border/30 bg-pebble-overlay/[0.10] text-pebble-text-primary shadow-[0_10px_20px_rgba(0,0,0,0.12)]'
    : 'border-pebble-border/34 bg-pebble-overlay/[0.10] text-pebble-text-secondary shadow-[0_8px_16px_rgba(55,72,110,0.05)]'
}

function previewSurfaceClass(tone: TileTone, isDark: boolean) {
  const base = isDark
    ? 'border bg-pebble-canvas/40 shadow-[inset_0_1px_0_rgba(var(--pebble-overlay),0.08)]'
    : 'border bg-white/72 shadow-[inset_0_1px_0_rgba(var(--pebble-overlay),0.20)]'
  if (tone === 'blue') {
    return `${base} ${isDark ? 'border-pebble-accent/36' : 'border-pebble-accent/44'}`
  }
  if (tone === 'indigo') {
    return `${base} ${isDark ? 'border-pebble-border/38' : 'border-pebble-border/48'}`
  }
  return `${base} ${isDark ? 'border-pebble-border/38' : 'border-pebble-border/48'}`
}

function onTileMouseMove(event: MouseEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  event.currentTarget.style.setProperty('--mx', `${Math.max(0, Math.min(100, x)).toFixed(2)}%`)
  event.currentTarget.style.setProperty('--my', `${Math.max(0, Math.min(100, y)).toFixed(2)}%`)
}

function onTileMouseLeave(event: MouseEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--mx', '50%')
  event.currentTarget.style.setProperty('--my', '50%')
}

function RuntimePreview({ tone, isDark }: { tone: TileTone; isDark: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${previewSurfaceClass(tone, isDark)}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${isDark
          ? 'border-pebble-accent/52 bg-pebble-accent/20 text-pebble-text-primary'
          : 'border-pebble-accent/58 bg-pebble-accent/12 text-pebble-accent'
          }`}>
          Unit: Two Sum
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${isDark
          ? 'border-amber-300/55 bg-amber-400/18 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.18)]'
          : 'border-amber-500/65 bg-amber-500/18 text-amber-800'
          }`}>
          Fail #2
        </span>
      </div>
      <div className={`rounded-xl border px-3 py-2.5 font-mono text-[11.5px] leading-[1.72] ${isDark
        ? 'border-pebble-border/40 bg-pebble-canvas/46 text-pebble-text-primary'
        : 'border-pebble-border/42 bg-[#f7faff] text-pebble-text-secondary'
        }`}>
        <div>def solve(nums, target):</div>
        <div className="opacity-90">  seen = {'{}'}</div>
        <div className="opacity-90">  return -1, -1</div>
      </div>
      <div className={`mt-3 rounded-xl border px-3 py-2.5 ${isDark
        ? 'border-amber-300/35 bg-amber-400/12'
        : 'border-amber-500/35 bg-amber-50/80'
        }`}>
        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold">
          <span className={isDark ? 'text-amber-100' : 'text-amber-800'}>Expected</span>
          <span className={isDark ? 'text-amber-100' : 'text-amber-800'}>Actual</span>
        </div>
        <div className={`mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] ${isDark ? 'text-pebble-text-primary' : 'text-pebble-text-secondary'}`}>
          <div className={`rounded-md border px-2 py-1 ${isDark ? 'border-emerald-300/40 bg-emerald-400/12' : 'border-emerald-400/45 bg-emerald-50/80'}`}>1 2</div>
          <div className={`rounded-md border px-2 py-1 ${isDark ? 'border-amber-300/42 bg-amber-400/12 text-amber-100' : 'border-amber-400/48 bg-white/70 text-amber-800'}`}>-1 -1</div>
        </div>
      </div>
      <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] leading-[1.6] ${isDark ? 'border-pebble-accent/28 bg-pebble-accent/10 text-pebble-text-secondary' : 'border-pebble-accent/28 bg-pebble-accent/8 text-pebble-text-secondary'}`}>
        Pebble isolates the fail case first, then points you to the exact recovery move.
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${isDark ? 'border-pebble-accent/42 bg-pebble-accent/14 text-pebble-text-primary' : 'border-pebble-accent/46 bg-pebble-accent/10 text-pebble-accent'}`}>
          Case isolated
        </span>
        <span className="rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.05] px-2 py-0.5 text-[10px] font-medium text-pebble-text-secondary">
          Next: inspect complement logic
        </span>
      </div>
    </div>
  )
}

function CoachPreview({ tone, isDark }: { tone: TileTone; isDark: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${previewSurfaceClass(tone, isDark)}`}>
      <div className="flex flex-wrap gap-1.5">
        {['Hint', 'Explain', 'Next step'].map((chip) => (
          <span
            key={chip}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${isDark
              ? 'border-pebble-accent/46 bg-pebble-accent/20 text-pebble-text-primary'
              : 'border-pebble-accent/55 bg-pebble-accent/12 text-pebble-accent'
              }`}
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-3 space-y-2.5">
        <div className={`w-[94%] rounded-lg border px-3 py-2.5 text-[11.5px] leading-[1.6] ${isDark
          ? 'border-pebble-border/40 bg-pebble-canvas/48 text-pebble-text-primary'
          : 'border-pebble-border/50 bg-pebble-canvas/70 text-pebble-text-primary'
          }`}>
          Your run failed on case #2. Check the complement before you store the current value.
        </div>
        <div className={`ml-auto w-[90%] rounded-lg border px-3 py-2.5 text-[11.5px] leading-[1.6] ${isDark
          ? 'border-pebble-accent/30 bg-pebble-accent/10 text-pebble-text-primary'
          : 'border-pebble-accent/34 bg-pebble-accent/10 text-pebble-text-primary'
          }`}>
          One next step: test whether `target - nums[i]` already exists in `seen` first.
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-pebble-border/26 bg-pebble-overlay/[0.05] px-2.5 py-2 text-[10.5px] text-pebble-text-secondary">
        <span>Tiered guidance</span>
        <span className="font-medium text-pebble-text-primary">Grounded in latest run</span>
      </div>
    </div>
  )
}

function BrowserPreview({ tone, isDark }: { tone: TileTone; isDark: boolean }) {
  const rows = [
    { title: 'Two Sum', difficulty: 'Easy', acceptance: '63%', solved: true, recommended: false },
    { title: 'Valid Parentheses', difficulty: 'Easy', acceptance: '58%', solved: false, recommended: true },
    { title: 'Merge Intervals', difficulty: 'Hard', acceptance: '41%', solved: false, recommended: false },
  ]

  return (
    <div className={`rounded-2xl border p-4 ${previewSurfaceClass(tone, isDark)}`}>
      <div className={`mb-3 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${isDark
        ? 'border-pebble-border/40 bg-pebble-canvas/48 text-pebble-text-primary'
        : 'border-pebble-border/50 bg-pebble-canvas/70 text-pebble-text-secondary'
        }`}>
        <Search className="h-3.5 w-3.5" />
        Search problems, topics, tags
      </div>
      <div className="mb-3 flex items-center justify-between rounded-lg border border-pebble-border/24 bg-pebble-overlay/[0.05] px-2.5 py-2 text-[10.5px] text-pebble-text-secondary">
        <span>Picked for Array momentum</span>
        <span className="font-medium text-pebble-text-primary">12 min rep</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.title}
            className={`grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 rounded-lg border px-2.5 py-2 ${isDark
              ? row.recommended ? 'border-pebble-accent/34 bg-pebble-accent/10' : 'border-pebble-border/40 bg-pebble-panel/52'
              : row.recommended ? 'border-pebble-accent/38 bg-pebble-accent/10' : 'border-pebble-border/50 bg-pebble-panel/78'
              }`}
          >
            <span className="truncate text-[11.5px] font-medium text-pebble-text-primary">{row.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                row.difficulty === 'Easy'
                  ? isDark ? 'bg-emerald-500/16 text-pebble-text-primary border border-emerald-300/48' : 'bg-emerald-500/12 text-emerald-700 border border-emerald-400/55'
                  : isDark ? 'bg-rose-500/16 text-pebble-text-primary border border-rose-300/48' : 'bg-rose-500/12 text-rose-700 border border-rose-400/55'
              }`}
            >
              {row.difficulty}
            </span>
            <span className={`text-[10.5px] font-medium ${isDark ? 'text-pebble-text-primary' : 'text-pebble-text-secondary'}`}>{row.acceptance}</span>
            <span className="inline-flex w-4 items-center justify-center">
              {row.recommended ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.08em] ${isDark ? 'bg-pebble-accent/20 text-pebble-text-primary' : 'bg-pebble-accent/12 text-pebble-accent'}`}>Rec</span>
              ) : row.solved ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-pebble-accent" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-pebble-border/55" />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

type DemoLanguage = 'EN' | 'HI' | 'BN' | 'TA'

const LANGUAGE_COPY: Record<DemoLanguage, string> = {
  EN: 'Hint: keep the map updated before checking the next index.',
  HI: 'संकेत: अगले index से पहले map को अपडेट रखें।',
  BN: 'ইঙ্গিত: পরের index-এর আগে map আপডেট রাখুন।',
  TA: 'குறிப்பு: அடுத்த index க்கு முன் map-ஐ update செய்யுங்கள்.',
}

const DEMO_SEQUENCE: DemoLanguage[] = ['HI', 'BN', 'TA', 'EN']

// Slow, demo-friendly timings so each state is clearly visible.
const DEMO_TIMINGS = {
  idleBeforeOpen: 1200,
  dropdownOpenHold: 1700,
  optionHoverHold: 1050,
  afterSelectHold: 1500,
  languagePreviewHold: 2600,
  hintUpdateDelay: 220,
  clickPulse: 260,
} as const

function LanguagePreviewAnimated({ tone, isDark }: { tone: TileTone; isDark: boolean }) {
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selectorRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Partial<Record<DemoLanguage, HTMLElement | null>>>({})
  const loopTimeoutRef = useRef<number | null>(null)
  const hintTimeoutRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedOption, setHighlightedOption] = useState<DemoLanguage | null>(null)
  const [demoStepIndex, setDemoStepIndex] = useState(0)
  const [cursorTarget, setCursorTarget] = useState<'selector' | DemoLanguage>('selector')
  const [cursorPulse, setCursorPulse] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<DemoLanguage>('EN')
  const [hintLanguage, setHintLanguage] = useState<DemoLanguage>('EN')
  const [cursorPoint, setCursorPoint] = useState({ x: 0, y: 0 })

  const autoplayEnabled = !reduceMotion

  const clearDemoTimer = useCallback(() => {
    if (loopTimeoutRef.current) {
      window.clearTimeout(loopTimeoutRef.current)
      loopTimeoutRef.current = null
    }
  }, [])

  const clearHintTimer = useCallback(() => {
    if (hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
  }, [])

  const triggerCursorPulse = useCallback(() => {
    setCursorPulse(true)
    window.setTimeout(() => setCursorPulse(false), DEMO_TIMINGS.clickPulse)
  }, [])

  const syncHintLanguage = useCallback((nextLanguage: DemoLanguage) => {
    clearHintTimer()
    hintTimeoutRef.current = window.setTimeout(() => {
      setHintLanguage(nextLanguage)
    }, DEMO_TIMINGS.hintUpdateDelay)
  }, [clearHintTimer])

  useEffect(() => {
    if (reduceMotion) {
      setIsOpen(false)
      setHighlightedOption(null)
      setSelectedLanguage('EN')
      setHintLanguage('EN')
      setCursorTarget('selector')
    }
  }, [reduceMotion])

  useEffect(() => {
    if (!autoplayEnabled) {
      clearDemoTimer()
      return
    }

    const targetLanguage = DEMO_SEQUENCE[demoStepIndex]
    setIsOpen(false)
    setHighlightedOption(null)
    setCursorTarget('selector')

    const queue = (delay: number, fn: () => void) => {
      loopTimeoutRef.current = window.setTimeout(fn, delay)
    }

    queue(DEMO_TIMINGS.idleBeforeOpen, () => {
      setCursorTarget('selector')
      triggerCursorPulse()
      queue(DEMO_TIMINGS.clickPulse + 120, () => {
        setIsOpen(true)
        queue(DEMO_TIMINGS.dropdownOpenHold, () => {
          setCursorTarget(targetLanguage)
          setHighlightedOption(targetLanguage)
          queue(DEMO_TIMINGS.optionHoverHold, () => {
            triggerCursorPulse()
            setSelectedLanguage(targetLanguage)
            syncHintLanguage(targetLanguage)
            queue(DEMO_TIMINGS.clickPulse + 90, () => {
              setIsOpen(false)
              setHighlightedOption(null)
              queue(DEMO_TIMINGS.afterSelectHold + DEMO_TIMINGS.languagePreviewHold, () => {
                setDemoStepIndex((prev) => (prev + 1) % DEMO_SEQUENCE.length)
              })
            })
          })
        })
      })
    })

    return () => {
      clearDemoTimer()
    }
  }, [autoplayEnabled, clearDemoTimer, demoStepIndex, syncHintLanguage, triggerCursorPulse])

  useEffect(() => {
    return () => {
      clearDemoTimer()
      clearHintTimer()
    }
  }, [clearDemoTimer, clearHintTimer])

  useLayoutEffect(() => {
    const container = containerRef.current
    const selector = selectorRef.current
    if (!container || !selector) return

    const getCenter = (element: HTMLElement | null, fallback?: { x: number; y: number }) => {
      if (!element) return fallback ?? { x: 0, y: 0 }
      const containerRect = container.getBoundingClientRect()
      const rect = element.getBoundingClientRect()
      return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      }
    }

    const selectorPoint = getCenter(selector)
    const optionPoint = getCenter(optionRefs.current[cursorTarget === 'selector' ? selectedLanguage : cursorTarget] ?? null, {
      x: selectorPoint.x,
      y: selectorPoint.y + 56,
    })
    setCursorPoint(cursorTarget === 'selector' || !isOpen ? selectorPoint : optionPoint)
  }, [cursorTarget, isOpen, selectedLanguage, highlightedOption])

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none relative isolate rounded-2xl border p-4 select-none ${previewSurfaceClass(tone, isDark)}`}
    >
      <div className={`relative rounded-xl border px-3 py-2.5 text-[12px] text-pebble-text-primary ${isDark
        ? 'border-pebble-border/42 bg-pebble-canvas/48'
        : 'border-pebble-border/52 bg-pebble-canvas/72'
        } z-20`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-pebble-text-secondary">Language</span>
          <div
            ref={selectorRef}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${isDark
              ? 'border-pebble-accent/56 bg-pebble-accent/22 text-pebble-text-primary'
              : 'border-pebble-accent/62 bg-pebble-accent/14 text-pebble-accent'
              } transition-[background-color,border-color,color,box-shadow] duration-300 ease-out`}
          >
            {selectedLanguage}
          </div>
        </div>

        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.34, ease: [0.2, 0.8, 0.2, 1] }}
              className={`absolute right-3 top-[2.45rem] z-50 w-28 overflow-hidden rounded-xl border ${isDark
                ? 'border-pebble-border/65 bg-[#121a2f] shadow-[0_18px_36px_rgba(0,0,0,0.52)]'
                : 'border-pebble-border/70 bg-[#f5f8ff] shadow-[0_14px_30px_rgba(55,72,110,0.24)]'
                }`}
            >
              {(['EN', 'HI', 'BN', 'TA'] as const).map((lang) => (
                <div
                  key={lang}
                  ref={(node) => {
                    optionRefs.current[lang] = node
                  }}
                  className={`block w-full px-2.5 py-1.5 text-[11px] ${
                    lang === selectedLanguage
                      ? isDark
                        ? 'bg-pebble-accent/24 text-pebble-text-primary'
                        : 'bg-pebble-accent/14 text-pebble-accent'
                      : highlightedOption === lang
                        ? isDark
                          ? 'bg-pebble-canvas/52 text-pebble-text-primary'
                          : 'bg-pebble-canvas/62 text-pebble-text-primary'
                        : 'text-pebble-text-secondary'
                  } transition-[background-color,color] duration-280 ease-out`}
                >
                  {lang}
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className={`mt-3 rounded-xl border px-3 py-3 text-[12px] leading-[1.72] text-pebble-text-primary ${isDark
        ? 'border-pebble-border/42 bg-pebble-canvas/48'
        : 'border-pebble-border/52 bg-pebble-canvas/72'
        } relative z-10`}>
        <AnimatePresence mode="wait">
          <motion.p
            key={hintLanguage}
            initial={{ opacity: 0.55, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0.45, y: -2 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {LANGUAGE_COPY[hintLanguage]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-pebble-border/24 bg-pebble-overlay/[0.05] px-2.5 py-2 text-[10.5px] text-pebble-text-secondary">
        <span>Same logic, local language</span>
        <span className="font-medium text-pebble-text-primary">Mentor stays in sync</span>
      </div>

      {!reduceMotion && autoplayEnabled ? (
        <motion.div
          className="pointer-events-none absolute z-30"
          animate={{
            x: cursorPoint.x,
            y: cursorPoint.y,
            scale: cursorPulse ? [1, 0.88, 1] : 1,
          }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ left: 0, top: 0 }}
        >
          <svg
            viewBox="0 0 16 22"
            className="h-5 w-4 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_8px_rgba(15,23,42,0.32)]"
            aria-hidden="true"
          >
            <path
              d="M1.2 1.2v18.4l4.6-4.2 2.1 5 2.2-1-2.1-5h5.4z"
              fill={isDark ? '#EAF2FF' : '#111827'}
              stroke={isDark ? 'rgba(12,20,34,0.72)' : 'rgba(248,250,252,0.85)'}
              strokeWidth="1.05"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      ) : null}
    </div>
  )
}

function TilePreview({ preview, tone, isDark }: Pick<FeatureTile, 'preview' | 'tone'> & { isDark: boolean }) {
  if (preview === 'runtime') return <RuntimePreview tone={tone} isDark={isDark} />
  if (preview === 'coach') return <CoachPreview tone={tone} isDark={isDark} />
  if (preview === 'browser') return <BrowserPreview tone={tone} isDark={isDark} />
  return <LanguagePreviewAnimated tone={tone} isDark={isDark} />
}

export function FeatureGrid() {
  const reduceMotion = useReducedMotion()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section className="landing-showcase-shell relative mt-3 overflow-hidden rounded-[32px] px-4 py-6 md:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pebble-overlay/64 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-pebble-overlay/[0.08] to-transparent" />
      <div className="pointer-events-none absolute right-[-8%] top-[-10%] h-48 w-48 rounded-full bg-pebble-accent/10 blur-3xl" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.06fr_0.94fr] lg:items-end">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pebble-text-muted">
            Built for fast recovery loops
          </p>
          <h2 className="max-w-[17ch] text-balance text-[1.84rem] font-semibold leading-[1.05] tracking-[-0.03em] text-pebble-text-primary md:text-[2.18rem] lg:text-[2.42rem]">
            A learning surface tuned for <span className="text-pebble-accent">measurable momentum</span>
          </h2>
        </div>
        <div className="space-y-3 lg:justify-self-end lg:text-right">
          <p className="max-w-[58ch] text-[14px] leading-[1.8] text-pebble-text-secondary md:text-[14.5px]">
            Pebble blends high-signal execution, contextual coaching, and focused analytics into one calm interface so every session compounds.
          </p>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {['Real runtime checks', 'Coach in context', 'Multilingual mentoring'].map((chip) => (
              <span key={chip} className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium ${isDark ? 'border-pebble-border/30 bg-pebble-overlay/[0.06] text-pebble-text-secondary' : 'border-pebble-border/32 bg-pebble-overlay/[0.05] text-pebble-text-secondary'}`}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {tiles.map((tile) => {
          const Icon = tile.icon
          const isPrimaryStory = tile.id === 'runtime' || tile.id === 'coach'
          return (
            <motion.article
              key={tile.id}
              className={`group relative isolate overflow-hidden rounded-[28px] p-5 md:p-6 ${
                isPrimaryStory
                  ? isDark
                    ? 'border border-pebble-accent/24 bg-[linear-gradient(180deg,rgba(59,130,246,0.14)_0%,rgba(255,255,255,0.025)_100%)] shadow-[0_18px_44px_rgba(18,24,38,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'border border-pebble-accent/22 bg-[linear-gradient(180deg,rgba(59,130,246,0.10)_0%,rgba(255,255,255,0.76)_100%)] shadow-[0_16px_36px_rgba(55,72,110,0.13),inset_0_1px_0_rgba(255,255,255,0.82)]'
                  : isDark
                    ? 'border border-pebble-border/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.01)_100%)] shadow-[0_18px_44px_rgba(18,24,38,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'border border-pebble-border/26 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,248,255,0.96)_100%)] shadow-[0_14px_30px_rgba(55,72,110,0.08),inset_0_1px_0_rgba(255,255,255,0.84)]'
              } ${tilePlacementClass(tile.id)}`}
              style={{ ['--mx' as string]: '50%', ['--my' as string]: '50%' }}
              onMouseMove={onTileMouseMove}
              onMouseLeave={onTileMouseLeave}
              whileHover={reduceMotion ? undefined : { y: -6, scale: 1.006 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(280px circle at var(--mx) var(--my), rgba(59,130,246,0.16), rgba(59,130,246,0.03) 34%, transparent 62%)',
                }}
              />
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-pebble-overlay/70 to-transparent" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-pebble-canvas/60 ${isDark ? 'border-pebble-border/38 text-pebble-text-primary' : 'border-pebble-border/46 text-pebble-text-secondary'}`}>
                  <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${toneClass(tile.tone, isDark)}`}>
                  {tile.tag}
                </span>
              </div>

              <div className="relative z-10 mt-4 space-y-2.5">
                <h3 className="text-[17px] font-semibold leading-[1.18] tracking-tight text-pebble-text-primary">
                  {tile.title}
                </h3>
                <p className="max-w-[48ch] text-[13.25px] leading-[1.66] text-pebble-text-secondary">
                  {tile.detail}
                </p>
              </div>

              <div className="relative z-10 mt-4">
                <TilePreview preview={tile.preview} tone={tile.tone} isDark={isDark} />
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
