import type { LogCategory } from '@discordplus/shared';
import {
  PermissionFlagsBits,
  type Guild,
  type Message,
  type MessageCreateOptions,
} from 'discord.js';
import type { Logger } from '../logger';
import type { GuildSettingsService } from './settings';

export interface LogDeps {
  settings: GuildSettingsService;
  logger: Logger;
}

const REQUIRED = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
];

/**
 * A message, or a builder for one when the content depends on whether files can
 * be attached in the log channel.
 */
export type LogPayload =
  MessageCreateOptions | ((access: { canAttachFiles: boolean }) => MessageCreateOptions);

/**
 * Sends a message to the guild's log channel of `category`. Returns null when the
 * category is off or the channel is unusable; logging never breaks the caller.
 */
export async function sendLogMessage(
  deps: LogDeps,
  guild: Guild,
  category: LogCategory,
  payload: LogPayload,
): Promise<Message | null> {
  const { channels } = await deps.settings.section(guild.id, 'logging');
  const channelId = channels[category];
  if (!channelId) return null;

  const channel = guild.channels.cache.get(channelId);
  const me = guild.members.me;
  if (!channel || !me || !channel.isTextBased()) {
    deps.logger.debug({ guildId: guild.id, channelId, category }, 'Log channel unavailable');
    return null;
  }
  const permissions = channel.permissionsFor(me);
  if (!permissions.has(REQUIRED)) {
    deps.logger.debug({ guildId: guild.id, channelId, category }, 'Missing log channel access');
    return null;
  }

  const options =
    typeof payload === 'function'
      ? payload({ canAttachFiles: permissions.has(PermissionFlagsBits.AttachFiles) })
      : payload;
  try {
    return await channel.send({ allowedMentions: { parse: [] }, ...options });
  } catch (error) {
    deps.logger.warn({ err: error, guildId: guild.id, channelId, category }, 'Log message failed');
    return null;
  }
}
