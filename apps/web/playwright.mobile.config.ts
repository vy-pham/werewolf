import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * Cross-client e2e: the Expo app (exported for the web) and the web app in the same game.
 * Run: `pnpm --filter @werewolf/web e2e:mobile`.
 */
const MOBILE_PORT = 8082;

export default defineConfig({
  ...base,
  testMatch: 'mobile-web.spec.ts',
  testIgnore: [],
  webServer: [
    {
      command: 'pnpm --filter @werewolf/server dev:local',
      url: 'http://127.0.0.1:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        LOG_LEVEL: 'warn',
        CORS_ORIGINS: `http://127.0.0.1:5173,http://127.0.0.1:${MOBILE_PORT}`,
      },
    },
    {
      command: 'pnpm exec vite --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: 'http://127.0.0.1:4000' },
    },
    {
      command: `pnpm --filter @werewolf/mobile exec expo export --platform web --output-dir dist-web && node e2e/spa-server.mjs ../mobile/dist-web ${MOBILE_PORT}`,
      url: `http://127.0.0.1:${MOBILE_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { EXPO_PUBLIC_API_URL: 'http://127.0.0.1:4000' },
    },
  ],
});
