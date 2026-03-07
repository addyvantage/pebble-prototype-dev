type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-pebble-accent/42 bg-[linear-gradient(180deg,rgba(var(--pebble-accent),0.22)_0%,rgba(var(--pebble-accent),0.16)_100%)] text-pebble-text-primary shadow-[0_10px_24px_rgba(8,15,35,0.16),inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-[1px] hover:border-pebble-accent/58 hover:bg-[linear-gradient(180deg,rgba(var(--pebble-accent),0.28)_0%,rgba(var(--pebble-accent),0.20)_100%)] hover:shadow-[0_14px_28px_rgba(8,15,35,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] active:translate-y-[1px] active:bg-[linear-gradient(180deg,rgba(var(--pebble-accent),0.18)_0%,rgba(var(--pebble-accent),0.14)_100%)] focus-visible:ring-pebble-accent/45',
  secondary:
    'border border-pebble-border/30 bg-[linear-gradient(180deg,rgba(var(--pebble-overlay),0.10)_0%,rgba(var(--pebble-overlay),0.06)_100%)] text-pebble-text-secondary shadow-[0_8px_20px_rgba(8,15,35,0.08),inset_0_1px_0_rgba(255,255,255,0.07)] hover:-translate-y-[1px] hover:border-pebble-border/44 hover:bg-[linear-gradient(180deg,rgba(var(--pebble-overlay),0.14)_0%,rgba(var(--pebble-overlay),0.09)_100%)] hover:text-pebble-text-primary hover:shadow-[0_12px_24px_rgba(8,15,35,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] active:translate-y-[1px] active:bg-[linear-gradient(180deg,rgba(var(--pebble-overlay),0.08)_0%,rgba(var(--pebble-overlay),0.05)_100%)] focus-visible:ring-pebble-border/40',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-4.5 text-sm',
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
) {
  return classNames(
    'inline-flex items-center justify-center overflow-hidden rounded-[1rem] font-semibold tracking-[0.01em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none',
    variantClasses[variant],
    sizeClasses[size],
  )
}
