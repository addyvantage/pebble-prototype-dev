import pebbleLogoLight from '../../assets/branding/PebbleLogoLight.png'
import pebbleLogoDark from '../../assets/branding/PebbleLogoDark.png'
import { useTheme } from '../../hooks/useTheme'

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  return (
    <div className="flex items-center leading-none">
      <img
        src={isDarkMode ? pebbleLogoDark : pebbleLogoLight}
        alt="Pebble"
        draggable={false}
        className={className ?? 'h-28 w-auto select-none pointer-events-none'}
      />
    </div>
  )
}
