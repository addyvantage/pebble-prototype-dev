import type { HTMLAttributes } from 'react'
import { AlertTriangle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

type StatusPillVariant = 'fail' | 'warn' | 'success' | 'info'

type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: StatusPillVariant
  showIcon?: boolean
}

const lightVariantClasses: Record<StatusPillVariant, string> = {
  fail:
    'border-[rgba(229,171,89,0.42)] bg-[rgba(255,248,236,0.98)] text-[#A65A12]',
  warn:
    'border-amber-400/52 bg-amber-500/12 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
  success:
    'border-emerald-400/52 bg-emerald-500/12 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
  info:
    'border-blue-400/48 bg-blue-500/12 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
}

const darkVariantClasses: Record<StatusPillVariant, string> = {
  fail:
    'border-[rgba(255,178,92,0.52)] bg-[rgba(88,56,21,0.72)] text-[rgba(255,231,198,0.98)]',
  warn:
    'border-amber-300/50 bg-amber-400/18 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  success:
    'border-emerald-300/50 bg-emerald-400/18 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  info:
    'border-blue-300/50 bg-blue-400/16 text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
}

const variantIcons: Record<StatusPillVariant, typeof AlertTriangle> = {
  fail: AlertTriangle,
  warn: TriangleAlert,
  success: CheckCircle2,
  info: Info,
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function StatusPill({
  className,
  variant = 'info',
  showIcon = false,
  children,
  ...props
}: StatusPillProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const Icon = variantIcons[variant]

  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.01em]',
        isDark ? darkVariantClasses[variant] : lightVariantClasses[variant],
        className,
      )}
      {...props}
    >
      {showIcon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  )
}
