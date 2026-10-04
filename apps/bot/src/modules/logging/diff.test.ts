import { PermissionFlagsBits as P } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  channelChanges,
  diffIds,
  overwriteChanges,
  permissionChanges,
  profileChange,
  roleChanges,
  voiceEvents,
  type ChannelSnapshot,
  type VoiceSnapshot,
} from './diff';

describe('diffIds', () => {
  it('finds added and removed ids', () => {
    expect(diffIds(['a', 'b'], ['b', 'c'])).toEqual({ added: ['c'], removed: ['a'] });
  });
});

describe('permissionChanges', () => {
  it('names gained and lost permissions in Turkish', () => {
    expect(
      permissionChanges(P.SendMessages | P.AddReactions, P.SendMessages | P.BanMembers),
    ).toEqual({ added: ['Üyeleri Yasakla'], removed: ['Tepki Ekle'] });
  });
});

describe('overwriteChanges', () => {
  it('reports newly allowed, denied and reset permissions per target', () => {
    const changes = overwriteChanges(
      [{ id: 'everyone', type: 'role', allow: 0n, deny: P.SendMessages }],
      [
        { id: 'everyone', type: 'role', allow: 0n, deny: 0n },
        { id: 'mod', type: 'role', allow: P.ManageMessages, deny: P.AddReactions },
      ],
    );
    expect(changes).toEqual([
      { id: 'everyone', type: 'role', allowed: [], denied: [], reset: ['Mesaj Gönder'] },
      {
        id: 'mod',
        type: 'role',
        allowed: ['Mesajları Yönet'],
        denied: ['Tepki Ekle'],
        reset: [],
      },
    ]);
  });

  it('ignores unchanged overwrites', () => {
    const overwrite = { id: 'x', type: 'member' as const, allow: P.ViewChannel, deny: 0n };
    expect(overwriteChanges([overwrite], [{ ...overwrite }])).toEqual([]);
  });
});

describe('channelChanges', () => {
  const base: ChannelSnapshot = {
    name: 'genel',
    topic: null,
    nsfw: false,
    rateLimitPerUser: 0,
    parentName: 'Sohbet',
  };

  it('lists readable changes', () => {
    expect(
      channelChanges(base, { ...base, name: 'sohbet', rateLimitPerUser: 10, topic: 'Selam' }),
    ).toEqual([
      { label: 'Ad', before: 'genel', after: 'sohbet' },
      { label: 'Konu', before: 'yok', after: 'Selam' },
      { label: 'Yavaş mod', before: 'Kapalı', after: '10 sn' },
    ]);
  });

  it('is empty for position-only updates', () => {
    expect(channelChanges(base, { ...base })).toEqual([]);
  });
});

describe('roleChanges', () => {
  it('formats colors and flags', () => {
    expect(
      roleChanges(
        { name: 'Mod', color: 0, hoist: false, mentionable: false },
        { name: 'Moderatör', color: 0x5865f2, hoist: true, mentionable: false },
      ),
    ).toEqual([
      { label: 'Ad', before: 'Mod', after: 'Moderatör' },
      { label: 'Renk', before: 'yok', after: '#5865f2' },
      { label: 'Ayrı göster', before: 'Hayır', after: 'Evet' },
    ]);
  });
});

describe('profileChange', () => {
  const base = { username: 'ayse', globalName: 'Ayşe', avatar: 'a1' };

  it('is null without visible changes', () => {
    expect(profileChange(base, { ...base })).toBeNull();
  });

  it('lists username, display name and avatar changes', () => {
    expect(profileChange(base, { username: 'ayse2', globalName: null, avatar: 'a2' })).toEqual({
      username: { before: 'ayse', after: 'ayse2' },
      displayName: { before: 'Ayşe', after: null },
      avatarChanged: true,
    });
  });
});

describe('voiceEvents', () => {
  const state = (
    channelId: string | null,
    serverMute = false,
    serverDeaf = false,
  ): VoiceSnapshot => ({
    channelId,
    serverMute,
    serverDeaf,
  });

  it('detects joins, leaves and moves', () => {
    expect(
      voiceEvents({ channelId: null, serverMute: null, serverDeaf: null }, state('a')),
    ).toEqual([{ kind: 'joined', channelId: 'a' }]);
    expect(voiceEvents(state('a'), state(null))).toEqual([{ kind: 'left', channelId: 'a' }]);
    expect(voiceEvents(state('a'), state('b'))).toEqual([
      { kind: 'moved', fromId: 'a', toId: 'b' },
    ]);
  });

  it('reports server mute and deafen changes while connected', () => {
    expect(voiceEvents(state('a'), state('a', true, false))).toEqual([
      { kind: 'serverMute', enabled: true, channelId: 'a' },
    ]);
    expect(voiceEvents(state('a', true, true), state('a', true, false))).toEqual([
      { kind: 'serverDeaf', enabled: false, channelId: 'a' },
    ]);
  });

  it('ignores flag changes when joining or leaving', () => {
    expect(voiceEvents(state('a', true), state(null, false))).toEqual([
      { kind: 'left', channelId: 'a' },
    ]);
  });

  it('ignores self mute and other updates', () => {
    expect(voiceEvents(state('a'), state('a'))).toEqual([]);
  });
});
