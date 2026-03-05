import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'COGNITO_'],
  plugins: [
    nodePolyfills({
      // Polyfill `global`, `Buffer`, and `process` for Cognito SRP auth
      globals: {
        global: true,
        Buffer: true,
        process: true,
      },
      protocolImports: true,
    }),
    react(),
  ],
  define: {
    // Belt-and-suspenders fallback for any remaining `global` references
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
