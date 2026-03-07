type PebbleCoachLogoProps = {
  theme: 'light' | 'dark'
  alt?: string
  className?: string
}

const LOGO_LIGHT_SRC = '/assets/brand/pebblecode-logo-icon-light.jpeg'
const LOGO_DARK_SRC = '/assets/brand/pebblecode-logo-icon-dark.jpeg'

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function PebbleCoachLogo({
  theme,
  alt = 'PebbleCode',
  className,
}: PebbleCoachLogoProps) {
  const logoSrc = theme === 'dark' ? LOGO_DARK_SRC : LOGO_LIGHT_SRC

  return (
    <img
      src={logoSrc}
      alt={alt}
      draggable={false}
      className={classNames('h-full w-full select-none object-cover', className)}
    />
  )
}
