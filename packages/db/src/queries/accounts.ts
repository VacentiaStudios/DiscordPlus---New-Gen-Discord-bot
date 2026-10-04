import { and, eq } from 'drizzle-orm';
import { account } from '../schema';
import type { DbExecutor } from '../types';

export interface DiscordAccount {
  /** Better Auth account row id. */
  id: string;
  /** The user's Discord snowflake. */
  discordId: string;
}

/** The Discord account linked to a Better Auth user. */
export async function getDiscordAccount(
  db: DbExecutor,
  userId: string,
): Promise<DiscordAccount | undefined> {
  const [row] = await db
    .select({ id: account.id, discordId: account.accountId })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'discord')))
    .limit(1);
  return row;
}
