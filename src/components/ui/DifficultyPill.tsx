import type { HTMLAttributes } from 'react'
import { useTheme } from '../../hooks/useTheme'

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
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
    if (difficulty === 'Medium') {
      return 'bg-amber-50 text-amber-700 border-amber-200'
    }
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  if (difficulty === 'Easy') {
    return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
  }
  if (difficulty === 'Medium') {
    return 'bg-amber-500/15 text-amber-200 border-amber-400/30'
  }
  return 'bg-rose-500/15 text-rose-200 border-rose-400/30'
}

export function DifficultyPill({
  difficulty,
  label,
  className,
  ...props
}: DifficultyPillProps) {
  const { theme } = useTheme()
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium leading-none',
        toneClass(theme, difficulty),
        className,
      )}
      {...props}
    >
      {label ?? difficulty}
    </span>
  )
}

export type { DifficultyValue }
