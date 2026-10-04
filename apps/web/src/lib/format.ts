import { PermissionFlagsBits, type UserGuild } from '@discordplus/shared';

const dateTimeFormat = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Istanbul',
});

const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
  timeZone: 'Europe/Istanbul',
});

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

/** Why the user may manage a guild, for display. */
export function guildRoleLabel(guild: Pick<UserGuild, 'owner' | 'permissions'>): string {
  if (guild.owner) return 'Sahip';
  const bits = BigInt(guild.permissions);
  if ((bits & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator) {
    return 'Yönetici';
  }
  return 'Sunucuyu Yönet';
}
