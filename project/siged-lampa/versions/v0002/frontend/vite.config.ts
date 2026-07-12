import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000', changeOrigin: true } } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', exclude: ['node_modules', 'dist', 'src/e2e'], coverage: { reporter: ['json-summary', 'text'] } },
});
