import { PermissionFlagsBits } from 'discord-api-types/v10';
import type { LogCategory } from '../settings/logging';

export interface RoleInfo {
  id: string;
  permissions: string;
}

export interface PermissionOverwriteInfo {
  id: string;
  /** 0 = role, 1 = member */
  type: 0 | 1;
  allow: string;
  deny: string;
}

export interface MemberInfo {
  userId: string;
  roleIds: readonly string[];
}

const ALL = (1n << 64n) - 1n;

/**
 * A member's effective permissions in a channel, following Discord's algorithm:
 * @everyone + member roles, then @everyone, role and member overwrites.
 * https://discord.com/developers/docs/topics/permissions#permission-overwrites
 */
export function computeChannelPermissions(input: {
  guildId: string;
  ownerId?: string | null;
  roles: readonly RoleInfo[];
  member: MemberInfo;
  overwrites: readonly PermissionOverwriteInfo[];
}): bigint {
  const { guildId, member } = input;
  if (input.ownerId && input.ownerId === member.userId) return ALL;

  const roleById = new Map(input.roles.map((role) => [role.id, BigInt(role.permissions)]));
  let base = roleById.get(guildId) ?? 0n;
  for (const roleId of member.roleIds) base |= roleById.get(roleId) ?? 0n;
  if ((base & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator) return ALL;

  let permissions = base;
  const overwrite = (id: string, type: 0 | 1) =>
    input.overwrites.find((o) => o.id === id && o.type === type);

  const everyone = overwrite(guildId, 0);
  if (everyone) {
    permissions &= ~BigInt(everyone.deny);
    permissions |= BigInt(everyone.allow);
  }

  let allow = 0n;
  let deny = 0n;
  for (const roleId of member.roleIds) {
    const roleOverwrite = overwrite(roleId, 0);
    if (roleOverwrite) {
      allow |= BigInt(roleOverwrite.allow);
      deny |= BigInt(roleOverwrite.deny);
    }
  }
  permissions &= ~deny;
  permissions |= allow;

  const memberOverwrite = overwrite(member.userId, 1);
  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny);
    permissions |= BigInt(memberOverwrite.allow);
  }
  return permissions;
}

/**
 * Permissions the bot needs in a log channel. Files are only sent to the message
 * log (bulk-delete transcripts); without them logs still arrive, just without
 * the attachment.
 */
export const LOG_CHANNEL_PERMISSIONS: readonly {
  bit: bigint;
  name: string;
  essential: boolean;
  only?: LogCategory;
}[] = [
  { bit: PermissionFlagsBits.ViewChannel, name: 'Kanalı Görüntüle', essential: true },
  { bit: PermissionFlagsBits.SendMessages, name: 'Mesaj Gönder', essential: true },
  { bit: PermissionFlagsBits.EmbedLinks, name: 'Bağlantı Yerleştir', essential: true },
  { bit: PermissionFlagsBits.AttachFiles, name: 'Dosya Ekle', essential: false, only: 'message' },
];

export interface LogChannelAccess {
  /** Turkish names of the missing permissions. */
  missing: string[];
  /** Whether logs can be posted at all. */
  canPost: boolean;
}

/** What the bot's `permissions` in a channel allow for a log of `category`. */
export function logChannelAccess(permissions: bigint, category: LogCategory): LogChannelAccess {
  const missing = LOG_CHANNEL_PERMISSIONS.filter(
    ({ bit, only }) => (!only || only === category) && (permissions & bit) !== bit,
  );
  return {
    missing: missing.map(({ name }) => name),
    canPost: missing.every(({ essential }) => !essential),
  };
}
