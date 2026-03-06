type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'relative border border-pebble-accent/52 bg-pebble-accent/24 text-pebble-text-primary shadow-[0_12px_26px_rgba(2,8,23,0.24)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[46%] before:rounded-t-[inherit] before:bg-pebble-overlay/20 before:content-[\'\'] hover:-translate-y-[1px] hover:bg-pebble-accent/32 hover:border-pebble-accent/68 hover:shadow-[0_16px_30px_rgba(2,8,23,0.28)] focus-visible:ring-pebble-accent/50',
  secondary:
    'border border-pebble-border/34 bg-pebble-overlay/10 text-pebble-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-[1px] hover:border-pebble-border/48 hover:bg-pebble-overlay/16 hover:text-pebble-text-primary focus-visible:ring-pebble-border/45',
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
