import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: [
      'lib/live-console/**/*.test.ts',
      'lib/*.test.ts',
      'components/dashboard/streaming/live/**/*.test.tsx',
    ],
    exclude: ['node_modules/**', 'pwa/**', '.next/**'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
