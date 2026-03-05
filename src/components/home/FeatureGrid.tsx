import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { Bot, CheckCircle2, Code2, Languages, ListFilter, Search } from 'lucide-react'

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
    detail: 'Execute quickly, compare expected output, and tighten your loop with clear run diagnostics.',
    tag: 'Runtime',
    tone: 'blue',
    preview: 'runtime',
    icon: Code2,
  },
  {
    id: 'coach',
    title: 'Pebble Coach',
    detail: 'Hint, Explain, and Next-step guidance that stays aligned with your current code context.',
    tag: 'Coach',
    tone: 'indigo',
    preview: 'coach',
    icon: Bot,
  },
  {
    id: 'languages',
    title: 'Multilingual mentor',
    detail: 'Preview guidance in multiple languages while preserving the same technical context.',
    tag: 'Language',
    tone: 'blue',
    preview: 'languages',
    icon: Languages,
  },
  {
    id: 'browser',
    title: 'LeetCode-style problems browser',
    detail: 'Filter by topic, difficulty, and acceptance while keeping random practice one click away.',
    tag: 'Browser',
    tone: 'slate',
    preview: 'browser',
    icon: ListFilter,
  },
]

function tilePlacementClass(id: FeatureTile['id']) {
  if (id === 'runtime') return 'md:col-span-2 xl:col-span-7 xl:col-start-1 xl:row-start-1'
  if (id === 'coach') return 'md:col-span-1 xl:col-span-5 xl:col-start-8 xl:row-start-1'
  if (id === 'languages') return 'md:col-span-1 xl:col-span-5 xl:col-start-1 xl:row-start-2'
  return 'md:col-span-1 xl:col-span-7 xl:col-start-6 xl:row-start-2'
}

function toneClass(tone: TileTone) {
  if (tone === 'blue') {
    return 'border-pebble-accent/38 bg-pebble-accent/12 text-pebble-accent dark:border-pebble-accent/30 dark:bg-pebble-accent/14 dark:text-blue-200'
  }
  if (tone === 'indigo') {
    return 'border-pebble-border/40 bg-pebble-overlay/[0.16] text-pebble-text-secondary dark:border-pebble-border/32 dark:bg-pebble-overlay/[0.10] dark:text-pebble-text-secondary'
  }
  return 'border-pebble-border/40 bg-pebble-overlay/[0.16] text-pebble-text-secondary dark:border-pebble-border/32 dark:bg-pebble-overlay/[0.10] dark:text-pebble-text-secondary'
}

function previewSurfaceClass(tone: TileTone) {
  const base = 'border bg-pebble-canvas/62 dark:bg-pebble-canvas/36 shadow-[inset_0_1px_0_rgba(var(--pebble-overlay),0.12)]'
  if (tone === 'blue') {
    return `${base} border-pebble-accent/22 dark:border-pebble-accent/18`
  }
  if (tone === 'indigo') {
    return `${base} border-pebble-border/28 dark:border-pebble-border/22`
  }
  return `${base} border-pebble-border/28 dark:border-pebble-border/22`
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

function RuntimePreview({ tone }: { tone: TileTone }) {
  return (
    <div className={`rounded-2xl border p-3 ${previewSurfaceClass(tone)}`}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="rounded-full border border-pebble-accent/45 bg-pebble-accent/12 px-2.5 py-0.5 text-[10px] font-semibold text-pebble-accent dark:border-pebble-accent/35 dark:bg-pebble-accent/16 dark:text-blue-200">
          Unit: Two Sum
        </span>
        <span className="rounded-full border border-pebble-warning/40 bg-pebble-warning/12 px-2.5 py-0.5 text-[10px] font-semibold text-pebble-warning dark:border-pebble-warning/30 dark:bg-pebble-warning/18 dark:text-amber-200">
          Fail #2
        </span>
      </div>
      <div className="rounded-xl border border-pebble-border/26 bg-pebble-canvas/75 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-pebble-text-secondary dark:border-pebble-border/24 dark:bg-pebble-canvas/38 dark:text-pebble-text-secondary">
        <div>def solve(nums, target):</div>
        <div className="opacity-90">  seen = {'{}'}</div>
        <div className="opacity-90">  return -1, -1</div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-pebble-text-secondary">
        <div className="rounded-md border border-emerald-300/55 bg-emerald-500/10 px-2 py-1 dark:border-emerald-300/28 dark:bg-emerald-400/16">expected: 12</div>
        <div className="rounded-md border border-rose-300/55 bg-rose-500/10 px-2 py-1 dark:border-rose-300/28 dark:bg-rose-400/16">got: -1 -1</div>
      </div>
    </div>
  )
}

function CoachPreview({ tone }: { tone: TileTone }) {
  return (
    <div className={`rounded-2xl border p-3 ${previewSurfaceClass(tone)}`}>
      <div className="flex flex-wrap gap-1.5">
        {['Hint', 'Explain', 'Next step'].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-indigo-300/55 bg-indigo-500/12 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-300/35 dark:bg-indigo-400/15 dark:text-indigo-200"
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-2.5 space-y-1.5">
        <div className="w-[92%] rounded-lg border border-pebble-border/26 bg-pebble-canvas/68 px-2.5 py-2 text-[11.5px] leading-snug text-pebble-text-primary dark:border-pebble-border/24 dark:bg-pebble-canvas/36 dark:text-pebble-text-primary">
          Check target - current before storing in seen.
        </div>
        <div className="ml-auto w-[88%] rounded-lg border border-pebble-border/26 bg-pebble-canvas/68 px-2.5 py-2 text-[11.5px] leading-snug text-pebble-text-primary dark:border-pebble-border/24 dark:bg-pebble-canvas/36 dark:text-pebble-text-primary">
          Give me one concise next step.
        </div>
      </div>
    </div>
  )
}

function BrowserPreview({ tone }: { tone: TileTone }) {
  const rows = [
    { title: 'Two Sum', difficulty: 'Easy', acceptance: '63%', solved: true },
    { title: 'Valid Parentheses', difficulty: 'Easy', acceptance: '58%', solved: false },
    { title: 'Merge Intervals', difficulty: 'Hard', acceptance: '41%', solved: false },
  ]

  return (
    <div className={`rounded-2xl border p-3 ${previewSurfaceClass(tone)}`}>
      <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-pebble-border/26 bg-pebble-canvas/68 px-2.5 py-2 text-[11px] text-pebble-text-secondary dark:border-pebble-border/24 dark:bg-pebble-canvas/36 dark:text-pebble-text-secondary">
        <Search className="h-3.5 w-3.5" />
        Search problems, topics, tags
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.title}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 rounded-lg border border-pebble-border/24 bg-pebble-overlay/75 px-2.5 py-2 dark:border-pebble-border/22 dark:bg-pebble-overlay/[0.06]"
          >
            <span className="truncate text-[11.5px] font-medium text-pebble-text-primary dark:text-pebble-text-primary">{row.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                row.difficulty === 'Easy'
                  ? 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/18 dark:text-emerald-200'
                  : 'bg-rose-500/12 text-rose-700 dark:bg-rose-400/18 dark:text-rose-200'
              }`}
            >
              {row.difficulty}
            </span>
            <span className="text-[10.5px] font-medium text-pebble-text-secondary dark:text-pebble-text-secondary">{row.acceptance}</span>
            <span className="inline-flex w-4 items-center justify-center">
              {row.solved ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-pebble-accent dark:text-blue-300" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-500" />
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

const LOOP_LANGUAGES: DemoLanguage[] = ['EN', 'HI', 'BN', 'TA']
const DEMO_SEQUENCE: DemoLanguage[] = ['HI', 'BN', 'TA', 'EN']

// Slow, demo-friendly timings so each state is clearly visible.
const DEMO_TIMINGS = {
  idleBeforeOpen: 1050,
  dropdownOpenHold: 1400,
  optionHoverHold: 820,
  afterSelectHold: 1300,
  languagePreviewHold: 2350,
  hintUpdateDelay: 180,
  clickPulse: 210,
  resumeAfterInteraction: 8000,
} as const

function LanguagePreviewAnimated({ tone }: { tone: TileTone }) {
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selectorRef = useRef<HTMLButtonElement | null>(null)
  const optionRefs = useRef<Partial<Record<DemoLanguage, HTMLElement | null>>>({})
  const loopTimeoutRef = useRef<number | null>(null)
  const resumeTimeoutRef = useRef<number | null>(null)
  const hintTimeoutRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedOption, setHighlightedOption] = useState<DemoLanguage | null>(null)
  const [demoStepIndex, setDemoStepIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isUserPaused, setIsUserPaused] = useState(false)
  const [cursorTarget, setCursorTarget] = useState<'selector' | DemoLanguage>('selector')
  const [cursorPulse, setCursorPulse] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<DemoLanguage>('EN')
  const [hintLanguage, setHintLanguage] = useState<DemoLanguage>('EN')
  const [cursorPoint, setCursorPoint] = useState({ x: 0, y: 0 })

  const autoplayEnabled = !reduceMotion && !isHovered && !isUserPaused

  const clearDemoTimer = useCallback(() => {
    if (loopTimeoutRef.current) {
      window.clearTimeout(loopTimeoutRef.current)
      loopTimeoutRef.current = null
    }
  }, [])

  const clearResumeTimer = useCallback(() => {
    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
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

  const pauseAutoplayByUser = useCallback(() => {
    setIsUserPaused(true)
    clearResumeTimer()
    resumeTimeoutRef.current = window.setTimeout(() => {
      setIsUserPaused(false)
    }, DEMO_TIMINGS.resumeAfterInteraction)
  }, [clearResumeTimer])

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
      clearResumeTimer()
    }
  }, [clearDemoTimer, clearHintTimer, clearResumeTimer])

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

  const handleSelectorToggle = () => {
    pauseAutoplayByUser()
    setCursorTarget('selector')
    setIsOpen((prev) => !prev)
  }

  const handleLanguageSelect = (language: DemoLanguage) => {
    pauseAutoplayByUser()
    clearDemoTimer()
    clearHintTimer()
    setSelectedLanguage(language)
    setHintLanguage(language)
    setIsOpen(false)
    setHighlightedOption(null)
    const nextLanguage = LOOP_LANGUAGES[(LOOP_LANGUAGES.indexOf(language) + 1) % LOOP_LANGUAGES.length]
    setDemoStepIndex(DEMO_SEQUENCE.indexOf(nextLanguage))
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl border p-3.5 ${previewSurfaceClass(tone)}`}
      onMouseEnter={() => {
        setIsHovered(true)
        pauseAutoplayByUser()
      }}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={pauseAutoplayByUser}
    >
      <div className="relative rounded-xl border border-pebble-border/26 bg-pebble-canvas/68 px-3 py-2.5 text-[12px] text-pebble-text-primary dark:border-pebble-border/24 dark:bg-pebble-canvas/38 dark:text-pebble-text-primary">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-pebble-text-secondary">Language</span>
          <button
            type="button"
            ref={selectorRef}
            onClick={handleSelectorToggle}
            className="rounded-lg border border-pebble-accent/40 bg-pebble-accent/12 px-2.5 py-1 text-[11px] font-semibold text-pebble-accent transition-colors hover:bg-pebble-accent/16 dark:border-pebble-accent/36 dark:bg-pebble-accent/18 dark:text-blue-200 dark:hover:bg-pebble-accent/24"
          >
            {selectedLanguage}
          </button>
        </div>

        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-3 top-[2.45rem] z-20 w-28 overflow-hidden rounded-xl border border-pebble-border/28 bg-pebble-panel/95 shadow-[0_12px_28px_rgba(15,23,42,0.18)] dark:border-pebble-border/24 dark:bg-pebble-canvas/90 dark:shadow-[0_14px_32px_rgba(0,0,0,0.42)]"
            >
              {(['EN', 'HI', 'BN', 'TA'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  ref={(node) => {
                    optionRefs.current[lang] = node
                  }}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`px-2.5 py-1.5 text-[11px] ${
                    lang === selectedLanguage
                      ? 'bg-pebble-accent/12 text-pebble-accent dark:bg-pebble-accent/18 dark:text-blue-200'
                      : highlightedOption === lang
                        ? 'bg-pebble-overlay/35 text-pebble-text-primary dark:bg-pebble-overlay/10 dark:text-pebble-text-primary'
                        : 'text-pebble-text-secondary dark:text-pebble-text-secondary'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-2.5 rounded-xl border border-pebble-border/26 bg-pebble-canvas/75 px-3 py-2.5 text-[12px] leading-relaxed text-pebble-text-primary dark:border-pebble-border/24 dark:bg-pebble-canvas/38 dark:text-pebble-text-primary">
        <AnimatePresence mode="wait">
          <motion.p
            key={hintLanguage}
            initial={{ opacity: 0.55, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0.45, y: -2 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {LANGUAGE_COPY[hintLanguage]}
          </motion.p>
        </AnimatePresence>
      </div>

      {!reduceMotion && autoplayEnabled ? (
        <motion.div
          className="pointer-events-none absolute z-30"
          animate={{
            x: cursorPoint.x,
            y: cursorPoint.y,
            scale: cursorPulse ? [1, 0.88, 1] : 1,
          }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{ left: 0, top: 0 }}
        >
          <div className="relative h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pebble-border/45 bg-pebble-overlay/90 shadow-[0_2px_8px_rgba(15,23,42,0.22)] dark:border-pebble-overlay/55 dark:bg-pebble-overlay/92" />
        </motion.div>
      ) : null}
    </div>
  )
}

function TilePreview({ preview, tone }: Pick<FeatureTile, 'preview' | 'tone'>) {
  if (preview === 'runtime') return <RuntimePreview tone={tone} />
  if (preview === 'coach') return <CoachPreview tone={tone} />
  if (preview === 'browser') return <BrowserPreview tone={tone} />
  return <LanguagePreviewAnimated tone={tone} />
}

export function FeatureGrid() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative mt-1 overflow-hidden rounded-[24px] border border-pebble-border/24 bg-[linear-gradient(180deg,rgba(var(--pebble-panel),0.86),rgba(var(--pebble-panel),0.78))] px-4 py-5 shadow-[0_16px_40px_rgba(55,72,110,0.14)] dark:bg-[linear-gradient(180deg,rgba(var(--pebble-panel),0.50),rgba(var(--pebble-panel),0.40))] dark:shadow-[0_24px_56px_rgba(0,0,0,0.42)] md:px-5 md:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pebble-overlay/75 to-transparent dark:via-pebble-overlay/18" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-pebble-overlay/[0.10] to-transparent dark:from-pebble-overlay/[0.06]" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pebble-text-muted">
            Built for fast recovery loops
          </p>
          <h2 className="text-balance text-[1.78rem] font-semibold leading-[1.08] tracking-[-0.02em] text-pebble-text-primary md:text-[2.08rem] lg:text-[2.28rem]">
            A learning surface tuned for <span className="text-pebble-accent">measurable momentum</span>
          </h2>
        </div>
        <p className="max-w-[62ch] text-[14px] leading-[1.7] text-pebble-text-secondary md:text-[14.5px] lg:justify-self-end lg:text-right">
          Pebble blends high-signal execution, contextual coaching, and focused analytics into one calm interface so every session compounds.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-12">
        {tiles.map((tile) => {
          const Icon = tile.icon
          return (
            <motion.article
              key={tile.id}
              className={`group relative isolate overflow-hidden rounded-[24px] border border-pebble-border/24 bg-[rgba(231,237,249,0.86)] p-4 shadow-[0_14px_32px_rgba(55,72,110,0.14)] dark:border-pebble-border/20 dark:bg-pebble-overlay/[0.05] dark:shadow-[0_18px_34px_rgba(0,0,0,0.42)] md:p-5 ${tilePlacementClass(tile.id)}`}
              style={{ ['--mx' as string]: '50%', ['--my' as string]: '50%' }}
              onMouseMove={onTileMouseMove}
              onMouseLeave={onTileMouseLeave}
              whileHover={reduceMotion ? undefined : { y: -6, scale: 1.006 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(280px circle at var(--mx) var(--my), rgba(59,130,246,0.12), rgba(59,130,246,0.02) 34%, transparent 62%)',
                }}
              />
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-pebble-overlay/72 to-transparent dark:via-pebble-overlay/20" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-pebble-border/28 bg-pebble-canvas/58 text-pebble-text-secondary dark:border-pebble-border/22 dark:bg-pebble-canvas/34 dark:text-pebble-text-primary">
                  <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${toneClass(tile.tone)}`}>
                  {tile.tag}
                </span>
              </div>

              <div className="relative z-10 mt-3 space-y-1.5">
                <h3 className="text-[17px] font-semibold leading-[1.22] tracking-tight text-pebble-text-primary dark:text-pebble-text-primary">
                  {tile.title}
                </h3>
                <p className="text-[13.25px] leading-[1.56] text-pebble-text-secondary dark:text-pebble-text-secondary">
                  {tile.detail}
                </p>
              </div>

              <div className="relative z-10 mt-3">
                <TilePreview preview={tile.preview} tone={tile.tone} />
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
