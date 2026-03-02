import { useTheme } from '../../hooks/useTheme'

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  const { theme } = useTheme()
  const src =
    theme === 'light'
      ? '/branding/PebbleLogoLight.png'
      : '/branding/PebbleLogoDark.png'

  return (
    <img
      src={src}
      alt="Pebble"
      draggable={false}
      className={className}
    />
  )
}
