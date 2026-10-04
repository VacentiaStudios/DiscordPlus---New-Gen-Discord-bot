import 'server-only';
import { snowflakeSchema } from '@discordplus/shared';
import { z } from 'zod';

const serverEnvSchema = z.object({
  DISCORD_CLIENT_ID: snowflakeSchema,
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
