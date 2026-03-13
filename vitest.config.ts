import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.{test,spec}.{ts,mts}',
      'server/**/*.{test,spec}.{ts,mts}',
      'lib/**/*.{test,spec}.{ts,mts}',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname),
      '@': path.resolve(__dirname),
    },
  },
})
