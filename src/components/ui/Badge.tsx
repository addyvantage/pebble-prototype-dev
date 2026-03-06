import type { HTMLAttributes } from 'react'

type BadgeVariant = 'neutral' | 'success' | 'warning'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'border-pebble-border/34 bg-pebble-overlay/12 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_16px_rgba(55,72,110,0.06)] dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-[hsl(220_20%_92%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_18px_rgba(0,0,0,0.16)]',
  success: 'border-pebble-success/35 bg-pebble-success/15 text-pebble-success',
  warning: 'border-pebble-warning/35 bg-pebble-warning/15 text-pebble-warning',
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function Badge({
  className,
  variant = 'neutral',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-[0.01em]',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
