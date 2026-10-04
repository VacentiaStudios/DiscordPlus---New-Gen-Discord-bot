import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'db',
    include: ['src/**/*.test.ts'],
    // PGlite boots a WASM Postgres and applies migrations per test file.
    hookTimeout: 60_000,
  },
});
