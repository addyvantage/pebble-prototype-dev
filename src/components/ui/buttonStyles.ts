type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'relative border border-pebble-accent/50 bg-pebble-accent/22 text-pebble-text-primary shadow-[0_10px_22px_rgba(2,8,23,0.28)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[46%] before:rounded-t-[inherit] before:bg-pebble-overlay/18 before:content-[\'\'] hover:bg-pebble-accent/30 hover:border-pebble-accent/65 hover:shadow-[0_12px_26px_rgba(2,8,23,0.3)] focus-visible:ring-pebble-accent/50',
  secondary:
    'border border-pebble-border/35 bg-pebble-overlay/8 text-pebble-text-secondary hover:bg-pebble-overlay/14 hover:text-pebble-text-primary focus-visible:ring-pebble-border/45',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
) {
  return classNames(
    'inline-flex items-center justify-center overflow-hidden rounded-xl font-medium tracking-[0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60',
    variantClasses[variant],
    sizeClasses[size],
  )
}
