/**
 * EtherealShadow — organic ambient shadow using SVG turbulence + displacement.
 *
 * Architecture notes (why this works):
 *
 *  1. SVG <defs> live OUTSIDE the filtered div.
 *     If you put the SVG inside the element the CSS `filter` targets, the
 *     browser includes the SVG in `SourceGraphic` and the turbulence noise
 *     bleeds as colour into the output. Keeping defs as a sibling avoids this.
 *
 *  2. Displacement chain: feTurbulence → feDisplacementMap directly.
 *     The original Framer component used a feColorMatrix that clamped all
 *     channels to 1 (because 4*R + 1 >= 1 always), making displacement a
 *     uniform shift rather than organic distortion. We skip that matrix and
 *     use turbulence R for X displacement and G for Y displacement — these are
 *     independent noise patterns so they distort independently.
 *
 *  3. NO feColorMatrix hueRotate. Animation is instead done by slowly
 *     oscillating feTurbulence baseFrequency with rAF, keeping colours locked
 *     to whatever `color` prop you pass — zero hue drift, zero rainbow.
 *
 *  4. No framer-motion dependency (not installed in this project).
 */

import { useRef, useId, useEffect, type CSSProperties } from 'react'

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── types ───────────────────────────────────────────────────────────────────

interface AnimationConfig {
  scale: number // 1–100: controls displacement pixel range
  speed: number // 1–100: controls morph speed
}

interface NoiseConfig {
  opacity: number
  scale: number
}

interface EtherealShadowProps {
  sizing?: 'fill' | 'stretch'
  color?: string
  animation?: AnimationConfig
  noise?: NoiseConfig
  style?: CSSProperties
  className?: string
}

// ─── component ───────────────────────────────────────────────────────────────

export function EtherealShadow({
  sizing = 'fill',
  color = 'rgba(8, 25, 95, 0.80)',
  animation,
  noise,
  style,
  className = '',
}: EtherealShadowProps) {
  const rawId = useId()
  // IDs must not start with a digit; colons are invalid in CSS id selectors
  const filterId = `es${rawId.replace(/:/g, '')}`

  const animationEnabled = !!animation && animation.scale > 0
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)

  // How many extra pixels the inner div is expanded to hide displaced edges.
  // Must be >= displacementHalfRange + blurRadius so nothing leaks outside.
  const pad = animation ? mapRange(animation.scale, 1, 100, 20, 70) : 0

  // feDisplacementMap scale: how many pixels pixels can move.
  // displacement = scale × (channel − 0.5), so max offset = scale / 2.
  const displacementScale = animation ? mapRange(animation.scale, 1, 100, 10, 40) : 0

  // Period of one full baseFrequency oscillation (seconds)
  const cycleSec = animation ? mapRange(animation.speed, 1, 100, 80, 5) : 30

  // Animate baseFrequency for organic morphing — no hue involved
  useEffect(() => {
    if (!animationEnabled || !turbulenceRef.current) return

    let rafId: number
    const start = performance.now()

    const tick = (now: number) => {
      const t = ((now - start) / 1000) / cycleSec
      // X and Y oscillate at different rates → genuinely 2-D organic movement
      const bfX = 0.0018 + Math.sin(t * Math.PI * 2 * 0.7)  * 0.0006
      const bfY = 0.0055 + Math.cos(t * Math.PI * 2 * 0.45) * 0.0012
      turbulenceRef.current?.setAttribute(
        'baseFrequency',
        `${bfX.toFixed(5)},${bfY.toFixed(5)}`,
      )
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [animationEnabled, cycleSec])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{
        overflow: 'hidden',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        ...style,
      }}
    >
      {/*
       * SVG filter defs — SIBLING to the filtered div, not a child.
       * Zero dimensions so it takes no space and never appears in SourceGraphic.
       */}
      {animationEnabled && (
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
          <defs>
            <filter id={filterId}>
              {/* Step 1: turbulence noise — R and G channels are independent patterns */}
              <feTurbulence
                ref={turbulenceRef}
                result="undulation"
                numOctaves="2"
                baseFrequency="0.0018,0.0055"
                seed="0"
                type="turbulence"
              />
              {/*
               * Step 2: displace the source graphic using turbulence directly.
               * R channel → X displacement, G channel → Y displacement.
               * Because R ≠ G across space, this creates genuine organic 2-D distortion
               * (not a uniform shift). No feColorMatrix needed or wanted.
               */}
              <feDisplacementMap
                in="SourceGraphic"
                in2="undulation"
                scale={displacementScale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/*
       * Expanded inner div absorbs displacement overflow + blur bleed.
       * The outer wrapper's overflow:hidden clips everything to card bounds.
       */}
      <div
        style={{
          position: 'absolute',
          inset: -pad,
          filter: animationEnabled ? `url(#${filterId}) blur(24px)` : 'blur(24px)',
        }}
      >
        {/* Blob shape: colour fills the mask image's opaque region */}
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

      {/* Optional grain overlay */}
      {noise && noise.opacity > 0 && (
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
      )}
    </div>
  )
}
