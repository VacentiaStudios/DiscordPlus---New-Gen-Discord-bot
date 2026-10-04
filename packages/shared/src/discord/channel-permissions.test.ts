import { PermissionFlagsBits as P } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';
import { computeChannelPermissions, logChannelAccess } from './channel-permissions';

const GUILD = 'g';
const BOT = 'bot';

const roles = [
  { id: GUILD, permissions: (P.ViewChannel | P.SendMessages).toString() },
  { id: 'botRole', permissions: (P.EmbedLinks | P.AttachFiles).toString() },
  { id: 'admin', permissions: P.Administrator.toString() },
];

function compute(
  overwrites: Parameters<typeof computeChannelPermissions>[0]['overwrites'],
  roleIds = ['botRole'],
) {
  return computeChannelPermissions({
    guildId: GUILD,
    roles,
    member: { userId: BOT, roleIds },
    overwrites,
  });
}

const has = (bits: bigint, flag: bigint) => (bits & flag) === flag;

describe('computeChannelPermissions', () => {
  it('combines @everyone and member roles', () => {
    const bits = compute([]);
    expect(has(bits, P.SendMessages)).toBe(true);
    expect(has(bits, P.EmbedLinks)).toBe(true);
    expect(has(bits, P.BanMembers)).toBe(false);
  });

  it('applies @everyone, then role, then member overwrites', () => {
    const hidden = { id: GUILD, type: 0 as const, allow: '0', deny: P.ViewChannel.toString() };
    expect(has(compute([hidden]), P.ViewChannel)).toBe(false);

    const roleAllow = {
      id: 'botRole',
      type: 0 as const,
      allow: P.ViewChannel.toString(),
      deny: '0',
    };
    expect(has(compute([hidden, roleAllow]), P.ViewChannel)).toBe(true);

    const memberDeny = { id: BOT, type: 1 as const, allow: '0', deny: P.ViewChannel.toString() };
    expect(has(compute([hidden, roleAllow, memberDeny]), P.ViewChannel)).toBe(false);
  });

  it('role allows win over role denies', () => {
    const roleDeny = {
      id: 'botRole',
      type: 0 as const,
      allow: '0',
      deny: P.SendMessages.toString(),
    };
    const otherAllow = {
      id: 'other',
      type: 0 as const,
      allow: P.SendMessages.toString(),
      deny: '0',
    };
    expect(has(compute([roleDeny, otherAllow], ['botRole', 'other']), P.SendMessages)).toBe(true);
  });

  it('administrators and owners bypass overwrites', () => {
    const hidden = { id: GUILD, type: 0 as const, allow: '0', deny: P.ViewChannel.toString() };
    expect(has(compute([hidden], ['admin']), P.ViewChannel)).toBe(true);
    expect(
      has(
        computeChannelPermissions({
          guildId: GUILD,
          ownerId: BOT,
          roles,
          member: { userId: BOT, roleIds: [] },
          overwrites: [hidden],
        }),
        P.ViewChannel,
      ),
    ).toBe(true);
  });
});

describe('logChannelAccess', () => {
  const ALL = P.ViewChannel | P.SendMessages | P.EmbedLinks | P.AttachFiles;

  it('names what is missing and whether logs can be posted', () => {
    expect(logChannelAccess(P.ViewChannel | P.SendMessages, 'message')).toEqual({
      missing: ['Bağlantı Yerleştir', 'Dosya Ekle'],
      canPost: false,
    });
    expect(logChannelAccess(ALL, 'message')).toEqual({ missing: [], canPost: true });
  });

  it('only asks for Attach Files in the message log, and does not require it', () => {
    const noFiles = ALL & ~P.AttachFiles;
    expect(logChannelAccess(noFiles, 'member')).toEqual({ missing: [], canPost: true });
    expect(logChannelAccess(noFiles, 'message')).toEqual({
      missing: ['Dosya Ekle'],
      canPost: true,
    });
  });
});
