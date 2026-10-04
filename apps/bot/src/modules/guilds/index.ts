import {
  markGuildLeft,
  syncGuildPresence,
  upsertGuildPresence,
  type GuildPresence,
} from '@discordplus/db';
import { Events, type Guild } from 'discord.js';
import { defineEvent, type BotModule } from '../../core/types';

function presence(guild: Guild): GuildPresence {
  return { id: guild.id, name: guild.name, icon: guild.icon };
}

/**
 * Keeps the `guilds` table in sync with the guilds the bot is in, so the web
 * panel can show "Manage" or "Add bot" for each server.
 */
export const guildsModule: BotModule = {
  name: 'guilds',
  events: [
    defineEvent({
      event: Events.GuildCreate,
      async handle(ctx, guild) {
        await upsertGuildPresence(ctx.db, [presence(guild)]);
        ctx.logger.info({ guildId: guild.id, name: guild.name }, 'Joined guild');
      },
    }),
    defineEvent({
      event: Events.GuildDelete,
      async handle(ctx, guild) {
        await markGuildLeft(ctx.db, guild.id);
        ctx.settings.invalidate(guild.id);
        ctx.logger.info({ guildId: guild.id }, 'Left guild');
      },
    }),
    defineEvent({
      event: Events.GuildUpdate,
      async handle(ctx, before, after) {
        if (before.name === after.name && before.icon === after.icon) return;
        await upsertGuildPresence(ctx.db, [presence(after)]);
      },
    }),
  ],
  async start(ctx) {
    const guilds = [...ctx.client.guilds.cache.values()].map(presence);
    await syncGuildPresence(ctx.db, guilds);
    ctx.logger.info({ count: guilds.length }, 'Synced guild presence');
  },
};
