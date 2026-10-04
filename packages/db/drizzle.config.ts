import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs from packages/db; the shared .env lives at the repo root.
const envFile = resolve(process.cwd(), '../../.env');
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ?? 'postgres://discordplus:discordplus@localhost:5432/discordplus',
  },
  strict: true,
  verbose: true,
});
