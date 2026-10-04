import { AUTH_SECRET, BOT_TOKEN } from './fixtures.mjs';

export const WEB_PORT = 3200;
export const DISCORD_MOCK_PORT = 4010;

/** Environment of the Next.js server under test. */
export const E2E_ENV = {
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ??
    'postgres://discordplus:discordplus@localhost:5432/discordplus_e2e',
  DISCORD_CLIENT_ID: '100000000000000000',
  DISCORD_CLIENT_SECRET: 'e2e-client-secret',
  DISCORD_TOKEN: BOT_TOKEN,
  BETTER_AUTH_SECRET: AUTH_SECRET,
  WEB_URL: `http://localhost:${WEB_PORT}`,
  DISCORD_API_BASE: `http://localhost:${DISCORD_MOCK_PORT}/api/v10`,
};
