import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: real browsers against the real server (in-memory MongoDB, see
 * apps/server/src/dev-memory.ts) and the Vite dev server. Run: `pnpm --filter @werewolf/web e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  // The cross-client test needs the Expo web export: see playwright.mobile.config.ts.
  testIgnore: 'mobile-web.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 300_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    // A bot click can race a phase change (button just got disabled): never wait forever.
    actionTimeout: 5_000,
    ...devices['Desktop Chrome'],
    // Fake microphone + auto-accepted permission prompt for the voice tests.
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
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
