import 'server-only';
import {
  fetchGuildChannels,
  fetchGuildRoles,
  type GuildChannel,
  type GuildRole,
} from './discord-api';
import { TtlCache } from './guild-cache';

const TTL_MS = 60_000;
const channelCache = new TtlCache<GuildChannel[]>(TTL_MS);
const roleCache = new TtlCache<GuildRole[]>(TTL_MS);

/** Guild channels from Discord, cached for a minute. */
export function getGuildChannels(guildId: string): Promise<GuildChannel[]> {
  return channelCache.get(guildId, () => fetchGuildChannels(guildId));
}

/** Guild roles from Discord, cached for a minute. */
export function getGuildRoles(guildId: string): Promise<GuildRole[]> {
  return roleCache.get(guildId, () => fetchGuildRoles(guildId));
}

const CATEGORY = 4;
/** Channels the bot can post logs to: text and announcement channels. */
const MESSAGE_CHANNEL_TYPES = new Set([0, 5]);

export interface ChannelOption {
  id: string;
  name: string;
}

export interface ChannelGroup {
  /** Category name, or null for channels outside a category. */
  category: string | null;
  channels: ChannelOption[];
}

/** Text channels grouped by category in Discord's display order. */
export function textChannelGroups(channels: readonly GuildChannel[]): ChannelGroup[] {
  const byPosition = (a: GuildChannel, b: GuildChannel) =>
    a.position - b.position || a.id.localeCompare(b.id);
  const categories = channels.filter((c) => c.type === CATEGORY).sort(byPosition);
  const text = channels.filter((c) => MESSAGE_CHANNEL_TYPES.has(c.type)).sort(byPosition);

  const toOption = (c: GuildChannel): ChannelOption => ({ id: c.id, name: c.name });
  const groups: ChannelGroup[] = [];
  const uncategorized = text.filter(
    (c) => !c.parentId || !categories.some((k) => k.id === c.parentId),
  );
  if (uncategorized.length > 0)
    groups.push({ category: null, channels: uncategorized.map(toOption) });
  for (const category of categories) {
    const children = text.filter((c) => c.parentId === category.id);
    if (children.length > 0)
      groups.push({ category: category.name, channels: children.map(toOption) });
  }
  return groups;
}

export function textChannelIds(channels: readonly GuildChannel[]): Set<string> {
  return new Set(channels.filter((c) => MESSAGE_CHANNEL_TYPES.has(c.type)).map((c) => c.id));
}
