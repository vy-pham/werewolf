import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: real browsers against the real server (in-memory MongoDB, see
 * apps/server/src/dev-memory.ts) and the Vite dev server. Run: `pnpm --filter @werewolf/web e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 300_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'pnpm --filter @werewolf/server dev:local',
      url: 'http://127.0.0.1:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { LOG_LEVEL: 'warn' },
    },
    {
      command: 'pnpm exec vite --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: 'http://127.0.0.1:4000' },
    },
  ],
});
