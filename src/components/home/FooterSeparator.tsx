export function FooterSeparator() {
  const sparklePoints = [
    { left: '22%', top: '50%', delay: '0.1s', duration: '3.8s' },
    { left: '34%', top: '47%', delay: '0.8s', duration: '4.4s' },
    { left: '46%', top: '52%', delay: '1.2s', duration: '3.7s' },
    { left: '58%', top: '48%', delay: '0.5s', duration: '4.2s' },
    { left: '70%', top: '51%', delay: '1.6s', duration: '4.0s' },
    { left: '80%', top: '49%', delay: '0.3s', duration: '4.1s' },
  ] as const

  return (
    <div className="relative h-[36px] w-full overflow-hidden sm:h-[42px] md:h-[48px]">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
        <div className="mx-auto h-px w-[min(92vw,1280px)] bg-gradient-to-r from-transparent via-pebble-accent/42 to-transparent dark:via-sky-300/58" />
        <div className="mx-auto mt-[-1px] h-[4px] w-[min(40vw,400px)] bg-gradient-to-r from-transparent via-pebble-accent/28 to-transparent blur-[7px] dark:via-sky-300/38" />
      </div>

      <div className="pointer-events-none absolute inset-0">
        {sparklePoints.map((sparkle, index) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={`footer-sparkle-${index}`}
            className="absolute h-[2.5px] w-[2.5px] rounded-full bg-pebble-accent/42 shadow-[0_0_6px_rgba(37,99,235,0.28)] dark:bg-sky-300/62 dark:shadow-[0_0_8px_rgba(125,211,252,0.38)]"
            style={{
              left: sparkle.left,
              top: sparkle.top,
              animationName: 'pebbleFooterSparkle',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDuration: sparkle.duration,
              animationDelay: sparkle.delay,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-pebble-accent/[0.015] to-transparent dark:via-sky-300/[0.03]" />
    </div>
  )
}
