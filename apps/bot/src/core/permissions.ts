import type { PermissionFlagsBits } from 'discord.js';
import {
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type GuildBasedChannel,
  type Guild,
  type PermissionResolvable,
} from 'discord.js';
import { tr } from '../locales/tr';
import { UserError } from './errors';

type PermissionName = keyof typeof PermissionFlagsBits;

/** Names as they appear in Discord's Turkish interface. */
const PERMISSION_NAMES: Partial<Record<PermissionName, string>> = {
  Administrator: 'Yönetici',
  ViewChannel: 'Kanalları Görüntüle',
  SendMessages: 'Mesaj Gönder',
  SendMessagesInThreads: 'Alt Başlıklarda Mesaj Gönder',
  EmbedLinks: 'Bağlantı Yerleştir',
  AttachFiles: 'Dosya Ekle',
  ReadMessageHistory: 'Mesaj Geçmişini Oku',
  ManageMessages: 'Mesajları Yönet',
  ManageChannels: 'Kanalları Yönet',
  ManageRoles: 'Rolleri Yönet',
  ManageGuild: 'Sunucuyu Yönet',
  ModerateMembers: 'Üyelere Zaman Aşımı Uygula',
  KickMembers: 'Üyeleri At',
  BanMembers: 'Üyeleri Yasakla',
  ViewAuditLog: 'Denetim Kaydını Görüntüle',
};

export function permissionNames(names: readonly string[]): string {
  return names.map((name) => PERMISSION_NAMES[name as PermissionName] ?? name).join(', ');
}

/** The invoking member must hold `permissions` (re-checked even though Discord gates the command). */
export function assertMemberPermissions(
  interaction: Pick<ChatInputCommandInteraction<'cached'>, 'memberPermissions'>,
  permissions: PermissionResolvable,
): void {
  const missing = interaction.memberPermissions.missing(permissions);
  if (missing.length > 0) throw new UserError(tr.permissions.member(permissionNames(missing)));
}

/** The bot must hold `permissions` in the guild, or in `channel` when given. */
export function assertBotPermissions(
  guild: Guild,
  permissions: PermissionResolvable,
  channel?: GuildBasedChannel,
): void {
  const me = guild.members.me;
  const granted = me
    ? channel
      ? channel.permissionsFor(me)
      : me.permissions
    : new PermissionsBitField();
  const missing = granted.missing(permissions);
  if (missing.length > 0) throw new UserError(tr.permissions.bot(permissionNames(missing)));
}
