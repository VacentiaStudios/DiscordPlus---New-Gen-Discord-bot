import 'server-only';
import { snowflakeSchema } from '@discordplus/shared';
import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'postgres:// ile başlamalı'),
  DISCORD_CLIENT_ID: snowflakeSchema,
  DISCORD_CLIENT_SECRET: z.string().min(1),
  /** Bot token, used to read channel and role lists for the panel. */
  DISCORD_TOKEN: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, 'en az 32 karakter olmalı'),
  /** Public URL of the site; OAuth redirects are built from it. */
  WEB_URL: z.url().default('http://localhost:3000'),
  /** Overridden in end-to-end tests to point at a mock Discord API. */
  DISCORD_API_BASE: z.url().default('https://discord.com/api/v10'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Validated server-side environment. Parsed lazily so that `next build` does not
 * need runtime secrets.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const cleaned = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== ''),
  );
  const result = serverEnvSchema.safeParse(cleaned);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Web sitesi ortam değişkenleri eksik veya geçersiz: ${issues.join('; ')}`);
  }
  cached = result.data;
  return cached;
}
