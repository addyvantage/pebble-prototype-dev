import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { animate, useMotionValue, type AnimationPlaybackControls } from 'framer-motion'

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
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null)
  const phaseMotion = useMotionValue(0)
  const phaseAnimation = useRef<AnimationPlaybackControls | null>(null)

  const scale = animation?.scale ?? 0
  const speed = animation?.speed ?? 0
  const displacementScale = animationEnabled ? mapRange(scale, 1, 100, 22, 88) : 0
  const bleedInset = animationEnabled ? mapRange(scale, 1, 100, 22, 84) : 0
  const durationSec = animationEnabled ? mapRange(speed, 1, 100, 30, 5) : 1

  useEffect(() => {
    if (!animationEnabled || !turbulenceRef.current || !displacementRef.current) return

    phaseAnimation.current?.stop()
    phaseMotion.set(0)

    const xBase = 0.0009
    const yBase = 0.0031
    const xAmp = mapRange(scale, 1, 100, 0.00018, 0.00045)
    const yAmp = mapRange(scale, 1, 100, 0.00045, 0.0011)

    phaseAnimation.current = animate(phaseMotion, Math.PI * 2, {
      duration: durationSec,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'linear',
      onUpdate: (phase) => {
        const x = xBase + Math.sin(phase) * xAmp
        const y = yBase + Math.cos(phase * 0.85) * yAmp

        turbulenceRef.current?.setAttribute(
          'baseFrequency',
          `${x.toFixed(6)},${y.toFixed(6)}`,
        )

        // Gentle seed drift adds organic variation without chaotic flicker.
        const seed = 2 + Math.round((Math.sin(phase * 0.35) + 1) * 3)
        turbulenceRef.current?.setAttribute('seed', String(seed))

        const displacementPulse = displacementScale * (0.92 + 0.16 * Math.sin(phase * 0.55))
        displacementRef.current?.setAttribute('scale', displacementPulse.toFixed(2))
      },
    })

    return () => {
      phaseAnimation.current?.stop()
      phaseAnimation.current = null
    }
  }, [animationEnabled, durationSec, displacementScale, phaseMotion, scale])

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
              <feDisplacementMap
                ref={displacementRef}
                in="SourceGraphic"
                in2="undulation"
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

      {noise && noise.opacity > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png')`,
            backgroundSize: noise.scale * 200,
            backgroundRepeat: 'repeat',
            opacity: noise.opacity / 2,
          }}
        />
      ) : null}
    </div>
  )
}
