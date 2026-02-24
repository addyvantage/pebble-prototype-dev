import type { HTMLAttributes } from 'react'

type CardPadding = 'sm' | 'md' | 'lg'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding
  interactive?: boolean
}

const paddingClasses: Record<CardPadding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

function classNames(...values: Array<string | boolean | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function Card({
  className,
  padding = 'md',
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={classNames(
        'glass-panel soft-ring',
        interactive && 'glass-interactive',
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  )
}
