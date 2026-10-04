import { describe, expect, it } from 'vitest';
import { BOT_PERMISSIONS, PermissionFlagsBits, botInviteUrl, hasPermission } from './permissions';

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
