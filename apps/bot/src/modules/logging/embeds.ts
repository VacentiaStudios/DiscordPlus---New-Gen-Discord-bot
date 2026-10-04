import { formatDuration } from '@discordplus/shared';
import { EmbedBuilder, escapeMarkdown, time, TimestampStyles } from 'discord.js';
import { COLORS } from '../../core/ui';
import { tr } from '../../locales/tr';
import type { FieldChange, OverwriteChange, UserProfileChange, VoiceEvent } from './diff';

const t = tr.logging;
const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function list(items: readonly string[], max = 15): string {
  if (items.length === 0) return t.none;
  const shown = items.slice(0, max).join(', ');
  return items.length > max ? `${shown} ${t.more(items.length - max)}` : shown;
}

export interface UserRef {
  id: string;
  tag: string;
  avatarUrl?: string | null;
}

/** Role mention; the @everyone role (id = guild id) does not render as a mention. */
function roleMention(roleId: string, guildId: string): string {
  return roleId === guildId ? '@everyone' : `<@&${roleId}>`;
}

function withUser(embed: EmbedBuilder, user: UserRef | null): EmbedBuilder {
  if (!user) return embed;
  return embed.setAuthor({ name: user.tag, iconURL: user.avatarUrl ?? undefined });
}

export interface MessageSnapshot {
  id: string;
  channelId: string;
  author: UserRef | null;
  /** null when the message was not cached. */
  content: string | null;
  attachments: { name: string; url: string }[];
  createdAt: Date | null;
  url: string;
}

export function messageDeletedEmbed(message: MessageSnapshot, reason?: string): EmbedBuilder {
  const embed = withUser(
    new EmbedBuilder().setColor(COLORS.danger).setTitle(t.messageDeleted),
    message.author,
  )
    .setDescription(
      message.content === null
        ? t.notCached
        : message.content
          ? truncate(message.content, 4_000)
          : t.empty,
    )
    .addFields({ name: t.channel, value: `<#${message.channelId}>`, inline: true })
    .setFooter({ text: t.messageId(message.id) })
    .setTimestamp();
  if (message.author) {
    embed.addFields({ name: t.author, value: `<@${message.author.id}>`, inline: true });
  }
  if (message.createdAt) {
    embed.addFields({
      name: t.sent,
      value: time(message.createdAt, TimestampStyles.RelativeTime),
      inline: true,
    });
  }
  if (message.attachments.length > 0) {
    embed.addFields({
      name: t.attachments,
      value: truncate(message.attachments.map((a) => `[${a.name}](${a.url})`).join('\n'), 1_024),
    });
  }
  if (reason) embed.addFields({ name: t.deletedBy, value: reason });
  return embed;
}

export function messageEditedEmbed(before: string | null, after: MessageSnapshot): EmbedBuilder {
  return withUser(
    new EmbedBuilder().setColor(COLORS.warning).setTitle(t.messageEdited),
    after.author,
  )
    .setDescription(`<#${after.channelId}> · [${t.jump}](${after.url})`)
    .addFields(
      {
        name: t.before,
        value: before === null ? t.notCached : before ? truncate(before, 1_024) : t.empty,
      },
      { name: t.after, value: after.content ? truncate(after.content, 1_024) : t.empty },
    )
    .setFooter({ text: t.messageId(after.id) })
    .setTimestamp();
}

export function bulkDeletedEmbed(input: {
  channelId: string;
  count: number;
  reason?: string;
  transcriptAttached: boolean;
}): EmbedBuilder {
  const lines = [`<#${input.channelId}>`];
  lines.push(input.transcriptAttached ? t.bulkTranscript : t.bulkNoFile);
  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle(t.bulkDeleted(input.count))
    .setDescription(lines.join('\n'))
    .setTimestamp();
  if (input.reason) embed.addFields({ name: t.deletedBy, value: input.reason });
  return embed;
}

/** Plain-text transcript of bulk-deleted messages, oldest first. */
export function transcript(messages: readonly MessageSnapshot[]): string {
  return [...messages]
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
    .map((m) => {
      const when = m.createdAt ? m.createdAt.toISOString().replace('T', ' ').slice(0, 19) : '?';
      const who = m.author ? `${m.author.tag} (${m.author.id})` : 'bilinmiyor';
      const body = m.content === null ? '[önbellekte değil]' : m.content || '[metin yok]';
      const files = m.attachments.length
        ? ` [ekler: ${m.attachments.map((a) => a.url).join(' ')}]`
        : '';
      return `[${when} UTC] ${who}: ${body}${files}`;
    })
    .join('\n');
}

export function isNewAccount(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() < NEW_ACCOUNT_MS;
}

export function memberJoinedEmbed(
  user: UserRef & { createdAt: Date },
  memberCount: number,
  now = Date.now(),
): EmbedBuilder {
  const created = time(user.createdAt, TimestampStyles.RelativeTime);
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(t.memberJoined)
    .setDescription(`<@${user.id}> · ${escapeMarkdown(user.tag)}`)
    .setThumbnail(user.avatarUrl ?? null)
    .addFields(
      {
        name: t.accountCreated,
        value: isNewAccount(user.createdAt, now) ? `${created}\n${t.newAccount}` : created,
        inline: true,
      },
      { name: t.memberCount, value: String(memberCount), inline: true },
    )
    .setFooter({ text: t.userId(user.id) })
    .setTimestamp(now);
}

export function memberLeftEmbed(
  user: UserRef,
  joinedAt: Date | null,
  roleIds: readonly string[] | null,
  now = Date.now(),
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle(t.memberLeft)
    .setDescription(`<@${user.id}> · ${escapeMarkdown(user.tag)}`)
    .setThumbnail(user.avatarUrl ?? null)
    .setFooter({ text: t.userId(user.id) })
    .setTimestamp(now);
  if (joinedAt) {
    embed.addFields(
      { name: t.joinedServer, value: time(joinedAt, TimestampStyles.ShortDate), inline: true },
      { name: t.timeInServer, value: formatDuration(now - joinedAt.getTime()), inline: true },
    );
  }
  if (roleIds && roleIds.length > 0) {
    embed.addFields({ name: t.roles, value: list(roleIds.map((id) => `<@&${id}>`)) });
  }
  return embed;
}

export function nicknameChangedEmbed(
  user: UserRef,
  before: string | null,
  after: string | null,
): EmbedBuilder {
  return withUser(new EmbedBuilder().setColor(COLORS.brand).setTitle(t.nicknameChanged), user)
    .setDescription(`<@${user.id}>`)
    .addFields(
      { name: t.before, value: before ? escapeMarkdown(before) : t.none, inline: true },
      { name: t.after, value: after ? escapeMarkdown(after) : t.none, inline: true },
    )
    .setFooter({ text: t.userId(user.id) })
    .setTimestamp();
}

export function rolesChangedEmbed(
  user: UserRef,
  added: readonly string[],
  removed: readonly string[],
): EmbedBuilder {
  const embed = withUser(new EmbedBuilder().setColor(COLORS.brand).setTitle(t.rolesChanged), user)
    .setDescription(`<@${user.id}>`)
    .setFooter({ text: t.userId(user.id) })
    .setTimestamp();
  if (added.length) {
    embed.addFields({ name: t.addedRoles, value: list(added.map((id) => `<@&${id}>`)) });
  }
  if (removed.length) {
    embed.addFields({ name: t.removedRoles, value: list(removed.map((id) => `<@&${id}>`)) });
  }
  return embed;
}

export function userUpdatedEmbed(user: UserRef, change: UserProfileChange): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle(t.userUpdated)
    .setDescription(`<@${user.id}>`)
    .setFooter({ text: t.userId(user.id) })
    .setTimestamp();
  if (change.username) {
    embed.addFields({
      name: t.username,
      value: `${escapeMarkdown(change.username.before)} → ${escapeMarkdown(change.username.after)}`,
    });
  }
  if (change.displayName) {
    const show = (v: string | null) => (v ? escapeMarkdown(v) : t.none);
    embed.addFields({
      name: t.displayName,
      value: `${show(change.displayName.before)} → ${show(change.displayName.after)}`,
    });
  }
  if (change.avatarChanged) {
    embed.addFields({ name: t.avatar, value: t.avatarChanged });
    if (user.avatarUrl) embed.setThumbnail(user.avatarUrl);
  }
  return embed;
}

function changeFields(changes: readonly FieldChange[]) {
  return changes.map((c) => ({
    name: c.label,
    value: truncate(`${c.before} → ${c.after}`, 1_024),
  }));
}

function overwriteField(guildId: string, changes: readonly OverwriteChange[]) {
  const lines = changes.map((c) => {
    const target = c.type === 'role' ? roleMention(c.id, guildId) : `<@${c.id}>`;
    const parts = [
      c.allowed.length ? `✅ ${c.allowed.join(', ')}` : null,
      c.denied.length ? `⛔ ${c.denied.join(', ')}` : null,
      c.reset.length ? `↩️ ${c.reset.join(', ')}` : null,
    ].filter(Boolean);
    return `${target}: ${parts.join(' · ')}`;
  });
  return { name: t.permissionOverwrites, value: truncate(lines.join('\n'), 1_024) };
}

export function channelEventEmbed(
  kind: 'created' | 'deleted',
  channel: { id: string; name: string; typeLabel: string; parentName: string | null },
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(kind === 'created' ? COLORS.success : COLORS.danger)
    .setTitle(kind === 'created' ? t.channelCreated : t.channelDeleted)
    .setDescription(kind === 'created' ? `<#${channel.id}> · ${channel.name}` : `#${channel.name}`)
    .addFields(
      { name: t.type, value: channel.typeLabel, inline: true },
      { name: t.category, value: channel.parentName ?? t.none, inline: true },
    )
    .setFooter({ text: `ID: ${channel.id}` })
    .setTimestamp();
}

export function channelUpdatedEmbed(
  channel: { id: string; guildId: string },
  changes: readonly FieldChange[],
  overwrites: readonly OverwriteChange[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(t.channelUpdated)
    .setDescription(`<#${channel.id}>`)
    .addFields(changeFields(changes))
    .setFooter({ text: `ID: ${channel.id}` })
    .setTimestamp();
  if (overwrites.length) embed.addFields(overwriteField(channel.guildId, overwrites));
  return embed;
}

export function roleEventEmbed(
  kind: 'created' | 'deleted',
  role: { id: string; name: string; color: number },
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(role.color || (kind === 'created' ? COLORS.success : COLORS.danger))
    .setTitle(kind === 'created' ? t.roleCreated : t.roleDeleted)
    .setDescription(kind === 'created' ? `<@&${role.id}> · ${role.name}` : `@${role.name}`)
    .setFooter({ text: `ID: ${role.id}` })
    .setTimestamp();
}

export function roleUpdatedEmbed(
  role: { id: string; guildId: string; color: number },
  changes: readonly FieldChange[],
  permissions: { added: string[]; removed: string[] },
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(role.color || COLORS.warning)
    .setTitle(t.roleUpdated)
    .setDescription(roleMention(role.id, role.guildId))
    .addFields(changeFields(changes))
    .setFooter({ text: `ID: ${role.id}` })
    .setTimestamp();
  if (permissions.added.length || permissions.removed.length) {
    const lines = [
      permissions.added.length ? `✅ ${permissions.added.join(', ')}` : null,
      permissions.removed.length ? `⛔ ${permissions.removed.join(', ')}` : null,
    ].filter(Boolean);
    embed.addFields({ name: t.permissions, value: truncate(lines.join('\n'), 1_024) });
  }
  return embed;
}

export function guildUpdatedEmbed(
  changes: readonly FieldChange[],
  iconUrl: string | null,
  iconChanged: boolean,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(t.guildUpdated)
    .addFields(changeFields(changes))
    .setTimestamp();
  if (iconChanged) {
    embed.addFields({ name: t.icon, value: t.iconChanged });
    if (iconUrl) embed.setThumbnail(iconUrl);
  }
  return embed;
}

export function voiceEmbed(user: UserRef, event: VoiceEvent): EmbedBuilder {
  const embed = withUser(new EmbedBuilder(), user)
    .setFooter({ text: t.userId(user.id) })
    .setTimestamp();
  switch (event.kind) {
    case 'joined':
      return embed
        .setColor(COLORS.success)
        .setTitle(t.voiceJoined)
        .setDescription(`<@${user.id}> → <#${event.channelId}>`);
    case 'left':
      return embed
        .setColor(COLORS.danger)
        .setTitle(t.voiceLeft)
        .setDescription(`<@${user.id}> ← <#${event.channelId}>`);
    case 'moved':
      return embed
        .setColor(COLORS.brand)
        .setTitle(t.voiceMoved)
        .setDescription(`<@${user.id}>`)
        .addFields(
          { name: t.from, value: `<#${event.fromId}>`, inline: true },
          { name: t.to, value: `<#${event.toId}>`, inline: true },
        );
    case 'serverMute':
      return embed
        .setColor(COLORS.warning)
        .setTitle(event.enabled ? t.serverMuted : t.serverUnmuted)
        .setDescription(`<@${user.id}> · <#${event.channelId}>`);
    case 'serverDeaf':
      return embed
        .setColor(COLORS.warning)
        .setTitle(event.enabled ? t.serverDeafened : t.serverUndeafened)
        .setDescription(`<@${user.id}> · <#${event.channelId}>`);
  }
}
