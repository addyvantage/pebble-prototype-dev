import type { HTMLAttributes } from 'react'

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

type PageContainerProps = HTMLAttributes<HTMLDivElement>

export function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <div
      className={classNames(
        // Shared shell tokens for all non-immersive pages.
        'mx-auto w-full max-w-[1520px] px-4 md:px-6 lg:px-8 2xl:max-w-[1640px]',
        className,
      )}
      {...props}
    />
  )
}
