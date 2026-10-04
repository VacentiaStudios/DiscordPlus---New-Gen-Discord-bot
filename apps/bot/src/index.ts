import { createDatabase, loadGuildSettings } from '@discordplus/db';
import { botInviteUrl } from '@discordplus/shared';
import { DiscordjsErrorCodes, Events } from 'discord.js';
import { sql } from 'drizzle-orm';
import { createClient } from './client';
import type { BotContext } from './core/context';
import { registerEvents } from './core/events';
import { CommandRegistry } from './core/registry';
import { handleInteraction } from './core/router';
import { loadEnv } from './env';
import { createLogger } from './logger';
import { modules } from './modules';
import { ModerationService } from './modules/moderation/service';
import { GuildSettingsService } from './services/settings';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV !== 'production');

const database = createDatabase(env.DATABASE_URL);
try {
  await database.db.execute(sql`select 1`);
} catch (error) {
  logger.fatal({ err: error }, 'Veritabanına bağlanılamadı. DATABASE_URL değerini kontrol edin.');
  process.exit(1);
}

const client = createClient(env);
const registry = new CommandRegistry(modules);

const settings = new GuildSettingsService(async (guildId) => {
  const { settings: loaded, invalidSections } = await loadGuildSettings(database.db, guildId);
  if (invalidSections.length > 0) {
    logger.warn({ guildId, invalidSections }, 'Stored settings are invalid; using defaults');
  }
  return loaded;
});

const moderation = new ModerationService({ client, db: database.db, logger, settings });

const ctx: BotContext = { client, env, logger, db: database.db, settings, registry, moderation };

registerEvents(ctx, registry.events);
client.on(Events.InteractionCreate, (interaction) => void handleInteraction(interaction, ctx));
client.on(Events.Error, (error) => logger.error({ err: error }, 'Discord client error'));
client.on(Events.Warn, (message) => logger.warn(message));

client.once(Events.ClientReady, (readyClient) => {
  logger.info(
    { user: readyClient.user.tag, guilds: readyClient.guilds.cache.size },
    'Logged in to Discord',
  );
  logger.info(`Invite link: ${botInviteUrl(env.DISCORD_CLIENT_ID)}`);
  void (async () => {
    for (const module of modules) {
      try {
        await module.start?.(ctx);
      } catch (error) {
        logger.error({ err: error, module: module.name }, 'Module failed to start');
      }
    }
  })();
});

process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'Unhandled rejection'));

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  for (const module of modules) {
    try {
      await module.stop?.(ctx);
    } catch (error) {
      logger.warn({ err: error, module: module.name }, 'Module failed to stop cleanly');
    }
  }
  await client.destroy();
  await database.close();
  process.exit(0);
}
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await client.login(env.DISCORD_TOKEN);
} catch (error) {
  const code = (error as { code?: unknown }).code;
  if (code === DiscordjsErrorCodes.DisallowedIntents) {
    logger.fatal(
      'Discord ayrıcalıklı intent izni vermedi. Developer Portal → Bot sekmesinde "Server Members Intent" ve "Message Content Intent" seçeneklerini açın.',
    );
  } else if (code === DiscordjsErrorCodes.TokenInvalid) {
    logger.fatal('DISCORD_TOKEN geçersiz. Developer Portal → Bot sekmesinden yeni bir token alın.');
  } else {
    logger.fatal({ err: error }, 'Discord girişi başarısız oldu');
  }
  await database.close();
  process.exit(1);
}
