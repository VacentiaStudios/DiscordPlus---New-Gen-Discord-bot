import 'server-only';
import { computeChannelPermissions } from '@discordplus/shared';
import { CHANNEL_TYPE, type ChannelGroup, type ChannelOption } from '@/lib/channels';
import {
  fetchGuildChannels,
  fetchGuildMemberRoles,
  fetchGuildRoles,
  type GuildChannel,
  type GuildRole,
} from './discord-api';
import { getServerEnv } from './env';
import { TtlCache } from './guild-cache';

export type { ChannelGroup, ChannelOption } from '@/lib/channels';

const TTL_MS = 60_000;
const channelCache = new TtlCache<GuildChannel[]>(TTL_MS);
const roleCache = new TtlCache<GuildRole[]>(TTL_MS);
const botRoleCache = new TtlCache<string[]>(TTL_MS);

/** Guild channels from Discord, cached for a minute. */
export function getGuildChannels(guildId: string): Promise<GuildChannel[]> {
  return channelCache.get(guildId, () => fetchGuildChannels(guildId));
}

/** Guild roles from Discord, cached for a minute. */
export function getGuildRoles(guildId: string): Promise<GuildRole[]> {
  return roleCache.get(guildId, () => fetchGuildRoles(guildId));
}

/** The bot's role ids in a guild, cached for a minute. */
function getBotRoleIds(guildId: string): Promise<string[]> {
  // A bot's user id is its application id.
  const botId = getServerEnv().DISCORD_CLIENT_ID;
  return botRoleCache.get(guildId, () => fetchGuildMemberRoles(guildId, botId));
}

/** Channels the bot can post logs to: text and announcement channels. */
const MESSAGE_CHANNEL_TYPES = new Set<number>([CHANNEL_TYPE.text, CHANNEL_TYPE.announcement]);
/** Channels whose activity can be excluded from logs; categories cover their children. */
const IGNORABLE_CHANNEL_TYPES = new Set<number>([
  CHANNEL_TYPE.text,
  CHANNEL_TYPE.announcement,
  CHANNEL_TYPE.forum,
  CHANNEL_TYPE.media,
  CHANNEL_TYPE.voice,
  CHANNEL_TYPE.stage,
]);
const VOICE_CHANNEL_TYPES = new Set<number>([CHANNEL_TYPE.voice, CHANNEL_TYPE.stage]);

const byPosition = (a: GuildChannel, b: GuildChannel) =>
  a.position - b.position || a.id.localeCompare(b.id);
/** Discord shows text-like channels before voice channels inside a category. */
const byDisplayOrder = (a: GuildChannel, b: GuildChannel) =>
  Number(VOICE_CHANNEL_TYPES.has(a.type)) - Number(VOICE_CHANNEL_TYPES.has(b.type)) ||
  byPosition(a, b);
const toOption = (c: GuildChannel): ChannelOption => ({ id: c.id, name: c.name, type: c.type });

function groupByCategory(
  channels: readonly GuildChannel[],
  types: ReadonlySet<number>,
  { includeCategories }: { includeCategories: boolean },
): ChannelGroup[] {
  const categories = channels.filter((c) => c.type === CHANNEL_TYPE.category).sort(byPosition);
  const categoryIds = new Set(categories.map((c) => c.id));
  const listed = channels.filter((c) => types.has(c.type)).sort(byDisplayOrder);

  const groups: ChannelGroup[] = [];
  const uncategorized = listed.filter((c) => !c.parentId || !categoryIds.has(c.parentId));
  if (uncategorized.length > 0) {
    groups.push({ category: null, channels: uncategorized.map(toOption) });
  }
  for (const category of categories) {
    const children = listed.filter((c) => c.parentId === category.id).map(toOption);
    const options = includeCategories ? [toOption(category), ...children] : children;
    if (options.length > 0) groups.push({ category: category.name, channels: options });
  }
  return groups;
}

/** Text channels grouped by category in Discord's display order. */
export function textChannelGroups(channels: readonly GuildChannel[]): ChannelGroup[] {
  return groupByCategory(channels, MESSAGE_CHANNEL_TYPES, { includeCategories: false });
}

/** Channels that can be left out of logs; each group starts with its category. */
export function ignorableChannelGroups(channels: readonly GuildChannel[]): ChannelGroup[] {
  return groupByCategory(channels, IGNORABLE_CHANNEL_TYPES, { includeCategories: true });
}

export function textChannelIds(channels: readonly GuildChannel[]): Set<string> {
  return new Set(channels.filter((c) => MESSAGE_CHANNEL_TYPES.has(c.type)).map((c) => c.id));
}

/**
 * The bot's effective permissions in each channel, as decimal strings so they
 * can be handed to client components.
 */
export function botChannelPermissions(input: {
  guildId: string;
  botId: string;
  botRoleIds: readonly string[];
  roles: readonly GuildRole[];
  channels: readonly GuildChannel[];
}): Record<string, string> {
  const member = { userId: input.botId, roleIds: input.botRoleIds };
  return Object.fromEntries(
    input.channels.map((channel) => [
      channel.id,
      computeChannelPermissions({
        guildId: input.guildId,
        roles: input.roles,
        member,
        overwrites: channel.overwrites,
      }).toString(),
    ]),
  );
}

/** The bot's permissions per channel read from Discord, or null when that fails. */
export async function getBotChannelPermissions(
  guildId: string,
  channels: readonly GuildChannel[],
): Promise<Record<string, string> | null> {
  try {
    const [roles, botRoleIds] = await Promise.all([getGuildRoles(guildId), getBotRoleIds(guildId)]);
    const botId = getServerEnv().DISCORD_CLIENT_ID;
    return botChannelPermissions({ guildId, botId, botRoleIds, roles, channels });
  } catch {
    return null;
  }
}
