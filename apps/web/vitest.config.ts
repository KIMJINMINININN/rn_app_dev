import path from 'node:path';

import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: [...configDefaults.exclude, 'e2e/**', '.next/**', 'playwright-report/**', 'test-results/**'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
