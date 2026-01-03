import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        'rollup.config.js',
        'vitest.config.ts',
      ],
      thresholds: {
        // Lower thresholds for now - DOM trackers need browser environment
        lines: 20,
        functions: 60,
        branches: 60,
        statements: 20,
      },
    },
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
