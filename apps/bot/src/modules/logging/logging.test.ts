import { defaultSettings } from '@discordplus/shared';
import { describe, expect, it } from 'vitest';
import {
  channelUpdatedEmbed,
  isNewAccount,
  memberJoinedEmbed,
  memberLeftEmbed,
  messageDeletedEmbed,
  messageEditedEmbed,
  roleUpdatedEmbed,
  transcript,
  voiceEmbed,
  type MessageSnapshot,
} from './embeds';
import { isContentEdit, isIgnoredChannel, logTargetIds } from './filters';

const DAY = 24 * 60 * 60 * 1000;

function message(overrides: Partial<MessageSnapshot> = {}): MessageSnapshot {
  return {
    id: 'm1',
    channelId: 'c1',
    author: { id: 'u1', tag: 'ayse' },
    content: 'merhaba',
    attachments: [],
    createdAt: new Date('2026-10-04T10:00:00Z'),
    url: 'https://discord.com/channels/g/c1/m1',
    ...overrides,
  };
}

describe('message embeds', () => {
  it('shows deleted content, channel and the deletion reason', () => {
    const json = messageDeletedEmbed(message(), 'AutoMod: Küfür').toJSON();
    expect(json.description).toBe('merhaba');
    const fields = Object.fromEntries((json.fields ?? []).map((f) => [f.name, f.value]));
    expect(fields.Kanal).toBe('<#c1>');
    expect(fields.Yazar).toBe('<@u1>');
    expect(fields['Silinme sebebi']).toBe('AutoMod: Küfür');
  });

  it('explains uncached messages', () => {
    const json = messageDeletedEmbed(message({ content: null, author: null })).toJSON();
    expect(json.description).toContain('önbellekte değil');
    expect(json.fields?.some((f) => f.name === 'Yazar')).toBe(false);
  });

  it('shows both versions of an edit', () => {
    const json = messageEditedEmbed('eski', message({ content: 'yeni' })).toJSON();
    expect(json.fields?.map((f) => f.value)).toEqual(['eski', 'yeni']);
    expect(json.description).toContain('https://discord.com/channels/g/c1/m1');
  });
});

describe('transcript', () => {
  it('lists messages oldest first with authors', () => {
    const text = transcript([
      message({ id: '2', content: 'ikinci', createdAt: new Date('2026-10-04T10:01:00Z') }),
      message({ id: '1', content: 'birinci', createdAt: new Date('2026-10-04T10:00:00Z') }),
      message({ id: '3', content: null, author: null, createdAt: null }),
    ]).split('\n');
    expect(text[0]).toBe('[? UTC] bilinmiyor: [önbellekte değil]');
    expect(text[1]).toBe('[2026-10-04 10:00:00 UTC] ayse (u1): birinci');
    expect(text[2]).toBe('[2026-10-04 10:01:00 UTC] ayse (u1): ikinci');
  });
});

describe('member embeds', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it('flags new accounts', () => {
    expect(isNewAccount(new Date(now - 6 * DAY), now)).toBe(true);
    expect(isNewAccount(new Date(now - 8 * DAY), now)).toBe(false);
    const json = memberJoinedEmbed(
      { id: 'u1', tag: 'yeni', createdAt: new Date(now - DAY) },
      120,
      now,
    ).toJSON();
    expect(json.fields?.[0]?.value).toContain('Yeni hesap');
    expect(json.fields?.[1]?.value).toBe('120');
  });

  it('shows how long a member stayed and their roles', () => {
    const json = memberLeftEmbed(
      { id: 'u1', tag: 'giden' },
      new Date(now - 3 * DAY),
      ['r1', 'r2'],
      now,
    ).toJSON();
    const fields = Object.fromEntries((json.fields ?? []).map((f) => [f.name, f.value]));
    expect(fields['Sunucuda kalma süresi']).toBe('3 gün');
    expect(fields.Roller).toBe('<@&r1>, <@&r2>');
  });
});

describe('voice embeds', () => {
  it('describes a move between channels', () => {
    const json = voiceEmbed(
      { id: 'u1', tag: 'x' },
      { kind: 'moved', fromId: 'a', toId: 'b' },
    ).toJSON();
    expect(json.title).toBe('↔️ Ses kanalı değiştirdi');
    expect(json.fields?.map((f) => f.value)).toEqual(['<#a>', '<#b>']);
  });
});

describe('filters', () => {
  const logging = {
    ...defaultSettings('logging'),
    channels: { ...defaultSettings('logging').channels, message: 'log1', moderation: 'log2' },
    ignoredChannelIds: ['staff', 'category'],
  };

  it('collects log targets', () => {
    expect(logTargetIds(logging)).toEqual(new Set(['log1', 'log2']));
  });

  it('skips ignored channels, their children and log channels', () => {
    expect(isIgnoredChannel(logging, ['general'])).toBe(false);
    expect(isIgnoredChannel(logging, ['staff'])).toBe(true);
    expect(isIgnoredChannel(logging, ['text', 'category'])).toBe(true);
    expect(isIgnoredChannel(logging, ['thread', 'staff', null])).toBe(true);
    expect(isIgnoredChannel(logging, ['log1'])).toBe(true);
    expect(isIgnoredChannel(logging, [])).toBe(false);
  });
});

describe('isContentEdit', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it('compares content when the old message is cached', () => {
    const before = { partial: false, content: 'a' };
    expect(isContentEdit(before, { content: 'b', editedTimestamp: now }, now)).toBe(true);
    // Pins and link previews keep the text.
    expect(isContentEdit(before, { content: 'a', editedTimestamp: now - DAY }, now)).toBe(false);
  });

  it('relies on a fresh edit timestamp for uncached messages', () => {
    const before = { partial: true, content: null };
    expect(isContentEdit(before, { content: 'b', editedTimestamp: now - 1_000 }, now)).toBe(true);
    expect(isContentEdit(before, { content: 'b', editedTimestamp: now - DAY }, now)).toBe(false);
    expect(isContentEdit(before, { content: 'b', editedTimestamp: null }, now)).toBe(false);
  });

  it('skips updates without content', () => {
    expect(
      isContentEdit({ partial: true, content: null }, { content: null, editedTimestamp: now }, now),
    ).toBe(false);
  });
});

describe('server embeds', () => {
  it('names @everyone instead of mentioning it', () => {
    const json = channelUpdatedEmbed(
      { id: 'c1', guildId: 'g' },
      [],
      [
        { id: 'g', type: 'role', allowed: [], denied: ['Mesaj Gönder'], reset: [] },
        { id: 'u1', type: 'member', allowed: ['Kanalı Görüntüle'], denied: [], reset: [] },
      ],
    ).toJSON();
    expect(json.fields?.[0]?.value).toBe('@everyone: ⛔ Mesaj Gönder\n<@u1>: ✅ Kanalı Görüntüle');
    expect(
      roleUpdatedEmbed({ id: 'g', guildId: 'g', color: 0 }, [], { added: [], removed: [] }).toJSON()
        .description,
    ).toBe('@everyone');
  });
});
