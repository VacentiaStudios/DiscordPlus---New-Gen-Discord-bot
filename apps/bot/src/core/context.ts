import type { Database } from '@discordplus/db';
import type { Client } from 'discord.js';
import type { Env } from '../env';
import type { Logger } from '../logger';
import type { ModerationService } from '../modules/moderation/service';
import type { GuildSettingsService } from '../services/settings';
import type { CommandRegistry } from './registry';

/** Shared services handed to every command, component and event handler. */
export interface BotContext {
  client: Client;
  env: Env;
  logger: Logger;
  db: Database;
  settings: GuildSettingsService;
  registry: CommandRegistry;
  moderation: ModerationService;
}
