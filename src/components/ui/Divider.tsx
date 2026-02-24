import type { HTMLAttributes } from 'react'

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return (
    <hr className={classNames('border-0 border-t border-pebble-border/28', className)} {...props} />
  )
}
