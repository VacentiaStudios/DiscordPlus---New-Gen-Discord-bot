import { defineConfig, devices } from '@playwright/test';
import { DISCORD_MOCK_PORT, E2E_ENV, WEB_PORT } from './e2e/env';

// Runs against a production build: `pnpm build` first. Needs a PostgreSQL server
// (E2E_DATABASE_URL, default postgres://discordplus:discordplus@localhost:5432/discordplus_e2e).
export default defineConfig({
  testDir: './e2e',
  // Specs share one seeded database.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: E2E_ENV.WEB_URL,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'retain-on-failure',
    launchOptions: {
      // Lets environments with a preinstalled Chromium skip `playwright install`.
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
      args: ['--no-proxy-server'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/mock-discord.mjs',
      url: `http://localhost:${DISCORD_MOCK_PORT}/health`,
      env: { DISCORD_MOCK_PORT: String(DISCORD_MOCK_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node scripts/start-standalone.mjs',
      url: E2E_ENV.WEB_URL,
      env: {
        ...E2E_ENV,
        PORT: String(WEB_PORT),
        HOSTNAME: 'localhost',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
