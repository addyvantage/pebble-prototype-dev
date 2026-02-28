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
        'mx-auto w-full max-w-[1760px] px-6 2xl:max-w-[1880px]',
        className,
      )}
      {...props}
    />
  )
}
