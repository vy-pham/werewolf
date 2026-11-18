import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/test/**'],
      // NFR-10: the game engine keeps ≥ 90% coverage. CI fails below this.
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
