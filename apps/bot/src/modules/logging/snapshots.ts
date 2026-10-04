// Converts discord.js structures into the plain shapes the embeds and diffs use.
import {
  ChannelType,
  OverwriteType,
  type Guild,
  type GuildMember,
  type Message,
  type NonThreadGuildBasedChannel,
  type PartialGuildMember,
  type PartialMessage,
  type Role,
  type User,
} from 'discord.js';
import { tr } from '../../locales/tr';
import type { ChannelSnapshot, OverwriteSnapshot, RoleSnapshot } from './diff';
import type { MessageSnapshot, UserRef } from './embeds';

export function userRef(user: User): UserRef {
  return { id: user.id, tag: user.tag, avatarUrl: user.displayAvatarURL() };
}

export function messageSnapshot(message: Message | PartialMessage): MessageSnapshot {
  return {
    id: message.id,
    channelId: message.channelId,
    author: message.author ? userRef(message.author) : null,
    content: message.partial ? null : message.content,
    attachments: message.attachments.map((a) => ({ name: a.name, url: a.url })),
    createdAt: message.createdAt,
    url: message.url,
  };
}

/** The channel, its parent and grandparent (thread → channel → category). */
export function channelLineage(guild: Guild, channelId: string): (string | null)[] {
  const channel = guild.channels.cache.get(channelId);
  const parent = channel?.parentId ? guild.channels.cache.get(channel.parentId) : undefined;
  return [channelId, channel?.parentId ?? null, parent?.parentId ?? null];
}

/** Role ids of a member without @everyone, highest first; null when unknown. */
export function memberRoleIds(member: GuildMember | PartialGuildMember): string[] | null {
  if (member.partial) return null;
  return member.roles.cache
    .filter((role) => role.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((role) => role.id);
}

export function channelTypeLabel(type: ChannelType): string {
  const labels: Partial<Record<string, string>> = tr.logging.channelTypes;
  return labels[ChannelType[type]] ?? tr.logging.channelTypeOther;
}

export function channelInfo(channel: NonThreadGuildBasedChannel) {
  return {
    id: channel.id,
    name: channel.name,
    typeLabel: channelTypeLabel(channel.type),
    parentName: channel.parent?.name ?? null,
  };
}

export function channelSnapshot(channel: NonThreadGuildBasedChannel): ChannelSnapshot {
  return {
    name: channel.name,
    topic: 'topic' in channel ? (channel.topic ?? null) : null,
    nsfw: 'nsfw' in channel ? channel.nsfw : false,
    rateLimitPerUser: 'rateLimitPerUser' in channel ? (channel.rateLimitPerUser ?? 0) : 0,
    parentName: channel.parent?.name ?? null,
  };
}

export function overwriteSnapshots(channel: NonThreadGuildBasedChannel): OverwriteSnapshot[] {
  return channel.permissionOverwrites.cache.map((overwrite) => ({
    id: overwrite.id,
    type: overwrite.type === OverwriteType.Role ? 'role' : 'member',
    allow: overwrite.allow.bitfield,
    deny: overwrite.deny.bitfield,
  }));
}

export function roleSnapshot(role: Role): RoleSnapshot {
  return {
    name: role.name,
    color: role.colors.primaryColor,
    hoist: role.hoist,
    mentionable: role.mentionable,
  };
}
