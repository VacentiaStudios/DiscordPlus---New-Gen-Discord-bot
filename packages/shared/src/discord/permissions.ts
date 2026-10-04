import { PermissionFlagsBits } from 'discord-api-types/v10';

export { PermissionFlagsBits };

/** Everything the bot needs to run all of its features in a guild. */
export const BOT_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.SendMessagesInThreads |
  PermissionFlagsBits.CreatePublicThreads |
  PermissionFlagsBits.CreatePrivateThreads |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.AttachFiles |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.ManageMessages |
  PermissionFlagsBits.ModerateMembers |
  PermissionFlagsBits.KickMembers |
  PermissionFlagsBits.BanMembers |
  PermissionFlagsBits.ManageChannels |
  PermissionFlagsBits.ManageRoles |
  PermissionFlagsBits.ViewAuditLog;

export function toPermissionBits(value: bigint | string | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

/** True when `bitfield` contains `permission`; Administrator implies every permission. */
export function hasPermission(bitfield: bigint | string, permission: bigint): boolean {
  const bits = toPermissionBits(bitfield);
  if ((bits & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator) return true;
  return (bits & permission) === permission;
}

/** A guild as returned by Discord's `GET /users/@me/guilds` for the signed-in user. */
export interface UserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  /** The user's permission bitfield in the guild, as a decimal string. */
  permissions: string;
}

/** Owners, administrators and members with Manage Server may configure the bot. */
export function canManageGuild(guild: Pick<UserGuild, 'owner' | 'permissions'>): boolean {
  return guild.owner || hasPermission(guild.permissions, PermissionFlagsBits.ManageGuild);
}

/** Guilds the user may manage in the panel, sorted by name. */
export function manageableGuilds<T extends UserGuild>(guilds: readonly T[]): T[] {
  return guilds.filter(canManageGuild).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export function botInviteUrl(clientId: string, guildId?: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'bot applications.commands',
    permissions: BOT_PERMISSIONS.toString(),
  });
  if (guildId) {
    params.set('guild_id', guildId);
    params.set('disable_guild_select', 'true');
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
