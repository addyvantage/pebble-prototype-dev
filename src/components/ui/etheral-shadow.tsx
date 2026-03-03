import { useEffect, useId, useMemo, useState, useRef, type CSSProperties } from 'react'

type AnimationConfig = {
  preview?: boolean
  scale: number
  speed: number
}

type NoiseConfig = {
  opacity: number
  scale: number
}

export interface ShadowOverlayProps {
  sizing?: 'fill' | 'stretch'
  color?: string
  animation?: AnimationConfig
  noise?: NoiseConfig
  style?: CSSProperties
  className?: string
  showTitle?: boolean
}

function mapRange(
  value: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number,
): number {
  if (fromLow === fromHigh) return toLow
  const pct = (value - fromLow) / (fromHigh - fromLow)
  return toLow + pct * (toHigh - toLow)
}

export function Component({
  sizing = 'fill',
  color = 'rgba(128, 128, 128, 1)',
  animation,
  noise,
  style,
  className,
  showTitle = false,
}: ShadowOverlayProps) {
  const rawId = useId()
  const filterId = `shadowoverlay-${rawId.replace(/:/g, '')}`
  const animationEnabled = !!animation && animation.scale > 0

  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)
  const feColorMatrixRef = useRef<SVGFEColorMatrixElement>(null)
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true
    const root = document.documentElement
    return (
      root.classList.contains('dark') ||
      root.classList.contains('theme-dark') ||
      root.getAttribute('data-theme') === 'dark'
    )
  })

  const scale = animation?.scale ?? 0
  const speed = animation?.speed ?? 0
  const displacementScale = animationEnabled ? mapRange(scale, 1, 100, 22, 88) : 0
  const bleedInset = animationEnabled ? mapRange(scale, 1, 100, 22, 84) : 0
  const noiseOpacity = useMemo(() => {
    if (!noise) return 0
    return isDark ? noise.opacity : noise.opacity * 0.25
  }, [isDark, noise])
  const noiseBackgroundSize = useMemo(() => {
    if (!noise) return 0
    return isDark ? noise.scale * 200 : noise.scale * 140
  }, [isDark, noise])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const update = () => {
      setIsDark(
        root.classList.contains('dark') ||
        root.classList.contains('theme-dark') ||
        root.getAttribute('data-theme') === 'dark',
      )
    }
    update()

    const observer = new MutationObserver(update)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!animationEnabled || !turbulenceRef.current || !displacementRef.current) return

    const xBase = 0.0009
    const yBase = 0.0031
    const xAmp = mapRange(scale, 1, 100, 0.00018, 0.00045)
    const yAmp = mapRange(scale, 1, 100, 0.00045, 0.0011)
    const phaseVelocity = mapRange(speed, 1, 100, 0.22, 1.25)
    const hueVelocityDeg = mapRange(speed, 1, 100, 8, 32)

    let rafId = 0
    let lastTs = performance.now()
    let phase = 0
    let hue = 0

    const tick = (ts: number) => {
      const dt = Math.max(0, (ts - lastTs) / 1000)
      lastTs = ts

      phase += dt * phaseVelocity
      hue += dt * hueVelocityDeg

      const x = xBase + Math.sin(phase) * xAmp
      const y = yBase + Math.cos(phase * 0.85) * yAmp
      turbulenceRef.current?.setAttribute('baseFrequency', `${x.toFixed(6)},${y.toFixed(6)}`)

      // Gentle seed drift adds organic variation without chaotic flicker.
      const seed = 2 + Math.round((Math.sin(phase * 0.35) + 1) * 3)
      turbulenceRef.current?.setAttribute('seed', String(seed))

      const displacementPulse = displacementScale * (0.92 + 0.16 * Math.sin(phase * 0.55))
      displacementRef.current?.setAttribute('scale', displacementPulse.toFixed(2))

      if (feColorMatrixRef.current) {
        feColorMatrixRef.current.setAttribute('values', String(hue % 360))
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [animationEnabled, displacementScale, scale, speed])

  return (
    <div
      className={className}
      style={{
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      {animationEnabled ? (
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
          <defs>
            <filter id={filterId}>
              <feTurbulence
                ref={turbulenceRef}
                result="undulation"
                numOctaves="2"
                baseFrequency="0.0009,0.0031"
                seed="3"
                type="turbulence"
              />
              <feColorMatrix
                ref={feColorMatrixRef}
                in="undulation"
                result="circulation"
                type="hueRotate"
                values="0"
              />
              <feDisplacementMap
                ref={displacementRef}
                in="SourceGraphic"
                in2="circulation"
                scale={displacementScale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null}

      <div
        style={{
          position: 'absolute',
          inset: -bleedInset,
          filter: animationEnabled ? `url(#${filterId}) blur(14px)` : 'none',
        }}
      >
        <div
          style={{
            backgroundColor: color,
            maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
            maskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
            WebkitMaskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {showTitle ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          <h1 className="text-6xl font-bold text-center text-foreground md:text-7xl lg:text-8xl">
            Etheral Shadows
          </h1>
        </div>
      ) : null}

      {noise && noiseOpacity > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png')`,
            backgroundSize: noiseBackgroundSize,
            backgroundRepeat: 'repeat',
            opacity: noiseOpacity / 2,
          }}
        />
      ) : null}
    </div>
  )
}
