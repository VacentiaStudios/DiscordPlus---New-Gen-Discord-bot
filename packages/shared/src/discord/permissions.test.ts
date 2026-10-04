import { describe, expect, it } from 'vitest';
import {
  BOT_PERMISSIONS,
  PermissionFlagsBits,
  botInviteUrl,
  canManageGuild,
  hasPermission,
  manageableGuilds,
} from './permissions';

describe('hasPermission', () => {
  it('checks individual bits', () => {
    const bits = PermissionFlagsBits.ManageGuild | PermissionFlagsBits.SendMessages;
    expect(hasPermission(bits, PermissionFlagsBits.ManageGuild)).toBe(true);
    expect(hasPermission(bits, PermissionFlagsBits.BanMembers)).toBe(false);
  });

  it('accepts string bitfields from the Discord API', () => {
    expect(
      hasPermission(PermissionFlagsBits.ManageGuild.toString(), PermissionFlagsBits.ManageGuild),
    ).toBe(true);
  });

  it('treats Administrator as every permission', () => {
    expect(hasPermission(PermissionFlagsBits.Administrator, PermissionFlagsBits.BanMembers)).toBe(
      true,
    );
  });
});

describe('botInviteUrl', () => {
  it('builds a bot invite with the required permissions', () => {
    const url = new URL(botInviteUrl('123456789012345678'));
    expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('123456789012345678');
    expect(url.searchParams.get('scope')).toBe('bot applications.commands');
    expect(url.searchParams.get('permissions')).toBe(BOT_PERMISSIONS.toString());
    expect(url.searchParams.has('guild_id')).toBe(false);
  });

  it('preselects a guild', () => {
    const url = new URL(botInviteUrl('123456789012345678', '876543210987654321'));
    expect(url.searchParams.get('guild_id')).toBe('876543210987654321');
    expect(url.searchParams.get('disable_guild_select')).toBe('true');
  });
});

describe('canManageGuild', () => {
  it('allows owners, administrators and Manage Server', () => {
    expect(canManageGuild({ owner: true, permissions: '0' })).toBe(true);
    expect(
      canManageGuild({ owner: false, permissions: PermissionFlagsBits.Administrator.toString() }),
    ).toBe(true);
    expect(
      canManageGuild({ owner: false, permissions: PermissionFlagsBits.ManageGuild.toString() }),
    ).toBe(true);
  });

  it('rejects members without Manage Server', () => {
    const moderator = PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers;
    expect(canManageGuild({ owner: false, permissions: moderator.toString() })).toBe(false);
  });
});

describe('manageableGuilds', () => {
  it('keeps manageable guilds sorted by Turkish collation', () => {
    const guild = (name: string, owner: boolean) => ({
      id: name,
      name,
      icon: null,
      owner,
      permissions: '0',
    });
    const result = manageableGuilds([
      guild('Zeta', true),
      guild('Çay Ocağı', true),
      guild('Üye', false),
      guild('Cevher', true),
    ]);
    expect(result.map((g) => g.name)).toEqual(['Cevher', 'Çay Ocağı', 'Zeta']);
  });
});
