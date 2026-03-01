import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PebbleLanguage, PebbleLanguageId } from '../../lib/languages'
import { useTheme } from '../../hooks/useTheme'

type ProgramLangDropdownProps = {
  value: PebbleLanguageId
  options: PebbleLanguage[]
  onChange: (id: PebbleLanguageId) => void
}

function clampIndex(index: number, size: number) {
  if (size <= 0) return 0
  if (index < 0) return size - 1
  if (index >= size) return 0
  return index
}

export function ProgramLangDropdown({
  value,
  options,
  onChange,
}: ProgramLangDropdownProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex((opt) => opt.id === value)),
    [options, value],
  )
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const selected = options[selectedIndex] ?? options[0]

  useEffect(() => {
    setActiveIndex(selectedIndex)
  }, [selectedIndex, open])

  useEffect(() => {
    if (!open) return

    function onOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', onOutside)
    window.addEventListener('touchstart', onOutside)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('mousedown', onOutside)
      window.removeEventListener('touchstart', onOutside)
      window.removeEventListener('keydown', onEscape)
    }
  }, [open])

  function selectAt(index: number) {
    const opt = options[index]
    if (!opt) return
    onChange(opt.id)
    setOpen(false)
  }

  const menuSurfaceClass =
    theme === 'light'
      ? 'border border-slate-300/75 bg-white/[0.96] shadow-[0_18px_40px_rgba(15,23,42,0.16)]'
      : 'border border-pebble-border/40 bg-pebble-panel/95 shadow-[0_16px_48px_rgba(2,8,23,0.6)]'

  return (
    <div ref={containerRef} className={`relative ${open ? 'z-[80]' : 'z-10'}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Programming language: ${selected?.label ?? ''}`}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
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
            setOpen((prev) => !prev)
          }
        }}
        className="inline-flex items-center gap-1 rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
      >
        {selected?.label ?? value}
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-pebble-text-secondary transition ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        role="listbox"
        aria-label="Select programming language"
        onKeyDown={(event) => {
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
        }}
        className={`absolute right-0 top-[calc(100%+6px)] z-[90] min-w-[140px] origin-top-right rounded-xl p-1.5 backdrop-blur-xl transition duration-150 ${menuSurfaceClass} ${
          open
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-[0.97] opacity-0'
        }`}
      >
        {options.map((opt, index) => {
          const isSelected = opt.id === value
          const isActive = index === activeIndex
          return (
            <button
              key={opt.id}
              role="option"
              aria-selected={isSelected}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectAt(index)}
              className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
                isSelected
                  ? 'border-pebble-accent/50 bg-pebble-accent/20 text-pebble-text-primary'
                  : isActive
                    ? 'border-pebble-border/40 bg-pebble-overlay/[0.18] text-pebble-text-primary'
                    : 'border-transparent bg-transparent text-pebble-text-secondary hover:border-pebble-border/35 hover:bg-pebble-overlay/[0.12]'
              }`}
            >
              <span className="inline-flex w-3.5 justify-center">
                {isSelected ? (
                  <Check className="h-3 w-3 text-pebble-accent" aria-hidden="true" />
                ) : null}
              </span>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
