import { findExpiredTempBans, type CaseRow } from '@discordplus/db';
import type { BotContext } from '../../core/context';

const RETRY_DELAY_MS = 5 * 60_000;

/**
 * Lifts temporary bans whose time is up. State lives in the database, so bans
 * expiring while the bot was offline are lifted on the next tick after startup.
 * Only guilds in this process's cache are handled, which keeps it shard-safe.
 */
export function startTempBanScheduler(ctx: BotContext, intervalMs = 30_000): () => void {
  let running = false;
  // Failed lifts (e.g. missing permission) are retried later instead of every tick.
  const retryAt = new Map<number, number>();

  const lift = async (row: CaseRow) => {
    const guild = ctx.client.guilds.cache.get(row.guildId);
    if (!guild) return;
    if ((retryAt.get(row.id) ?? 0) > Date.now()) return;
    try {
      await ctx.moderation.liftExpiredBan(guild, row);
      retryAt.delete(row.id);
    } catch (error) {
      retryAt.set(row.id, Date.now() + RETRY_DELAY_MS);
      ctx.logger.warn({ err: error, guildId: row.guildId, caseId: row.id }, 'Could not lift ban');
    }
  };

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const guildIds = [...ctx.client.guilds.cache.keys()];
      const expired = await findExpiredTempBans(ctx.db, new Date(), guildIds);
      for (const row of expired) await lift(row);
    } catch (error) {
      ctx.logger.error({ err: error }, 'Temporary ban scheduler failed');
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  void tick();
  return () => clearInterval(timer);
}
