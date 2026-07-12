import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules', 'dist', 'src/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/api/generated/**',
        'src/e2e/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/styles/**',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 65,
        branches: 65,
      },
    },
  },
});
