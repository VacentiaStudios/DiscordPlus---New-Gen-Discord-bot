import { snowflakeSchema } from '@discordplus/shared';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: snowflakeSchema,
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'postgres:// ile başlamalı'),
  /** When set, slash commands are registered to this guild only (instant updates). */
  DEV_GUILD_ID: snowflakeSchema.optional(),
  WEB_URL: z.url().default('http://localhost:3000'),
  MESSAGE_CACHE_SIZE: z.coerce.number().int().min(0).max(1_000).default(100),
  MESSAGE_CACHE_LIFETIME_SECONDS: z.coerce.number().int().min(60).default(3_600),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Treat empty values (e.g. `DEV_GUILD_ID=` in .env) as unset.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Ortam değişkenleri eksik veya geçersiz (.env dosyasını kontrol edin):\n${issues}`,
    );
  }
  return result.data;
}
