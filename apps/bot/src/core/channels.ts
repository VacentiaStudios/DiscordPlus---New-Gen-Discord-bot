import type { Guild } from 'discord.js';

/** The channel, its parent and grandparent (thread → channel → category). */
export function channelLineage(guild: Guild, channelId: string): (string | null)[] {
  const channel = guild.channels.cache.get(channelId);
  const parent = channel?.parentId ? guild.channels.cache.get(channel.parentId) : undefined;
  return [channelId, channel?.parentId ?? null, parent?.parentId ?? null];
}
