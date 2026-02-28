import { Check, ChevronDown } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { LanguageCode, LanguageOption } from '../../i18n/languages'

type LanguageSelectProps = {
  value: LanguageCode
  onChange: (next: LanguageCode) => void
  options: LanguageOption[]
  label: string
}

function clampIndex(index: number, size: number) {
  if (size <= 0) {
    return 0
  }
  if (index < 0) {
    return size - 1
  }
  if (index >= size) {
    return 0
  }
  return index
}

export function LanguageSelect({
  value,
  onChange,
  options,
  label,
}: LanguageSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const [open, setOpen] = useState(false)
  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.code === value)),
    [options, value],
  )
  const [activeIndex, setActiveIndex] = useState(selectedIndex)

  const selected = options[selectedIndex] ?? options[0]

  useEffect(() => {
    setActiveIndex(selectedIndex)
  }, [selectedIndex, open])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleOutsideClick(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null
      if (!target) {
        return
      }
      if (containerRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('touchstart', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('touchstart', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const active = options[activeIndex]
    if (!active) {
      return
    }
    const node = optionRefs.current[active.code]
    node?.focus({ preventScroll: true })
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, options])

  function selectAt(index: number) {
    const option = options[index]
    if (!option) {
      return
    }
    onChange(option.code)
    setOpen(false)
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) =>
        clampIndex(current + (event.key === 'ArrowDown' ? 1 : -1), options.length),
      )
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((current) => !current)
    }
  }

  function handleListKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => clampIndex(current + 1, options.length))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => clampIndex(current - 1, options.length))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      selectAt(activeIndex)
    }
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <p className="text-sm font-medium text-pebble-text-primary">{label}</p>

      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-pebble-border/38 bg-pebble-overlay/[0.08] px-3 py-2.5 text-left transition hover:bg-pebble-overlay/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="min-w-0">
            <span dir={selected?.direction} className="block truncate text-sm text-pebble-text-primary">
              {selected?.nativeName}
            </span>
            <span className="block truncate text-xs text-pebble-text-secondary">
              {selected?.romanizedName}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-pebble-text-secondary transition ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        <div
          role="listbox"
          aria-label={label}
          ref={listRef}
          onKeyDown={handleListKeyDown}
          className={`absolute left-0 right-0 top-[calc(100%+8px)] z-30 origin-top rounded-xl border border-pebble-border/38 bg-pebble-panel/96 p-1.5 shadow-[0_14px_36px_rgba(2,8,23,0.28)] backdrop-blur-xl transition duration-150 ${
            open
              ? 'pointer-events-auto scale-100 opacity-100'
              : 'pointer-events-none scale-[0.98] opacity-0'
          }`}
        >
          <div className="max-h-72 overflow-y-auto pr-1">
            {options.map((option, index) => {
              const selectedOption = option.code === value
              const activeOption = index === activeIndex
              return (
                <button
                  key={option.code}
                  role="option"
                  aria-selected={selectedOption}
                  ref={(node) => {
                    optionRefs.current[option.code] = node
                  }}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectAt(index)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
                    selectedOption
                      ? 'border-pebble-accent/45 bg-pebble-accent/14'
                      : activeOption
                        ? 'border-pebble-border/35 bg-pebble-overlay/[0.12]'
                        : 'border-transparent bg-transparent hover:border-pebble-border/28 hover:bg-pebble-overlay/[0.1]'
                  }`}
                >
                  <span className="inline-flex w-4 justify-center">
                    {selectedOption ? (
                      <Check className="h-3.5 w-3.5 text-pebble-accent" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span dir={option.direction} className="block truncate text-sm text-pebble-text-primary">
                      {option.nativeName}
                    </span>
                    <span className="block truncate text-xs text-pebble-text-secondary">
                      {option.romanizedName}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
