/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pebble: {
          deep: 'rgb(var(--pebble-deep) / <alpha-value>)',
          secondary: 'rgb(var(--pebble-secondary) / <alpha-value>)',
          panel: 'rgb(var(--pebble-panel) / <alpha-value>)',
          canvas: 'rgb(var(--pebble-canvas) / <alpha-value>)',
          border: 'rgb(var(--pebble-border) / <alpha-value>)',
          overlay: 'rgb(var(--pebble-overlay) / <alpha-value>)',
          accent: 'rgb(var(--pebble-accent) / <alpha-value>)',
          success: '#10B981',
          warning: '#F59E0B',
          'text-primary': 'rgb(var(--pebble-text-primary) / <alpha-value>)',
          'text-secondary': 'rgb(var(--pebble-text-secondary) / <alpha-value>)',
          'text-muted': 'rgb(var(--pebble-text-muted) / <alpha-value>)',
        },
      },
      boxShadow: {
        glass: 'var(--pebble-shadow)',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        shimmer: 'shimmer var(--shimmer-duration, 2.6s) linear infinite',
        fadeInScale: 'fadeInScale 180ms ease-out',
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: '200% center, center' },
          to: { backgroundPosition: '-200% center, center' },
        },
        fadeInScale: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
