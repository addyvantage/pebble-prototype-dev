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
        'mx-auto w-full max-w-[1360px] px-5 md:px-8 lg:px-10 2xl:max-w-[1440px]',
        className,
      )}
      {...props}
    />
  )
}
