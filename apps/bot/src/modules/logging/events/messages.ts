import type { LoggingSettings } from '@discordplus/shared';
import {
  AttachmentBuilder,
  Events,
  type Guild,
  type Message,
  type PartialMessage,
} from 'discord.js';
import type { BotContext } from '../../../core/context';
import { defineEvent } from '../../../core/types';
import { sendLogMessage } from '../../../services/log-channel';
import { bulkDeletedEmbed, messageDeletedEmbed, messageEditedEmbed, transcript } from '../embeds';
import { isContentEdit, isIgnoredChannel } from '../filters';
import { channelLineage, messageSnapshot } from '../snapshots';

/** Logging settings when activity of `message` belongs in the message log, else null. */
async function messageLogSettings(
  ctx: BotContext,
  guild: Guild,
  message: Message | PartialMessage,
): Promise<LoggingSettings | null> {
  // The bot's own messages (e.g. self-deleting notices) are never logged.
  const author = message.author;
  if ((author && author.id === ctx.client.user?.id) || message.system) return null;
  const logging = await ctx.settings.section(guild.id, 'logging');
  if (!logging.channels.message) return null;
  if (logging.ignoreBots && author?.bot) return null;
  if (isIgnoredChannel(logging, channelLineage(guild, message.channelId))) return null;
  return logging;
}

export const messageDeleteEvent = defineEvent({
  event: Events.MessageDelete,
  async handle(ctx, message) {
    const reason = ctx.deletionMarks.take(message.id);
    const guild = message.guild;
    if (!guild || !(await messageLogSettings(ctx, guild, message))) return;
    await sendLogMessage(ctx, guild, 'message', {
      embeds: [messageDeletedEmbed(messageSnapshot(message), reason)],
    });
  },
});

export const messageBulkDeleteEvent = defineEvent({
  event: Events.MessageBulkDelete,
  async handle(ctx, messages, channel) {
    let reason: string | undefined;
    for (const id of messages.keys()) reason = ctx.deletionMarks.take(id) ?? reason;

    const guild = channel.guild;
    const logging = await ctx.settings.section(guild.id, 'logging');
    if (!logging.channels.message) return;
    if (isIgnoredChannel(logging, channelLineage(guild, channel.id))) return;

    const snapshots = [...messages.values()].map(messageSnapshot);
    await sendLogMessage(ctx, guild, 'message', ({ canAttachFiles }) => ({
      embeds: [
        bulkDeletedEmbed({
          channelId: channel.id,
          count: messages.size,
          reason,
          transcriptAttached: canAttachFiles,
        }),
      ],
      files: canAttachFiles
        ? [
            new AttachmentBuilder(Buffer.from(transcript(snapshots), 'utf8'), {
              name: `silinen-mesajlar-${channel.id}.txt`,
            }),
          ]
        : [],
    }));
  },
});

export const messageUpdateEvent = defineEvent({
  event: Events.MessageUpdate,
  async handle(ctx, before, after) {
    const guild = after.guild;
    if (!guild || !isContentEdit(before, after)) return;
    if (!(await messageLogSettings(ctx, guild, after))) return;
    await sendLogMessage(ctx, guild, 'message', {
      embeds: [messageEditedEmbed(before.partial ? null : before.content, messageSnapshot(after))],
    });
  },
});
