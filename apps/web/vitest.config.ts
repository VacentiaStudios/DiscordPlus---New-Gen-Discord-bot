import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside of Next's server bundles.
      'server-only': fileURLToPath(new URL('./src/test/empty-module.ts', import.meta.url)),
    },
  },
  test: {
    name: 'web',
    include: ['src/**/*.test.{ts,tsx}'],
    hookTimeout: 60_000,
  },
});
