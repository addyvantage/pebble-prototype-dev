import type { HTMLAttributes } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { useI18n } from '../../i18n/useI18n'

type DifficultyValue = 'Easy' | 'Medium' | 'Hard'

type DifficultyPillProps = HTMLAttributes<HTMLSpanElement> & {
  difficulty: DifficultyValue
  label?: string
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

function toneClass(theme: 'dark' | 'light', difficulty: DifficultyValue) {
  if (theme === 'light') {
    if (difficulty === 'Easy') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    }
    if (difficulty === 'Medium') {
      return 'bg-amber-100 text-amber-800 border-amber-300'
    }
    return 'bg-rose-100 text-rose-800 border-rose-300'
  }

  if (difficulty === 'Easy') {
    return 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
  }
  if (difficulty === 'Medium') {
    return 'bg-amber-400/20 text-amber-300 border-amber-400/40'
  }
  return 'bg-rose-400/20 text-rose-300 border-rose-400/40'
}

export function DifficultyPill({
  difficulty,
  label,
  className,
  ...props
}: DifficultyPillProps) {
  const { theme } = useTheme()
  const { t } = useI18n()

  const fallbackLabel = t(`difficulty.${difficulty.toLowerCase()}` as any) || difficulty

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold leading-none',
        toneClass(theme, difficulty),
        className,
      )}
      {...props}
    >
      {label ?? fallbackLabel}
    </span>
  )
}

export type { DifficultyValue }
