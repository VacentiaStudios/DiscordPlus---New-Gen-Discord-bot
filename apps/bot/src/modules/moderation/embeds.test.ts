import type { CaseRow } from '@discordplus/db';
import { DURATION } from '@discordplus/shared';
import { describe, expect, it } from 'vitest';
import { auditReason, caseEmbed, dmEmbed } from './embeds';

function row(overrides: Partial<CaseRow> = {}): CaseRow {
  const createdAt = new Date('2026-10-04T12:00:00Z');
  return {
    id: 1,
    guildId: '100000000000000001',
    caseNumber: 12,
    type: 'ban',
    source: 'command',
    targetId: '200000000000000001',
    targetTag: 'spam_*bot*',
    moderatorId: '200000000000000009',
    moderatorTag: 'mod',
    reason: 'Reklam',
    durationMs: null,
    expiresAt: null,
    active: true,
    logChannelId: null,
    logMessageId: null,
    metadata: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

describe('caseEmbed', () => {
  it('describes a permanent ban', () => {
    const json = caseEmbed(row()).toJSON();
    expect(json.title).toBe('🔨 Vaka #12 · Yasaklama');
    const fields = Object.fromEntries((json.fields ?? []).map((f) => [f.name, f.value]));
    expect(fields.Kullanıcı).toContain('<@200000000000000001>');
    expect(fields.Kullanıcı).toContain('spam\\_\\*bot\\*');
    expect(fields.Süre).toBe('Kalıcı');
    expect(fields.Sebep).toBe('Reklam');
    expect(json.footer?.text).toBe('Kaynak: Komut');
  });

  it('shows duration and end of temporary actions', () => {
    const expiresAt = new Date('2026-10-05T12:00:00Z');
    const json = caseEmbed(
      row({ type: 'timeout', durationMs: DURATION.DAY, expiresAt, source: 'automod' }),
    ).toJSON();
    const duration = json.fields?.find((f) => f.name === 'Süre')?.value;
    expect(duration).toBe(`1 gün · Bitiş <t:${expiresAt.getTime() / 1000}:R>`);
    expect(json.footer?.text).toBe('Kaynak: AutoMod');
  });

  it('marks deleted cases', () => {
    const json = caseEmbed(row({ deletedAt: new Date(), deletedBy: '3' })).toJSON();
    expect(json.title).toBe('~~🔨 Vaka #12 · Yasaklama~~ (silindi)');
  });

  it('handles a missing reason', () => {
    const json = caseEmbed(row({ type: 'warn', reason: null })).toJSON();
    expect(json.fields?.find((f) => f.name === 'Sebep')?.value).toBe('_Sebep belirtilmedi_');
  });
});

describe('dmEmbed', () => {
  it('explains a temporary ban', () => {
    const json = dmEmbed({
      type: 'ban',
      guildName: 'Oyun Sunucusu',
      reason: 'Spam',
      durationMs: 3 * DURATION.DAY,
    }).toJSON();
    expect(json.description).toContain('**Oyun Sunucusu** sunucusundan **3 gün** süreyle');
  });
});

describe('auditReason', () => {
  it('prefixes the moderator and stays within Discord limits', () => {
    expect(auditReason('mod', null)).toBe('mod: Sebep belirtilmedi');
    expect(auditReason('mod', 'x'.repeat(600))).toHaveLength(512);
  });
});
