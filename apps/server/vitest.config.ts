import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests start MongoDB in memory; the binary is downloaded once in global setup.
    globalSetup: ['src/test/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
