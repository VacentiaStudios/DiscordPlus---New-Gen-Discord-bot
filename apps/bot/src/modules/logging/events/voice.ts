import { Events, type Guild } from 'discord.js';
import type { LoggingSettings } from '@discordplus/shared';
import { defineEvent } from '../../../core/types';
import { sendLogMessage } from '../../../services/log-channel';
import { voiceEvents, type VoiceEvent } from '../diff';
import { voiceEmbed } from '../embeds';
import { isIgnoredChannel } from '../filters';
import { channelLineage, userRef } from '../snapshots';

function isIgnored(logging: LoggingSettings, guild: Guild, event: VoiceEvent): boolean {
  const ignored = (channelId: string) =>
    isIgnoredChannel(logging, channelLineage(guild, channelId));
  // A move is shown unless both ends are ignored.
  if (event.kind === 'moved') return ignored(event.fromId) && ignored(event.toId);
  return ignored(event.channelId);
}

export const voiceStateEvent = defineEvent({
  event: Events.VoiceStateUpdate,
  async handle(ctx, before, after) {
    const events = voiceEvents(before, after);
    const user = after.member?.user ?? before.member?.user;
    if (events.length === 0 || !user) return;

    const guild = after.guild;
    const logging = await ctx.settings.section(guild.id, 'logging');
    if (!logging.channels.voice || (logging.ignoreBots && user.bot)) return;
    const shown = events.filter((event) => !isIgnored(logging, guild, event));
    if (shown.length === 0) return;
    await sendLogMessage(ctx, guild, 'voice', {
      embeds: shown.map((event) => voiceEmbed(userRef(user), event)),
    });
  },
});
