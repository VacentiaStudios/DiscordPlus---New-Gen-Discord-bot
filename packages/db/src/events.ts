import { isSettingsSection, snowflakeSchema, type SettingsSection } from '@discordplus/shared';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { DbExecutor } from './types';

/**
 * Postgres NOTIFY channel the web panel uses to tell the bot that something
 * changed. Notifications sent inside a transaction are delivered on commit.
 */
export const DB_EVENTS_CHANNEL = 'discordplus_events';

export const dbEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('settings_updated'),
    guildId: snowflakeSchema,
    section: z.custom<SettingsSection>(isSettingsSection),
    actorId: z.string(),
    actorName: z.string(),
  }),
  // A case was edited or deleted in the panel; the bot refreshes its mod-log message.
  z.object({
    type: z.literal('case_updated'),
    guildId: snowflakeSchema,
    caseId: z.number().int().positive(),
  }),
]);

export type DbEvent = z.infer<typeof dbEventSchema>;

export async function notifyEvent(db: DbExecutor, event: DbEvent): Promise<void> {
  await db.execute(sql`select pg_notify(${DB_EVENTS_CHANNEL}, ${JSON.stringify(event)})`);
}

export function parseDbEvent(payload: string | undefined): DbEvent | null {
  if (!payload) return null;
  try {
    const result = dbEventSchema.safeParse(JSON.parse(payload));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
