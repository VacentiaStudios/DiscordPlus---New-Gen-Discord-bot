import { PermissionFlagsBits } from '@discordplus/shared';
import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, guildRoleLabel } from './format';

describe('guildRoleLabel', () => {
  it('names the reason the user can manage the guild', () => {
    expect(guildRoleLabel({ owner: true, permissions: '0' })).toBe('Sahip');
    expect(
      guildRoleLabel({ owner: false, permissions: PermissionFlagsBits.Administrator.toString() }),
    ).toBe('Yönetici');
    expect(
      guildRoleLabel({ owner: false, permissions: PermissionFlagsBits.ManageGuild.toString() }),
    ).toBe('Sunucuyu Yönet');
  });
});

describe('date formatting', () => {
  it('uses Turkish month names in Istanbul time', () => {
    const date = new Date('2026-10-04T21:30:00Z');
    expect(formatDate(date)).toBe('5 Ekim 2026');
    expect(formatDateTime(date)).toBe('5 Ekim 2026 00:30');
  });
});
